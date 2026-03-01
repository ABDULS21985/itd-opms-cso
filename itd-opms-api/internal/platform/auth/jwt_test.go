package auth_test

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

var testJWTConfig = config.JWTConfig{
	Secret:        "test-secret-key-for-unit-tests-only",
	Expiry:        15 * time.Minute,
	RefreshExpiry: 7 * 24 * time.Hour,
}

func TestGenerateAccessToken_ValidToken(t *testing.T) {
	userID := uuid.New()
	tenantID := uuid.New()
	roles := []string{"admin", "viewer"}
	permissions := []string{"users.read", "users.write"}

	tokenStr, err := auth.GenerateAccessToken(testJWTConfig, userID, tenantID, "test@example.com", roles, permissions)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("expected non-empty token string")
	}

	// Token should have 3 parts (header.payload.signature)
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		t.Errorf("expected 3 JWT parts, got %d", len(parts))
	}
}

func TestGenerateAccessToken_ClaimsRoundTrip(t *testing.T) {
	userID := uuid.New()
	tenantID := uuid.New()
	email := "alice@example.com"
	roles := []string{"admin"}
	permissions := []string{"*"}

	tokenStr, err := auth.GenerateAccessToken(testJWTConfig, userID, tenantID, email, roles, permissions)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	claims, err := auth.ValidateToken(tokenStr, testJWTConfig.Secret)
	if err != nil {
		t.Fatalf("unexpected error validating token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID: expected %s, got %s", userID, claims.UserID)
	}
	if claims.TenantID != tenantID {
		t.Errorf("TenantID: expected %s, got %s", tenantID, claims.TenantID)
	}
	if claims.Email != email {
		t.Errorf("Email: expected %s, got %s", email, claims.Email)
	}
	if len(claims.Roles) != 1 || claims.Roles[0] != "admin" {
		t.Errorf("Roles: expected [admin], got %v", claims.Roles)
	}
	if len(claims.Permissions) != 1 || claims.Permissions[0] != "*" {
		t.Errorf("Permissions: expected [*], got %v", claims.Permissions)
	}
	if claims.Issuer != "itd-opms-api" {
		t.Errorf("Issuer: expected itd-opms-api, got %s", claims.Issuer)
	}
	if claims.Subject != userID.String() {
		t.Errorf("Subject: expected %s, got %s", userID.String(), claims.Subject)
	}
}

func TestGenerateAccessToken_ExpiryIsSet(t *testing.T) {
	tokenStr, err := auth.GenerateAccessToken(testJWTConfig, uuid.New(), uuid.New(), "test@test.com", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	claims, err := auth.ValidateToken(tokenStr, testJWTConfig.Secret)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if claims.ExpiresAt == nil {
		t.Fatal("expected ExpiresAt to be set")
	}

	// Should expire roughly 15 minutes from now
	expectedExpiry := time.Now().Add(testJWTConfig.Expiry)
	diff := claims.ExpiresAt.Time.Sub(expectedExpiry)
	if diff > 5*time.Second || diff < -5*time.Second {
		t.Errorf("expiry off by %v (expected ~%v)", diff, testJWTConfig.Expiry)
	}
}

func TestGenerateAccessToken_UniqueJTI(t *testing.T) {
	token1, _ := auth.GenerateAccessToken(testJWTConfig, uuid.New(), uuid.New(), "a@test.com", nil, nil)
	token2, _ := auth.GenerateAccessToken(testJWTConfig, uuid.New(), uuid.New(), "b@test.com", nil, nil)

	claims1, _ := auth.ValidateToken(token1, testJWTConfig.Secret)
	claims2, _ := auth.ValidateToken(token2, testJWTConfig.Secret)

	if claims1.ID == claims2.ID {
		t.Error("expected different JTI for different tokens")
	}
}

// ──────────────────────────────────────────────
// ValidateToken — invalid inputs
// ──────────────────────────────────────────────

func TestValidateToken_ExpiredToken(t *testing.T) {
	expiredCfg := config.JWTConfig{
		Secret: testJWTConfig.Secret,
		Expiry: -1 * time.Hour, // Already expired
	}
	tokenStr, err := auth.GenerateAccessToken(expiredCfg, uuid.New(), uuid.New(), "test@test.com", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, err = auth.ValidateToken(tokenStr, testJWTConfig.Secret)
	if err == nil {
		t.Error("expected error for expired token")
	}
}

func TestValidateToken_InvalidSignature(t *testing.T) {
	tokenStr, _ := auth.GenerateAccessToken(testJWTConfig, uuid.New(), uuid.New(), "test@test.com", nil, nil)

	_, err := auth.ValidateToken(tokenStr, "wrong-secret")
	if err == nil {
		t.Error("expected error for wrong secret")
	}
}

func TestValidateToken_MalformedToken(t *testing.T) {
	_, err := auth.ValidateToken("not.a.valid.jwt", testJWTConfig.Secret)
	if err == nil {
		t.Error("expected error for malformed token")
	}
}

func TestValidateToken_EmptyToken(t *testing.T) {
	_, err := auth.ValidateToken("", testJWTConfig.Secret)
	if err == nil {
		t.Error("expected error for empty token")
	}
}

func TestValidateToken_TamperedPayload(t *testing.T) {
	tokenStr, _ := auth.GenerateAccessToken(testJWTConfig, uuid.New(), uuid.New(), "test@test.com", nil, nil)

	// Tamper with the payload (middle part)
	parts := strings.Split(tokenStr, ".")
	parts[1] = parts[1] + "tampered"
	tampered := strings.Join(parts, ".")

	_, err := auth.ValidateToken(tampered, testJWTConfig.Secret)
	if err == nil {
		t.Error("expected error for tampered token")
	}
}

func TestValidateToken_WrongSigningAlgorithm(t *testing.T) {
	// Create a token with RSA algorithm — should be rejected because the
	// validator only accepts HMAC.
	token := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	tokenStr, _ := token.SignedString(jwt.UnsafeAllowNoneSignatureType)

	_, err := auth.ValidateToken(tokenStr, testJWTConfig.Secret)
	if err == nil {
		t.Error("expected error for 'none' signing method")
	}
}

// ──────────────────────────────────────────────
// GenerateRefreshToken
// ──────────────────────────────────────────────

func TestGenerateRefreshToken_IsUUID(t *testing.T) {
	token := auth.GenerateRefreshToken()
	_, err := uuid.Parse(token)
	if err != nil {
		t.Errorf("expected valid UUID, got %q: %v", token, err)
	}
}

func TestGenerateRefreshToken_Uniqueness(t *testing.T) {
	seen := make(map[string]struct{}, 100)
	for i := 0; i < 100; i++ {
		token := auth.GenerateRefreshToken()
		if _, exists := seen[token]; exists {
			t.Fatalf("duplicate refresh token at iteration %d: %s", i, token)
		}
		seen[token] = struct{}{}
	}
}

// ──────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────

func TestGenerateAccessToken_EmptyRolesAndPermissions(t *testing.T) {
	tokenStr, err := auth.GenerateAccessToken(testJWTConfig, uuid.New(), uuid.New(), "test@test.com", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	claims, err := auth.ValidateToken(tokenStr, testJWTConfig.Secret)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if claims.Roles != nil && len(claims.Roles) > 0 {
		t.Errorf("expected nil/empty roles, got %v", claims.Roles)
	}
}

func TestGenerateAccessToken_EmptySecret(t *testing.T) {
	cfg := config.JWTConfig{
		Secret: "",
		Expiry: 15 * time.Minute,
	}
	// Should still produce a token (empty key is technically valid for HS256)
	tokenStr, err := auth.GenerateAccessToken(cfg, uuid.New(), uuid.New(), "test@test.com", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	claims, err := auth.ValidateToken(tokenStr, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if claims.Email != "test@test.com" {
		t.Errorf("expected test@test.com, got %s", claims.Email)
	}
}

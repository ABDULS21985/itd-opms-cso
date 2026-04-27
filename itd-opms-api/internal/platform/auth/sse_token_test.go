package auth_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

func TestSSEStreamToken_ValidateRoundTrip(t *testing.T) {
	userID := uuid.New()
	tenantID := uuid.New()

	token, expiresAt, err := auth.GenerateSSEStreamToken(
		testJWTConfig.Secret,
		userID,
		tenantID,
		"stream@example.com",
		[]string{"agent"},
		[]string{"notifications.view"},
		time.Minute,
	)
	if err != nil {
		t.Fatalf("GenerateSSEStreamToken returned error: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty stream token")
	}
	if !expiresAt.After(time.Now()) {
		t.Fatalf("expected future expiry, got %s", expiresAt)
	}

	claims, err := auth.ValidateSSEStreamToken(token, testJWTConfig.Secret)
	if err != nil {
		t.Fatalf("ValidateSSEStreamToken returned error: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("expected user ID %s, got %s", userID, claims.UserID)
	}
	if claims.TenantID != tenantID {
		t.Errorf("expected tenant ID %s, got %s", tenantID, claims.TenantID)
	}
	if claims.Email != "stream@example.com" {
		t.Errorf("expected email stream@example.com, got %s", claims.Email)
	}
}

func TestSSEStreamToken_NotAcceptedAsAccessToken(t *testing.T) {
	token, _, err := auth.GenerateSSEStreamToken(
		testJWTConfig.Secret,
		uuid.New(),
		uuid.New(),
		"stream@example.com",
		nil,
		nil,
		time.Minute,
	)
	if err != nil {
		t.Fatalf("GenerateSSEStreamToken returned error: %v", err)
	}

	if _, err := auth.ValidateToken(token, testJWTConfig.Secret); err == nil {
		t.Fatal("expected stream token to be rejected by normal access-token validation")
	}
}

func TestSSEStreamToken_Expired(t *testing.T) {
	token, _, err := auth.GenerateSSEStreamToken(
		testJWTConfig.Secret,
		uuid.New(),
		uuid.New(),
		"stream@example.com",
		nil,
		nil,
		time.Nanosecond,
	)
	if err != nil {
		t.Fatalf("GenerateSSEStreamToken returned error: %v", err)
	}
	time.Sleep(2 * time.Millisecond)

	if _, err := auth.ValidateSSEStreamToken(token, testJWTConfig.Secret); err == nil {
		t.Fatal("expected expired stream token to be rejected")
	}
}

func TestSSEStreamToken_WrongSecret(t *testing.T) {
	token, _, err := auth.GenerateSSEStreamToken(
		testJWTConfig.Secret,
		uuid.New(),
		uuid.New(),
		"stream@example.com",
		nil,
		nil,
		time.Minute,
	)
	if err != nil {
		t.Fatalf("GenerateSSEStreamToken returned error: %v", err)
	}

	if _, err := auth.ValidateSSEStreamToken(token, "wrong-secret"); err == nil {
		t.Fatal("expected wrong secret to be rejected")
	}
}

func TestSSEStreamToken_RejectsEmptySecret(t *testing.T) {
	_, _, err := auth.GenerateSSEStreamToken(
		"",
		uuid.New(),
		uuid.New(),
		"stream@example.com",
		nil,
		nil,
		time.Minute,
	)
	if err == nil {
		t.Fatal("expected empty secret to be rejected")
	}

	cfg := config.JWTConfig{Secret: "", Expiry: time.Minute}
	token, err := auth.GenerateAccessToken(cfg, uuid.New(), uuid.New(), "user@example.com", nil, nil)
	if err != nil {
		t.Fatalf("GenerateAccessToken with empty secret returned error: %v", err)
	}
	if _, err := auth.ValidateSSEStreamToken(token, ""); err == nil {
		t.Fatal("expected empty validation secret to be rejected")
	}
}

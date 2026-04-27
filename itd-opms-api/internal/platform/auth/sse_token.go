package auth

import (
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	SSEStreamTokenCookieName = "opms-sse-token"
	sseStreamTokenAudience   = "itd-opms-notification-stream"
	sseStreamTokenPurpose    = "notification_stream"
)

// SSEStreamClaims are scoped to the notification stream endpoint. These tokens
// are signed with a derived key so they cannot be used as normal API bearer
// tokens even though they carry the same identity fields.
type SSEStreamClaims struct {
	jwt.RegisteredClaims
	UserID      uuid.UUID `json:"user_id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	Email       string    `json:"email"`
	Roles       []string  `json:"roles"`
	Permissions []string  `json:"permissions"`
	Purpose     string    `json:"purpose"`
}

// GenerateSSEStreamToken creates a short-lived token for authenticating one
// browser EventSource connection via an httpOnly cookie.
func GenerateSSEStreamToken(
	secret string,
	userID uuid.UUID,
	tenantID uuid.UUID,
	email string,
	roles []string,
	permissions []string,
	ttl time.Duration,
) (string, time.Time, error) {
	if secret == "" {
		return "", time.Time{}, fmt.Errorf("jwt secret is required")
	}
	if ttl <= 0 {
		return "", time.Time{}, fmt.Errorf("ttl must be positive")
	}

	now := time.Now()
	expiresAt := now.Add(ttl)
	claims := SSEStreamClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "itd-opms-api",
			Subject:   userID.String(),
			Audience:  jwt.ClaimStrings{sseStreamTokenAudience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
			ID:        uuid.New().String(),
		},
		UserID:      userID,
		TenantID:    tenantID,
		Email:       email,
		Roles:       roles,
		Permissions: permissions,
		Purpose:     sseStreamTokenPurpose,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(sseStreamSigningKey(secret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign sse stream token: %w", err)
	}
	return signed, expiresAt, nil
}

// ValidateSSEStreamToken validates a scoped notification stream token.
func ValidateSSEStreamToken(tokenString string, secret string) (*SSEStreamClaims, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("token is required")
	}
	if secret == "" {
		return nil, fmt.Errorf("jwt secret is required")
	}

	token, err := jwt.ParseWithClaims(
		tokenString,
		&SSEStreamClaims{},
		func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return sseStreamSigningKey(secret), nil
		},
		jwt.WithIssuer("itd-opms-api"),
		jwt.WithAudience(sseStreamTokenAudience),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, fmt.Errorf("parse sse stream token: %w", err)
	}

	claims, ok := token.Claims.(*SSEStreamClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid sse stream token claims")
	}
	if claims.Purpose != sseStreamTokenPurpose {
		return nil, fmt.Errorf("invalid sse stream token purpose")
	}
	if claims.UserID == uuid.Nil || claims.TenantID == uuid.Nil {
		return nil, fmt.Errorf("missing sse stream token identity")
	}

	return claims, nil
}

func sseStreamSigningKey(secret string) []byte {
	sum := sha256.Sum256([]byte(secret + "\x00sse-stream-token"))
	return sum[:]
}

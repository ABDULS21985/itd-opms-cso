package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
)

// OIDCValidator validates Entra ID JWT tokens using JWKS for signature verification.
type OIDCValidator struct {
	cfg        config.EntraIDConfig
	httpClient *http.Client
	keys       map[string]*rsa.PublicKey
	mu         sync.RWMutex
	lastFetch  time.Time
	cacheTTL   time.Duration
}

// NewOIDCValidator creates a new OIDC validator for Entra ID tokens.
func NewOIDCValidator(cfg config.EntraIDConfig) *OIDCValidator {
	return &OIDCValidator{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		keys:     make(map[string]*rsa.PublicKey),
		cacheTTL: 1 * time.Hour,
	}
}

// EntraClaims represents the JWT claims extracted from an Entra ID token.
type EntraClaims struct {
	jwt.RegisteredClaims
	OID               string   `json:"oid"`
	PreferredUsername  string   `json:"preferred_username"`
	Name              string   `json:"name"`
	Email             string   `json:"email"`
	Groups            []string `json:"groups"`
	TenantID          string   `json:"tid"`
	Roles             []string `json:"roles"`
	Scp               string   `json:"scp"`
	AzureADObjectID   string   `json:"azp"`
}

// ValidateToken validates an Entra ID access token and returns the claims.
func (v *OIDCValidator) ValidateToken(ctx context.Context, tokenString string) (*EntraClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &EntraClaims{}, func(token *jwt.Token) (any, error) {
		// Ensure RS256 signing method.
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, fmt.Errorf("missing kid in token header")
		}

		key, err := v.getKey(ctx, kid)
		if err != nil {
			return nil, fmt.Errorf("get signing key: %w", err)
		}
		return key, nil
	},
		jwt.WithIssuer(v.cfg.Issuer()),
		jwt.WithAudience(v.cfg.ClientID),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, fmt.Errorf("parse entra token: %w", err)
	}

	claims, ok := token.Claims.(*EntraClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid entra token claims")
	}

	return claims, nil
}

// ToPlatformClaims converts Entra ID claims into platform-standard Claims.
func (v *OIDCValidator) ToPlatformClaims(entra *EntraClaims, userID, tenantID uuid.UUID, roles, permissions []string) *Claims {
	return &Claims{
		RegisteredClaims: entra.RegisteredClaims,
		UserID:           userID,
		TenantID:         tenantID,
		Email:            entra.PreferredUsername,
		Roles:            roles,
		Permissions:      permissions,
	}
}

// MapGroupsToRoles maps Entra ID security group IDs to platform role names.
// groupMapping is a map of group object ID -> role name, configured per deployment.
func MapGroupsToRoles(groups []string, groupMapping map[string]string) []string {
	roleSet := make(map[string]struct{})
	for _, gid := range groups {
		if role, ok := groupMapping[gid]; ok {
			roleSet[role] = struct{}{}
		}
	}
	roles := make([]string, 0, len(roleSet))
	for r := range roleSet {
		roles = append(roles, r)
	}
	return roles
}

// getKey returns the RSA public key for the given key ID, fetching from JWKS if needed.
func (v *OIDCValidator) getKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	key, ok := v.keys[kid]
	lastFetch := v.lastFetch
	v.mu.RUnlock()

	if ok {
		return key, nil
	}

	// If we recently fetched and still don't have the key, it's unknown.
	if time.Since(lastFetch) < 5*time.Minute {
		return nil, fmt.Errorf("unknown key id: %s", kid)
	}

	// Fetch fresh keys.
	if err := v.fetchJWKS(ctx); err != nil {
		return nil, fmt.Errorf("fetch JWKS: %w", err)
	}

	v.mu.RLock()
	key, ok = v.keys[kid]
	v.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("unknown key id after refresh: %s", kid)
	}
	return key, nil
}

// jwksResponse represents the JSON Web Key Set response from Entra ID.
type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// fetchJWKS retrieves and caches the JWKS from Entra ID.
func (v *OIDCValidator) fetchJWKS(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.cfg.JWKSURL(), nil)
	if err != nil {
		return fmt.Errorf("create JWKS request: %w", err)
	}

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("JWKS endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("decode JWKS: %w", err)
	}

	newKeys := make(map[string]*rsa.PublicKey)
	for _, k := range jwks.Keys {
		if k.Kty != "RSA" || k.Use != "sig" {
			continue
		}

		pubKey, err := parseRSAPublicKey(k.N, k.E)
		if err != nil {
			slog.Warn("failed to parse JWKS key", "kid", k.Kid, "error", err)
			continue
		}
		newKeys[k.Kid] = pubKey
	}

	v.mu.Lock()
	v.keys = newKeys
	v.lastFetch = time.Now()
	v.mu.Unlock()

	slog.Info("refreshed JWKS keys", "count", len(newKeys))
	return nil
}

// parseRSAPublicKey constructs an RSA public key from base64url-encoded N and E values.
func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nStr = strings.TrimRight(nStr, "=")
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("decode modulus: %w", err)
	}

	eStr = strings.TrimRight(eStr, "=")
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{N: n, E: e}, nil
}

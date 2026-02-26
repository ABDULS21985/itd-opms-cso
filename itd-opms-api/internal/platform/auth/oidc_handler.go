package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// OIDCHandler provides HTTP handlers for the OIDC authorization code flow.
type OIDCHandler struct {
	cfg       config.EntraIDConfig
	pool      *pgxpool.Pool
	validator *OIDCValidator
}

// NewOIDCHandler creates a new OIDC handler.
func NewOIDCHandler(cfg config.EntraIDConfig, pool *pgxpool.Pool, validator *OIDCValidator) *OIDCHandler {
	return &OIDCHandler{
		cfg:       cfg,
		pool:      pool,
		validator: validator,
	}
}

// tokenExchangeRequest represents the code-for-token exchange request from the frontend.
type tokenExchangeRequest struct {
	Code         string `json:"code"`
	CodeVerifier string `json:"codeVerifier"`
	RedirectURI  string `json:"redirectUri"`
}

// tokenExchangeResponse is the Entra ID token endpoint response.
type tokenExchangeResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	Scope        string `json:"scope"`
}

// ExchangeCode handles POST /api/v1/auth/oidc/callback.
// Accepts the authorization code + code_verifier from the PKCE flow,
// exchanges them at Entra ID's token endpoint, validates the ID token,
// and provisions/updates the local user record.
func (h *OIDCHandler) ExchangeCode(w http.ResponseWriter, r *http.Request) {
	var req tokenExchangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Code == "" || req.CodeVerifier == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "code and codeVerifier are required")
		return
	}

	redirectURI := req.RedirectURI
	if redirectURI == "" {
		redirectURI = h.cfg.RedirectURI
	}

	// Exchange authorization code for tokens at Entra ID.
	tokens, err := h.exchangeCodeAtEntra(r.Context(), req.Code, req.CodeVerifier, redirectURI)
	if err != nil {
		slog.Error("failed to exchange code at Entra ID", "error", err)
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Failed to exchange authorization code")
		return
	}

	// Validate the ID token to extract user claims.
	claims, err := h.validator.ValidateToken(r.Context(), tokens.IDToken)
	if err != nil {
		slog.Error("failed to validate Entra ID token", "error", err)
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid identity token")
		return
	}

	// Provision or update the local user based on Entra ID claims.
	user, roles, permissions, err := h.provisionUser(r.Context(), claims)
	if err != nil {
		slog.Error("failed to provision user", "error", err, "oid", claims.OID)
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to provision user account")
		return
	}

	types.OK(w, map[string]any{
		"accessToken":  tokens.AccessToken,
		"refreshToken": tokens.RefreshToken,
		"expiresIn":    tokens.ExpiresIn,
		"user": UserProfile{
			ID:          user.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
			TenantID:    user.TenantID,
			JobTitle:    user.JobTitle,
			Department:  user.Department,
			Office:      user.Office,
			Unit:        user.Unit,
			Roles:       roles,
			Permissions: permissions,
		},
	}, nil)
}

// RefreshOIDCToken handles POST /api/v1/auth/oidc/refresh.
// Exchanges a refresh token for a new access + refresh token pair at Entra ID.
func (h *OIDCHandler) RefreshOIDCToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.RefreshToken == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "refreshToken is required")
		return
	}

	data := url.Values{
		"client_id":     {h.cfg.ClientID},
		"client_secret": {h.cfg.ClientSecret},
		"grant_type":    {"refresh_token"},
		"refresh_token": {req.RefreshToken},
		"scope":         {"openid profile email offline_access User.Read"},
	}

	tokens, err := h.postTokenEndpoint(r.Context(), data)
	if err != nil {
		slog.Error("failed to refresh Entra ID token", "error", err)
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Failed to refresh token")
		return
	}

	types.OK(w, map[string]any{
		"accessToken":  tokens.AccessToken,
		"refreshToken": tokens.RefreshToken,
		"expiresIn":    tokens.ExpiresIn,
	}, nil)
}

// OIDCConfig handles GET /api/v1/auth/oidc/config.
// Returns the OIDC configuration the frontend needs to initiate the PKCE flow.
func (h *OIDCHandler) OIDCConfig(w http.ResponseWriter, r *http.Request) {
	types.OK(w, map[string]string{
		"authority":    fmt.Sprintf("https://login.microsoftonline.com/%s", h.cfg.TenantID),
		"clientId":     h.cfg.ClientID,
		"redirectUri":  h.cfg.RedirectURI,
		"scope":        "openid profile email offline_access User.Read",
		"authorizeUrl": h.cfg.AuthorizeURL(),
		"tokenUrl":     h.cfg.TokenURL(),
	}, nil)
}

// exchangeCodeAtEntra performs the authorization code exchange at the Entra ID token endpoint.
func (h *OIDCHandler) exchangeCodeAtEntra(ctx context.Context, code, codeVerifier, redirectURI string) (*tokenExchangeResponse, error) {
	data := url.Values{
		"client_id":     {h.cfg.ClientID},
		"client_secret": {h.cfg.ClientSecret},
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"code_verifier": {codeVerifier},
		"scope":         {"openid profile email offline_access User.Read"},
	}

	return h.postTokenEndpoint(ctx, data)
}

// postTokenEndpoint sends a POST request to the Entra ID token endpoint.
func (h *OIDCHandler) postTokenEndpoint(ctx context.Context, data url.Values) (*tokenExchangeResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.cfg.TokenURL(), strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token exchange request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokens tokenExchangeResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	return &tokens, nil
}

// localUser is a minimal user record used during provisioning.
type localUser struct {
	ID          uuid.UUID
	Email       string
	DisplayName string
	TenantID    uuid.UUID
	JobTitle    *string
	Department  *string
	Office      *string
	Unit        *string
}

// provisionUser creates or updates a local user based on Entra ID claims.
// It resolves tenant from the department claim and fetches roles/permissions.
func (h *OIDCHandler) provisionUser(ctx context.Context, claims *EntraClaims) (*localUser, []string, []string, error) {
	email := claims.PreferredUsername
	if email == "" {
		email = claims.Email
	}
	if email == "" {
		return nil, nil, nil, apperrors.BadRequest("No email in Entra ID claims")
	}

	displayName := claims.Name
	if displayName == "" {
		displayName = email
	}

	// Try to find existing user by entra_id (oid).
	var user localUser
	err := h.pool.QueryRow(ctx,
		`SELECT id, email, display_name, tenant_id, job_title, department, office, unit
		 FROM users WHERE entra_id = $1 AND is_active = true`,
		claims.OID,
	).Scan(&user.ID, &user.Email, &user.DisplayName, &user.TenantID,
		&user.JobTitle, &user.Department, &user.Office, &user.Unit)

	if err == pgx.ErrNoRows {
		// Try finding by email (may have been pre-provisioned).
		err = h.pool.QueryRow(ctx,
			`SELECT id, email, display_name, tenant_id, job_title, department, office, unit
			 FROM users WHERE email = $1 AND is_active = true`,
			email,
		).Scan(&user.ID, &user.Email, &user.DisplayName, &user.TenantID,
			&user.JobTitle, &user.Department, &user.Office, &user.Unit)

		if err == pgx.ErrNoRows {
			// Auto-provision: create new user with default tenant (ITD).
			defaultTenantID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
			newID := uuid.New()
			_, err = h.pool.Exec(ctx,
				`INSERT INTO users (id, entra_id, email, display_name, tenant_id, is_active, last_login_at)
				 VALUES ($1, $2, $3, $4, $5, true, NOW())`,
				newID, claims.OID, email, displayName, defaultTenantID,
			)
			if err != nil {
				return nil, nil, nil, fmt.Errorf("insert new user: %w", err)
			}
			user = localUser{
				ID:          newID,
				Email:       email,
				DisplayName: displayName,
				TenantID:    defaultTenantID,
			}

			// Assign default 'staff' role.
			staffRoleID := uuid.MustParse("10000000-0000-0000-0000-000000000005")
			_, _ = h.pool.Exec(ctx,
				`INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type)
				 VALUES ($1, $2, $3, 'tenant')
				 ON CONFLICT DO NOTHING`,
				newID, staffRoleID, defaultTenantID,
			)
		} else if err != nil {
			return nil, nil, nil, fmt.Errorf("query user by email: %w", err)
		} else {
			// Found by email — link entra_id.
			_, _ = h.pool.Exec(ctx,
				`UPDATE users SET entra_id = $1, display_name = $2, last_login_at = NOW() WHERE id = $3`,
				claims.OID, displayName, user.ID,
			)
		}
	} else if err != nil {
		return nil, nil, nil, fmt.Errorf("query user by entra_id: %w", err)
	} else {
		// Update last login and display name.
		_, _ = h.pool.Exec(ctx,
			`UPDATE users SET display_name = $1, last_login_at = NOW() WHERE id = $2`,
			displayName, user.ID,
		)
	}

	// Fetch roles and permissions.
	authService := &AuthService{pool: h.pool}
	roles, permissions, err := authService.getUserRolesAndPermissions(ctx, user.ID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("fetch roles: %w", err)
	}

	return &user, roles, permissions, nil
}

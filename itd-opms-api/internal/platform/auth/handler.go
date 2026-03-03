package auth

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/helpers"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// AuthHandler provides HTTP handlers for authentication endpoints.
type AuthHandler struct {
	service           *AuthService
	auditService      *audit.AuditService
	revocationService *RevocationService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(service *AuthService, auditService *audit.AuditService, revocationService *RevocationService) *AuthHandler {
	return &AuthHandler{service: service, auditService: auditService, revocationService: revocationService}
}

// Routes mounts the auth routes on the given chi router.
// Public routes (login, refresh) should be wrapped with the PublicRoute
// middleware at the call site. The /me endpoint requires authentication.
//
// Example usage:
//
//	r.Route("/api/v1/auth", func(r chi.Router) {
//	    handler := auth.NewAuthHandler(authService)
//	    handler.Routes(r)
//	})
func (h *AuthHandler) Routes(r chi.Router) {
	r.Post("/login", h.Login)
	r.Post("/refresh", h.Refresh)
	r.Post("/logout", h.Logout)
	r.Get("/me", h.Me)
}

// loginRequest is the JSON body for POST /api/v1/auth/login.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// refreshRequest is the JSON body for POST /api/v1/auth/refresh.
type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// logoutRequest is the JSON body for POST /api/v1/auth/logout.
type logoutRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// Login handles POST /api/v1/auth/login.
// Accepts JSON {email, password} and returns {accessToken, refreshToken, user}.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Invalid request body",
		)
		return
	}

	if req.Email == "" || req.Password == "" {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Email and password are required",
		)
		return
	}

	resp, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		// Log failed authentication attempt for security monitoring.
		slog.Warn("login attempt failed",
			"email", req.Email,
			"ip", realIP(r),
			"user_agent", r.UserAgent(),
			"correlation_id", types.GetCorrelationID(r.Context()),
			"error", err.Error(),
		)
		writeAppError(w, r, err)
		return
	}

	// Create session record for tracking.
	tokenHash := helpers.SHA256Checksum([]byte(resp.AccessToken))
	expiresAt := time.Now().Add(h.service.jwtCfg.RefreshExpiry)
	h.service.CreateSession(r.Context(), resp.User.ID, resp.User.TenantID, tokenHash, realIP(r), r.Header.Get("User-Agent"), expiresAt)

	types.OK(w, resp, nil)
}

// realIP extracts the client IP from X-Forwarded-For, X-Real-IP, or RemoteAddr.
func realIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.SplitN(xff, ",", 2)[0]
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	// RemoteAddr is "ip:port" — strip the port.
	addr := r.RemoteAddr
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		return addr[:idx]
	}
	return addr
}

// Refresh handles POST /api/v1/auth/refresh.
// Accepts JSON {refreshToken} and returns a new token pair.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Invalid request body",
		)
		return
	}

	if req.RefreshToken == "" {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Refresh token is required",
		)
		return
	}

	pair, err := h.service.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, pair, nil)
}

// Logout handles POST /api/v1/auth/logout.
// Accepts JSON {refreshToken} and revokes both the refresh token (DB) and the
// access token (Redis revocation list) so it cannot be reused before expiry.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req logoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Invalid request body",
		)
		return
	}

	if req.RefreshToken == "" {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Refresh token is required",
		)
		return
	}

	// Revoke the access token (JWT) so it can't be reused before expiry.
	if h.revocationService != nil {
		tokenString := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if tokenString != "" {
			if claims, err := ValidateToken(tokenString, h.service.jwtCfg.Secret); err == nil && claims.ID != "" {
				ttl := time.Until(claims.ExpiresAt.Time)
				if ttl > 0 {
					_ = h.revocationService.RevokeToken(r.Context(), claims.ID, ttl)
				}
			}
		}
	}

	if err := h.service.Logout(r.Context(), req.RefreshToken); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"message": "Logged out successfully"}, nil)
}

// Me handles GET /api/v1/auth/me.
// Returns the current user's profile from the JWT claims.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized,
			"UNAUTHORIZED", "Authentication required",
		)
		return
	}

	profile, err := h.service.GetMe(r.Context(), authCtx.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, profile, nil)
}

// changePasswordRequest is the JSON body for POST /api/v1/auth/change-password.
type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ChangePassword handles POST /api/v1/auth/change-password.
// Requires authentication. Validates the current password and sets a new one.
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized,
			"UNAUTHORIZED", "Authentication required",
		)
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Invalid request body",
		)
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Current password and new password are required",
		)
		return
	}

	if err := h.service.ChangePassword(r.Context(), authCtx.UserID, req.CurrentPassword, req.NewPassword); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"message": "Password changed successfully"}, nil)
}

// writeAppError maps an AppError (or generic error) to the appropriate HTTP
// response using the shared error helpers.
func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	status := apperrors.HTTPStatus(err)
	code := apperrors.Code(err)

	if status >= 500 {
		slog.Error("internal error",
			"error", err.Error(),
			"path", r.URL.Path,
			"correlation_id", types.GetCorrelationID(r.Context()),
		)
	}

	types.ErrorMessage(w, status, code, err.Error())
}

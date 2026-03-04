package auth

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"path/filepath"
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

		// Record failed login in audit trail.
		changes, _ := json.Marshal(map[string]string{
			"email":  req.Email,
			"reason": err.Error(),
		})
		_ = h.auditService.Log(r.Context(), audit.AuditEntry{
			Action:        "auth.login_failed",
			EntityType:    "session",
			ActorRole:     "anonymous",
			Changes:       changes,
			IPAddress:     realIP(r),
			UserAgent:     r.UserAgent(),
			CorrelationID: types.GetCorrelationID(r.Context()),
		})

		writeAppError(w, r, err)
		return
	}

	// Record successful login in audit trail.
	loginChanges, _ := json.Marshal(map[string]string{
		"email": req.Email,
	})
	_ = h.auditService.Log(r.Context(), audit.AuditEntry{
		TenantID:      resp.User.TenantID,
		ActorID:       resp.User.ID,
		ActorRole:     firstRole(resp.User.Roles),
		Action:        "auth.login_success",
		EntityType:    "session",
		EntityID:      resp.User.ID,
		Changes:       loginChanges,
		IPAddress:     realIP(r),
		UserAgent:     r.UserAgent(),
		CorrelationID: types.GetCorrelationID(r.Context()),
	})

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

// forgotPasswordRequest is the JSON body for POST /api/v1/auth/forgot-password.
type forgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword handles POST /api/v1/auth/forgot-password.
// Generates a password reset token and returns it. In production, this
// would send the token via email; in dev mode, the token is returned directly.
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Invalid request body",
		)
		return
	}

	if req.Email == "" {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Email address is required",
		)
		return
	}

	token, err := h.service.ForgotPassword(r.Context(), req.Email)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	// Record in audit trail.
	changes, _ := json.Marshal(map[string]string{"email": req.Email})
	_ = h.auditService.Log(r.Context(), audit.AuditEntry{
		Action:        "auth.forgot_password",
		EntityType:    "user",
		ActorRole:     "anonymous",
		Changes:       changes,
		IPAddress:     realIP(r),
		UserAgent:     r.UserAgent(),
		CorrelationID: types.GetCorrelationID(r.Context()),
	})

	// Always return success (don't reveal whether email exists).
	resp := map[string]string{
		"message": "If an account with that email exists, a password reset link has been generated.",
	}

	// In dev mode, include the token in the response so it can be used directly.
	if token != "" {
		resp["resetToken"] = token
		resp["resetUrl"] = "/auth/reset-password?token=" + token
	}

	types.OK(w, resp, nil)
}

// resetPasswordRequest is the JSON body for POST /api/v1/auth/reset-password.
type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// ResetPassword handles POST /api/v1/auth/reset-password.
// Validates the reset token and sets a new password.
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Invalid request body",
		)
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		types.ErrorMessage(w, http.StatusBadRequest,
			"BAD_REQUEST", "Reset token and new password are required",
		)
		return
	}

	if err := h.service.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		slog.Warn("password reset failed",
			"ip", realIP(r),
			"user_agent", r.UserAgent(),
			"correlation_id", types.GetCorrelationID(r.Context()),
			"error", err.Error(),
		)
		writeAppError(w, r, err)
		return
	}

	// Record in audit trail.
	_ = h.auditService.Log(r.Context(), audit.AuditEntry{
		Action:        "auth.password_reset",
		EntityType:    "user",
		ActorRole:     "anonymous",
		IPAddress:     realIP(r),
		UserAgent:     r.UserAgent(),
		CorrelationID: types.GetCorrelationID(r.Context()),
	})

	types.OK(w, map[string]string{"message": "Password has been reset successfully. You can now sign in with your new password."}, nil)
}

// UpdateProfile handles PATCH /api/v1/auth/profile.
// Updates the authenticated user's own profile fields.
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	profile, err := h.service.UpdateProfile(r.Context(), authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, profile, nil)
}

// UploadProfilePhoto handles POST /api/v1/auth/profile/photo.
// Accepts a multipart form file and uploads it as the user's profile photo.
func (h *AuthHandler) UploadProfilePhoto(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Limit to 2MB.
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "File too large (max 2MB)")
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Photo file is required")
		return
	}
	defer file.Close()

	// Validate content type.
	contentType := header.Header.Get("Content-Type")
	allowedTypes := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
	}
	ext, ok := allowedTypes[contentType]
	if !ok {
		// Fallback: detect from filename extension.
		ext = strings.ToLower(filepath.Ext(header.Filename))
		switch ext {
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
			ext = ".jpg"
		case ".png":
			contentType = "image/png"
		case ".webp":
			contentType = "image/webp"
		default:
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Only JPEG, PNG, and WebP images are allowed")
			return
		}
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to read file")
		return
	}

	objectKey, err := h.service.UploadProfilePhoto(r.Context(), authCtx.UserID, authCtx.TenantID, fileBytes, contentType, ext)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"photoUrl": objectKey}, nil)
}

// DeleteProfilePhoto handles DELETE /api/v1/auth/profile/photo.
// Removes the authenticated user's profile photo.
func (h *AuthHandler) DeleteProfilePhoto(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	if err := h.service.DeleteProfilePhoto(r.Context(), authCtx.UserID, authCtx.TenantID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"message": "Profile photo removed"}, nil)
}

// firstRole returns the first role from a slice, or "unknown" if empty.
func firstRole(roles []string) string {
	if len(roles) > 0 {
		return roles[0]
	}
	return "unknown"
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

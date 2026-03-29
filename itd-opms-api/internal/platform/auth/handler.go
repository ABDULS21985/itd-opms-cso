package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
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

// EmailSender is an interface for sending transactional emails.
type EmailSender interface {
	SendMail(ctx context.Context, to, subject, htmlBody string) error
}

// AuthHandler provides HTTP handlers for authentication endpoints.
type AuthHandler struct {
	service           *AuthService
	auditService      *audit.AuditService
	revocationService *RevocationService
	emailSender       EmailSender
	frontendURL       string
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(service *AuthService, auditService *audit.AuditService, revocationService *RevocationService, emailSender EmailSender, frontendURL string) *AuthHandler {
	return &AuthHandler{service: service, auditService: auditService, revocationService: revocationService, emailSender: emailSender, frontendURL: frontendURL}
}

// Routes is intentionally unused — all auth routes are registered directly in
// server.go so that public and protected sub-groups can be separated with the
// correct middleware.  This method is kept only as a documentation reference.
//
// Actual route layout (registered in server.go):
//
//	Public (no auth):
//	  POST /auth/login
//	  POST /auth/refresh
//	  POST /auth/forgot-password
//	  POST /auth/reset-password
//	  GET  /auth/oidc/config
//	  POST /auth/oidc/callback
//	  POST /auth/oidc/refresh
//
//	Protected (AuthDualMode middleware):
//	  GET    /auth/me
//	  POST   /auth/logout
//	  POST   /auth/change-password
//	  PATCH  /auth/profile
//	  POST   /auth/profile/photo
//	  DELETE /auth/profile/photo
func (h *AuthHandler) Routes(_ chi.Router) {}

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
		return strings.TrimSpace(strings.SplitN(xff, ",", 2)[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	// RemoteAddr is "ip:port" — use net.SplitHostPort to correctly
	// handle both IPv4 ("127.0.0.1:port") and IPv6 ("[::1]:port").
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
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
//
// refreshToken in the body is optional:
//   - Dev-mode (HS256 JWT): the frontend sends refreshToken so it can be
//     revoked immediately in the database.
//   - OIDC mode (Entra ID): the frontend has no platform refresh token to
//     send; the handler still succeeds and cleans up via the steps below.
//
// Regardless of mode, the handler:
//  1. Revokes the access token in Redis so it can't be reused before expiry.
//  2. Marks the current active_sessions record as revoked (session tracker).
//  3. Revokes the refresh token from the DB only when one is provided.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Decode body leniently — an empty or absent body is valid in OIDC mode.
	var req logoutRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	tokenString := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

	// 1. Revoke the access token in Redis (dev JWT path only — OIDC tokens
	//    are RS256 and will fail ValidateToken, which is intentional).
	if tokenString != "" && h.revocationService != nil {
		if claims, err := ValidateToken(tokenString, h.service.jwtCfg.Secret); err == nil && claims.ID != "" {
			ttl := time.Until(claims.ExpiresAt.Time)
			if ttl > 0 {
				_ = h.revocationService.RevokeToken(r.Context(), claims.ID, ttl)
			}
		}
	}

	// 2. Revoke the active_sessions record for this specific session.
	//    Both dev-mode and OIDC sessions are tracked by hash(access_token).
	if tokenString != "" {
		h.service.RevokeSessionByTokenHash(r.Context(), tokenString)
	}

	// 3. Revoke the platform refresh token (dev mode only — no-op if absent).
	if req.RefreshToken != "" {
		if err := h.service.Logout(r.Context(), req.RefreshToken); err != nil {
			writeAppError(w, r, err)
			return
		}
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

	if token != "" {
		resetURL := h.frontendURL + "/auth/reset-password?token=" + token
		resp["resetUrl"] = resetURL

		// Send password reset email via configured email provider.
		if h.emailSender != nil {
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
				defer cancel()
				htmlBody := buildPasswordResetEmail(req.Email, resetURL)
				if err := h.emailSender.SendMail(ctx, req.Email, "Password Reset - ITD-OPMS", htmlBody); err != nil {
					slog.Error("failed to send password reset email", "email", req.Email, "error", err)
				} else {
					slog.Info("password reset email sent", "email", req.Email)
				}
			}()
			resp["emailSent"] = "true"
		} else {
			// Dev mode fallback: include token in response for direct use.
			resp["resetToken"] = token
			resp["devMode"] = "true"
		}
	}

	types.OK(w, resp, nil)
}

// buildPasswordResetEmail generates a branded HTML email for password resets.
func buildPasswordResetEmail(email, resetURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#1B7340,#22C55E);padding:32px;text-align:center">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">ITD-OPMS</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:13px">Operations &amp; Project Management System</p>
  </td></tr>
  <tr><td style="padding:32px">
    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a">Password Reset</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
      We received a password reset request for <strong>%s</strong>.
      Click the button below to set a new password. This link expires in 30 minutes.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%%"><tr><td align="center">
      <a href="%s" style="display:inline-block;background:#1B7340;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600">
        Reset Password
      </a>
    </td></tr></table>
    <p style="color:#888;font-size:12px;line-height:1.5;margin:24px 0 0">
      If you didn't request this, you can safely ignore this email. Your password won't change.
    </p>
  </td></tr>
  <tr><td style="background:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid #e9ecef">
    <p style="color:#999;font-size:11px;margin:0">Central Bank of Nigeria — Information Technology Department</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`, email, resetURL)
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

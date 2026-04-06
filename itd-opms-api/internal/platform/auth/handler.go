package auth

import (
	"context"
	"encoding/json"
	"errors"
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
	enforcer          *LicenseEnforcer
	mfaSvc            *MFAService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(service *AuthService, auditService *audit.AuditService, revocationService *RevocationService, emailSender EmailSender, frontendURL string, enforcer *LicenseEnforcer, mfaSvc *MFAService) *AuthHandler {
	return &AuthHandler{service: service, auditService: auditService, revocationService: revocationService, emailSender: emailSender, frontendURL: frontendURL, enforcer: enforcer, mfaSvc: mfaSvc}
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

	resp, mfaResp, err := h.service.Login(r.Context(), req.Email, req.Password)
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

	// MFA required — create challenge and return (no tokens issued).
	if mfaResp != nil {
		challengeID, err := h.mfaSvc.CreateChallenge(r.Context(), mfaResp.UserID)
		if err != nil {
			writeAppError(w, r, err)
			return
		}
		mfaResp.ChallengeID = challengeID.String()

		// Audit log for MFA challenge
		mfaChanges, _ := json.Marshal(map[string]string{
			"email":  req.Email,
			"action": "mfa_challenge_created",
		})
		_ = h.auditService.Log(r.Context(), audit.AuditEntry{
			ActorID:       mfaResp.UserID,
			Action:        "auth.mfa_required",
			EntityType:    "session",
			EntityID:      mfaResp.UserID,
			Changes:       mfaChanges,
			IPAddress:     realIP(r),
			UserAgent:     r.UserAgent(),
			CorrelationID: types.GetCorrelationID(r.Context()),
		})

		types.OK(w, mfaResp, nil)
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

	// Enforce concurrent license limit.
	if h.enforcer != nil {
		if err := h.enforcer.CheckAndIncrement(r.Context()); err != nil {
			if errors.Is(err, ErrLicenseCapacityReached) {
				slog.Warn("license capacity reached",
					"email", req.Email,
					"ip", realIP(r),
				)
				types.ErrorMessage(w, http.StatusTooManyRequests,
					"LICENSE_LIMIT", "Maximum concurrent license limit reached. Please try again later.",
				)
				return
			}
			// Non-fatal: log and continue (fail-open).
			slog.ErrorContext(r.Context(), "license check failed", "error", err)
		}
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

	// Decrement the license counter.
	if h.enforcer != nil {
		h.enforcer.Decrement(r.Context())
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

// buildPasswordResetEmail generates a premium branded HTML email for password resets.
func buildPasswordResetEmail(email, resetURL string) string {
	year := time.Now().Year()
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Password Reset - ITD-OPMS</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%%; -ms-text-size-adjust: 100%%; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100%% !important; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100%% !important; max-width: 100%% !important; }
      .fluid { max-width: 100%% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100%% !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; }
      .padding-mobile { padding-left: 20px !important; padding-right: 20px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .dark-bg { background-color: #1a1a2e !important; }
      .dark-card { background-color: #16213e !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:#f0f2f5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <div role="article" aria-roledescription="email" aria-label="Password Reset" lang="en" style="font-size:medium;font-size:max(16px,1rem)">

  <!-- Background -->
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f2f5;">
  <tr><td align="center" style="padding:40px 16px;">

    <!-- Email container -->
    <table role="presentation" class="email-container" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;width:100%%;">

      <!-- Logo + Shield header -->
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <!-- Shield icon as inline SVG for email compatibility -->
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#0d5c2e 0%%,#1B7340 50%%,#22c55e 100%%);border-radius:10px;display:inline-block;text-align:center;line-height:40px;">
                  <span style="color:#ffffff;font-size:18px;font-weight:700;">&#9741;</span>
                </div>
              </td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">ITD-OPMS</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280;letter-spacing:0.5px;text-transform:uppercase;">Operations &amp; Project Management</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Main card -->
      <tr>
        <td>
          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04);">

            <!-- Green accent bar -->
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#0d5c2e 0%%,#1B7340 30%%,#22c55e 70%%,#4ade80 100%%);font-size:0;line-height:0;">&nbsp;</td>
            </tr>

            <!-- Icon + title section -->
            <tr>
              <td class="padding-mobile" style="padding:40px 44px 0;">
                <!-- Lock icon circle -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="width:56px;height:56px;background:linear-gradient(135deg,rgba(27,115,64,0.08),rgba(34,197,94,0.12));border-radius:16px;text-align:center;vertical-align:middle;">
                      <span style="font-size:26px;line-height:56px;">&#128274;</span>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:20px 0 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.3px;line-height:1.2;">
                  Reset Your Password
                </h1>
                <p style="margin:8px 0 0;font-size:15px;color:#6b7280;line-height:1.5;">
                  We received a password reset request for your account.
                </p>
              </td>
            </tr>

            <!-- Info box -->
            <tr>
              <td class="padding-mobile" style="padding:24px 44px 0;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafb;border:1px solid #e5e7eb;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:12px;">
                            <div style="width:32px;height:32px;background:rgba(59,130,246,0.1);border-radius:8px;text-align:center;line-height:32px;">
                              <span style="font-size:15px;">&#9993;</span>
                            </div>
                          </td>
                          <td style="vertical-align:middle;">
                            <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Account</p>
                            <p style="margin:3px 0 0;font-size:14px;color:#374151;font-weight:600;">%s</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td class="padding-mobile" style="padding:28px 44px 0;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="%s" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="15%%" stroke="f" fillcolor="#1B7340">
                        <w:anchorlock/>
                        <center>
                      <![endif]-->
                      <a href="%s" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1B7340,#16a34a);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(27,115,64,0.3),0 2px 6px rgba(27,115,64,0.2);mso-padding-alt:0;text-underline-color:#1B7340;">
                        <!--[if mso]><i style="letter-spacing:48px;mso-font-width:-100%%;mso-text-raise:24pt">&nbsp;</i><![endif]-->
                        <span style="mso-text-raise:12pt;">Reset Password &rarr;</span>
                        <!--[if mso]><i style="letter-spacing:48px;mso-font-width:-100%%">&nbsp;</i><![endif]-->
                      </a>
                      <!--[if mso]>
                        </center>
                      </v:roundrect>
                      <![endif]-->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Expiry notice -->
            <tr>
              <td class="padding-mobile" style="padding:20px 44px 0;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;">
                  <tr>
                    <td style="padding:12px 16px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:10px;">
                            <span style="font-size:16px;">&#9200;</span>
                          </td>
                          <td style="vertical-align:middle;">
                            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.4;">
                              This link expires in <strong>30 minutes</strong>. After that, you'll need to request a new one.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td class="padding-mobile" style="padding:28px 44px 0;">
                <div style="height:1px;background:linear-gradient(90deg,transparent,#e5e7eb 20%%,#e5e7eb 80%%,transparent);"></div>
              </td>
            </tr>

            <!-- Security note -->
            <tr>
              <td class="padding-mobile" style="padding:20px 44px 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:top;padding-right:10px;">
                      <span style="font-size:14px;">&#128737;</span>
                    </td>
                    <td>
                      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                        <strong style="color:#6b7280;">Didn't request this?</strong> No worries — your password is safe and won't be changed. You can safely ignore this email. If you're concerned about your account security, please contact IT support.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:28px 20px 0;">
          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="center">
                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                  <strong style="color:#6b7280;">Central Bank of Nigeria</strong>
                </p>
                <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;line-height:1.5;">
                  Information Technology Department
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:16px;">
                <div style="height:1px;width:40px;background:#d1d5db;margin:0 auto;"></div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 0 0;">
                <p style="margin:0;font-size:10px;color:#c0c5ce;line-height:1.5;">
                  This is an automated message from ITD-OPMS. Please do not reply directly to this email.
                </p>
                <p style="margin:4px 0 0;font-size:10px;color:#c0c5ce;">
                  &copy; %d Central Bank of Nigeria. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
    <!-- /Email container -->

  </td></tr>
  </table>
  <!-- /Background -->

  </div>
</body>
</html>`, email, resetURL, resetURL, year)
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

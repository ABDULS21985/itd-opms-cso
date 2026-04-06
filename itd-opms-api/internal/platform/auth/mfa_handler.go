package auth

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/shared/helpers"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// MFAHandler provides HTTP handlers for MFA endpoints.
type MFAHandler struct {
	mfaSvc   *MFAService
	authSvc  *AuthService
	auditSvc *audit.AuditService
	enforcer *LicenseEnforcer
}

// NewMFAHandler creates a new MFAHandler.
func NewMFAHandler(mfaSvc *MFAService, authSvc *AuthService, auditSvc *audit.AuditService, enforcer *LicenseEnforcer) *MFAHandler {
	return &MFAHandler{mfaSvc: mfaSvc, authSvc: authSvc, auditSvc: auditSvc, enforcer: enforcer}
}

// SetupTOTP handles POST /api/v1/auth/mfa/setup/totp (protected).
func (h *MFAHandler) SetupTOTP(w http.ResponseWriter, r *http.Request) {
	auth := types.MustGetAuthContext(r.Context())

	resp, err := h.mfaSvc.SetupTOTP(r.Context(), auth.UserID, auth.Email)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, resp, nil)
}

// VerifyTOTPSetup handles POST /api/v1/auth/mfa/setup/totp/verify (protected).
func (h *MFAHandler) VerifyTOTPSetup(w http.ResponseWriter, r *http.Request) {
	auth := types.MustGetAuthContext(r.Context())

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Verification code is required")
		return
	}

	if err := h.mfaSvc.VerifyTOTPSetup(r.Context(), auth.UserID, req.Code); err != nil {
		writeAppError(w, r, err)
		return
	}

	// Auto-generate backup codes after TOTP verification
	codes, err := h.mfaSvc.GenerateBackupCodes(r.Context(), auth.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	// Audit log
	changes, _ := json.Marshal(map[string]string{"action": "totp_setup_complete"})
	_ = h.auditSvc.Log(r.Context(), audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "mfa.totp_enabled",
		EntityType:    "user",
		EntityID:      auth.UserID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(r.Context()),
	})

	types.OK(w, map[string]interface{}{
		"message":     "TOTP enabled successfully",
		"backupCodes": codes,
	}, nil)
}

// GenerateBackupCodes handles POST /api/v1/auth/mfa/setup/backup-codes (protected).
func (h *MFAHandler) GenerateBackupCodes(w http.ResponseWriter, r *http.Request) {
	auth := types.MustGetAuthContext(r.Context())

	codes, err := h.mfaSvc.GenerateBackupCodes(r.Context(), auth.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]interface{}{
		"backupCodes": codes,
	}, nil)
}

// VerifyMFAChallenge handles POST /api/v1/auth/mfa/verify (public — during login).
func (h *MFAHandler) VerifyMFAChallenge(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ChallengeID string `json:"challengeId"`
		Method      string `json:"method"`
		Code        string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ChallengeID == "" || req.Method == "" || req.Code == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "challengeId, method, and code are required")
		return
	}

	challengeID, err := uuid.Parse(req.ChallengeID)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid challenge ID")
		return
	}

	userID, err := h.mfaSvc.VerifyChallenge(r.Context(), challengeID, req.Method, req.Code)
	if err != nil {
		slog.Warn("MFA verification failed",
			"challenge_id", req.ChallengeID,
			"method", req.Method,
			"error", err.Error(),
		)
		writeAppError(w, r, err)
		return
	}

	// MFA verified — issue full tokens
	loginResp, err := h.authSvc.GenerateLoginTokens(r.Context(), userID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	// License enforcement
	if h.enforcer != nil {
		if err := h.enforcer.CheckAndIncrement(r.Context()); err != nil {
			if err == ErrLicenseCapacityReached {
				types.ErrorMessage(w, http.StatusTooManyRequests,
					"LICENSE_LIMIT", "Maximum concurrent license limit reached. Please try again later.",
				)
				return
			}
			slog.ErrorContext(r.Context(), "license check failed", "error", err)
		}
	}

	// Create session
	tokenHash := helpers.SHA256Checksum([]byte(loginResp.AccessToken))
	expiresAt := loginResp.User.LastLoginAt
	if expiresAt != nil {
		h.authSvc.CreateSession(r.Context(), loginResp.User.ID, loginResp.User.TenantID, tokenHash, realIP(r), r.Header.Get("User-Agent"), expiresAt.Add(h.authSvc.jwtCfg.RefreshExpiry))
	}

	// Audit log
	changes, _ := json.Marshal(map[string]string{
		"email":  loginResp.User.Email,
		"method": req.Method,
	})
	_ = h.auditSvc.Log(r.Context(), audit.AuditEntry{
		TenantID:      loginResp.User.TenantID,
		ActorID:       loginResp.User.ID,
		ActorRole:     firstRole(loginResp.User.Roles),
		Action:        "auth.mfa_login_success",
		EntityType:    "session",
		EntityID:      loginResp.User.ID,
		Changes:       changes,
		IPAddress:     realIP(r),
		UserAgent:     r.UserAgent(),
		CorrelationID: types.GetCorrelationID(r.Context()),
	})

	types.OK(w, loginResp, nil)
}

// ListMethods handles GET /api/v1/auth/mfa/methods (protected).
func (h *MFAHandler) ListMethods(w http.ResponseWriter, r *http.Request) {
	auth := types.MustGetAuthContext(r.Context())

	methods, err := h.mfaSvc.ListMethods(r.Context(), auth.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, methods, nil)
}

// RemoveMethod handles DELETE /api/v1/auth/mfa/methods/{id} (protected).
func (h *MFAHandler) RemoveMethod(w http.ResponseWriter, r *http.Request) {
	auth := types.MustGetAuthContext(r.Context())

	methodID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid method ID")
		return
	}

	if err := h.mfaSvc.RemoveMethod(r.Context(), auth.UserID, methodID); err != nil {
		writeAppError(w, r, err)
		return
	}

	// Audit log
	changes, _ := json.Marshal(map[string]string{"method_id": methodID.String()})
	_ = h.auditSvc.Log(r.Context(), audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "mfa.method_removed",
		EntityType:    "user",
		EntityID:      auth.UserID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(r.Context()),
	})

	types.OK(w, map[string]string{"message": "MFA method removed"}, nil)
}

// AdminResetMFA handles POST /api/v1/system/users/{id}/reset-mfa (admin).
func (h *MFAHandler) AdminResetMFA(w http.ResponseWriter, r *http.Request) {
	auth := types.MustGetAuthContext(r.Context())

	targetUserID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	if err := h.mfaSvc.AdminResetMFA(r.Context(), targetUserID); err != nil {
		writeAppError(w, r, err)
		return
	}

	// Audit log
	changes, _ := json.Marshal(map[string]string{
		"target_user_id": targetUserID.String(),
		"action":         "admin_mfa_reset",
	})
	_ = h.auditSvc.Log(r.Context(), audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "mfa.admin_reset",
		EntityType:    "user",
		EntityID:      targetUserID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(r.Context()),
	})

	types.OK(w, map[string]string{"message": "MFA reset for user"}, nil)
}

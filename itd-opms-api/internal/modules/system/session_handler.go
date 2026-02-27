package system

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// SessionHandler
// ──────────────────────────────────────────────

// SessionHandler handles HTTP requests for session management.
type SessionHandler struct {
	svc *SessionService
}

// NewSessionHandler creates a new SessionHandler.
func NewSessionHandler(svc *SessionService) *SessionHandler {
	return &SessionHandler{svc: svc}
}

// Routes mounts session management endpoints on the given router.
func (h *SessionHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("system.manage")).Get("/", h.ListSessions)
	r.With(middleware.RequirePermission("system.manage")).Get("/stats", h.GetSessionStats)
	r.With(middleware.RequirePermission("system.manage")).Delete("/{id}", h.RevokeSession)
	r.With(middleware.RequirePermission("system.manage")).Delete("/user/{userId}", h.RevokeUserSessions)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListSessions handles GET /system/sessions — paginated active sessions.
func (h *SessionHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pagination := types.ParsePagination(r)
	sessions, total, err := h.svc.ListSessions(r.Context(), auth.TenantID, pagination.Page, pagination.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, sessions, types.NewMeta(total, pagination))
}

// GetSessionStats handles GET /system/sessions/stats — session statistics.
func (h *SessionHandler) GetSessionStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetSessionStats(r.Context(), auth.TenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// RevokeSession handles DELETE /system/sessions/{id} — revoke a single session.
func (h *SessionHandler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid session ID")
		return
	}

	if err := h.svc.RevokeSession(r.Context(), sessionID, auth.UserID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// RevokeUserSessions handles DELETE /system/sessions/user/{userId} — revoke all sessions for a user.
func (h *SessionHandler) RevokeUserSessions(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	userID, err := uuid.Parse(chi.URLParam(r, "userId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user ID")
		return
	}

	if err := h.svc.RevokeUserSessions(r.Context(), auth.TenantID, userID, auth.UserID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

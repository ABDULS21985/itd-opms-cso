package notification

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const streamTokenTTL = 1 * time.Minute

// Handler provides HTTP handlers for notification endpoints.
type Handler struct {
	svc               *Service
	streamTokenSecret string
}

// NewHandler creates a new Handler.
func NewHandler(svc *Service, streamTokenSecret ...string) *Handler {
	secret := ""
	if len(streamTokenSecret) > 0 {
		secret = streamTokenSecret[0]
	}
	return &Handler{svc: svc, streamTokenSecret: secret}
}

// Routes mounts the notification routes on the given chi router.
//
// Example usage:
//
//	r.Route("/api/v1/notifications", func(r chi.Router) {
//	    handler := notification.NewHandler(notificationService)
//	    handler.Routes(r)
//	})
func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.ListNotifications)
	r.Get("/unread-count", h.GetUnreadCount)
	r.Post("/stream-token", h.IssueStreamToken)
	r.Post("/{id}/read", h.MarkAsRead)
	r.Post("/read-all", h.MarkAllAsRead)
	r.Get("/preferences", h.GetPreferences)
	r.Put("/preferences", h.UpdatePreferences)
}

// IssueStreamToken mints a short-lived, scoped SSE token and stores it in an
// httpOnly cookie for EventSource authentication. The token is intentionally
// not returned in the response body.
func (h *Handler) IssueStreamToken(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}
	if h.streamTokenSecret == "" {
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Stream token signing is not configured")
		return
	}

	token, expiresAt, err := auth.GenerateSSEStreamToken(
		h.streamTokenSecret,
		authCtx.UserID,
		authCtx.TenantID,
		authCtx.Email,
		authCtx.Roles,
		authCtx.Permissions,
		streamTokenTTL,
	)
	if err != nil {
		slog.Error("failed to issue SSE stream token",
			"error", err.Error(),
			"user_id", authCtx.UserID,
			"correlation_id", types.GetCorrelationID(r.Context()),
		)
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to issue stream token")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     auth.SSEStreamTokenCookieName,
		Value:    token,
		Path:     "/api/v1/notifications/stream",
		Expires:  expiresAt,
		MaxAge:   int(streamTokenTTL.Seconds()),
		HttpOnly: true,
		Secure:   isSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
	})

	types.OK(w, map[string]time.Time{"expiresAt": expiresAt}, nil)
}

func isSecureRequest(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

// ListNotifications handles GET /notifications.
// Returns paginated in-app notifications for the authenticated user.
func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	pagination := types.ParsePagination(r)

	notifications, total, err := h.svc.GetUserNotifications(
		r.Context(), authCtx.UserID, pagination.Limit, pagination.Offset(),
	)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	meta := types.NewMeta(total, pagination)
	types.OK(w, notifications, meta)
}

// GetUnreadCount handles GET /notifications/unread-count.
// Returns the number of unread notifications for the authenticated user.
func (h *Handler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	count, err := h.svc.GetUnreadCount(r.Context(), authCtx.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]int64{"unreadCount": count}, nil)
}

// MarkAsRead handles POST /notifications/{id}/read.
// Marks a single notification as read for the authenticated user.
func (h *Handler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	notificationID, err := uuid.Parse(idStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid notification ID")
		return
	}

	if err := h.svc.MarkAsRead(r.Context(), authCtx.UserID, notificationID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"message": "Notification marked as read"}, nil)
}

// MarkAllAsRead handles POST /notifications/read-all.
// Marks all unread notifications as read for the authenticated user.
func (h *Handler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	count, err := h.svc.MarkAllAsRead(r.Context(), authCtx.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]int64{"markedCount": count}, nil)
}

// GetPreferences handles GET /notifications/preferences.
// Returns the notification preferences for the authenticated user.
func (h *Handler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	prefs, err := h.svc.GetUserPreferences(r.Context(), authCtx.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, prefs, nil)
}

// validDigestFrequencies is the set of accepted digest_frequency values.
// Must stay in sync with the DB CHECK constraint in user_notification_preferences.
var validDigestFrequencies = map[string]bool{
	"immediate": true,
	"daily":     true,
	"weekly":    true,
}

// UpdatePreferences handles PUT /notifications/preferences.
// Creates or updates notification preferences for the authenticated user.
func (h *Handler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.DigestFrequency == "" {
		req.DigestFrequency = "immediate"
	}
	if !validDigestFrequencies[req.DigestFrequency] {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST",
			"digestFrequency must be one of: immediate, daily, weekly")
		return
	}

	if err := h.svc.UpdateUserPreferences(r.Context(), authCtx.UserID, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"message": "Preferences updated successfully"}, nil)
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

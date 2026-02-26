package knowledge

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// AnnouncementHandler
// ──────────────────────────────────────────────

// AnnouncementHandler handles HTTP requests for announcements.
type AnnouncementHandler struct {
	svc *AnnouncementService
}

// NewAnnouncementHandler creates a new AnnouncementHandler.
func NewAnnouncementHandler(svc *AnnouncementService) *AnnouncementHandler {
	return &AnnouncementHandler{svc: svc}
}

// Routes mounts announcement endpoints on the given router.
func (h *AnnouncementHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("knowledge.view")).Get("/", h.ListAnnouncements)
	r.With(middleware.RequirePermission("knowledge.view")).Get("/{id}", h.GetAnnouncement)
	r.With(middleware.RequirePermission("knowledge.manage")).Post("/", h.CreateAnnouncement)
	r.With(middleware.RequirePermission("knowledge.manage")).Put("/{id}", h.UpdateAnnouncement)
	r.With(middleware.RequirePermission("knowledge.manage")).Delete("/{id}", h.DeleteAnnouncement)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListAnnouncements handles GET / — returns a paginated list of announcements.
func (h *AnnouncementHandler) ListAnnouncements(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var isActive *bool
	if v := r.URL.Query().Get("is_active"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid is_active value")
			return
		}
		isActive = &parsed
	}

	params := types.ParsePagination(r)

	announcements, total, err := h.svc.ListAnnouncements(r.Context(), isActive, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, announcements, types.NewMeta(int64(total), params))
}

// GetAnnouncement handles GET /{id} — retrieves a single announcement.
func (h *AnnouncementHandler) GetAnnouncement(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid announcement ID")
		return
	}

	announcement, err := h.svc.GetAnnouncement(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, announcement, nil)
}

// CreateAnnouncement handles POST / — creates a new announcement.
func (h *AnnouncementHandler) CreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.Content == "" || req.Priority == "" || req.TargetAudience == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title, content, priority, and target audience are required")
		return
	}

	announcement, err := h.svc.CreateAnnouncement(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, announcement)
}

// UpdateAnnouncement handles PUT /{id} — updates an announcement.
func (h *AnnouncementHandler) UpdateAnnouncement(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid announcement ID")
		return
	}

	var req UpdateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	announcement, err := h.svc.UpdateAnnouncement(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, announcement, nil)
}

// DeleteAnnouncement handles DELETE /{id} — deletes an announcement.
func (h *AnnouncementHandler) DeleteAnnouncement(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid announcement ID")
		return
	}

	if err := h.svc.DeleteAnnouncement(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

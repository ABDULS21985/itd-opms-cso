package system

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// AuditExplorerHandler
// ──────────────────────────────────────────────

// AuditExplorerHandler handles HTTP requests for the advanced audit log explorer.
type AuditExplorerHandler struct {
	svc *AuditExplorerService
}

// NewAuditExplorerHandler creates a new AuditExplorerHandler.
func NewAuditExplorerHandler(svc *AuditExplorerService) *AuditExplorerHandler {
	return &AuditExplorerHandler{svc: svc}
}

// Routes mounts audit explorer endpoints on the given router.
func (h *AuditExplorerHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("audit.view")).Get("/", h.ListEvents)
	r.With(middleware.RequirePermission("audit.view")).Get("/stats", h.GetStats)
	r.With(middleware.RequirePermission("audit.view")).Get("/export", h.ExportEvents)
	r.With(middleware.RequirePermission("audit.manage")).Post("/verify", h.VerifyIntegrity)
	r.With(middleware.RequirePermission("audit.view")).Get("/entity/{type}/{id}", h.GetEntityTimeline)
	r.With(middleware.RequirePermission("audit.view")).Get("/{id}", h.GetEvent)
}

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

// ListEvents handles GET /system/audit — paginated audit event listing.
func (h *AuditExplorerHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := parseAuditExplorerParams(r)

	events, total, err := h.svc.ListEvents(r.Context(), auth.TenantID, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	pagination := types.PaginationParams{
		Page:  params.Page,
		Limit: params.PageSize,
	}
	types.OK(w, events, types.NewMeta(total, pagination))
}

// GetEvent handles GET /system/audit/{id} — single audit event detail.
func (h *AuditExplorerHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid audit event ID")
		return
	}

	event, err := h.svc.GetEvent(r.Context(), eventID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, event, nil)
}

// GetEntityTimeline handles GET /system/audit/entity/{type}/{id} — entity audit timeline.
func (h *AuditExplorerHandler) GetEntityTimeline(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := chi.URLParam(r, "type")
	if entityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Entity type is required")
		return
	}

	entityID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entity ID")
		return
	}

	events, err := h.svc.GetEntityTimeline(r.Context(), entityType, entityID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, events, nil)
}

// GetStats handles GET /system/audit/stats — aggregated audit statistics.
func (h *AuditExplorerHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	q := r.URL.Query()

	// Default to last 30 days if not provided.
	dateTo := time.Now().UTC()
	dateFrom := dateTo.AddDate(0, 0, -30)

	if v := q.Get("dateFrom"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			dateFrom = t
		}
	}
	if v := q.Get("dateTo"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			dateTo = t
		}
	}

	stats, err := h.svc.GetStats(r.Context(), auth.TenantID, dateFrom, dateTo)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// ExportEvents handles GET /system/audit/export — bulk export of audit events.
func (h *AuditExplorerHandler) ExportEvents(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := parseAuditExplorerParams(r)

	events, err := h.svc.ExportEvents(r.Context(), auth.TenantID, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, events, nil)
}

// VerifyIntegrity handles POST /system/audit/verify — checksum chain verification.
func (h *AuditExplorerHandler) VerifyIntegrity(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req IntegrityVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	result, err := h.svc.VerifyIntegrity(r.Context(), auth.TenantID, req.DateFrom, req.DateTo)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// parseAuditExplorerParams extracts audit explorer query parameters from the request.
func parseAuditExplorerParams(r *http.Request) AuditExplorerParams {
	q := r.URL.Query()

	params := AuditExplorerParams{
		Page:       1,
		PageSize:   20,
		ActorID:    q.Get("actorId"),
		EntityType: q.Get("entityType"),
		EntityID:   q.Get("entityId"),
		Action:     q.Get("action"),
		Search:     q.Get("search"),
		SortBy:     q.Get("sortBy"),
		SortOrder:  q.Get("sortOrder"),
	}

	if v := q.Get("page"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			params.Page = p
		}
	}

	if v := q.Get("limit"); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 && l <= 100 {
			params.PageSize = l
		}
	}

	if v := q.Get("dateFrom"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			params.DateFrom = &t
		}
	}

	if v := q.Get("dateTo"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			params.DateTo = &t
		}
	}

	return params
}

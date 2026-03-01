package audit

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// AuditHandler exposes HTTP endpoints for querying the audit log.
type AuditHandler struct {
	service *AuditService
}

// NewAuditHandler creates a new AuditHandler.
func NewAuditHandler(service *AuditService) *AuditHandler {
	return &AuditHandler{service: service}
}

// Routes mounts audit endpoints under the given router.
func (h *AuditHandler) Routes(r chi.Router) {
	r.Get("/events", h.listEvents)
	r.Get("/events/{eventID}", h.getEvent)
	r.Get("/verify", h.verifyIntegrity)
}

// listEvents handles GET /events with query parameter filters.
func (h *AuditHandler) listEvents(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	pagination := types.ParsePagination(r)

	filter := AuditFilter{
		TenantID: auth.TenantID,
	}

	q := r.URL.Query()

	if action := q.Get("action"); action != "" {
		filter.Action = action
	}

	if entityType := q.Get("entity_type"); entityType != "" {
		filter.EntityType = entityType
	}

	if entityID := q.Get("entity_id"); entityID != "" {
		if id, err := uuid.Parse(entityID); err == nil {
			filter.EntityID = id
		}
	}

	if actorID := q.Get("actor_id"); actorID != "" {
		if id, err := uuid.Parse(actorID); err == nil {
			filter.ActorID = id
		}
	}

	if dateFrom := q.Get("date_from"); dateFrom != "" {
		if t, err := time.Parse(time.RFC3339, dateFrom); err == nil {
			filter.DateFrom = &t
		}
	}

	if dateTo := q.Get("date_to"); dateTo != "" {
		if t, err := time.Parse(time.RFC3339, dateTo); err == nil {
			filter.DateTo = &t
		}
	}

	events, total, err := h.service.Query(r.Context(), filter, pagination)
	if err != nil {
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to query audit events")
		return
	}

	meta := types.NewMeta(total, pagination)
	types.OK(w, events, meta)
}

// getEvent handles GET /events/{eventID}.
func (h *AuditHandler) getEvent(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	eventIDStr := chi.URLParam(r, "eventID")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "invalid event ID")
		return
	}

	event, err := h.service.GetByID(r.Context(), eventID)
	if err != nil {
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to retrieve audit event")
		return
	}

	if event == nil {
		types.ErrorMessage(w, http.StatusNotFound, "NOT_FOUND", "audit event not found")
		return
	}

	// Enforce tenant isolation: only return events belonging to the caller's tenant.
	if event.TenantID != auth.TenantID {
		types.ErrorMessage(w, http.StatusNotFound, "NOT_FOUND", "audit event not found")
		return
	}

	types.OK(w, event, nil)
}

// verifyIntegrity handles GET /verify.
func (h *AuditHandler) verifyIntegrity(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	result, err := h.service.VerifyIntegrity(r.Context(), auth.TenantID)
	if err != nil {
		types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify audit integrity")
		return
	}

	types.OK(w, result, nil)
}

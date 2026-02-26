package itsm

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
// SLAHandler
// ──────────────────────────────────────────────

// SLAHandler handles HTTP requests for SLA policies, business hours,
// escalation rules, and compliance.
type SLAHandler struct {
	svc *SLAService
}

// NewSLAHandler creates a new SLAHandler.
func NewSLAHandler(svc *SLAService) *SLAHandler {
	return &SLAHandler{svc: svc}
}

// Routes mounts SLA endpoints on the given router.
func (h *SLAHandler) Routes(r chi.Router) {
	// SLA Policies
	r.Route("/sla-policies", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListPolicies)
		r.With(middleware.RequirePermission("itsm.view")).Get("/default", h.GetDefaultPolicy)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetPolicy)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreatePolicy)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdatePolicy)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeletePolicy)
	})
	// Business Hours
	r.Route("/business-hours", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListCalendars)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetCalendar)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateCalendar)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateCalendar)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteCalendar)
	})
	// Escalation Rules
	r.Route("/escalation-rules", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListEscalationRules)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetEscalationRule)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateEscalationRule)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateEscalationRule)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteEscalationRule)
	})
	// SLA Compliance / Breaches
	r.With(middleware.RequirePermission("itsm.view")).Get("/sla-compliance", h.GetComplianceStats)
	r.With(middleware.RequirePermission("itsm.view")).Get("/sla-breaches/{ticketId}", h.ListBreaches)
}

// ──────────────────────────────────────────────
// SLA Policy Handlers
// ──────────────────────────────────────────────

// ListPolicies handles GET /sla-policies — returns a paginated list of SLA policies.
func (h *SLAHandler) ListPolicies(w http.ResponseWriter, r *http.Request) {
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

	policies, total, err := h.svc.ListPolicies(r.Context(), isActive, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policies, types.NewMeta(total, params))
}

// GetDefaultPolicy handles GET /sla-policies/default — returns the default active policy.
func (h *SLAHandler) GetDefaultPolicy(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	policy, err := h.svc.GetDefaultPolicy(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policy, nil)
}

// GetPolicy handles GET /sla-policies/{id} — retrieves a single SLA policy.
func (h *SLAHandler) GetPolicy(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid SLA policy ID")
		return
	}

	policy, err := h.svc.GetPolicy(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policy, nil)
}

// CreatePolicy handles POST /sla-policies — creates a new SLA policy.
func (h *SLAHandler) CreatePolicy(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateSLAPolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}
	if req.PriorityTargets == nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Priority targets are required")
		return
	}

	policy, err := h.svc.CreatePolicy(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, policy)
}

// UpdatePolicy handles PUT /sla-policies/{id} — updates an SLA policy.
func (h *SLAHandler) UpdatePolicy(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid SLA policy ID")
		return
	}

	var req UpdateSLAPolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	policy, err := h.svc.UpdatePolicy(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, policy, nil)
}

// DeletePolicy handles DELETE /sla-policies/{id} — deletes an SLA policy.
func (h *SLAHandler) DeletePolicy(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid SLA policy ID")
		return
	}

	if err := h.svc.DeletePolicy(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Business Hours Handlers
// ──────────────────────────────────────────────

// ListCalendars handles GET /business-hours — returns all business hours calendars.
func (h *SLAHandler) ListCalendars(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	calendars, err := h.svc.ListCalendars(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, calendars, nil)
}

// GetCalendar handles GET /business-hours/{id} — retrieves a single calendar.
func (h *SLAHandler) GetCalendar(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid calendar ID")
		return
	}

	calendar, err := h.svc.GetCalendar(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, calendar, nil)
}

// CreateCalendar handles POST /business-hours — creates a new business hours calendar.
func (h *SLAHandler) CreateCalendar(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateBusinessHoursCalendarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}
	if req.Timezone == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Timezone is required")
		return
	}
	if req.Schedule == nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Schedule is required")
		return
	}

	calendar, err := h.svc.CreateCalendar(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, calendar)
}

// UpdateCalendar handles PUT /business-hours/{id} — updates a business hours calendar.
func (h *SLAHandler) UpdateCalendar(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid calendar ID")
		return
	}

	var req UpdateBusinessHoursCalendarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	calendar, err := h.svc.UpdateCalendar(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, calendar, nil)
}

// DeleteCalendar handles DELETE /business-hours/{id} — deletes a business hours calendar.
func (h *SLAHandler) DeleteCalendar(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid calendar ID")
		return
	}

	if err := h.svc.DeleteCalendar(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Escalation Rule Handlers
// ──────────────────────────────────────────────

// ListEscalationRules handles GET /escalation-rules — returns escalation rules.
func (h *SLAHandler) ListEscalationRules(w http.ResponseWriter, r *http.Request) {
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

	rules, err := h.svc.ListEscalationRules(r.Context(), isActive)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rules, nil)
}

// GetEscalationRule handles GET /escalation-rules/{id} — retrieves a single rule.
func (h *SLAHandler) GetEscalationRule(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid escalation rule ID")
		return
	}

	rule, err := h.svc.GetEscalationRule(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rule, nil)
}

// CreateEscalationRule handles POST /escalation-rules — creates a new escalation rule.
func (h *SLAHandler) CreateEscalationRule(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateEscalationRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}
	if req.TriggerType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Trigger type is required")
		return
	}

	rule, err := h.svc.CreateEscalationRule(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, rule)
}

// UpdateEscalationRule handles PUT /escalation-rules/{id} — updates an escalation rule.
func (h *SLAHandler) UpdateEscalationRule(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid escalation rule ID")
		return
	}

	var req UpdateEscalationRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	rule, err := h.svc.UpdateEscalationRule(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rule, nil)
}

// DeleteEscalationRule handles DELETE /escalation-rules/{id} — deletes an escalation rule.
func (h *SLAHandler) DeleteEscalationRule(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid escalation rule ID")
		return
	}

	if err := h.svc.DeleteEscalationRule(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// SLA Compliance / Breach Handlers
// ──────────────────────────────────────────────

// GetComplianceStats handles GET /sla-compliance — returns SLA compliance statistics.
func (h *SLAHandler) GetComplianceStats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var priority *string
	if v := r.URL.Query().Get("priority"); v != "" {
		priority = &v
	}

	stats, err := h.svc.GetComplianceStats(r.Context(), priority)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// ListBreaches handles GET /sla-breaches/{ticketId} — returns breaches for a ticket.
func (h *SLAHandler) ListBreaches(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	ticketID, err := uuid.Parse(chi.URLParam(r, "ticketId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid ticket ID")
		return
	}

	breaches, err := h.svc.ListBreaches(r.Context(), ticketID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, breaches, nil)
}

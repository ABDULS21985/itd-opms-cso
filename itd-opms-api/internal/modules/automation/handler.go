package automation

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────

// Handler handles HTTP requests for automation rule management.
type Handler struct {
	svc *Service
}

// NewHandler creates a new Handler with its own Service wired up internally.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	return &Handler{
		svc: NewService(pool, auditSvc),
	}
}

// Routes mounts automation endpoints on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Route("/rules", func(r chi.Router) {
		r.With(middleware.RequirePermission("automation.view")).Get("/", h.ListRules)
		r.With(middleware.RequirePermission("automation.manage")).Post("/", h.CreateRule)
		r.With(middleware.RequirePermission("automation.view")).Get("/{id}", h.GetRule)
		r.With(middleware.RequirePermission("automation.manage")).Put("/{id}", h.UpdateRule)
		r.With(middleware.RequirePermission("automation.manage")).Delete("/{id}", h.DeleteRule)
		r.With(middleware.RequirePermission("automation.manage")).Post("/{id}/toggle", h.ToggleRule)
		r.With(middleware.RequirePermission("automation.manage")).Post("/{id}/test", h.TestRule)
		r.With(middleware.RequirePermission("automation.view")).Get("/{id}/executions", h.ListRuleExecutions)
	})
	r.With(middleware.RequirePermission("automation.view")).Get("/executions", h.ListAllExecutions)
	r.With(middleware.RequirePermission("automation.view")).Get("/stats", h.GetStats)
}

// ──────────────────────────────────────────────
// Error Helper
// ──────────────────────────────────────────────

// writeAppError maps an application error to the appropriate HTTP response.
func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		status := apperrors.HTTPStatus(err)
		code := apperrors.Code(err)
		if status >= 500 {
			slog.ErrorContext(r.Context(), "internal error",
				"error", err.Error(),
				"path", r.URL.Path,
				"correlation_id", types.GetCorrelationID(r.Context()),
			)
		}
		types.ErrorMessage(w, status, code, appErr.Message)
		return
	}
	slog.ErrorContext(r.Context(), "unhandled error", "error", err)
	types.ErrorMessage(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
}

// ──────────────────────────────────────────────
// Rule Handlers
// ──────────────────────────────────────────────

// ListRules handles GET /rules — paginated list of automation rules.
func (h *Handler) ListRules(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	p := types.ParsePagination(r)

	// Parse optional filters.
	var isActive *bool
	if v := r.URL.Query().Get("isActive"); v == "true" {
		b := true
		isActive = &b
	} else if v == "false" {
		b := false
		isActive = &b
	}

	triggerType := r.URL.Query().Get("triggerType")
	search := r.URL.Query().Get("search")

	rules, total, err := h.svc.ListRules(r.Context(), isActive, triggerType, search, p.Limit, p.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rules, types.NewMeta(total, p))
}

// GetRule handles GET /rules/{id} — retrieves a single rule.
func (h *Handler) GetRule(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid rule ID")
		return
	}

	rule, err := h.svc.GetRule(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rule, nil)
}

// CreateRule handles POST /rules — creates a new automation rule.
func (h *Handler) CreateRule(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateAutomationRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Rule name is required")
		return
	}

	if req.TriggerType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Trigger type is required")
		return
	}

	rule, err := h.svc.CreateRule(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, rule)
}

// UpdateRule handles PUT /rules/{id} — updates an automation rule.
func (h *Handler) UpdateRule(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid rule ID")
		return
	}

	var req UpdateAutomationRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	rule, err := h.svc.UpdateRule(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rule, nil)
}

// DeleteRule handles DELETE /rules/{id} — deletes an automation rule.
func (h *Handler) DeleteRule(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid rule ID")
		return
	}

	if err := h.svc.DeleteRule(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ToggleRule handles POST /rules/{id}/toggle — toggles a rule's active status.
func (h *Handler) ToggleRule(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid rule ID")
		return
	}

	rule, err := h.svc.ToggleRule(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, rule, nil)
}

// TestRule handles POST /rules/{id}/test — dry-run evaluation of a rule.
func (h *Handler) TestRule(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid rule ID")
		return
	}

	var req TestRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.EntityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entity type is required")
		return
	}

	if req.EntityID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entity ID is required")
		return
	}

	result, err := h.svc.TestRule(r.Context(), id, req.EntityType, req.EntityID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}

// ──────────────────────────────────────────────
// Execution Handlers
// ──────────────────────────────────────────────

// ListRuleExecutions handles GET /rules/{id}/executions — execution log for a specific rule.
func (h *Handler) ListRuleExecutions(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	ruleID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid rule ID")
		return
	}

	p := types.ParsePagination(r)
	status := r.URL.Query().Get("status")

	execs, total, err := h.svc.ListExecutions(r.Context(), ruleID, status, p.Limit, p.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, execs, types.NewMeta(total, p))
}

// ListAllExecutions handles GET /executions — execution log across all rules.
func (h *Handler) ListAllExecutions(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	p := types.ParsePagination(r)
	status := r.URL.Query().Get("status")

	execs, total, err := h.svc.ListAllExecutions(r.Context(), status, p.Limit, p.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, execs, types.NewMeta(total, p))
}

// ──────────────────────────────────────────────
// Stats Handler
// ──────────────────────────────────────────────

// GetStats handles GET /stats — automation aggregate statistics.
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

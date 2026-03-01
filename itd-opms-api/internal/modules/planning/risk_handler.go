package planning

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// RiskHandler
// ──────────────────────────────────────────────

// RiskHandler handles HTTP requests for risks, issues, and change requests.
type RiskHandler struct {
	svc *RiskService
}

// NewRiskHandler creates a new RiskHandler.
func NewRiskHandler(svc *RiskService) *RiskHandler {
	return &RiskHandler{svc: svc}
}

// Routes mounts risk, issue, and change request endpoints on the given router.
func (h *RiskHandler) Routes(r chi.Router) {
	// Risks
	r.Route("/risks", func(r chi.Router) {
		r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListRisks)
		r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateRisk)
		r.With(middleware.RequirePermission("planning.view")).Get("/{id}", h.GetRisk)
		r.With(middleware.RequirePermission("planning.manage")).Put("/{id}", h.UpdateRisk)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeleteRisk)
	})

	// Issues
	r.Route("/issues", func(r chi.Router) {
		r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListIssues)
		r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateIssue)
		r.With(middleware.RequirePermission("planning.view")).Get("/{id}", h.GetIssue)
		r.With(middleware.RequirePermission("planning.manage")).Put("/{id}", h.UpdateIssue)
		r.With(middleware.RequirePermission("planning.manage")).Put("/{id}/escalate", h.EscalateIssue)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeleteIssue)
	})

	// Change Requests
	r.Route("/change-requests", func(r chi.Router) {
		r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListChangeRequests)
		r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateChangeRequest)
		r.With(middleware.RequirePermission("planning.view")).Get("/{id}", h.GetChangeRequest)
		r.With(middleware.RequirePermission("planning.manage")).Put("/{id}", h.UpdateChangeRequest)
		r.With(middleware.RequirePermission("planning.manage")).Put("/{id}/status", h.UpdateChangeRequestStatus)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeleteChangeRequest)
	})
}

// ──────────────────────────────────────────────
// Risk Handlers
// ──────────────────────────────────────────────

// ListRisks handles GET /risks — returns a filtered, paginated list of risks.
func (h *RiskHandler) ListRisks(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	// Optional filters.
	var projectID *uuid.UUID
	if v := r.URL.Query().Get("project_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
			return
		}
		projectID = &parsed
	}

	var status, category *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}
	if v := r.URL.Query().Get("category"); v != "" {
		category = &v
	}

	risks, total, err := h.svc.ListRisks(r.Context(), projectID, status, category, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, risks, types.NewMeta(total, params))
}

// CreateRisk handles POST /risks — creates a new risk.
func (h *RiskHandler) CreateRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	risk, err := h.svc.CreateRisk(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, risk)
}

// GetRisk handles GET /risks/{id} — retrieves a single risk.
func (h *RiskHandler) GetRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	risk, err := h.svc.GetRisk(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, risk, nil)
}

// UpdateRisk handles PUT /risks/{id} — updates an existing risk.
func (h *RiskHandler) UpdateRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	var req UpdateRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	risk, err := h.svc.UpdateRisk(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, risk, nil)
}

// DeleteRisk handles DELETE /risks/{id} — deletes a risk.
func (h *RiskHandler) DeleteRisk(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid risk ID")
		return
	}

	if err := h.svc.DeleteRisk(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Issue Handlers
// ──────────────────────────────────────────────

// ListIssues handles GET /issues — returns a filtered, paginated list of issues.
func (h *RiskHandler) ListIssues(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	// Optional filters.
	var projectID *uuid.UUID
	if v := r.URL.Query().Get("project_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
			return
		}
		projectID = &parsed
	}

	var status, severity *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}
	if v := r.URL.Query().Get("severity"); v != "" {
		severity = &v
	}

	issues, total, err := h.svc.ListIssues(r.Context(), projectID, status, severity, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, issues, types.NewMeta(total, params))
}

// CreateIssue handles POST /issues — creates a new issue.
func (h *RiskHandler) CreateIssue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	issue, err := h.svc.CreateIssue(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, issue)
}

// GetIssue handles GET /issues/{id} — retrieves a single issue.
func (h *RiskHandler) GetIssue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid issue ID")
		return
	}

	issue, err := h.svc.GetIssue(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, issue, nil)
}

// UpdateIssue handles PUT /issues/{id} — updates an existing issue.
func (h *RiskHandler) UpdateIssue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid issue ID")
		return
	}

	var req UpdateIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	issue, err := h.svc.UpdateIssue(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, issue, nil)
}

// EscalateIssue handles PUT /issues/{id}/escalate — escalates an issue.
func (h *RiskHandler) EscalateIssue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid issue ID")
		return
	}

	var req EscalateIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.EscalatedToID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "escalated_to_id is required")
		return
	}

	issue, err := h.svc.EscalateIssue(r.Context(), id, req.EscalatedToID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, issue, nil)
}

// DeleteIssue handles DELETE /issues/{id} — deletes an issue.
func (h *RiskHandler) DeleteIssue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid issue ID")
		return
	}

	if err := h.svc.DeleteIssue(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Change Request Handlers
// ──────────────────────────────────────────────

// ListChangeRequests handles GET /change-requests — returns a filtered, paginated list.
func (h *RiskHandler) ListChangeRequests(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	// Optional filters.
	var projectID *uuid.UUID
	if v := r.URL.Query().Get("project_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
			return
		}
		projectID = &parsed
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	crs, total, err := h.svc.ListChangeRequests(r.Context(), projectID, status, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, crs, types.NewMeta(total, params))
}

// CreateChangeRequest handles POST /change-requests — creates a new change request.
func (h *RiskHandler) CreateChangeRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateChangeRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	cr, err := h.svc.CreateChangeRequest(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, cr)
}

// GetChangeRequest handles GET /change-requests/{id} — retrieves a single change request.
func (h *RiskHandler) GetChangeRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change request ID")
		return
	}

	cr, err := h.svc.GetChangeRequest(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, cr, nil)
}

// UpdateChangeRequest handles PUT /change-requests/{id} — updates a change request.
func (h *RiskHandler) UpdateChangeRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change request ID")
		return
	}

	var req UpdateChangeRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	cr, err := h.svc.UpdateChangeRequest(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, cr, nil)
}

// UpdateChangeRequestStatus handles PUT /change-requests/{id}/status — transitions status.
func (h *RiskHandler) UpdateChangeRequestStatus(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change request ID")
		return
	}

	var req UpdateChangeRequestStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	cr, err := h.svc.UpdateChangeRequestStatus(r.Context(), id, req.Status)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, cr, nil)
}

// DeleteChangeRequest handles DELETE /change-requests/{id} — deletes a change request.
func (h *RiskHandler) DeleteChangeRequest(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid change request ID")
		return
	}

	if err := h.svc.DeleteChangeRequest(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

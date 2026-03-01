package approval

import (
	"encoding/json"
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

// Handler handles HTTP requests for the approval workflow engine.
type Handler struct {
	svc *Service
}

// NewHandler creates a new approval Handler.
func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler {
	return &Handler{
		svc: NewService(pool, auditSvc),
	}
}

// Routes mounts approval endpoints on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Workflow definitions (admin)
	r.Route("/workflows", func(r chi.Router) {
		r.With(middleware.RequirePermission("approval.manage")).Get("/", h.ListWorkflowDefinitions)
		r.With(middleware.RequirePermission("approval.manage")).Post("/", h.CreateWorkflowDefinition)
		r.With(middleware.RequirePermission("approval.manage")).Get("/{id}", h.GetWorkflowDefinition)
		r.With(middleware.RequirePermission("approval.manage")).Put("/{id}", h.UpdateWorkflowDefinition)
		r.With(middleware.RequirePermission("approval.manage")).Delete("/{id}", h.DeleteWorkflowDefinition)
	})

	// Approval chains
	r.Route("/chains", func(r chi.Router) {
		r.With(middleware.RequirePermission("approval.manage")).Post("/", h.StartApproval)
		r.With(middleware.RequirePermission("approval.view")).Get("/{id}", h.GetApprovalChain)
		r.With(middleware.RequirePermission("approval.manage")).Post("/{id}/cancel", h.CancelChain)
	})

	// My pending approvals
	r.With(middleware.RequirePermission("approval.view")).Get("/my-pending", h.GetMyPendingApprovals)
	r.With(middleware.RequirePermission("approval.view")).Get("/my-pending/count", h.CountMyPendingApprovals)

	// Step actions (any authenticated user can decide their own steps)
	r.Post("/steps/{id}/decide", h.ProcessDecision)
	r.Post("/steps/{id}/delegate", h.DelegateStep)

	// Entity lookup
	r.With(middleware.RequirePermission("approval.view")).Get("/entity/{entityType}/{entityId}", h.GetApprovalChainForEntity)

	// History
	r.With(middleware.RequirePermission("approval.view")).Get("/history", h.GetApprovalHistory)
}

// ──────────────────────────────────────────────
// Workflow definition handlers
// ──────────────────────────────────────────────

// ListWorkflowDefinitions handles GET /workflows — returns all workflow definitions.
func (h *Handler) ListWorkflowDefinitions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := r.URL.Query().Get("entityType")

	defs, err := h.svc.ListWorkflowDefinitions(r.Context(), authCtx.TenantID, entityType)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, defs, nil)
}

// CreateWorkflowDefinition handles POST /workflows — creates a workflow definition.
func (h *Handler) CreateWorkflowDefinition(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateWorkflowDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	def, err := h.svc.CreateWorkflowDefinition(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, def)
}

// GetWorkflowDefinition handles GET /workflows/{id} — retrieves a workflow definition.
func (h *Handler) GetWorkflowDefinition(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid workflow definition ID")
		return
	}

	def, err := h.svc.GetWorkflowDefinition(r.Context(), authCtx.TenantID, id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, def, nil)
}

// UpdateWorkflowDefinition handles PUT /workflows/{id} — updates a workflow definition.
func (h *Handler) UpdateWorkflowDefinition(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid workflow definition ID")
		return
	}

	var req UpdateWorkflowDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	def, err := h.svc.UpdateWorkflowDefinition(r.Context(), authCtx.TenantID, id, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, def, nil)
}

// DeleteWorkflowDefinition handles DELETE /workflows/{id} — soft-deletes a workflow definition.
func (h *Handler) DeleteWorkflowDefinition(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid workflow definition ID")
		return
	}

	if err := h.svc.DeleteWorkflowDefinition(r.Context(), authCtx.TenantID, id, authCtx.UserID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Approval chain handlers
// ──────────────────────────────────────────────

// StartApproval handles POST /chains — starts a new approval chain.
func (h *Handler) StartApproval(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req StartApprovalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	chain, err := h.svc.StartApproval(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, chain)
}

// GetApprovalChain handles GET /chains/{id} — retrieves an approval chain with steps.
func (h *Handler) GetApprovalChain(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid approval chain ID")
		return
	}

	chain, err := h.svc.GetApprovalChain(r.Context(), authCtx.TenantID, id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, chain, nil)
}

// CancelChain handles POST /chains/{id}/cancel — cancels an in-progress approval chain.
func (h *Handler) CancelChain(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid approval chain ID")
		return
	}

	if err := h.svc.CancelChain(r.Context(), authCtx.TenantID, authCtx.UserID, id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Step action handlers
// ──────────────────────────────────────────────

// ProcessDecision handles POST /steps/{id}/decide — records an approval decision.
func (h *Handler) ProcessDecision(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stepID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid step ID")
		return
	}

	var req ApprovalDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.svc.ProcessDecision(r.Context(), authCtx.TenantID, authCtx.UserID, stepID, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// DelegateStep handles POST /steps/{id}/delegate — delegates a step to another user.
func (h *Handler) DelegateStep(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stepID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid step ID")
		return
	}

	var req DelegateApprovalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.svc.DelegateStep(r.Context(), authCtx.TenantID, authCtx.UserID, stepID, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// My pending / entity lookup / history handlers
// ──────────────────────────────────────────────

// GetMyPendingApprovals handles GET /my-pending — returns pending approvals for the current user.
func (h *Handler) GetMyPendingApprovals(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	items, total, err := h.svc.GetMyPendingApprovals(r.Context(), authCtx.TenantID, authCtx.UserID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, types.NewMeta(total, params))
}

// CountMyPendingApprovals handles GET /my-pending/count — returns the count for badge display.
func (h *Handler) CountMyPendingApprovals(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	count, err := h.svc.CountMyPendingApprovals(r.Context(), authCtx.TenantID, authCtx.UserID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]int{"count": count}, nil)
}

// GetApprovalChainForEntity handles GET /entity/{entityType}/{entityId} — retrieves the chain for an entity.
func (h *Handler) GetApprovalChainForEntity(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := chi.URLParam(r, "entityType")
	entityID, err := uuid.Parse(chi.URLParam(r, "entityId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entity ID")
		return
	}

	chain, err := h.svc.GetApprovalChainForEntity(r.Context(), authCtx.TenantID, entityType, entityID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, chain, nil)
}

// GetApprovalHistory handles GET /history — returns paginated approval chain history.
func (h *Handler) GetApprovalHistory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entityType := r.URL.Query().Get("entityType")
	params := types.ParsePagination(r)

	items, total, err := h.svc.GetApprovalHistory(r.Context(), authCtx.TenantID, entityType, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, types.NewMeta(total, params))
}

// ──────────────────────────────────────────────
// Error helper
// ──────────────────────────────────────────────

// writeAppError maps an application error to the appropriate HTTP response.
func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	status := apperrors.HTTPStatus(err)
	code := apperrors.Code(err)
	if status >= 500 {
		slog.ErrorContext(r.Context(), "internal error",
			"error", err.Error(),
			"path", r.URL.Path,
			"correlation_id", types.GetCorrelationID(r.Context()),
		)
	}
	types.ErrorMessage(w, status, code, err.Error())
}

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
// WorkItemHandler
// ──────────────────────────────────────────────

// WorkItemHandler handles HTTP requests for work items and time entries.
type WorkItemHandler struct {
	svc *WorkItemService
}

// NewWorkItemHandler creates a new WorkItemHandler.
func NewWorkItemHandler(svc *WorkItemService) *WorkItemHandler {
	return &WorkItemHandler{svc: svc}
}

// Routes mounts work item endpoints on the given router.
func (h *WorkItemHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListWorkItems)
	r.With(middleware.RequirePermission("planning.view")).Get("/wbs", h.GetWBS)
	r.With(middleware.RequirePermission("planning.view")).Get("/overdue", h.ListOverdue)
	r.With(middleware.RequirePermission("planning.view")).Get("/status-counts", h.GetStatusCounts)
	r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateWorkItem)
	r.With(middleware.RequirePermission("planning.view")).Get("/{id}", h.GetWorkItem)
	r.With(middleware.RequirePermission("planning.manage")).Put("/{id}", h.UpdateWorkItem)
	r.With(middleware.RequirePermission("planning.manage")).Put("/{id}/transition", h.TransitionWorkItem)
	r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeleteWorkItem)

	// Time entries
	r.With(middleware.RequirePermission("planning.manage")).Post("/{id}/time-entries", h.LogTimeEntry)
	r.With(middleware.RequirePermission("planning.view")).Get("/{id}/time-entries", h.ListTimeEntries)
}

// ListWorkItems handles GET / — returns a filtered, paginated list of work items.
func (h *WorkItemHandler) ListWorkItems(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectIDStr := r.URL.Query().Get("project_id")
	if projectIDStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "project_id query parameter is required")
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
		return
	}

	params := types.ParsePagination(r)

	// Optional filters.
	var status, assignee, priority, wiType *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}
	if v := r.URL.Query().Get("assignee_id"); v != "" {
		assignee = &v
	}
	if v := r.URL.Query().Get("priority"); v != "" {
		priority = &v
	}
	if v := r.URL.Query().Get("type"); v != "" {
		wiType = &v
	}

	items, total, err := h.svc.ListWorkItems(r.Context(), projectID, status, assignee, priority, wiType, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, types.NewMeta(total, params))
}

// GetWBS handles GET /wbs — returns the full WBS tree for a project.
func (h *WorkItemHandler) GetWBS(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectIDStr := r.URL.Query().Get("project_id")
	if projectIDStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "project_id query parameter is required")
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
		return
	}

	tree, err := h.svc.GetWBSTree(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tree, nil)
}

// ListOverdue handles GET /overdue — returns overdue work items for a project.
func (h *WorkItemHandler) ListOverdue(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var projectID *uuid.UUID
	if projectIDStr := r.URL.Query().Get("project_id"); projectIDStr != "" {
		parsed, err := uuid.Parse(projectIDStr)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
			return
		}
		projectID = &parsed
	}

	items, err := h.svc.ListOverdueWorkItems(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, items, nil)
}

// GetStatusCounts handles GET /status-counts — returns aggregated status counts.
func (h *WorkItemHandler) GetStatusCounts(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectIDStr := r.URL.Query().Get("project_id")
	if projectIDStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "project_id query parameter is required")
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
		return
	}

	counts, err := h.svc.GetWorkItemStatusCounts(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, counts, nil)
}

// CreateWorkItem handles POST / — creates a new work item.
func (h *WorkItemHandler) CreateWorkItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateWorkItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	if req.ProjectID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "project_id is required")
		return
	}

	item, err := h.svc.CreateWorkItem(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, item)
}

// GetWorkItem handles GET /{id} — retrieves a single work item.
func (h *WorkItemHandler) GetWorkItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid work item ID")
		return
	}

	item, err := h.svc.GetWorkItem(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// UpdateWorkItem handles PUT /{id} — updates an existing work item.
func (h *WorkItemHandler) UpdateWorkItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid work item ID")
		return
	}

	var req UpdateWorkItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	item, err := h.svc.UpdateWorkItem(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// TransitionWorkItem handles PUT /{id}/transition — transitions work item status.
func (h *WorkItemHandler) TransitionWorkItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid work item ID")
		return
	}

	var req TransitionWorkItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	item, err := h.svc.TransitionWorkItem(r.Context(), id, req.Status)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, item, nil)
}

// DeleteWorkItem handles DELETE /{id} — deletes a work item.
func (h *WorkItemHandler) DeleteWorkItem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid work item ID")
		return
	}

	if err := h.svc.DeleteWorkItem(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// LogTimeEntry handles POST /{id}/time-entries — logs time against a work item.
func (h *WorkItemHandler) LogTimeEntry(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	workItemID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid work item ID")
		return
	}

	var req CreateTimeEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Hours <= 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Hours must be greater than zero")
		return
	}

	entry, err := h.svc.LogTimeEntry(r.Context(), workItemID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, entry)
}

// ListTimeEntries handles GET /{id}/time-entries — lists time entries for a work item.
func (h *WorkItemHandler) ListTimeEntries(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	workItemID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid work item ID")
		return
	}

	entries, err := h.svc.ListTimeEntries(r.Context(), workItemID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entries, nil)
}

// ──────────────────────────────────────────────
// MilestoneHandler
// ──────────────────────────────────────────────

// MilestoneHandler handles HTTP requests for milestones.
type MilestoneHandler struct {
	svc *WorkItemService
}

// NewMilestoneHandler creates a new MilestoneHandler.
func NewMilestoneHandler(svc *WorkItemService) *MilestoneHandler {
	return &MilestoneHandler{svc: svc}
}

// Routes mounts milestone endpoints on the given router.
func (h *MilestoneHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListMilestones)
	r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateMilestone)
	r.With(middleware.RequirePermission("planning.view")).Get("/{id}", h.GetMilestone)
	r.With(middleware.RequirePermission("planning.manage")).Put("/{id}", h.UpdateMilestone)
	r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeleteMilestone)
}

// ListMilestones handles GET / — returns all milestones for a project.
func (h *MilestoneHandler) ListMilestones(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectIDStr := r.URL.Query().Get("project_id")
	if projectIDStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "project_id query parameter is required")
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project_id")
		return
	}

	milestones, err := h.svc.ListMilestones(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, milestones, nil)
}

// CreateMilestone handles POST / — creates a new milestone.
func (h *MilestoneHandler) CreateMilestone(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateMilestoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	if req.ProjectID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "project_id is required")
		return
	}

	if req.TargetDate.IsZero() {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "target_date is required")
		return
	}

	milestone, err := h.svc.CreateMilestone(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, milestone)
}

// GetMilestone handles GET /{id} — retrieves a single milestone.
func (h *MilestoneHandler) GetMilestone(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid milestone ID")
		return
	}

	milestone, err := h.svc.GetMilestone(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, milestone, nil)
}

// UpdateMilestone handles PUT /{id} — updates an existing milestone.
func (h *MilestoneHandler) UpdateMilestone(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid milestone ID")
		return
	}

	var req UpdateMilestoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	milestone, err := h.svc.UpdateMilestone(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, milestone, nil)
}

// DeleteMilestone handles DELETE /{id} — deletes a milestone.
func (h *MilestoneHandler) DeleteMilestone(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid milestone ID")
		return
	}

	if err := h.svc.DeleteMilestone(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

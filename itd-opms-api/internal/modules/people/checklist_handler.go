package people

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ChecklistHandler
// ──────────────────────────────────────────────

// ChecklistHandler handles HTTP requests for checklists, templates, and tasks.
type ChecklistHandler struct {
	svc *ChecklistService
}

// NewChecklistHandler creates a new ChecklistHandler.
func NewChecklistHandler(svc *ChecklistService) *ChecklistHandler {
	return &ChecklistHandler{svc: svc}
}

// Routes mounts checklist endpoints on the given router.
func (h *ChecklistHandler) Routes(r chi.Router) {
	// Templates
	r.Route("/templates", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/", h.ListChecklistTemplates)
		r.With(middleware.RequirePermission("people.view")).Get("/{id}", h.GetChecklistTemplate)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateChecklistTemplate)
		r.With(middleware.RequirePermission("people.manage")).Put("/{id}", h.UpdateChecklistTemplate)
		r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteChecklistTemplate)
	})

	// Checklists (root)
	r.With(middleware.RequirePermission("people.view")).Get("/", h.ListChecklists)
	r.With(middleware.RequirePermission("people.view")).Get("/{id}", h.GetChecklist)
	r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateChecklist)
	r.With(middleware.RequirePermission("people.manage")).Put("/{id}/status", h.UpdateChecklistStatus)
	r.With(middleware.RequirePermission("people.manage")).Delete("/{id}", h.DeleteChecklist)

	// Tasks
	r.Route("/tasks", func(r chi.Router) {
		r.With(middleware.RequirePermission("people.view")).Get("/{checklistId}", h.ListChecklistTasks)
		r.With(middleware.RequirePermission("people.manage")).Post("/", h.CreateChecklistTask)
		r.With(middleware.RequirePermission("people.view")).Get("/item/{id}", h.GetChecklistTask)
		r.With(middleware.RequirePermission("people.manage")).Put("/item/{id}", h.UpdateChecklistTask)
		r.With(middleware.RequirePermission("people.manage")).Put("/item/{id}/complete", h.CompleteChecklistTask)
		r.With(middleware.RequirePermission("people.manage")).Delete("/item/{id}", h.DeleteChecklistTask)
	})
}

// ──────────────────────────────────────────────
// Template Handlers
// ──────────────────────────────────────────────

// ListChecklistTemplates handles GET /templates — returns checklist templates.
func (h *ChecklistHandler) ListChecklistTemplates(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var checklistType *string
	if v := r.URL.Query().Get("type"); v != "" {
		checklistType = &v
	}

	var roleType *string
	if v := r.URL.Query().Get("role_type"); v != "" {
		roleType = &v
	}

	templates, err := h.svc.ListChecklistTemplates(r.Context(), checklistType, roleType)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, templates, nil)
}

// GetChecklistTemplate handles GET /templates/{id} — retrieves a single template.
func (h *ChecklistHandler) GetChecklistTemplate(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid template ID")
		return
	}

	tmpl, err := h.svc.GetChecklistTemplate(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tmpl, nil)
}

// CreateChecklistTemplate handles POST /templates — creates a new template.
func (h *ChecklistHandler) CreateChecklistTemplate(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateChecklistTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" || req.Type == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and type are required")
		return
	}

	tmpl, err := h.svc.CreateChecklistTemplate(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, tmpl)
}

// UpdateChecklistTemplate handles PUT /templates/{id} — updates a template.
func (h *ChecklistHandler) UpdateChecklistTemplate(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid template ID")
		return
	}

	var req UpdateChecklistTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	tmpl, err := h.svc.UpdateChecklistTemplate(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tmpl, nil)
}

// DeleteChecklistTemplate handles DELETE /templates/{id} — deletes a template.
func (h *ChecklistHandler) DeleteChecklistTemplate(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid template ID")
		return
	}

	if err := h.svc.DeleteChecklistTemplate(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Checklist Handlers
// ──────────────────────────────────────────────

// ListChecklists handles GET / — returns a paginated list of checklists.
func (h *ChecklistHandler) ListChecklists(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var checklistType *string
	if v := r.URL.Query().Get("type"); v != "" {
		checklistType = &v
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	var userID *uuid.UUID
	if v := r.URL.Query().Get("user_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid user_id")
			return
		}
		userID = &parsed
	}

	params := types.ParsePagination(r)

	checklists, total, err := h.svc.ListChecklists(r.Context(), checklistType, status, userID, params.Page, params.Limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, checklists, types.NewMeta(int64(total), params))
}

// GetChecklist handles GET /{id} — retrieves a single checklist.
func (h *ChecklistHandler) GetChecklist(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid checklist ID")
		return
	}

	cl, err := h.svc.GetChecklist(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, cl, nil)
}

// CreateChecklist handles POST / — creates a new checklist.
func (h *ChecklistHandler) CreateChecklist(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateChecklistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Type == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Type is required")
		return
	}

	cl, err := h.svc.CreateChecklist(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, cl)
}

// UpdateChecklistStatus handles PUT /{id}/status — updates checklist status.
func (h *ChecklistHandler) UpdateChecklistStatus(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid checklist ID")
		return
	}

	var req UpdateChecklistStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	if err := h.svc.UpdateChecklistStatus(r.Context(), id, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// DeleteChecklist handles DELETE /{id} — deletes a checklist.
func (h *ChecklistHandler) DeleteChecklist(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid checklist ID")
		return
	}

	if err := h.svc.DeleteChecklist(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Task Handlers
// ──────────────────────────────────────────────

// ListChecklistTasks handles GET /tasks/{checklistId} — returns tasks for a checklist.
func (h *ChecklistHandler) ListChecklistTasks(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	checklistID, err := uuid.Parse(chi.URLParam(r, "checklistId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid checklist ID")
		return
	}

	tasks, err := h.svc.ListChecklistTasks(r.Context(), checklistID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, tasks, nil)
}

// CreateChecklistTask handles POST /tasks — creates a new task.
func (h *ChecklistHandler) CreateChecklistTask(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateChecklistTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	task, err := h.svc.CreateChecklistTask(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, task)
}

// GetChecklistTask handles GET /tasks/item/{id} — retrieves a single task.
func (h *ChecklistHandler) GetChecklistTask(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid task ID")
		return
	}

	task, err := h.svc.GetChecklistTask(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, task, nil)
}

// UpdateChecklistTask handles PUT /tasks/item/{id} — updates a task.
func (h *ChecklistHandler) UpdateChecklistTask(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid task ID")
		return
	}

	var req UpdateChecklistTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	task, err := h.svc.UpdateChecklistTask(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, task, nil)
}

// CompleteChecklistTask handles PUT /tasks/item/{id}/complete — marks a task as completed.
func (h *ChecklistHandler) CompleteChecklistTask(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid task ID")
		return
	}

	var req CompleteChecklistTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if err := h.svc.CompleteChecklistTask(r.Context(), id, authCtx.UserID, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// DeleteChecklistTask handles DELETE /tasks/item/{id} — deletes a task.
func (h *ChecklistHandler) DeleteChecklistTask(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid task ID")
		return
	}

	if err := h.svc.DeleteChecklistTask(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

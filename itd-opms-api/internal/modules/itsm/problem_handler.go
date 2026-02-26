package itsm

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ProblemHandler
// ──────────────────────────────────────────────

// ProblemHandler handles HTTP requests for problem management and known errors.
type ProblemHandler struct {
	svc *ProblemService
}

// NewProblemHandler creates a new ProblemHandler.
func NewProblemHandler(svc *ProblemService) *ProblemHandler {
	return &ProblemHandler{svc: svc}
}

// Routes mounts problem endpoints on the given router.
func (h *ProblemHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListProblems)
	r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetProblem)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateProblem)
	r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateProblem)
	r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteProblem)
	r.With(middleware.RequirePermission("itsm.manage")).Post("/{id}/link-incident", h.LinkIncident)

	// Known Errors
	r.Route("/known-errors", func(r chi.Router) {
		r.With(middleware.RequirePermission("itsm.view")).Get("/", h.ListKnownErrorsByProblem)
		r.With(middleware.RequirePermission("itsm.view")).Get("/{id}", h.GetKnownError)
		r.With(middleware.RequirePermission("itsm.manage")).Post("/", h.CreateKnownError)
		r.With(middleware.RequirePermission("itsm.manage")).Put("/{id}", h.UpdateKnownError)
		r.With(middleware.RequirePermission("itsm.manage")).Delete("/{id}", h.DeleteKnownError)
	})
}

// ──────────────────────────────────────────────
// Problem Handlers
// ──────────────────────────────────────────────

// ListProblems handles GET / — returns a paginated list of problems.
func (h *ProblemHandler) ListProblems(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var statusParam *string
	if s := r.URL.Query().Get("status"); s != "" {
		statusParam = &s
	}

	params := types.ParsePagination(r)

	problems, total, err := h.svc.ListProblems(r.Context(), statusParam, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, problems, types.NewMeta(total, params))
}

// GetProblem handles GET /{id} — retrieves a single problem.
func (h *ProblemHandler) GetProblem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid problem ID")
		return
	}

	problem, err := h.svc.GetProblem(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, problem, nil)
}

// CreateProblem handles POST / — creates a new problem.
func (h *ProblemHandler) CreateProblem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateProblemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	problem, err := h.svc.CreateProblem(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, problem)
}

// UpdateProblem handles PUT /{id} — updates an existing problem.
func (h *ProblemHandler) UpdateProblem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid problem ID")
		return
	}

	var req UpdateProblemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	problem, err := h.svc.UpdateProblem(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, problem, nil)
}

// DeleteProblem handles DELETE /{id} — deletes a problem.
func (h *ProblemHandler) DeleteProblem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid problem ID")
		return
	}

	if err := h.svc.DeleteProblem(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// LinkIncident handles POST /{id}/link-incident — links an incident to a problem.
func (h *ProblemHandler) LinkIncident(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	problemID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid problem ID")
		return
	}

	var req LinkIncidentToProblemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.IncidentID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Incident ID is required")
		return
	}

	if err := h.svc.LinkIncident(r.Context(), problemID, req.IncidentID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Known Error Handlers
// ──────────────────────────────────────────────

// ListKnownErrorsByProblem handles GET /known-errors?problemId=... — returns known errors for a problem.
func (h *ProblemHandler) ListKnownErrorsByProblem(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	problemIDStr := r.URL.Query().Get("problemId")
	if problemIDStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "problemId query parameter is required")
		return
	}

	problemID, err := uuid.Parse(problemIDStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid problemId")
		return
	}

	knownErrors, err := h.svc.ListKnownErrors(r.Context(), problemID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, knownErrors, nil)
}

// GetKnownError handles GET /known-errors/{id} — retrieves a single known error.
func (h *ProblemHandler) GetKnownError(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid known error ID")
		return
	}

	ke, err := h.svc.GetKnownError(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ke, nil)
}

// CreateKnownError handles POST /known-errors — creates a new known error.
func (h *ProblemHandler) CreateKnownError(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateKnownErrorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.ProblemID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Problem ID is required")
		return
	}

	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}

	ke, err := h.svc.CreateKnownError(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, ke)
}

// UpdateKnownError handles PUT /known-errors/{id} — updates an existing known error.
func (h *ProblemHandler) UpdateKnownError(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid known error ID")
		return
	}

	var req UpdateKnownErrorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	ke, err := h.svc.UpdateKnownError(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, ke, nil)
}

// DeleteKnownError handles DELETE /known-errors/{id} — deletes a known error.
func (h *ProblemHandler) DeleteKnownError(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid known error ID")
		return
	}

	if err := h.svc.DeleteKnownError(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

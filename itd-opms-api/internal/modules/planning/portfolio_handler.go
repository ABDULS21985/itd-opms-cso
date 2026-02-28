package planning

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// PortfolioHandler
// ──────────────────────────────────────────────

// PortfolioHandler handles HTTP requests for portfolio management.
type PortfolioHandler struct {
	svc *PortfolioService
}

// NewPortfolioHandler creates a new PortfolioHandler.
func NewPortfolioHandler(svc *PortfolioService) *PortfolioHandler {
	return &PortfolioHandler{svc: svc}
}

// Routes mounts portfolio endpoints on the given router.
func (h *PortfolioHandler) Routes(r chi.Router) {
	// Read endpoints
	r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListPortfolios)
	r.With(middleware.RequirePermission("planning.view")).Get("/{id}", h.GetPortfolio)
	r.With(middleware.RequirePermission("planning.view")).Get("/{id}/roadmap", h.GetRoadmap)
	r.With(middleware.RequirePermission("planning.view")).Get("/{id}/analytics", h.GetAnalytics)

	// Write endpoints
	r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreatePortfolio)
	r.With(middleware.RequirePermission("planning.manage")).Put("/{id}", h.UpdatePortfolio)
	r.With(middleware.RequirePermission("planning.manage")).Delete("/{id}", h.DeletePortfolio)
}

// ListPortfolios handles GET / — returns a paginated list of portfolios.
func (h *PortfolioHandler) ListPortfolios(w http.ResponseWriter, r *http.Request) {
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

	portfolios, total, err := h.svc.ListPortfolios(r.Context(), statusParam, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, portfolios, types.NewMeta(total, params))
}

// GetPortfolio handles GET /{id} — retrieves a single portfolio.
func (h *PortfolioHandler) GetPortfolio(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio ID")
		return
	}

	portfolio, err := h.svc.GetPortfolio(r.Context(), portfolioID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, portfolio, nil)
}

// CreatePortfolio handles POST / — creates a new portfolio.
func (h *PortfolioHandler) CreatePortfolio(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreatePortfolioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	// Validate required fields.
	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}
	if req.FiscalYear == 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Fiscal year is required")
		return
	}

	portfolio, err := h.svc.CreatePortfolio(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, portfolio)
}

// UpdatePortfolio handles PUT /{id} — updates an existing portfolio.
func (h *PortfolioHandler) UpdatePortfolio(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio ID")
		return
	}

	var req UpdatePortfolioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	portfolio, err := h.svc.UpdatePortfolio(r.Context(), portfolioID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, portfolio, nil)
}

// DeletePortfolio handles DELETE /{id} — deletes a portfolio.
func (h *PortfolioHandler) DeletePortfolio(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio ID")
		return
	}

	if err := h.svc.DeletePortfolio(r.Context(), portfolioID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetRoadmap handles GET /{id}/roadmap — returns all projects in a portfolio for timeline viz.
func (h *PortfolioHandler) GetRoadmap(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio ID")
		return
	}

	projects, err := h.svc.GetPortfolioRoadmap(r.Context(), portfolioID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, projects, nil)
}

// GetAnalytics handles GET /{id}/analytics — returns aggregate analytics for a portfolio.
func (h *PortfolioHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	portfolioID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio ID")
		return
	}

	analytics, err := h.svc.GetPortfolioAnalytics(r.Context(), portfolioID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, analytics, nil)
}

// ──────────────────────────────────────────────
// ProjectHandler
// ──────────────────────────────────────────────

// ProjectHandler handles HTTP requests for project management.
type ProjectHandler struct {
	svc *ProjectService
}

// NewProjectHandler creates a new ProjectHandler.
func NewProjectHandler(svc *ProjectService) *ProjectHandler {
	return &ProjectHandler{svc: svc}
}

// Routes mounts project endpoints on the given router.
func (h *ProjectHandler) Routes(r chi.Router) {
	// Read endpoints
	r.With(middleware.RequirePermission("planning.view")).Get("/", h.ListProjects)

	// Write endpoints
	r.With(middleware.RequirePermission("planning.manage")).Post("/", h.CreateProject)

	r.Route("/{id}", func(r chi.Router) {
		r.With(middleware.RequirePermission("planning.view")).Get("/", h.GetProject)
		r.With(middleware.RequirePermission("planning.manage")).Put("/", h.UpdateProject)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/", h.DeleteProject)
		r.With(middleware.RequirePermission("planning.manage")).Post("/approve", h.ApproveProject)

		// Dependencies
		r.With(middleware.RequirePermission("planning.view")).Get("/dependencies", h.GetProjectDependencies)
		r.With(middleware.RequirePermission("planning.manage")).Post("/dependencies", h.AddProjectDependency)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/dependencies/{dependencyId}", h.RemoveProjectDependency)

		// Stakeholders
		r.With(middleware.RequirePermission("planning.view")).Get("/stakeholders", h.GetProjectStakeholders)
		r.With(middleware.RequirePermission("planning.manage")).Post("/stakeholders", h.AddProjectStakeholder)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/stakeholders/{stakeholderId}", h.RemoveProjectStakeholder)

		// Division assignments
		r.With(middleware.RequirePermission("planning.view")).Get("/divisions", h.ListProjectDivisions)
		r.With(middleware.RequirePermission("planning.manage")).Post("/divisions", h.AssignProjectDivision)
		r.With(middleware.RequirePermission("planning.manage")).Delete("/divisions/{divisionId}", h.UnassignProjectDivision)
		r.With(middleware.RequirePermission("planning.manage")).Post("/divisions/reassign", h.ReassignProjectDivision)
		r.With(middleware.RequirePermission("planning.view")).Get("/divisions/history", h.GetDivisionAssignmentHistory)
	})
}

// ListProjects handles GET / — returns a paginated list of projects.
func (h *ProjectHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var portfolioID *uuid.UUID
	if pid := r.URL.Query().Get("portfolio_id"); pid != "" {
		parsed, err := uuid.Parse(pid)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio_id")
			return
		}
		portfolioID = &parsed
	}

	var statusParam *string
	if s := r.URL.Query().Get("status"); s != "" {
		statusParam = &s
	}

	var ragStatusParam *string
	if rs := r.URL.Query().Get("rag_status"); rs != "" {
		ragStatusParam = &rs
	}

	params := types.ParsePagination(r)

	projects, total, err := h.svc.ListProjects(r.Context(), portfolioID, statusParam, ragStatusParam, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, projects, types.NewMeta(total, params))
}

// CreateProject handles POST / — creates a new project.
func (h *ProjectHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	// Validate required fields.
	if req.Title == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title is required")
		return
	}
	if req.Code == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Code is required")
		return
	}

	project, err := h.svc.CreateProject(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, project)
}

// GetProject handles GET /{id} — retrieves a single project.
func (h *ProjectHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	project, err := h.svc.GetProject(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, project, nil)
}

// UpdateProject handles PUT /{id} — updates an existing project.
func (h *ProjectHandler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	var req UpdateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	project, err := h.svc.UpdateProject(r.Context(), projectID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, project, nil)
}

// DeleteProject handles DELETE /{id} — deletes a project.
func (h *ProjectHandler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	if err := h.svc.DeleteProject(r.Context(), projectID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ApproveProject handles POST /{id}/approve — transitions project status.
func (h *ProjectHandler) ApproveProject(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	var req ApproveProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Status == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Status is required")
		return
	}

	project, err := h.svc.ApproveProject(r.Context(), projectID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, project, nil)
}

// GetProjectDependencies handles GET /{id}/dependencies — returns project dependencies.
func (h *ProjectHandler) GetProjectDependencies(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	deps, err := h.svc.ListProjectDependencies(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, deps, nil)
}

// AddProjectDependency handles POST /{id}/dependencies — adds a dependency.
func (h *ProjectHandler) AddProjectDependency(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	var req CreateProjectDependencyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.DependsOnProjectID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "depends_on_project_id is required")
		return
	}

	dep, err := h.svc.AddProjectDependency(r.Context(), projectID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, dep)
}

// RemoveProjectDependency handles DELETE /{id}/dependencies/{dependencyId} — removes a dependency.
func (h *ProjectHandler) RemoveProjectDependency(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	dependencyID, err := uuid.Parse(chi.URLParam(r, "dependencyId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid dependency ID")
		return
	}

	if err := h.svc.RemoveProjectDependency(r.Context(), projectID, dependencyID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetProjectStakeholders handles GET /{id}/stakeholders — returns project stakeholders.
func (h *ProjectHandler) GetProjectStakeholders(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	stakeholders, err := h.svc.ListProjectStakeholders(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stakeholders, nil)
}

// AddProjectStakeholder handles POST /{id}/stakeholders — adds a stakeholder.
func (h *ProjectHandler) AddProjectStakeholder(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	var req AddProjectStakeholderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.UserID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "user_id is required")
		return
	}
	if req.Role == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Role is required")
		return
	}

	stakeholder, err := h.svc.AddProjectStakeholder(r.Context(), projectID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, stakeholder)
}

// RemoveProjectStakeholder handles DELETE /{id}/stakeholders/{stakeholderId} — removes a stakeholder.
func (h *ProjectHandler) RemoveProjectStakeholder(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	stakeholderID, err := uuid.Parse(chi.URLParam(r, "stakeholderId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid stakeholder ID")
		return
	}

	if err := h.svc.RemoveProjectStakeholder(r.Context(), projectID, stakeholderID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Division Assignment Handlers
// ──────────────────────────────────────────────

// ListProjectDivisions handles GET /{id}/divisions — returns active division assignments.
func (h *ProjectHandler) ListProjectDivisions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	assignments, err := h.svc.ListProjectDivisions(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, assignments, nil)
}

// AssignProjectDivision handles POST /{id}/divisions — assigns a division.
func (h *ProjectHandler) AssignProjectDivision(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	var req AssignDivisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.DivisionID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Division ID is required")
		return
	}

	assignment, err := h.svc.AssignProjectDivision(r.Context(), projectID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, assignment)
}

// UnassignProjectDivision handles DELETE /{id}/divisions/{divisionId}.
func (h *ProjectHandler) UnassignProjectDivision(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	divisionID, err := uuid.Parse(chi.URLParam(r, "divisionId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid division ID")
		return
	}

	if err := h.svc.UnassignProjectDivision(r.Context(), projectID, divisionID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ReassignProjectDivision handles POST /{id}/divisions/reassign.
func (h *ProjectHandler) ReassignProjectDivision(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	var req ReassignDivisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}
	if req.FromDivisionID == uuid.Nil || req.ToDivisionID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Both fromDivisionId and toDivisionId are required")
		return
	}

	if err := h.svc.ReassignProjectDivision(r.Context(), projectID, req); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetDivisionAssignmentHistory handles GET /{id}/divisions/history.
func (h *ProjectHandler) GetDivisionAssignmentHistory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid project ID")
		return
	}

	logs, err := h.svc.GetDivisionAssignmentHistory(r.Context(), "project", projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, logs, nil)
}

// ──────────────────────────────────────────────
// Shared error helper
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

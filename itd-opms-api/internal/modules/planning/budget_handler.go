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
// BudgetHandler — project-scoped budget routes
// ──────────────────────────────────────────────

// BudgetHandler handles HTTP requests for project-level budget operations.
// Routes are nested under /projects/{id}/budget.
type BudgetHandler struct {
	svc *BudgetService
}

// NewBudgetHandler creates a new BudgetHandler.
func NewBudgetHandler(svc *BudgetService) *BudgetHandler {
	return &BudgetHandler{svc: svc}
}

// Routes mounts project-scoped budget routes on the given router.
// These are intended to be mounted at /projects/{id}/budget.
func (h *BudgetHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("planning.view")).Get("/summary", h.GetBudgetSummary)
	r.With(middleware.RequirePermission("planning.view")).Get("/entries", h.ListCostEntries)
	r.With(middleware.RequirePermission("planning.manage")).Post("/entries", h.CreateCostEntry)
	r.With(middleware.RequirePermission("planning.manage")).Put("/entries/{entryId}", h.UpdateCostEntry)
	r.With(middleware.RequirePermission("planning.manage")).Delete("/entries/{entryId}", h.DeleteCostEntry)
	r.With(middleware.RequirePermission("planning.view")).Get("/burn-rate", h.GetBurnRate)
	r.With(middleware.RequirePermission("planning.view")).Get("/forecast", h.GetForecast)
	r.With(middleware.RequirePermission("planning.manage")).Post("/snapshots", h.CreateBudgetSnapshot)
	r.With(middleware.RequirePermission("planning.view")).Get("/snapshots", h.ListBudgetSnapshots)
}

// GetBudgetSummary handles GET /projects/{id}/budget/summary.
func (h *BudgetHandler) GetBudgetSummary(w http.ResponseWriter, r *http.Request) {
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

	summary, err := h.svc.GetBudgetSummary(r.Context(), projectID)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, summary, nil)
}

// ListCostEntries handles GET /projects/{id}/budget/entries.
func (h *BudgetHandler) ListCostEntries(w http.ResponseWriter, r *http.Request) {
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

	params := types.ParsePagination(r)

	var entryType, categoryID, startDate, endDate *string
	if v := r.URL.Query().Get("entry_type"); v != "" {
		entryType = &v
	}
	if v := r.URL.Query().Get("category_id"); v != "" {
		categoryID = &v
	}
	if v := r.URL.Query().Get("start_date"); v != "" {
		startDate = &v
	}
	if v := r.URL.Query().Get("end_date"); v != "" {
		endDate = &v
	}

	entries, total, err := h.svc.ListCostEntries(r.Context(), projectID, entryType, categoryID, startDate, endDate, params.Limit, params.Offset())
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, entries, types.NewMeta(total, params))
}

// CreateCostEntry handles POST /projects/{id}/budget/entries.
func (h *BudgetHandler) CreateCostEntry(w http.ResponseWriter, r *http.Request) {
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

	var req CreateCostEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Description == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Description is required")
		return
	}
	if req.Amount <= 0 {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Amount must be greater than zero")
		return
	}
	if req.EntryType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Entry type is required")
		return
	}

	entry, err := h.svc.CreateCostEntry(r.Context(), projectID, req)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.Created(w, entry)
}

// UpdateCostEntry handles PUT /projects/{id}/budget/entries/{entryId}.
func (h *BudgetHandler) UpdateCostEntry(w http.ResponseWriter, r *http.Request) {
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

	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entry ID")
		return
	}

	var req UpdateCostEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	entry, err := h.svc.UpdateCostEntry(r.Context(), projectID, entryID, req)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, entry, nil)
}

// DeleteCostEntry handles DELETE /projects/{id}/budget/entries/{entryId}.
func (h *BudgetHandler) DeleteCostEntry(w http.ResponseWriter, r *http.Request) {
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

	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entry ID")
		return
	}

	if err := h.svc.DeleteCostEntry(r.Context(), projectID, entryID); err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetBurnRate handles GET /projects/{id}/budget/burn-rate.
func (h *BudgetHandler) GetBurnRate(w http.ResponseWriter, r *http.Request) {
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

	points, err := h.svc.GetBurnRate(r.Context(), projectID)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, points, nil)
}

// GetForecast handles GET /projects/{id}/budget/forecast.
func (h *BudgetHandler) GetForecast(w http.ResponseWriter, r *http.Request) {
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

	forecast, err := h.svc.GetForecast(r.Context(), projectID)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, forecast, nil)
}

// CreateBudgetSnapshot handles POST /projects/{id}/budget/snapshots.
func (h *BudgetHandler) CreateBudgetSnapshot(w http.ResponseWriter, r *http.Request) {
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

	var req CreateBudgetSnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Allow empty body — notes are optional.
		req = CreateBudgetSnapshotRequest{}
	}

	snapshot, err := h.svc.CreateBudgetSnapshot(r.Context(), projectID, req)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.Created(w, snapshot)
}

// ListBudgetSnapshots handles GET /projects/{id}/budget/snapshots.
func (h *BudgetHandler) ListBudgetSnapshots(w http.ResponseWriter, r *http.Request) {
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

	params := types.ParsePagination(r)

	snapshots, total, err := h.svc.ListBudgetSnapshots(r.Context(), projectID, params.Limit, params.Offset())
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, snapshots, types.NewMeta(total, params))
}

// ──────────────────────────────────────────────
// CostCategoryHandler — tenant-level cost category + portfolio routes
// ──────────────────────────────────────────────

// CostCategoryHandler handles HTTP requests for cost categories and
// portfolio-level budget summary. Routes are mounted at /planning/budget.
type CostCategoryHandler struct {
	svc *BudgetService
}

// NewCostCategoryHandler creates a new CostCategoryHandler.
func NewCostCategoryHandler(svc *BudgetService) *CostCategoryHandler {
	return &CostCategoryHandler{svc: svc}
}

// Routes mounts cost category and portfolio budget routes.
func (h *CostCategoryHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("planning.view")).Get("/cost-categories", h.ListCostCategories)
	r.With(middleware.RequirePermission("planning.manage")).Post("/cost-categories", h.CreateCostCategory)
	r.With(middleware.RequirePermission("planning.manage")).Put("/cost-categories/{id}", h.UpdateCostCategory)
	r.With(middleware.RequirePermission("planning.manage")).Delete("/cost-categories/{id}", h.DeleteCostCategory)
	r.With(middleware.RequirePermission("planning.view")).Get("/portfolio-summary", h.GetPortfolioBudgetSummary)
}

// ListCostCategories handles GET /planning/budget/cost-categories.
func (h *CostCategoryHandler) ListCostCategories(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	categories, err := h.svc.ListCostCategories(r.Context())
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, categories, nil)
}

// CreateCostCategory handles POST /planning/budget/cost-categories.
func (h *CostCategoryHandler) CreateCostCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCostCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	category, err := h.svc.CreateCostCategory(r.Context(), req)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.Created(w, category)
}

// UpdateCostCategory handles PUT /planning/budget/cost-categories/{id}.
func (h *CostCategoryHandler) UpdateCostCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	var req UpdateCostCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	category, err := h.svc.UpdateCostCategory(r.Context(), id, req)
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, category, nil)
}

// DeleteCostCategory handles DELETE /planning/budget/cost-categories/{id}.
func (h *CostCategoryHandler) DeleteCostCategory(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid category ID")
		return
	}

	if err := h.svc.DeleteCostCategory(r.Context(), id); err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetPortfolioBudgetSummary handles GET /planning/budget/portfolio-summary.
func (h *CostCategoryHandler) GetPortfolioBudgetSummary(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	var portfolioID *uuid.UUID
	if v := r.URL.Query().Get("portfolio_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid portfolio_id")
			return
		}
		portfolioID = &parsed
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	summary, total, err := h.svc.GetPortfolioBudgetSummary(r.Context(), portfolioID, status, params.Limit, params.Offset())
	if err != nil {
		writeBudgetError(w, r, err)
		return
	}

	types.OK(w, summary, types.NewMeta(total, params))
}

// ──────────────────────────────────────────────
// Error helper
// ──────────────────────────────────────────────

// writeBudgetError maps an application error to the appropriate HTTP response.
func writeBudgetError(w http.ResponseWriter, r *http.Request, err error) {
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

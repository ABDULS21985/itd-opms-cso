package governance

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// RACIHandler handles HTTP requests for RACI matrix management.
type RACIHandler struct {
	svc *RACIService
}

// NewRACIHandler creates a new RACIHandler.
func NewRACIHandler(svc *RACIService) *RACIHandler {
	return &RACIHandler{svc: svc}
}

// Routes mounts RACI matrix endpoints on the given router.
func (h *RACIHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("governance.view")).Get("/", h.List)
	r.With(middleware.RequirePermission("governance.view")).Get("/coverage-summary", h.CoverageSummary)
	r.With(middleware.RequirePermission("governance.manage")).Post("/", h.Create)

	r.Route("/{id}", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.view")).Get("/", h.Get)
		r.With(middleware.RequirePermission("governance.manage")).Put("/", h.Update)
		r.With(middleware.RequirePermission("governance.manage")).Delete("/", h.Delete)
		r.With(middleware.RequirePermission("governance.view")).Get("/coverage", h.CoverageReport)
		r.With(middleware.RequirePermission("governance.manage")).Post("/entries", h.AddEntry)
	})

	r.Route("/entries/{entryId}", func(r chi.Router) {
		r.With(middleware.RequirePermission("governance.manage")).Put("/", h.UpdateEntry)
		r.With(middleware.RequirePermission("governance.manage")).Delete("/", h.DeleteEntry)
	})
}

// List handles GET / -- returns a paginated list of RACI matrices.
func (h *RACIHandler) List(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	matrices, total, err := h.svc.ListMatrices(r.Context(), authCtx.TenantID, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, matrices, types.NewMeta(total, params))
}

// Create handles POST / -- creates a new RACI matrix.
func (h *RACIHandler) Create(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateRACIMatrixRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Title == "" || req.EntityType == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title and entityType are required")
		return
	}

	matrix, err := h.svc.CreateMatrix(r.Context(), authCtx.TenantID, authCtx.UserID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, matrix)
}

// Get handles GET /{id} -- retrieves a single RACI matrix with entries.
func (h *RACIHandler) Get(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	matrixID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid matrix ID")
		return
	}

	matrix, err := h.svc.GetMatrix(r.Context(), authCtx.TenantID, matrixID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, matrix, nil)
}

// Update handles PUT /{id} -- updates an existing RACI matrix.
func (h *RACIHandler) Update(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	matrixID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid matrix ID")
		return
	}

	var req CreateRACIMatrixRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	matrix, err := h.svc.UpdateMatrix(r.Context(), authCtx.TenantID, matrixID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, matrix, nil)
}

// Delete handles DELETE /{id} -- deletes a RACI matrix.
func (h *RACIHandler) Delete(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	matrixID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid matrix ID")
		return
	}

	if err := h.svc.DeleteMatrix(r.Context(), authCtx.TenantID, matrixID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// CoverageReport handles GET /{id}/coverage -- returns full gap-analysis coverage for a RACI matrix.
func (h *RACIHandler) CoverageReport(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	matrixID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid matrix ID")
		return
	}

	report, err := h.svc.GetCoverageReport(r.Context(), authCtx.TenantID, matrixID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, report, nil)
}

// CoverageSummary handles GET /coverage-summary -- returns tenant-wide RACI coverage stats.
func (h *RACIHandler) CoverageSummary(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	summary, err := h.svc.GetCoverageSummary(r.Context(), authCtx.TenantID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, summary, nil)
}

// AddEntry handles POST /{id}/entries -- adds a new entry to a RACI matrix.
func (h *RACIHandler) AddEntry(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	matrixID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid matrix ID")
		return
	}

	var req CreateRACIEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Activity == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Activity is required")
		return
	}

	if req.AccountableID == uuid.Nil {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "AccountableId is required and must be a single user ID")
		return
	}

	entry, err := h.svc.AddEntry(r.Context(), matrixID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, entry)
}

// UpdateEntry handles PUT /entries/{entryId} -- updates a RACI entry.
func (h *RACIHandler) UpdateEntry(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entry ID")
		return
	}

	var req UpdateRACIEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	entry, err := h.svc.UpdateEntry(r.Context(), entryID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entry, nil)
}

// DeleteEntry handles DELETE /entries/{entryId} -- deletes a RACI entry.
func (h *RACIHandler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	entryID, err := uuid.Parse(chi.URLParam(r, "entryId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid entry ID")
		return
	}

	if err := h.svc.DeleteEntry(r.Context(), entryID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

package reporting

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ReportHandler
// ──────────────────────────────────────────────

// ReportHandler handles HTTP requests for report definitions and runs.
type ReportHandler struct {
	svc *ReportService
}

// NewReportHandler creates a new ReportHandler.
func NewReportHandler(svc *ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

// Routes mounts report endpoints on the given router.
func (h *ReportHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("reporting.view")).Get("/", h.ListDefinitions)
	r.With(middleware.RequirePermission("reporting.view")).Get("/{id}", h.GetDefinition)
	r.With(middleware.RequirePermission("reporting.manage")).Post("/", h.CreateDefinition)
	r.With(middleware.RequirePermission("reporting.manage")).Put("/{id}", h.UpdateDefinition)
	r.With(middleware.RequirePermission("reporting.manage")).Delete("/{id}", h.DeleteDefinition)
	r.With(middleware.RequirePermission("reporting.manage")).Post("/{id}/run", h.TriggerReportRun)

	r.Route("/{definitionId}/runs", func(r chi.Router) {
		r.With(middleware.RequirePermission("reporting.view")).Get("/", h.ListReportRuns)
		r.With(middleware.RequirePermission("reporting.view")).Get("/{runId}", h.GetReportRun)
	})
}

// ──────────────────────────────────────────────
// Definition Handlers
// ──────────────────────────────────────────────

// ListDefinitions handles GET / — returns a paginated list of report definitions.
func (h *ReportHandler) ListDefinitions(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	var reportType *string
	if v := r.URL.Query().Get("type"); v != "" {
		reportType = &v
	}

	defs, total, err := h.svc.ListDefinitions(r.Context(), reportType, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, defs, types.NewMeta(total, params))
}

// GetDefinition handles GET /{id} — retrieves a single report definition.
func (h *ReportHandler) GetDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid report definition ID")
		return
	}

	def, err := h.svc.GetDefinition(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, def, nil)
}

// CreateDefinition handles POST / — creates a new report definition.
func (h *ReportHandler) CreateDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateReportDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if req.Name == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
		return
	}

	if req.Type == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "VALIDATION_ERROR", "Type is required")
		return
	}

	def, err := h.svc.CreateDefinition(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, def)
}

// UpdateDefinition handles PUT /{id} — updates an existing report definition.
func (h *ReportHandler) UpdateDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid report definition ID")
		return
	}

	var req UpdateReportDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	def, err := h.svc.UpdateDefinition(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, def, nil)
}

// DeleteDefinition handles DELETE /{id} — deletes a report definition.
func (h *ReportHandler) DeleteDefinition(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid report definition ID")
		return
	}

	if err := h.svc.DeleteDefinition(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Run Handlers
// ──────────────────────────────────────────────

// TriggerReportRun handles POST /{id}/run — triggers a new report run.
func (h *ReportHandler) TriggerReportRun(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid report definition ID")
		return
	}

	run, err := h.svc.TriggerReportRun(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, run)
}

// ListReportRuns handles GET /{definitionId}/runs/ — returns paginated report runs.
func (h *ReportHandler) ListReportRuns(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	definitionID, err := uuid.Parse(chi.URLParam(r, "definitionId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid definition ID")
		return
	}

	params := types.ParsePagination(r)

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	runs, total, err := h.svc.ListReportRuns(r.Context(), definitionID, status, params)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, runs, types.NewMeta(total, params))
}

// GetReportRun handles GET /{definitionId}/runs/{runId} — retrieves a single report run.
func (h *ReportHandler) GetReportRun(w http.ResponseWriter, r *http.Request) {
	auth := types.GetAuthContext(r.Context())
	if auth == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	runID, err := uuid.Parse(chi.URLParam(r, "runId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid run ID")
		return
	}

	run, err := h.svc.GetReportRun(r.Context(), runID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, run, nil)
}

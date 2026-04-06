package planning

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ImportHandler handles HTTP requests for bulk project import.
type ImportHandler struct {
	svc *ImportService
}

// NewImportHandler creates a new ImportHandler.
func NewImportHandler(svc *ImportService) *ImportHandler {
	return &ImportHandler{svc: svc}
}

// Routes mounts import endpoints on the given router.
func (h *ImportHandler) Routes(r chi.Router) {
	r.With(middleware.RequirePermission("planning.view")).Get("/template", h.DownloadTemplate)
	r.With(middleware.RequirePermission("planning.manage")).Post("/validate", h.ValidateUpload)
	r.With(middleware.RequirePermission("planning.manage")).Post("/commit", h.CommitImport)
	r.With(middleware.RequirePermission("planning.view")).Get("/batches/{id}", h.GetBatch)
	r.With(middleware.RequirePermission("planning.view")).Get("/batches/{id}/errors", h.GetBatchErrors)
	r.With(middleware.RequirePermission("planning.view")).Get("/batches/{id}/error-report", h.DownloadErrorReport)
}

// DownloadTemplate handles GET /template?format=xlsx|csv — downloads the import template.
func (h *ImportHandler) DownloadTemplate(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "xlsx"
	}

	switch format {
	case "xlsx":
		data, err := h.svc.GenerateXLSXTemplate()
		if err != nil {
			writeAppError(w, r, err)
			return
		}
		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		w.Header().Set("Content-Disposition", `attachment; filename="project-import-template.xlsx"`)
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.WriteHeader(http.StatusOK)
		w.Write(data)

	case "csv":
		data, err := h.svc.GenerateCSVTemplate()
		if err != nil {
			writeAppError(w, r, err)
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="project-import-template.csv"`)
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.WriteHeader(http.StatusOK)
		w.Write(data)

	default:
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid format: must be 'xlsx' or 'csv'")
	}
}

// ValidateUpload handles POST /validate — parses and validates an uploaded file.
func (h *ImportHandler) ValidateUpload(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Limit request body size.
	r.Body = http.MaxBytesReader(w, r.Body, maxImportFileSize+1024)

	// Parse multipart form.
	if err := r.ParseMultipartForm(maxImportFileSize); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid file upload: "+err.Error())
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "File is required")
		return
	}
	defer file.Close()

	// Parse file.
	rows, format, err := h.svc.ParseUploadedFile(file, header)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	// Validate all rows.
	result, err := h.svc.ValidateImport(r.Context(), rows, header.Filename, format)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}

// CommitImport handles POST /commit — executes bulk import for a validated batch.
func (h *ImportHandler) CommitImport(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Read batch_id from query or JSON body.
	batchIDStr := r.URL.Query().Get("batch_id")
	if batchIDStr == "" {
		var body struct {
			BatchID string `json:"batchId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err == nil {
			batchIDStr = body.BatchID
		}
	}

	if batchIDStr == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "batch_id is required")
		return
	}

	batchID, err := uuid.Parse(batchIDStr)
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid batch_id")
		return
	}

	result, err := h.svc.CommitImport(r.Context(), batchID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, result, nil)
}

// GetBatch handles GET /batches/{id} — retrieves a batch.
func (h *ImportHandler) GetBatch(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	batchID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid batch ID")
		return
	}

	batch, err := h.svc.GetImportBatch(r.Context(), batchID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, batch, nil)
}

// GetBatchErrors handles GET /batches/{id}/errors — retrieves batch errors.
func (h *ImportHandler) GetBatchErrors(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	batchID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid batch ID")
		return
	}

	errors, err := h.svc.GetImportBatchErrors(r.Context(), batchID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, errors, nil)
}

// DownloadErrorReport handles GET /batches/{id}/error-report — downloads error CSV.
func (h *ImportHandler) DownloadErrorReport(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	batchID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid batch ID")
		return
	}

	data, filename, err := h.svc.GenerateErrorReportCSV(r.Context(), batchID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

package planning

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// DocumentHandler
// ──────────────────────────────────────────────

// DocumentHandler handles HTTP requests for project document management.
type DocumentHandler struct {
	svc *DocumentService
}

// NewDocumentHandler creates a new DocumentHandler.
func NewDocumentHandler(svc *DocumentService) *DocumentHandler {
	return &DocumentHandler{svc: svc}
}

// UploadDocument handles POST /projects/{id}/documents — uploads a file and
// creates a project document record from multipart/form-data.
func (h *DocumentHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
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

	if err := r.ParseMultipartForm(MaxFileSize); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "File is required")
		return
	}
	defer file.Close()

	title := r.FormValue("title")
	if title == "" {
		title = header.Filename
	}

	category := r.FormValue("category")
	if category == "" {
		category = "other"
	}

	description := r.FormValue("description")
	label := r.FormValue("label")
	version := r.FormValue("version")

	req := UploadProjectDocumentRequest{
		Title:    title,
		Category: category,
	}
	if description != "" {
		req.Description = &description
	}
	if label != "" {
		req.Label = &label
	}
	if version != "" {
		req.Version = &version
	}

	doc, err := h.svc.UploadDocument(r.Context(), projectID, file, header, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, doc)
}

// ListDocuments handles GET /projects/{id}/documents — returns a paginated,
// filterable list of project documents.
func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
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

	var category *string
	if v := r.URL.Query().Get("category"); v != "" {
		category = &v
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	var search *string
	if v := r.URL.Query().Get("search"); v != "" {
		search = &v
	}

	docs, total, err := h.svc.ListDocuments(r.Context(), projectID, category, status, search, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, docs, types.NewMeta(total, params))
}

// GetDocument handles GET /projects/{id}/documents/{docId} — retrieves a
// single project document by its ID.
func (h *DocumentHandler) GetDocument(w http.ResponseWriter, r *http.Request) {
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

	docID, err := uuid.Parse(chi.URLParam(r, "docId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	doc, err := h.svc.GetDocument(r.Context(), projectID, docID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// UpdateDocument handles PUT /projects/{id}/documents/{docId} — updates
// document metadata (category, label, version, etc.).
func (h *DocumentHandler) UpdateDocument(w http.ResponseWriter, r *http.Request) {
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

	docID, err := uuid.Parse(chi.URLParam(r, "docId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	var req UpdateProjectDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	doc, err := h.svc.UpdateDocument(r.Context(), projectID, docID, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// DeleteDocument handles DELETE /projects/{id}/documents/{docId} — removes a
// project document.
func (h *DocumentHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
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

	docID, err := uuid.Parse(chi.URLParam(r, "docId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	if err := h.svc.DeleteDocument(r.Context(), projectID, docID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetDownloadURL handles GET /projects/{id}/documents/{docId}/download —
// returns a pre-signed download URL and file name for the document.
func (h *DocumentHandler) GetDownloadURL(w http.ResponseWriter, r *http.Request) {
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

	docID, err := uuid.Parse(chi.URLParam(r, "docId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	url, fileName, err := h.svc.GetDownloadURL(r.Context(), projectID, docID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"url": url, "fileName": fileName}, nil)
}

// GetCategoryCounts handles GET /projects/{id}/documents/categories — returns
// document counts grouped by category for the given project.
func (h *DocumentHandler) GetCategoryCounts(w http.ResponseWriter, r *http.Request) {
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

	counts, err := h.svc.GetCategoryCounts(r.Context(), projectID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, counts, nil)
}

package vault

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────

// Handler is the top-level HTTP handler for the Document Vault module.
type Handler struct {
	svc    *Service
	Worker *VaultWorker
}

// NewHandler creates a new vault Handler with all dependencies wired up.
func NewHandler(pool *pgxpool.Pool, minioClient *minio.Client, minioCfg config.MinIOConfig, auditSvc *audit.AuditService) *Handler {
	svc := NewService(pool, minioClient, minioCfg, auditSvc)
	return &Handler{
		svc:    svc,
		Worker: NewVaultWorker(pool, auditSvc, svc),
	}
}

// Routes mounts all Document Vault routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	// Inject client IP into context for all vault routes.
	r.Use(h.injectClientIP)

	r.Route("/documents", func(r chi.Router) {
		r.With(middleware.RequirePermission("documents.view")).Get("/", h.ListDocuments)
		r.With(middleware.RequirePermission("documents.manage")).Post("/", h.UploadDocument)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}", h.GetDocument)
		r.With(middleware.RequirePermission("documents.manage")).Put("/{id}", h.UpdateDocument)
		r.With(middleware.RequirePermission("documents.delete")).Delete("/{id}", h.DeleteDocument)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}/download", h.GetDownloadURL)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}/preview", h.GetPreviewURL)
		r.With(middleware.RequirePermission("documents.manage")).Post("/{id}/version", h.UploadVersion)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}/versions", h.ListVersions)
		r.With(middleware.RequirePermission("documents.manage")).Post("/{id}/lock", h.LockDocument)
		r.With(middleware.RequirePermission("documents.manage")).Post("/{id}/unlock", h.UnlockDocument)
		r.With(middleware.RequirePermission("documents.manage")).Post("/{id}/move", h.MoveDocument)
		r.With(middleware.RequirePermission("documents.share")).Post("/{id}/share", h.ShareDocument)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}/shares", h.ListShares)
		r.With(middleware.RequirePermission("documents.share")).Delete("/{id}/shares/{shareId}", h.RevokeShare)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}/access-log", h.GetAccessLog)
		r.With(middleware.RequirePermission("documents.manage")).Post("/{id}/restore", h.RestoreDocument)
		r.With(middleware.RequirePermission("documents.delete")).Post("/{id}/archive", h.ArchiveDocument)
		r.With(middleware.RequirePermission("documents.manage")).Post("/{id}/transition", h.TransitionStatus)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}/lifecycle", h.GetLifecycleLog)
		r.With(middleware.RequirePermission("documents.manage")).Post("/{id}/comments", h.AddComment)
		r.With(middleware.RequirePermission("documents.view")).Get("/{id}/comments", h.ListComments)
		r.With(middleware.RequirePermission("documents.view")).Get("/shared-with-me", h.ListSharedWithMe)
	})
	r.Route("/folders", func(r chi.Router) {
		r.With(middleware.RequirePermission("documents.view")).Get("/", h.ListFolders)
		r.With(middleware.RequirePermission("documents.manage")).Post("/", h.CreateFolder)
		r.With(middleware.RequirePermission("documents.manage")).Put("/{id}", h.UpdateFolder)
		r.With(middleware.RequirePermission("documents.manage")).Delete("/{id}", h.DeleteFolder)
	})
	r.Route("/compliance", func(r chi.Router) {
		r.With(middleware.RequirePermission("documents.admin")).Get("/expiring-soon", h.GetExpiringSoon)
		r.With(middleware.RequirePermission("documents.admin")).Get("/expired", h.GetExpiredDocuments)
		r.With(middleware.RequirePermission("documents.admin")).Get("/retention-report", h.GetRetentionReport)
	})
	r.With(middleware.RequirePermission("documents.view")).Get("/search", h.SearchDocuments)
	r.With(middleware.RequirePermission("documents.view")).Get("/recent", h.GetRecentDocuments)
	r.With(middleware.RequirePermission("documents.view")).Get("/stats", h.GetStats)
}

// ──────────────────────────────────────────────
// Document Handlers
// ──────────────────────────────────────────────

// ListDocuments handles GET /documents — returns a paginated, filtered list of vault documents.
func (h *Handler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	var folderID *uuid.UUID
	if v := r.URL.Query().Get("folder_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			folderID = &id
		}
	}

	var classification *string
	if v := r.URL.Query().Get("classification"); v != "" {
		classification = &v
	}

	var status *string
	if v := r.URL.Query().Get("status"); v != "" {
		status = &v
	}

	var search *string
	if v := r.URL.Query().Get("search"); v != "" {
		search = &v
	}

	var tags []string
	if v := r.URL.Query().Get("tags"); v != "" {
		tags = strings.Split(v, ",")
	}

	docs, total, err := h.svc.ListDocuments(r.Context(), folderID, classification, status, search, tags, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, docs, types.NewMeta(total, params))
}

// UploadDocument handles POST /documents — uploads a file via multipart/form-data.
func (h *Handler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	// Parse multipart form (32MB max in memory, rest to temp files).
	if err := r.ParseMultipartForm(32 << 20); err != nil {
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

	description := r.FormValue("description")
	classification := r.FormValue("classification")
	accessLevel := r.FormValue("accessLevel")

	var folderID *uuid.UUID
	if v := r.FormValue("folderId"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			folderID = &id
		}
	}

	var tags []string
	if v := r.FormValue("tags"); v != "" {
		tags = strings.Split(v, ",")
		for i := range tags {
			tags[i] = strings.TrimSpace(tags[i])
		}
	}

	doc, err := h.svc.UploadDocument(r.Context(), file, header, title, description, classification, folderID, tags, accessLevel)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, doc)
}

// GetDocument handles GET /documents/{id} — retrieves a single document.
func (h *Handler) GetDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	doc, err := h.svc.GetDocument(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// UpdateDocument handles PUT /documents/{id} — updates document metadata.
func (h *Handler) UpdateDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	var req UpdateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	doc, err := h.svc.UpdateDocument(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// DeleteDocument handles DELETE /documents/{id} — soft-deletes a document.
func (h *Handler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	if err := h.svc.DeleteDocument(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetDownloadURL handles GET /documents/{id}/download — returns a presigned download URL.
func (h *Handler) GetDownloadURL(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	downloadURL, fileName, err := h.svc.GetDownloadURL(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"url": downloadURL, "fileName": fileName}, nil)
}

// GetPreviewURL handles GET /documents/{id}/preview — returns a presigned preview URL.
func (h *Handler) GetPreviewURL(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	previewURL, title, contentType, err := h.svc.GetPreviewURL(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, map[string]string{"url": previewURL, "title": title, "contentType": contentType}, nil)
}

// UploadVersion handles POST /documents/{id}/version — uploads a new version of a document.
func (h *Handler) UploadVersion(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "File is required")
		return
	}
	defer file.Close()

	doc, err := h.svc.UploadVersion(r.Context(), id, file, header)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, doc)
}

// ListVersions handles GET /documents/{id}/versions — returns all versions of a document.
func (h *Handler) ListVersions(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	versions, err := h.svc.ListVersions(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, versions, nil)
}

// LockDocument handles POST /documents/{id}/lock — locks a document for editing.
func (h *Handler) LockDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	doc, err := h.svc.LockDocument(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// UnlockDocument handles POST /documents/{id}/unlock — unlocks a document.
func (h *Handler) UnlockDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	doc, err := h.svc.UnlockDocument(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// MoveDocument handles POST /documents/{id}/move — moves a document to a different folder.
func (h *Handler) MoveDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	var req MoveDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	doc, err := h.svc.MoveDocument(r.Context(), id, req.FolderID)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// ShareDocument handles POST /documents/{id}/share — shares a document with a user or role.
func (h *Handler) ShareDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	var req ShareDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	share, err := h.svc.ShareDocument(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, share)
}

// ListShares handles GET /documents/{id}/shares — returns all active shares for a document.
func (h *Handler) ListShares(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	shares, err := h.svc.ListShares(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, shares, nil)
}

// RevokeShare handles DELETE /documents/{id}/shares/{shareId} — revokes a document share.
func (h *Handler) RevokeShare(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	shareID, err := uuid.Parse(chi.URLParam(r, "shareId"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid share ID")
		return
	}

	if err := h.svc.RevokeShare(r.Context(), id, shareID); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// GetAccessLog handles GET /documents/{id}/access-log — returns a paginated access log.
func (h *Handler) GetAccessLog(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	params := types.ParsePagination(r)

	entries, total, err := h.svc.GetAccessLog(r.Context(), id, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entries, types.NewMeta(total, params))
}

// ──────────────────────────────────────────────
// Lifecycle Handlers
// ──────────────────────────────────────────────

// RestoreDocument handles POST /documents/{id}/restore — restores a soft-deleted or archived document.
func (h *Handler) RestoreDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	doc, err := h.svc.RestoreDocument(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// ArchiveDocument handles POST /documents/{id}/archive — archives a document.
func (h *Handler) ArchiveDocument(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	doc, err := h.svc.ArchiveDocument(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// TransitionStatus handles POST /documents/{id}/transition — transitions document lifecycle status.
func (h *Handler) TransitionStatus(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	var req TransitionStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	doc, err := h.svc.TransitionStatus(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, doc, nil)
}

// GetLifecycleLog handles GET /documents/{id}/lifecycle — returns the lifecycle transition history.
func (h *Handler) GetLifecycleLog(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	entries, err := h.svc.GetLifecycleLog(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, entries, nil)
}

// ──────────────────────────────────────────────
// Comment Handlers
// ──────────────────────────────────────────────

// AddComment handles POST /documents/{id}/comments — adds a comment to a document.
func (h *Handler) AddComment(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	var req AddCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	comment, err := h.svc.AddComment(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, comment)
}

// ListComments handles GET /documents/{id}/comments — returns all comments for a document.
func (h *Handler) ListComments(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid document ID")
		return
	}

	comments, err := h.svc.ListComments(r.Context(), id)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, comments, nil)
}

// ──────────────────────────────────────────────
// Folder Handlers
// ──────────────────────────────────────────────

// ListFolders handles GET /folders — returns all folders for the tenant.
func (h *Handler) ListFolders(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	folders, err := h.svc.ListFolders(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, folders, nil)
}

// CreateFolder handles POST /folders — creates a new folder.
func (h *Handler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	folder, err := h.svc.CreateFolder(r.Context(), req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.Created(w, folder)
}

// UpdateFolder handles PUT /folders/{id} — updates folder metadata.
func (h *Handler) UpdateFolder(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid folder ID")
		return
	}

	var req UpdateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	folder, err := h.svc.UpdateFolder(r.Context(), id, req)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, folder, nil)
}

// DeleteFolder handles DELETE /folders/{id} — deletes an empty folder.
func (h *Handler) DeleteFolder(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid folder ID")
		return
	}

	if err := h.svc.DeleteFolder(r.Context(), id); err != nil {
		writeAppError(w, r, err)
		return
	}

	types.NoContent(w)
}

// ──────────────────────────────────────────────
// Search, Recent, Stats
// ──────────────────────────────────────────────

// SearchDocuments handles GET /search — searches documents by query string.
func (h *Handler) SearchDocuments(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		types.ErrorMessage(w, http.StatusBadRequest, "BAD_REQUEST", "Search query is required")
		return
	}

	params := types.ParsePagination(r)

	docs, total, err := h.svc.SearchDocuments(r.Context(), query, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, docs, types.NewMeta(total, params))
}

// GetRecentDocuments handles GET /recent — returns recently uploaded documents by the current user.
func (h *Handler) GetRecentDocuments(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	limit := 10
	if v := r.URL.Query().Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	docs, err := h.svc.GetRecentDocuments(r.Context(), limit)
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, docs, nil)
}

// GetStats handles GET /stats — returns aggregate vault statistics.
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, stats, nil)
}

// ──────────────────────────────────────────────
// Shared With Me / Compliance Handlers
// ──────────────────────────────────────────────

// ListSharedWithMe handles GET /documents/shared-with-me — returns documents shared with the current user.
func (h *Handler) ListSharedWithMe(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	docs, total, err := h.svc.ListSharedWithMe(r.Context(), params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, docs, types.NewMeta(total, params))
}

// GetExpiringSoon handles GET /compliance/expiring-soon — returns documents expiring within N days.
func (h *Handler) GetExpiringSoon(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	days := 30
	if v := r.URL.Query().Get("days"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			days = parsed
		}
	}

	params := types.ParsePagination(r)

	docs, total, err := h.svc.GetExpiringSoon(r.Context(), days, params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, docs, types.NewMeta(total, params))
}

// GetExpiredDocuments handles GET /compliance/expired — returns documents with expired status.
func (h *Handler) GetExpiredDocuments(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := types.ParsePagination(r)

	docs, total, err := h.svc.GetExpiredDocuments(r.Context(), params.Limit, params.Offset())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, docs, types.NewMeta(total, params))
}

// GetRetentionReport handles GET /compliance/retention-report — returns aggregate retention statistics.
func (h *Handler) GetRetentionReport(w http.ResponseWriter, r *http.Request) {
	authCtx := types.GetAuthContext(r.Context())
	if authCtx == nil {
		types.ErrorMessage(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	report, err := h.svc.GetRetentionReport(r.Context())
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	types.OK(w, report, nil)
}

// ──────────────────────────────────────────────
// Client IP middleware
// ──────────────────────────────────────────────

// injectClientIP is a middleware that extracts the client IP from the request
// and stores it in the context for downstream access logging.
func (h *Handler) injectClientIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIPFromRequest(r)
		ctx := types.SetClientIP(r.Context(), ip)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// clientIPFromRequest extracts the client IP address from the request,
// preferring X-Forwarded-For and X-Real-IP headers over RemoteAddr.
func clientIPFromRequest(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
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

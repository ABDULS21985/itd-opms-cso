package planning

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

// MaxFileSize is the maximum allowed upload size (50 MB).
const MaxFileSize = 50 << 20

// AllowedContentTypes is the set of MIME types accepted for document uploads.
var AllowedContentTypes = map[string]bool{
	"application/pdf":  true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":       true,
	"application/vnd.ms-powerpoint": true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
	"image/png":        true,
	"image/jpeg":       true,
	"image/gif":        true,
	"text/plain":       true,
	"text/csv":         true,
	"application/zip":  true,
}

// ──────────────────────────────────────────────
// DocumentService
// ──────────────────────────────────────────────

// DocumentService handles business logic for project document management with MinIO file storage.
type DocumentService struct {
	pool     *pgxpool.Pool
	minio    *minio.Client
	minioCfg config.MinIOConfig
	auditSvc *audit.AuditService
}

// NewDocumentService creates a new DocumentService.
func NewDocumentService(pool *pgxpool.Pool, minioClient *minio.Client, minioCfg config.MinIOConfig, auditSvc *audit.AuditService) *DocumentService {
	return &DocumentService{
		pool:     pool,
		minio:    minioClient,
		minioCfg: minioCfg,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// UploadDocument
// ──────────────────────────────────────────────

// UploadDocument uploads a file to MinIO and creates the corresponding database records.
func (s *DocumentService) UploadDocument(ctx context.Context, projectID uuid.UUID, file multipart.File, header *multipart.FileHeader, req UploadProjectDocumentRequest) (ProjectDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ProjectDocument{}, apperrors.Unauthorized("authentication required")
	}

	// Validate category.
	if !ValidDocumentCategories[req.Category] {
		return ProjectDocument{}, apperrors.BadRequest("invalid document category")
	}

	// Validate file size.
	if header.Size > MaxFileSize {
		return ProjectDocument{}, apperrors.BadRequest("file size exceeds maximum allowed size of 50 MB")
	}

	// Validate content type.
	contentType := header.Header.Get("Content-Type")
	if !AllowedContentTypes[contentType] {
		return ProjectDocument{}, apperrors.BadRequest("unsupported file content type")
	}

	// Verify that the project exists.
	var projectExists uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM projects WHERE id = $1 AND tenant_id = $2`,
		projectID, auth.TenantID,
	).Scan(&projectExists)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ProjectDocument{}, apperrors.NotFound("Project", projectID.String())
		}
		return ProjectDocument{}, apperrors.Internal("failed to verify project", err)
	}

	// Read the file into memory.
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return ProjectDocument{}, apperrors.Internal("failed to read uploaded file", err)
	}

	// Compute SHA-256 checksum.
	hash := sha256.Sum256(fileBytes)
	checksum := hex.EncodeToString(hash[:])

	// Generate IDs.
	docID := uuid.New()
	pdID := uuid.New()
	now := time.Now().UTC()

	// Build MinIO object key.
	objectKey := fmt.Sprintf("tenants/%s/projects/%s/%s/%s",
		auth.TenantID, projectID, docID, header.Filename)

	// Upload to MinIO.
	_, err = s.minio.PutObject(ctx, s.minioCfg.BucketAttachment, objectKey,
		bytes.NewReader(fileBytes), int64(len(fileBytes)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return ProjectDocument{}, apperrors.Internal("failed to upload file to storage", err)
	}

	// Begin database transaction.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		// Best-effort cleanup of MinIO object.
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return ProjectDocument{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Determine version.
	version := "1.0"
	if req.Version != nil {
		version = *req.Version
	}

	// INSERT into documents table.
	_, err = tx.Exec(ctx, `
		INSERT INTO documents (
			id, tenant_id, title, description, file_key,
			content_type, size_bytes, checksum_sha256, classification,
			uploaded_by, created_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, 'operational',
			$9, $10
		)`,
		docID, auth.TenantID, req.Title, req.Description, objectKey,
		contentType, int64(len(fileBytes)), checksum,
		auth.UserID, now,
	)
	if err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return ProjectDocument{}, apperrors.Internal("failed to insert document record", err)
	}

	// INSERT into project_documents table.
	_, err = tx.Exec(ctx, `
		INSERT INTO project_documents (
			id, tenant_id, project_id, document_id,
			category, label, version, uploaded_by,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8,
			$9, $10
		)`,
		pdID, auth.TenantID, projectID, docID,
		req.Category, req.Label, version, auth.UserID,
		now, now,
	)
	if err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return ProjectDocument{}, apperrors.Internal("failed to insert project document record", err)
	}

	// Commit the transaction.
	if err := tx.Commit(ctx); err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return ProjectDocument{}, apperrors.Internal("failed to commit transaction", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":    req.Title,
		"category": req.Category,
		"fileName": header.Filename,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "upload:project_document",
		EntityType: "project_document",
		EntityID:   pdID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Build and return the ProjectDocument with joined fields.
	doc := ProjectDocument{
		ID:           pdID,
		TenantID:     auth.TenantID,
		ProjectID:    projectID,
		DocumentID:   docID,
		Category:     req.Category,
		Label:        req.Label,
		Version:      version,
		DisplayOrder: 0,
		Status:       "active",
		UploadedBy:   auth.UserID,
		CreatedAt:    now,
		UpdatedAt:    now,
		Title:        req.Title,
		Description:  req.Description,
		FileName:     header.Filename,
		ContentType:  contentType,
		SizeBytes:    int64(len(fileBytes)),
		UploaderName: auth.DisplayName,
	}

	return doc, nil
}

// ──────────────────────────────────────────────
// ListDocuments
// ──────────────────────────────────────────────

// ListDocuments returns a filtered, paginated list of documents for a project.
func (s *DocumentService) ListDocuments(ctx context.Context, projectID uuid.UUID, category, status, search *string, limit, offset int) ([]ProjectDocument, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build dynamic WHERE clauses.
	var (
		conditions []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	conditions = append(conditions, "pd.project_id = "+nextArg())
	args = append(args, projectID)

	conditions = append(conditions, "pd.tenant_id = "+nextArg())
	args = append(args, auth.TenantID)

	if category != nil {
		conditions = append(conditions, "pd.category = "+nextArg())
		args = append(args, *category)
	}

	if status != nil {
		conditions = append(conditions, "pd.status = "+nextArg())
		args = append(args, *status)
	}

	if search != nil {
		conditions = append(conditions, "d.title ILIKE '%' || "+nextArg()+" || '%'")
		args = append(args, *search)
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count total matching records.
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM project_documents pd
		JOIN documents d ON d.id = pd.document_id
		%s`, whereClause)

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count project documents", err)
	}

	// Fetch paginated results.
	dataQuery := fmt.Sprintf(`
		SELECT pd.id, pd.tenant_id, pd.project_id, pd.document_id,
			pd.category, pd.label, pd.version, pd.display_order,
			pd.status, pd.uploaded_by, pd.created_at, pd.updated_at,
			d.title, d.description, d.file_key, d.content_type, d.size_bytes,
			COALESCE(u.display_name, '')
		FROM project_documents pd
		JOIN documents d ON d.id = pd.document_id
		LEFT JOIN users u ON u.id = pd.uploaded_by
		%s
		ORDER BY pd.display_order ASC, pd.created_at DESC
		LIMIT %s OFFSET %s`,
		whereClause, nextArg(), nextArg())

	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list project documents", err)
	}
	defer rows.Close()

	var docs []ProjectDocument
	for rows.Next() {
		var (
			doc     ProjectDocument
			fileKey string
		)
		if err := rows.Scan(
			&doc.ID, &doc.TenantID, &doc.ProjectID, &doc.DocumentID,
			&doc.Category, &doc.Label, &doc.Version, &doc.DisplayOrder,
			&doc.Status, &doc.UploadedBy, &doc.CreatedAt, &doc.UpdatedAt,
			&doc.Title, &doc.Description, &fileKey, &doc.ContentType, &doc.SizeBytes,
			&doc.UploaderName,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan project document", err)
		}
		doc.FileName = filepath.Base(fileKey)
		docs = append(docs, doc)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate project documents", err)
	}

	if docs == nil {
		docs = []ProjectDocument{}
	}

	return docs, total, nil
}

// ──────────────────────────────────────────────
// GetDocument
// ──────────────────────────────────────────────

// GetDocument retrieves a single project document by its project_document ID.
func (s *DocumentService) GetDocument(ctx context.Context, projectID uuid.UUID, docID uuid.UUID) (ProjectDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ProjectDocument{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT pd.id, pd.tenant_id, pd.project_id, pd.document_id,
			pd.category, pd.label, pd.version, pd.display_order,
			pd.status, pd.uploaded_by, pd.created_at, pd.updated_at,
			d.title, d.description, d.file_key, d.content_type, d.size_bytes,
			COALESCE(u.display_name, '')
		FROM project_documents pd
		JOIN documents d ON d.id = pd.document_id
		LEFT JOIN users u ON u.id = pd.uploaded_by
		WHERE pd.id = $1 AND pd.project_id = $2 AND pd.tenant_id = $3`

	var (
		doc     ProjectDocument
		fileKey string
	)
	err := s.pool.QueryRow(ctx, query, docID, projectID, auth.TenantID).Scan(
		&doc.ID, &doc.TenantID, &doc.ProjectID, &doc.DocumentID,
		&doc.Category, &doc.Label, &doc.Version, &doc.DisplayOrder,
		&doc.Status, &doc.UploadedBy, &doc.CreatedAt, &doc.UpdatedAt,
		&doc.Title, &doc.Description, &fileKey, &doc.ContentType, &doc.SizeBytes,
		&doc.UploaderName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ProjectDocument{}, apperrors.NotFound("ProjectDocument", docID.String())
		}
		return ProjectDocument{}, apperrors.Internal("failed to get project document", err)
	}

	doc.FileName = filepath.Base(fileKey)
	return doc, nil
}

// ──────────────────────────────────────────────
// UpdateDocument
// ──────────────────────────────────────────────

// UpdateDocument updates metadata for an existing project document.
func (s *DocumentService) UpdateDocument(ctx context.Context, projectID uuid.UUID, docID uuid.UUID, req UpdateProjectDocumentRequest) (ProjectDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ProjectDocument{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the document exists and belongs to the tenant/project.
	existing, err := s.GetDocument(ctx, projectID, docID)
	if err != nil {
		return ProjectDocument{}, err
	}

	now := time.Now().UTC()

	// Build dynamic UPDATE for project_documents.
	var (
		setClauses []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	if req.Category != nil {
		setClauses = append(setClauses, "category = "+nextArg())
		args = append(args, *req.Category)
	}

	if req.Label != nil {
		setClauses = append(setClauses, "label = "+nextArg())
		args = append(args, *req.Label)
	}

	if req.Version != nil {
		setClauses = append(setClauses, "version = "+nextArg())
		args = append(args, *req.Version)
	}

	if req.DisplayOrder != nil {
		setClauses = append(setClauses, "display_order = "+nextArg())
		args = append(args, *req.DisplayOrder)
	}

	if req.Status != nil {
		setClauses = append(setClauses, "status = "+nextArg())
		args = append(args, *req.Status)
	}

	// Always update the updated_at timestamp.
	setClauses = append(setClauses, "updated_at = "+nextArg())
	args = append(args, now)

	if len(setClauses) > 0 {
		updateQuery := fmt.Sprintf(`
			UPDATE project_documents SET %s
			WHERE id = %s AND project_id = %s AND tenant_id = %s`,
			strings.Join(setClauses, ", "),
			nextArg(), nextArg(), nextArg(),
		)
		args = append(args, docID, projectID, auth.TenantID)

		_, err = s.pool.Exec(ctx, updateQuery, args...)
		if err != nil {
			return ProjectDocument{}, apperrors.Internal("failed to update project document", err)
		}
	}

	// If title or description is provided, update the documents table as well.
	if req.Title != nil || req.Description != nil {
		var (
			docSetClauses []string
			docArgs       []any
			docArgIdx     int
		)

		nextDocArg := func() string {
			docArgIdx++
			return fmt.Sprintf("$%d", docArgIdx)
		}

		if req.Title != nil {
			docSetClauses = append(docSetClauses, "title = "+nextDocArg())
			docArgs = append(docArgs, *req.Title)
		}

		if req.Description != nil {
			docSetClauses = append(docSetClauses, "description = "+nextDocArg())
			docArgs = append(docArgs, *req.Description)
		}

		docUpdateQuery := fmt.Sprintf(`
			UPDATE documents SET %s
			WHERE id = %s AND tenant_id = %s`,
			strings.Join(docSetClauses, ", "),
			nextDocArg(), nextDocArg(),
		)
		docArgs = append(docArgs, existing.DocumentID, auth.TenantID)

		_, err = s.pool.Exec(ctx, docUpdateQuery, docArgs...)
		if err != nil {
			return ProjectDocument{}, apperrors.Internal("failed to update document metadata", err)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:project_document",
		EntityType: "project_document",
		EntityID:   docID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Return the refreshed document.
	return s.GetDocument(ctx, projectID, docID)
}

// ──────────────────────────────────────────────
// DeleteDocument
// ──────────────────────────────────────────────

// DeleteDocument removes a project document link and cleans up orphaned storage.
func (s *DocumentService) DeleteDocument(ctx context.Context, projectID uuid.UUID, docID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Get the document_id and file_key before deleting.
	var (
		documentID uuid.UUID
		fileKey    string
	)
	err := s.pool.QueryRow(ctx, `
		SELECT pd.document_id, d.file_key
		FROM project_documents pd
		JOIN documents d ON d.id = pd.document_id
		WHERE pd.id = $1 AND pd.project_id = $2 AND pd.tenant_id = $3`,
		docID, projectID, auth.TenantID,
	).Scan(&documentID, &fileKey)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("ProjectDocument", docID.String())
		}
		return apperrors.Internal("failed to get project document for deletion", err)
	}

	// Delete from project_documents.
	_, err = s.pool.Exec(ctx,
		`DELETE FROM project_documents WHERE id = $1`,
		docID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete project document", err)
	}

	// Check if the document is orphaned (no other references).
	var pdCount int
	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM project_documents WHERE document_id = $1`,
		documentID,
	).Scan(&pdCount)
	if err != nil {
		return apperrors.Internal("failed to check project document references", err)
	}

	var eiCount int
	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM evidence_items WHERE document_id = $1`,
		documentID,
	).Scan(&eiCount)
	if err != nil {
		return apperrors.Internal("failed to check evidence item references", err)
	}

	// If the document is orphaned, delete it from the database and MinIO.
	if pdCount+eiCount == 0 {
		_, err = s.pool.Exec(ctx,
			`DELETE FROM documents WHERE id = $1`,
			documentID,
		)
		if err != nil {
			return apperrors.Internal("failed to delete orphaned document", err)
		}

		if err := s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, fileKey, minio.RemoveObjectOptions{}); err != nil {
			slog.ErrorContext(ctx, "failed to remove file from storage", "error", err, "fileKey", fileKey)
		}
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"documentId": documentID,
		"fileKey":    fileKey,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:project_document",
		EntityType: "project_document",
		EntityID:   docID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// GetDownloadURL
// ──────────────────────────────────────────────

// GetDownloadURL generates a presigned URL for downloading a project document.
func (s *DocumentService) GetDownloadURL(ctx context.Context, projectID uuid.UUID, docID uuid.UUID) (string, string, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return "", "", apperrors.Unauthorized("authentication required")
	}

	var (
		fileKey string
		title   string
	)
	err := s.pool.QueryRow(ctx, `
		SELECT d.file_key, d.title
		FROM project_documents pd
		JOIN documents d ON d.id = pd.document_id
		WHERE pd.id = $1 AND pd.project_id = $2 AND pd.tenant_id = $3`,
		docID, projectID, auth.TenantID,
	).Scan(&fileKey, &title)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", apperrors.NotFound("ProjectDocument", docID.String())
		}
		return "", "", apperrors.Internal("failed to get document for download", err)
	}

	// Generate a presigned URL valid for 15 minutes.
	presignedURL, err := s.minio.PresignedGetObject(ctx, s.minioCfg.BucketAttachment, fileKey, 15*time.Minute, url.Values{})
	if err != nil {
		return "", "", apperrors.Internal("failed to generate download URL", err)
	}

	return presignedURL.String(), title, nil
}

// ──────────────────────────────────────────────
// GetCategoryCounts
// ──────────────────────────────────────────────

// GetCategoryCounts returns the count of active documents per category for a project.
func (s *DocumentService) GetCategoryCounts(ctx context.Context, projectID uuid.UUID) ([]ProjectDocumentCategoryCount, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT pd.category::text, COUNT(*)
		FROM project_documents pd
		WHERE pd.project_id = $1 AND pd.tenant_id = $2 AND pd.status = 'active'
		GROUP BY pd.category
		ORDER BY COUNT(*) DESC`

	rows, err := s.pool.Query(ctx, query, projectID, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get category counts", err)
	}
	defer rows.Close()

	var counts []ProjectDocumentCategoryCount
	for rows.Next() {
		var cc ProjectDocumentCategoryCount
		if err := rows.Scan(&cc.Category, &cc.Count); err != nil {
			return nil, apperrors.Internal("failed to scan category count", err)
		}
		counts = append(counts, cc)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate category counts", err)
	}

	if counts == nil {
		counts = []ProjectDocumentCategoryCount{}
	}

	return counts, nil
}

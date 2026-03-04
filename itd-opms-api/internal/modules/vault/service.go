package vault

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
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":    true,
	"application/vnd.ms-excel":                                                   true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":          true,
	"application/vnd.ms-powerpoint":                                              true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation":  true,
	"image/png":       true,
	"image/jpeg":      true,
	"image/gif":       true,
	"image/webp":      true,
	"text/plain":      true,
	"text/csv":        true,
	"application/zip": true,
	"application/x-zip-compressed": true,
}

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

// Service handles business logic for the document vault.
type Service struct {
	pool     *pgxpool.Pool
	minio    *minio.Client
	minioCfg config.MinIOConfig
	auditSvc *audit.AuditService
}

// NewService creates a new vault Service.
func NewService(pool *pgxpool.Pool, minioClient *minio.Client, minioCfg config.MinIOConfig, auditSvc *audit.AuditService) *Service {
	return &Service{
		pool:     pool,
		minio:    minioClient,
		minioCfg: minioCfg,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// ListDocuments
// ──────────────────────────────────────────────

// ListDocuments returns a filtered, paginated list of vault documents.
func (s *Service) ListDocuments(ctx context.Context, folderID *uuid.UUID, classification, status, search *string, tags []string, limit, offset int) ([]VaultDocument, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	var (
		conditions []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	conditions = append(conditions, "d.tenant_id = "+nextArg())
	args = append(args, auth.TenantID)

	// Org-scope filter.
	orgClause, orgParam := types.BuildOrgFilter(auth, "d.org_unit_id", argIdx+1)
	if orgClause != "" {
		if orgParam != nil {
			conditions = append(conditions, orgClause)
			args = append(args, orgParam)
			argIdx++
		} else {
			conditions = append(conditions, orgClause)
		}
	}

	conditions = append(conditions, "d.is_latest = true")
	conditions = append(conditions, "d.status != 'deleted'")

	if folderID != nil {
		conditions = append(conditions, "d.folder_id = "+nextArg())
		args = append(args, *folderID)
	}

	if classification != nil && *classification != "" {
		conditions = append(conditions, "d.classification = "+nextArg())
		args = append(args, *classification)
	}

	if status != nil && *status != "" {
		conditions = append(conditions, "d.status = "+nextArg())
		args = append(args, *status)
	}

	if search != nil && *search != "" {
		conditions = append(conditions, "(d.title ILIKE '%' || "+nextArg()+" || '%' OR d.description ILIKE '%' || "+nextArg()+" || '%')")
		args = append(args, *search, *search)
	}

	if len(tags) > 0 {
		conditions = append(conditions, "d.tags && "+nextArg())
		args = append(args, tags)
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count total.
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM documents d
		%s`, whereClause)

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count vault documents", err)
	}

	// Fetch paginated results.
	dataQuery := fmt.Sprintf(`
		SELECT d.id, d.tenant_id, d.title, d.description, d.file_key,
			d.content_type, d.size_bytes, d.checksum_sha256, d.classification,
			d.retention_until, d.tags, d.folder_id, d.version,
			d.parent_document_id, d.is_latest, d.locked_by, d.locked_at,
			d.status, d.access_level, d.uploaded_by, d.org_unit_id, d.created_at, d.updated_at,
			COALESCE(u.display_name, ''),
			f.name,
			lu.display_name
		FROM documents d
		LEFT JOIN users u ON u.id = d.uploaded_by
		LEFT JOIN document_folders f ON f.id = d.folder_id
		LEFT JOIN users lu ON lu.id = d.locked_by
		%s
		ORDER BY d.created_at DESC
		LIMIT %s OFFSET %s`,
		whereClause, nextArg(), nextArg())

	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list vault documents", err)
	}
	defer rows.Close()

	docs := make([]VaultDocument, 0)
	for rows.Next() {
		var doc VaultDocument
		if err := rows.Scan(
			&doc.ID, &doc.TenantID, &doc.Title, &doc.Description, &doc.FileKey,
			&doc.ContentType, &doc.SizeBytes, &doc.ChecksumSHA256, &doc.Classification,
			&doc.RetentionUntil, &doc.Tags, &doc.FolderID, &doc.Version,
			&doc.ParentDocumentID, &doc.IsLatest, &doc.LockedBy, &doc.LockedAt,
			&doc.Status, &doc.AccessLevel, &doc.UploadedBy, &doc.OrgUnitID, &doc.CreatedAt, &doc.UpdatedAt,
			&doc.UploaderName,
			&doc.FolderName,
			&doc.LockedByName,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan vault document", err)
		}
		doc.FileName = filepath.Base(doc.FileKey)
		if doc.Tags == nil {
			doc.Tags = []string{}
		}
		docs = append(docs, doc)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate vault documents", err)
	}

	return docs, total, nil
}

// ──────────────────────────────────────────────
// GetDocument
// ──────────────────────────────────────────────

// GetDocument retrieves a single document by ID.
func (s *Service) GetDocument(ctx context.Context, id uuid.UUID) (VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultDocument{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT d.id, d.tenant_id, d.title, d.description, d.file_key,
			d.content_type, d.size_bytes, d.checksum_sha256, d.classification,
			d.retention_until, d.tags, d.folder_id, d.version,
			d.parent_document_id, d.is_latest, d.locked_by, d.locked_at,
			d.status, d.access_level, d.uploaded_by, d.org_unit_id, d.created_at, d.updated_at,
			COALESCE(u.display_name, ''),
			f.name,
			lu.display_name
		FROM documents d
		LEFT JOIN users u ON u.id = d.uploaded_by
		LEFT JOIN document_folders f ON f.id = d.folder_id
		LEFT JOIN users lu ON lu.id = d.locked_by
		WHERE d.id = $1 AND d.tenant_id = $2`

	var doc VaultDocument
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&doc.ID, &doc.TenantID, &doc.Title, &doc.Description, &doc.FileKey,
		&doc.ContentType, &doc.SizeBytes, &doc.ChecksumSHA256, &doc.Classification,
		&doc.RetentionUntil, &doc.Tags, &doc.FolderID, &doc.Version,
		&doc.ParentDocumentID, &doc.IsLatest, &doc.LockedBy, &doc.LockedAt,
		&doc.Status, &doc.AccessLevel, &doc.UploadedBy, &doc.OrgUnitID, &doc.CreatedAt, &doc.UpdatedAt,
		&doc.UploaderName,
		&doc.FolderName,
		&doc.LockedByName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return VaultDocument{}, apperrors.NotFound("Document", id.String())
		}
		return VaultDocument{}, apperrors.Internal("failed to get vault document", err)
	}

	// Org-scope access check.
	if doc.OrgUnitID != nil && !auth.HasOrgAccess(*doc.OrgUnitID) {
		return VaultDocument{}, apperrors.NotFound("Document", id.String())
	}

	doc.FileName = filepath.Base(doc.FileKey)
	if doc.Tags == nil {
		doc.Tags = []string{}
	}

	return doc, nil
}

// ──────────────────────────────────────────────
// UploadDocument
// ──────────────────────────────────────────────

// UploadDocument uploads a file to MinIO and creates a new document record.
func (s *Service) UploadDocument(
	ctx context.Context,
	file multipart.File,
	header *multipart.FileHeader,
	title, description, classification string,
	folderID *uuid.UUID,
	tags []string,
	accessLevel string,
) (VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultDocument{}, apperrors.Unauthorized("authentication required")
	}

	// Validate file size.
	if header.Size > MaxFileSize {
		return VaultDocument{}, apperrors.BadRequest("file size exceeds maximum allowed size of 50 MB")
	}

	// Validate content type.
	contentType := header.Header.Get("Content-Type")
	if !AllowedContentTypes[contentType] {
		return VaultDocument{}, apperrors.BadRequest("unsupported file content type: " + contentType)
	}

	// Validate classification.
	if classification == "" {
		classification = ClassificationOperational
	}
	if !ValidClassifications[classification] {
		return VaultDocument{}, apperrors.BadRequest("invalid document classification")
	}

	// Validate access level.
	if accessLevel == "" {
		accessLevel = AccessLevelInternal
	}
	if !ValidAccessLevels[accessLevel] {
		return VaultDocument{}, apperrors.BadRequest("invalid access level")
	}

	// Validate folder exists if specified.
	if folderID != nil {
		var exists bool
		err := s.pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM document_folders WHERE id = $1 AND tenant_id = $2)`,
			*folderID, auth.TenantID,
		).Scan(&exists)
		if err != nil {
			return VaultDocument{}, apperrors.Internal("failed to verify folder", err)
		}
		if !exists {
			return VaultDocument{}, apperrors.NotFound("Folder", folderID.String())
		}
	}

	// Read file into memory.
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to read uploaded file", err)
	}

	// Compute SHA-256 checksum.
	hash := sha256.Sum256(fileBytes)
	checksum := hex.EncodeToString(hash[:])

	// Generate IDs and timestamps.
	docID := uuid.New()
	now := time.Now().UTC()

	// Build MinIO object key.
	objectKey := fmt.Sprintf("tenants/%s/vault/%s/%s",
		auth.TenantID, docID, header.Filename)

	// Upload to MinIO.
	_, err = s.minio.PutObject(ctx, s.minioCfg.BucketAttachment, objectKey,
		bytes.NewReader(fileBytes), int64(len(fileBytes)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to upload file to storage", err)
	}

	// Default tags to empty array.
	if tags == nil {
		tags = []string{}
	}

	// Default title to filename.
	if title == "" {
		title = header.Filename
	}

	var desc *string
	if description != "" {
		desc = &description
	}

	// Derive org_unit_id from auth context; use NULL if not set.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		id := auth.OrgUnitID
		orgUnitID = &id
	}

	// INSERT into documents table.
	_, err = s.pool.Exec(ctx, `
		INSERT INTO documents (
			id, tenant_id, title, description, file_key,
			content_type, size_bytes, checksum_sha256, classification,
			tags, folder_id, version, parent_document_id, is_latest,
			status, access_level, uploaded_by, org_unit_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, 1, NULL, true,
			'active', $12, $13, $14, $15, $16
		)`,
		docID, auth.TenantID, title, desc, objectKey,
		contentType, int64(len(fileBytes)), checksum, classification,
		tags, folderID,
		accessLevel, auth.UserID, orgUnitID, now, now,
	)
	if err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return VaultDocument{}, apperrors.Internal("failed to insert document record", err)
	}

	// Log access.
	s.logAccess(ctx, docID, auth.UserID, auth.TenantID, "upload")

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":          title,
		"classification": classification,
		"fileName":       header.Filename,
		"sizeBytes":      len(fileBytes),
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "upload:vault_document",
		EntityType: "vault_document",
		EntityID:   docID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return s.GetDocument(ctx, docID)
}

// ──────────────────────────────────────────────
// UpdateDocument
// ──────────────────────────────────────────────

// UpdateDocument updates metadata fields for an existing document.
func (s *Service) UpdateDocument(ctx context.Context, id uuid.UUID, req UpdateDocumentRequest) (VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultDocument{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the document exists.
	existing, err := s.GetDocument(ctx, id)
	if err != nil {
		return VaultDocument{}, err
	}

	// If locked by someone else, reject.
	if existing.LockedBy != nil && *existing.LockedBy != auth.UserID {
		return VaultDocument{}, apperrors.Conflict("document is locked by another user")
	}

	now := time.Now().UTC()

	var (
		setClauses []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	if req.Title != nil {
		setClauses = append(setClauses, "title = "+nextArg())
		args = append(args, *req.Title)
	}

	if req.Description != nil {
		setClauses = append(setClauses, "description = "+nextArg())
		args = append(args, *req.Description)
	}

	if req.Tags != nil {
		setClauses = append(setClauses, "tags = "+nextArg())
		args = append(args, req.Tags)
	}

	if req.Classification != nil {
		if !ValidClassifications[*req.Classification] {
			return VaultDocument{}, apperrors.BadRequest("invalid classification")
		}
		setClauses = append(setClauses, "classification = "+nextArg())
		args = append(args, *req.Classification)
	}

	if req.AccessLevel != nil {
		if !ValidAccessLevels[*req.AccessLevel] {
			return VaultDocument{}, apperrors.BadRequest("invalid access level")
		}
		setClauses = append(setClauses, "access_level = "+nextArg())
		args = append(args, *req.AccessLevel)
	}

	if req.FolderID != nil {
		setClauses = append(setClauses, "folder_id = "+nextArg())
		args = append(args, *req.FolderID)
	}

	// Always update updated_at.
	setClauses = append(setClauses, "updated_at = "+nextArg())
	args = append(args, now)

	if len(setClauses) == 0 {
		return existing, nil
	}

	updateQuery := fmt.Sprintf(`
		UPDATE documents SET %s
		WHERE id = %s AND tenant_id = %s`,
		strings.Join(setClauses, ", "),
		nextArg(), nextArg(),
	)
	args = append(args, id, auth.TenantID)

	_, err = s.pool.Exec(ctx, updateQuery, args...)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to update vault document", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:vault_document",
		EntityType: "vault_document",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return s.GetDocument(ctx, id)
}

// ──────────────────────────────────────────────
// DeleteDocument (soft delete)
// ──────────────────────────────────────────────

// DeleteDocument performs a soft delete by setting status to 'deleted'.
func (s *Service) DeleteDocument(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Verify existence.
	existing, err := s.GetDocument(ctx, id)
	if err != nil {
		return err
	}

	if existing.LockedBy != nil && *existing.LockedBy != auth.UserID {
		return apperrors.Conflict("document is locked by another user")
	}

	now := time.Now().UTC()
	_, err = s.pool.Exec(ctx,
		`UPDATE documents SET status = 'deleted', updated_at = $1 WHERE id = $2 AND tenant_id = $3`,
		now, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete vault document", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{"documentId": id})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:vault_document",
		EntityType: "vault_document",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// GetDownloadURL
// ──────────────────────────────────────────────

// GetDownloadURL generates a presigned download URL and logs the access.
func (s *Service) GetDownloadURL(ctx context.Context, id uuid.UUID) (string, string, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return "", "", apperrors.Unauthorized("authentication required")
	}

	var (
		fileKey   string
		title     string
		orgUnitID *uuid.UUID
	)
	err := s.pool.QueryRow(ctx,
		`SELECT file_key, title, org_unit_id FROM documents WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'`,
		id, auth.TenantID,
	).Scan(&fileKey, &title, &orgUnitID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", apperrors.NotFound("Document", id.String())
		}
		return "", "", apperrors.Internal("failed to get document for download", err)
	}

	// Org-scope access check.
	if orgUnitID != nil && !auth.HasOrgAccess(*orgUnitID) {
		return "", "", apperrors.NotFound("Document", id.String())
	}

	// Generate presigned URL valid for 15 minutes.
	presignedURL, err := s.minio.PresignedGetObject(ctx, s.minioCfg.BucketAttachment, fileKey, 15*time.Minute, url.Values{})
	if err != nil {
		return "", "", apperrors.Internal("failed to generate download URL", err)
	}

	// Log access.
	s.logAccess(ctx, id, auth.UserID, auth.TenantID, "download")

	return presignedURL.String(), title, nil
}

// ──────────────────────────────────────────────
// UploadVersion
// ──────────────────────────────────────────────

// UploadVersion creates a new version of an existing document.
func (s *Service) UploadVersion(ctx context.Context, docID uuid.UUID, file multipart.File, header *multipart.FileHeader) (VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultDocument{}, apperrors.Unauthorized("authentication required")
	}

	// Get the current document.
	existing, err := s.GetDocument(ctx, docID)
	if err != nil {
		return VaultDocument{}, err
	}

	if existing.LockedBy != nil && *existing.LockedBy != auth.UserID {
		return VaultDocument{}, apperrors.Conflict("document is locked by another user")
	}

	// Validate file.
	if header.Size > MaxFileSize {
		return VaultDocument{}, apperrors.BadRequest("file size exceeds maximum allowed size of 50 MB")
	}

	contentType := header.Header.Get("Content-Type")
	if !AllowedContentTypes[contentType] {
		return VaultDocument{}, apperrors.BadRequest("unsupported file content type")
	}

	// Read file.
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to read uploaded file", err)
	}

	hash := sha256.Sum256(fileBytes)
	checksum := hex.EncodeToString(hash[:])

	newDocID := uuid.New()
	now := time.Now().UTC()
	newVersion := existing.Version + 1

	// Determine the root parent document ID.
	parentID := existing.ParentDocumentID
	if parentID == nil {
		parentID = &existing.ID
	}

	// Build MinIO object key.
	objectKey := fmt.Sprintf("tenants/%s/vault/%s/%s",
		auth.TenantID, newDocID, header.Filename)

	// Upload to MinIO.
	_, err = s.minio.PutObject(ctx, s.minioCfg.BucketAttachment, objectKey,
		bytes.NewReader(fileBytes), int64(len(fileBytes)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to upload file to storage", err)
	}

	// Begin transaction.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return VaultDocument{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Set is_latest = false on the previous version.
	_, err = tx.Exec(ctx,
		`UPDATE documents SET is_latest = false, updated_at = $1 WHERE id = $2`,
		now, docID,
	)
	if err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return VaultDocument{}, apperrors.Internal("failed to update previous version", err)
	}

	// INSERT new version.
	tags := existing.Tags
	if tags == nil {
		tags = []string{}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO documents (
			id, tenant_id, title, description, file_key,
			content_type, size_bytes, checksum_sha256, classification,
			tags, folder_id, version, parent_document_id, is_latest,
			status, access_level, uploaded_by, org_unit_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13, true,
			'active', $14, $15, $16, $17, $18
		)`,
		newDocID, auth.TenantID, existing.Title, existing.Description, objectKey,
		contentType, int64(len(fileBytes)), checksum, existing.Classification,
		tags, existing.FolderID, newVersion, parentID,
		existing.AccessLevel, auth.UserID, existing.OrgUnitID, now, now,
	)
	if err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return VaultDocument{}, apperrors.Internal("failed to insert new version", err)
	}

	if err := tx.Commit(ctx); err != nil {
		_ = s.minio.RemoveObject(ctx, s.minioCfg.BucketAttachment, objectKey, minio.RemoveObjectOptions{})
		return VaultDocument{}, apperrors.Internal("failed to commit transaction", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previousVersion": existing.Version,
		"newVersion":      newVersion,
		"fileName":        header.Filename,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "version:vault_document",
		EntityType: "vault_document",
		EntityID:   newDocID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return s.GetDocument(ctx, newDocID)
}

// ──────────────────────────────────────────────
// ListVersions
// ──────────────────────────────────────────────

// ListVersions returns all versions of a document via parent_document_id chain.
func (s *Service) ListVersions(ctx context.Context, docID uuid.UUID) ([]VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// First get the root document ID.
	doc, err := s.GetDocument(ctx, docID)
	if err != nil {
		return nil, err
	}

	rootID := doc.ID
	if doc.ParentDocumentID != nil {
		rootID = *doc.ParentDocumentID
	}

	query := `
		SELECT d.id, d.tenant_id, d.title, d.description, d.file_key,
			d.content_type, d.size_bytes, d.checksum_sha256, d.classification,
			d.retention_until, d.tags, d.folder_id, d.version,
			d.parent_document_id, d.is_latest, d.locked_by, d.locked_at,
			d.status, d.access_level, d.uploaded_by, d.org_unit_id, d.created_at, d.updated_at,
			COALESCE(u.display_name, ''),
			f.name,
			lu.display_name
		FROM documents d
		LEFT JOIN users u ON u.id = d.uploaded_by
		LEFT JOIN document_folders f ON f.id = d.folder_id
		LEFT JOIN users lu ON lu.id = d.locked_by
		WHERE d.tenant_id = $1
			AND (d.id = $2 OR d.parent_document_id = $2)
			AND d.status != 'deleted'
		ORDER BY d.version DESC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, rootID)
	if err != nil {
		return nil, apperrors.Internal("failed to list document versions", err)
	}
	defer rows.Close()

	docs := make([]VaultDocument, 0)
	for rows.Next() {
		var d VaultDocument
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.Title, &d.Description, &d.FileKey,
			&d.ContentType, &d.SizeBytes, &d.ChecksumSHA256, &d.Classification,
			&d.RetentionUntil, &d.Tags, &d.FolderID, &d.Version,
			&d.ParentDocumentID, &d.IsLatest, &d.LockedBy, &d.LockedAt,
			&d.Status, &d.AccessLevel, &d.UploadedBy, &d.OrgUnitID, &d.CreatedAt, &d.UpdatedAt,
			&d.UploaderName,
			&d.FolderName,
			&d.LockedByName,
		); err != nil {
			return nil, apperrors.Internal("failed to scan document version", err)
		}
		d.FileName = filepath.Base(d.FileKey)
		if d.Tags == nil {
			d.Tags = []string{}
		}
		docs = append(docs, d)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate document versions", err)
	}

	return docs, nil
}

// ──────────────────────────────────────────────
// LockDocument
// ──────────────────────────────────────────────

// LockDocument sets the locked_by and locked_at fields. Fails if already locked.
func (s *Service) LockDocument(ctx context.Context, id uuid.UUID) (VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultDocument{}, apperrors.Unauthorized("authentication required")
	}

	// Check current lock status.
	var lockedBy *uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT locked_by FROM documents WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'`,
		id, auth.TenantID,
	).Scan(&lockedBy)
	if err != nil {
		if err == pgx.ErrNoRows {
			return VaultDocument{}, apperrors.NotFound("Document", id.String())
		}
		return VaultDocument{}, apperrors.Internal("failed to check lock status", err)
	}

	if lockedBy != nil {
		return VaultDocument{}, apperrors.Conflict("document is already locked")
	}

	now := time.Now().UTC()
	_, err = s.pool.Exec(ctx,
		`UPDATE documents SET locked_by = $1, locked_at = $2, updated_at = $3 WHERE id = $4 AND tenant_id = $5`,
		auth.UserID, now, now, id, auth.TenantID,
	)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to lock document", err)
	}

	// Log audit.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "lock:vault_document",
		EntityType: "vault_document",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return s.GetDocument(ctx, id)
}

// ──────────────────────────────────────────────
// UnlockDocument
// ──────────────────────────────────────────────

// UnlockDocument clears the lock on a document. Only the lock owner can unlock.
func (s *Service) UnlockDocument(ctx context.Context, id uuid.UUID) (VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultDocument{}, apperrors.Unauthorized("authentication required")
	}

	var lockedBy *uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT locked_by FROM documents WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'`,
		id, auth.TenantID,
	).Scan(&lockedBy)
	if err != nil {
		if err == pgx.ErrNoRows {
			return VaultDocument{}, apperrors.NotFound("Document", id.String())
		}
		return VaultDocument{}, apperrors.Internal("failed to check lock status", err)
	}

	if lockedBy == nil {
		return VaultDocument{}, apperrors.BadRequest("document is not locked")
	}

	if *lockedBy != auth.UserID {
		return VaultDocument{}, apperrors.Forbidden("only the lock owner can unlock the document")
	}

	now := time.Now().UTC()
	_, err = s.pool.Exec(ctx,
		`UPDATE documents SET locked_by = NULL, locked_at = NULL, updated_at = $1 WHERE id = $2 AND tenant_id = $3`,
		now, id, auth.TenantID,
	)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to unlock document", err)
	}

	// Log audit.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "unlock:vault_document",
		EntityType: "vault_document",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return s.GetDocument(ctx, id)
}

// ──────────────────────────────────────────────
// MoveDocument
// ──────────────────────────────────────────────

// MoveDocument moves a document to a different folder.
func (s *Service) MoveDocument(ctx context.Context, id uuid.UUID, folderID *uuid.UUID) (VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultDocument{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the document exists.
	if _, err := s.GetDocument(ctx, id); err != nil {
		return VaultDocument{}, err
	}

	// Validate the target folder if set.
	if folderID != nil {
		var exists bool
		err := s.pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM document_folders WHERE id = $1 AND tenant_id = $2)`,
			*folderID, auth.TenantID,
		).Scan(&exists)
		if err != nil {
			return VaultDocument{}, apperrors.Internal("failed to verify folder", err)
		}
		if !exists {
			return VaultDocument{}, apperrors.NotFound("Folder", folderID.String())
		}
	}

	now := time.Now().UTC()
	_, err := s.pool.Exec(ctx,
		`UPDATE documents SET folder_id = $1, updated_at = $2 WHERE id = $3 AND tenant_id = $4`,
		folderID, now, id, auth.TenantID,
	)
	if err != nil {
		return VaultDocument{}, apperrors.Internal("failed to move document", err)
	}

	return s.GetDocument(ctx, id)
}

// ──────────────────────────────────────────────
// ShareDocument
// ──────────────────────────────────────────────

// ShareDocument creates a new share record for a document.
func (s *Service) ShareDocument(ctx context.Context, id uuid.UUID, req ShareDocumentRequest) (DocumentShare, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DocumentShare{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the document exists.
	if _, err := s.GetDocument(ctx, id); err != nil {
		return DocumentShare{}, err
	}

	// Validate permission.
	if !ValidPermissions[req.Permission] {
		return DocumentShare{}, apperrors.BadRequest("invalid share permission")
	}

	if req.SharedWithUserID == nil && req.SharedWithRole == nil {
		return DocumentShare{}, apperrors.BadRequest("either sharedWithUserId or sharedWithRole is required")
	}

	shareID := uuid.New()
	now := time.Now().UTC()

	_, err := s.pool.Exec(ctx, `
		INSERT INTO document_shares (
			id, document_id, tenant_id, shared_with_user_id, shared_with_role,
			permission, shared_by, expires_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		shareID, id, auth.TenantID, req.SharedWithUserID, req.SharedWithRole,
		req.Permission, auth.UserID, req.ExpiresAt, now,
	)
	if err != nil {
		return DocumentShare{}, apperrors.Internal("failed to share document", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "share:vault_document",
		EntityType: "vault_document",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Return the created share.
	return s.getShare(ctx, shareID, auth.TenantID)
}

// getShare retrieves a single document share.
func (s *Service) getShare(ctx context.Context, shareID, tenantID uuid.UUID) (DocumentShare, error) {
	query := `
		SELECT ds.id, ds.document_id, ds.tenant_id, ds.shared_with_user_id,
			ds.shared_with_role, ds.permission, ds.shared_by, ds.expires_at, ds.created_at,
			COALESCE(wu.display_name, ''),
			COALESCE(su.display_name, '')
		FROM document_shares ds
		LEFT JOIN users wu ON wu.id = ds.shared_with_user_id
		LEFT JOIN users su ON su.id = ds.shared_by
		WHERE ds.id = $1 AND ds.tenant_id = $2`

	var share DocumentShare
	err := s.pool.QueryRow(ctx, query, shareID, tenantID).Scan(
		&share.ID, &share.DocumentID, &share.TenantID, &share.SharedWithUserID,
		&share.SharedWithRole, &share.Permission, &share.SharedBy, &share.ExpiresAt, &share.CreatedAt,
		&share.SharedWithName,
		&share.SharedByName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return DocumentShare{}, apperrors.NotFound("DocumentShare", shareID.String())
		}
		return DocumentShare{}, apperrors.Internal("failed to get document share", err)
	}

	return share, nil
}

// ──────────────────────────────────────────────
// GetAccessLog
// ──────────────────────────────────────────────

// GetAccessLog returns the paginated access log for a document.
func (s *Service) GetAccessLog(ctx context.Context, docID uuid.UUID, limit, offset int) ([]DocumentAccessLogEntry, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Verify the document exists and the caller has org access.
	if _, err := s.GetDocument(ctx, docID); err != nil {
		return nil, 0, err
	}

	// Count total.
	var total int64
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM document_access_log WHERE document_id = $1 AND tenant_id = $2`,
		docID, auth.TenantID,
	).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count access log entries", err)
	}

	query := `
		SELECT dal.id, dal.document_id, dal.tenant_id, dal.user_id, dal.action,
			COALESCE(dal.ip_address, ''), dal.created_at,
			COALESCE(u.display_name, '')
		FROM document_access_log dal
		LEFT JOIN users u ON u.id = dal.user_id
		WHERE dal.document_id = $1 AND dal.tenant_id = $2
		ORDER BY dal.created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, query, docID, auth.TenantID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list access log", err)
	}
	defer rows.Close()

	entries := make([]DocumentAccessLogEntry, 0)
	for rows.Next() {
		var entry DocumentAccessLogEntry
		if err := rows.Scan(
			&entry.ID, &entry.DocumentID, &entry.TenantID, &entry.UserID,
			&entry.Action, &entry.IPAddress, &entry.CreatedAt,
			&entry.UserName,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan access log entry", err)
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate access log entries", err)
	}

	return entries, total, nil
}

// ──────────────────────────────────────────────
// Folder operations
// ──────────────────────────────────────────────

// ListFolders returns all folders for the tenant in a flat list.
func (s *Service) ListFolders(ctx context.Context) ([]DocumentFolder, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter clause.
	orgClause, orgParam := types.BuildOrgFilter(auth, "f.org_unit_id", 2)

	orgSQL := ""
	if orgClause != "" {
		orgSQL = " AND " + orgClause
	}

	query := fmt.Sprintf(`
		SELECT f.id, f.tenant_id, f.parent_id, f.name, f.description,
			f.path, f.color, f.created_by, f.org_unit_id, f.created_at, f.updated_at,
			COALESCE(dc.cnt, 0)
		FROM document_folders f
		LEFT JOIN (
			SELECT folder_id, COUNT(*) AS cnt
			FROM documents
			WHERE tenant_id = $1 AND status != 'deleted' AND is_latest = true
			GROUP BY folder_id
		) dc ON dc.folder_id = f.id
		WHERE f.tenant_id = $1%s
		ORDER BY f.path ASC, f.name ASC`, orgSQL)

	args := []interface{}{auth.TenantID}
	if orgParam != nil {
		args = append(args, orgParam)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, apperrors.Internal("failed to list folders", err)
	}
	defer rows.Close()

	folders := make([]DocumentFolder, 0)
	for rows.Next() {
		var f DocumentFolder
		if err := rows.Scan(
			&f.ID, &f.TenantID, &f.ParentID, &f.Name, &f.Description,
			&f.Path, &f.Color, &f.CreatedBy, &f.OrgUnitID, &f.CreatedAt, &f.UpdatedAt,
			&f.DocumentCount,
		); err != nil {
			return nil, apperrors.Internal("failed to scan folder", err)
		}
		folders = append(folders, f)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate folders", err)
	}

	return folders, nil
}

// CreateFolder creates a new folder in the vault.
func (s *Service) CreateFolder(ctx context.Context, req CreateFolderRequest) (DocumentFolder, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DocumentFolder{}, apperrors.Unauthorized("authentication required")
	}

	if req.Name == "" {
		return DocumentFolder{}, apperrors.BadRequest("folder name is required")
	}

	// Build the path from parent.
	path := "/" + req.Name
	if req.ParentID != nil {
		var parentPath string
		err := s.pool.QueryRow(ctx,
			`SELECT path FROM document_folders WHERE id = $1 AND tenant_id = $2`,
			*req.ParentID, auth.TenantID,
		).Scan(&parentPath)
		if err != nil {
			if err == pgx.ErrNoRows {
				return DocumentFolder{}, apperrors.NotFound("ParentFolder", req.ParentID.String())
			}
			return DocumentFolder{}, apperrors.Internal("failed to get parent folder", err)
		}
		path = parentPath + "/" + req.Name
	}

	folderID := uuid.New()
	now := time.Now().UTC()

	// Derive org_unit_id from auth context; use NULL if not set.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		id := auth.OrgUnitID
		orgUnitID = &id
	}

	_, err := s.pool.Exec(ctx, `
		INSERT INTO document_folders (
			id, tenant_id, parent_id, name, description, path, color, created_by, org_unit_id, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		folderID, auth.TenantID, req.ParentID, req.Name, req.Description,
		path, req.Color, auth.UserID, orgUnitID, now, now,
	)
	if err != nil {
		return DocumentFolder{}, apperrors.Internal("failed to create folder", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:vault_folder",
		EntityType: "vault_folder",
		EntityID:   folderID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return DocumentFolder{
		ID:          folderID,
		TenantID:    auth.TenantID,
		ParentID:    req.ParentID,
		Name:        req.Name,
		Description: req.Description,
		Path:        path,
		Color:       req.Color,
		CreatedBy:   auth.UserID,
		OrgUnitID:   orgUnitID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// UpdateFolder updates folder name, description, and/or color.
func (s *Service) UpdateFolder(ctx context.Context, id uuid.UUID, req UpdateFolderRequest) (DocumentFolder, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return DocumentFolder{}, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	var (
		setClauses []string
		args       []any
		argIdx     int
	)

	nextArg := func() string {
		argIdx++
		return fmt.Sprintf("$%d", argIdx)
	}

	if req.Name != nil {
		setClauses = append(setClauses, "name = "+nextArg())
		args = append(args, *req.Name)
	}

	if req.Description != nil {
		setClauses = append(setClauses, "description = "+nextArg())
		args = append(args, *req.Description)
	}

	if req.Color != nil {
		setClauses = append(setClauses, "color = "+nextArg())
		args = append(args, *req.Color)
	}

	setClauses = append(setClauses, "updated_at = "+nextArg())
	args = append(args, now)

	updateQuery := fmt.Sprintf(`
		UPDATE document_folders SET %s
		WHERE id = %s AND tenant_id = %s`,
		strings.Join(setClauses, ", "),
		nextArg(), nextArg(),
	)
	args = append(args, id, auth.TenantID)

	ct, err := s.pool.Exec(ctx, updateQuery, args...)
	if err != nil {
		return DocumentFolder{}, apperrors.Internal("failed to update folder", err)
	}

	if ct.RowsAffected() == 0 {
		return DocumentFolder{}, apperrors.NotFound("Folder", id.String())
	}

	// Refetch.
	var f DocumentFolder
	err = s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, parent_id, name, description, path, color, created_by, org_unit_id, created_at, updated_at
		FROM document_folders WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&f.ID, &f.TenantID, &f.ParentID, &f.Name, &f.Description, &f.Path, &f.Color, &f.CreatedBy, &f.OrgUnitID, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return DocumentFolder{}, apperrors.Internal("failed to refetch folder", err)
	}

	return f, nil
}

// DeleteFolder deletes a folder only if it is empty (no documents and no child folders).
func (s *Service) DeleteFolder(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	// Check for documents in the folder.
	var docCount int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM documents WHERE folder_id = $1 AND tenant_id = $2 AND status != 'deleted'`,
		id, auth.TenantID,
	).Scan(&docCount)
	if err != nil {
		return apperrors.Internal("failed to check folder contents", err)
	}

	if docCount > 0 {
		return apperrors.Conflict("folder contains documents and cannot be deleted")
	}

	// Check for child folders.
	var childCount int
	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM document_folders WHERE parent_id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&childCount)
	if err != nil {
		return apperrors.Internal("failed to check child folders", err)
	}

	if childCount > 0 {
		return apperrors.Conflict("folder contains subfolders and cannot be deleted")
	}

	ct, err := s.pool.Exec(ctx,
		`DELETE FROM document_folders WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete folder", err)
	}

	if ct.RowsAffected() == 0 {
		return apperrors.NotFound("Folder", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:vault_folder",
		EntityType: "vault_folder",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// SearchDocuments
// ──────────────────────────────────────────────

// SearchDocuments searches documents by title, description, or tags.
func (s *Service) SearchDocuments(ctx context.Context, query string, limit, offset int) ([]VaultDocument, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	searchPattern := "%" + strings.ToLower(query) + "%"

	// Build org-scope filter clause.
	orgClause, orgParam := types.BuildOrgFilter(auth, "d.org_unit_id", 3)

	// Count total.
	var total int64
	countQuery := `
		SELECT COUNT(*)
		FROM documents d
		WHERE d.tenant_id = $1
			AND d.is_latest = true
			AND d.status != 'deleted'
			AND (
				LOWER(d.title) LIKE $2
				OR LOWER(COALESCE(d.description, '')) LIKE $2
				OR EXISTS (SELECT 1 FROM unnest(d.tags) AS t WHERE LOWER(t) LIKE $2)
			)`

	countArgs := []interface{}{auth.TenantID, searchPattern}
	if orgClause != "" {
		countQuery += " AND " + orgClause
		if orgParam != nil {
			countArgs = append(countArgs, orgParam)
		}
	}

	if err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count search results", err)
	}

	// Determine next param index after the org filter (if any).
	nextIdx := 3
	if orgClause != "" && orgParam != nil {
		nextIdx = 4
	}

	dataQuery := fmt.Sprintf(`
		SELECT d.id, d.tenant_id, d.title, d.description, d.file_key,
			d.content_type, d.size_bytes, d.checksum_sha256, d.classification,
			d.retention_until, d.tags, d.folder_id, d.version,
			d.parent_document_id, d.is_latest, d.locked_by, d.locked_at,
			d.status, d.access_level, d.uploaded_by, d.org_unit_id, d.created_at, d.updated_at,
			COALESCE(u.display_name, ''),
			f.name,
			lu.display_name
		FROM documents d
		LEFT JOIN users u ON u.id = d.uploaded_by
		LEFT JOIN document_folders f ON f.id = d.folder_id
		LEFT JOIN users lu ON lu.id = d.locked_by
		WHERE d.tenant_id = $1
			AND d.is_latest = true
			AND d.status != 'deleted'
			AND (
				LOWER(d.title) LIKE $2
				OR LOWER(COALESCE(d.description, '')) LIKE $2
				OR EXISTS (SELECT 1 FROM unnest(d.tags) AS t WHERE LOWER(t) LIKE $2)
			)%s
		ORDER BY d.created_at DESC
		LIMIT $%d OFFSET $%d`,
		func() string {
			if orgClause != "" {
				return " AND " + orgClause
			}
			return ""
		}(), nextIdx, nextIdx+1)

	dataArgs := []interface{}{auth.TenantID, searchPattern}
	if orgClause != "" && orgParam != nil {
		dataArgs = append(dataArgs, orgParam)
	}
	dataArgs = append(dataArgs, limit, offset)

	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to search documents", err)
	}
	defer rows.Close()

	docs := make([]VaultDocument, 0)
	for rows.Next() {
		var d VaultDocument
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.Title, &d.Description, &d.FileKey,
			&d.ContentType, &d.SizeBytes, &d.ChecksumSHA256, &d.Classification,
			&d.RetentionUntil, &d.Tags, &d.FolderID, &d.Version,
			&d.ParentDocumentID, &d.IsLatest, &d.LockedBy, &d.LockedAt,
			&d.Status, &d.AccessLevel, &d.UploadedBy, &d.OrgUnitID, &d.CreatedAt, &d.UpdatedAt,
			&d.UploaderName,
			&d.FolderName,
			&d.LockedByName,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan search result", err)
		}
		d.FileName = filepath.Base(d.FileKey)
		if d.Tags == nil {
			d.Tags = []string{}
		}
		docs = append(docs, d)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate search results", err)
	}

	return docs, total, nil
}

// ──────────────────────────────────────────────
// GetRecentDocuments
// ──────────────────────────────────────────────

// GetRecentDocuments returns the most recently uploaded documents by the current user.
func (s *Service) GetRecentDocuments(ctx context.Context, limit int) ([]VaultDocument, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if limit <= 0 || limit > 50 {
		limit = 10
	}

	query := `
		SELECT d.id, d.tenant_id, d.title, d.description, d.file_key,
			d.content_type, d.size_bytes, d.checksum_sha256, d.classification,
			d.retention_until, d.tags, d.folder_id, d.version,
			d.parent_document_id, d.is_latest, d.locked_by, d.locked_at,
			d.status, d.access_level, d.uploaded_by, d.org_unit_id, d.created_at, d.updated_at,
			COALESCE(u.display_name, ''),
			f.name,
			lu.display_name
		FROM documents d
		LEFT JOIN users u ON u.id = d.uploaded_by
		LEFT JOIN document_folders f ON f.id = d.folder_id
		LEFT JOIN users lu ON lu.id = d.locked_by
		WHERE d.tenant_id = $1
			AND d.uploaded_by = $2
			AND d.is_latest = true
			AND d.status != 'deleted'
		ORDER BY d.created_at DESC
		LIMIT $3`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, auth.UserID, limit)
	if err != nil {
		return nil, apperrors.Internal("failed to get recent documents", err)
	}
	defer rows.Close()

	docs := make([]VaultDocument, 0)
	for rows.Next() {
		var d VaultDocument
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.Title, &d.Description, &d.FileKey,
			&d.ContentType, &d.SizeBytes, &d.ChecksumSHA256, &d.Classification,
			&d.RetentionUntil, &d.Tags, &d.FolderID, &d.Version,
			&d.ParentDocumentID, &d.IsLatest, &d.LockedBy, &d.LockedAt,
			&d.Status, &d.AccessLevel, &d.UploadedBy, &d.OrgUnitID, &d.CreatedAt, &d.UpdatedAt,
			&d.UploaderName,
			&d.FolderName,
			&d.LockedByName,
		); err != nil {
			return nil, apperrors.Internal("failed to scan recent document", err)
		}
		d.FileName = filepath.Base(d.FileKey)
		if d.Tags == nil {
			d.Tags = []string{}
		}
		docs = append(docs, d)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate recent documents", err)
	}

	return docs, nil
}

// ──────────────────────────────────────────────
// GetStats
// ──────────────────────────────────────────────

// GetStats returns aggregate statistics for the document vault.
func (s *Service) GetStats(ctx context.Context) (VaultStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VaultStats{}, apperrors.Unauthorized("authentication required")
	}

	stats := VaultStats{
		ByClassification: make(map[string]int64),
	}

	// Build org-scope filter clause.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 2)
	orgSQL := ""
	if orgClause != "" {
		orgSQL = " AND " + orgClause
	}

	// Total documents and size.
	docStatsQuery := fmt.Sprintf(`
		SELECT COALESCE(COUNT(*), 0), COALESCE(SUM(size_bytes), 0)
		FROM documents
		WHERE tenant_id = $1 AND is_latest = true AND status != 'deleted'%s`, orgSQL)

	docStatsArgs := []interface{}{auth.TenantID}
	if orgParam != nil {
		docStatsArgs = append(docStatsArgs, orgParam)
	}

	err := s.pool.QueryRow(ctx, docStatsQuery, docStatsArgs...).Scan(&stats.TotalDocuments, &stats.TotalSizeBytes)
	if err != nil {
		return VaultStats{}, apperrors.Internal("failed to get document stats", err)
	}

	// Total folders.
	// Build folder org-scope filter clause.
	folderOrgClause, folderOrgParam := types.BuildOrgFilter(auth, "org_unit_id", 2)
	folderOrgSQL := ""
	if folderOrgClause != "" {
		folderOrgSQL = " AND " + folderOrgClause
	}

	folderCountQuery := fmt.Sprintf(`SELECT COUNT(*) FROM document_folders WHERE tenant_id = $1%s`, folderOrgSQL)
	folderCountArgs := []interface{}{auth.TenantID}
	if folderOrgParam != nil {
		folderCountArgs = append(folderCountArgs, folderOrgParam)
	}

	err = s.pool.QueryRow(ctx, folderCountQuery, folderCountArgs...).Scan(&stats.TotalFolders)
	if err != nil {
		return VaultStats{}, apperrors.Internal("failed to get folder count", err)
	}

	// Documents by classification.
	classQuery := fmt.Sprintf(`
		SELECT classification::text, COUNT(*)
		FROM documents
		WHERE tenant_id = $1 AND is_latest = true AND status != 'deleted'%s
		GROUP BY classification`, orgSQL)

	classArgs := []interface{}{auth.TenantID}
	if orgParam != nil {
		classArgs = append(classArgs, orgParam)
	}

	rows, err := s.pool.Query(ctx, classQuery, classArgs...)
	if err != nil {
		return VaultStats{}, apperrors.Internal("failed to get classification stats", err)
	}
	defer rows.Close()

	for rows.Next() {
		var cls string
		var cnt int64
		if err := rows.Scan(&cls, &cnt); err != nil {
			return VaultStats{}, apperrors.Internal("failed to scan classification stat", err)
		}
		stats.ByClassification[cls] = cnt
	}

	if err := rows.Err(); err != nil {
		return VaultStats{}, apperrors.Internal("failed to iterate classification stats", err)
	}

	// Recent uploads (last 7 days).
	recentQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM documents
		WHERE tenant_id = $1 AND is_latest = true AND status != 'deleted'
			AND created_at >= NOW() - INTERVAL '7 days'%s`, orgSQL)

	recentArgs := []interface{}{auth.TenantID}
	if orgParam != nil {
		recentArgs = append(recentArgs, orgParam)
	}

	err = s.pool.QueryRow(ctx, recentQuery, recentArgs...).Scan(&stats.RecentUploads)
	if err != nil {
		return VaultStats{}, apperrors.Internal("failed to get recent upload count", err)
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

// logAccess inserts a record into the document_access_log table.
func (s *Service) logAccess(ctx context.Context, docID, userID, tenantID uuid.UUID, action string) {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO document_access_log (id, document_id, tenant_id, user_id, action, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		uuid.New(), docID, tenantID, userID, action, time.Now().UTC(),
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to log document access", "error", err, "documentId", docID)
	}
}

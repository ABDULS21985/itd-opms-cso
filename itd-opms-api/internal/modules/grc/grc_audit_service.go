package grc

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// AuditMgmtService
// ──────────────────────────────────────────────

// AuditMgmtService handles business logic for GRC audit management,
// findings, and evidence collections.
type AuditMgmtService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewAuditMgmtService creates a new AuditMgmtService.
func NewAuditMgmtService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *AuditMgmtService {
	return &AuditMgmtService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Audits
// ──────────────────────────────────────────────

// CreateAudit creates a new GRC audit record.
func (s *AuditMgmtService) CreateAudit(ctx context.Context, req CreateAuditRequest) (Audit, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Audit{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO grc_audits (
			id, tenant_id, title, audit_type, scope,
			auditor, audit_body, status,
			scheduled_start, scheduled_end,
			evidence_requirements, readiness_score,
			created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10,
			$11, $12,
			$13, $14, $15
		)
		RETURNING id, tenant_id, title, audit_type, scope,
			auditor, audit_body, status,
			scheduled_start, scheduled_end,
			evidence_requirements, readiness_score,
			created_by, created_at, updated_at`

	var a Audit
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Title, req.AuditType, req.Scope,
		req.Auditor, req.AuditBody, req.Status,
		req.ScheduledStart, req.ScheduledEnd,
		req.EvidenceRequirements, 0.0,
		auth.UserID, now, now,
	).Scan(
		&a.ID, &a.TenantID, &a.Title, &a.AuditType, &a.Scope,
		&a.Auditor, &a.AuditBody, &a.Status,
		&a.ScheduledStart, &a.ScheduledEnd,
		&a.EvidenceRequirements, &a.ReadinessScore,
		&a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return Audit{}, apperrors.Internal("failed to create audit", err)
	}

	changes, _ := json.Marshal(map[string]any{"title": req.Title, "auditType": req.AuditType})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:grc_audit",
		EntityType: "grc_audit",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return a, nil
}

// GetAudit retrieves a single GRC audit by ID.
func (s *AuditMgmtService) GetAudit(ctx context.Context, id uuid.UUID) (Audit, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Audit{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, title, audit_type, scope,
			auditor, audit_body, status,
			scheduled_start, scheduled_end,
			evidence_requirements, readiness_score,
			created_by, created_at, updated_at
		FROM grc_audits
		WHERE id = $1 AND tenant_id = $2`

	var a Audit
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&a.ID, &a.TenantID, &a.Title, &a.AuditType, &a.Scope,
		&a.Auditor, &a.AuditBody, &a.Status,
		&a.ScheduledStart, &a.ScheduledEnd,
		&a.EvidenceRequirements, &a.ReadinessScore,
		&a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Audit{}, apperrors.NotFound("Audit", id.String())
		}
		return Audit{}, apperrors.Internal("failed to get audit", err)
	}

	return a, nil
}

// ListAudits returns a filtered, paginated list of GRC audits.
func (s *AuditMgmtService) ListAudits(ctx context.Context, status, auditType *string, page, limit int) ([]Audit, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM grc_audits
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
			AND ($3::text IS NULL OR audit_type = $3)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, status, auditType).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count audits", err)
	}

	dataQuery := `
		SELECT id, tenant_id, title, audit_type, scope,
			auditor, audit_body, status,
			scheduled_start, scheduled_end,
			evidence_requirements, readiness_score,
			created_by, created_at, updated_at
		FROM grc_audits
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
			AND ($3::text IS NULL OR audit_type = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, status, auditType, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list audits", err)
	}
	defer rows.Close()

	var audits []Audit
	for rows.Next() {
		var a Audit
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.Title, &a.AuditType, &a.Scope,
			&a.Auditor, &a.AuditBody, &a.Status,
			&a.ScheduledStart, &a.ScheduledEnd,
			&a.EvidenceRequirements, &a.ReadinessScore,
			&a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan audit", err)
		}
		audits = append(audits, a)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate audits", err)
	}

	if audits == nil {
		audits = []Audit{}
	}

	return audits, total, nil
}

// UpdateAudit updates an existing GRC audit using COALESCE partial update.
func (s *AuditMgmtService) UpdateAudit(ctx context.Context, id uuid.UUID, req UpdateAuditRequest) (Audit, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Audit{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetAudit(ctx, id); err != nil {
		return Audit{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE grc_audits SET
			title = COALESCE($1, title),
			audit_type = COALESCE($2, audit_type),
			scope = COALESCE($3, scope),
			auditor = COALESCE($4, auditor),
			audit_body = COALESCE($5, audit_body),
			status = COALESCE($6, status),
			scheduled_start = COALESCE($7, scheduled_start),
			scheduled_end = COALESCE($8, scheduled_end),
			evidence_requirements = COALESCE($9, evidence_requirements),
			updated_at = $10
		WHERE id = $11 AND tenant_id = $12
		RETURNING id, tenant_id, title, audit_type, scope,
			auditor, audit_body, status,
			scheduled_start, scheduled_end,
			evidence_requirements, readiness_score,
			created_by, created_at, updated_at`

	var a Audit
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.AuditType, req.Scope,
		req.Auditor, req.AuditBody, req.Status,
		req.ScheduledStart, req.ScheduledEnd,
		req.EvidenceRequirements,
		now, id, auth.TenantID,
	).Scan(
		&a.ID, &a.TenantID, &a.Title, &a.AuditType, &a.Scope,
		&a.Auditor, &a.AuditBody, &a.Status,
		&a.ScheduledStart, &a.ScheduledEnd,
		&a.EvidenceRequirements, &a.ReadinessScore,
		&a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return Audit{}, apperrors.Internal("failed to update audit", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:grc_audit",
		EntityType: "grc_audit",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return a, nil
}

// DeleteAudit deletes a GRC audit by ID.
func (s *AuditMgmtService) DeleteAudit(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM grc_audits WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete audit", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Audit", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:grc_audit",
		EntityType: "grc_audit",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Audit Findings
// ──────────────────────────────────────────────

// CreateFinding creates a new audit finding with an auto-generated finding number (FND-NNNN).
func (s *AuditMgmtService) CreateFinding(ctx context.Context, auditID uuid.UUID, req CreateAuditFindingRequest) (AuditFinding, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AuditFinding{}, apperrors.Unauthorized("authentication required")
	}

	// Verify audit exists
	if _, err := s.GetAudit(ctx, auditID); err != nil {
		return AuditFinding{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Generate finding number FND-NNNN
	var count int
	countQuery := `SELECT COUNT(*) FROM audit_findings WHERE audit_id = $1`
	if err := s.pool.QueryRow(ctx, countQuery, auditID).Scan(&count); err != nil {
		return AuditFinding{}, apperrors.Internal("failed to generate finding number", err)
	}
	findingNumber := fmt.Sprintf("FND-%04d", count+1)

	query := `
		INSERT INTO audit_findings (
			id, audit_id, tenant_id, finding_number, title,
			description, severity, status, remediation_plan,
			owner_id, due_date, evidence_of_remediation,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12,
			$13, $14
		)
		RETURNING id, audit_id, tenant_id, finding_number, title,
			description, severity, status, remediation_plan,
			owner_id, due_date, closed_at, evidence_of_remediation,
			created_at, updated_at`

	var f AuditFinding
	err := s.pool.QueryRow(ctx, query,
		id, auditID, auth.TenantID, findingNumber, req.Title,
		req.Description, req.Severity, req.Status, req.RemediationPlan,
		req.OwnerID, req.DueDate, req.EvidenceOfRemediation,
		now, now,
	).Scan(
		&f.ID, &f.AuditID, &f.TenantID, &f.FindingNumber, &f.Title,
		&f.Description, &f.Severity, &f.Status, &f.RemediationPlan,
		&f.OwnerID, &f.DueDate, &f.ClosedAt, &f.EvidenceOfRemediation,
		&f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		return AuditFinding{}, apperrors.Internal("failed to create audit finding", err)
	}

	changes, _ := json.Marshal(map[string]any{"title": req.Title, "findingNumber": findingNumber})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:audit_finding",
		EntityType: "audit_finding",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return f, nil
}

// GetFinding retrieves a single audit finding by ID.
func (s *AuditMgmtService) GetFinding(ctx context.Context, id uuid.UUID) (AuditFinding, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AuditFinding{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, audit_id, tenant_id, finding_number, title,
			description, severity, status, remediation_plan,
			owner_id, due_date, closed_at, evidence_of_remediation,
			created_at, updated_at
		FROM audit_findings
		WHERE id = $1 AND tenant_id = $2`

	var f AuditFinding
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&f.ID, &f.AuditID, &f.TenantID, &f.FindingNumber, &f.Title,
		&f.Description, &f.Severity, &f.Status, &f.RemediationPlan,
		&f.OwnerID, &f.DueDate, &f.ClosedAt, &f.EvidenceOfRemediation,
		&f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return AuditFinding{}, apperrors.NotFound("AuditFinding", id.String())
		}
		return AuditFinding{}, apperrors.Internal("failed to get audit finding", err)
	}

	return f, nil
}

// ListFindings returns a filtered, paginated list of audit findings for an audit.
func (s *AuditMgmtService) ListFindings(ctx context.Context, auditID uuid.UUID, status *string, page, limit int) ([]AuditFinding, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM audit_findings
		WHERE audit_id = $1 AND tenant_id = $2
			AND ($3::text IS NULL OR status = $3)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auditID, auth.TenantID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count audit findings", err)
	}

	dataQuery := `
		SELECT id, audit_id, tenant_id, finding_number, title,
			description, severity, status, remediation_plan,
			owner_id, due_date, closed_at, evidence_of_remediation,
			created_at, updated_at
		FROM audit_findings
		WHERE audit_id = $1 AND tenant_id = $2
			AND ($3::text IS NULL OR status = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auditID, auth.TenantID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list audit findings", err)
	}
	defer rows.Close()

	var findings []AuditFinding
	for rows.Next() {
		var f AuditFinding
		if err := rows.Scan(
			&f.ID, &f.AuditID, &f.TenantID, &f.FindingNumber, &f.Title,
			&f.Description, &f.Severity, &f.Status, &f.RemediationPlan,
			&f.OwnerID, &f.DueDate, &f.ClosedAt, &f.EvidenceOfRemediation,
			&f.CreatedAt, &f.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan audit finding", err)
		}
		findings = append(findings, f)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate audit findings", err)
	}

	if findings == nil {
		findings = []AuditFinding{}
	}

	return findings, total, nil
}

// UpdateFinding updates an existing audit finding using COALESCE partial update.
func (s *AuditMgmtService) UpdateFinding(ctx context.Context, id uuid.UUID, req UpdateAuditFindingRequest) (AuditFinding, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AuditFinding{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetFinding(ctx, id); err != nil {
		return AuditFinding{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE audit_findings SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			severity = COALESCE($3, severity),
			status = COALESCE($4, status),
			remediation_plan = COALESCE($5, remediation_plan),
			owner_id = COALESCE($6, owner_id),
			due_date = COALESCE($7, due_date),
			evidence_of_remediation = COALESCE($8, evidence_of_remediation),
			updated_at = $9
		WHERE id = $10 AND tenant_id = $11
		RETURNING id, audit_id, tenant_id, finding_number, title,
			description, severity, status, remediation_plan,
			owner_id, due_date, closed_at, evidence_of_remediation,
			created_at, updated_at`

	var f AuditFinding
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.Severity,
		req.Status, req.RemediationPlan,
		req.OwnerID, req.DueDate, req.EvidenceOfRemediation,
		now, id, auth.TenantID,
	).Scan(
		&f.ID, &f.AuditID, &f.TenantID, &f.FindingNumber, &f.Title,
		&f.Description, &f.Severity, &f.Status, &f.RemediationPlan,
		&f.OwnerID, &f.DueDate, &f.ClosedAt, &f.EvidenceOfRemediation,
		&f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		return AuditFinding{}, apperrors.Internal("failed to update audit finding", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:audit_finding",
		EntityType: "audit_finding",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return f, nil
}

// CloseFinding closes an audit finding by setting status to "closed" and recording the closed_at timestamp.
func (s *AuditMgmtService) CloseFinding(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE audit_findings SET
			status = 'closed',
			closed_at = $1,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4`

	result, err := s.pool.Exec(ctx, query, now, now, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to close audit finding", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("AuditFinding", id.String())
	}

	changes, _ := json.Marshal(map[string]any{"status": "closed"})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "close:audit_finding",
		EntityType: "audit_finding",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Evidence Collections
// ──────────────────────────────────────────────

// CreateEvidenceCollection creates a new evidence collection for an audit.
func (s *AuditMgmtService) CreateEvidenceCollection(ctx context.Context, auditID uuid.UUID, req CreateEvidenceCollectionRequest) (EvidenceCollection, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return EvidenceCollection{}, apperrors.Unauthorized("authentication required")
	}

	// Verify audit exists
	if _, err := s.GetAudit(ctx, auditID); err != nil {
		return EvidenceCollection{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO evidence_collections (
			id, audit_id, tenant_id, title, description,
			status, evidence_item_ids, collector_id, reviewer_id,
			checksum, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12
		)
		RETURNING id, audit_id, tenant_id, title, description,
			status, evidence_item_ids, collector_id, reviewer_id,
			approved_at, checksum, created_at, updated_at`

	var ec EvidenceCollection
	err := s.pool.QueryRow(ctx, query,
		id, auditID, auth.TenantID, req.Title, req.Description,
		req.Status, req.EvidenceItemIDs, req.CollectorID, req.ReviewerID,
		req.Checksum, now, now,
	).Scan(
		&ec.ID, &ec.AuditID, &ec.TenantID, &ec.Title, &ec.Description,
		&ec.Status, &ec.EvidenceItemIDs, &ec.CollectorID, &ec.ReviewerID,
		&ec.ApprovedAt, &ec.Checksum, &ec.CreatedAt, &ec.UpdatedAt,
	)
	if err != nil {
		return EvidenceCollection{}, apperrors.Internal("failed to create evidence collection", err)
	}

	changes, _ := json.Marshal(map[string]any{"title": req.Title, "auditId": auditID})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:evidence_collection",
		EntityType: "evidence_collection",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ec, nil
}

// GetEvidenceCollection retrieves a single evidence collection by ID.
func (s *AuditMgmtService) GetEvidenceCollection(ctx context.Context, id uuid.UUID) (EvidenceCollection, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return EvidenceCollection{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, audit_id, tenant_id, title, description,
			status, evidence_item_ids, collector_id, reviewer_id,
			approved_at, checksum, created_at, updated_at
		FROM evidence_collections
		WHERE id = $1 AND tenant_id = $2`

	var ec EvidenceCollection
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&ec.ID, &ec.AuditID, &ec.TenantID, &ec.Title, &ec.Description,
		&ec.Status, &ec.EvidenceItemIDs, &ec.CollectorID, &ec.ReviewerID,
		&ec.ApprovedAt, &ec.Checksum, &ec.CreatedAt, &ec.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return EvidenceCollection{}, apperrors.NotFound("EvidenceCollection", id.String())
		}
		return EvidenceCollection{}, apperrors.Internal("failed to get evidence collection", err)
	}

	return ec, nil
}

// ListEvidenceCollections returns evidence collections for an audit, optionally filtered by status.
func (s *AuditMgmtService) ListEvidenceCollections(ctx context.Context, auditID uuid.UUID, status *string) ([]EvidenceCollection, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, audit_id, tenant_id, title, description,
			status, evidence_item_ids, collector_id, reviewer_id,
			approved_at, checksum, created_at, updated_at
		FROM evidence_collections
		WHERE audit_id = $1 AND tenant_id = $2
			AND ($3::text IS NULL OR status = $3)
		ORDER BY created_at DESC`

	rows, err := s.pool.Query(ctx, query, auditID, auth.TenantID, status)
	if err != nil {
		return nil, apperrors.Internal("failed to list evidence collections", err)
	}
	defer rows.Close()

	var collections []EvidenceCollection
	for rows.Next() {
		var ec EvidenceCollection
		if err := rows.Scan(
			&ec.ID, &ec.AuditID, &ec.TenantID, &ec.Title, &ec.Description,
			&ec.Status, &ec.EvidenceItemIDs, &ec.CollectorID, &ec.ReviewerID,
			&ec.ApprovedAt, &ec.Checksum, &ec.CreatedAt, &ec.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan evidence collection", err)
		}
		collections = append(collections, ec)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate evidence collections", err)
	}

	if collections == nil {
		collections = []EvidenceCollection{}
	}

	return collections, nil
}

// UpdateEvidenceCollection updates an existing evidence collection using COALESCE partial update.
func (s *AuditMgmtService) UpdateEvidenceCollection(ctx context.Context, id uuid.UUID, req UpdateEvidenceCollectionRequest) (EvidenceCollection, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return EvidenceCollection{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetEvidenceCollection(ctx, id); err != nil {
		return EvidenceCollection{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE evidence_collections SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			status = COALESCE($3, status),
			evidence_item_ids = COALESCE($4, evidence_item_ids),
			collector_id = COALESCE($5, collector_id),
			reviewer_id = COALESCE($6, reviewer_id),
			checksum = COALESCE($7, checksum),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING id, audit_id, tenant_id, title, description,
			status, evidence_item_ids, collector_id, reviewer_id,
			approved_at, checksum, created_at, updated_at`

	var ec EvidenceCollection
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.Status,
		req.EvidenceItemIDs, req.CollectorID, req.ReviewerID,
		req.Checksum,
		now, id, auth.TenantID,
	).Scan(
		&ec.ID, &ec.AuditID, &ec.TenantID, &ec.Title, &ec.Description,
		&ec.Status, &ec.EvidenceItemIDs, &ec.CollectorID, &ec.ReviewerID,
		&ec.ApprovedAt, &ec.Checksum, &ec.CreatedAt, &ec.UpdatedAt,
	)
	if err != nil {
		return EvidenceCollection{}, apperrors.Internal("failed to update evidence collection", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:evidence_collection",
		EntityType: "evidence_collection",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ec, nil
}

// ApproveEvidenceCollection approves an evidence collection by setting status to "approved".
func (s *AuditMgmtService) ApproveEvidenceCollection(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE evidence_collections SET
			status = 'approved',
			approved_at = $1,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4`

	result, err := s.pool.Exec(ctx, query, now, now, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to approve evidence collection", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("EvidenceCollection", id.String())
	}

	// Recalculate readiness score for the parent audit
	var auditID uuid.UUID
	lookupQuery := `SELECT audit_id FROM evidence_collections WHERE id = $1`
	if err := s.pool.QueryRow(ctx, lookupQuery, id).Scan(&auditID); err == nil {
		if _, calcErr := s.CalculateReadinessScore(ctx, auditID); calcErr != nil {
			slog.ErrorContext(ctx, "failed to recalculate readiness score", "error", calcErr)
		}
	}

	changes, _ := json.Marshal(map[string]any{"status": "approved"})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "approve:evidence_collection",
		EntityType: "evidence_collection",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Readiness Score
// ──────────────────────────────────────────────

// CalculateReadinessScore calculates audit readiness based on approved/total evidence collections.
func (s *AuditMgmtService) CalculateReadinessScore(ctx context.Context, auditID uuid.UUID) (float64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return 0, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'approved') AS approved
		FROM evidence_collections
		WHERE audit_id = $1 AND tenant_id = $2`

	var total, approved int
	err := s.pool.QueryRow(ctx, query, auditID, auth.TenantID).Scan(&total, &approved)
	if err != nil {
		return 0, apperrors.Internal("failed to calculate readiness score", err)
	}

	var score float64
	if total > 0 {
		score = float64(approved) / float64(total) * 100.0
	}

	// Update the audit's readiness score
	updateQuery := `
		UPDATE grc_audits SET
			readiness_score = $1,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4`

	now := time.Now().UTC()
	if _, err := s.pool.Exec(ctx, updateQuery, score, now, auditID, auth.TenantID); err != nil {
		slog.ErrorContext(ctx, "failed to update readiness score on audit", "error", err)
	}

	return score, nil
}

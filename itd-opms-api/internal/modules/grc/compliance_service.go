package grc

import (
	"context"
	"encoding/json"
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
// ComplianceService
// ──────────────────────────────────────────────

// ComplianceService handles business logic for compliance controls and framework tracking.
type ComplianceService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewComplianceService creates a new ComplianceService.
func NewComplianceService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ComplianceService {
	return &ComplianceService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Compliance Controls
// ──────────────────────────────────────────────

// CreateControl creates a new compliance control.
func (s *ComplianceService) CreateControl(ctx context.Context, req CreateComplianceControlRequest) (ComplianceControl, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ComplianceControl{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()
	initialStatus := ComplianceStatusNotStarted

	query := `
		INSERT INTO compliance_controls (
			id, tenant_id, framework, control_id, control_name,
			description, implementation_status, evidence_refs,
			owner_id,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9,
			$10, $11
		)
		RETURNING id, tenant_id, framework, control_id, control_name,
			description, implementation_status, evidence_refs,
			owner_id, last_assessed_at,
			created_at, updated_at`

	var cc ComplianceControl
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Framework, req.ControlID, req.ControlName,
		req.Description, initialStatus, []uuid.UUID{},
		req.OwnerID,
		now, now,
	).Scan(
		&cc.ID, &cc.TenantID, &cc.Framework, &cc.ControlID, &cc.ControlName,
		&cc.Description, &cc.ImplementationStatus, &cc.EvidenceRefs,
		&cc.OwnerID, &cc.LastAssessedAt,
		&cc.CreatedAt, &cc.UpdatedAt,
	)
	if err != nil {
		return ComplianceControl{}, apperrors.Internal("failed to create compliance control", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"framework":  req.Framework,
		"controlId":  req.ControlID,
		"controlName": req.ControlName,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:compliance_control",
		EntityType: "compliance_control",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cc, nil
}

// GetControl retrieves a single compliance control by ID.
func (s *ComplianceService) GetControl(ctx context.Context, id uuid.UUID) (ComplianceControl, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ComplianceControl{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, framework, control_id, control_name,
			description, implementation_status, evidence_refs,
			owner_id, last_assessed_at,
			created_at, updated_at
		FROM compliance_controls
		WHERE id = $1 AND tenant_id = $2`

	var cc ComplianceControl
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&cc.ID, &cc.TenantID, &cc.Framework, &cc.ControlID, &cc.ControlName,
		&cc.Description, &cc.ImplementationStatus, &cc.EvidenceRefs,
		&cc.OwnerID, &cc.LastAssessedAt,
		&cc.CreatedAt, &cc.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ComplianceControl{}, apperrors.NotFound("ComplianceControl", id.String())
		}
		return ComplianceControl{}, apperrors.Internal("failed to get compliance control", err)
	}

	return cc, nil
}

// ListControls returns a filtered, paginated list of compliance controls.
func (s *ComplianceService) ListControls(ctx context.Context, framework, status *string, page, limit int) ([]ComplianceControl, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM compliance_controls
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR framework = $2)
			AND ($3::text IS NULL OR implementation_status = $3)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, framework, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count compliance controls", err)
	}

	dataQuery := `
		SELECT id, tenant_id, framework, control_id, control_name,
			description, implementation_status, evidence_refs,
			owner_id, last_assessed_at,
			created_at, updated_at
		FROM compliance_controls
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR framework = $2)
			AND ($3::text IS NULL OR implementation_status = $3)
		ORDER BY framework, control_id ASC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, framework, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list compliance controls", err)
	}
	defer rows.Close()

	var controls []ComplianceControl
	for rows.Next() {
		var cc ComplianceControl
		if err := rows.Scan(
			&cc.ID, &cc.TenantID, &cc.Framework, &cc.ControlID, &cc.ControlName,
			&cc.Description, &cc.ImplementationStatus, &cc.EvidenceRefs,
			&cc.OwnerID, &cc.LastAssessedAt,
			&cc.CreatedAt, &cc.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan compliance control", err)
		}
		controls = append(controls, cc)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate compliance controls", err)
	}

	if controls == nil {
		controls = []ComplianceControl{}
	}

	return controls, total, nil
}

// UpdateControl updates an existing compliance control using COALESCE partial update.
func (s *ComplianceService) UpdateControl(ctx context.Context, id uuid.UUID, req UpdateComplianceControlRequest) (ComplianceControl, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ComplianceControl{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetControl(ctx, id); err != nil {
		return ComplianceControl{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE compliance_controls SET
			control_name = COALESCE($1, control_name),
			description = COALESCE($2, description),
			implementation_status = COALESCE($3, implementation_status),
			evidence_refs = COALESCE($4, evidence_refs),
			owner_id = COALESCE($5, owner_id),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, framework, control_id, control_name,
			description, implementation_status, evidence_refs,
			owner_id, last_assessed_at,
			created_at, updated_at`

	var cc ComplianceControl
	err := s.pool.QueryRow(ctx, updateQuery,
		req.ControlName, req.Description, req.ImplementationStatus,
		req.EvidenceRefs, req.OwnerID,
		now, id, auth.TenantID,
	).Scan(
		&cc.ID, &cc.TenantID, &cc.Framework, &cc.ControlID, &cc.ControlName,
		&cc.Description, &cc.ImplementationStatus, &cc.EvidenceRefs,
		&cc.OwnerID, &cc.LastAssessedAt,
		&cc.CreatedAt, &cc.UpdatedAt,
	)
	if err != nil {
		return ComplianceControl{}, apperrors.Internal("failed to update compliance control", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:compliance_control",
		EntityType: "compliance_control",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cc, nil
}

// DeleteControl deletes a compliance control by ID.
func (s *ComplianceService) DeleteControl(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM compliance_controls WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete compliance control", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ComplianceControl", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:compliance_control",
		EntityType: "compliance_control",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Compliance Stats
// ──────────────────────────────────────────────

// GetComplianceStats returns compliance statistics grouped by framework.
func (s *ComplianceService) GetComplianceStats(ctx context.Context) ([]ComplianceStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			framework,
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE implementation_status = 'compliant') AS compliant_count
		FROM compliance_controls
		WHERE tenant_id = $1
		GROUP BY framework
		ORDER BY framework`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get compliance stats", err)
	}
	defer rows.Close()

	var stats []ComplianceStats
	for rows.Next() {
		var s ComplianceStats
		if err := rows.Scan(&s.Framework, &s.Total, &s.CompliantCount); err != nil {
			return nil, apperrors.Internal("failed to scan compliance stats", err)
		}
		stats = append(stats, s)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate compliance stats", err)
	}

	if stats == nil {
		stats = []ComplianceStats{}
	}

	return stats, nil
}

package reporting

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
// ReportService
// ──────────────────────────────────────────────

// ReportService handles business logic for report definitions and runs.
type ReportService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewReportService creates a new ReportService.
func NewReportService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ReportService {
	return &ReportService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Column lists & scan helpers
// ──────────────────────────────────────────────

const reportDefinitionColumns = `
	id, tenant_id, name, description, type,
	template, schedule_cron, recipients,
	is_active, created_by, created_at, updated_at`

func scanReportDefinition(row pgx.Row) (ReportDefinition, error) {
	var rd ReportDefinition
	err := row.Scan(
		&rd.ID, &rd.TenantID, &rd.Name, &rd.Description, &rd.Type,
		&rd.Template, &rd.ScheduleCron, &rd.Recipients,
		&rd.IsActive, &rd.CreatedBy, &rd.CreatedAt, &rd.UpdatedAt,
	)
	return rd, err
}

const reportRunColumns = `
	id, definition_id, tenant_id, status,
	generated_at, completed_at, document_id,
	data_snapshot, error_message, created_at`

func scanReportRun(row pgx.Row) (ReportRun, error) {
	var rr ReportRun
	err := row.Scan(
		&rr.ID, &rr.DefinitionID, &rr.TenantID, &rr.Status,
		&rr.GeneratedAt, &rr.CompletedAt, &rr.DocumentID,
		&rr.DataSnapshot, &rr.ErrorMessage, &rr.CreatedAt,
	)
	return rr, err
}

// ──────────────────────────────────────────────
// Report Definition CRUD
// ──────────────────────────────────────────────

// CreateDefinition creates a new report definition.
func (s *ReportService) CreateDefinition(ctx context.Context, req CreateReportDefinitionRequest) (ReportDefinition, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReportDefinition{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	template := req.Template
	if template == nil {
		template = json.RawMessage("{}")
	}

	recipients := req.Recipients
	if recipients == nil {
		recipients = []uuid.UUID{}
	}

	query := `
		INSERT INTO report_definitions (
			id, tenant_id, name, description, type,
			template, schedule_cron, recipients,
			is_active, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11, $12
		)
		RETURNING ` + reportDefinitionColumns

	rd, err := scanReportDefinition(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.Type,
		template, req.ScheduleCron, recipients,
		true, auth.UserID, now, now,
	))
	if err != nil {
		return ReportDefinition{}, apperrors.Internal("failed to create report definition", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name": req.Name,
		"type": req.Type,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:report_definition",
		EntityType: "report_definition",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return rd, nil
}

// GetDefinition retrieves a single report definition by ID.
func (s *ReportService) GetDefinition(ctx context.Context, id uuid.UUID) (ReportDefinition, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReportDefinition{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + reportDefinitionColumns + ` FROM report_definitions WHERE id = $1 AND tenant_id = $2`

	rd, err := scanReportDefinition(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return ReportDefinition{}, apperrors.NotFound("ReportDefinition", id.String())
		}
		return ReportDefinition{}, apperrors.Internal("failed to get report definition", err)
	}

	return rd, nil
}

// ListDefinitions returns a filtered, paginated list of report definitions.
func (s *ReportService) ListDefinitions(ctx context.Context, reportType *string, params types.PaginationParams) ([]ReportDefinition, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count.
	countQuery := `
		SELECT COUNT(*)
		FROM report_definitions
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR type = $2)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, reportType).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count report definitions", err)
	}

	// Data.
	dataQuery := `
		SELECT ` + reportDefinitionColumns + `
		FROM report_definitions
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR type = $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, reportType, params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list report definitions", err)
	}
	defer rows.Close()

	var defs []ReportDefinition
	for rows.Next() {
		var rd ReportDefinition
		if err := rows.Scan(
			&rd.ID, &rd.TenantID, &rd.Name, &rd.Description, &rd.Type,
			&rd.Template, &rd.ScheduleCron, &rd.Recipients,
			&rd.IsActive, &rd.CreatedBy, &rd.CreatedAt, &rd.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan report definition", err)
		}
		defs = append(defs, rd)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate report definitions", err)
	}

	if defs == nil {
		defs = []ReportDefinition{}
	}

	return defs, total, nil
}

// UpdateDefinition updates an existing report definition using COALESCE partial update.
func (s *ReportService) UpdateDefinition(ctx context.Context, id uuid.UUID, req UpdateReportDefinitionRequest) (ReportDefinition, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReportDefinition{}, apperrors.Unauthorized("authentication required")
	}

	// Verify exists.
	_, err := s.GetDefinition(ctx, id)
	if err != nil {
		return ReportDefinition{}, err
	}

	now := time.Now().UTC()

	query := `
		UPDATE report_definitions SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			type = COALESCE($3, type),
			template = COALESCE($4, template),
			schedule_cron = COALESCE($5, schedule_cron),
			recipients = COALESCE($6, recipients),
			is_active = COALESCE($7, is_active),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING ` + reportDefinitionColumns

	rd, err := scanReportDefinition(s.pool.QueryRow(ctx, query,
		req.Name, req.Description, req.Type,
		req.Template, req.ScheduleCron, req.Recipients,
		req.IsActive, now, id, auth.TenantID,
	))
	if err != nil {
		return ReportDefinition{}, apperrors.Internal("failed to update report definition", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:report_definition",
		EntityType: "report_definition",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return rd, nil
}

// DeleteDefinition soft-deletes a report definition.
func (s *ReportService) DeleteDefinition(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM report_definitions
		WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete report definition", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ReportDefinition", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:report_definition",
		EntityType: "report_definition",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Report Runs
// ──────────────────────────────────────────────

// TriggerReportRun creates a new report run with pending status and captures a data snapshot.
func (s *ReportService) TriggerReportRun(ctx context.Context, definitionID uuid.UUID) (ReportRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReportRun{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the definition exists.
	_, err := s.GetDefinition(ctx, definitionID)
	if err != nil {
		return ReportRun{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Capture a data snapshot from the executive summary (best-effort).
	var snapshot json.RawMessage
	snapshotQuery := `
		SELECT row_to_json(t) FROM (
			SELECT * FROM mv_executive_summary WHERE tenant_id = $1
		) t`

	var snapshotBytes []byte
	err = s.pool.QueryRow(ctx, snapshotQuery, auth.TenantID).Scan(&snapshotBytes)
	if err != nil {
		// If the view doesn't exist or has no data, use an empty object.
		snapshot = json.RawMessage("{}")
	} else {
		snapshot = snapshotBytes
	}

	query := `
		INSERT INTO report_runs (
			id, definition_id, tenant_id, status,
			generated_at, data_snapshot, created_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7
		)
		RETURNING ` + reportRunColumns

	rr, err := scanReportRun(s.pool.QueryRow(ctx, query,
		id, definitionID, auth.TenantID, RunStatusPending,
		now, snapshot, now,
	))
	if err != nil {
		return ReportRun{}, apperrors.Internal("failed to trigger report run", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"definition_id": definitionID,
		"status":        RunStatusPending,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "trigger:report_run",
		EntityType: "report_run",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return rr, nil
}

// GetReportRun retrieves a single report run by ID.
func (s *ReportService) GetReportRun(ctx context.Context, id uuid.UUID) (ReportRun, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReportRun{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + reportRunColumns + ` FROM report_runs WHERE id = $1 AND tenant_id = $2`

	rr, err := scanReportRun(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return ReportRun{}, apperrors.NotFound("ReportRun", id.String())
		}
		return ReportRun{}, apperrors.Internal("failed to get report run", err)
	}

	return rr, nil
}

// ListReportRuns returns a filtered, paginated list of report runs for a definition.
func (s *ReportService) ListReportRuns(ctx context.Context, definitionID uuid.UUID, status *string, params types.PaginationParams) ([]ReportRun, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count.
	countQuery := `
		SELECT COUNT(*)
		FROM report_runs
		WHERE tenant_id = $1
			AND definition_id = $2
			AND ($3::text IS NULL OR status = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, definitionID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count report runs", err)
	}

	// Data.
	dataQuery := `
		SELECT ` + reportRunColumns + `
		FROM report_runs
		WHERE tenant_id = $1
			AND definition_id = $2
			AND ($3::text IS NULL OR status = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, definitionID, status, params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list report runs", err)
	}
	defer rows.Close()

	var runs []ReportRun
	for rows.Next() {
		var rr ReportRun
		if err := rows.Scan(
			&rr.ID, &rr.DefinitionID, &rr.TenantID, &rr.Status,
			&rr.GeneratedAt, &rr.CompletedAt, &rr.DocumentID,
			&rr.DataSnapshot, &rr.ErrorMessage, &rr.CreatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan report run", err)
		}
		runs = append(runs, rr)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate report runs", err)
	}

	if runs == nil {
		runs = []ReportRun{}
	}

	return runs, total, nil
}

// CompleteReportRun marks a report run as completed with a document ID and data snapshot.
func (s *ReportService) CompleteReportRun(ctx context.Context, id uuid.UUID, documentID *uuid.UUID, data json.RawMessage) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	result, err := s.pool.Exec(ctx, `
		UPDATE report_runs SET
			status = $1,
			completed_at = $2,
			document_id = $3,
			data_snapshot = COALESCE($4, data_snapshot)
		WHERE id = $5 AND tenant_id = $6`,
		RunStatusCompleted, now, documentID, data, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to complete report run", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ReportRun", id.String())
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"status":      RunStatusCompleted,
		"document_id": documentID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "complete:report_run",
		EntityType: "report_run",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

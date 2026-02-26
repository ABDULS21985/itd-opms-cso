package governance

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
)

// RACIService handles business logic for RACI matrix management.
type RACIService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewRACIService creates a new RACIService.
func NewRACIService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *RACIService {
	return &RACIService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// CreateMatrix creates a new RACI matrix.
func (s *RACIService) CreateMatrix(ctx context.Context, tenantID, createdBy uuid.UUID, req CreateRACIMatrixRequest) (*RACIMatrix, error) {
	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO raci_matrices (
			id, tenant_id, title, entity_type, entity_id,
			description, status, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, tenant_id, title, entity_type, entity_id,
			description, status, created_by, created_at, updated_at`

	var m RACIMatrix
	err := s.pool.QueryRow(ctx, query,
		id, tenantID, req.Title, req.EntityType, req.EntityID,
		req.Description, "draft", createdBy, now, now,
	).Scan(
		&m.ID, &m.TenantID, &m.Title, &m.EntityType, &m.EntityID,
		&m.Description, &m.Status, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create RACI matrix", err)
	}

	m.Entries = []RACIEntry{}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":       req.Title,
		"entity_type": req.EntityType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    createdBy,
		Action:     "raci_matrix.created",
		EntityType: "raci_matrix",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &m, nil
}

// GetMatrix retrieves a RACI matrix by ID, including its entries.
func (s *RACIService) GetMatrix(ctx context.Context, tenantID, matrixID uuid.UUID) (*RACIMatrix, error) {
	query := `
		SELECT id, tenant_id, title, entity_type, entity_id,
			description, status, created_by, created_at, updated_at
		FROM raci_matrices
		WHERE id = $1 AND tenant_id = $2`

	var m RACIMatrix
	err := s.pool.QueryRow(ctx, query, matrixID, tenantID).Scan(
		&m.ID, &m.TenantID, &m.Title, &m.EntityType, &m.EntityID,
		&m.Description, &m.Status, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("RACIMatrix", matrixID.String())
		}
		return nil, apperrors.Internal("failed to get RACI matrix", err)
	}

	// Fetch entries for this matrix.
	entriesQuery := `
		SELECT id, matrix_id, activity, responsible_ids, accountable_id,
			consulted_ids, informed_ids, notes
		FROM raci_entries
		WHERE matrix_id = $1
		ORDER BY activity`

	rows, err := s.pool.Query(ctx, entriesQuery, matrixID)
	if err != nil {
		return nil, apperrors.Internal("failed to query RACI entries", err)
	}
	defer rows.Close()

	var entries []RACIEntry
	for rows.Next() {
		var e RACIEntry
		if err := rows.Scan(
			&e.ID, &e.MatrixID, &e.Activity, &e.ResponsibleIDs, &e.AccountableID,
			&e.ConsultedIDs, &e.InformedIDs, &e.Notes,
		); err != nil {
			return nil, apperrors.Internal("failed to scan RACI entry", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate RACI entries", err)
	}

	if entries == nil {
		entries = []RACIEntry{}
	}
	m.Entries = entries

	return &m, nil
}

// ListMatrices returns a paginated list of RACI matrices (without entries).
func (s *RACIService) ListMatrices(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]RACIMatrix, int64, error) {
	countQuery := `SELECT COUNT(*) FROM raci_matrices WHERE tenant_id = $1`
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, tenantID).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count RACI matrices", err)
	}

	dataQuery := `
		SELECT id, tenant_id, title, entity_type, entity_id,
			description, status, created_by, created_at, updated_at
		FROM raci_matrices
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := s.pool.Query(ctx, dataQuery, tenantID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list RACI matrices", err)
	}
	defer rows.Close()

	var matrices []RACIMatrix
	for rows.Next() {
		var m RACIMatrix
		if err := rows.Scan(
			&m.ID, &m.TenantID, &m.Title, &m.EntityType, &m.EntityID,
			&m.Description, &m.Status, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan RACI matrix", err)
		}
		m.Entries = []RACIEntry{}
		matrices = append(matrices, m)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate RACI matrices", err)
	}

	if matrices == nil {
		matrices = []RACIMatrix{}
	}

	return matrices, total, nil
}

// UpdateMatrix updates an existing RACI matrix.
func (s *RACIService) UpdateMatrix(ctx context.Context, tenantID, matrixID uuid.UUID, req CreateRACIMatrixRequest) (*RACIMatrix, error) {
	query := `
		UPDATE raci_matrices SET
			title = $1, description = $2, entity_type = $3, entity_id = $4,
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7
		RETURNING id, tenant_id, title, entity_type, entity_id,
			description, status, created_by, created_at, updated_at`

	now := time.Now().UTC()
	var m RACIMatrix
	err := s.pool.QueryRow(ctx, query,
		req.Title, req.Description, req.EntityType, req.EntityID,
		now, matrixID, tenantID,
	).Scan(
		&m.ID, &m.TenantID, &m.Title, &m.EntityType, &m.EntityID,
		&m.Description, &m.Status, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("RACIMatrix", matrixID.String())
		}
		return nil, apperrors.Internal("failed to update RACI matrix", err)
	}

	m.Entries = []RACIEntry{}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":       req.Title,
		"entity_type": req.EntityType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		ActorID:    m.CreatedBy,
		Action:     "raci_matrix.updated",
		EntityType: "raci_matrix",
		EntityID:   matrixID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &m, nil
}

// DeleteMatrix deletes a RACI matrix. ON DELETE CASCADE handles its entries.
func (s *RACIService) DeleteMatrix(ctx context.Context, tenantID, matrixID uuid.UUID) error {
	query := `DELETE FROM raci_matrices WHERE id = $1 AND tenant_id = $2`
	result, err := s.pool.Exec(ctx, query, matrixID, tenantID)
	if err != nil {
		return apperrors.Internal("failed to delete RACI matrix", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("RACIMatrix", matrixID.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   tenantID,
		Action:     "raci_matrix.deleted",
		EntityType: "raci_matrix",
		EntityID:   matrixID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// AddEntry adds a new entry to a RACI matrix.
func (s *RACIService) AddEntry(ctx context.Context, matrixID uuid.UUID, req CreateRACIEntryRequest) (*RACIEntry, error) {
	id := uuid.New()

	query := `
		INSERT INTO raci_entries (
			id, matrix_id, activity, responsible_ids, accountable_id,
			consulted_ids, informed_ids, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, matrix_id, activity, responsible_ids, accountable_id,
			consulted_ids, informed_ids, notes`

	var e RACIEntry
	err := s.pool.QueryRow(ctx, query,
		id, matrixID, req.Activity, req.ResponsibleIDs, req.AccountableID,
		req.ConsultedIDs, req.InformedIDs, req.Notes,
	).Scan(
		&e.ID, &e.MatrixID, &e.Activity, &e.ResponsibleIDs, &e.AccountableID,
		&e.ConsultedIDs, &e.InformedIDs, &e.Notes,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to add RACI entry", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"activity":  req.Activity,
		"matrix_id": matrixID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		Action:     "raci_entry.created",
		EntityType: "raci_entry",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &e, nil
}

// UpdateEntry updates an existing RACI entry.
func (s *RACIService) UpdateEntry(ctx context.Context, entryID uuid.UUID, req UpdateRACIEntryRequest) (*RACIEntry, error) {
	query := `
		UPDATE raci_entries SET
			activity = COALESCE($1, activity),
			responsible_ids = COALESCE($2, responsible_ids),
			accountable_id = COALESCE($3, accountable_id),
			consulted_ids = COALESCE($4, consulted_ids),
			informed_ids = COALESCE($5, informed_ids),
			notes = COALESCE($6, notes)
		WHERE id = $7
		RETURNING id, matrix_id, activity, responsible_ids, accountable_id,
			consulted_ids, informed_ids, notes`

	var e RACIEntry
	err := s.pool.QueryRow(ctx, query,
		req.Activity, req.ResponsibleIDs, req.AccountableID,
		req.ConsultedIDs, req.InformedIDs, req.Notes,
		entryID,
	).Scan(
		&e.ID, &e.MatrixID, &e.Activity, &e.ResponsibleIDs, &e.AccountableID,
		&e.ConsultedIDs, &e.InformedIDs, &e.Notes,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("RACIEntry", entryID.String())
		}
		return nil, apperrors.Internal("failed to update RACI entry", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"entry_id": entryID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		Action:     "raci_entry.updated",
		EntityType: "raci_entry",
		EntityID:   entryID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &e, nil
}

// DeleteEntry deletes a RACI entry.
func (s *RACIService) DeleteEntry(ctx context.Context, entryID uuid.UUID) error {
	query := `DELETE FROM raci_entries WHERE id = $1`
	result, err := s.pool.Exec(ctx, query, entryID)
	if err != nil {
		return apperrors.Internal("failed to delete RACI entry", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("RACIEntry", entryID.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		Action:     "raci_entry.deleted",
		EntityType: "raci_entry",
		EntityID:   entryID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// GetCoverageReport returns a coverage report for a RACI matrix, including total
// activities, how many have empty responsible_ids, and overall coverage percentage.
func (s *RACIService) GetCoverageReport(ctx context.Context, matrixID uuid.UUID) (map[string]any, error) {
	query := `
		SELECT
			COUNT(*) AS total_activities,
			COUNT(*) FILTER (WHERE cardinality(responsible_ids) = 0) AS unassigned_activities
		FROM raci_entries
		WHERE matrix_id = $1`

	var totalActivities, unassignedActivities int64
	err := s.pool.QueryRow(ctx, query, matrixID).Scan(&totalActivities, &unassignedActivities)
	if err != nil {
		return nil, apperrors.Internal("failed to get coverage report", err)
	}

	var coveragePct float64
	if totalActivities > 0 {
		coveragePct = float64(totalActivities-unassignedActivities) / float64(totalActivities) * 100.0
	}

	report := map[string]any{
		"matrixId":              matrixID,
		"totalActivities":      totalActivities,
		"assignedActivities":   totalActivities - unassignedActivities,
		"unassignedActivities": unassignedActivities,
		"coveragePct":          coveragePct,
	}

	return report, nil
}

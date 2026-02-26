package people

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
// TrainingService
// ──────────────────────────────────────────────

// TrainingService handles business logic for training records and certification tracking.
type TrainingService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewTrainingService creates a new TrainingService.
func NewTrainingService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *TrainingService {
	return &TrainingService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Training Records
// ──────────────────────────────────────────────

// CreateTrainingRecord creates a new training record.
func (s *TrainingService) CreateTrainingRecord(ctx context.Context, req CreateTrainingRecordRequest) (TrainingRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return TrainingRecord{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	status := TrainingStatusPlanned
	// Status is not in CreateTrainingRecordRequest per types.go, so use default.

	query := `
		INSERT INTO training_records (
			id, tenant_id, user_id, title, provider,
			type, status, expiry_date, cost,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11
		)
		RETURNING id, tenant_id, user_id, title, provider,
			type, status, completed_at, expiry_date,
			certificate_doc_id, cost, created_at, updated_at`

	var tr TrainingRecord
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.UserID, req.Title, req.Provider,
		req.Type, status, req.ExpiryDate, req.Cost,
		now, now,
	).Scan(
		&tr.ID, &tr.TenantID, &tr.UserID, &tr.Title, &tr.Provider,
		&tr.Type, &tr.Status, &tr.CompletedAt, &tr.ExpiryDate,
		&tr.CertificateDocID, &tr.Cost, &tr.CreatedAt, &tr.UpdatedAt,
	)
	if err != nil {
		return TrainingRecord{}, apperrors.Internal("failed to create training record", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"userId": req.UserID,
		"title":  req.Title,
		"type":   req.Type,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:training_record",
		EntityType: "training_record",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return tr, nil
}

// GetTrainingRecord retrieves a single training record by ID.
func (s *TrainingService) GetTrainingRecord(ctx context.Context, id uuid.UUID) (TrainingRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return TrainingRecord{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, user_id, title, provider,
			type, status, completed_at, expiry_date,
			certificate_doc_id, cost, created_at, updated_at
		FROM training_records
		WHERE id = $1 AND tenant_id = $2`

	var tr TrainingRecord
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&tr.ID, &tr.TenantID, &tr.UserID, &tr.Title, &tr.Provider,
		&tr.Type, &tr.Status, &tr.CompletedAt, &tr.ExpiryDate,
		&tr.CertificateDocID, &tr.Cost, &tr.CreatedAt, &tr.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return TrainingRecord{}, apperrors.NotFound("TrainingRecord", id.String())
		}
		return TrainingRecord{}, apperrors.Internal("failed to get training record", err)
	}

	return tr, nil
}

// ListTrainingRecords returns a filtered, paginated list of training records.
func (s *TrainingService) ListTrainingRecords(ctx context.Context, userID *uuid.UUID, trainingType, status *string, page, limit int) ([]TrainingRecord, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM training_records
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR user_id = $2)
			AND ($3::text IS NULL OR type = $3)
			AND ($4::text IS NULL OR status = $4)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, userID, trainingType, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count training records", err)
	}

	dataQuery := `
		SELECT id, tenant_id, user_id, title, provider,
			type, status, completed_at, expiry_date,
			certificate_doc_id, cost, created_at, updated_at
		FROM training_records
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR user_id = $2)
			AND ($3::text IS NULL OR type = $3)
			AND ($4::text IS NULL OR status = $4)
		ORDER BY created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, userID, trainingType, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list training records", err)
	}
	defer rows.Close()

	var records []TrainingRecord
	for rows.Next() {
		var tr TrainingRecord
		if err := rows.Scan(
			&tr.ID, &tr.TenantID, &tr.UserID, &tr.Title, &tr.Provider,
			&tr.Type, &tr.Status, &tr.CompletedAt, &tr.ExpiryDate,
			&tr.CertificateDocID, &tr.Cost, &tr.CreatedAt, &tr.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan training record", err)
		}
		records = append(records, tr)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate training records", err)
	}

	if records == nil {
		records = []TrainingRecord{}
	}

	return records, total, nil
}

// UpdateTrainingRecord updates a training record using COALESCE partial update.
func (s *TrainingService) UpdateTrainingRecord(ctx context.Context, id uuid.UUID, req UpdateTrainingRecordRequest) (TrainingRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return TrainingRecord{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetTrainingRecord(ctx, id); err != nil {
		return TrainingRecord{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE training_records SET
			title = COALESCE($1, title),
			provider = COALESCE($2, provider),
			type = COALESCE($3, type),
			status = COALESCE($4, status),
			completed_at = COALESCE($5, completed_at),
			expiry_date = COALESCE($6, expiry_date),
			certificate_doc_id = COALESCE($7, certificate_doc_id),
			cost = COALESCE($8, cost),
			updated_at = $9
		WHERE id = $10 AND tenant_id = $11
		RETURNING id, tenant_id, user_id, title, provider,
			type, status, completed_at, expiry_date,
			certificate_doc_id, cost, created_at, updated_at`

	var tr TrainingRecord
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Provider, req.Type,
		req.Status, req.CompletedAt, req.ExpiryDate,
		req.CertificateDocID, req.Cost,
		now, id, auth.TenantID,
	).Scan(
		&tr.ID, &tr.TenantID, &tr.UserID, &tr.Title, &tr.Provider,
		&tr.Type, &tr.Status, &tr.CompletedAt, &tr.ExpiryDate,
		&tr.CertificateDocID, &tr.Cost, &tr.CreatedAt, &tr.UpdatedAt,
	)
	if err != nil {
		return TrainingRecord{}, apperrors.Internal("failed to update training record", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:training_record",
		EntityType: "training_record",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return tr, nil
}

// DeleteTrainingRecord deletes a training record by ID.
func (s *TrainingService) DeleteTrainingRecord(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM training_records WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete training record", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("TrainingRecord", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:training_record",
		EntityType: "training_record",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// GetExpiringCertifications returns training records with certifications expiring within the given number of days.
func (s *TrainingService) GetExpiringCertifications(ctx context.Context, days int) ([]TrainingRecord, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, user_id, title, provider,
			type, status, completed_at, expiry_date,
			certificate_doc_id, cost, created_at, updated_at
		FROM training_records
		WHERE tenant_id = $1
			AND expiry_date IS NOT NULL
			AND expiry_date <= CURRENT_DATE + ($2 || ' days')::interval
			AND expiry_date >= CURRENT_DATE
			AND status != 'expired'
		ORDER BY expiry_date ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, days)
	if err != nil {
		return nil, apperrors.Internal("failed to get expiring certifications", err)
	}
	defer rows.Close()

	var records []TrainingRecord
	for rows.Next() {
		var tr TrainingRecord
		if err := rows.Scan(
			&tr.ID, &tr.TenantID, &tr.UserID, &tr.Title, &tr.Provider,
			&tr.Type, &tr.Status, &tr.CompletedAt, &tr.ExpiryDate,
			&tr.CertificateDocID, &tr.Cost, &tr.CreatedAt, &tr.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan expiring certification", err)
		}
		records = append(records, tr)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate expiring certifications", err)
	}

	if records == nil {
		records = []TrainingRecord{}
	}

	return records, nil
}

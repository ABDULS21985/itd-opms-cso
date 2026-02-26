package itsm

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
// QueueService
// ──────────────────────────────────────────────

// QueueService handles business logic for support queue management.
type QueueService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewQueueService creates a new QueueService.
func NewQueueService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *QueueService {
	return &QueueService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Support Queues
// ──────────────────────────────────────────────

// CreateQueue creates a new support queue.
func (s *QueueService) CreateQueue(ctx context.Context, req CreateSupportQueueRequest) (SupportQueue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SupportQueue{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	autoAssignRule := "round_robin"
	if req.AutoAssignRule != nil {
		autoAssignRule = *req.AutoAssignRule
	}

	priorityFilter := req.PriorityFilter
	if priorityFilter == nil {
		priorityFilter = []string{}
	}

	query := `
		INSERT INTO support_queues (
			id, tenant_id, name, team_id,
			priority_filter, auto_assign_rule, is_active,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, true,
			$7, $8
		)
		RETURNING id, tenant_id, name, team_id,
			priority_filter, auto_assign_rule, is_active,
			created_at, updated_at`

	var q SupportQueue
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.TeamID,
		priorityFilter, autoAssignRule,
		now, now,
	).Scan(
		&q.ID, &q.TenantID, &q.Name, &q.TeamID,
		&q.PriorityFilter, &q.AutoAssignRule, &q.IsActive,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return SupportQueue{}, apperrors.Internal("failed to create support queue", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":             req.Name,
		"auto_assign_rule": autoAssignRule,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:support_queue",
		EntityType: "support_queue",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return q, nil
}

// GetQueue retrieves a single support queue by ID.
func (s *QueueService) GetQueue(ctx context.Context, id uuid.UUID) (SupportQueue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SupportQueue{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, team_id,
			priority_filter, auto_assign_rule, is_active,
			created_at, updated_at
		FROM support_queues
		WHERE id = $1 AND tenant_id = $2`

	var q SupportQueue
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&q.ID, &q.TenantID, &q.Name, &q.TeamID,
		&q.PriorityFilter, &q.AutoAssignRule, &q.IsActive,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return SupportQueue{}, apperrors.NotFound("SupportQueue", id.String())
		}
		return SupportQueue{}, apperrors.Internal("failed to get support queue", err)
	}

	return q, nil
}

// ListQueues returns support queues, optionally filtered by active status.
func (s *QueueService) ListQueues(ctx context.Context, isActive *bool) ([]SupportQueue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, team_id,
			priority_filter, auto_assign_rule, is_active,
			created_at, updated_at
		FROM support_queues
		WHERE tenant_id = $1
			AND ($2::boolean IS NULL OR is_active = $2)
		ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, isActive)
	if err != nil {
		return nil, apperrors.Internal("failed to list support queues", err)
	}
	defer rows.Close()

	var queues []SupportQueue
	for rows.Next() {
		var q SupportQueue
		if err := rows.Scan(
			&q.ID, &q.TenantID, &q.Name, &q.TeamID,
			&q.PriorityFilter, &q.AutoAssignRule, &q.IsActive,
			&q.CreatedAt, &q.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan support queue", err)
		}
		queues = append(queues, q)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate support queues", err)
	}

	if queues == nil {
		queues = []SupportQueue{}
	}

	return queues, nil
}

// UpdateQueue updates an existing support queue using COALESCE partial update.
func (s *QueueService) UpdateQueue(ctx context.Context, id uuid.UUID, req UpdateSupportQueueRequest) (SupportQueue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SupportQueue{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the queue exists and belongs to the tenant.
	_, err := s.GetQueue(ctx, id)
	if err != nil {
		return SupportQueue{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE support_queues SET
			name = COALESCE($1, name),
			team_id = COALESCE($2, team_id),
			priority_filter = COALESCE($3, priority_filter),
			auto_assign_rule = COALESCE($4, auto_assign_rule),
			is_active = COALESCE($5, is_active),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, name, team_id,
			priority_filter, auto_assign_rule, is_active,
			created_at, updated_at`

	var q SupportQueue
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.TeamID, req.PriorityFilter,
		req.AutoAssignRule, req.IsActive,
		now, id, auth.TenantID,
	).Scan(
		&q.ID, &q.TenantID, &q.Name, &q.TeamID,
		&q.PriorityFilter, &q.AutoAssignRule, &q.IsActive,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return SupportQueue{}, apperrors.Internal("failed to update support queue", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:support_queue",
		EntityType: "support_queue",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return q, nil
}

// DeleteQueue deletes a support queue by ID.
func (s *QueueService) DeleteQueue(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM support_queues WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete support queue", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("SupportQueue", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:support_queue",
		EntityType: "support_queue",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

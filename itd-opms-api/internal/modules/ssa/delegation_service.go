package ssa

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// DelegationService handles business logic for SSA delegation management.
type DelegationService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewDelegationService creates a new DelegationService.
func NewDelegationService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *DelegationService {
	return &DelegationService{pool: pool, auditSvc: auditSvc}
}

const delegationColumns = `id, tenant_id, delegator_id, delegate_id, stage, effective_from, effective_to, is_active, reason, created_at, updated_at`

func scanDelegation(row pgx.Row) (Delegation, error) {
	var d Delegation
	err := row.Scan(
		&d.ID, &d.TenantID, &d.DelegatorID, &d.DelegateID, &d.Stage,
		&d.EffectiveFrom, &d.EffectiveTo, &d.IsActive, &d.Reason,
		&d.CreatedAt, &d.UpdatedAt,
	)
	return d, err
}

func scanDelegations(rows pgx.Rows) ([]Delegation, error) {
	var delegations []Delegation
	for rows.Next() {
		var d Delegation
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.DelegatorID, &d.DelegateID, &d.Stage,
			&d.EffectiveFrom, &d.EffectiveTo, &d.IsActive, &d.Reason,
			&d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, err
		}
		delegations = append(delegations, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if delegations == nil {
		delegations = []Delegation{}
	}
	return delegations, nil
}

// ListDelegations returns all active delegations for the tenant.
func (s *DelegationService) ListDelegations(ctx context.Context) ([]Delegation, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + delegationColumns + `
		FROM ssa_delegations
		WHERE tenant_id = $1
		ORDER BY created_at DESC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list delegations", err)
	}
	defer rows.Close()

	return scanDelegations(rows)
}

// CreateDelegation creates a new delegation record.
func (s *DelegationService) CreateDelegation(ctx context.Context, dto CreateDelegationDTO) (Delegation, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Delegation{}, apperrors.Unauthorized("authentication required")
	}

	if dto.EffectiveTo.Before(dto.EffectiveFrom) {
		return Delegation{}, apperrors.BadRequest("effective_to must be after effective_from")
	}

	// Compare dates only (truncate to midnight) so that selecting "today"
	// is not rejected when the frontend sends T00:00:00Z and it's already
	// past midnight UTC.
	todayUTC := time.Now().UTC().Truncate(24 * time.Hour)
	if dto.EffectiveFrom.Truncate(24 * time.Hour).Before(todayUTC) {
		return Delegation{}, apperrors.BadRequest("effective_from must not be in the past")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `INSERT INTO ssa_delegations (
		id, tenant_id, delegator_id, delegate_id, stage,
		effective_from, effective_to, is_active, reason,
		created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10)
	RETURNING ` + delegationColumns

	delegation, err := scanDelegation(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, auth.UserID, dto.DelegateID, dto.Stage,
		dto.EffectiveFrom, dto.EffectiveTo, dto.Reason,
		now, now,
	))
	if err != nil {
		return Delegation{}, apperrors.Internal("failed to create delegation", err)
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:ssa_delegation",
		EntityType: "ssa_delegation",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return delegation, nil
}

// DeleteDelegation deactivates a delegation.
func (s *DelegationService) DeleteDelegation(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx,
		`UPDATE ssa_delegations SET is_active = FALSE, updated_at = NOW()
		 WHERE id = $1 AND tenant_id = $2 AND delegator_id = $3`,
		id, auth.TenantID, auth.UserID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete delegation", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("delegation", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:ssa_delegation",
		EntityType: "ssa_delegation",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

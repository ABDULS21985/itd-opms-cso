package system

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ReferenceService manages tenant-scoped reference data used by modules.
type ReferenceService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

func NewReferenceService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ReferenceService {
	return &ReferenceService{pool: pool, auditSvc: auditSvc}
}

func scanReferenceData(row pgx.Row) (ReferenceData, error) {
	var rd ReferenceData
	err := row.Scan(
		&rd.ID, &rd.TenantID, &rd.Domain, &rd.Key, &rd.Label,
		&rd.Value, &rd.SortOrder, &rd.IsActive, &rd.CreatedAt, &rd.UpdatedAt,
	)
	return rd, err
}

func (s *ReferenceService) List(ctx context.Context, domain string, includeInactive bool) ([]ReferenceData, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, domain, key, label, value, sort_order, is_active, created_at, updated_at
		FROM reference_data
		WHERE (tenant_id = $1 OR tenant_id IS NULL)
		  AND ($2::text = '' OR domain = $2)
		  AND ($3::bool = true OR is_active = true)
		ORDER BY domain ASC, sort_order ASC, label ASC`,
		auth.TenantID, domain, includeInactive,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list reference data", err)
	}
	defer rows.Close()

	items := []ReferenceData{}
	for rows.Next() {
		item, err := scanReferenceData(rows)
		if err != nil {
			return nil, apperrors.Internal("failed to scan reference data", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate reference data", err)
	}
	return items, nil
}

func (s *ReferenceService) Create(ctx context.Context, req CreateReferenceDataRequest) (ReferenceData, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReferenceData{}, apperrors.Unauthorized("authentication required")
	}
	if req.Domain == "" || req.Key == "" || req.Label == "" {
		return ReferenceData{}, apperrors.BadRequest("domain, key, and label are required")
	}

	value := req.Value
	if value == nil {
		value = json.RawMessage("{}")
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	item, err := scanReferenceData(s.pool.QueryRow(ctx, `
		INSERT INTO reference_data (tenant_id, domain, key, label, value, sort_order, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (tenant_id, domain, key)
		DO UPDATE SET label = EXCLUDED.label,
			value = EXCLUDED.value,
			sort_order = EXCLUDED.sort_order,
			is_active = EXCLUDED.is_active,
			updated_at = NOW()
		RETURNING id, tenant_id, domain, key, label, value, sort_order, is_active, created_at, updated_at`,
		auth.TenantID, req.Domain, req.Key, req.Label, value, sortOrder, isActive,
	))
	if err != nil {
		return ReferenceData{}, apperrors.Internal("failed to create reference data", err)
	}

	s.log(ctx, auth, "create:reference_data", item.ID, req)
	return item, nil
}

func (s *ReferenceService) Update(ctx context.Context, id uuid.UUID, req UpdateReferenceDataRequest) (ReferenceData, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ReferenceData{}, apperrors.Unauthorized("authentication required")
	}

	item, err := scanReferenceData(s.pool.QueryRow(ctx, `
		UPDATE reference_data
		SET label = COALESCE($1, label),
			value = COALESCE($2, value),
			sort_order = COALESCE($3, sort_order),
			is_active = COALESCE($4, is_active),
			updated_at = NOW()
		WHERE id = $5 AND tenant_id = $6
		RETURNING id, tenant_id, domain, key, label, value, sort_order, is_active, created_at, updated_at`,
		req.Label, req.Value, req.SortOrder, req.IsActive, id, auth.TenantID,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return ReferenceData{}, apperrors.NotFound("ReferenceData", id.String())
		}
		return ReferenceData{}, apperrors.Internal("failed to update reference data", err)
	}

	s.log(ctx, auth, "update:reference_data", id, req)
	return item, nil
}

func (s *ReferenceService) Deactivate(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tag, err := s.pool.Exec(ctx,
		`UPDATE reference_data SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to deactivate reference data", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("ReferenceData", id.String())
	}

	s.log(ctx, auth, "deactivate:reference_data", id, nil)
	return nil
}

func (s *ReferenceService) log(ctx context.Context, auth *types.AuthContext, action string, entityID uuid.UUID, changes any) {
	if s.auditSvc == nil {
		return
	}
	payload, _ := json.Marshal(changes)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     action,
		EntityType: "reference_data",
		EntityID:   entityID,
		Changes:    payload,
	})
}

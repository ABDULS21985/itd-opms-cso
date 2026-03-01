package cmdb

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
// WarrantyService
// ──────────────────────────────────────────────

// WarrantyService handles business logic for warranties, and renewal alerts.
type WarrantyService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewWarrantyService creates a new WarrantyService.
func NewWarrantyService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *WarrantyService {
	return &WarrantyService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// warrantyColumns is the canonical column list for the warranties table.
const warrantyColumns = `
	id, asset_id, tenant_id, vendor, contract_number,
	coverage_type, start_date, end_date, cost,
	renewal_status, created_at, updated_at`

// scanWarranty scans a single warranty row into a Warranty struct.
func scanWarranty(row pgx.Row) (Warranty, error) {
	var w Warranty
	err := row.Scan(
		&w.ID, &w.AssetID, &w.TenantID, &w.Vendor, &w.ContractNumber,
		&w.CoverageType, &w.StartDate, &w.EndDate, &w.Cost,
		&w.RenewalStatus, &w.CreatedAt, &w.UpdatedAt,
	)
	return w, err
}

// scanWarranties scans multiple warranty rows into a slice.
func scanWarranties(rows pgx.Rows) ([]Warranty, error) {
	var warranties []Warranty
	for rows.Next() {
		var w Warranty
		if err := rows.Scan(
			&w.ID, &w.AssetID, &w.TenantID, &w.Vendor, &w.ContractNumber,
			&w.CoverageType, &w.StartDate, &w.EndDate, &w.Cost,
			&w.RenewalStatus, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, err
		}
		warranties = append(warranties, w)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if warranties == nil {
		warranties = []Warranty{}
	}
	return warranties, nil
}

// ──────────────────────────────────────────────
// Warranty CRUD
// ──────────────────────────────────────────────

// CreateWarranty creates a new warranty record.
func (s *WarrantyService) CreateWarranty(ctx context.Context, req CreateWarrantyRequest) (Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Warranty{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	renewalStatus := WarrantyRenewalStatusActive
	if req.RenewalStatus != nil {
		renewalStatus = *req.RenewalStatus
	}

	query := `
		INSERT INTO warranties (
			id, asset_id, tenant_id, vendor, contract_number,
			coverage_type, start_date, end_date, cost,
			renewal_status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12
		)
		RETURNING ` + warrantyColumns

	warranty, err := scanWarranty(s.pool.QueryRow(ctx, query,
		id, req.AssetID, auth.TenantID, req.Vendor, req.ContractNumber,
		req.CoverageType, req.StartDate, req.EndDate, req.Cost,
		renewalStatus, now, now,
	))
	if err != nil {
		return Warranty{}, apperrors.Internal("failed to create warranty", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"asset_id": req.AssetID,
		"vendor":   req.Vendor,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:warranty",
		EntityType: "warranty",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return warranty, nil
}

// GetWarranty retrieves a single warranty by ID.
func (s *WarrantyService) GetWarranty(ctx context.Context, id uuid.UUID) (Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Warranty{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + warrantyColumns + ` FROM warranties WHERE id = $1 AND tenant_id = $2`

	warranty, err := scanWarranty(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Warranty{}, apperrors.NotFound("Warranty", id.String())
		}
		return Warranty{}, apperrors.Internal("failed to get warranty", err)
	}

	return warranty, nil
}

// ListWarranties returns a filtered, paginated list of warranties.
func (s *WarrantyService) ListWarranties(ctx context.Context, renewalStatus *string, params types.PaginationParams) ([]Warranty, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM warranties
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR renewal_status = $2)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, renewalStatus).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count warranties", err)
	}

	dataQuery := `
		SELECT ` + warrantyColumns + `
		FROM warranties
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR renewal_status = $2)
		ORDER BY end_date ASC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, renewalStatus,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list warranties", err)
	}
	defer rows.Close()

	warranties, err := scanWarranties(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan warranties", err)
	}

	return warranties, total, nil
}

// UpdateWarranty updates an existing warranty using COALESCE partial update.
func (s *WarrantyService) UpdateWarranty(ctx context.Context, id uuid.UUID, req UpdateWarrantyRequest) (Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Warranty{}, apperrors.Unauthorized("authentication required")
	}

	// Verify warranty exists.
	_, err := s.GetWarranty(ctx, id)
	if err != nil {
		return Warranty{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE warranties SET
			vendor = COALESCE($1, vendor),
			contract_number = COALESCE($2, contract_number),
			coverage_type = COALESCE($3, coverage_type),
			start_date = COALESCE($4, start_date),
			end_date = COALESCE($5, end_date),
			cost = COALESCE($6, cost),
			renewal_status = COALESCE($7, renewal_status),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING ` + warrantyColumns

	warranty, err := scanWarranty(s.pool.QueryRow(ctx, updateQuery,
		req.Vendor, req.ContractNumber, req.CoverageType,
		req.StartDate, req.EndDate, req.Cost,
		req.RenewalStatus,
		now, id, auth.TenantID,
	))
	if err != nil {
		return Warranty{}, apperrors.Internal("failed to update warranty", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:warranty",
		EntityType: "warranty",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return warranty, nil
}

// DeleteWarranty deletes a warranty.
func (s *WarrantyService) DeleteWarranty(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM warranties WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete warranty", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Warranty", id.String())
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:warranty",
		EntityType: "warranty",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// GetExpiringWarranties returns warranties expiring within the given number of days.
func (s *WarrantyService) GetExpiringWarranties(ctx context.Context, days int) ([]Warranty, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT ` + warrantyColumns + `
		FROM warranties
		WHERE tenant_id = $1
			AND end_date > NOW()
			AND end_date <= NOW() + ($2 || ' days')::interval
		ORDER BY end_date ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, days)
	if err != nil {
		return nil, apperrors.Internal("failed to list expiring warranties", err)
	}
	defer rows.Close()

	warranties, err := scanWarranties(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan expiring warranties", err)
	}

	return warranties, nil
}

// ──────────────────────────────────────────────
// Renewal Alerts
// ──────────────────────────────────────────────

// CreateRenewalAlert creates a new renewal alert.
func (s *WarrantyService) CreateRenewalAlert(ctx context.Context, req CreateRenewalAlertRequest) (RenewalAlert, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return RenewalAlert{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO renewal_alerts (id, tenant_id, entity_type, entity_id, alert_date, sent, created_at)
		VALUES ($1, $2, $3, $4, $5, false, $6)
		RETURNING id, tenant_id, entity_type, entity_id, alert_date, sent, created_at`

	var alert RenewalAlert
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.EntityType, req.EntityID, req.AlertDate, now,
	).Scan(
		&alert.ID, &alert.TenantID, &alert.EntityType, &alert.EntityID,
		&alert.AlertDate, &alert.Sent, &alert.CreatedAt,
	)
	if err != nil {
		return RenewalAlert{}, apperrors.Internal("failed to create renewal alert", err)
	}

	return alert, nil
}

// ListPendingAlerts returns all pending (unsent) renewal alerts for the tenant.
func (s *WarrantyService) ListPendingAlerts(ctx context.Context) ([]RenewalAlert, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, entity_type, entity_id, alert_date, sent, created_at
		FROM renewal_alerts
		WHERE tenant_id = $1 AND sent = false
		ORDER BY alert_date ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list pending alerts", err)
	}
	defer rows.Close()

	var alerts []RenewalAlert
	for rows.Next() {
		var a RenewalAlert
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.EntityType, &a.EntityID,
			&a.AlertDate, &a.Sent, &a.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan renewal alert", err)
		}
		alerts = append(alerts, a)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate renewal alerts", err)
	}

	if alerts == nil {
		alerts = []RenewalAlert{}
	}

	return alerts, nil
}

// MarkAlertSent marks a renewal alert as sent.
func (s *WarrantyService) MarkAlertSent(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		UPDATE renewal_alerts SET sent = true
		WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to mark alert as sent", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("RenewalAlert", id.String())
	}

	return nil
}

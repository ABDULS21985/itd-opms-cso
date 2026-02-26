package cmdb

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
// AssetService
// ──────────────────────────────────────────────

// AssetService handles business logic for hardware/software asset lifecycle management.
type AssetService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewAssetService creates a new AssetService.
func NewAssetService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *AssetService {
	return &AssetService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// assetColumns is the canonical column list for the assets table.
const assetColumns = `
	id, tenant_id, asset_tag, name, asset_type,
	category, manufacturer, model, serial_number,
	status, location, department, owner_id, assigned_to,
	purchase_date, purchase_cost, currency_code,
	warranty_end_date, ip_address, mac_address,
	os_info, specifications, tags, custom_fields,
	created_at, updated_at`

// scanAsset scans a single asset row into an Asset struct.
func scanAsset(row pgx.Row) (Asset, error) {
	var a Asset
	err := row.Scan(
		&a.ID, &a.TenantID, &a.AssetTag, &a.Name, &a.AssetType,
		&a.Category, &a.Manufacturer, &a.Model, &a.SerialNumber,
		&a.Status, &a.Location, &a.Department, &a.OwnerID, &a.AssignedTo,
		&a.PurchaseDate, &a.PurchaseCost, &a.CurrencyCode,
		&a.WarrantyEndDate, &a.IPAddress, &a.MACAddress,
		&a.OSInfo, &a.Specifications, &a.Tags, &a.CustomFields,
		&a.CreatedAt, &a.UpdatedAt,
	)
	return a, err
}

// scanAssets scans multiple asset rows into a slice.
func scanAssets(rows pgx.Rows) ([]Asset, error) {
	var assets []Asset
	for rows.Next() {
		var a Asset
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.AssetTag, &a.Name, &a.AssetType,
			&a.Category, &a.Manufacturer, &a.Model, &a.SerialNumber,
			&a.Status, &a.Location, &a.Department, &a.OwnerID, &a.AssignedTo,
			&a.PurchaseDate, &a.PurchaseCost, &a.CurrencyCode,
			&a.WarrantyEndDate, &a.IPAddress, &a.MACAddress,
			&a.OSInfo, &a.Specifications, &a.Tags, &a.CustomFields,
			&a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		assets = append(assets, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if assets == nil {
		assets = []Asset{}
	}
	return assets, nil
}

// ──────────────────────────────────────────────
// Asset CRUD
// ──────────────────────────────────────────────

// CreateAsset creates a new asset and logs a "procured" lifecycle event.
func (s *AssetService) CreateAsset(ctx context.Context, req CreateAssetRequest) (Asset, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Asset{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Default empty arrays / null fields.
	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}
	customFields := req.CustomFields
	if customFields == nil {
		customFields = json.RawMessage("null")
	}
	specs := req.Specifications
	if specs == nil {
		specs = json.RawMessage("null")
	}

	query := `
		INSERT INTO assets (
			id, tenant_id, asset_tag, name, asset_type,
			category, manufacturer, model, serial_number,
			status, location, department, owner_id, assigned_to,
			purchase_date, purchase_cost, currency_code,
			warranty_end_date, ip_address, mac_address,
			os_info, specifications, tags, custom_fields,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			'procured', $10, $11, $12, $13,
			$14, $15, $16,
			$17, $18, $19,
			$20, $21, $22, $23,
			$24, $25
		)
		RETURNING ` + assetColumns

	asset, err := scanAsset(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.AssetTag, req.Name, req.AssetType,
		req.Category, req.Manufacturer, req.Model, req.SerialNumber,
		req.Location, req.Department, req.OwnerID, req.AssignedTo,
		req.PurchaseDate, req.PurchaseCost, req.CurrencyCode,
		req.WarrantyEndDate, req.IPAddress, req.MACAddress,
		req.OSInfo, specs, tags, customFields,
		now, now,
	))
	if err != nil {
		return Asset{}, apperrors.Internal("failed to create asset", err)
	}

	// Log initial "procured" lifecycle event.
	eventID := uuid.New()
	_, err = s.pool.Exec(ctx, `
		INSERT INTO asset_lifecycle_events (id, asset_id, event_type, event_timestamp, performed_by, details, created_at)
		VALUES ($1, $2, 'procured', $3, $4, '{}', $5)`,
		eventID, id, now, auth.UserID, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to insert lifecycle event for asset creation", "error", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"name":       req.Name,
		"asset_type": req.AssetType,
		"asset_tag":  req.AssetTag,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:asset",
		EntityType: "asset",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return asset, nil
}

// GetAsset retrieves a single asset by ID.
func (s *AssetService) GetAsset(ctx context.Context, id uuid.UUID) (Asset, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Asset{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + assetColumns + ` FROM assets WHERE id = $1 AND tenant_id = $2`

	asset, err := scanAsset(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Asset{}, apperrors.NotFound("Asset", id.String())
		}
		return Asset{}, apperrors.Internal("failed to get asset", err)
	}

	return asset, nil
}

// ListAssets returns a filtered, paginated list of assets.
func (s *AssetService) ListAssets(ctx context.Context, assetType, status, ownerID *string, params types.PaginationParams) ([]Asset, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM assets
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR asset_type = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR owner_id::text = $4)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery,
		auth.TenantID, assetType, status, ownerID,
	).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count assets", err)
	}

	dataQuery := `
		SELECT ` + assetColumns + `
		FROM assets
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR asset_type = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR owner_id::text = $4)
		ORDER BY created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, assetType, status, ownerID,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list assets", err)
	}
	defer rows.Close()

	assets, err := scanAssets(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan assets", err)
	}

	return assets, total, nil
}

// UpdateAsset updates an existing asset using COALESCE partial update.
func (s *AssetService) UpdateAsset(ctx context.Context, id uuid.UUID, req UpdateAssetRequest) (Asset, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Asset{}, apperrors.Unauthorized("authentication required")
	}

	// Verify asset exists.
	_, err := s.GetAsset(ctx, id)
	if err != nil {
		return Asset{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE assets SET
			name = COALESCE($1, name),
			category = COALESCE($2, category),
			manufacturer = COALESCE($3, manufacturer),
			model = COALESCE($4, model),
			serial_number = COALESCE($5, serial_number),
			location = COALESCE($6, location),
			department = COALESCE($7, department),
			owner_id = COALESCE($8, owner_id),
			assigned_to = COALESCE($9, assigned_to),
			purchase_date = COALESCE($10, purchase_date),
			purchase_cost = COALESCE($11, purchase_cost),
			currency_code = COALESCE($12, currency_code),
			warranty_end_date = COALESCE($13, warranty_end_date),
			ip_address = COALESCE($14, ip_address),
			mac_address = COALESCE($15, mac_address),
			os_info = COALESCE($16, os_info),
			specifications = COALESCE($17, specifications),
			tags = COALESCE($18, tags),
			custom_fields = COALESCE($19, custom_fields),
			updated_at = $20
		WHERE id = $21 AND tenant_id = $22
		RETURNING ` + assetColumns

	asset, err := scanAsset(s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Category, req.Manufacturer,
		req.Model, req.SerialNumber,
		req.Location, req.Department,
		req.OwnerID, req.AssignedTo,
		req.PurchaseDate, req.PurchaseCost, req.CurrencyCode,
		req.WarrantyEndDate, req.IPAddress, req.MACAddress,
		req.OSInfo, req.Specifications, req.Tags, req.CustomFields,
		now, id, auth.TenantID,
	))
	if err != nil {
		return Asset{}, apperrors.Internal("failed to update asset", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:asset",
		EntityType: "asset",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return asset, nil
}

// DeleteAsset performs a soft delete by setting status to 'disposed'.
func (s *AssetService) DeleteAsset(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	result, err := s.pool.Exec(ctx, `
		UPDATE assets SET status = 'disposed', updated_at = $1
		WHERE id = $2 AND tenant_id = $3`,
		now, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete asset", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Asset", id.String())
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:asset",
		EntityType: "asset",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Status Transitions
// ──────────────────────────────────────────────

// TransitionAssetStatus validates and performs a status transition on an asset.
func (s *AssetService) TransitionAssetStatus(ctx context.Context, id uuid.UUID, newStatus string) (Asset, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Asset{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetAsset(ctx, id)
	if err != nil {
		return Asset{}, err
	}

	// Validate status transition.
	if !IsValidAssetTransition(existing.Status, newStatus) {
		return Asset{}, apperrors.BadRequest(
			fmt.Sprintf("invalid asset status transition from '%s' to '%s'", existing.Status, newStatus),
		)
	}

	now := time.Now().UTC()

	query := `
		UPDATE assets SET status = $1, updated_at = $2
		WHERE id = $3 AND tenant_id = $4
		RETURNING ` + assetColumns

	asset, err := scanAsset(s.pool.QueryRow(ctx, query,
		newStatus, now, id, auth.TenantID,
	))
	if err != nil {
		return Asset{}, apperrors.Internal("failed to transition asset status", err)
	}

	// Create lifecycle event for the transition.
	eventID := uuid.New()
	details, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      newStatus,
	})
	_, err = s.pool.Exec(ctx, `
		INSERT INTO asset_lifecycle_events (id, asset_id, event_type, event_timestamp, performed_by, details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		eventID, id, newStatus, now, auth.UserID, details, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to insert lifecycle event for status transition", "error", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      newStatus,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:asset",
		EntityType: "asset",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return asset, nil
}

// ──────────────────────────────────────────────
// Lifecycle Events
// ──────────────────────────────────────────────

// CreateLifecycleEvent creates a new lifecycle event for an asset.
func (s *AssetService) CreateLifecycleEvent(ctx context.Context, assetID uuid.UUID, eventType string, details json.RawMessage, evidenceDocID *uuid.UUID) (AssetLifecycleEvent, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetLifecycleEvent{}, apperrors.Unauthorized("authentication required")
	}

	// Verify asset exists.
	_, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return AssetLifecycleEvent{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	if details == nil {
		details = json.RawMessage("{}")
	}

	query := `
		INSERT INTO asset_lifecycle_events (id, asset_id, event_type, event_timestamp, performed_by, details, evidence_doc_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, asset_id, event_type, event_timestamp, performed_by, details, evidence_doc_id, created_at`

	var evt AssetLifecycleEvent
	err = s.pool.QueryRow(ctx, query,
		id, assetID, eventType, now, auth.UserID, details, evidenceDocID, now,
	).Scan(
		&evt.ID, &evt.AssetID, &evt.EventType, &evt.EventTimestamp,
		&evt.PerformedBy, &evt.Details, &evt.EvidenceDocID, &evt.CreatedAt,
	)
	if err != nil {
		return AssetLifecycleEvent{}, apperrors.Internal("failed to create lifecycle event", err)
	}

	return evt, nil
}

// ListLifecycleEvents returns lifecycle events for an asset, ordered by timestamp descending.
func (s *AssetService) ListLifecycleEvents(ctx context.Context, assetID uuid.UUID) ([]AssetLifecycleEvent, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, asset_id, event_type, event_timestamp, performed_by, details, evidence_doc_id, created_at
		FROM asset_lifecycle_events
		WHERE asset_id = $1
		ORDER BY event_timestamp DESC`

	rows, err := s.pool.Query(ctx, query, assetID)
	if err != nil {
		return nil, apperrors.Internal("failed to list lifecycle events", err)
	}
	defer rows.Close()

	var events []AssetLifecycleEvent
	for rows.Next() {
		var evt AssetLifecycleEvent
		if err := rows.Scan(
			&evt.ID, &evt.AssetID, &evt.EventType, &evt.EventTimestamp,
			&evt.PerformedBy, &evt.Details, &evt.EvidenceDocID, &evt.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan lifecycle event", err)
		}
		events = append(events, evt)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate lifecycle events", err)
	}

	if events == nil {
		events = []AssetLifecycleEvent{}
	}

	_ = auth

	return events, nil
}

// ──────────────────────────────────────────────
// Disposals
// ──────────────────────────────────────────────

// CreateDisposal creates a new asset disposal request.
func (s *AssetService) CreateDisposal(ctx context.Context, req CreateDisposalRequest) (AssetDisposal, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetDisposal{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO asset_disposals (
			id, tenant_id, asset_id, disposal_method, reason,
			approved_by, disposal_date, certificate_doc_id,
			environmental_compliance, data_wipe_confirmed,
			status, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10,
			'pending', $11, $12, $13
		)
		RETURNING id, tenant_id, asset_id, disposal_method, reason,
			approved_by, disposal_date, certificate_doc_id,
			environmental_compliance, data_wipe_confirmed,
			status, notes, created_at, updated_at`

	var d AssetDisposal
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.AssetID, req.DisposalMethod, req.Reason,
		req.ApprovedBy, req.DisposalDate, req.CertificateDocID,
		req.EnvironmentalCompliance, req.DataWipeConfirmed,
		req.Notes, now, now,
	).Scan(
		&d.ID, &d.TenantID, &d.AssetID, &d.DisposalMethod, &d.Reason,
		&d.ApprovedBy, &d.DisposalDate, &d.CertificateDocID,
		&d.EnvironmentalCompliance, &d.DataWipeConfirmed,
		&d.Status, &d.Notes, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return AssetDisposal{}, apperrors.Internal("failed to create disposal", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"asset_id":        req.AssetID,
		"disposal_method": req.DisposalMethod,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:asset_disposal",
		EntityType: "asset_disposal",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return d, nil
}

// GetDisposal retrieves a single disposal by ID.
func (s *AssetService) GetDisposal(ctx context.Context, id uuid.UUID) (AssetDisposal, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetDisposal{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, asset_id, disposal_method, reason,
			approved_by, disposal_date, certificate_doc_id,
			environmental_compliance, data_wipe_confirmed,
			status, notes, created_at, updated_at
		FROM asset_disposals
		WHERE id = $1 AND tenant_id = $2`

	var d AssetDisposal
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&d.ID, &d.TenantID, &d.AssetID, &d.DisposalMethod, &d.Reason,
		&d.ApprovedBy, &d.DisposalDate, &d.CertificateDocID,
		&d.EnvironmentalCompliance, &d.DataWipeConfirmed,
		&d.Status, &d.Notes, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return AssetDisposal{}, apperrors.NotFound("AssetDisposal", id.String())
		}
		return AssetDisposal{}, apperrors.Internal("failed to get disposal", err)
	}

	return d, nil
}

// ListDisposals returns a filtered, paginated list of disposals.
func (s *AssetService) ListDisposals(ctx context.Context, status *string, params types.PaginationParams) ([]AssetDisposal, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM asset_disposals
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count disposals", err)
	}

	dataQuery := `
		SELECT id, tenant_id, asset_id, disposal_method, reason,
			approved_by, disposal_date, certificate_doc_id,
			environmental_compliance, data_wipe_confirmed,
			status, notes, created_at, updated_at
		FROM asset_disposals
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, status,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list disposals", err)
	}
	defer rows.Close()

	var disposals []AssetDisposal
	for rows.Next() {
		var d AssetDisposal
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.AssetID, &d.DisposalMethod, &d.Reason,
			&d.ApprovedBy, &d.DisposalDate, &d.CertificateDocID,
			&d.EnvironmentalCompliance, &d.DataWipeConfirmed,
			&d.Status, &d.Notes, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan disposal", err)
		}
		disposals = append(disposals, d)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate disposals", err)
	}

	if disposals == nil {
		disposals = []AssetDisposal{}
	}

	return disposals, total, nil
}

// UpdateDisposalStatus updates a disposal's status. If completed, transitions the asset to 'disposed'.
func (s *AssetService) UpdateDisposalStatus(ctx context.Context, id uuid.UUID, req UpdateDisposalStatusRequest) (AssetDisposal, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetDisposal{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetDisposal(ctx, id)
	if err != nil {
		return AssetDisposal{}, err
	}

	now := time.Now().UTC()

	query := `
		UPDATE asset_disposals SET
			status = $1,
			notes = COALESCE($2, notes),
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5
		RETURNING id, tenant_id, asset_id, disposal_method, reason,
			approved_by, disposal_date, certificate_doc_id,
			environmental_compliance, data_wipe_confirmed,
			status, notes, created_at, updated_at`

	var d AssetDisposal
	err = s.pool.QueryRow(ctx, query,
		req.Status, req.Notes, now, id, auth.TenantID,
	).Scan(
		&d.ID, &d.TenantID, &d.AssetID, &d.DisposalMethod, &d.Reason,
		&d.ApprovedBy, &d.DisposalDate, &d.CertificateDocID,
		&d.EnvironmentalCompliance, &d.DataWipeConfirmed,
		&d.Status, &d.Notes, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return AssetDisposal{}, apperrors.Internal("failed to update disposal status", err)
	}

	// If completed, transition asset to 'disposed' and create lifecycle event.
	if req.Status == "completed" {
		_, err = s.pool.Exec(ctx, `
			UPDATE assets SET status = 'disposed', updated_at = $1
			WHERE id = $2 AND tenant_id = $3`,
			now, existing.AssetID, auth.TenantID,
		)
		if err != nil {
			slog.ErrorContext(ctx, "failed to transition asset to disposed", "error", err)
		}

		// Create lifecycle event for disposal.
		eventID := uuid.New()
		details, _ := json.Marshal(map[string]any{
			"disposal_id":     id,
			"disposal_method": existing.DisposalMethod,
		})
		_, err = s.pool.Exec(ctx, `
			INSERT INTO asset_lifecycle_events (id, asset_id, event_type, event_timestamp, performed_by, details, created_at)
			VALUES ($1, $2, 'disposed', $3, $4, $5, $6)`,
			eventID, existing.AssetID, now, auth.UserID, details, now,
		)
		if err != nil {
			slog.ErrorContext(ctx, "failed to insert lifecycle event for disposal completion", "error", err)
		}
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      req.Status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update_status:asset_disposal",
		EntityType: "asset_disposal",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return d, nil
}

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────

// GetAssetStats returns aggregate asset counts by status and type.
func (s *AssetService) GetAssetStats(ctx context.Context) (AssetStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetStats{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'in_use') AS in_use_count,
			COUNT(*) FILTER (WHERE status = 'in_storage') AS in_storage_count,
			COUNT(*) FILTER (WHERE status = 'in_maintenance') AS in_maintenance_count,
			COUNT(*) FILTER (WHERE status = 'disposed') AS disposed_count,
			COUNT(*) FILTER (WHERE asset_type = 'hardware') AS hardware_count,
			COUNT(*) FILTER (WHERE asset_type = 'software') AS software_count,
			COUNT(*) FILTER (WHERE asset_type = 'network') AS network_count,
			COUNT(*) FILTER (WHERE asset_type = 'peripheral') AS peripheral_count
		FROM assets
		WHERE tenant_id = $1`

	var stats AssetStats
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&stats.Total, &stats.InUseCount, &stats.InStorageCount,
		&stats.InMaintenanceCount, &stats.DisposedCount,
		&stats.HardwareCount, &stats.SoftwareCount,
		&stats.NetworkCount, &stats.PeripheralCount,
	)
	if err != nil {
		return AssetStats{}, apperrors.Internal("failed to get asset stats", err)
	}

	return stats, nil
}

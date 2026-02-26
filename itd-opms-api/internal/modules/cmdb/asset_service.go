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
	id, tenant_id, asset_tag, type, category,
	name, description, manufacturer, model, serial_number,
	status, location, building, floor, room,
	owner_id, custodian_id,
	purchase_date, purchase_cost, currency,
	classification, attributes, tags,
	created_at, updated_at`

// scanAsset scans a single asset row into an Asset struct.
func scanAsset(row pgx.Row) (Asset, error) {
	var a Asset
	err := row.Scan(
		&a.ID, &a.TenantID, &a.AssetTag, &a.Type, &a.Category,
		&a.Name, &a.Description, &a.Manufacturer, &a.Model, &a.SerialNumber,
		&a.Status, &a.Location, &a.Building, &a.Floor, &a.Room,
		&a.OwnerID, &a.CustodianID,
		&a.PurchaseDate, &a.PurchaseCost, &a.Currency,
		&a.Classification, &a.Attributes, &a.Tags,
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
			&a.ID, &a.TenantID, &a.AssetTag, &a.Type, &a.Category,
			&a.Name, &a.Description, &a.Manufacturer, &a.Model, &a.SerialNumber,
			&a.Status, &a.Location, &a.Building, &a.Floor, &a.Room,
			&a.OwnerID, &a.CustodianID,
			&a.PurchaseDate, &a.PurchaseCost, &a.Currency,
			&a.Classification, &a.Attributes, &a.Tags,
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
	attributes := req.Attributes
	if attributes == nil {
		attributes = json.RawMessage("{}")
	}

	// Default currency.
	currency := "NGN"
	if req.Currency != nil {
		currency = *req.Currency
	}

	query := `
		INSERT INTO assets (
			id, tenant_id, asset_tag, type, category,
			name, description, manufacturer, model, serial_number,
			status, location, building, floor, room,
			owner_id, custodian_id,
			purchase_date, purchase_cost, currency,
			classification, attributes, tags,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			'procured', $11, $12, $13, $14,
			$15, $16,
			$17, $18, $19,
			$20, $21, $22,
			$23, $24
		)
		RETURNING ` + assetColumns

	asset, err := scanAsset(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.AssetTag, req.Type, req.Category,
		req.Name, req.Description, req.Manufacturer, req.Model, req.SerialNumber,
		req.Location, req.Building, req.Floor, req.Room,
		req.OwnerID, req.CustodianID,
		req.PurchaseDate, req.PurchaseCost, currency,
		req.Classification, attributes, tags,
		now, now,
	))
	if err != nil {
		return Asset{}, apperrors.Internal("failed to create asset", err)
	}

	// Log initial "procured" lifecycle event.
	eventID := uuid.New()
	_, err = s.pool.Exec(ctx, `
		INSERT INTO asset_lifecycle_events (id, asset_id, event_type, performed_by, details, evidence_document_id, timestamp)
		VALUES ($1, $2, 'procured', $3, '{}', NULL, $4)`,
		eventID, id, auth.UserID, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to insert lifecycle event for asset creation", "error", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"name":      req.Name,
		"type":      req.Type,
		"asset_tag": req.AssetTag,
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

// SearchAssets performs a full-text search on assets by name, asset_tag, serial_number, or model.
func (s *AssetService) SearchAssets(ctx context.Context, query string, params types.PaginationParams) ([]Asset, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	searchPattern := "%" + query + "%"

	countQuery := `
		SELECT COUNT(*)
		FROM assets
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR asset_tag ILIKE $2 OR serial_number ILIKE $2 OR model ILIKE $2)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, searchPattern).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count search results", err)
	}

	dataQuery := `
		SELECT ` + assetColumns + `
		FROM assets
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR asset_tag ILIKE $2 OR serial_number ILIKE $2 OR model ILIKE $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery,
		auth.TenantID, searchPattern,
		params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to search assets", err)
	}
	defer rows.Close()

	assets, err := scanAssets(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan search results", err)
	}

	return assets, total, nil
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
			AND ($2::text IS NULL OR type = $2)
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
			AND ($2::text IS NULL OR type = $2)
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
			asset_tag = COALESCE($1, asset_tag),
			type = COALESCE($2, type),
			category = COALESCE($3, category),
			name = COALESCE($4, name),
			description = COALESCE($5, description),
			manufacturer = COALESCE($6, manufacturer),
			model = COALESCE($7, model),
			serial_number = COALESCE($8, serial_number),
			location = COALESCE($9, location),
			building = COALESCE($10, building),
			floor = COALESCE($11, floor),
			room = COALESCE($12, room),
			owner_id = COALESCE($13, owner_id),
			custodian_id = COALESCE($14, custodian_id),
			purchase_date = COALESCE($15, purchase_date),
			purchase_cost = COALESCE($16, purchase_cost),
			currency = COALESCE($17, currency),
			classification = COALESCE($18, classification),
			attributes = COALESCE($19, attributes),
			tags = COALESCE($20, tags),
			updated_at = $21
		WHERE id = $22 AND tenant_id = $23
		RETURNING ` + assetColumns

	asset, err := scanAsset(s.pool.QueryRow(ctx, updateQuery,
		req.AssetTag, req.Type, req.Category,
		req.Name, req.Description, req.Manufacturer,
		req.Model, req.SerialNumber,
		req.Location, req.Building, req.Floor, req.Room,
		req.OwnerID, req.CustodianID,
		req.PurchaseDate, req.PurchaseCost, req.Currency,
		req.Classification, req.Attributes, req.Tags,
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
		INSERT INTO asset_lifecycle_events (id, asset_id, event_type, performed_by, details, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		eventID, id, newStatus, auth.UserID, details, now,
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
		INSERT INTO asset_lifecycle_events (id, asset_id, event_type, performed_by, details, evidence_document_id, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, asset_id, event_type, performed_by, details, evidence_document_id, timestamp`

	var evt AssetLifecycleEvent
	err = s.pool.QueryRow(ctx, query,
		id, assetID, eventType, auth.UserID, details, evidenceDocID, now,
	).Scan(
		&evt.ID, &evt.AssetID, &evt.EventType,
		&evt.PerformedBy, &evt.Details, &evt.EvidenceDocumentID, &evt.Timestamp,
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
		SELECT id, asset_id, event_type, performed_by, details, evidence_document_id, timestamp
		FROM asset_lifecycle_events
		WHERE asset_id = $1
		ORDER BY timestamp DESC`

	rows, err := s.pool.Query(ctx, query, assetID)
	if err != nil {
		return nil, apperrors.Internal("failed to list lifecycle events", err)
	}
	defer rows.Close()

	var events []AssetLifecycleEvent
	for rows.Next() {
		var evt AssetLifecycleEvent
		if err := rows.Scan(
			&evt.ID, &evt.AssetID, &evt.EventType,
			&evt.PerformedBy, &evt.Details, &evt.EvidenceDocumentID, &evt.Timestamp,
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

// disposalColumns is the canonical column list for the asset_disposals table.
const disposalColumns = `
	id, asset_id, tenant_id, disposal_method, reason,
	approved_by, approval_chain_id, disposal_date,
	disposal_certificate_doc_id, witness_ids,
	data_wipe_confirmed, status,
	created_at, updated_at`

// scanDisposal scans a single disposal row into an AssetDisposal struct.
func scanDisposal(row pgx.Row) (AssetDisposal, error) {
	var d AssetDisposal
	err := row.Scan(
		&d.ID, &d.AssetID, &d.TenantID, &d.DisposalMethod, &d.Reason,
		&d.ApprovedBy, &d.ApprovalChainID, &d.DisposalDate,
		&d.DisposalCertificateDocID, &d.WitnessIDs,
		&d.DataWipeConfirmed, &d.Status,
		&d.CreatedAt, &d.UpdatedAt,
	)
	return d, err
}

// CreateDisposal creates a new asset disposal request.
func (s *AssetService) CreateDisposal(ctx context.Context, req CreateDisposalRequest) (AssetDisposal, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetDisposal{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	witnessIDs := req.WitnessIDs
	if witnessIDs == nil {
		witnessIDs = []uuid.UUID{}
	}

	dataWipeConfirmed := false
	if req.DataWipeConfirmed != nil {
		dataWipeConfirmed = *req.DataWipeConfirmed
	}

	query := `
		INSERT INTO asset_disposals (
			id, asset_id, tenant_id, disposal_method, reason,
			approval_chain_id, witness_ids,
			data_wipe_confirmed, status,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7,
			$8, 'pending_approval',
			$9, $10
		)
		RETURNING ` + disposalColumns

	disposal, err := scanDisposal(s.pool.QueryRow(ctx, query,
		id, req.AssetID, auth.TenantID, req.DisposalMethod, req.Reason,
		req.ApprovalChainID, witnessIDs,
		dataWipeConfirmed,
		now, now,
	))
	if err != nil {
		return AssetDisposal{}, apperrors.Internal("failed to create disposal", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"asset_id":        req.AssetID,
		"disposal_method": req.DisposalMethod,
		"reason":          req.Reason,
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

	return disposal, nil
}

// GetDisposal retrieves a single disposal by ID.
func (s *AssetService) GetDisposal(ctx context.Context, id uuid.UUID) (AssetDisposal, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetDisposal{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + disposalColumns + ` FROM asset_disposals WHERE id = $1 AND tenant_id = $2`

	disposal, err := scanDisposal(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return AssetDisposal{}, apperrors.NotFound("AssetDisposal", id.String())
		}
		return AssetDisposal{}, apperrors.Internal("failed to get disposal", err)
	}

	return disposal, nil
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
		SELECT ` + disposalColumns + `
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
		d, err := scanDisposal(rows)
		if err != nil {
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
			approved_by = COALESCE($2, approved_by),
			disposal_date = COALESCE($3, disposal_date),
			disposal_certificate_doc_id = COALESCE($4, disposal_certificate_doc_id),
			data_wipe_confirmed = COALESCE($5, data_wipe_confirmed),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING ` + disposalColumns

	disposal, err := scanDisposal(s.pool.QueryRow(ctx, query,
		req.Status, req.ApprovedBy, req.DisposalDate,
		req.DisposalCertificateDocID, req.DataWipeConfirmed,
		now, id, auth.TenantID,
	))
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
			INSERT INTO asset_lifecycle_events (id, asset_id, event_type, performed_by, details, timestamp)
			VALUES ($1, $2, 'disposed', $3, $4, $5)`,
			eventID, existing.AssetID, auth.UserID, details, now,
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

	return disposal, nil
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

	// Get total count.
	var totalCount int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets WHERE tenant_id = $1`, auth.TenantID).Scan(&totalCount)
	if err != nil {
		return AssetStats{}, apperrors.Internal("failed to get asset total count", err)
	}

	// Get counts by status.
	byStatus := make(map[string]int)
	statusRows, err := s.pool.Query(ctx, `
		SELECT status, COUNT(*) FROM assets WHERE tenant_id = $1 GROUP BY status`,
		auth.TenantID,
	)
	if err != nil {
		return AssetStats{}, apperrors.Internal("failed to get asset status counts", err)
	}
	defer statusRows.Close()

	for statusRows.Next() {
		var status string
		var count int
		if err := statusRows.Scan(&status, &count); err != nil {
			return AssetStats{}, apperrors.Internal("failed to scan asset status count", err)
		}
		byStatus[status] = count
	}
	if err := statusRows.Err(); err != nil {
		return AssetStats{}, apperrors.Internal("failed to iterate asset status counts", err)
	}

	// Get counts by type.
	byType := make(map[string]int)
	typeRows, err := s.pool.Query(ctx, `
		SELECT type, COUNT(*) FROM assets WHERE tenant_id = $1 GROUP BY type`,
		auth.TenantID,
	)
	if err != nil {
		return AssetStats{}, apperrors.Internal("failed to get asset type counts", err)
	}
	defer typeRows.Close()

	for typeRows.Next() {
		var assetType string
		var count int
		if err := typeRows.Scan(&assetType, &count); err != nil {
			return AssetStats{}, apperrors.Internal("failed to scan asset type count", err)
		}
		byType[assetType] = count
	}
	if err := typeRows.Err(); err != nil {
		return AssetStats{}, apperrors.Internal("failed to iterate asset type counts", err)
	}

	return AssetStats{
		TotalCount: totalCount,
		ByStatus:   byStatus,
		ByType:     byType,
	}, nil
}

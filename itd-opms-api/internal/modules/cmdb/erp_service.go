package cmdb

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/connectors"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ERPService
// ──────────────────────────────────────────────

// ERPService handles ERP integration operations.
type ERPService struct {
	pool      *pgxpool.Pool
	auditSvc  *audit.AuditService
	connector connectors.ERPConnector
	config    connectors.ERPConfig
}

// NewERPService creates a new ERPService.
func NewERPService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ERPService {
	cfg := connectors.LoadERPConfig()
	return &ERPService{
		pool:      pool,
		auditSvc:  auditSvc,
		connector: connectors.NewERPConnector(cfg),
		config:    cfg,
	}
}

// ──────────────────────────────────────────────
// Sync
// ──────────────────────────────────────────────

// TriggerSync runs an ERP sync for all assets with an asset_tag.
func (s *ERPService) TriggerSync(ctx context.Context) (*ERPSyncLog, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Create sync log entry.
	logID := uuid.New()
	now := time.Now().UTC()
	_, err := s.pool.Exec(ctx, `
		INSERT INTO erp_sync_logs (id, tenant_id, status, started_at, triggered_by)
		VALUES ($1, $2, 'running', $3, $4)`,
		logID, auth.TenantID, now, auth.UserID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create sync log", err)
	}

	// Fetch all asset tags for this tenant.
	rows, err := s.pool.Query(ctx, `
		SELECT id, asset_tag FROM assets
		WHERE tenant_id = $1 AND asset_tag IS NOT NULL AND asset_tag != ''`,
		auth.TenantID,
	)
	if err != nil {
		s.failSync(ctx, logID, 0, 0, err)
		return nil, apperrors.Internal("failed to list assets for sync", err)
	}
	defer rows.Close()

	type assetRef struct {
		ID  uuid.UUID
		Tag string
	}
	var refs []assetRef
	for rows.Next() {
		var ref assetRef
		if scanErr := rows.Scan(&ref.ID, &ref.Tag); scanErr != nil {
			continue
		}
		refs = append(refs, ref)
	}

	synced := 0
	failed := 0
	var syncErrors []map[string]string

	for _, ref := range refs {
		fin, finErr := s.connector.GetAssetFinancials(ref.Tag)
		if finErr != nil {
			failed++
			syncErrors = append(syncErrors, map[string]string{
				"assetTag": ref.Tag,
				"error":    finErr.Error(),
			})
			continue
		}

		_, updateErr := s.pool.Exec(ctx, `
			UPDATE assets SET
				purchase_price = $1,
				current_book_value = $2,
				depreciation_rate = $3,
				cost_center = $4,
				po_number = $5,
				erp_asset_id = $6,
				erp_sync_at = $7
			WHERE id = $8 AND tenant_id = $9`,
			fin.PurchasePrice, fin.CurrentBookValue, fin.DepreciationRate,
			fin.CostCenter, fin.PONumber,
			"ORA-FA-"+ref.Tag, // stub ERP ID
			time.Now().UTC(),
			ref.ID, auth.TenantID,
		)
		if updateErr != nil {
			failed++
			syncErrors = append(syncErrors, map[string]string{
				"assetTag": ref.Tag,
				"error":    updateErr.Error(),
			})
			continue
		}
		synced++
	}

	// Complete the sync log.
	completedAt := time.Now().UTC()
	status := "completed"
	if failed > 0 && synced == 0 {
		status = "failed"
	}
	errJSON, _ := json.Marshal(syncErrors)

	_, _ = s.pool.Exec(ctx, `
		UPDATE erp_sync_logs SET
			status = $1, completed_at = $2,
			assets_synced = $3, assets_failed = $4,
			error_details = $5
		WHERE id = $6`,
		status, completedAt, synced, failed, errJSON, logID,
	)

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"synced": synced, "failed": failed,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "sync:erp",
		EntityType: "erp_sync",
		EntityID:   logID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return s.getSyncLog(ctx, logID)
}

// ──────────────────────────────────────────────
// Sync Status
// ──────────────────────────────────────────────

// GetSyncStatus returns the latest sync run info and total synced assets count.
func (s *ERPService) GetSyncStatus(ctx context.Context) (*ERPSyncStatus, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	status := &ERPSyncStatus{ERPEnabled: s.config.Enabled}

	// Last sync log.
	row := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, status, started_at, completed_at,
			assets_synced, assets_failed, error_details, triggered_by, created_at
		FROM erp_sync_logs
		WHERE tenant_id = $1
		ORDER BY started_at DESC LIMIT 1`, auth.TenantID)

	var log ERPSyncLog
	err := row.Scan(
		&log.ID, &log.TenantID, &log.Status, &log.StartedAt, &log.CompletedAt,
		&log.AssetsSynced, &log.AssetsFailed, &log.ErrorDetails, &log.TriggeredBy,
		&log.CreatedAt,
	)
	if err == nil {
		status.LastSync = &log
	}
	// If no rows, lastSync stays nil — not an error.

	// Total synced assets.
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM assets
		WHERE tenant_id = $1 AND erp_sync_at IS NOT NULL`,
		auth.TenantID,
	).Scan(&status.TotalSynced)

	return status, nil
}

// ──────────────────────────────────────────────
// Asset Financials
// ──────────────────────────────────────────────

// GetAssetFinancials returns the financial details for a specific asset.
func (s *ERPService) GetAssetFinancials(ctx context.Context, assetID uuid.UUID) (*AssetFinancialView, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	var v AssetFinancialView
	err := s.pool.QueryRow(ctx, `
		SELECT id, asset_tag, name,
			purchase_price, purchase_cost, currency,
			current_book_value, depreciation_rate,
			cost_center, po_number, erp_asset_id,
			erp_sync_at, purchase_date
		FROM assets
		WHERE id = $1 AND tenant_id = $2`,
		assetID, auth.TenantID,
	).Scan(
		&v.AssetID, &v.AssetTag, &v.AssetName,
		&v.PurchasePrice, &v.PurchaseCost, &v.Currency,
		&v.CurrentBookValue, &v.DepreciationRate,
		&v.CostCenter, &v.PONumber, &v.ERPAssetID,
		&v.ERPSyncAt, &v.PurchaseDate,
	)
	if err != nil {
		return nil, apperrors.NotFound("asset", assetID.String())
	}

	return &v, nil
}

// SyncSingleAsset syncs financial data for a single asset from ERP.
func (s *ERPService) SyncSingleAsset(ctx context.Context, assetID uuid.UUID) (*AssetFinancialView, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Get asset tag.
	var assetTag string
	err := s.pool.QueryRow(ctx, `
		SELECT asset_tag FROM assets WHERE id = $1 AND tenant_id = $2`,
		assetID, auth.TenantID,
	).Scan(&assetTag)
	if err != nil {
		return nil, apperrors.NotFound("asset", assetID.String())
	}

	// Fetch from ERP connector.
	fin, err := s.connector.GetAssetFinancials(assetTag)
	if err != nil {
		return nil, apperrors.Internal("ERP sync failed", err)
	}

	// Update the asset.
	_, err = s.pool.Exec(ctx, `
		UPDATE assets SET
			purchase_price = $1,
			current_book_value = $2,
			depreciation_rate = $3,
			cost_center = $4,
			po_number = $5,
			erp_asset_id = $6,
			erp_sync_at = $7
		WHERE id = $8 AND tenant_id = $9`,
		fin.PurchasePrice, fin.CurrentBookValue, fin.DepreciationRate,
		fin.CostCenter, fin.PONumber,
		"ORA-FA-"+assetTag,
		time.Now().UTC(),
		assetID, auth.TenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to update asset financials", err)
	}

	return s.GetAssetFinancials(ctx, assetID)
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

func (s *ERPService) getSyncLog(ctx context.Context, id uuid.UUID) (*ERPSyncLog, error) {
	var log ERPSyncLog
	err := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, status, started_at, completed_at,
			assets_synced, assets_failed, error_details, triggered_by, created_at
		FROM erp_sync_logs WHERE id = $1`, id,
	).Scan(
		&log.ID, &log.TenantID, &log.Status, &log.StartedAt, &log.CompletedAt,
		&log.AssetsSynced, &log.AssetsFailed, &log.ErrorDetails, &log.TriggeredBy,
		&log.CreatedAt,
	)
	if err != nil {
		return nil, apperrors.NotFound("erp_sync_log", id.String())
	}
	return &log, nil
}

func (s *ERPService) failSync(ctx context.Context, logID uuid.UUID, synced, failed int, syncErr error) {
	errJSON, _ := json.Marshal([]map[string]string{{"error": syncErr.Error()}})
	_, _ = s.pool.Exec(ctx, `
		UPDATE erp_sync_logs SET
			status = 'failed', completed_at = $1,
			assets_synced = $2, assets_failed = $3,
			error_details = $4
		WHERE id = $5`,
		time.Now().UTC(), synced, failed, errJSON, logID,
	)
}

package cmdb

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// VerificationService handles verification campaign business logic.
type VerificationService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewVerificationService creates a new VerificationService.
func NewVerificationService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *VerificationService {
	return &VerificationService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Campaign CRUD
// ──────────────────────────────────────────────

const campaignColumns = `
	id, tenant_id, name, description, status, scope_filter,
	target_asset_count, verified_count, discrepancy_count,
	started_at, completed_at, created_by, created_at, updated_at`

func scanCampaign(row pgx.Row) (VerificationCampaign, error) {
	var c VerificationCampaign
	err := row.Scan(
		&c.ID, &c.TenantID, &c.Name, &c.Description, &c.Status, &c.ScopeFilter,
		&c.TargetAssetCount, &c.VerifiedCount, &c.DiscrepancyCount,
		&c.StartedAt, &c.CompletedAt, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
	)
	return c, err
}

// CreateCampaign creates a new verification campaign and computes the target asset count.
func (s *VerificationService) CreateCampaign(ctx context.Context, req CreateCampaignRequest) (VerificationCampaign, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VerificationCampaign{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	scopeFilter := req.ScopeFilter
	if scopeFilter == nil {
		scopeFilter = json.RawMessage("{}")
	}

	// Compute target asset count based on scope filter.
	targetCount, err := s.countScopedAssets(ctx, auth.TenantID, scopeFilter)
	if err != nil {
		slog.Warn("failed to compute target count", "error", err)
		targetCount = 0
	}

	query := `
		INSERT INTO asset_verification_campaigns (
			id, tenant_id, name, description, status, scope_filter,
			target_asset_count, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, 'planned', $5, $6, $7, $8, $9)
		RETURNING ` + campaignColumns

	c, err := scanCampaign(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, scopeFilter,
		targetCount, auth.UserID, now, now,
	))
	if err != nil {
		return VerificationCampaign{}, apperrors.Internal("failed to create campaign", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name, "target_count": targetCount})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "create:verification_campaign", EntityType: "verification_campaign",
		EntityID: id, Changes: changes,
	})

	return c, nil
}

// GetCampaign retrieves a single campaign.
func (s *VerificationService) GetCampaign(ctx context.Context, id uuid.UUID) (VerificationCampaign, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VerificationCampaign{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + campaignColumns + ` FROM asset_verification_campaigns WHERE id = $1 AND tenant_id = $2`
	c, err := scanCampaign(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return VerificationCampaign{}, apperrors.NotFound("VerificationCampaign", id.String())
		}
		return VerificationCampaign{}, apperrors.Internal("failed to get campaign", err)
	}
	return c, nil
}

// ListCampaigns returns a paginated list of campaigns.
func (s *VerificationService) ListCampaigns(ctx context.Context, status *string, params types.PaginationParams) ([]VerificationCampaign, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	var total int64
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM asset_verification_campaigns
		 WHERE tenant_id = $1 AND ($2::text IS NULL OR status = $2)`,
		auth.TenantID, status,
	).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count campaigns", err)
	}

	rows, err := s.pool.Query(ctx,
		`SELECT `+campaignColumns+`
		 FROM asset_verification_campaigns
		 WHERE tenant_id = $1 AND ($2::text IS NULL OR status = $2)
		 ORDER BY created_at DESC
		 LIMIT $3 OFFSET $4`,
		auth.TenantID, status, params.Limit, params.Offset(),
	)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list campaigns", err)
	}
	defer rows.Close()

	var campaigns []VerificationCampaign
	for rows.Next() {
		var c VerificationCampaign
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.Name, &c.Description, &c.Status, &c.ScopeFilter,
			&c.TargetAssetCount, &c.VerifiedCount, &c.DiscrepancyCount,
			&c.StartedAt, &c.CompletedAt, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan campaign", err)
		}
		campaigns = append(campaigns, c)
	}
	if campaigns == nil {
		campaigns = []VerificationCampaign{}
	}
	return campaigns, total, nil
}

// StartCampaign transitions a campaign from planned → in_progress.
func (s *VerificationService) StartCampaign(ctx context.Context, id uuid.UUID) (VerificationCampaign, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VerificationCampaign{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		UPDATE asset_verification_campaigns
		SET status = 'in_progress', started_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'planned'
		RETURNING ` + campaignColumns

	c, err := scanCampaign(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return VerificationCampaign{}, apperrors.BadRequest("campaign not found or not in 'planned' status")
		}
		return VerificationCampaign{}, apperrors.Internal("failed to start campaign", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "start:verification_campaign", EntityType: "verification_campaign", EntityID: id,
	})
	return c, nil
}

// CompleteCampaign transitions a campaign from in_progress → completed.
func (s *VerificationService) CompleteCampaign(ctx context.Context, id uuid.UUID) (VerificationCampaign, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VerificationCampaign{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		UPDATE asset_verification_campaigns
		SET status = 'completed', completed_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND status = 'in_progress'
		RETURNING ` + campaignColumns

	c, err := scanCampaign(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return VerificationCampaign{}, apperrors.BadRequest("campaign not found or not in 'in_progress' status")
		}
		return VerificationCampaign{}, apperrors.Internal("failed to complete campaign", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "complete:verification_campaign", EntityType: "verification_campaign", EntityID: id,
	})
	return c, nil
}

// ──────────────────────────────────────────────
// Campaign assets & verification
// ──────────────────────────────────────────────

// CampaignAsset is an asset within a campaign with its verification status.
type CampaignAsset struct {
	ID                 uuid.UUID  `json:"id"`
	AssetTag           string     `json:"assetTag"`
	Name               string     `json:"name"`
	Type               string     `json:"type"`
	Status             string     `json:"status"`
	Location           *string    `json:"location"`
	Building           *string    `json:"building"`
	Floor              *string    `json:"floor"`
	Room               *string    `json:"room"`
	VerificationStatus string     `json:"verificationStatus"`
	LastVerifiedAt     *time.Time `json:"lastVerifiedAt"`
}

// GetCampaignAssets returns assets in scope for a campaign, annotated with whether they're verified in this campaign.
func (s *VerificationService) GetCampaignAssets(ctx context.Context, campaignID uuid.UUID, pendingOnly bool, params types.PaginationParams) ([]CampaignAsset, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Load campaign scope.
	var scopeFilter json.RawMessage
	err := s.pool.QueryRow(ctx,
		`SELECT scope_filter FROM asset_verification_campaigns WHERE id = $1 AND tenant_id = $2`,
		campaignID, auth.TenantID,
	).Scan(&scopeFilter)
	if err != nil {
		return nil, 0, apperrors.NotFound("VerificationCampaign", campaignID.String())
	}

	scopeWhere, scopeArgs := s.buildScopeWhere(auth.TenantID, scopeFilter, 1)
	nextArg := len(scopeArgs) + 1

	pendingClause := ""
	if pendingOnly {
		pendingClause = ` AND a.id NOT IN (
			SELECT asset_id FROM asset_verifications WHERE campaign_id = $` + itoa(nextArg) + `
		)`
		scopeArgs = append(scopeArgs, campaignID)
		nextArg++
	}

	// Count.
	var total int64
	countQ := `SELECT COUNT(*) FROM assets a WHERE ` + scopeWhere + pendingClause
	if err := s.pool.QueryRow(ctx, countQ, scopeArgs...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count campaign assets", err)
	}

	// Data.
	dataQ := `
		SELECT a.id, a.asset_tag, a.name, a.type, a.status,
		       a.location, a.building, a.floor, a.room,
		       COALESCE(a.verification_status, 'unverified'), a.last_verified_at
		FROM assets a
		WHERE ` + scopeWhere + pendingClause + `
		ORDER BY a.name ASC
		LIMIT $` + itoa(nextArg) + ` OFFSET $` + itoa(nextArg+1)
	scopeArgs = append(scopeArgs, params.Limit, params.Offset())

	rows, err := s.pool.Query(ctx, dataQ, scopeArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list campaign assets", err)
	}
	defer rows.Close()

	var assets []CampaignAsset
	for rows.Next() {
		var a CampaignAsset
		if err := rows.Scan(
			&a.ID, &a.AssetTag, &a.Name, &a.Type, &a.Status,
			&a.Location, &a.Building, &a.Floor, &a.Room,
			&a.VerificationStatus, &a.LastVerifiedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan campaign asset", err)
		}
		assets = append(assets, a)
	}
	if assets == nil {
		assets = []CampaignAsset{}
	}
	return assets, total, nil
}

// RecordCampaignVerification records a verification within a campaign and updates counters.
func (s *VerificationService) RecordCampaignVerification(ctx context.Context, campaignID, assetID uuid.UUID, req CampaignVerifyRequest) (AssetVerification, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AssetVerification{}, apperrors.Unauthorized("authentication required")
	}

	// Validate condition.
	if req.Condition != nil && !AssetVerificationConditions[*req.Condition] {
		return AssetVerification{}, apperrors.Validation("condition", "must be one of: good, fair, poor, damaged, missing, not_found")
	}

	// Verify campaign is in_progress.
	var campaignStatus string
	err := s.pool.QueryRow(ctx,
		`SELECT status FROM asset_verification_campaigns WHERE id = $1 AND tenant_id = $2`,
		campaignID, auth.TenantID,
	).Scan(&campaignStatus)
	if err != nil {
		return AssetVerification{}, apperrors.NotFound("VerificationCampaign", campaignID.String())
	}
	if campaignStatus != "in_progress" {
		return AssetVerification{}, apperrors.BadRequest("campaign must be in 'in_progress' status")
	}

	now := time.Now().UTC()
	id := uuid.New()

	discrepancy := "none"
	if req.DiscrepancyType != nil && *req.DiscrepancyType != "" {
		discrepancy = *req.DiscrepancyType
	}
	photoIDs := req.PhotoEvidenceIDs
	if photoIDs == nil {
		photoIDs = []uuid.UUID{}
	}

	// Derive verification_status for the asset.
	verificationStatus := "verified"
	if discrepancy != "none" {
		verificationStatus = "discrepancy"
	}
	if req.Condition != nil && (*req.Condition == "missing" || *req.Condition == "not_found") {
		verificationStatus = "discrepancy"
		if discrepancy == "none" {
			discrepancy = "missing"
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return AssetVerification{}, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Insert verification.
	var v AssetVerification
	err = tx.QueryRow(ctx, `
		INSERT INTO asset_verifications (
			id, tenant_id, campaign_id, asset_id, verifier_id, verified_at,
			location_confirmed, condition, actual_location, notes,
			photo_evidence_ids, discrepancy_type
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, tenant_id, asset_id, verifier_id, verified_at,
		          location_confirmed, condition, notes, photo_evidence_ids`,
		id, auth.TenantID, campaignID, assetID, auth.UserID, now,
		req.LocationConfirmed, req.Condition, req.ActualLocation, req.Notes,
		photoIDs, discrepancy,
	).Scan(
		&v.ID, &v.TenantID, &v.AssetID, &v.VerifierID, &v.VerifiedAt,
		&v.LocationConfirmed, &v.Condition, &v.Notes, &v.PhotoEvidenceIDs,
	)
	if err != nil {
		return AssetVerification{}, apperrors.Internal("failed to insert verification", err)
	}

	// Update asset.
	_, err = tx.Exec(ctx,
		`UPDATE assets SET last_verified_at = $1, last_verified_by = $2,
		 verification_status = $3, updated_at = $4 WHERE id = $5`,
		now, auth.UserID, verificationStatus, now, assetID,
	)
	if err != nil {
		return AssetVerification{}, apperrors.Internal("failed to update asset verification status", err)
	}

	// Update campaign counters.
	_, err = tx.Exec(ctx,
		`UPDATE asset_verification_campaigns SET
		 verified_count = verified_count + 1,
		 discrepancy_count = discrepancy_count + CASE WHEN $1 != 'none' THEN 1 ELSE 0 END
		 WHERE id = $2`,
		discrepancy, campaignID,
	)
	if err != nil {
		return AssetVerification{}, apperrors.Internal("failed to update campaign counters", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return AssetVerification{}, apperrors.Internal("failed to commit verification", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID: auth.TenantID, ActorID: auth.UserID,
		Action: "verify:asset", EntityType: "asset_verification", EntityID: id,
	})

	return v, nil
}

// BulkVerify verifies multiple assets at once (outside or inside a campaign).
func (s *VerificationService) BulkVerify(ctx context.Context, req BulkVerifyRequest) (int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return 0, apperrors.Unauthorized("authentication required")
	}

	if len(req.AssetIDs) == 0 {
		return 0, apperrors.BadRequest("at least one asset ID required")
	}

	now := time.Now().UTC()
	condition := "good"
	if req.Condition != nil {
		condition = *req.Condition
	}
	discrepancy := "none"
	verified := 0

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	for _, assetID := range req.AssetIDs {
		vID := uuid.New()
		_, err := tx.Exec(ctx, `
			INSERT INTO asset_verifications (
				id, tenant_id, campaign_id, asset_id, verifier_id, verified_at,
				location_confirmed, condition, discrepancy_type
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			vID, auth.TenantID, req.CampaignID, assetID, auth.UserID, now,
			true, condition, discrepancy,
		)
		if err != nil {
			slog.Warn("bulk verify: failed to insert", "asset_id", assetID, "error", err)
			continue
		}

		_, _ = tx.Exec(ctx,
			`UPDATE assets SET last_verified_at = $1, last_verified_by = $2,
			 verification_status = 'verified', updated_at = $3 WHERE id = $4 AND tenant_id = $5`,
			now, auth.UserID, now, assetID, auth.TenantID,
		)
		verified++
	}

	// Update campaign counters if campaign specified.
	if req.CampaignID != nil && verified > 0 {
		_, _ = tx.Exec(ctx,
			`UPDATE asset_verification_campaigns SET verified_count = verified_count + $1 WHERE id = $2`,
			verified, *req.CampaignID,
		)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, apperrors.Internal("failed to commit bulk verification", err)
	}

	return verified, nil
}

// GetVerificationStats returns verification status summary across all assets.
func (s *VerificationService) GetVerificationStats(ctx context.Context) (VerificationStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return VerificationStats{}, apperrors.Unauthorized("authentication required")
	}

	var stats VerificationStats
	err := s.pool.QueryRow(ctx, `
		SELECT
		  COUNT(*) FILTER (WHERE status != 'disposed') AS total,
		  COUNT(*) FILTER (WHERE verification_status = 'verified' AND status != 'disposed') AS verified,
		  COUNT(*) FILTER (WHERE verification_status = 'unverified' AND status != 'disposed') AS unverified,
		  COUNT(*) FILTER (WHERE verification_status = 'discrepancy' AND status != 'disposed') AS discrepancy,
		  COUNT(*) FILTER (WHERE verification_status = 'overdue' AND status != 'disposed'
		      OR (last_verified_at < NOW() - INTERVAL '90 days' AND status != 'disposed')) AS overdue
		FROM assets WHERE tenant_id = $1`,
		auth.TenantID,
	).Scan(&stats.Total, &stats.Verified, &stats.Unverified, &stats.Discrepancy, &stats.Overdue)
	if err != nil {
		return VerificationStats{}, apperrors.Internal("failed to get verification stats", err)
	}

	return stats, nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

func (s *VerificationService) countScopedAssets(ctx context.Context, tenantID uuid.UUID, scopeFilter json.RawMessage) (int, error) {
	where, args := s.buildScopeWhere(tenantID, scopeFilter, 1)
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets a WHERE `+where, args...).Scan(&count)
	return count, err
}

// buildScopeWhere builds a WHERE clause for filtering assets by campaign scope.
func (s *VerificationService) buildScopeWhere(tenantID uuid.UUID, scopeFilter json.RawMessage, startParam int) (string, []any) {
	args := []any{tenantID}
	where := `a.tenant_id = $` + itoa(startParam) + ` AND a.status != 'disposed'`
	nextArg := startParam + 1

	var scope struct {
		AssetTypes []string    `json:"asset_types"`
		Locations  []string    `json:"locations"`
		OrgUnitIDs []uuid.UUID `json:"org_unit_ids"`
	}
	if err := json.Unmarshal(scopeFilter, &scope); err != nil {
		return where, args
	}

	if len(scope.AssetTypes) > 0 {
		where += ` AND a.type = ANY($` + itoa(nextArg) + `)`
		args = append(args, scope.AssetTypes)
		nextArg++
	}
	if len(scope.Locations) > 0 {
		where += ` AND (a.location = ANY($` + itoa(nextArg) + `) OR a.building = ANY($` + itoa(nextArg) + `))`
		args = append(args, scope.Locations)
		nextArg++
	}
	if len(scope.OrgUnitIDs) > 0 {
		where += ` AND a.owner_id IN (SELECT id FROM users WHERE org_unit_id = ANY($` + itoa(nextArg) + `))`
		args = append(args, scope.OrgUnitIDs)
	}

	return where, args
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

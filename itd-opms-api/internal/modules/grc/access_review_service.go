package grc

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
// AccessReviewService
// ──────────────────────────────────────────────

// AccessReviewService handles business logic for access review campaigns and entries.
type AccessReviewService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewAccessReviewService creates a new AccessReviewService.
func NewAccessReviewService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *AccessReviewService {
	return &AccessReviewService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Campaigns
// ──────────────────────────────────────────────

// CreateCampaign creates a new access review campaign.
func (s *AccessReviewService) CreateCampaign(ctx context.Context, req CreateAccessReviewCampaignRequest) (AccessReviewCampaign, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AccessReviewCampaign{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO access_review_campaigns (
			id, tenant_id, title, scope, status,
			reviewer_ids, due_date, completion_rate,
			created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11
		)
		RETURNING id, tenant_id, title, scope, status,
			reviewer_ids, due_date, completion_rate,
			created_by, created_at, updated_at`

	initialStatus := AccessReviewStatusPlanned

	var c AccessReviewCampaign
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Title, req.Scope, initialStatus,
		req.ReviewerIDs, req.DueDate, 0.0,
		auth.UserID, now, now,
	).Scan(
		&c.ID, &c.TenantID, &c.Title, &c.Scope, &c.Status,
		&c.ReviewerIDs, &c.DueDate, &c.CompletionRate,
		&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return AccessReviewCampaign{}, apperrors.Internal("failed to create access review campaign", err)
	}

	changes, _ := json.Marshal(map[string]any{"title": req.Title})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:access_review_campaign",
		EntityType: "access_review_campaign",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return c, nil
}

// GetCampaign retrieves a single access review campaign by ID.
func (s *AccessReviewService) GetCampaign(ctx context.Context, id uuid.UUID) (AccessReviewCampaign, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AccessReviewCampaign{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, title, scope, status,
			reviewer_ids, due_date, completion_rate,
			created_by, created_at, updated_at
		FROM access_review_campaigns
		WHERE id = $1 AND tenant_id = $2`

	var c AccessReviewCampaign
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&c.ID, &c.TenantID, &c.Title, &c.Scope, &c.Status,
		&c.ReviewerIDs, &c.DueDate, &c.CompletionRate,
		&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return AccessReviewCampaign{}, apperrors.NotFound("AccessReviewCampaign", id.String())
		}
		return AccessReviewCampaign{}, apperrors.Internal("failed to get access review campaign", err)
	}

	return c, nil
}

// ListCampaigns returns a filtered, paginated list of access review campaigns.
func (s *AccessReviewService) ListCampaigns(ctx context.Context, status *string, page, limit int) ([]AccessReviewCampaign, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	countQuery := `
		SELECT COUNT(*)
		FROM access_review_campaigns
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count access review campaigns", err)
	}

	dataQuery := `
		SELECT id, tenant_id, title, scope, status,
			reviewer_ids, due_date, completion_rate,
			created_by, created_at, updated_at
		FROM access_review_campaigns
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list access review campaigns", err)
	}
	defer rows.Close()

	var campaigns []AccessReviewCampaign
	for rows.Next() {
		var c AccessReviewCampaign
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.Title, &c.Scope, &c.Status,
			&c.ReviewerIDs, &c.DueDate, &c.CompletionRate,
			&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan access review campaign", err)
		}
		campaigns = append(campaigns, c)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate access review campaigns", err)
	}

	if campaigns == nil {
		campaigns = []AccessReviewCampaign{}
	}

	return campaigns, total, nil
}

// UpdateCampaign updates an existing access review campaign using COALESCE partial update.
func (s *AccessReviewService) UpdateCampaign(ctx context.Context, id uuid.UUID, req UpdateAccessReviewCampaignRequest) (AccessReviewCampaign, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AccessReviewCampaign{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetCampaign(ctx, id); err != nil {
		return AccessReviewCampaign{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE access_review_campaigns SET
			title = COALESCE($1, title),
			scope = COALESCE($2, scope),
			status = COALESCE($3, status),
			reviewer_ids = COALESCE($4, reviewer_ids),
			due_date = COALESCE($5, due_date),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, title, scope, status,
			reviewer_ids, due_date, completion_rate,
			created_by, created_at, updated_at`

	var c AccessReviewCampaign
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Scope, req.Status,
		req.ReviewerIDs, req.DueDate,
		now, id, auth.TenantID,
	).Scan(
		&c.ID, &c.TenantID, &c.Title, &c.Scope, &c.Status,
		&c.ReviewerIDs, &c.DueDate, &c.CompletionRate,
		&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return AccessReviewCampaign{}, apperrors.Internal("failed to update access review campaign", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:access_review_campaign",
		EntityType: "access_review_campaign",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return c, nil
}

// ──────────────────────────────────────────────
// Entries
// ──────────────────────────────────────────────

// CreateEntry creates a new access review entry within a campaign.
func (s *AccessReviewService) CreateEntry(ctx context.Context, campaignID uuid.UUID, req CreateAccessReviewEntryRequest) (AccessReviewEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AccessReviewEntry{}, apperrors.Unauthorized("authentication required")
	}

	// Verify campaign exists
	if _, err := s.GetCampaign(ctx, campaignID); err != nil {
		return AccessReviewEntry{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO access_review_entries (
			id, campaign_id, tenant_id, user_id, role_id,
			created_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6
		)
		RETURNING id, campaign_id, tenant_id, user_id, role_id,
			reviewer_id, decision, justification, exception_expiry,
			decided_at, created_at`

	var e AccessReviewEntry
	err := s.pool.QueryRow(ctx, query,
		id, campaignID, auth.TenantID, req.UserID, req.RoleID,
		now,
	).Scan(
		&e.ID, &e.CampaignID, &e.TenantID, &e.UserID, &e.RoleID,
		&e.ReviewerID, &e.Decision, &e.Justification, &e.ExceptionExpiry,
		&e.DecidedAt, &e.CreatedAt,
	)
	if err != nil {
		return AccessReviewEntry{}, apperrors.Internal("failed to create access review entry", err)
	}

	changes, _ := json.Marshal(map[string]any{"userId": req.UserID, "campaignId": campaignID})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:access_review_entry",
		EntityType: "access_review_entry",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return e, nil
}

// ListEntries returns access review entries for a campaign, optionally filtered by decision.
func (s *AccessReviewService) ListEntries(ctx context.Context, campaignID uuid.UUID, decision *string) ([]AccessReviewEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, campaign_id, tenant_id, user_id, role_id,
			reviewer_id, decision, justification, exception_expiry,
			decided_at, created_at
		FROM access_review_entries
		WHERE campaign_id = $1 AND tenant_id = $2
			AND ($3::text IS NULL OR decision = $3)
		ORDER BY created_at ASC`

	rows, err := s.pool.Query(ctx, query, campaignID, auth.TenantID, decision)
	if err != nil {
		return nil, apperrors.Internal("failed to list access review entries", err)
	}
	defer rows.Close()

	var entries []AccessReviewEntry
	for rows.Next() {
		var e AccessReviewEntry
		if err := rows.Scan(
			&e.ID, &e.CampaignID, &e.TenantID, &e.UserID, &e.RoleID,
			&e.ReviewerID, &e.Decision, &e.Justification, &e.ExceptionExpiry,
			&e.DecidedAt, &e.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan access review entry", err)
		}
		entries = append(entries, e)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate access review entries", err)
	}

	if entries == nil {
		entries = []AccessReviewEntry{}
	}

	return entries, nil
}

// RecordDecision records a decision for an access review entry and recalculates the campaign completion rate.
func (s *AccessReviewService) RecordDecision(ctx context.Context, entryID uuid.UUID, req RecordDecisionRequest) (AccessReviewEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return AccessReviewEntry{}, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE access_review_entries SET
			decision = $1,
			justification = $2,
			exception_expiry = $3,
			reviewer_id = $4,
			decided_at = $5
		WHERE id = $6 AND tenant_id = $7
		RETURNING id, campaign_id, tenant_id, user_id, role_id,
			reviewer_id, decision, justification, exception_expiry,
			decided_at, created_at`

	var e AccessReviewEntry
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Decision, req.Justification, req.ExceptionExpiry,
		auth.UserID, now,
		entryID, auth.TenantID,
	).Scan(
		&e.ID, &e.CampaignID, &e.TenantID, &e.UserID, &e.RoleID,
		&e.ReviewerID, &e.Decision, &e.Justification, &e.ExceptionExpiry,
		&e.DecidedAt, &e.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return AccessReviewEntry{}, apperrors.NotFound("AccessReviewEntry", entryID.String())
		}
		return AccessReviewEntry{}, apperrors.Internal("failed to record decision", err)
	}

	// Recalculate completion rate for the campaign
	if err := s.RecalculateCompletionRate(ctx, e.CampaignID); err != nil {
		slog.ErrorContext(ctx, "failed to recalculate completion rate", "error", err)
	}

	changes, _ := json.Marshal(map[string]any{"decision": req.Decision, "entryId": entryID})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "decide:access_review_entry",
		EntityType: "access_review_entry",
		EntityID:   entryID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return e, nil
}

// RecalculateCompletionRate recalculates the completion rate for a campaign based on decided entries.
func (s *AccessReviewService) RecalculateCompletionRate(ctx context.Context, campaignID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE decision IS NOT NULL) AS decided
		FROM access_review_entries
		WHERE campaign_id = $1 AND tenant_id = $2`

	var total, decided int
	err := s.pool.QueryRow(ctx, query, campaignID, auth.TenantID).Scan(&total, &decided)
	if err != nil {
		return apperrors.Internal("failed to calculate completion rate", err)
	}

	var rate float64
	if total > 0 {
		rate = float64(decided) / float64(total) * 100.0
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE access_review_campaigns SET
			completion_rate = $1,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4`

	if _, err := s.pool.Exec(ctx, updateQuery, rate, now, campaignID, auth.TenantID); err != nil {
		return apperrors.Internal("failed to update completion rate", err)
	}

	return nil
}

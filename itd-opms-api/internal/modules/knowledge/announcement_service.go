package knowledge

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
// AnnouncementService
// ──────────────────────────────────────────────

// AnnouncementService handles business logic for announcements.
type AnnouncementService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewAnnouncementService creates a new AnnouncementService.
func NewAnnouncementService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *AnnouncementService {
	return &AnnouncementService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helper
// ──────────────────────────────────────────────

// announcementColumns is the standard SELECT column list for announcements.
const announcementColumns = `id, tenant_id, title, content, priority,
	target_audience, target_ids, published_at, expires_at,
	author_id, is_active, org_unit_id, created_at, updated_at`

// scanAnnouncement scans a single Announcement from a pgx.Row.
func scanAnnouncement(row pgx.Row) (Announcement, error) {
	var a Announcement
	err := row.Scan(
		&a.ID, &a.TenantID, &a.Title, &a.Content, &a.Priority,
		&a.TargetAudience, &a.TargetIDs, &a.PublishedAt, &a.ExpiresAt,
		&a.AuthorID, &a.IsActive, &a.OrgUnitID, &a.CreatedAt, &a.UpdatedAt,
	)
	return a, err
}

// ──────────────────────────────────────────────
// Announcement CRUD
// ──────────────────────────────────────────────

// CreateAnnouncement creates a new announcement.
func (s *AnnouncementService) CreateAnnouncement(ctx context.Context, req CreateAnnouncementRequest) (Announcement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Announcement{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	targetIDs := req.TargetIDs
	if targetIDs == nil {
		targetIDs = []uuid.UUID{}
	}

	// Derive org_unit_id from auth context; use NULL if not set.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		oid := auth.OrgUnitID
		orgUnitID = &oid
	}

	query := `
		INSERT INTO announcements (
			id, tenant_id, title, content, priority,
			target_audience, target_ids, published_at, expires_at,
			author_id, is_active, org_unit_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13, $14
		)
		RETURNING ` + announcementColumns

	a, err := scanAnnouncement(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Title, req.Content, req.Priority,
		req.TargetAudience, targetIDs, now, req.ExpiresAt,
		auth.UserID, true, orgUnitID, now, now,
	))
	if err != nil {
		return Announcement{}, apperrors.Internal("failed to create announcement", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"title":    req.Title,
		"priority": req.Priority,
		"audience": req.TargetAudience,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:announcement",
		EntityType: "announcement",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return a, nil
}

// GetAnnouncement retrieves a single announcement by ID.
func (s *AnnouncementService) GetAnnouncement(ctx context.Context, id uuid.UUID) (Announcement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Announcement{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + announcementColumns + ` FROM announcements WHERE id = $1 AND tenant_id = $2`

	a, err := scanAnnouncement(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return Announcement{}, apperrors.NotFound("Announcement", id.String())
		}
		return Announcement{}, apperrors.Internal("failed to get announcement", err)
	}

	// Org-scope access check.
	if a.OrgUnitID != nil && !auth.HasOrgAccess(*a.OrgUnitID) {
		return Announcement{}, apperrors.NotFound("Announcement", id.String())
	}

	return a, nil
}

// ListAnnouncements returns a filtered, paginated list of announcements.
func (s *AnnouncementService) ListAnnouncements(ctx context.Context, isActive *bool, params types.PaginationParams) ([]Announcement, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter clause.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 3)

	countQuery := `
		SELECT COUNT(*)
		FROM announcements
		WHERE tenant_id = $1
			AND ($2::boolean IS NULL OR is_active = $2)`

	countArgs := []interface{}{auth.TenantID, isActive}
	if orgClause != "" {
		countQuery += ` AND ` + orgClause
		if orgParam != nil {
			countArgs = append(countArgs, orgParam)
		}
	}

	var total int
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count announcements", err)
	}

	// Determine next param index after the org filter (if any).
	nextIdx := 3
	if orgClause != "" && orgParam != nil {
		nextIdx = 4
	}

	dataQuery := fmt.Sprintf(`
		SELECT `+announcementColumns+`
		FROM announcements
		WHERE tenant_id = $1
			AND ($2::boolean IS NULL OR is_active = $2)%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`,
		func() string {
			if orgClause != "" {
				return " AND " + orgClause
			}
			return ""
		}(), nextIdx, nextIdx+1)

	dataArgs := []interface{}{auth.TenantID, isActive}
	if orgClause != "" && orgParam != nil {
		dataArgs = append(dataArgs, orgParam)
	}
	dataArgs = append(dataArgs, params.Limit, params.Offset())

	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list announcements", err)
	}
	defer rows.Close()

	var announcements []Announcement
	for rows.Next() {
		var a Announcement
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.Title, &a.Content, &a.Priority,
			&a.TargetAudience, &a.TargetIDs, &a.PublishedAt, &a.ExpiresAt,
			&a.AuthorID, &a.IsActive, &a.OrgUnitID, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan announcement", err)
		}
		announcements = append(announcements, a)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate announcements", err)
	}

	if announcements == nil {
		announcements = []Announcement{}
	}

	return announcements, total, nil
}

// UpdateAnnouncement updates an existing announcement using COALESCE partial update.
func (s *AnnouncementService) UpdateAnnouncement(ctx context.Context, id uuid.UUID, req UpdateAnnouncementRequest) (Announcement, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Announcement{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetAnnouncement(ctx, id); err != nil {
		return Announcement{}, err
	}

	now := time.Now().UTC()

	// For target_ids, pass nil if empty to let COALESCE keep existing value.
	var targetIDsParam []uuid.UUID
	if len(req.TargetIDs) > 0 {
		targetIDsParam = req.TargetIDs
	}

	updateQuery := `
		UPDATE announcements SET
			title = COALESCE($1, title),
			content = COALESCE($2, content),
			priority = COALESCE($3, priority),
			target_audience = COALESCE($4, target_audience),
			target_ids = COALESCE($5, target_ids),
			is_active = COALESCE($6, is_active),
			expires_at = COALESCE($7, expires_at),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING ` + announcementColumns

	a, err := scanAnnouncement(s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Content, req.Priority,
		req.TargetAudience, targetIDsParam, req.IsActive, req.ExpiresAt,
		now, id, auth.TenantID,
	))
	if err != nil {
		return Announcement{}, apperrors.Internal("failed to update announcement", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:announcement",
		EntityType: "announcement",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return a, nil
}

// DeleteAnnouncement deletes an announcement by ID.
func (s *AnnouncementService) DeleteAnnouncement(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM announcements WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete announcement", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Announcement", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:announcement",
		EntityType: "announcement",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

package release

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ReleaseService handles all release management business logic.
type ReleaseService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	js       nats.JetStreamContext
}

// NewReleaseService creates a new ReleaseService.
func NewReleaseService(pool *pgxpool.Pool, auditSvc *audit.AuditService, js nats.JetStreamContext) *ReleaseService {
	return &ReleaseService{pool: pool, auditSvc: auditSvc, js: js}
}

// ──────────────────────────────────────────────
// Releases CRUD
// ──────────────────────────────────────────────

// ListReleases returns a paginated list of releases with optional filters.
func (s *ReleaseService) ListReleases(ctx context.Context, status, releaseType, environment *string, managerID *uuid.UUID, limit, offset int) ([]Release, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Forbidden("authentication required")
	}

	// Count query
	countQuery := `
		SELECT COUNT(*) FROM releases
		WHERE tenant_id = $1
		  AND ($2::text IS NULL OR status = $2)
		  AND ($3::text IS NULL OR release_type = $3)
		  AND ($4::text IS NULL OR environment = $4)
		  AND ($5::uuid IS NULL OR release_manager_id = $5)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, status, releaseType, environment, managerID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count releases", err)
	}

	// Data query
	query := `
		SELECT r.id, r.tenant_id, r.release_number, r.title, r.description,
		       r.release_type, r.status, r.planned_start, r.planned_end,
		       r.actual_start, r.actual_end, r.release_manager_id, r.deployment_team,
		       r.environment, r.deployment_plan, r.rollback_plan, r.risk_assessment,
		       r.readiness_checklist, r.change_ticket_ids, r.implementation_certificate,
		       r.close_out_report, r.lessons_learned, r.created_by, r.created_at, r.updated_at,
		       mgr.display_name AS release_manager_name,
		       cr.display_name AS created_by_name
		FROM releases r
		LEFT JOIN users mgr ON mgr.id = r.release_manager_id
		LEFT JOIN users cr ON cr.id = r.created_by
		WHERE r.tenant_id = $1
		  AND ($2::text IS NULL OR r.status = $2)
		  AND ($3::text IS NULL OR r.release_type = $3)
		  AND ($4::text IS NULL OR r.environment = $4)
		  AND ($5::uuid IS NULL OR r.release_manager_id = $5)
		ORDER BY r.created_at DESC
		LIMIT $6 OFFSET $7`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, status, releaseType, environment, managerID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list releases", err)
	}
	defer rows.Close()

	var releases []Release
	for rows.Next() {
		r, err := scanRelease(rows)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to scan release", err)
		}
		releases = append(releases, r)
	}

	if releases == nil {
		releases = []Release{}
	}
	return releases, total, nil
}

// GetRelease returns a single release with all sub-resources.
func (s *ReleaseService) GetRelease(ctx context.Context, id uuid.UUID) (*ReleaseWithDetails, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	query := `
		SELECT r.id, r.tenant_id, r.release_number, r.title, r.description,
		       r.release_type, r.status, r.planned_start, r.planned_end,
		       r.actual_start, r.actual_end, r.release_manager_id, r.deployment_team,
		       r.environment, r.deployment_plan, r.rollback_plan, r.risk_assessment,
		       r.readiness_checklist, r.change_ticket_ids, r.implementation_certificate,
		       r.close_out_report, r.lessons_learned, r.created_by, r.created_at, r.updated_at,
		       mgr.display_name AS release_manager_name,
		       cr.display_name AS created_by_name
		FROM releases r
		LEFT JOIN users mgr ON mgr.id = r.release_manager_id
		LEFT JOIN users cr ON cr.id = r.created_by
		WHERE r.id = $1 AND r.tenant_id = $2`

	rel, err := scanRelease(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("release", id.String())
		}
		return nil, apperrors.Internal("failed to get release", err)
	}

	result := &ReleaseWithDetails{Release: rel}

	// Load items
	result.Items, err = s.listReleaseItemsInternal(ctx, id, auth.TenantID)
	if err != nil {
		return nil, err
	}

	// Load deployments
	result.Deployments, err = s.listReleaseDeploymentsInternal(ctx, id, auth.TenantID)
	if err != nil {
		return nil, err
	}

	// Load approvals
	result.Approvals, err = s.listReleaseApprovalsInternal(ctx, id, auth.TenantID)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// CreateRelease creates a new release.
func (s *ReleaseService) CreateRelease(ctx context.Context, req CreateReleaseRequest) (*Release, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	env := req.Environment
	if env == "" {
		env = "production"
	}

	deploymentTeam := req.DeploymentTeam
	if deploymentTeam == nil {
		deploymentTeam = []uuid.UUID{}
	}

	changeTicketIDs := req.ChangeTicketIDs
	if changeTicketIDs == nil {
		changeTicketIDs = []uuid.UUID{}
	}

	riskAssessment := req.RiskAssessment
	if riskAssessment == nil {
		riskAssessment = json.RawMessage(`{}`)
	}

	readinessChecklist := req.ReadinessChecklist
	if readinessChecklist == nil {
		readinessChecklist = json.RawMessage(`[]`)
	}

	query := `
		INSERT INTO releases (
			tenant_id, title, description, release_type, environment,
			planned_start, planned_end, release_manager_id, deployment_team,
			deployment_plan, rollback_plan, risk_assessment, readiness_checklist,
			change_ticket_ids, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, tenant_id, release_number, title, description,
		          release_type, status, planned_start, planned_end,
		          actual_start, actual_end, release_manager_id, deployment_team,
		          environment, deployment_plan, rollback_plan, risk_assessment,
		          readiness_checklist, change_ticket_ids, implementation_certificate,
		          close_out_report, lessons_learned, created_by, created_at, updated_at`

	rel, err := scanReleaseBasic(s.pool.QueryRow(ctx, query,
		auth.TenantID, req.Title, req.Description, req.ReleaseType, env,
		req.PlannedStart, req.PlannedEnd, req.ReleaseManagerID, deploymentTeam,
		req.DeploymentPlan, req.RollbackPlan, riskAssessment, readinessChecklist,
		changeTicketIDs, auth.UserID,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to create release", err)
	}

	// Audit log
	changes, _ := json.Marshal(map[string]any{
		"releaseNumber": rel.ReleaseNumber,
		"releaseType":   rel.ReleaseType,
		"environment":   rel.Environment,
		"status":        rel.Status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:release",
		EntityType: "release",
		EntityID:   rel.ID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// NATS event
	s.publishEvent("notify.release.created", rel.ID, auth, map[string]any{
		"releaseNumber": rel.ReleaseNumber,
		"title":         rel.Title,
		"releaseType":   rel.ReleaseType,
		"actionUrl":     fmt.Sprintf("/dashboard/releases/%s", rel.ID),
	})

	return &rel, nil
}

// UpdateRelease updates a release.
func (s *ReleaseService) UpdateRelease(ctx context.Context, id uuid.UUID, req UpdateReleaseRequest) (*Release, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	query := `
		UPDATE releases SET
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			release_type = COALESCE($5, release_type),
			environment = COALESCE($6, environment),
			planned_start = COALESCE($7, planned_start),
			planned_end = COALESCE($8, planned_end),
			release_manager_id = COALESCE($9, release_manager_id),
			deployment_plan = COALESCE($10, deployment_plan),
			rollback_plan = COALESCE($11, rollback_plan),
			risk_assessment = COALESCE($12, risk_assessment),
			readiness_checklist = COALESCE($13, readiness_checklist),
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, release_number, title, description,
		          release_type, status, planned_start, planned_end,
		          actual_start, actual_end, release_manager_id, deployment_team,
		          environment, deployment_plan, rollback_plan, risk_assessment,
		          readiness_checklist, change_ticket_ids, implementation_certificate,
		          close_out_report, lessons_learned, created_by, created_at, updated_at`

	rel, err := scanReleaseBasic(s.pool.QueryRow(ctx, query,
		id, auth.TenantID,
		req.Title, req.Description, req.ReleaseType, req.Environment,
		req.PlannedStart, req.PlannedEnd, req.ReleaseManagerID,
		req.DeploymentPlan, req.RollbackPlan, req.RiskAssessment, req.ReadinessChecklist,
	))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("release", id.String())
		}
		return nil, apperrors.Internal("failed to update release", err)
	}

	changes, _ := json.Marshal(map[string]any{"updated": true})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:release",
		EntityType: "release",
		EntityID:   rel.ID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &rel, nil
}

// ──────────────────────────────────────────────
// State transitions
// ──────────────────────────────────────────────

// TransitionRelease validates and transitions a release to a new status.
func (s *ReleaseService) TransitionRelease(ctx context.Context, id uuid.UUID, req TransitionReleaseRequest) (*Release, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	// Get current status
	var currentStatus string
	err := s.pool.QueryRow(ctx,
		`SELECT status FROM releases WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("release", id.String())
		}
		return nil, apperrors.Internal("failed to get release status", err)
	}

	if err := workflow.ReleaseStateMachine.Validate(currentStatus, req.TargetStatus); err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	query := `
		UPDATE releases SET status = $3, updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, release_number, title, description,
		          release_type, status, planned_start, planned_end,
		          actual_start, actual_end, release_manager_id, deployment_team,
		          environment, deployment_plan, rollback_plan, risk_assessment,
		          readiness_checklist, change_ticket_ids, implementation_certificate,
		          close_out_report, lessons_learned, created_by, created_at, updated_at`

	rel, err := scanReleaseBasic(s.pool.QueryRow(ctx, query, id, auth.TenantID, req.TargetStatus))
	if err != nil {
		return nil, apperrors.Internal("failed to transition release", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"status": map[string]string{"from": currentStatus, "to": req.TargetStatus},
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:release",
		EntityType: "release",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &rel, nil
}

// DeployRelease transitions to deploying, creates a deployment record, and sets actual_start.
func (s *ReleaseService) DeployRelease(ctx context.Context, id uuid.UUID, req DeployReleaseRequest) (*Release, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	var currentStatus, env string
	err := s.pool.QueryRow(ctx,
		`SELECT status, environment FROM releases WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&currentStatus, &env)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("release", id.String())
		}
		return nil, apperrors.Internal("failed to get release", err)
	}

	if err := workflow.ReleaseStateMachine.Validate(currentStatus, workflow.ReleaseDeploying); err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	now := time.Now()
	deployEnv := req.Environment
	if deployEnv == "" {
		deployEnv = env
	}

	query := `
		UPDATE releases SET status = 'deploying', actual_start = COALESCE(actual_start, $3), updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, release_number, title, description,
		          release_type, status, planned_start, planned_end,
		          actual_start, actual_end, release_manager_id, deployment_team,
		          environment, deployment_plan, rollback_plan, risk_assessment,
		          readiness_checklist, change_ticket_ids, implementation_certificate,
		          close_out_report, lessons_learned, created_by, created_at, updated_at`

	rel, err := scanReleaseBasic(s.pool.QueryRow(ctx, query, id, auth.TenantID, now))
	if err != nil {
		return nil, apperrors.Internal("failed to deploy release", err)
	}

	// Create deployment record
	_, err = s.pool.Exec(ctx, `
		INSERT INTO release_deployments (tenant_id, release_id, environment, deployment_type, deployed_by, notes, started_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress')`,
		auth.TenantID, id, deployEnv, req.DeploymentType, auth.UserID, req.Notes, now,
	)
	if err != nil {
		slog.ErrorContext(ctx, "failed to create deployment record", "error", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"status": map[string]string{"from": currentStatus, "to": "deploying"},
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "deploy:release",
		EntityType: "release",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	s.publishEvent("notify.release.deploying", id, auth, map[string]any{
		"releaseNumber": rel.ReleaseNumber,
		"title":         rel.Title,
		"environment":   deployEnv,
		"actionUrl":     fmt.Sprintf("/dashboard/releases/%s", id),
	})

	return &rel, nil
}

// RollbackRelease transitions to rolled_back and sets actual_end.
func (s *ReleaseService) RollbackRelease(ctx context.Context, id uuid.UUID, req RollbackReleaseRequest) (*Release, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	var currentStatus string
	err := s.pool.QueryRow(ctx,
		`SELECT status FROM releases WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("release", id.String())
		}
		return nil, apperrors.Internal("failed to get release", err)
	}

	if err := workflow.ReleaseStateMachine.Validate(currentStatus, workflow.ReleaseRolledBack); err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	now := time.Now()
	query := `
		UPDATE releases SET status = 'rolled_back', actual_end = $3, updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, release_number, title, description,
		          release_type, status, planned_start, planned_end,
		          actual_start, actual_end, release_manager_id, deployment_team,
		          environment, deployment_plan, rollback_plan, risk_assessment,
		          readiness_checklist, change_ticket_ids, implementation_certificate,
		          close_out_report, lessons_learned, created_by, created_at, updated_at`

	rel, err := scanReleaseBasic(s.pool.QueryRow(ctx, query, id, auth.TenantID, now))
	if err != nil {
		return nil, apperrors.Internal("failed to rollback release", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"status": map[string]string{"from": currentStatus, "to": "rolled_back"},
		"reason": req.Reason,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "rollback:release",
		EntityType: "release",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	s.publishEvent("notify.release.rolled_back", id, auth, map[string]any{
		"releaseNumber": rel.ReleaseNumber,
		"title":         rel.Title,
		"reason":        req.Reason,
		"actionUrl":     fmt.Sprintf("/dashboard/releases/%s", id),
	})

	return &rel, nil
}

// CloseRelease transitions to closed and records close-out report + lessons learned.
func (s *ReleaseService) CloseRelease(ctx context.Context, id uuid.UUID, req CloseReleaseRequest) (*Release, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	var currentStatus string
	err := s.pool.QueryRow(ctx,
		`SELECT status FROM releases WHERE id = $1 AND tenant_id = $2`,
		id, auth.TenantID,
	).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("release", id.String())
		}
		return nil, apperrors.Internal("failed to get release", err)
	}

	if err := workflow.ReleaseStateMachine.Validate(currentStatus, workflow.ReleaseClosed); err != nil {
		return nil, apperrors.BadRequest(err.Error())
	}

	now := time.Now()
	query := `
		UPDATE releases SET
			status = 'closed',
			close_out_report = COALESCE($3, close_out_report),
			lessons_learned = COALESCE($4, lessons_learned),
			actual_end = COALESCE(actual_end, $5),
			updated_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, release_number, title, description,
		          release_type, status, planned_start, planned_end,
		          actual_start, actual_end, release_manager_id, deployment_team,
		          environment, deployment_plan, rollback_plan, risk_assessment,
		          readiness_checklist, change_ticket_ids, implementation_certificate,
		          close_out_report, lessons_learned, created_by, created_at, updated_at`

	rel, err := scanReleaseBasic(s.pool.QueryRow(ctx, query, id, auth.TenantID, req.CloseOutReport, req.LessonsLearned, now))
	if err != nil {
		return nil, apperrors.Internal("failed to close release", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"status": map[string]string{"from": currentStatus, "to": "closed"},
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "close:release",
		EntityType: "release",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &rel, nil
}

// ──────────────────────────────────────────────
// Stats & Calendar
// ──────────────────────────────────────────────

// GetReleaseStats returns per-status counts for the dashboard.
func (s *ReleaseService) GetReleaseStats(ctx context.Context) (*ReleaseStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	rows, err := s.pool.Query(ctx,
		`SELECT status, COUNT(*) FROM releases WHERE tenant_id = $1 GROUP BY status`,
		auth.TenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to get release stats", err)
	}
	defer rows.Close()

	stats := &ReleaseStats{}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			continue
		}
		stats.Total += count
		switch status {
		case "planning":
			stats.Planning = count
		case "build":
			stats.Build = count
		case "testing":
			stats.Testing = count
		case "approved":
			stats.Approved = count
		case "scheduled":
			stats.Scheduled = count
		case "deploying":
			stats.Deploying = count
		case "deployed":
			stats.Deployed = count
		case "rolled_back":
			stats.RolledBack = count
		case "closed":
			stats.Closed = count
		case "cancelled":
			stats.Cancelled = count
		}
	}

	return stats, nil
}

// GetReleaseCalendar returns releases scheduled in the given date range.
func (s *ReleaseService) GetReleaseCalendar(ctx context.Context, rangeStart, rangeEnd time.Time) ([]Release, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	query := `
		SELECT r.id, r.tenant_id, r.release_number, r.title, r.description,
		       r.release_type, r.status, r.planned_start, r.planned_end,
		       r.actual_start, r.actual_end, r.release_manager_id, r.deployment_team,
		       r.environment, r.deployment_plan, r.rollback_plan, r.risk_assessment,
		       r.readiness_checklist, r.change_ticket_ids, r.implementation_certificate,
		       r.close_out_report, r.lessons_learned, r.created_by, r.created_at, r.updated_at,
		       mgr.display_name AS release_manager_name,
		       cr.display_name AS created_by_name
		FROM releases r
		LEFT JOIN users mgr ON mgr.id = r.release_manager_id
		LEFT JOIN users cr ON cr.id = r.created_by
		WHERE r.tenant_id = $1
		  AND r.planned_start IS NOT NULL
		  AND r.planned_start <= $3
		  AND COALESCE(r.planned_end, r.planned_start) >= $2
		ORDER BY r.planned_start`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, rangeStart, rangeEnd)
	if err != nil {
		return nil, apperrors.Internal("failed to get release calendar", err)
	}
	defer rows.Close()

	var releases []Release
	for rows.Next() {
		r, err := scanRelease(rows)
		if err != nil {
			return nil, apperrors.Internal("failed to scan release", err)
		}
		releases = append(releases, r)
	}
	if releases == nil {
		releases = []Release{}
	}
	return releases, nil
}

// ──────────────────────────────────────────────
// Release Items
// ──────────────────────────────────────────────

// CreateReleaseItem adds an item to a release.
func (s *ReleaseService) CreateReleaseItem(ctx context.Context, releaseID uuid.UUID, req CreateReleaseItemRequest) (*ReleaseItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	// Verify release exists
	var exists bool
	_ = s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM releases WHERE id = $1 AND tenant_id = $2)`, releaseID, auth.TenantID).Scan(&exists)
	if !exists {
		return nil, apperrors.NotFound("release", releaseID.String())
	}

	var item ReleaseItem
	err := s.pool.QueryRow(ctx, `
		INSERT INTO release_items (tenant_id, release_id, item_type, name, version, description, ci_id, deploy_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, tenant_id, release_id, item_type, name, version, description, ci_id, status, deploy_order, created_at`,
		auth.TenantID, releaseID, req.ItemType, req.Name, req.Version, req.Description, req.CIID, req.DeployOrder,
	).Scan(&item.ID, &item.TenantID, &item.ReleaseID, &item.ItemType, &item.Name, &item.Version,
		&item.Description, &item.CIID, &item.Status, &item.DeployOrder, &item.CreatedAt)
	if err != nil {
		return nil, apperrors.Internal("failed to create release item", err)
	}

	return &item, nil
}

// ListReleaseItems returns all items for a release.
func (s *ReleaseService) ListReleaseItems(ctx context.Context, releaseID uuid.UUID) ([]ReleaseItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	return s.listReleaseItemsInternal(ctx, releaseID, auth.TenantID)
}

func (s *ReleaseService) listReleaseItemsInternal(ctx context.Context, releaseID, tenantID uuid.UUID) ([]ReleaseItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, release_id, item_type, name, version, description, ci_id, status, deploy_order, created_at
		FROM release_items WHERE release_id = $1 AND tenant_id = $2
		ORDER BY deploy_order, created_at`,
		releaseID, tenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list release items", err)
	}
	defer rows.Close()

	var items []ReleaseItem
	for rows.Next() {
		var item ReleaseItem
		if err := rows.Scan(&item.ID, &item.TenantID, &item.ReleaseID, &item.ItemType, &item.Name,
			&item.Version, &item.Description, &item.CIID, &item.Status, &item.DeployOrder, &item.CreatedAt); err != nil {
			return nil, apperrors.Internal("failed to scan release item", err)
		}
		items = append(items, item)
	}
	if items == nil {
		items = []ReleaseItem{}
	}
	return items, nil
}

// ──────────────────────────────────────────────
// Release Deployments
// ──────────────────────────────────────────────

// CreateReleaseDeployment adds a deployment record.
func (s *ReleaseService) CreateReleaseDeployment(ctx context.Context, releaseID uuid.UUID, req CreateReleaseDeploymentRequest) (*ReleaseDeployment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	var exists bool
	_ = s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM releases WHERE id = $1 AND tenant_id = $2)`, releaseID, auth.TenantID).Scan(&exists)
	if !exists {
		return nil, apperrors.NotFound("release", releaseID.String())
	}

	var dep ReleaseDeployment
	err := s.pool.QueryRow(ctx, `
		INSERT INTO release_deployments (tenant_id, release_id, environment, deployment_type, deployed_by, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, tenant_id, release_id, environment, deployment_type, status, started_at, completed_at, deployed_by, notes, created_at`,
		auth.TenantID, releaseID, req.Environment, req.DeploymentType, auth.UserID, req.Notes,
	).Scan(&dep.ID, &dep.TenantID, &dep.ReleaseID, &dep.Environment, &dep.DeploymentType,
		&dep.Status, &dep.StartedAt, &dep.CompletedAt, &dep.DeployedBy, &dep.Notes, &dep.CreatedAt)
	if err != nil {
		return nil, apperrors.Internal("failed to create release deployment", err)
	}

	return &dep, nil
}

// ListReleaseDeployments returns all deployments for a release.
func (s *ReleaseService) ListReleaseDeployments(ctx context.Context, releaseID uuid.UUID) ([]ReleaseDeployment, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	return s.listReleaseDeploymentsInternal(ctx, releaseID, auth.TenantID)
}

func (s *ReleaseService) listReleaseDeploymentsInternal(ctx context.Context, releaseID, tenantID uuid.UUID) ([]ReleaseDeployment, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT rd.id, rd.tenant_id, rd.release_id, rd.environment, rd.deployment_type,
		       rd.status, rd.started_at, rd.completed_at, rd.deployed_by, rd.notes, rd.created_at,
		       u.display_name AS deployed_by_name
		FROM release_deployments rd
		LEFT JOIN users u ON u.id = rd.deployed_by
		WHERE rd.release_id = $1 AND rd.tenant_id = $2
		ORDER BY rd.created_at DESC`,
		releaseID, tenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list release deployments", err)
	}
	defer rows.Close()

	var deps []ReleaseDeployment
	for rows.Next() {
		var dep ReleaseDeployment
		if err := rows.Scan(&dep.ID, &dep.TenantID, &dep.ReleaseID, &dep.Environment, &dep.DeploymentType,
			&dep.Status, &dep.StartedAt, &dep.CompletedAt, &dep.DeployedBy, &dep.Notes, &dep.CreatedAt,
			&dep.DeployedByName); err != nil {
			return nil, apperrors.Internal("failed to scan release deployment", err)
		}
		deps = append(deps, dep)
	}
	if deps == nil {
		deps = []ReleaseDeployment{}
	}
	return deps, nil
}

// ──────────────────────────────────────────────
// Release Approvals
// ──────────────────────────────────────────────

// CreateReleaseApproval requests an approval sign-off.
func (s *ReleaseService) CreateReleaseApproval(ctx context.Context, releaseID uuid.UUID, req CreateReleaseApprovalRequest) (*ReleaseApproval, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	var exists bool
	_ = s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM releases WHERE id = $1 AND tenant_id = $2)`, releaseID, auth.TenantID).Scan(&exists)
	if !exists {
		return nil, apperrors.NotFound("release", releaseID.String())
	}

	var appr ReleaseApproval
	err := s.pool.QueryRow(ctx, `
		INSERT INTO release_approvals (tenant_id, release_id, approver_id, approval_type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, tenant_id, release_id, approver_id, approval_type, status, comments, decided_at, created_at`,
		auth.TenantID, releaseID, req.ApproverID, req.ApprovalType,
	).Scan(&appr.ID, &appr.TenantID, &appr.ReleaseID, &appr.ApproverID, &appr.ApprovalType,
		&appr.Status, &appr.Comments, &appr.DecidedAt, &appr.CreatedAt)
	if err != nil {
		return nil, apperrors.Internal("failed to create release approval", err)
	}

	// Notify the approver
	s.publishEvent("notify.release.approval_needed", releaseID, auth, map[string]any{
		"recipientId":  req.ApproverID.String(),
		"approvalType": req.ApprovalType,
		"actionUrl":    fmt.Sprintf("/dashboard/releases/%s", releaseID),
	})

	return &appr, nil
}

// ListReleaseApprovals returns all approvals for a release.
func (s *ReleaseService) ListReleaseApprovals(ctx context.Context, releaseID uuid.UUID) ([]ReleaseApproval, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}
	return s.listReleaseApprovalsInternal(ctx, releaseID, auth.TenantID)
}

func (s *ReleaseService) listReleaseApprovalsInternal(ctx context.Context, releaseID, tenantID uuid.UUID) ([]ReleaseApproval, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT ra.id, ra.tenant_id, ra.release_id, ra.approver_id, ra.approval_type,
		       ra.status, ra.comments, ra.decided_at, ra.created_at,
		       u.display_name AS approver_name
		FROM release_approvals ra
		LEFT JOIN users u ON u.id = ra.approver_id
		WHERE ra.release_id = $1 AND ra.tenant_id = $2
		ORDER BY ra.created_at`,
		releaseID, tenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list release approvals", err)
	}
	defer rows.Close()

	var approvals []ReleaseApproval
	for rows.Next() {
		var a ReleaseApproval
		if err := rows.Scan(&a.ID, &a.TenantID, &a.ReleaseID, &a.ApproverID, &a.ApprovalType,
			&a.Status, &a.Comments, &a.DecidedAt, &a.CreatedAt, &a.ApproverName); err != nil {
			return nil, apperrors.Internal("failed to scan release approval", err)
		}
		approvals = append(approvals, a)
	}
	if approvals == nil {
		approvals = []ReleaseApproval{}
	}
	return approvals, nil
}

// DecideReleaseApproval records an approver's decision.
func (s *ReleaseService) DecideReleaseApproval(ctx context.Context, releaseID, approvalID uuid.UUID, req DecideReleaseApprovalRequest) (*ReleaseApproval, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Forbidden("authentication required")
	}

	var a ReleaseApproval
	err := s.pool.QueryRow(ctx, `
		UPDATE release_approvals SET status = $3, comments = $4, decided_at = now()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, release_id, approver_id, approval_type, status, comments, decided_at, created_at`,
		approvalID, auth.TenantID, req.Status, req.Comments,
	).Scan(&a.ID, &a.TenantID, &a.ReleaseID, &a.ApproverID, &a.ApprovalType,
		&a.Status, &a.Comments, &a.DecidedAt, &a.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("release_approval", approvalID.String())
		}
		return nil, apperrors.Internal("failed to decide release approval", err)
	}

	changes, _ := json.Marshal(map[string]any{
		"approvalType": a.ApprovalType,
		"decision":     req.Status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "decide:release_approval",
		EntityType: "release",
		EntityID:   releaseID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	// Check if all approvals are now approved → auto-transition release to approved
	if req.Status == "approved" {
		var pendingCount int
		_ = s.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM release_approvals WHERE release_id = $1 AND tenant_id = $2 AND status = 'pending'`,
			releaseID, auth.TenantID,
		).Scan(&pendingCount)

		if pendingCount == 0 {
			var currentStatus string
			_ = s.pool.QueryRow(ctx,
				`SELECT status FROM releases WHERE id = $1 AND tenant_id = $2`,
				releaseID, auth.TenantID,
			).Scan(&currentStatus)

			if workflow.ReleaseStateMachine.IsValid(currentStatus, workflow.ReleaseApproved) {
				_, _ = s.pool.Exec(ctx,
					`UPDATE releases SET status = 'approved', updated_at = now() WHERE id = $1 AND tenant_id = $2`,
					releaseID, auth.TenantID,
				)
				slog.InfoContext(ctx, "all approvals complete, auto-transitioning release to approved",
					"release_id", releaseID)
			}
		}
	}

	return &a, nil
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// scanRelease scans a release row from a query that includes JOIN enrichment columns.
func scanRelease(row pgx.Row) (Release, error) {
	var r Release
	err := row.Scan(
		&r.ID, &r.TenantID, &r.ReleaseNumber, &r.Title, &r.Description,
		&r.ReleaseType, &r.Status, &r.PlannedStart, &r.PlannedEnd,
		&r.ActualStart, &r.ActualEnd, &r.ReleaseManagerID, &r.DeploymentTeam,
		&r.Environment, &r.DeploymentPlan, &r.RollbackPlan, &r.RiskAssessment,
		&r.ReadinessChecklist, &r.ChangeTicketIDs, &r.ImplementationCertificate,
		&r.CloseOutReport, &r.LessonsLearned, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt,
		&r.ReleaseManagerName, &r.CreatedByName,
	)
	return r, err
}

// scanReleaseBasic scans a release row without JOIN enrichment columns.
func scanReleaseBasic(row pgx.Row) (Release, error) {
	var r Release
	err := row.Scan(
		&r.ID, &r.TenantID, &r.ReleaseNumber, &r.Title, &r.Description,
		&r.ReleaseType, &r.Status, &r.PlannedStart, &r.PlannedEnd,
		&r.ActualStart, &r.ActualEnd, &r.ReleaseManagerID, &r.DeploymentTeam,
		&r.Environment, &r.DeploymentPlan, &r.RollbackPlan, &r.RiskAssessment,
		&r.ReadinessChecklist, &r.ChangeTicketIDs, &r.ImplementationCertificate,
		&r.CloseOutReport, &r.LessonsLearned, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

// ──────────────────────────────────────────────
// NATS helper
// ──────────────────────────────────────────────

func (s *ReleaseService) publishEvent(subject string, entityID uuid.UUID, auth *types.AuthContext, data map[string]any) {
	if s.js == nil {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"type":       subject[len("notify."):],
		"tenantId":   auth.TenantID,
		"actorId":    auth.UserID,
		"entityType": "release",
		"entityId":   entityID,
		"data":       data,
		"timestamp":  time.Now(),
	})
	if _, err := s.js.Publish(subject, payload); err != nil {
		slog.Error("failed to publish release event", "subject", subject, "error", err)
	}
}

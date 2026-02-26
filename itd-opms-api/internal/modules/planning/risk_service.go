package planning

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
// RiskService
// ──────────────────────────────────────────────

// RiskService handles business logic for risks, issues, and change requests.
type RiskService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewRiskService creates a new RiskService.
func NewRiskService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *RiskService {
	return &RiskService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Risks
// ──────────────────────────────────────────────

// CreateRisk creates a new risk entry. The risk_score column is GENERATED ALWAYS
// so it is not included in the INSERT.
func (s *RiskService) CreateRisk(ctx context.Context, req CreateRiskRequest) (Risk, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Risk{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	likelihood := "medium"
	if req.Likelihood != "" {
		likelihood = req.Likelihood
	}

	impact := "medium"
	if req.Impact != "" {
		impact = req.Impact
	}

	status := RiskStatusIdentified
	if req.Status != nil {
		status = *req.Status
	}

	query := `
		INSERT INTO risks (
			id, tenant_id, project_id, title, description,
			category, likelihood, impact, status,
			mitigation_plan, contingency_plan, owner_id, review_date,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14, $15
		)
		RETURNING id, tenant_id, project_id, title, description,
			category, likelihood, impact, risk_score, status,
			mitigation_plan, contingency_plan, owner_id, review_date,
			created_at, updated_at`

	var risk Risk
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.ProjectID, req.Title, req.Description,
		req.Category, likelihood, impact, status,
		req.MitigationPlan, req.ContingencyPlan, req.OwnerID, req.ReviewDate,
		now, now,
	).Scan(
		&risk.ID, &risk.TenantID, &risk.ProjectID, &risk.Title, &risk.Description,
		&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
		&risk.MitigationPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewDate,
		&risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		return Risk{}, apperrors.Internal("failed to create risk", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":      req.Title,
		"likelihood": likelihood,
		"impact":     impact,
		"status":     status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:risk",
		EntityType: "risk",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return risk, nil
}

// GetRisk retrieves a single risk by ID.
func (s *RiskService) GetRisk(ctx context.Context, id uuid.UUID) (Risk, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Risk{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, project_id, title, description,
			category, likelihood, impact, risk_score, status,
			mitigation_plan, contingency_plan, owner_id, review_date,
			created_at, updated_at
		FROM risks
		WHERE id = $1 AND tenant_id = $2`

	var risk Risk
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&risk.ID, &risk.TenantID, &risk.ProjectID, &risk.Title, &risk.Description,
		&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
		&risk.MitigationPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewDate,
		&risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Risk{}, apperrors.NotFound("Risk", id.String())
		}
		return Risk{}, apperrors.Internal("failed to get risk", err)
	}

	return risk, nil
}

// ListRisks returns a filtered, paginated list of risks tenant-wide.
func (s *RiskService) ListRisks(ctx context.Context, projectID *uuid.UUID, status, category *string, limit, offset int) ([]Risk, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM risks
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR category = $4)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, projectID, status, category).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count risks", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, project_id, title, description,
			category, likelihood, impact, risk_score, status,
			mitigation_plan, contingency_plan, owner_id, review_date,
			created_at, updated_at
		FROM risks
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR category = $4)
		ORDER BY risk_score DESC, created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, projectID, status, category, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list risks", err)
	}
	defer rows.Close()

	var risks []Risk
	for rows.Next() {
		var risk Risk
		if err := rows.Scan(
			&risk.ID, &risk.TenantID, &risk.ProjectID, &risk.Title, &risk.Description,
			&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
			&risk.MitigationPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewDate,
			&risk.CreatedAt, &risk.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan risk", err)
		}
		risks = append(risks, risk)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate risks", err)
	}

	if risks == nil {
		risks = []Risk{}
	}

	return risks, total, nil
}

// UpdateRisk updates an existing risk using COALESCE partial update.
// The risk_score column is GENERATED ALWAYS so it is not included in the UPDATE.
func (s *RiskService) UpdateRisk(ctx context.Context, id uuid.UUID, req UpdateRiskRequest) (Risk, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Risk{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the risk exists and belongs to the tenant.
	_, err := s.GetRisk(ctx, id)
	if err != nil {
		return Risk{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE risks SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			category = COALESCE($3, category),
			likelihood = COALESCE($4, likelihood),
			impact = COALESCE($5, impact),
			status = COALESCE($6, status),
			mitigation_plan = COALESCE($7, mitigation_plan),
			contingency_plan = COALESCE($8, contingency_plan),
			owner_id = COALESCE($9, owner_id),
			review_date = COALESCE($10, review_date),
			updated_at = $11
		WHERE id = $12 AND tenant_id = $13
		RETURNING id, tenant_id, project_id, title, description,
			category, likelihood, impact, risk_score, status,
			mitigation_plan, contingency_plan, owner_id, review_date,
			created_at, updated_at`

	var risk Risk
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.Category,
		req.Likelihood, req.Impact, req.Status,
		req.MitigationPlan, req.ContingencyPlan, req.OwnerID,
		req.ReviewDate,
		now, id, auth.TenantID,
	).Scan(
		&risk.ID, &risk.TenantID, &risk.ProjectID, &risk.Title, &risk.Description,
		&risk.Category, &risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status,
		&risk.MitigationPlan, &risk.ContingencyPlan, &risk.OwnerID, &risk.ReviewDate,
		&risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		return Risk{}, apperrors.Internal("failed to update risk", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:risk",
		EntityType: "risk",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return risk, nil
}

// DeleteRisk deletes a risk by ID.
func (s *RiskService) DeleteRisk(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM risks WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete risk", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Risk", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:risk",
		EntityType: "risk",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Issues
// ──────────────────────────────────────────────

// CreateIssue creates a new issue entry.
func (s *RiskService) CreateIssue(ctx context.Context, req CreateIssueRequest) (Issue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Issue{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	severity := "medium"
	if req.Severity != "" {
		severity = req.Severity
	}

	status := IssueStatusOpen
	if req.Status != nil {
		status = *req.Status
	}

	query := `
		INSERT INTO issues (
			id, tenant_id, project_id, title, description,
			category, severity, status, assignee_id, due_date,
			escalation_level, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13
		)
		RETURNING id, tenant_id, project_id, title, description,
			category, severity, status, assignee_id, resolution,
			escalation_level, escalated_to_id, due_date,
			created_at, updated_at`

	var issue Issue
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.ProjectID, req.Title, req.Description,
		req.Category, severity, status, req.AssigneeID, req.DueDate,
		0, now, now,
	).Scan(
		&issue.ID, &issue.TenantID, &issue.ProjectID, &issue.Title, &issue.Description,
		&issue.Category, &issue.Severity, &issue.Status, &issue.AssigneeID, &issue.Resolution,
		&issue.EscalationLevel, &issue.EscalatedToID, &issue.DueDate,
		&issue.CreatedAt, &issue.UpdatedAt,
	)
	if err != nil {
		return Issue{}, apperrors.Internal("failed to create issue", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":    req.Title,
		"severity": severity,
		"status":   status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:issue",
		EntityType: "issue",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return issue, nil
}

// GetIssue retrieves a single issue by ID.
func (s *RiskService) GetIssue(ctx context.Context, id uuid.UUID) (Issue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Issue{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, project_id, title, description,
			category, severity, status, assignee_id, resolution,
			escalation_level, escalated_to_id, due_date,
			created_at, updated_at
		FROM issues
		WHERE id = $1 AND tenant_id = $2`

	var issue Issue
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&issue.ID, &issue.TenantID, &issue.ProjectID, &issue.Title, &issue.Description,
		&issue.Category, &issue.Severity, &issue.Status, &issue.AssigneeID, &issue.Resolution,
		&issue.EscalationLevel, &issue.EscalatedToID, &issue.DueDate,
		&issue.CreatedAt, &issue.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Issue{}, apperrors.NotFound("Issue", id.String())
		}
		return Issue{}, apperrors.Internal("failed to get issue", err)
	}

	return issue, nil
}

// ListIssues returns a filtered, paginated list of issues tenant-wide.
func (s *RiskService) ListIssues(ctx context.Context, projectID *uuid.UUID, status, severity *string, limit, offset int) ([]Issue, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM issues
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR severity = $4)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, projectID, status, severity).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count issues", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, project_id, title, description,
			category, severity, status, assignee_id, resolution,
			escalation_level, escalated_to_id, due_date,
			created_at, updated_at
		FROM issues
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR severity = $4)
		ORDER BY escalation_level DESC, created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, projectID, status, severity, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list issues", err)
	}
	defer rows.Close()

	var issues []Issue
	for rows.Next() {
		var issue Issue
		if err := rows.Scan(
			&issue.ID, &issue.TenantID, &issue.ProjectID, &issue.Title, &issue.Description,
			&issue.Category, &issue.Severity, &issue.Status, &issue.AssigneeID, &issue.Resolution,
			&issue.EscalationLevel, &issue.EscalatedToID, &issue.DueDate,
			&issue.CreatedAt, &issue.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan issue", err)
		}
		issues = append(issues, issue)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate issues", err)
	}

	if issues == nil {
		issues = []Issue{}
	}

	return issues, total, nil
}

// UpdateIssue updates an existing issue using COALESCE partial update.
func (s *RiskService) UpdateIssue(ctx context.Context, id uuid.UUID, req UpdateIssueRequest) (Issue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Issue{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the issue exists and belongs to the tenant.
	_, err := s.GetIssue(ctx, id)
	if err != nil {
		return Issue{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE issues SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			category = COALESCE($3, category),
			severity = COALESCE($4, severity),
			status = COALESCE($5, status),
			assignee_id = COALESCE($6, assignee_id),
			resolution = COALESCE($7, resolution),
			escalation_level = COALESCE($8, escalation_level),
			escalated_to_id = COALESCE($9, escalated_to_id),
			due_date = COALESCE($10, due_date),
			updated_at = $11
		WHERE id = $12 AND tenant_id = $13
		RETURNING id, tenant_id, project_id, title, description,
			category, severity, status, assignee_id, resolution,
			escalation_level, escalated_to_id, due_date,
			created_at, updated_at`

	var issue Issue
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.Category,
		req.Severity, req.Status, req.AssigneeID,
		req.Resolution, req.EscalationLevel, req.EscalatedToID,
		req.DueDate,
		now, id, auth.TenantID,
	).Scan(
		&issue.ID, &issue.TenantID, &issue.ProjectID, &issue.Title, &issue.Description,
		&issue.Category, &issue.Severity, &issue.Status, &issue.AssigneeID, &issue.Resolution,
		&issue.EscalationLevel, &issue.EscalatedToID, &issue.DueDate,
		&issue.CreatedAt, &issue.UpdatedAt,
	)
	if err != nil {
		return Issue{}, apperrors.Internal("failed to update issue", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:issue",
		EntityType: "issue",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return issue, nil
}

// EscalateIssue increments the escalation level and sets the escalated_to_id.
func (s *RiskService) EscalateIssue(ctx context.Context, id uuid.UUID, escalatedToID uuid.UUID) (Issue, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Issue{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetIssue(ctx, id)
	if err != nil {
		return Issue{}, err
	}

	now := time.Now().UTC()
	newLevel := existing.EscalationLevel + 1

	query := `
		UPDATE issues SET
			escalation_level = $1,
			escalated_to_id = $2,
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5
		RETURNING id, tenant_id, project_id, title, description,
			category, severity, status, assignee_id, resolution,
			escalation_level, escalated_to_id, due_date,
			created_at, updated_at`

	var issue Issue
	err = s.pool.QueryRow(ctx, query, newLevel, escalatedToID, now, id, auth.TenantID).Scan(
		&issue.ID, &issue.TenantID, &issue.ProjectID, &issue.Title, &issue.Description,
		&issue.Category, &issue.Severity, &issue.Status, &issue.AssigneeID, &issue.Resolution,
		&issue.EscalationLevel, &issue.EscalatedToID, &issue.DueDate,
		&issue.CreatedAt, &issue.UpdatedAt,
	)
	if err != nil {
		return Issue{}, apperrors.Internal("failed to escalate issue", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_level":  existing.EscalationLevel,
		"new_level":       newLevel,
		"escalated_to_id": escalatedToID,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "escalate:issue",
		EntityType: "issue",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return issue, nil
}

// DeleteIssue deletes an issue by ID.
func (s *RiskService) DeleteIssue(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM issues WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete issue", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Issue", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:issue",
		EntityType: "issue",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Change Requests
// ──────────────────────────────────────────────

// CreateChangeRequest creates a new change request with requested_by from auth context.
func (s *RiskService) CreateChangeRequest(ctx context.Context, req CreateChangeRequestRequest) (ChangeRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChangeRequest{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	status := CRStatusSubmitted
	if req.Status != nil {
		status = *req.Status
	}

	query := `
		INSERT INTO change_requests (
			id, tenant_id, project_id, title, description,
			justification, impact_assessment, status,
			requested_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11
		)
		RETURNING id, tenant_id, project_id, title, description,
			justification, impact_assessment, status,
			requested_by, reviewed_by, approval_chain_id,
			created_at, updated_at`

	var cr ChangeRequest
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.ProjectID, req.Title, req.Description,
		req.Justification, req.ImpactAssessment, status,
		auth.UserID, now, now,
	).Scan(
		&cr.ID, &cr.TenantID, &cr.ProjectID, &cr.Title, &cr.Description,
		&cr.Justification, &cr.ImpactAssessment, &cr.Status,
		&cr.RequestedBy, &cr.ReviewedBy, &cr.ApprovalChainID,
		&cr.CreatedAt, &cr.UpdatedAt,
	)
	if err != nil {
		return ChangeRequest{}, apperrors.Internal("failed to create change request", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":  req.Title,
		"status": status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:change_request",
		EntityType: "change_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cr, nil
}

// GetChangeRequest retrieves a single change request by ID.
func (s *RiskService) GetChangeRequest(ctx context.Context, id uuid.UUID) (ChangeRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChangeRequest{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, project_id, title, description,
			justification, impact_assessment, status,
			requested_by, reviewed_by, approval_chain_id,
			created_at, updated_at
		FROM change_requests
		WHERE id = $1 AND tenant_id = $2`

	var cr ChangeRequest
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&cr.ID, &cr.TenantID, &cr.ProjectID, &cr.Title, &cr.Description,
		&cr.Justification, &cr.ImpactAssessment, &cr.Status,
		&cr.RequestedBy, &cr.ReviewedBy, &cr.ApprovalChainID,
		&cr.CreatedAt, &cr.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ChangeRequest{}, apperrors.NotFound("ChangeRequest", id.String())
		}
		return ChangeRequest{}, apperrors.Internal("failed to get change request", err)
	}

	return cr, nil
}

// ListChangeRequests returns a filtered, paginated list of change requests tenant-wide.
func (s *RiskService) ListChangeRequests(ctx context.Context, projectID *uuid.UUID, status *string, limit, offset int) ([]ChangeRequest, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM change_requests
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
			AND ($3::text IS NULL OR status = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, projectID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count change requests", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, project_id, title, description,
			justification, impact_assessment, status,
			requested_by, reviewed_by, approval_chain_id,
			created_at, updated_at
		FROM change_requests
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
			AND ($3::text IS NULL OR status = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, projectID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list change requests", err)
	}
	defer rows.Close()

	var crs []ChangeRequest
	for rows.Next() {
		var cr ChangeRequest
		if err := rows.Scan(
			&cr.ID, &cr.TenantID, &cr.ProjectID, &cr.Title, &cr.Description,
			&cr.Justification, &cr.ImpactAssessment, &cr.Status,
			&cr.RequestedBy, &cr.ReviewedBy, &cr.ApprovalChainID,
			&cr.CreatedAt, &cr.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan change request", err)
		}
		crs = append(crs, cr)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate change requests", err)
	}

	if crs == nil {
		crs = []ChangeRequest{}
	}

	return crs, total, nil
}

// UpdateChangeRequest updates an existing change request using COALESCE partial update.
func (s *RiskService) UpdateChangeRequest(ctx context.Context, id uuid.UUID, req UpdateChangeRequestRequest) (ChangeRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChangeRequest{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the change request exists and belongs to the tenant.
	_, err := s.GetChangeRequest(ctx, id)
	if err != nil {
		return ChangeRequest{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE change_requests SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			justification = COALESCE($3, justification),
			impact_assessment = COALESCE($4, impact_assessment),
			status = COALESCE($5, status),
			reviewed_by = COALESCE($6, reviewed_by),
			approval_chain_id = COALESCE($7, approval_chain_id),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING id, tenant_id, project_id, title, description,
			justification, impact_assessment, status,
			requested_by, reviewed_by, approval_chain_id,
			created_at, updated_at`

	var cr ChangeRequest
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.Justification,
		req.ImpactAssessment, req.Status, req.ReviewedBy,
		req.ApprovalChainID,
		now, id, auth.TenantID,
	).Scan(
		&cr.ID, &cr.TenantID, &cr.ProjectID, &cr.Title, &cr.Description,
		&cr.Justification, &cr.ImpactAssessment, &cr.Status,
		&cr.RequestedBy, &cr.ReviewedBy, &cr.ApprovalChainID,
		&cr.CreatedAt, &cr.UpdatedAt,
	)
	if err != nil {
		return ChangeRequest{}, apperrors.Internal("failed to update change request", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:change_request",
		EntityType: "change_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cr, nil
}

// UpdateChangeRequestStatus validates and performs a status transition on a change request.
// Valid transitions:
//   - submitted    -> under_review
//   - under_review -> approved, rejected
//   - approved     -> implemented
func (s *RiskService) UpdateChangeRequestStatus(ctx context.Context, id uuid.UUID, newStatus string) (ChangeRequest, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChangeRequest{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetChangeRequest(ctx, id)
	if err != nil {
		return ChangeRequest{}, err
	}

	// Validate status transition.
	if !isValidCRTransition(existing.Status, newStatus) {
		return ChangeRequest{}, apperrors.BadRequest(
			fmt.Sprintf("invalid status transition from '%s' to '%s'", existing.Status, newStatus),
		)
	}

	now := time.Now().UTC()

	// Set reviewed_by when moving to under_review or beyond.
	var reviewedBy *uuid.UUID
	if newStatus == CRStatusUnderReview || newStatus == CRStatusApproved || newStatus == CRStatusRejected {
		userID := auth.UserID
		reviewedBy = &userID
	}

	query := `
		UPDATE change_requests SET
			status = $1,
			reviewed_by = COALESCE($2, reviewed_by),
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5
		RETURNING id, tenant_id, project_id, title, description,
			justification, impact_assessment, status,
			requested_by, reviewed_by, approval_chain_id,
			created_at, updated_at`

	var cr ChangeRequest
	err = s.pool.QueryRow(ctx, query, newStatus, reviewedBy, now, id, auth.TenantID).Scan(
		&cr.ID, &cr.TenantID, &cr.ProjectID, &cr.Title, &cr.Description,
		&cr.Justification, &cr.ImpactAssessment, &cr.Status,
		&cr.RequestedBy, &cr.ReviewedBy, &cr.ApprovalChainID,
		&cr.CreatedAt, &cr.UpdatedAt,
	)
	if err != nil {
		return ChangeRequest{}, apperrors.Internal("failed to update change request status", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      newStatus,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:change_request",
		EntityType: "change_request",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cr, nil
}

// isValidCRTransition checks whether a change request status transition is allowed.
func isValidCRTransition(from, to string) bool {
	allowed := map[string][]string{
		CRStatusSubmitted:   {CRStatusUnderReview},
		CRStatusUnderReview: {CRStatusApproved, CRStatusRejected},
		CRStatusApproved:    {CRStatusImplemented},
	}
	targets, ok := allowed[from]
	if !ok {
		return false
	}
	for _, t := range targets {
		if t == to {
			return true
		}
	}
	return false
}

// DeleteChangeRequest deletes a change request by ID.
func (s *RiskService) DeleteChangeRequest(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM change_requests WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete change request", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ChangeRequest", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:change_request",
		EntityType: "change_request",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

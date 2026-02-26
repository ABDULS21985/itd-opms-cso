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
// PortfolioService
// ──────────────────────────────────────────────

// PortfolioService handles business logic for portfolio management.
type PortfolioService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewPortfolioService creates a new PortfolioService.
func NewPortfolioService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *PortfolioService {
	return &PortfolioService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// CreatePortfolio creates a new portfolio.
func (s *PortfolioService) CreatePortfolio(ctx context.Context, req CreatePortfolioRequest) (Portfolio, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Portfolio{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	status := "active"
	if req.Status != nil {
		status = *req.Status
	}

	query := `
		INSERT INTO portfolios (
			id, tenant_id, name, description, owner_id,
			fiscal_year, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9
		)
		RETURNING id, tenant_id, name, description, owner_id,
			fiscal_year, status, created_at, updated_at`

	var p Portfolio
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.OwnerID,
		req.FiscalYear, status, now, now,
	).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.Description, &p.OwnerID,
		&p.FiscalYear, &p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return Portfolio{}, apperrors.Internal("failed to create portfolio", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":        req.Name,
		"fiscal_year": req.FiscalYear,
		"status":      status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:portfolio",
		EntityType: "portfolio",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return p, nil
}

// GetPortfolio retrieves a single portfolio by ID.
func (s *PortfolioService) GetPortfolio(ctx context.Context, id uuid.UUID) (Portfolio, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Portfolio{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, owner_id,
			fiscal_year, status, created_at, updated_at
		FROM portfolios
		WHERE id = $1 AND tenant_id = $2`

	var p Portfolio
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.Description, &p.OwnerID,
		&p.FiscalYear, &p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Portfolio{}, apperrors.NotFound("Portfolio", id.String())
		}
		return Portfolio{}, apperrors.Internal("failed to get portfolio", err)
	}

	return p, nil
}

// ListPortfolios returns a filtered, paginated list of portfolios.
func (s *PortfolioService) ListPortfolios(ctx context.Context, status *string, limit, offset int) ([]Portfolio, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM portfolios
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count portfolios", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, name, description, owner_id,
			fiscal_year, status, created_at, updated_at
		FROM portfolios
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR status = $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list portfolios", err)
	}
	defer rows.Close()

	var portfolios []Portfolio
	for rows.Next() {
		var p Portfolio
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.Description, &p.OwnerID,
			&p.FiscalYear, &p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan portfolio", err)
		}
		portfolios = append(portfolios, p)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate portfolios", err)
	}

	if portfolios == nil {
		portfolios = []Portfolio{}
	}

	return portfolios, total, nil
}

// UpdatePortfolio updates an existing portfolio using COALESCE partial update.
func (s *PortfolioService) UpdatePortfolio(ctx context.Context, id uuid.UUID, req UpdatePortfolioRequest) (Portfolio, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Portfolio{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the portfolio exists and belongs to the tenant.
	_, err := s.GetPortfolio(ctx, id)
	if err != nil {
		return Portfolio{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE portfolios SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			owner_id = COALESCE($3, owner_id),
			fiscal_year = COALESCE($4, fiscal_year),
			status = COALESCE($5, status),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, name, description, owner_id,
			fiscal_year, status, created_at, updated_at`

	var p Portfolio
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Description, req.OwnerID,
		req.FiscalYear, req.Status,
		now, id, auth.TenantID,
	).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.Description, &p.OwnerID,
		&p.FiscalYear, &p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return Portfolio{}, apperrors.Internal("failed to update portfolio", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:portfolio",
		EntityType: "portfolio",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return p, nil
}

// DeletePortfolio deletes a portfolio by ID.
func (s *PortfolioService) DeletePortfolio(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM portfolios WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete portfolio", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Portfolio", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:portfolio",
		EntityType: "portfolio",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// GetPortfolioRoadmap returns all projects in a portfolio ordered by planned start date
// for timeline visualization.
func (s *PortfolioService) GetPortfolioRoadmap(ctx context.Context, id uuid.UUID) ([]Project, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify the portfolio exists.
	_, err := s.GetPortfolio(ctx, id)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, tenant_id, portfolio_id, title, code, description, charter, scope, business_case,
			sponsor_id, project_manager_id, status, rag_status, priority,
			planned_start, planned_end, actual_start, actual_end,
			budget_approved, budget_spent, completion_pct, metadata,
			created_at, updated_at
		FROM projects
		WHERE portfolio_id = $1 AND tenant_id = $2
		ORDER BY planned_start ASC NULLS LAST, created_at ASC`

	rows, err := s.pool.Query(ctx, query, id, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get portfolio roadmap", err)
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.PortfolioID, &p.Title, &p.Code, &p.Description, &p.Charter, &p.Scope, &p.BusinessCase,
			&p.SponsorID, &p.ProjectManagerID, &p.Status, &p.RAGStatus, &p.Priority,
			&p.PlannedStart, &p.PlannedEnd, &p.ActualStart, &p.ActualEnd,
			&p.BudgetApproved, &p.BudgetSpent, &p.CompletionPct, &p.Metadata,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan project", err)
		}
		projects = append(projects, p)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate projects", err)
	}

	if projects == nil {
		projects = []Project{}
	}

	return projects, nil
}

// GetPortfolioAnalytics returns aggregate analytics for a portfolio.
func (s *PortfolioService) GetPortfolioAnalytics(ctx context.Context, id uuid.UUID) (PortfolioAnalytics, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return PortfolioAnalytics{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the portfolio exists.
	_, err := s.GetPortfolio(ctx, id)
	if err != nil {
		return PortfolioAnalytics{}, err
	}

	query := `
		SELECT
			COUNT(*) AS total_projects,
			COUNT(*) FILTER (WHERE status = 'active') AS active_projects,
			COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
			COALESCE(
				ROUND(
					COUNT(*) FILTER (WHERE status = 'completed' AND actual_end <= planned_end)::numeric /
					NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0) * 100, 2
				), 0
			) AS on_time_delivery_pct,
			COALESCE(AVG(completion_pct), 0) AS avg_completion_pct,
			COALESCE(SUM(budget_approved), 0) AS total_budget_approved,
			COALESCE(SUM(budget_spent), 0) AS total_budget_spent
		FROM projects
		WHERE portfolio_id = $1 AND tenant_id = $2`

	var analytics PortfolioAnalytics
	err = s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&analytics.TotalProjects,
		&analytics.ActiveProjects,
		&analytics.CompletedProjects,
		&analytics.OnTimeDeliveryPct,
		&analytics.AvgCompletionPct,
		&analytics.TotalBudgetApproved,
		&analytics.TotalBudgetSpent,
	)
	if err != nil {
		return PortfolioAnalytics{}, apperrors.Internal("failed to get portfolio analytics", err)
	}

	// Fetch RAG summary.
	ragQuery := `
		SELECT rag_status, COUNT(*) AS cnt
		FROM projects
		WHERE portfolio_id = $1 AND tenant_id = $2
		GROUP BY rag_status`

	ragRows, err := s.pool.Query(ctx, ragQuery, id, auth.TenantID)
	if err != nil {
		return PortfolioAnalytics{}, apperrors.Internal("failed to get RAG summary", err)
	}
	defer ragRows.Close()

	ragSummary := make(map[string]int)
	for ragRows.Next() {
		var ragStatus string
		var count int
		if err := ragRows.Scan(&ragStatus, &count); err != nil {
			return PortfolioAnalytics{}, apperrors.Internal("failed to scan RAG summary", err)
		}
		ragSummary[ragStatus] = count
	}

	if err := ragRows.Err(); err != nil {
		return PortfolioAnalytics{}, apperrors.Internal("failed to iterate RAG summary", err)
	}

	analytics.RAGSummary = ragSummary

	return analytics, nil
}

// ──────────────────────────────────────────────
// ProjectService
// ──────────────────────────────────────────────

// ProjectService handles business logic for project management.
type ProjectService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewProjectService creates a new ProjectService.
func NewProjectService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ProjectService {
	return &ProjectService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// CreateProject creates a new project.
func (s *ProjectService) CreateProject(ctx context.Context, req CreateProjectRequest) (Project, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Project{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	priority := "medium"
	if req.Priority != nil {
		priority = *req.Priority
	}

	query := `
		INSERT INTO projects (
			id, tenant_id, portfolio_id, title, code, description, charter, scope, business_case,
			sponsor_id, project_manager_id, status, rag_status, priority,
			planned_start, planned_end, budget_approved, metadata,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14,
			$15, $16, $17, $18,
			$19, $20
		)
		RETURNING id, tenant_id, portfolio_id, title, code, description, charter, scope, business_case,
			sponsor_id, project_manager_id, status, rag_status, priority,
			planned_start, planned_end, actual_start, actual_end,
			budget_approved, budget_spent, completion_pct, metadata,
			created_at, updated_at`

	var p Project
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.PortfolioID, req.Title, req.Code, req.Description, req.Charter, req.Scope, req.BusinessCase,
		req.SponsorID, req.ProjectManagerID, "proposed", "green", priority,
		req.PlannedStart, req.PlannedEnd, req.BudgetApproved, req.Metadata,
		now, now,
	).Scan(
		&p.ID, &p.TenantID, &p.PortfolioID, &p.Title, &p.Code, &p.Description, &p.Charter, &p.Scope, &p.BusinessCase,
		&p.SponsorID, &p.ProjectManagerID, &p.Status, &p.RAGStatus, &p.Priority,
		&p.PlannedStart, &p.PlannedEnd, &p.ActualStart, &p.ActualEnd,
		&p.BudgetApproved, &p.BudgetSpent, &p.CompletionPct, &p.Metadata,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return Project{}, apperrors.Internal("failed to create project", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":    req.Title,
		"code":     req.Code,
		"priority": priority,
		"status":   "proposed",
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:project",
		EntityType: "project",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return p, nil
}

// GetProject retrieves a single project by ID.
func (s *ProjectService) GetProject(ctx context.Context, id uuid.UUID) (Project, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Project{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, portfolio_id, title, code, description, charter, scope, business_case,
			sponsor_id, project_manager_id, status, rag_status, priority,
			planned_start, planned_end, actual_start, actual_end,
			budget_approved, budget_spent, completion_pct, metadata,
			created_at, updated_at
		FROM projects
		WHERE id = $1 AND tenant_id = $2`

	var p Project
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&p.ID, &p.TenantID, &p.PortfolioID, &p.Title, &p.Code, &p.Description, &p.Charter, &p.Scope, &p.BusinessCase,
		&p.SponsorID, &p.ProjectManagerID, &p.Status, &p.RAGStatus, &p.Priority,
		&p.PlannedStart, &p.PlannedEnd, &p.ActualStart, &p.ActualEnd,
		&p.BudgetApproved, &p.BudgetSpent, &p.CompletionPct, &p.Metadata,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Project{}, apperrors.NotFound("Project", id.String())
		}
		return Project{}, apperrors.Internal("failed to get project", err)
	}

	return p, nil
}

// ListProjects returns a filtered, paginated list of projects.
func (s *ProjectService) ListProjects(ctx context.Context, portfolioID *uuid.UUID, status, ragStatus *string, limit, offset int) ([]Project, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM projects
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR portfolio_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR rag_status = $4)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, portfolioID, status, ragStatus).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count projects", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, portfolio_id, title, code, description, charter, scope, business_case,
			sponsor_id, project_manager_id, status, rag_status, priority,
			planned_start, planned_end, actual_start, actual_end,
			budget_approved, budget_spent, completion_pct, metadata,
			created_at, updated_at
		FROM projects
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR portfolio_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR rag_status = $4)
		ORDER BY created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, portfolioID, status, ragStatus, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list projects", err)
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.PortfolioID, &p.Title, &p.Code, &p.Description, &p.Charter, &p.Scope, &p.BusinessCase,
			&p.SponsorID, &p.ProjectManagerID, &p.Status, &p.RAGStatus, &p.Priority,
			&p.PlannedStart, &p.PlannedEnd, &p.ActualStart, &p.ActualEnd,
			&p.BudgetApproved, &p.BudgetSpent, &p.CompletionPct, &p.Metadata,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan project", err)
		}
		projects = append(projects, p)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate projects", err)
	}

	if projects == nil {
		projects = []Project{}
	}

	return projects, total, nil
}

// UpdateProject updates an existing project using COALESCE partial update.
func (s *ProjectService) UpdateProject(ctx context.Context, id uuid.UUID, req UpdateProjectRequest) (Project, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Project{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the project exists and belongs to the tenant.
	_, err := s.GetProject(ctx, id)
	if err != nil {
		return Project{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE projects SET
			title = COALESCE($1, title),
			code = COALESCE($2, code),
			description = COALESCE($3, description),
			charter = COALESCE($4, charter),
			scope = COALESCE($5, scope),
			business_case = COALESCE($6, business_case),
			portfolio_id = COALESCE($7, portfolio_id),
			sponsor_id = COALESCE($8, sponsor_id),
			project_manager_id = COALESCE($9, project_manager_id),
			status = COALESCE($10, status),
			rag_status = COALESCE($11, rag_status),
			priority = COALESCE($12, priority),
			planned_start = COALESCE($13, planned_start),
			planned_end = COALESCE($14, planned_end),
			actual_start = COALESCE($15, actual_start),
			actual_end = COALESCE($16, actual_end),
			budget_approved = COALESCE($17, budget_approved),
			budget_spent = COALESCE($18, budget_spent),
			completion_pct = COALESCE($19, completion_pct),
			metadata = COALESCE($20, metadata),
			updated_at = $21
		WHERE id = $22 AND tenant_id = $23
		RETURNING id, tenant_id, portfolio_id, title, code, description, charter, scope, business_case,
			sponsor_id, project_manager_id, status, rag_status, priority,
			planned_start, planned_end, actual_start, actual_end,
			budget_approved, budget_spent, completion_pct, metadata,
			created_at, updated_at`

	var p Project
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Code, req.Description, req.Charter, req.Scope, req.BusinessCase,
		req.PortfolioID, req.SponsorID, req.ProjectManagerID,
		req.Status, req.RAGStatus, req.Priority,
		req.PlannedStart, req.PlannedEnd, req.ActualStart, req.ActualEnd,
		req.BudgetApproved, req.BudgetSpent, req.CompletionPct,
		req.Metadata,
		now, id, auth.TenantID,
	).Scan(
		&p.ID, &p.TenantID, &p.PortfolioID, &p.Title, &p.Code, &p.Description, &p.Charter, &p.Scope, &p.BusinessCase,
		&p.SponsorID, &p.ProjectManagerID, &p.Status, &p.RAGStatus, &p.Priority,
		&p.PlannedStart, &p.PlannedEnd, &p.ActualStart, &p.ActualEnd,
		&p.BudgetApproved, &p.BudgetSpent, &p.CompletionPct, &p.Metadata,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return Project{}, apperrors.Internal("failed to update project", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:project",
		EntityType: "project",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return p, nil
}

// DeleteProject deletes a project by ID.
func (s *ProjectService) DeleteProject(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM projects WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete project", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Project", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:project",
		EntityType: "project",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ApproveProject transitions a project to a new status with validation.
// Valid transitions: proposed->approved, approved->active, active->on_hold/completed, on_hold->active/cancelled
func (s *ProjectService) ApproveProject(ctx context.Context, id uuid.UUID, req ApproveProjectRequest) (Project, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Project{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetProject(ctx, id)
	if err != nil {
		return Project{}, err
	}

	// Validate status transition.
	if !isValidProjectTransition(existing.Status, req.Status) {
		return Project{}, apperrors.BadRequest(
			fmt.Sprintf("invalid status transition from '%s' to '%s'", existing.Status, req.Status),
		)
	}

	now := time.Now().UTC()

	query := `
		UPDATE projects SET status = $1, updated_at = $2
		WHERE id = $3 AND tenant_id = $4
		RETURNING id, tenant_id, portfolio_id, title, code, description, charter, scope, business_case,
			sponsor_id, project_manager_id, status, rag_status, priority,
			planned_start, planned_end, actual_start, actual_end,
			budget_approved, budget_spent, completion_pct, metadata,
			created_at, updated_at`

	var p Project
	err = s.pool.QueryRow(ctx, query, req.Status, now, id, auth.TenantID).Scan(
		&p.ID, &p.TenantID, &p.PortfolioID, &p.Title, &p.Code, &p.Description, &p.Charter, &p.Scope, &p.BusinessCase,
		&p.SponsorID, &p.ProjectManagerID, &p.Status, &p.RAGStatus, &p.Priority,
		&p.PlannedStart, &p.PlannedEnd, &p.ActualStart, &p.ActualEnd,
		&p.BudgetApproved, &p.BudgetSpent, &p.CompletionPct, &p.Metadata,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return Project{}, apperrors.Internal("failed to approve project", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      req.Status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "approve:project",
		EntityType: "project",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return p, nil
}

// isValidProjectTransition checks whether a project status transition is allowed.
func isValidProjectTransition(from, to string) bool {
	allowed := map[string][]string{
		"proposed":  {"approved"},
		"approved":  {"active"},
		"active":    {"on_hold", "completed"},
		"on_hold":   {"active", "cancelled"},
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

// ListProjectDependencies returns all dependencies for a project.
func (s *ProjectService) ListProjectDependencies(ctx context.Context, projectID uuid.UUID) ([]ProjectDependency, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify the project exists.
	_, err := s.GetProject(ctx, projectID)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, project_id, depends_on_project_id, dependency_type, description, impact_if_delayed, created_at
		FROM project_dependencies
		WHERE project_id = $1`

	rows, err := s.pool.Query(ctx, query, projectID)
	if err != nil {
		return nil, apperrors.Internal("failed to list project dependencies", err)
	}
	defer rows.Close()

	var deps []ProjectDependency
	for rows.Next() {
		var d ProjectDependency
		if err := rows.Scan(
			&d.ID, &d.ProjectID, &d.DependsOnProjectID, &d.DependencyType, &d.Description, &d.ImpactIfDelayed, &d.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan project dependency", err)
		}
		deps = append(deps, d)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate project dependencies", err)
	}

	if deps == nil {
		deps = []ProjectDependency{}
	}

	return deps, nil
}

// AddProjectDependency adds a dependency to a project.
func (s *ProjectService) AddProjectDependency(ctx context.Context, projectID uuid.UUID, req CreateProjectDependencyRequest) (ProjectDependency, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ProjectDependency{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the project exists.
	_, err := s.GetProject(ctx, projectID)
	if err != nil {
		return ProjectDependency{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	depType := "finish_to_start"
	if req.DependencyType != nil {
		depType = *req.DependencyType
	}

	query := `
		INSERT INTO project_dependencies (
			id, project_id, depends_on_project_id, dependency_type, description, impact_if_delayed, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, project_id, depends_on_project_id, dependency_type, description, impact_if_delayed, created_at`

	var d ProjectDependency
	err = s.pool.QueryRow(ctx, query,
		id, projectID, req.DependsOnProjectID, depType, req.Description, req.ImpactIfDelayed, now,
	).Scan(
		&d.ID, &d.ProjectID, &d.DependsOnProjectID, &d.DependencyType, &d.Description, &d.ImpactIfDelayed, &d.CreatedAt,
	)
	if err != nil {
		return ProjectDependency{}, apperrors.Internal("failed to add project dependency", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"depends_on_project_id": req.DependsOnProjectID,
		"dependency_type":       depType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:project_dependency",
		EntityType: "project_dependency",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return d, nil
}

// RemoveProjectDependency removes a dependency from a project.
func (s *ProjectService) RemoveProjectDependency(ctx context.Context, projectID, dependencyID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM project_dependencies WHERE id = $1 AND project_id = $2`

	result, err := s.pool.Exec(ctx, query, dependencyID, projectID)
	if err != nil {
		return apperrors.Internal("failed to remove project dependency", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ProjectDependency", dependencyID.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:project_dependency",
		EntityType: "project_dependency",
		EntityID:   dependencyID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ListProjectStakeholders returns all stakeholders for a project.
func (s *ProjectService) ListProjectStakeholders(ctx context.Context, projectID uuid.UUID) ([]ProjectStakeholder, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify the project exists.
	_, err := s.GetProject(ctx, projectID)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, project_id, user_id, role, influence, interest, communication_preference, created_at
		FROM project_stakeholders
		WHERE project_id = $1`

	rows, err := s.pool.Query(ctx, query, projectID)
	if err != nil {
		return nil, apperrors.Internal("failed to list project stakeholders", err)
	}
	defer rows.Close()

	var stakeholders []ProjectStakeholder
	for rows.Next() {
		var sh ProjectStakeholder
		if err := rows.Scan(
			&sh.ID, &sh.ProjectID, &sh.UserID, &sh.Role, &sh.Influence, &sh.Interest, &sh.CommunicationPreference, &sh.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan project stakeholder", err)
		}
		stakeholders = append(stakeholders, sh)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate project stakeholders", err)
	}

	if stakeholders == nil {
		stakeholders = []ProjectStakeholder{}
	}

	return stakeholders, nil
}

// AddProjectStakeholder adds a stakeholder to a project.
func (s *ProjectService) AddProjectStakeholder(ctx context.Context, projectID uuid.UUID, req AddProjectStakeholderRequest) (ProjectStakeholder, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ProjectStakeholder{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the project exists.
	_, err := s.GetProject(ctx, projectID)
	if err != nil {
		return ProjectStakeholder{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO project_stakeholders (
			id, project_id, user_id, role, influence, interest, communication_preference, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, project_id, user_id, role, influence, interest, communication_preference, created_at`

	var sh ProjectStakeholder
	err = s.pool.QueryRow(ctx, query,
		id, projectID, req.UserID, req.Role, req.Influence, req.Interest, req.CommunicationPreference, now,
	).Scan(
		&sh.ID, &sh.ProjectID, &sh.UserID, &sh.Role, &sh.Influence, &sh.Interest, &sh.CommunicationPreference, &sh.CreatedAt,
	)
	if err != nil {
		return ProjectStakeholder{}, apperrors.Internal("failed to add project stakeholder", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"user_id": req.UserID,
		"role":    req.Role,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:project_stakeholder",
		EntityType: "project_stakeholder",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return sh, nil
}

// RemoveProjectStakeholder removes a stakeholder from a project.
func (s *ProjectService) RemoveProjectStakeholder(ctx context.Context, projectID, stakeholderID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM project_stakeholders WHERE id = $1 AND project_id = $2`

	result, err := s.pool.Exec(ctx, query, stakeholderID, projectID)
	if err != nil {
		return apperrors.Internal("failed to remove project stakeholder", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ProjectStakeholder", stakeholderID.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:project_stakeholder",
		EntityType: "project_stakeholder",
		EntityID:   stakeholderID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

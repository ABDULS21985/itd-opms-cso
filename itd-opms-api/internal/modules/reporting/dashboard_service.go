package reporting

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// DashboardService
// ──────────────────────────────────────────────

// DashboardService provides dashboard aggregation and chart data queries.
type DashboardService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewDashboardService creates a new DashboardService.
func NewDashboardService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *DashboardService {
	return &DashboardService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Executive Summary
// ──────────────────────────────────────────────

// GetExecutiveSummary returns the pre-computed executive summary for the tenant.
func (s *DashboardService) GetExecutiveSummary(ctx context.Context) (ExecutiveSummary, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ExecutiveSummary{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			tenant_id, active_policies, overdue_actions,
			avg_okr_progress, open_tickets, critical_tickets,
			active_projects, active_assets, over_deployed_licenses,
			high_risks, expiring_certs, refreshed_at
		FROM mv_executive_summary
		WHERE tenant_id = $1`

	var es ExecutiveSummary
	err := s.pool.QueryRow(ctx, query, auth.TenantID).Scan(
		&es.TenantID, &es.ActivePolicies, &es.OverdueActions,
		&es.AvgOKRProgress, &es.OpenTickets, &es.CriticalTickets,
		&es.ActiveProjects, &es.ActiveAssets, &es.OverDeployedLicenses,
		&es.HighRisks, &es.ExpiringCerts, &es.RefreshedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Return zeroed summary if view has no data for this tenant.
			return ExecutiveSummary{
				TenantID:    auth.TenantID,
				RefreshedAt: time.Now().UTC(),
			}, nil
		}
		return ExecutiveSummary{}, apperrors.Internal("failed to get executive summary", err)
	}

	return es, nil
}

// RefreshExecutiveSummary refreshes the materialized view concurrently.
func (s *DashboardService) RefreshExecutiveSummary(ctx context.Context) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	_, err := s.pool.Exec(ctx, `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_executive_summary`)
	if err != nil {
		return apperrors.Internal("failed to refresh executive summary", err)
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "refresh:executive_summary",
		EntityType: "dashboard",
		EntityID:   auth.TenantID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Chart Data — Tickets
// ──────────────────────────────────────────────

// GetTicketsByPriority returns ticket counts grouped by priority.
func (s *DashboardService) GetTicketsByPriority(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT priority AS label, COUNT(*)::int AS value
		FROM tickets
		WHERE tenant_id = $1
			AND status NOT IN ('closed', 'cancelled')
		GROUP BY priority
		ORDER BY
			CASE priority
				WHEN 'P1' THEN 1
				WHEN 'P2' THEN 2
				WHEN 'P3' THEN 3
				WHEN 'P4' THEN 4
				ELSE 5
			END`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// GetTicketsByStatus returns ticket counts grouped by status.
func (s *DashboardService) GetTicketsByStatus(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT status AS label, COUNT(*)::int AS value
		FROM tickets
		WHERE tenant_id = $1
		GROUP BY status
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// ──────────────────────────────────────────────
// Chart Data — Projects
// ──────────────────────────────────────────────

// GetProjectsByStatus returns project counts grouped by status.
func (s *DashboardService) GetProjectsByStatus(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT status AS label, COUNT(*)::int AS value
		FROM projects
		WHERE tenant_id = $1
		GROUP BY status
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// ──────────────────────────────────────────────
// Chart Data — Assets
// ──────────────────────────────────────────────

// GetAssetsByType returns asset counts grouped by asset_type.
func (s *DashboardService) GetAssetsByType(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT asset_type AS label, COUNT(*)::int AS value
		FROM assets
		WHERE tenant_id = $1
		GROUP BY asset_type
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// GetAssetsByStatus returns asset counts grouped by status.
func (s *DashboardService) GetAssetsByStatus(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT status AS label, COUNT(*)::int AS value
		FROM assets
		WHERE tenant_id = $1
		GROUP BY status
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// ──────────────────────────────────────────────
// SLA Compliance
// ──────────────────────────────────────────────

// GetSLAComplianceRate calculates the SLA compliance rate since the given time.
func (s *DashboardService) GetSLAComplianceRate(ctx context.Context, since time.Time) (float64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return 0, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			CASE WHEN COUNT(*) = 0 THEN 100.0
			ELSE (COUNT(*) FILTER (WHERE sla_resolution_met = true)::float8 / COUNT(*)::float8) * 100.0
			END AS compliance_rate
		FROM tickets
		WHERE tenant_id = $1
			AND sla_resolution_met IS NOT NULL
			AND created_at >= $2`

	var rate float64
	err := s.pool.QueryRow(ctx, query, auth.TenantID, since).Scan(&rate)
	if err != nil {
		return 0, apperrors.Internal("failed to get SLA compliance rate", err)
	}

	return rate, nil
}

// ──────────────────────────────────────────────
// My Dashboard
// ──────────────────────────────────────────────

// GetMyDashboard returns role-specific dashboard data for the authenticated user.
func (s *DashboardService) GetMyDashboard(ctx context.Context) (map[string]any, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	result := map[string]any{}

	// My open tickets (assigned to me).
	var myTickets int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE tenant_id = $1
			AND assignee_id = $2
			AND status NOT IN ('closed', 'cancelled', 'resolved')`,
		auth.TenantID, auth.UserID,
	).Scan(&myTickets)
	if err != nil {
		return nil, apperrors.Internal("failed to count my tickets", err)
	}
	result["myOpenTickets"] = myTickets

	// My active projects.
	var myProjects int
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM projects
		WHERE tenant_id = $1
			AND (owner_id = $2 OR manager_id = $2)
			AND status NOT IN ('completed', 'cancelled', 'closed')`,
		auth.TenantID, auth.UserID,
	).Scan(&myProjects)
	if err != nil {
		return nil, apperrors.Internal("failed to count my projects", err)
	}
	result["myActiveProjects"] = myProjects

	// My pending approvals (action items assigned to me that are pending).
	var myApprovals int
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM action_items
		WHERE tenant_id = $1
			AND assignee_id = $2
			AND status = 'pending'`,
		auth.TenantID, auth.UserID,
	).Scan(&myApprovals)
	if err != nil {
		return nil, apperrors.Internal("failed to count my pending approvals", err)
	}
	result["myPendingApprovals"] = myApprovals

	// My overdue action items.
	var myOverdue int
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM action_items
		WHERE tenant_id = $1
			AND assignee_id = $2
			AND status NOT IN ('completed', 'cancelled')
			AND due_date < NOW()`,
		auth.TenantID, auth.UserID,
	).Scan(&myOverdue)
	if err != nil {
		return nil, apperrors.Internal("failed to count my overdue items", err)
	}
	result["myOverdueItems"] = myOverdue

	return result, nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// queryChartData executes a query that returns (label, value) rows as chart data points.
func (s *DashboardService) queryChartData(ctx context.Context, query string, args ...any) ([]ChartDataPoint, error) {
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, apperrors.Internal("failed to query chart data", err)
	}
	defer rows.Close()

	var points []ChartDataPoint
	for rows.Next() {
		var p ChartDataPoint
		if err := rows.Scan(&p.Label, &p.Value); err != nil {
			return nil, apperrors.Internal("failed to scan chart data", err)
		}
		points = append(points, p)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate chart data", err)
	}

	if points == nil {
		points = []ChartDataPoint{}
	}

	return points, nil
}

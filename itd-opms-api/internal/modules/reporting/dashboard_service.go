package reporting

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

const (
	executiveSummaryCacheTTL       = 5 * time.Minute
	executiveSummaryCacheKeyPrefix = "reporting:executive_summary:"
	executiveSummaryRefreshLockKey = int64(82001501)
)

// ──────────────────────────────────────────────
// DashboardService
// ──────────────────────────────────────────────

// DashboardService provides dashboard aggregation and chart data queries.
type DashboardService struct {
	pool     *pgxpool.Pool
	redis    *redis.Client
	auditSvc *audit.AuditService
}

// NewDashboardService creates a new DashboardService.
func NewDashboardService(pool *pgxpool.Pool, redisClient *redis.Client, auditSvc *audit.AuditService) *DashboardService {
	return &DashboardService{
		pool:     pool,
		redis:    redisClient,
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

	return s.getExecutiveSummaryByTenant(ctx, auth.TenantID)
}

// GetExecutiveSummaryForTenant returns the executive summary for a specific tenant.
func (s *DashboardService) GetExecutiveSummaryForTenant(ctx context.Context, tenantID uuid.UUID) (ExecutiveSummary, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ExecutiveSummary{}, apperrors.Unauthorized("authentication required")
	}
	if tenantID == uuid.Nil {
		return ExecutiveSummary{}, apperrors.BadRequest("tenantId is required")
	}
	if tenantID != auth.TenantID && !auth.HasRole("global_admin") && !auth.HasPermission("*") {
		return ExecutiveSummary{}, apperrors.Forbidden("tenant-scoped dashboard access denied")
	}

	return s.getExecutiveSummaryByTenant(ctx, tenantID)
}

func (s *DashboardService) getExecutiveSummaryByTenant(ctx context.Context, tenantID uuid.UUID) (ExecutiveSummary, error) {
	if s.redis != nil {
		if cached, err := s.redis.Get(ctx, executiveSummaryCacheKey(tenantID)).Bytes(); err == nil {
			var es ExecutiveSummary
			if err := json.Unmarshal(cached, &es); err == nil {
				return es, nil
			}
			slog.WarnContext(ctx, "failed to unmarshal cached executive summary", "tenant_id", tenantID, "error", err)
		} else if err != redis.Nil {
			slog.WarnContext(ctx, "failed to read executive summary cache", "tenant_id", tenantID, "error", err)
		}
	}

	es, err := s.queryExecutiveSummaryByTenant(ctx, tenantID)
	if err != nil {
		return ExecutiveSummary{}, err
	}
	if err := s.populateExecutiveSummaryLiveMetrics(ctx, &es); err != nil {
		return ExecutiveSummary{}, err
	}

	if s.redis != nil {
		if payload, err := json.Marshal(es); err == nil {
			if err := s.redis.Set(ctx, executiveSummaryCacheKey(tenantID), payload, executiveSummaryCacheTTL).Err(); err != nil {
				slog.WarnContext(ctx, "failed to cache executive summary", "tenant_id", tenantID, "error", err)
			}
		}
	}

	return es, nil
}

func (s *DashboardService) queryExecutiveSummaryByTenant(ctx context.Context, tenantID uuid.UUID) (ExecutiveSummary, error) {
	query := `
		SELECT
			tenant_id, active_policies, overdue_actions, pending_attestations,
			avg_okr_progress, open_tickets, critical_tickets, open_tickets_p1, open_tickets_p2, open_tickets_p3, open_tickets_p4,
			sla_compliance_pct, mttr_minutes, mtta_minutes, backlog_over_30_days,
			active_projects, projects_rag_green, projects_rag_amber, projects_rag_red, on_time_delivery_pct, milestone_burn_down_pct,
			active_assets, asset_counts_by_type, asset_counts_by_status, over_deployed_licenses, license_compliance_pct, warranties_expiring_90_days,
			high_risks, critical_risks, audit_readiness_score, access_review_completion_pct,
			team_capacity_utilization_pct, overdue_training_certs, expiring_certs, refreshed_at
		FROM mv_executive_summary
		WHERE tenant_id = $1`

	var es ExecutiveSummary
	var assetCountsByTypeJSON []byte
	var assetCountsByStatusJSON []byte
	err := s.pool.QueryRow(ctx, query, tenantID).Scan(
		&es.TenantID, &es.ActivePolicies, &es.OverdueActions, &es.PendingAttestations,
		&es.AvgOKRProgress, &es.OpenTickets, &es.CriticalTickets, &es.OpenTicketsP1, &es.OpenTicketsP2, &es.OpenTicketsP3, &es.OpenTicketsP4,
		&es.SLACompliancePct, &es.MTTRMinutes, &es.MTTAMinutes, &es.BacklogOver30Days,
		&es.ActiveProjects, &es.ProjectsRAGGreen, &es.ProjectsRAGAmber, &es.ProjectsRAGRed, &es.OnTimeDeliveryPct, &es.MilestoneBurnDownPct,
		&es.ActiveAssets, &assetCountsByTypeJSON, &assetCountsByStatusJSON, &es.OverDeployedLicenses, &es.LicenseCompliancePct, &es.WarrantiesExpiring90Days,
		&es.HighRisks, &es.CriticalRisks, &es.AuditReadinessScore, &es.AccessReviewCompletionPct,
		&es.TeamCapacityUtilizationPct, &es.OverdueTrainingCerts, &es.ExpiringCerts, &es.RefreshedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Return zeroed summary if view has no data for this tenant.
			es := ExecutiveSummary{
				TenantID:    tenantID,
				RefreshedAt: time.Now().UTC(),
			}
			es.AssetCountsByType = map[string]int{}
			es.AssetCountsByStatus = map[string]int{}
			return es, nil
		}
		return ExecutiveSummary{}, apperrors.Internal("failed to get executive summary", err)
	}

	if len(assetCountsByTypeJSON) > 0 {
		if err := json.Unmarshal(assetCountsByTypeJSON, &es.AssetCountsByType); err != nil {
			return ExecutiveSummary{}, apperrors.Internal("failed to decode asset_counts_by_type", err)
		}
	}
	if len(assetCountsByStatusJSON) > 0 {
		if err := json.Unmarshal(assetCountsByStatusJSON, &es.AssetCountsByStatus); err != nil {
			return ExecutiveSummary{}, apperrors.Internal("failed to decode asset_counts_by_status", err)
		}
	}
	if es.AssetCountsByType == nil {
		es.AssetCountsByType = map[string]int{}
	}
	if es.AssetCountsByStatus == nil {
		es.AssetCountsByStatus = map[string]int{}
	}

	return es, nil
}

func (s *DashboardService) populateExecutiveSummaryLiveMetrics(ctx context.Context, es *ExecutiveSummary) error {
	if es == nil || es.TenantID == uuid.Nil {
		return nil
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM policy_attestations
		WHERE tenant_id = $1
		  AND status = 'pending'`,
		es.TenantID,
	).Scan(&es.PendingAttestations); err != nil {
		return apperrors.Internal("failed to count pending attestations", err)
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE tenant_id = $1
		  AND type = 'incident'
		  AND priority = 'P1_critical'
		  AND status NOT IN ('resolved', 'closed', 'cancelled')`,
		es.TenantID,
	).Scan(&es.OpenP1Incidents); err != nil {
		return apperrors.Internal("failed to count open P1 incidents", err)
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM sla_breach_log bl
		JOIN tickets tk ON tk.id = bl.ticket_id
		WHERE tk.tenant_id = $1
		  AND bl.breached_at >= NOW() - INTERVAL '24 hours'`,
		es.TenantID,
	).Scan(&es.SLABreaches24h); err != nil {
		return apperrors.Internal("failed to count recent SLA breaches", err)
	}

	return nil
}

// RefreshExecutiveSummary refreshes the materialized view concurrently.
func (s *DashboardService) RefreshExecutiveSummary(ctx context.Context) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	if err := s.RefreshExecutiveSummarySystem(ctx, RunTriggerManual); err != nil {
		return err
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

// RefreshExecutiveSummarySystem refreshes the executive summary materialized view
// for non-request contexts (scheduler/background workers).
func (s *DashboardService) RefreshExecutiveSummarySystem(ctx context.Context, reason string) error {
	var locked bool
	if err := s.pool.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, executiveSummaryRefreshLockKey).Scan(&locked); err != nil {
		return apperrors.Internal("failed to acquire executive summary refresh lock", err)
	}
	if !locked {
		slog.InfoContext(ctx, "executive summary refresh skipped because another refresh is in progress", "reason", reason)
		return nil
	}
	defer func() {
		if _, err := s.pool.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, executiveSummaryRefreshLockKey); err != nil {
			slog.Warn("failed to release executive summary refresh lock", "error", err)
		}
	}()

	if _, err := s.pool.Exec(ctx, `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_executive_summary`); err != nil {
		return apperrors.Internal("failed to refresh executive summary", err)
	}

	s.invalidateAllExecutiveSummaryCache(ctx)
	slog.InfoContext(ctx, "executive summary materialized view refreshed", "reason", reason)
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
					WHEN 'P1_critical' THEN 1
					WHEN 'P2_high' THEN 2
					WHEN 'P3_medium' THEN 3
					WHEN 'P4_low' THEN 4
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

// GetAssetsByType returns asset counts grouped by type.
func (s *DashboardService) GetAssetsByType(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT type AS label, COUNT(*)::int AS value
		FROM assets
		WHERE tenant_id = $1
		GROUP BY type
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
			AND (project_manager_id = $2 OR sponsor_id = $2)
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
			AND owner_id = $2
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
			AND owner_id = $2
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
// Chart Data — Projects (extended)
// ──────────────────────────────────────────────

// GetProjectsByRAG returns project counts grouped by RAG status.
func (s *DashboardService) GetProjectsByRAG(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT rag_status AS label, COUNT(*)::int AS value
		FROM projects
		WHERE tenant_id = $1
		GROUP BY rag_status
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// GetProjectsByPriority returns project counts grouped by priority.
func (s *DashboardService) GetProjectsByPriority(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT priority AS label, COUNT(*)::int AS value
		FROM projects
		WHERE tenant_id = $1
		GROUP BY priority
		ORDER BY
			CASE priority
				WHEN 'critical' THEN 1
				WHEN 'high' THEN 2
				WHEN 'medium' THEN 3
				WHEN 'low' THEN 4
				ELSE 5
			END`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// ──────────────────────────────────────────────
// Chart Data — Risks
// ──────────────────────────────────────────────

// GetRisksByCategory returns open risk counts grouped by category.
func (s *DashboardService) GetRisksByCategory(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT COALESCE(category, 'uncategorized') AS label, COUNT(*)::int AS value
		FROM risk_register
		WHERE tenant_id = $1
			AND status = 'open'
		GROUP BY category
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// ──────────────────────────────────────────────
// Chart Data — Work Items
// ──────────────────────────────────────────────

// GetWorkItemsByStatus returns work item counts grouped by status.
func (s *DashboardService) GetWorkItemsByStatus(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT status AS label, COUNT(*)::int AS value
		FROM work_items
		WHERE tenant_id = $1
		GROUP BY status
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
}

// ──────────────────────────────────────────────
// Chart Data — Office Analytics
// ──────────────────────────────────────────────

// OfficeAnalytics holds aggregated analytics for a single office/division.
type OfficeAnalytics struct {
	DivisionID    uuid.UUID `json:"divisionId"`
	DivisionName  string    `json:"divisionName"`
	DivisionCode  string    `json:"divisionCode"`
	TotalProjects int       `json:"totalProjects"`
	ActiveProjects int      `json:"activeProjects"`
	CompletedProjects int   `json:"completedProjects"`
	AvgCompletionPct float64 `json:"avgCompletionPct"`
	BudgetApproved  float64 `json:"budgetApproved"`
	BudgetSpent     float64 `json:"budgetSpent"`
	RAGGreen       int      `json:"ragGreen"`
	RAGAmber       int      `json:"ragAmber"`
	RAGRed         int      `json:"ragRed"`
	OpenRisks      int      `json:"openRisks"`
	OpenIssues     int      `json:"openIssues"`
	TotalWorkItems int      `json:"totalWorkItems"`
	CompletedWorkItems int  `json:"completedWorkItems"`
	OverdueWorkItems   int  `json:"overdueWorkItems"`
	StaffCount     int      `json:"staffCount"`
}

// GetOfficeAnalytics returns analytics aggregated by office/division.
func (s *DashboardService) GetOfficeAnalytics(ctx context.Context) ([]OfficeAnalytics, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT
			o.id AS division_id,
			o.name AS division_name,
			o.code AS division_code,
			COUNT(DISTINCT p.id)::int AS total_projects,
			COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('active','approved','kick-off','in-development','implementation','project-mode','requirement-management','solution-architecture'))::int AS active_projects,
			COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'completed')::int AS completed_projects,
			COALESCE(AVG(p.completion_pct), 0)::float8 AS avg_completion_pct,
			COALESCE(SUM(p.budget_approved), 0)::float8 AS budget_approved,
			COALESCE(SUM(p.budget_spent), 0)::float8 AS budget_spent,
			COUNT(DISTINCT p.id) FILTER (WHERE p.rag_status = 'green')::int AS rag_green,
			COUNT(DISTINCT p.id) FILTER (WHERE p.rag_status = 'amber')::int AS rag_amber,
			COUNT(DISTINCT p.id) FILTER (WHERE p.rag_status = 'red')::int AS rag_red
		FROM org_units o
		LEFT JOIN projects p ON p.division_id = o.id AND p.tenant_id = $1
		WHERE o.tenant_id = $1
			AND o.level IN ('office', 'division')
			AND o.is_active = true
		GROUP BY o.id, o.name, o.code
		ORDER BY total_projects DESC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to query office analytics", err)
	}
	defer rows.Close()

	var results []OfficeAnalytics
	for rows.Next() {
		var a OfficeAnalytics
		if err := rows.Scan(
			&a.DivisionID, &a.DivisionName, &a.DivisionCode,
			&a.TotalProjects, &a.ActiveProjects, &a.CompletedProjects,
			&a.AvgCompletionPct, &a.BudgetApproved, &a.BudgetSpent,
			&a.RAGGreen, &a.RAGAmber, &a.RAGRed,
		); err != nil {
			return nil, apperrors.Internal("failed to scan office analytics", err)
		}
		results = append(results, a)
	}

	// Enrich with risk, issue, work item counts and staff counts per office.
	for i := range results {
		divID := results[i].DivisionID

		// Open risks for this office's projects.
		s.pool.QueryRow(ctx, `
			SELECT COUNT(*)::int FROM risk_register r
			JOIN projects p ON p.id = r.project_id
			WHERE r.tenant_id = $1 AND p.division_id = $2 AND r.status NOT IN ('closed','accepted')`,
			auth.TenantID, divID,
		).Scan(&results[i].OpenRisks)

		// Open issues for this office's projects.
		s.pool.QueryRow(ctx, `
			SELECT COUNT(*)::int FROM issues i
			JOIN projects p ON p.id = i.project_id
			WHERE i.tenant_id = $1 AND p.division_id = $2 AND i.status NOT IN ('closed','resolved')`,
			auth.TenantID, divID,
		).Scan(&results[i].OpenIssues)

		// Work item stats for this office's projects.
		s.pool.QueryRow(ctx, `
			SELECT
				COUNT(*)::int,
				COUNT(*) FILTER (WHERE wi.status IN ('done','completed'))::int,
				COUNT(*) FILTER (WHERE wi.due_date < NOW() AND wi.status NOT IN ('done','completed'))::int
			FROM work_items wi
			JOIN projects p ON p.id = wi.project_id
			WHERE wi.tenant_id = $1 AND p.division_id = $2`,
			auth.TenantID, divID,
		).Scan(&results[i].TotalWorkItems, &results[i].CompletedWorkItems, &results[i].OverdueWorkItems)

		// Staff count (users assigned to this office via role_bindings).
		s.pool.QueryRow(ctx, `
			SELECT COUNT(DISTINCT rb.user_id)::int FROM role_bindings rb
			WHERE rb.tenant_id = $1 AND rb.scope_id = $2 AND rb.is_active = true`,
			auth.TenantID, divID,
		).Scan(&results[i].StaffCount)
	}

	if results == nil {
		results = []OfficeAnalytics{}
	}

	return results, nil
}

// GetProjectsByOffice returns project counts grouped by office/division.
func (s *DashboardService) GetProjectsByOffice(ctx context.Context) ([]ChartDataPoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT COALESCE(o.name, 'Unassigned') AS label, COUNT(*)::int AS value
		FROM projects p
		LEFT JOIN org_units o ON o.id = p.division_id
		WHERE p.tenant_id = $1
		GROUP BY o.name
		ORDER BY value DESC`

	return s.queryChartData(ctx, query, auth.TenantID)
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

func executiveSummaryCacheKey(tenantID uuid.UUID) string {
	return executiveSummaryCacheKeyPrefix + tenantID.String()
}

func (s *DashboardService) invalidateAllExecutiveSummaryCache(ctx context.Context) {
	if s.redis == nil {
		return
	}

	var cursor uint64
	for {
		keys, nextCursor, err := s.redis.Scan(ctx, cursor, executiveSummaryCacheKeyPrefix+"*", 100).Result()
		if err != nil {
			slog.WarnContext(ctx, "failed to scan executive summary cache keys", "error", err)
			return
		}
		if len(keys) > 0 {
			if err := s.redis.Del(ctx, keys...).Err(); err != nil {
				slog.WarnContext(ctx, "failed to clear executive summary cache keys", "count", len(keys), "error", err)
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			return
		}
	}
}

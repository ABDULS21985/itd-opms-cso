package planning

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// BudgetService
// ──────────────────────────────────────────────

// BudgetService handles business logic for project budgets, cost entries,
// budget snapshots, and portfolio-level budget analytics.
type BudgetService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewBudgetService creates a new BudgetService.
func NewBudgetService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *BudgetService {
	return &BudgetService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Budget Summary
// ──────────────────────────────────────────────

// GetBudgetSummary aggregates actual, committed, and forecast spending for a
// project, computes earned value metrics (CPI, burn rate), and returns a
// per-category breakdown.
func (s *BudgetService) GetBudgetSummary(ctx context.Context, projectID uuid.UUID) (BudgetSummary, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BudgetSummary{}, apperrors.Unauthorized("authentication required")
	}

	// Fetch approved budget and completion percentage from the projects table.
	var approvedBudget, completionPct float64
	projQuery := `
		SELECT COALESCE(budget_approved, 0), COALESCE(completion_pct, 0)
		FROM projects
		WHERE id = $1 AND tenant_id = $2`
	err := s.pool.QueryRow(ctx, projQuery, projectID, auth.TenantID).Scan(&approvedBudget, &completionPct)
	if err != nil {
		if err == pgx.ErrNoRows {
			return BudgetSummary{}, apperrors.NotFound("Project", projectID.String())
		}
		return BudgetSummary{}, apperrors.Internal("failed to get project budget", err)
	}

	// Aggregate spending by entry type.
	aggQuery := `
		SELECT
			COALESCE(SUM(CASE WHEN entry_type = 'actual' THEN amount ELSE 0 END), 0) AS actual_spend,
			COALESCE(SUM(CASE WHEN entry_type = 'committed' THEN amount ELSE 0 END), 0) AS committed_spend,
			COALESCE(SUM(CASE WHEN entry_type = 'forecast' THEN amount ELSE 0 END), 0) AS forecast_total
		FROM project_cost_entries
		WHERE project_id = $1 AND tenant_id = $2`

	var actualSpend, committedSpend, forecastTotal float64
	err = s.pool.QueryRow(ctx, aggQuery, projectID, auth.TenantID).Scan(&actualSpend, &committedSpend, &forecastTotal)
	if err != nil {
		return BudgetSummary{}, apperrors.Internal("failed to aggregate cost entries", err)
	}

	remaining := approvedBudget - actualSpend - committedSpend
	var variancePct float64
	if approvedBudget > 0 {
		variancePct = ((approvedBudget - actualSpend - committedSpend) / approvedBudget) * 100
	}

	// Compute burn rate (average monthly actual spend).
	var burnRate float64
	burnQuery := `
		SELECT COALESCE(
			SUM(amount) / NULLIF(
				EXTRACT(MONTH FROM AGE(MAX(entry_date), MIN(entry_date))) + 1, 0
			), 0
		)
		FROM project_cost_entries
		WHERE project_id = $1 AND tenant_id = $2 AND entry_type = 'actual'`
	_ = s.pool.QueryRow(ctx, burnQuery, projectID, auth.TenantID).Scan(&burnRate)

	var monthsRemaining float64
	if burnRate > 0 {
		monthsRemaining = remaining / burnRate
	}

	// Estimated at completion (EAC) using CPI method.
	var cpi float64
	if completionPct > 0 && actualSpend > 0 {
		// CPI = earned value / actual cost
		// earned value = budget * completion %
		earnedValue := approvedBudget * (completionPct / 100)
		cpi = earnedValue / actualSpend
	} else if actualSpend == 0 {
		cpi = 1.0
	}

	var eac float64
	if cpi > 0 {
		eac = approvedBudget / cpi
	} else {
		eac = actualSpend + remaining
	}

	// Category breakdown.
	catQuery := `
		SELECT
			COALESCE(ce.category_id, '00000000-0000-0000-0000-000000000000'),
			COALESCE(cc.name, 'Uncategorised'),
			COALESCE(SUM(CASE WHEN ce.entry_type = 'actual' THEN ce.amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN ce.entry_type = 'committed' THEN ce.amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN ce.entry_type = 'forecast' THEN ce.amount ELSE 0 END), 0)
		FROM project_cost_entries ce
		LEFT JOIN cost_categories cc ON cc.id = ce.category_id
		WHERE ce.project_id = $1 AND ce.tenant_id = $2
		GROUP BY ce.category_id, cc.name
		ORDER BY cc.name`

	catRows, err := s.pool.Query(ctx, catQuery, projectID, auth.TenantID)
	if err != nil {
		return BudgetSummary{}, apperrors.Internal("failed to get category breakdown", err)
	}
	defer catRows.Close()

	var byCategory []CategorySpend
	for catRows.Next() {
		var cs CategorySpend
		if err := catRows.Scan(&cs.CategoryID, &cs.CategoryName, &cs.Actual, &cs.Committed, &cs.Forecast); err != nil {
			return BudgetSummary{}, apperrors.Internal("failed to scan category spend", err)
		}
		byCategory = append(byCategory, cs)
	}
	if err := catRows.Err(); err != nil {
		return BudgetSummary{}, apperrors.Internal("failed to iterate category breakdown", err)
	}
	if byCategory == nil {
		byCategory = []CategorySpend{}
	}

	return BudgetSummary{
		ProjectID:            projectID,
		ApprovedBudget:       approvedBudget,
		ActualSpend:          actualSpend,
		CommittedSpend:       committedSpend,
		ForecastTotal:        forecastTotal,
		RemainingBudget:      remaining,
		VariancePct:          math.Round(variancePct*100) / 100,
		BurnRate:             math.Round(burnRate*100) / 100,
		MonthsRemaining:      math.Round(monthsRemaining*100) / 100,
		EstimatedAtCompletion: math.Round(eac*100) / 100,
		CostPerformanceIndex: math.Round(cpi*100) / 100,
		ByCategory:           byCategory,
	}, nil
}

// ──────────────────────────────────────────────
// Cost Entries
// ──────────────────────────────────────────────

// ListCostEntries returns a filtered, paginated list of cost entries for a project.
func (s *BudgetService) ListCostEntries(
	ctx context.Context,
	projectID uuid.UUID,
	entryType, categoryID, startDate, endDate *string,
	limit, offset int,
) ([]CostEntry, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM project_cost_entries ce
		WHERE ce.project_id = $1 AND ce.tenant_id = $2
			AND ($3::text IS NULL OR ce.entry_type = $3)
			AND ($4::text IS NULL OR ce.category_id::text = $4)
			AND ($5::text IS NULL OR ce.entry_date >= $5::date)
			AND ($6::text IS NULL OR ce.entry_date <= $6::date)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, projectID, auth.TenantID, entryType, categoryID, startDate, endDate).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count cost entries", err)
	}

	dataQuery := `
		SELECT
			ce.id, ce.tenant_id, ce.project_id, ce.category_id,
			COALESCE(cc.name, '') AS category_name,
			ce.description, ce.amount, ce.entry_type, ce.entry_date,
			ce.vendor_name, ce.invoice_ref, ce.document_id,
			ce.created_by,
			COALESCE(u.display_name, '') AS creator_name,
			ce.created_at, ce.updated_at
		FROM project_cost_entries ce
		LEFT JOIN cost_categories cc ON cc.id = ce.category_id
		LEFT JOIN users u ON u.id = ce.created_by
		WHERE ce.project_id = $1 AND ce.tenant_id = $2
			AND ($3::text IS NULL OR ce.entry_type = $3)
			AND ($4::text IS NULL OR ce.category_id::text = $4)
			AND ($5::text IS NULL OR ce.entry_date >= $5::date)
			AND ($6::text IS NULL OR ce.entry_date <= $6::date)
		ORDER BY ce.entry_date DESC, ce.created_at DESC
		LIMIT $7 OFFSET $8`

	rows, err := s.pool.Query(ctx, dataQuery, projectID, auth.TenantID, entryType, categoryID, startDate, endDate, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list cost entries", err)
	}
	defer rows.Close()

	var entries []CostEntry
	for rows.Next() {
		var e CostEntry
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.ProjectID, &e.CategoryID,
			&e.CategoryName,
			&e.Description, &e.Amount, &e.EntryType, &e.EntryDate,
			&e.VendorName, &e.InvoiceRef, &e.DocumentID,
			&e.CreatedBy, &e.CreatorName,
			&e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan cost entry", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate cost entries", err)
	}
	if entries == nil {
		entries = []CostEntry{}
	}

	return entries, total, nil
}

// CreateCostEntry creates a new cost entry for a project.
func (s *BudgetService) CreateCostEntry(ctx context.Context, projectID uuid.UUID, req CreateCostEntryRequest) (CostEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CostEntry{}, apperrors.Unauthorized("authentication required")
	}

	// Validate entry type.
	if req.EntryType != EntryTypeActual && req.EntryType != EntryTypeCommitted && req.EntryType != EntryTypeForecast {
		return CostEntry{}, apperrors.BadRequest(
			fmt.Sprintf("invalid entry_type '%s'; must be one of: actual, committed, forecast", req.EntryType),
		)
	}

	id := uuid.New()
	now := time.Now().UTC()

	entryDate := now
	if req.EntryDate != nil {
		entryDate = *req.EntryDate
	}

	query := `
		INSERT INTO project_cost_entries (
			id, tenant_id, project_id, category_id, description,
			amount, entry_type, entry_date, vendor_name, invoice_ref,
			document_id, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14
		)
		RETURNING id, tenant_id, project_id, category_id, description,
			amount, entry_type, entry_date, vendor_name, invoice_ref,
			document_id, created_by, created_at, updated_at`

	var e CostEntry
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, projectID, req.CategoryID, req.Description,
		req.Amount, req.EntryType, entryDate, req.VendorName, req.InvoiceRef,
		req.DocumentID, auth.UserID, now, now,
	).Scan(
		&e.ID, &e.TenantID, &e.ProjectID, &e.CategoryID, &e.Description,
		&e.Amount, &e.EntryType, &e.EntryDate, &e.VendorName, &e.InvoiceRef,
		&e.DocumentID, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		return CostEntry{}, apperrors.Internal("failed to create cost entry", err)
	}

	// Update the projects.budget_spent with total actual spend.
	updateBudgetSpent := `
		UPDATE projects SET budget_spent = (
			SELECT COALESCE(SUM(amount), 0)
			FROM project_cost_entries
			WHERE project_id = $1 AND tenant_id = $2 AND entry_type = 'actual'
		)
		WHERE id = $1 AND tenant_id = $2`
	if _, err := s.pool.Exec(ctx, updateBudgetSpent, projectID, auth.TenantID); err != nil {
		slog.ErrorContext(ctx, "failed to update project budget_spent", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"description": req.Description,
		"amount":      req.Amount,
		"entry_type":  req.EntryType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:cost_entry",
		EntityType: "cost_entry",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return e, nil
}

// UpdateCostEntry performs a partial update on an existing cost entry.
func (s *BudgetService) UpdateCostEntry(ctx context.Context, projectID, entryID uuid.UUID, req UpdateCostEntryRequest) (CostEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CostEntry{}, apperrors.Unauthorized("authentication required")
	}

	// Validate entry type if provided.
	if req.EntryType != nil {
		if *req.EntryType != EntryTypeActual && *req.EntryType != EntryTypeCommitted && *req.EntryType != EntryTypeForecast {
			return CostEntry{}, apperrors.BadRequest(
				fmt.Sprintf("invalid entry_type '%s'; must be one of: actual, committed, forecast", *req.EntryType),
			)
		}
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE project_cost_entries SET
			category_id = COALESCE($1, category_id),
			description = COALESCE($2, description),
			amount = COALESCE($3, amount),
			entry_type = COALESCE($4, entry_type),
			entry_date = COALESCE($5, entry_date),
			vendor_name = COALESCE($6, vendor_name),
			invoice_ref = COALESCE($7, invoice_ref),
			document_id = COALESCE($8, document_id),
			updated_at = $9
		WHERE id = $10 AND project_id = $11 AND tenant_id = $12
		RETURNING id, tenant_id, project_id, category_id, description,
			amount, entry_type, entry_date, vendor_name, invoice_ref,
			document_id, created_by, created_at, updated_at`

	var e CostEntry
	err := s.pool.QueryRow(ctx, updateQuery,
		req.CategoryID, req.Description, req.Amount,
		req.EntryType, req.EntryDate, req.VendorName,
		req.InvoiceRef, req.DocumentID,
		now, entryID, projectID, auth.TenantID,
	).Scan(
		&e.ID, &e.TenantID, &e.ProjectID, &e.CategoryID, &e.Description,
		&e.Amount, &e.EntryType, &e.EntryDate, &e.VendorName, &e.InvoiceRef,
		&e.DocumentID, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return CostEntry{}, apperrors.NotFound("CostEntry", entryID.String())
		}
		return CostEntry{}, apperrors.Internal("failed to update cost entry", err)
	}

	// Update the projects.budget_spent with total actual spend.
	updateBudgetSpent := `
		UPDATE projects SET budget_spent = (
			SELECT COALESCE(SUM(amount), 0)
			FROM project_cost_entries
			WHERE project_id = $1 AND tenant_id = $2 AND entry_type = 'actual'
		)
		WHERE id = $1 AND tenant_id = $2`
	if _, err := s.pool.Exec(ctx, updateBudgetSpent, projectID, auth.TenantID); err != nil {
		slog.ErrorContext(ctx, "failed to update project budget_spent", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:cost_entry",
		EntityType: "cost_entry",
		EntityID:   entryID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return e, nil
}

// DeleteCostEntry hard-deletes a cost entry.
func (s *BudgetService) DeleteCostEntry(ctx context.Context, projectID, entryID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM project_cost_entries WHERE id = $1 AND project_id = $2 AND tenant_id = $3`
	result, err := s.pool.Exec(ctx, query, entryID, projectID, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete cost entry", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CostEntry", entryID.String())
	}

	// Update the projects.budget_spent with total actual spend.
	updateBudgetSpent := `
		UPDATE projects SET budget_spent = (
			SELECT COALESCE(SUM(amount), 0)
			FROM project_cost_entries
			WHERE project_id = $1 AND tenant_id = $2 AND entry_type = 'actual'
		)
		WHERE id = $1 AND tenant_id = $2`
	if _, err := s.pool.Exec(ctx, updateBudgetSpent, projectID, auth.TenantID); err != nil {
		slog.ErrorContext(ctx, "failed to update project budget_spent", "error", err)
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:cost_entry",
		EntityType: "cost_entry",
		EntityID:   entryID,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Burn Rate
// ──────────────────────────────────────────────

// GetBurnRate returns monthly spending grouped by period with cumulative totals
// and a straight-line budget reference.
func (s *BudgetService) GetBurnRate(ctx context.Context, projectID uuid.UUID) ([]BurnRatePoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Get approved budget for straight-line calculation.
	var approvedBudget float64
	var plannedStart, plannedEnd *time.Time
	projQuery := `
		SELECT COALESCE(budget_approved, 0), planned_start, planned_end
		FROM projects
		WHERE id = $1 AND tenant_id = $2`
	err := s.pool.QueryRow(ctx, projQuery, projectID, auth.TenantID).Scan(&approvedBudget, &plannedStart, &plannedEnd)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("Project", projectID.String())
		}
		return nil, apperrors.Internal("failed to get project for burn rate", err)
	}

	// Compute the total number of months in the project for budget line.
	var totalMonths float64 = 12
	if plannedStart != nil && plannedEnd != nil {
		diff := plannedEnd.Sub(*plannedStart)
		totalMonths = math.Max(1, math.Ceil(diff.Hours()/24/30))
	}
	monthlyBudget := approvedBudget / totalMonths

	// Monthly aggregation.
	query := `
		SELECT
			TO_CHAR(entry_date, 'YYYY-MM') AS period,
			COALESCE(SUM(CASE WHEN entry_type = 'actual' THEN amount ELSE 0 END), 0) AS actual,
			COALESCE(SUM(CASE WHEN entry_type = 'committed' THEN amount ELSE 0 END), 0) AS committed,
			COALESCE(SUM(CASE WHEN entry_type = 'forecast' THEN amount ELSE 0 END), 0) AS forecast
		FROM project_cost_entries
		WHERE project_id = $1 AND tenant_id = $2
		GROUP BY TO_CHAR(entry_date, 'YYYY-MM')
		ORDER BY period`

	rows, err := s.pool.Query(ctx, query, projectID, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get burn rate data", err)
	}
	defer rows.Close()

	var points []BurnRatePoint
	var cumulativeActual float64
	monthIndex := 0

	for rows.Next() {
		var p BurnRatePoint
		if err := rows.Scan(&p.Period, &p.Actual, &p.Committed, &p.Forecast); err != nil {
			return nil, apperrors.Internal("failed to scan burn rate point", err)
		}
		monthIndex++
		cumulativeActual += p.Actual
		p.CumulativeActual = math.Round(cumulativeActual*100) / 100
		p.BudgetLine = math.Round(monthlyBudget*float64(monthIndex)*100) / 100
		points = append(points, p)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate burn rate data", err)
	}
	if points == nil {
		points = []BurnRatePoint{}
	}

	return points, nil
}

// ──────────────────────────────────────────────
// Forecast
// ──────────────────────────────────────────────

// GetForecast returns an estimated-at-completion projection based on current
// burn rate and CPI metrics.
func (s *BudgetService) GetForecast(ctx context.Context, projectID uuid.UUID) (BudgetForecast, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BudgetForecast{}, apperrors.Unauthorized("authentication required")
	}

	summary, err := s.GetBudgetSummary(ctx, projectID)
	if err != nil {
		return BudgetForecast{}, err
	}

	burnPoints, err := s.GetBurnRate(ctx, projectID)
	if err != nil {
		return BudgetForecast{}, err
	}

	// Get project completion percentage.
	var completionPct float64
	projQuery := `SELECT COALESCE(completion_pct, 0) FROM projects WHERE id = $1 AND tenant_id = $2`
	_ = s.pool.QueryRow(ctx, projQuery, projectID, auth.TenantID).Scan(&completionPct)

	varianceAtCompletion := summary.ApprovedBudget - summary.EstimatedAtCompletion

	return BudgetForecast{
		ProjectID:             projectID,
		ApprovedBudget:        summary.ApprovedBudget,
		ActualSpend:           summary.ActualSpend,
		CompletionPct:         completionPct,
		EstimatedAtCompletion: summary.EstimatedAtCompletion,
		VarianceAtCompletion:  math.Round(varianceAtCompletion*100) / 100,
		CostPerformanceIndex:  summary.CostPerformanceIndex,
		ForecastPoints:        burnPoints,
	}, nil
}

// ──────────────────────────────────────────────
// Budget Snapshots
// ──────────────────────────────────────────────

// CreateBudgetSnapshot captures the current financial state of a project.
func (s *BudgetService) CreateBudgetSnapshot(ctx context.Context, projectID uuid.UUID, req CreateBudgetSnapshotRequest) (BudgetSnapshot, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return BudgetSnapshot{}, apperrors.Unauthorized("authentication required")
	}

	// Get current summary to populate snapshot fields.
	summary, err := s.GetBudgetSummary(ctx, projectID)
	if err != nil {
		return BudgetSnapshot{}, err
	}

	// Get current completion pct.
	var completionPct float64
	projQuery := `SELECT COALESCE(completion_pct, 0) FROM projects WHERE id = $1 AND tenant_id = $2`
	_ = s.pool.QueryRow(ctx, projQuery, projectID, auth.TenantID).Scan(&completionPct)

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO budget_snapshots (
			id, tenant_id, project_id, snapshot_date,
			approved_budget, actual_spend, committed_spend, forecast_total,
			completion_pct, notes, created_by, created_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8,
			$9, $10, $11, $12
		)
		RETURNING id, tenant_id, project_id, snapshot_date,
			approved_budget, actual_spend, committed_spend, forecast_total,
			completion_pct, notes, created_by, created_at`

	var snap BudgetSnapshot
	err = s.pool.QueryRow(ctx, query,
		id, auth.TenantID, projectID, now,
		summary.ApprovedBudget, summary.ActualSpend, summary.CommittedSpend, summary.ForecastTotal,
		completionPct, req.Notes, auth.UserID, now,
	).Scan(
		&snap.ID, &snap.TenantID, &snap.ProjectID, &snap.SnapshotDate,
		&snap.ApprovedBudget, &snap.ActualSpend, &snap.CommittedSpend, &snap.ForecastTotal,
		&snap.CompletionPct, &snap.Notes, &snap.CreatedBy, &snap.CreatedAt,
	)
	if err != nil {
		return BudgetSnapshot{}, apperrors.Internal("failed to create budget snapshot", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"approved_budget": summary.ApprovedBudget,
		"actual_spend":    summary.ActualSpend,
		"committed_spend": summary.CommittedSpend,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:budget_snapshot",
		EntityType: "budget_snapshot",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return snap, nil
}

// ListBudgetSnapshots returns a paginated list of budget snapshots for a project.
func (s *BudgetService) ListBudgetSnapshots(ctx context.Context, projectID uuid.UUID, limit, offset int) ([]BudgetSnapshot, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM budget_snapshots
		WHERE project_id = $1 AND tenant_id = $2`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, projectID, auth.TenantID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count budget snapshots", err)
	}

	dataQuery := `
		SELECT
			bs.id, bs.tenant_id, bs.project_id, bs.snapshot_date,
			bs.approved_budget, bs.actual_spend, bs.committed_spend, bs.forecast_total,
			bs.completion_pct, bs.notes, bs.created_by,
			COALESCE(u.display_name, '') AS creator_name,
			bs.created_at
		FROM budget_snapshots bs
		LEFT JOIN users u ON u.id = bs.created_by
		WHERE bs.project_id = $1 AND bs.tenant_id = $2
		ORDER BY bs.snapshot_date DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, projectID, auth.TenantID, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list budget snapshots", err)
	}
	defer rows.Close()

	var snapshots []BudgetSnapshot
	for rows.Next() {
		var snap BudgetSnapshot
		if err := rows.Scan(
			&snap.ID, &snap.TenantID, &snap.ProjectID, &snap.SnapshotDate,
			&snap.ApprovedBudget, &snap.ActualSpend, &snap.CommittedSpend, &snap.ForecastTotal,
			&snap.CompletionPct, &snap.Notes, &snap.CreatedBy,
			&snap.CreatorName,
			&snap.CreatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan budget snapshot", err)
		}
		snapshots = append(snapshots, snap)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate budget snapshots", err)
	}
	if snapshots == nil {
		snapshots = []BudgetSnapshot{}
	}

	return snapshots, total, nil
}

// ──────────────────────────────────────────────
// Cost Categories
// ──────────────────────────────────────────────

// ListCostCategories returns all active cost categories for the tenant.
func (s *BudgetService) ListCostCategories(ctx context.Context) ([]CostCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, code, parent_id, is_active, created_at
		FROM cost_categories
		WHERE tenant_id = $1 AND is_active = true
		ORDER BY name`

	rows, err := s.pool.Query(ctx, query, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to list cost categories", err)
	}
	defer rows.Close()

	var categories []CostCategory
	for rows.Next() {
		var c CostCategory
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.Name, &c.Description, &c.Code,
			&c.ParentID, &c.IsActive, &c.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan cost category", err)
		}
		categories = append(categories, c)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate cost categories", err)
	}
	if categories == nil {
		categories = []CostCategory{}
	}

	return categories, nil
}

// CreateCostCategory creates a new cost category.
func (s *BudgetService) CreateCostCategory(ctx context.Context, req CreateCostCategoryRequest) (CostCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CostCategory{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO cost_categories (
			id, tenant_id, name, description, code, parent_id, is_active, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, true, $7)
		RETURNING id, tenant_id, name, description, code, parent_id, is_active, created_at`

	var c CostCategory
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.Code, req.ParentID, now,
	).Scan(
		&c.ID, &c.TenantID, &c.Name, &c.Description, &c.Code,
		&c.ParentID, &c.IsActive, &c.CreatedAt,
	)
	if err != nil {
		return CostCategory{}, apperrors.Internal("failed to create cost category", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{"name": req.Name})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:cost_category",
		EntityType: "cost_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return c, nil
}

// UpdateCostCategory updates an existing cost category using COALESCE partial update.
func (s *BudgetService) UpdateCostCategory(ctx context.Context, id uuid.UUID, req UpdateCostCategoryRequest) (CostCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CostCategory{}, apperrors.Unauthorized("authentication required")
	}

	updateQuery := `
		UPDATE cost_categories SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			code = COALESCE($3, code),
			parent_id = COALESCE($4, parent_id)
		WHERE id = $5 AND tenant_id = $6
		RETURNING id, tenant_id, name, description, code, parent_id, is_active, created_at`

	var c CostCategory
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Description, req.Code, req.ParentID,
		id, auth.TenantID,
	).Scan(
		&c.ID, &c.TenantID, &c.Name, &c.Description, &c.Code,
		&c.ParentID, &c.IsActive, &c.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return CostCategory{}, apperrors.NotFound("CostCategory", id.String())
		}
		return CostCategory{}, apperrors.Internal("failed to update cost category", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:cost_category",
		EntityType: "cost_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return c, nil
}

// DeleteCostCategory soft-deletes a cost category by setting is_active = false.
func (s *BudgetService) DeleteCostCategory(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `UPDATE cost_categories SET is_active = false WHERE id = $1 AND tenant_id = $2`
	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete cost category", err)
	}
	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CostCategory", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:cost_category",
		EntityType: "cost_category",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Portfolio Budget Summary
// ──────────────────────────────────────────────

// GetPortfolioBudgetSummary returns a cross-project budget overview for a
// portfolio (or all projects if no portfolio is specified), with optional
// status filter and pagination.
func (s *BudgetService) GetPortfolioBudgetSummary(
	ctx context.Context,
	portfolioID *uuid.UUID,
	status *string,
	limit, offset int,
) (PortfolioBudgetSummary, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return PortfolioBudgetSummary{}, 0, apperrors.Unauthorized("authentication required")
	}

	// Count matching projects.
	countQuery := `
		SELECT COUNT(*)
		FROM projects
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR portfolio_id = $2)
			AND ($3::text IS NULL OR status = $3)`
	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, portfolioID, status).Scan(&total)
	if err != nil {
		return PortfolioBudgetSummary{}, 0, apperrors.Internal("failed to count projects for portfolio budget", err)
	}

	// Fetch projects with budget data.
	dataQuery := `
		SELECT
			p.id, p.title, p.code, p.status,
			COALESCE(p.budget_approved, 0) AS approved_budget,
			COALESCE(p.budget_spent, 0) AS actual_spend,
			COALESCE(
				(SELECT SUM(amount) FROM project_cost_entries
				 WHERE project_id = p.id AND tenant_id = p.tenant_id AND entry_type = 'committed'),
			0) AS committed_spend
		FROM projects p
		WHERE p.tenant_id = $1
			AND ($2::uuid IS NULL OR p.portfolio_id = $2)
			AND ($3::text IS NULL OR p.status = $3)
		ORDER BY p.title
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, portfolioID, status, limit, offset)
	if err != nil {
		return PortfolioBudgetSummary{}, 0, apperrors.Internal("failed to get portfolio budget summary", err)
	}
	defer rows.Close()

	var items []PortfolioBudgetItem
	var totalApproved, totalSpent, totalCommitted float64
	var varianceSum float64
	var varianceCount int

	for rows.Next() {
		var item PortfolioBudgetItem
		var committedSpend float64
		if err := rows.Scan(
			&item.ProjectID, &item.ProjectTitle, &item.ProjectCode, &item.Status,
			&item.ApprovedBudget, &item.ActualSpend, &committedSpend,
		); err != nil {
			return PortfolioBudgetSummary{}, 0, apperrors.Internal("failed to scan portfolio budget item", err)
		}
		item.CommittedSpend = committedSpend
		item.RemainingBudget = item.ApprovedBudget - item.ActualSpend - committedSpend
		if item.ApprovedBudget > 0 {
			item.VariancePct = math.Round(((item.ApprovedBudget-item.ActualSpend-committedSpend)/item.ApprovedBudget)*10000) / 100
			varianceSum += item.VariancePct
			varianceCount++
		}

		totalApproved += item.ApprovedBudget
		totalSpent += item.ActualSpend
		totalCommitted += committedSpend

		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return PortfolioBudgetSummary{}, 0, apperrors.Internal("failed to iterate portfolio budget items", err)
	}
	if items == nil {
		items = []PortfolioBudgetItem{}
	}

	var avgVariance float64
	if varianceCount > 0 {
		avgVariance = math.Round((varianceSum/float64(varianceCount))*100) / 100
	}

	return PortfolioBudgetSummary{
		TotalApproved:  totalApproved,
		TotalSpent:     totalSpent,
		TotalCommitted: totalCommitted,
		TotalRemaining: totalApproved - totalSpent - totalCommitted,
		AvgVariance:    avgVariance,
		Projects:       items,
	}, total, nil
}

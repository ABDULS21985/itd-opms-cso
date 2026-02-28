package people

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
// HeatmapService
// ──────────────────────────────────────────────

// HeatmapService handles business logic for the resource capacity heatmap.
type HeatmapService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewHeatmapService creates a new HeatmapService.
func NewHeatmapService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *HeatmapService {
	return &HeatmapService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Heatmap Query
// ──────────────────────────────────────────────

// rawAllocation is an internal struct for scanning the joined query.
type rawAllocation struct {
	ID            uuid.UUID
	UserID        uuid.UUID
	UserName      string
	ProjectID     uuid.UUID
	ProjectTitle  string
	AllocationPct float64
	PeriodStart   time.Time
	PeriodEnd     time.Time
}

// GetHeatmap builds the heatmap grid for the given date range.
// groupBy: "user" or "project"
// granularity: "week" or "month"
func (s *HeatmapService) GetHeatmap(ctx context.Context, start, end time.Time, groupBy, granularity string) (*HeatmapResponse, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if groupBy != "user" && groupBy != "project" {
		groupBy = "user"
	}
	if granularity != "week" && granularity != "month" {
		granularity = "month"
	}

	// 1. Fetch all capacity_allocations overlapping with [start, end]
	query := `
		SELECT
			ca.id,
			ca.user_id,
			COALESCE(u.display_name, u.email, ca.user_id::text) AS user_name,
			COALESCE(ca.project_id, '00000000-0000-0000-0000-000000000000'::uuid) AS project_id,
			COALESCE(p.title, 'Unassigned') AS project_title,
			ca.allocation_pct,
			ca.period_start,
			ca.period_end
		FROM capacity_allocations ca
		LEFT JOIN users u ON u.id = ca.user_id AND u.tenant_id = ca.tenant_id
		LEFT JOIN projects p ON p.id = ca.project_id AND p.tenant_id = ca.tenant_id
		WHERE ca.tenant_id = $1
			AND ca.period_start <= $3
			AND ca.period_end >= $2
		ORDER BY ca.period_start`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, start, end)
	if err != nil {
		return nil, apperrors.Internal("failed to query heatmap allocations", err)
	}
	defer rows.Close()

	var allocations []rawAllocation
	for rows.Next() {
		var a rawAllocation
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.UserName,
			&a.ProjectID, &a.ProjectTitle,
			&a.AllocationPct, &a.PeriodStart, &a.PeriodEnd,
		); err != nil {
			return nil, apperrors.Internal("failed to scan heatmap allocation", err)
		}
		allocations = append(allocations, a)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate heatmap allocations", err)
	}

	// 2. Generate list of periods between start and end
	periods := generatePeriods(start, end, granularity)

	// 3. Build heatmap rows grouped by entity
	var response HeatmapResponse
	response.Periods = periods

	if groupBy == "user" {
		response.Rows = buildUserRows(allocations, periods, granularity)
	} else {
		response.Rows = buildProjectRows(allocations, periods, granularity)
	}

	// 4. Compute summary
	response.Summary = computeSummary(response.Rows)

	return &response, nil
}

// generatePeriods returns a slice of period labels between start and end.
func generatePeriods(start, end time.Time, granularity string) []string {
	var periods []string

	if granularity == "week" {
		// Align to Monday of the start week
		current := start
		for current.Weekday() != time.Monday {
			current = current.AddDate(0, 0, -1)
		}
		for !current.After(end) {
			year, week := current.ISOWeek()
			periods = append(periods, fmt.Sprintf("%d-W%02d", year, week))
			current = current.AddDate(0, 0, 7)
		}
	} else {
		// Month granularity
		current := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.UTC)
		for !current.After(end) {
			periods = append(periods, fmt.Sprintf("%d-%02d", current.Year(), current.Month()))
			current = current.AddDate(0, 1, 0)
		}
	}

	if len(periods) == 0 {
		periods = []string{}
	}

	return periods
}

// periodOverlaps checks whether an allocation's date range overlaps a given period.
func periodOverlaps(allocStart, allocEnd time.Time, period string, granularity string) bool {
	pStart, pEnd := periodBounds(period, granularity)
	// Overlap exists if allocStart <= pEnd AND allocEnd >= pStart
	return !allocStart.After(pEnd) && !allocEnd.Before(pStart)
}

// periodBounds returns the start and end dates for a period label.
func periodBounds(period string, granularity string) (time.Time, time.Time) {
	if granularity == "week" {
		var year, week int
		fmt.Sscanf(period, "%d-W%d", &year, &week)
		// ISO week: find the Monday of the given ISO week
		jan4 := time.Date(year, time.January, 4, 0, 0, 0, 0, time.UTC)
		// Monday of ISO week 1
		_, isoWeek1 := jan4.ISOWeek()
		_ = isoWeek1
		mondayWeek1 := jan4
		for mondayWeek1.Weekday() != time.Monday {
			mondayWeek1 = mondayWeek1.AddDate(0, 0, -1)
		}
		start := mondayWeek1.AddDate(0, 0, (week-1)*7)
		end := start.AddDate(0, 0, 6) // Sunday
		return start, end
	}
	// Month granularity
	var year, month int
	fmt.Sscanf(period, "%d-%d", &year, &month)
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, -1) // Last day of month
	return start, end
}

// buildUserRows groups allocations by user and computes cells per period.
func buildUserRows(allocations []rawAllocation, periods []string, granularity string) []HeatmapRow {
	// Index: userID -> list of allocations
	userMap := make(map[uuid.UUID][]rawAllocation)
	userNames := make(map[uuid.UUID]string)
	for _, a := range allocations {
		userMap[a.UserID] = append(userMap[a.UserID], a)
		userNames[a.UserID] = a.UserName
	}

	var rows []HeatmapRow
	for userID, userAllocs := range userMap {
		row := HeatmapRow{
			ID:    userID,
			Label: userNames[userID],
		}

		var totalPct float64
		for _, period := range periods {
			cell := HeatmapCell{
				Period:   period,
				Projects: []HeatmapProject{},
			}

			projectPcts := make(map[uuid.UUID]float64)
			projectTitles := make(map[uuid.UUID]string)

			for _, alloc := range userAllocs {
				if periodOverlaps(alloc.PeriodStart, alloc.PeriodEnd, period, granularity) {
					cell.AllocationPct += alloc.AllocationPct
					projectPcts[alloc.ProjectID] += alloc.AllocationPct
					projectTitles[alloc.ProjectID] = alloc.ProjectTitle
				}
			}

			for pid, pct := range projectPcts {
				cell.Projects = append(cell.Projects, HeatmapProject{
					ID:    pid,
					Title: projectTitles[pid],
					Pct:   pct,
				})
			}
			cell.ProjectCount = len(cell.Projects)

			// Round to 2 decimal places
			cell.AllocationPct = math.Round(cell.AllocationPct*100) / 100

			totalPct += cell.AllocationPct
			row.Cells = append(row.Cells, cell)
		}

		if len(periods) > 0 {
			row.AverageLoad = math.Round((totalPct/float64(len(periods)))*100) / 100
		}

		rows = append(rows, row)
	}

	if rows == nil {
		rows = []HeatmapRow{}
	}

	return rows
}

// buildProjectRows groups allocations by project and computes cells per period.
func buildProjectRows(allocations []rawAllocation, periods []string, granularity string) []HeatmapRow {
	// Index: projectID -> list of allocations
	projectMap := make(map[uuid.UUID][]rawAllocation)
	projectTitles := make(map[uuid.UUID]string)
	for _, a := range allocations {
		projectMap[a.ProjectID] = append(projectMap[a.ProjectID], a)
		projectTitles[a.ProjectID] = a.ProjectTitle
	}

	var rows []HeatmapRow
	for projectID, projAllocs := range projectMap {
		row := HeatmapRow{
			ID:    projectID,
			Label: projectTitles[projectID],
		}

		var totalPct float64
		for _, period := range periods {
			cell := HeatmapCell{
				Period:   period,
				Projects: []HeatmapProject{},
			}

			// For project groupBy, Projects slice holds user allocations instead
			userPcts := make(map[uuid.UUID]float64)
			userNames := make(map[uuid.UUID]string)

			for _, alloc := range projAllocs {
				if periodOverlaps(alloc.PeriodStart, alloc.PeriodEnd, period, granularity) {
					cell.AllocationPct += alloc.AllocationPct
					userPcts[alloc.UserID] += alloc.AllocationPct
					userNames[alloc.UserID] = alloc.UserName
				}
			}

			for uid, pct := range userPcts {
				cell.Projects = append(cell.Projects, HeatmapProject{
					ID:    uid,
					Title: userNames[uid],
					Pct:   pct,
				})
			}
			cell.ProjectCount = len(cell.Projects)
			cell.AllocationPct = math.Round(cell.AllocationPct*100) / 100

			totalPct += cell.AllocationPct
			row.Cells = append(row.Cells, cell)
		}

		if len(periods) > 0 {
			row.AverageLoad = math.Round((totalPct/float64(len(periods)))*100) / 100
		}

		rows = append(rows, row)
	}

	if rows == nil {
		rows = []HeatmapRow{}
	}

	return rows
}

// computeSummary calculates aggregate statistics from heatmap rows.
func computeSummary(rows []HeatmapRow) HeatmapSummary {
	summary := HeatmapSummary{
		TotalUsers: len(rows),
	}

	if len(rows) == 0 {
		return summary
	}

	var totalAvg float64
	for _, row := range rows {
		totalAvg += row.AverageLoad
		if row.AverageLoad > 100 {
			summary.OverAllocatedUsers++
		}
		if row.AverageLoad < 50 {
			summary.UnderUtilizedUsers++
		}
	}

	summary.AverageUtilization = math.Round((totalAvg/float64(len(rows)))*100) / 100

	return summary
}

// ──────────────────────────────────────────────
// Allocation CRUD
// ──────────────────────────────────────────────

// ListAllocations returns a filtered, paginated list of enriched allocation entries.
func (s *HeatmapService) ListAllocations(ctx context.Context, userID, projectID *uuid.UUID, start, end *time.Time, limit, offset int) ([]AllocationEntry, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM capacity_allocations ca
		WHERE ca.tenant_id = $1
			AND ($2::uuid IS NULL OR ca.user_id = $2)
			AND ($3::uuid IS NULL OR ca.project_id = $3)
			AND ($4::date IS NULL OR ca.period_end >= $4)
			AND ($5::date IS NULL OR ca.period_start <= $5)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, userID, projectID, start, end).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count allocations", err)
	}

	dataQuery := `
		SELECT
			ca.id,
			ca.tenant_id,
			ca.user_id,
			COALESCE(u.display_name, u.email, ca.user_id::text) AS user_name,
			COALESCE(ca.project_id, '00000000-0000-0000-0000-000000000000'::uuid) AS project_id,
			COALESCE(p.title, 'Unassigned') AS project_title,
			ca.allocation_pct,
			ca.period_start,
			ca.period_end,
			ca.created_at,
			ca.updated_at
		FROM capacity_allocations ca
		LEFT JOIN users u ON u.id = ca.user_id AND u.tenant_id = ca.tenant_id
		LEFT JOIN projects p ON p.id = ca.project_id AND p.tenant_id = ca.tenant_id
		WHERE ca.tenant_id = $1
			AND ($2::uuid IS NULL OR ca.user_id = $2)
			AND ($3::uuid IS NULL OR ca.project_id = $3)
			AND ($4::date IS NULL OR ca.period_end >= $4)
			AND ($5::date IS NULL OR ca.period_start <= $5)
		ORDER BY ca.period_start DESC
		LIMIT $6 OFFSET $7`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, userID, projectID, start, end, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list allocations", err)
	}
	defer rows.Close()

	var entries []AllocationEntry
	for rows.Next() {
		var e AllocationEntry
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.UserID, &e.UserName,
			&e.ProjectID, &e.ProjectTitle,
			&e.AllocationPct, &e.PeriodStart, &e.PeriodEnd,
			&e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan allocation entry", err)
		}
		entries = append(entries, e)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate allocation entries", err)
	}

	if entries == nil {
		entries = []AllocationEntry{}
	}

	return entries, total, nil
}

// CreateAllocation creates a new capacity allocation, validating no duplicate overlapping period exists.
func (s *HeatmapService) CreateAllocation(ctx context.Context, req CreateAllocationRequest) (*AllocationEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if req.PeriodEnd.Before(req.PeriodStart) {
		return nil, apperrors.BadRequest("period_end must be after period_start")
	}

	if req.AllocationPct <= 0 {
		return nil, apperrors.BadRequest("allocation_pct must be greater than 0")
	}

	// Check for overlapping allocations for the same user+project
	overlapQuery := `
		SELECT COUNT(*)
		FROM capacity_allocations
		WHERE tenant_id = $1
			AND user_id = $2
			AND project_id = $3
			AND period_start <= $5
			AND period_end >= $4`

	var overlapCount int
	err := s.pool.QueryRow(ctx, overlapQuery,
		auth.TenantID, req.UserID, req.ProjectID,
		req.PeriodStart, req.PeriodEnd,
	).Scan(&overlapCount)
	if err != nil {
		return nil, apperrors.Internal("failed to check allocation overlap", err)
	}
	if overlapCount > 0 {
		return nil, apperrors.Conflict("an allocation for this user and project already overlaps with the specified period")
	}

	id := uuid.New()
	now := time.Now().UTC()

	insertQuery := `
		INSERT INTO capacity_allocations (
			id, tenant_id, user_id, project_id, allocation_pct,
			period_start, period_end, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9
		)`

	_, err = s.pool.Exec(ctx, insertQuery,
		id, auth.TenantID, req.UserID, req.ProjectID, req.AllocationPct,
		req.PeriodStart, req.PeriodEnd, now, now,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to create allocation", err)
	}

	// Fetch the enriched entry
	entry, err := s.getAllocationEntry(ctx, id, auth.TenantID)
	if err != nil {
		return nil, err
	}

	changes, _ := json.Marshal(map[string]any{
		"userId":        req.UserID,
		"projectId":     req.ProjectID,
		"allocationPct": req.AllocationPct,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:capacity_allocation",
		EntityType: "capacity_allocation",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return entry, nil
}

// UpdateAllocation partially updates a capacity allocation.
func (s *HeatmapService) UpdateAllocation(ctx context.Context, id uuid.UUID, req UpdateAllocationRequest) (*AllocationEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE capacity_allocations SET
			allocation_pct = COALESCE($1, allocation_pct),
			period_start = COALESCE($2, period_start),
			period_end = COALESCE($3, period_end),
			updated_at = $4
		WHERE id = $5 AND tenant_id = $6`

	result, err := s.pool.Exec(ctx, updateQuery,
		req.AllocationPct, req.PeriodStart, req.PeriodEnd,
		now, id, auth.TenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to update allocation", err)
	}

	if result.RowsAffected() == 0 {
		return nil, apperrors.NotFound("CapacityAllocation", id.String())
	}

	entry, err := s.getAllocationEntry(ctx, id, auth.TenantID)
	if err != nil {
		return nil, err
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:capacity_allocation",
		EntityType: "capacity_allocation",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return entry, nil
}

// DeleteAllocation hard-deletes a capacity allocation by ID.
func (s *HeatmapService) DeleteAllocation(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM capacity_allocations WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete allocation", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CapacityAllocation", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:capacity_allocation",
		EntityType: "capacity_allocation",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// getAllocationEntry fetches a single enriched allocation entry by ID.
func (s *HeatmapService) getAllocationEntry(ctx context.Context, id, tenantID uuid.UUID) (*AllocationEntry, error) {
	query := `
		SELECT
			ca.id,
			ca.tenant_id,
			ca.user_id,
			COALESCE(u.display_name, u.email, ca.user_id::text) AS user_name,
			COALESCE(ca.project_id, '00000000-0000-0000-0000-000000000000'::uuid) AS project_id,
			COALESCE(p.title, 'Unassigned') AS project_title,
			ca.allocation_pct,
			ca.period_start,
			ca.period_end,
			ca.created_at,
			ca.updated_at
		FROM capacity_allocations ca
		LEFT JOIN users u ON u.id = ca.user_id AND u.tenant_id = ca.tenant_id
		LEFT JOIN projects p ON p.id = ca.project_id AND p.tenant_id = ca.tenant_id
		WHERE ca.id = $1 AND ca.tenant_id = $2`

	var e AllocationEntry
	err := s.pool.QueryRow(ctx, query, id, tenantID).Scan(
		&e.ID, &e.TenantID, &e.UserID, &e.UserName,
		&e.ProjectID, &e.ProjectTitle,
		&e.AllocationPct, &e.PeriodStart, &e.PeriodEnd,
		&e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("CapacityAllocation", id.String())
		}
		return nil, apperrors.Internal("failed to get allocation entry", err)
	}

	return &e, nil
}

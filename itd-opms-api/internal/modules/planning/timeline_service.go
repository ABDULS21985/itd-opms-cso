package planning

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
)

// TimelineService provides consolidated timeline data for Gantt chart views.
type TimelineService struct {
	pool *pgxpool.Pool
}

// NewTimelineService creates a new TimelineService.
func NewTimelineService(pool *pgxpool.Pool) *TimelineService {
	return &TimelineService{pool: pool}
}

// ──────────────────────────────────────────────
// Timeline response types
// ──────────────────────────────────────────────

// ProjectTimeline contains all data needed to render a project Gantt chart.
type ProjectTimeline struct {
	Project      TimelineProject      `json:"project"`
	Milestones   []TimelineMilestone  `json:"milestones"`
	WorkItems    []TimelineWorkItem   `json:"workItems"`
	Dependencies []TimelineDependency `json:"dependencies"`
}

// TimelineProject is the project summary for timeline display.
type TimelineProject struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	PlannedStart  *string   `json:"plannedStart"`
	PlannedEnd    *string   `json:"plannedEnd"`
	ActualStart   *string   `json:"actualStart"`
	ActualEnd     *string   `json:"actualEnd"`
	CompletionPct float64   `json:"completionPct"`
	Status        string    `json:"status"`
	RAGStatus     string    `json:"ragStatus"`
}

// TimelineMilestone is a milestone formatted for timeline display.
type TimelineMilestone struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	TargetDate string    `json:"targetDate"`
	ActualDate *string   `json:"actualDate"`
	Status     string    `json:"status"`
}

// TimelineWorkItem is a work item formatted for timeline display.
type TimelineWorkItem struct {
	ID             uuid.UUID  `json:"id"`
	Title          string     `json:"title"`
	Type           string     `json:"type"`
	ParentID       *uuid.UUID `json:"parentId"`
	Status         string     `json:"status"`
	Priority       string     `json:"priority"`
	DueDate        *string    `json:"dueDate"`
	CompletedAt    *string    `json:"completedAt"`
	EstimatedHours *float64   `json:"estimatedHours"`
	ActualHours    *float64   `json:"actualHours"`
	AssigneeName   *string    `json:"assigneeName"`
	SortOrder      int        `json:"sortOrder"`
}

// TimelineDependency represents a dependency link for timeline display.
type TimelineDependency struct {
	ProjectID          uuid.UUID `json:"projectId"`
	DependsOnProjectID uuid.UUID `json:"dependsOnProjectId"`
	Type               string    `json:"type"`
}

// PortfolioTimelineItem represents a project in the portfolio timeline.
type PortfolioTimelineItem struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Code          string    `json:"code"`
	PlannedStart  *string   `json:"plannedStart"`
	PlannedEnd    *string   `json:"plannedEnd"`
	ActualStart   *string   `json:"actualStart"`
	ActualEnd     *string   `json:"actualEnd"`
	CompletionPct float64   `json:"completionPct"`
	Status        string    `json:"status"`
	RAGStatus     string    `json:"ragStatus"`
}

// ──────────────────────────────────────────────
// Date formatting helper
// ──────────────────────────────────────────────

// formatDatePtr converts a *time.Time to a *string in YYYY-MM-DD format.
func formatDatePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

// ──────────────────────────────────────────────
// Service methods
// ──────────────────────────────────────────────

// GetProjectTimeline fetches all timeline data for a project in a single call.
func (s *TimelineService) GetProjectTimeline(ctx context.Context, tenantID, projectID uuid.UUID) (*ProjectTimeline, error) {
	timeline := &ProjectTimeline{}

	// Fetch project summary.
	var plannedStart, plannedEnd, actualStart, actualEnd *time.Time
	var completionPct *float64
	err := s.pool.QueryRow(ctx, `
		SELECT id, title, planned_start, planned_end, actual_start, actual_end,
		       completion_pct, status, rag_status
		FROM projects WHERE id = $1 AND tenant_id = $2`,
		projectID, tenantID,
	).Scan(
		&timeline.Project.ID, &timeline.Project.Title,
		&plannedStart, &plannedEnd,
		&actualStart, &actualEnd,
		&completionPct, &timeline.Project.Status,
		&timeline.Project.RAGStatus,
	)
	if err != nil {
		return nil, apperrors.NotFound("Project", projectID.String())
	}

	timeline.Project.PlannedStart = formatDatePtr(plannedStart)
	timeline.Project.PlannedEnd = formatDatePtr(plannedEnd)
	timeline.Project.ActualStart = formatDatePtr(actualStart)
	timeline.Project.ActualEnd = formatDatePtr(actualEnd)
	if completionPct != nil {
		timeline.Project.CompletionPct = *completionPct
	}

	// Fetch milestones.
	mRows, err := s.pool.Query(ctx, `
		SELECT id, title, target_date, actual_date, status
		FROM milestones WHERE project_id = $1
		ORDER BY target_date ASC`,
		projectID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to query milestones", err)
	}
	defer mRows.Close()

	for mRows.Next() {
		var m TimelineMilestone
		var targetDate time.Time
		var actualDate *time.Time
		if err := mRows.Scan(&m.ID, &m.Title, &targetDate, &actualDate, &m.Status); err != nil {
			return nil, apperrors.Internal("failed to scan milestone", err)
		}
		m.TargetDate = targetDate.Format("2006-01-02")
		m.ActualDate = formatDatePtr(actualDate)
		timeline.Milestones = append(timeline.Milestones, m)
	}
	if err := mRows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate milestones", err)
	}
	if timeline.Milestones == nil {
		timeline.Milestones = []TimelineMilestone{}
	}

	// Fetch work items with assignee name.
	wiRows, err := s.pool.Query(ctx, `
		SELECT w.id, w.title, w.type, w.parent_id, w.status, w.priority,
		       w.due_date, w.completed_at, w.estimated_hours, w.actual_hours,
		       u.display_name AS assignee_name, w.sort_order
		FROM work_items w
		LEFT JOIN users u ON u.id = w.assignee_id
		WHERE w.project_id = $1
		ORDER BY w.sort_order ASC, w.created_at ASC`,
		projectID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to query work items", err)
	}
	defer wiRows.Close()

	for wiRows.Next() {
		var wi TimelineWorkItem
		var dueDate *time.Time
		var completedAt *time.Time
		if err := wiRows.Scan(
			&wi.ID, &wi.Title, &wi.Type, &wi.ParentID, &wi.Status, &wi.Priority,
			&dueDate, &completedAt, &wi.EstimatedHours, &wi.ActualHours,
			&wi.AssigneeName, &wi.SortOrder,
		); err != nil {
			return nil, apperrors.Internal("failed to scan work item", err)
		}
		wi.DueDate = formatDatePtr(dueDate)
		wi.CompletedAt = formatDatePtr(completedAt)
		timeline.WorkItems = append(timeline.WorkItems, wi)
	}
	if err := wiRows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate work items", err)
	}
	if timeline.WorkItems == nil {
		timeline.WorkItems = []TimelineWorkItem{}
	}

	// Fetch project dependencies.
	depRows, err := s.pool.Query(ctx, `
		SELECT project_id, depends_on_project_id, dependency_type
		FROM project_dependencies
		WHERE project_id = $1 OR depends_on_project_id = $1`,
		projectID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to query dependencies", err)
	}
	defer depRows.Close()

	for depRows.Next() {
		var d TimelineDependency
		if err := depRows.Scan(&d.ProjectID, &d.DependsOnProjectID, &d.Type); err != nil {
			return nil, apperrors.Internal("failed to scan dependency", err)
		}
		timeline.Dependencies = append(timeline.Dependencies, d)
	}
	if err := depRows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate dependencies", err)
	}
	if timeline.Dependencies == nil {
		timeline.Dependencies = []TimelineDependency{}
	}

	return timeline, nil
}

// GetPortfolioTimeline fetches timeline data for all projects in a portfolio.
func (s *TimelineService) GetPortfolioTimeline(ctx context.Context, tenantID, portfolioID uuid.UUID) ([]PortfolioTimelineItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, title, code, planned_start, planned_end, actual_start, actual_end,
		       completion_pct, status, rag_status
		FROM projects
		WHERE portfolio_id = $1 AND tenant_id = $2
		ORDER BY planned_start ASC NULLS LAST, title ASC`,
		portfolioID, tenantID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to query portfolio projects", err)
	}
	defer rows.Close()

	var items []PortfolioTimelineItem
	for rows.Next() {
		var p PortfolioTimelineItem
		var plannedStart, plannedEnd, actualStart, actualEnd *time.Time
		var completionPct *float64
		if err := rows.Scan(
			&p.ID, &p.Title, &p.Code,
			&plannedStart, &plannedEnd, &actualStart, &actualEnd,
			&completionPct, &p.Status, &p.RAGStatus,
		); err != nil {
			return nil, apperrors.Internal("failed to scan project", err)
		}
		p.PlannedStart = formatDatePtr(plannedStart)
		p.PlannedEnd = formatDatePtr(plannedEnd)
		p.ActualStart = formatDatePtr(actualStart)
		p.ActualEnd = formatDatePtr(actualEnd)
		if completionPct != nil {
			p.CompletionPct = *completionPct
		}
		items = append(items, p)
	}
	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate projects", err)
	}
	if items == nil {
		items = []PortfolioTimelineItem{}
	}
	return items, nil
}

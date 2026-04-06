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
// WorkItemService
// ──────────────────────────────────────────────

// WorkItemService handles business logic for work items, milestones, and time entries.
type WorkItemService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewWorkItemService creates a new WorkItemService.
func NewWorkItemService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *WorkItemService {
	return &WorkItemService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Work Items
// ──────────────────────────────────────────────

// CreateWorkItem creates a new work item with reporter set from auth context.
func (s *WorkItemService) CreateWorkItem(ctx context.Context, req CreateWorkItemRequest) (WorkItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return WorkItem{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	priority := "medium"
	if req.Priority != nil {
		priority = *req.Priority
	}

	wiType := "task"
	if req.Type != nil {
		wiType = *req.Type
	}

	status := WorkItemStatusTodo
	if req.Status != nil {
		status = *req.Status
	}

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	reporterID := auth.UserID
	if req.ReporterID != nil {
		reporterID = *req.ReporterID
	}

	query := `
		INSERT INTO work_items (
			id, tenant_id, project_id, parent_id, type, title,
			description, assignee_id, reporter_id, status, priority,
			estimated_hours, due_date, sort_order, tags, metadata,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16,
			$17, $18
		)
		RETURNING id, tenant_id, project_id, parent_id, type, title,
			description, assignee_id, reporter_id, status, priority,
			estimated_hours, actual_hours, due_date, completed_at,
			sort_order, tags, metadata, created_at, updated_at`

	var item WorkItem
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.ProjectID, req.ParentID, wiType, req.Title,
		req.Description, req.AssigneeID, reporterID, status, priority,
		req.EstimatedHours, req.DueDate, sortOrder, req.Tags, req.Metadata,
		now, now,
	).Scan(
		&item.ID, &item.TenantID, &item.ProjectID, &item.ParentID, &item.Type, &item.Title,
		&item.Description, &item.AssigneeID, &item.ReporterID, &item.Status, &item.Priority,
		&item.EstimatedHours, &item.ActualHours, &item.DueDate, &item.CompletedAt,
		&item.SortOrder, &item.Tags, &item.Metadata, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return WorkItem{}, apperrors.Internal("failed to create work item", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":      req.Title,
		"type":       wiType,
		"project_id": req.ProjectID,
		"status":     status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:work_item",
		EntityType: "work_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return item, nil
}

// GetWorkItem retrieves a single work item by ID.
func (s *WorkItemService) GetWorkItem(ctx context.Context, id uuid.UUID) (WorkItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return WorkItem{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, project_id, parent_id, type, title,
			description, assignee_id, reporter_id, status, priority,
			estimated_hours, actual_hours, due_date, completed_at,
			sort_order, tags, metadata, created_at, updated_at
		FROM work_items
		WHERE id = $1 AND tenant_id = $2`

	var item WorkItem
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&item.ID, &item.TenantID, &item.ProjectID, &item.ParentID, &item.Type, &item.Title,
		&item.Description, &item.AssigneeID, &item.ReporterID, &item.Status, &item.Priority,
		&item.EstimatedHours, &item.ActualHours, &item.DueDate, &item.CompletedAt,
		&item.SortOrder, &item.Tags, &item.Metadata, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return WorkItem{}, apperrors.NotFound("WorkItem", id.String())
		}
		return WorkItem{}, apperrors.Internal("failed to get work item", err)
	}

	return item, nil
}

// ListWorkItems returns a filtered, paginated list of work items for a project.
func (s *WorkItemService) ListWorkItems(ctx context.Context, projectID *uuid.UUID, status, assignee, priority, wiType *string, limit, offset int) ([]WorkItem, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	var assigneeID *uuid.UUID
	if assignee != nil && *assignee != "" {
		parsed, err := uuid.Parse(*assignee)
		if err == nil {
			assigneeID = &parsed
		}
	}

	// Build base args: $1=tenantID, $2=projectID, $3=status, $4=assigneeID, $5=priority, $6=wiType.
	args := []interface{}{auth.TenantID, projectID, status, assigneeID, priority, wiType}
	nextIdx := 7

	// Add org scope filter via JOIN to projects on division_id.
	orgClause := ""
	orgFilter, orgParam := types.BuildOrgFilter(auth, "p.division_id", nextIdx)
	if orgFilter != "" {
		orgClause = " AND " + orgFilter
		args = append(args, orgParam)
		nextIdx++
	}

	// Count total matching records.
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM work_items wi
		JOIN projects p ON p.id = wi.project_id
		WHERE wi.tenant_id = $1
			AND ($2::uuid IS NULL OR wi.project_id = $2)
			AND ($3::text IS NULL OR wi.status = $3)
			AND ($4::uuid IS NULL OR wi.assignee_id = $4)
			AND ($5::text IS NULL OR wi.priority = $5)
			AND ($6::text IS NULL OR wi.type = $6)%s`, orgClause)

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count work items", err)
	}

	// Fetch paginated results.
	dataQuery := fmt.Sprintf(`
		SELECT wi.id, wi.tenant_id, wi.project_id, wi.parent_id, wi.type, wi.title,
			wi.description, wi.assignee_id, wi.reporter_id, wi.status, wi.priority,
			wi.estimated_hours, wi.actual_hours, wi.due_date, wi.completed_at,
			wi.sort_order, wi.tags, wi.metadata, wi.created_at, wi.updated_at
		FROM work_items wi
		JOIN projects p ON p.id = wi.project_id
		WHERE wi.tenant_id = $1
			AND ($2::uuid IS NULL OR wi.project_id = $2)
			AND ($3::text IS NULL OR wi.status = $3)
			AND ($4::uuid IS NULL OR wi.assignee_id = $4)
			AND ($5::text IS NULL OR wi.priority = $5)
			AND ($6::text IS NULL OR wi.type = $6)%s
		ORDER BY wi.sort_order ASC, wi.created_at DESC
		LIMIT $%d OFFSET $%d`, orgClause, nextIdx, nextIdx+1)

	dataArgs := append(args, limit, offset)
	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list work items", err)
	}
	defer rows.Close()

	var items []WorkItem
	for rows.Next() {
		var item WorkItem
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.ProjectID, &item.ParentID, &item.Type, &item.Title,
			&item.Description, &item.AssigneeID, &item.ReporterID, &item.Status, &item.Priority,
			&item.EstimatedHours, &item.ActualHours, &item.DueDate, &item.CompletedAt,
			&item.SortOrder, &item.Tags, &item.Metadata, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan work item", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate work items", err)
	}

	if items == nil {
		items = []WorkItem{}
	}

	return items, total, nil
}

// GetWBSTree returns the full work breakdown structure tree for a project
// using a recursive CTE.
func (s *WorkItemService) GetWBSTree(ctx context.Context, projectID uuid.UUID) ([]WorkItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		WITH RECURSIVE wbs AS (
			SELECT id, tenant_id, project_id, parent_id, type, title,
				description, assignee_id, reporter_id, status, priority,
				estimated_hours, actual_hours, due_date, completed_at,
				sort_order, tags, metadata, created_at, updated_at
			FROM work_items
			WHERE project_id = $1 AND tenant_id = $2 AND parent_id IS NULL
			UNION ALL
			SELECT wi.id, wi.tenant_id, wi.project_id, wi.parent_id, wi.type, wi.title,
				wi.description, wi.assignee_id, wi.reporter_id, wi.status, wi.priority,
				wi.estimated_hours, wi.actual_hours, wi.due_date, wi.completed_at,
				wi.sort_order, wi.tags, wi.metadata, wi.created_at, wi.updated_at
			FROM work_items wi
			JOIN wbs ON wi.parent_id = wbs.id
		)
		SELECT * FROM wbs ORDER BY sort_order ASC, created_at ASC`

	rows, err := s.pool.Query(ctx, query, projectID, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get WBS tree", err)
	}
	defer rows.Close()

	// Collect all flat items.
	itemMap := make(map[uuid.UUID]*WorkItem)
	var rootIDs []uuid.UUID

	for rows.Next() {
		var item WorkItem
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.ProjectID, &item.ParentID, &item.Type, &item.Title,
			&item.Description, &item.AssigneeID, &item.ReporterID, &item.Status, &item.Priority,
			&item.EstimatedHours, &item.ActualHours, &item.DueDate, &item.CompletedAt,
			&item.SortOrder, &item.Tags, &item.Metadata, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan WBS item", err)
		}
		item.Children = []WorkItem{}
		itemMap[item.ID] = &item
		if item.ParentID == nil {
			rootIDs = append(rootIDs, item.ID)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate WBS items", err)
	}

	// Build tree by assigning children to their parents.
	for _, item := range itemMap {
		if item.ParentID != nil {
			if parent, ok := itemMap[*item.ParentID]; ok {
				parent.Children = append(parent.Children, *item)
			}
		}
	}

	// Collect root items.
	var tree []WorkItem
	for _, rootID := range rootIDs {
		if root, ok := itemMap[rootID]; ok {
			tree = append(tree, *root)
		}
	}

	if tree == nil {
		tree = []WorkItem{}
	}

	return tree, nil
}

// UpdateWorkItem updates an existing work item using COALESCE partial update.
func (s *WorkItemService) UpdateWorkItem(ctx context.Context, id uuid.UUID, req UpdateWorkItemRequest) (WorkItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return WorkItem{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the work item exists and belongs to the tenant.
	_, err := s.GetWorkItem(ctx, id)
	if err != nil {
		return WorkItem{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE work_items SET
			parent_id = COALESCE($1, parent_id),
			type = COALESCE($2, type),
			title = COALESCE($3, title),
			description = COALESCE($4, description),
			assignee_id = COALESCE($5, assignee_id),
			reporter_id = COALESCE($6, reporter_id),
			priority = COALESCE($7, priority),
			estimated_hours = COALESCE($8, estimated_hours),
			actual_hours = COALESCE($9, actual_hours),
			due_date = COALESCE($10, due_date),
			sort_order = COALESCE($11, sort_order),
			tags = COALESCE($12, tags),
			metadata = COALESCE($13, metadata),
			updated_at = $14
		WHERE id = $15 AND tenant_id = $16
		RETURNING id, tenant_id, project_id, parent_id, type, title,
			description, assignee_id, reporter_id, status, priority,
			estimated_hours, actual_hours, due_date, completed_at,
			sort_order, tags, metadata, created_at, updated_at`

	var item WorkItem
	err = s.pool.QueryRow(ctx, updateQuery,
		req.ParentID, req.Type, req.Title,
		req.Description, req.AssigneeID, req.ReporterID,
		req.Priority, req.EstimatedHours, req.ActualHours,
		req.DueDate, req.SortOrder,
		req.Tags, req.Metadata,
		now, id, auth.TenantID,
	).Scan(
		&item.ID, &item.TenantID, &item.ProjectID, &item.ParentID, &item.Type, &item.Title,
		&item.Description, &item.AssigneeID, &item.ReporterID, &item.Status, &item.Priority,
		&item.EstimatedHours, &item.ActualHours, &item.DueDate, &item.CompletedAt,
		&item.SortOrder, &item.Tags, &item.Metadata, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return WorkItem{}, apperrors.Internal("failed to update work item", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:work_item",
		EntityType: "work_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return item, nil
}

// TransitionWorkItem validates and performs a status transition on a work item.
// Valid transitions:
//   - todo       -> in_progress
//   - in_progress -> in_review, done, blocked
//   - in_review  -> done, in_progress
//   - blocked    -> in_progress, todo
func (s *WorkItemService) TransitionWorkItem(ctx context.Context, id uuid.UUID, newStatus string) (WorkItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return WorkItem{}, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetWorkItem(ctx, id)
	if err != nil {
		return WorkItem{}, err
	}

	// Validate status transition.
	if !isValidWorkItemTransition(existing.Status, newStatus) {
		return WorkItem{}, apperrors.BadRequest(
			fmt.Sprintf("invalid status transition from '%s' to '%s'", existing.Status, newStatus),
		)
	}

	now := time.Now().UTC()

	// Set completed_at when transitioning to done.
	var completedAt *time.Time
	if newStatus == WorkItemStatusDone {
		completedAt = &now
	}

	query := `
		UPDATE work_items SET
			status = $1,
			completed_at = COALESCE($2, completed_at),
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5
		RETURNING id, tenant_id, project_id, parent_id, type, title,
			description, assignee_id, reporter_id, status, priority,
			estimated_hours, actual_hours, due_date, completed_at,
			sort_order, tags, metadata, created_at, updated_at`

	var item WorkItem
	err = s.pool.QueryRow(ctx, query, newStatus, completedAt, now, id, auth.TenantID).Scan(
		&item.ID, &item.TenantID, &item.ProjectID, &item.ParentID, &item.Type, &item.Title,
		&item.Description, &item.AssigneeID, &item.ReporterID, &item.Status, &item.Priority,
		&item.EstimatedHours, &item.ActualHours, &item.DueDate, &item.CompletedAt,
		&item.SortOrder, &item.Tags, &item.Metadata, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return WorkItem{}, apperrors.Internal("failed to transition work item", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"previous_status": existing.Status,
		"new_status":      newStatus,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "transition:work_item",
		EntityType: "work_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return item, nil
}

// isValidWorkItemTransition checks whether a work item status transition is allowed.
func isValidWorkItemTransition(from, to string) bool {
	allowed := map[string][]string{
		WorkItemStatusTodo:       {WorkItemStatusInProgress},
		WorkItemStatusInProgress: {WorkItemStatusInReview, WorkItemStatusDone, WorkItemStatusBlocked},
		WorkItemStatusInReview:   {WorkItemStatusDone, WorkItemStatusInProgress},
		WorkItemStatusBlocked:    {WorkItemStatusInProgress, WorkItemStatusTodo},
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

// DeleteWorkItem deletes a work item by ID.
func (s *WorkItemService) DeleteWorkItem(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM work_items WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete work item", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("WorkItem", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:work_item",
		EntityType: "work_item",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// GetWorkItemStatusCounts returns aggregated counts of work items per status for a project.
func (s *WorkItemService) GetWorkItemStatusCounts(ctx context.Context, projectID uuid.UUID) ([]WorkItemStatusCount, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT status, COUNT(*) AS count
		FROM work_items
		WHERE project_id = $1 AND tenant_id = $2
		GROUP BY status
		ORDER BY status`

	rows, err := s.pool.Query(ctx, query, projectID, auth.TenantID)
	if err != nil {
		return nil, apperrors.Internal("failed to get work item status counts", err)
	}
	defer rows.Close()

	var counts []WorkItemStatusCount
	for rows.Next() {
		var sc WorkItemStatusCount
		if err := rows.Scan(&sc.Status, &sc.Count); err != nil {
			return nil, apperrors.Internal("failed to scan status count", err)
		}
		counts = append(counts, sc)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate status counts", err)
	}

	if counts == nil {
		counts = []WorkItemStatusCount{}
	}

	return counts, nil
}

// ListOverdueWorkItems returns work items that are past due and not yet completed.
func (s *WorkItemService) ListOverdueWorkItems(ctx context.Context, projectID *uuid.UUID) ([]WorkItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Build base args: $1=projectID, $2=tenantID.
	args := []interface{}{projectID, auth.TenantID}
	nextIdx := 3

	// Add org scope filter via JOIN to projects on division_id.
	orgClause := ""
	orgFilter, orgParam := types.BuildOrgFilter(auth, "p.division_id", nextIdx)
	if orgFilter != "" {
		orgClause = " AND " + orgFilter
		args = append(args, orgParam)
		nextIdx++
	}

	query := fmt.Sprintf(`
		SELECT wi.id, wi.tenant_id, wi.project_id, wi.parent_id, wi.type, wi.title,
			wi.description, wi.assignee_id, wi.reporter_id, wi.status, wi.priority,
			wi.estimated_hours, wi.actual_hours, wi.due_date, wi.completed_at,
			wi.sort_order, wi.tags, wi.metadata, wi.created_at, wi.updated_at
		FROM work_items wi
		JOIN projects p ON p.id = wi.project_id
		WHERE ($1::uuid IS NULL OR wi.project_id = $1)
			AND wi.tenant_id = $2
			AND wi.due_date < NOW()
			AND wi.status IN ('todo', 'in_progress')%s
		ORDER BY wi.due_date ASC`, orgClause)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, apperrors.Internal("failed to list overdue work items", err)
	}
	defer rows.Close()

	var items []WorkItem
	for rows.Next() {
		var item WorkItem
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.ProjectID, &item.ParentID, &item.Type, &item.Title,
			&item.Description, &item.AssigneeID, &item.ReporterID, &item.Status, &item.Priority,
			&item.EstimatedHours, &item.ActualHours, &item.DueDate, &item.CompletedAt,
			&item.SortOrder, &item.Tags, &item.Metadata, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan overdue work item", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate overdue work items", err)
	}

	if items == nil {
		items = []WorkItem{}
	}

	return items, nil
}

// ──────────────────────────────────────────────
// Milestones
// ──────────────────────────────────────────────

// CreateMilestone creates a new milestone for a project.
func (s *WorkItemService) CreateMilestone(ctx context.Context, req CreateMilestoneRequest) (Milestone, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Milestone{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	status := MilestoneStatusPending
	if req.Status != nil {
		status = *req.Status
	}

	query := `
		INSERT INTO milestones (
			id, tenant_id, project_id, title, description,
			target_date, status, evidence_refs, completion_criteria,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11
		)
		RETURNING id, tenant_id, project_id, title, description,
			target_date, actual_date, status, evidence_refs, completion_criteria,
			created_at, updated_at`

	var m Milestone
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.ProjectID, req.Title, req.Description,
		req.TargetDate, status, req.EvidenceRefs, req.CompletionCriteria,
		now, now,
	).Scan(
		&m.ID, &m.TenantID, &m.ProjectID, &m.Title, &m.Description,
		&m.TargetDate, &m.ActualDate, &m.Status, &m.EvidenceRefs, &m.CompletionCriteria,
		&m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return Milestone{}, apperrors.Internal("failed to create milestone", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"title":       req.Title,
		"project_id":  req.ProjectID,
		"target_date": req.TargetDate,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:milestone",
		EntityType: "milestone",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return m, nil
}

// GetMilestone retrieves a single milestone by ID.
func (s *WorkItemService) GetMilestone(ctx context.Context, id uuid.UUID) (Milestone, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Milestone{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, project_id, title, description,
			target_date, actual_date, status, evidence_refs, completion_criteria,
			created_at, updated_at
		FROM milestones
		WHERE id = $1 AND tenant_id = $2`

	var m Milestone
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&m.ID, &m.TenantID, &m.ProjectID, &m.Title, &m.Description,
		&m.TargetDate, &m.ActualDate, &m.Status, &m.EvidenceRefs, &m.CompletionCriteria,
		&m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Milestone{}, apperrors.NotFound("Milestone", id.String())
		}
		return Milestone{}, apperrors.Internal("failed to get milestone", err)
	}

	return m, nil
}

// ListMilestones returns milestones for a project, or all tenant milestones
// when projectID is nil (used by analytics dashboards for cross-project views).
func (s *WorkItemService) ListMilestones(ctx context.Context, projectID *uuid.UUID) ([]Milestone, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, project_id, title, description,
			target_date, actual_date, status, evidence_refs, completion_criteria,
			created_at, updated_at
		FROM milestones
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR project_id = $2)
		ORDER BY target_date ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, projectID)
	if err != nil {
		return nil, apperrors.Internal("failed to list milestones", err)
	}
	defer rows.Close()

	var milestones []Milestone
	for rows.Next() {
		var m Milestone
		if err := rows.Scan(
			&m.ID, &m.TenantID, &m.ProjectID, &m.Title, &m.Description,
			&m.TargetDate, &m.ActualDate, &m.Status, &m.EvidenceRefs, &m.CompletionCriteria,
			&m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan milestone", err)
		}
		milestones = append(milestones, m)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate milestones", err)
	}

	if milestones == nil {
		milestones = []Milestone{}
	}

	return milestones, nil
}

// UpdateMilestone updates an existing milestone using COALESCE partial update.
func (s *WorkItemService) UpdateMilestone(ctx context.Context, id uuid.UUID, req UpdateMilestoneRequest) (Milestone, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Milestone{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the milestone exists and belongs to the tenant.
	_, err := s.GetMilestone(ctx, id)
	if err != nil {
		return Milestone{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE milestones SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			target_date = COALESCE($3, target_date),
			actual_date = COALESCE($4, actual_date),
			status = COALESCE($5, status),
			evidence_refs = COALESCE($6, evidence_refs),
			completion_criteria = COALESCE($7, completion_criteria),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING id, tenant_id, project_id, title, description,
			target_date, actual_date, status, evidence_refs, completion_criteria,
			created_at, updated_at`

	var m Milestone
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.TargetDate,
		req.ActualDate, req.Status, req.EvidenceRefs,
		req.CompletionCriteria,
		now, id, auth.TenantID,
	).Scan(
		&m.ID, &m.TenantID, &m.ProjectID, &m.Title, &m.Description,
		&m.TargetDate, &m.ActualDate, &m.Status, &m.EvidenceRefs, &m.CompletionCriteria,
		&m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return Milestone{}, apperrors.Internal("failed to update milestone", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:milestone",
		EntityType: "milestone",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return m, nil
}

// DeleteMilestone deletes a milestone by ID.
func (s *WorkItemService) DeleteMilestone(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM milestones WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete milestone", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Milestone", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:milestone",
		EntityType: "milestone",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Time Entries
// ──────────────────────────────────────────────

// LogTimeEntry creates a time entry for a work item and updates the work item's actual_hours.
func (s *WorkItemService) LogTimeEntry(ctx context.Context, workItemID uuid.UUID, req CreateTimeEntryRequest) (TimeEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return TimeEntry{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the work item exists.
	_, err := s.GetWorkItem(ctx, workItemID)
	if err != nil {
		return TimeEntry{}, err
	}

	id := uuid.New()
	now := time.Now().UTC()

	loggedDate := now
	if req.LoggedDate != nil {
		loggedDate = *req.LoggedDate
	}

	query := `
		INSERT INTO time_entries (
			id, work_item_id, user_id, hours, description, logged_date, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, work_item_id, user_id, hours, description, logged_date, created_at`

	var entry TimeEntry
	err = s.pool.QueryRow(ctx, query,
		id, workItemID, auth.UserID, req.Hours, req.Description, loggedDate, now,
	).Scan(
		&entry.ID, &entry.WorkItemID, &entry.UserID, &entry.Hours,
		&entry.Description, &entry.LoggedDate, &entry.CreatedAt,
	)
	if err != nil {
		return TimeEntry{}, apperrors.Internal("failed to log time entry", err)
	}

	// Update work item actual_hours via subquery.
	updateQuery := `
		UPDATE work_items SET
			actual_hours = (
				SELECT COALESCE(SUM(hours), 0)
				FROM time_entries
				WHERE work_item_id = $1
			),
			updated_at = $2
		WHERE id = $1`

	_, err = s.pool.Exec(ctx, updateQuery, workItemID, now)
	if err != nil {
		slog.ErrorContext(ctx, "failed to update work item actual_hours", "error", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"hours":        req.Hours,
		"work_item_id": workItemID,
		"logged_date":  loggedDate,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:time_entry",
		EntityType: "time_entry",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return entry, nil
}

// ListTimeEntries returns all time entries for a work item.
func (s *WorkItemService) ListTimeEntries(ctx context.Context, workItemID uuid.UUID) ([]TimeEntry, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, work_item_id, user_id, hours, description, logged_date, created_at
		FROM time_entries
		WHERE work_item_id = $1
		ORDER BY logged_date DESC, created_at DESC`

	rows, err := s.pool.Query(ctx, query, workItemID)
	if err != nil {
		return nil, apperrors.Internal("failed to list time entries", err)
	}
	defer rows.Close()

	var entries []TimeEntry
	for rows.Next() {
		var e TimeEntry
		if err := rows.Scan(
			&e.ID, &e.WorkItemID, &e.UserID, &e.Hours,
			&e.Description, &e.LoggedDate, &e.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan time entry", err)
		}
		entries = append(entries, e)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate time entries", err)
	}

	if entries == nil {
		entries = []TimeEntry{}
	}

	// Suppress unused variable warning for auth — it's checked above.
	_ = auth

	return entries, nil
}

// GetTimeSum returns the total hours logged against a work item.
func (s *WorkItemService) GetTimeSum(ctx context.Context, workItemID uuid.UUID) (float64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return 0, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT COALESCE(SUM(hours), 0) FROM time_entries WHERE work_item_id = $1`

	var total float64
	err := s.pool.QueryRow(ctx, query, workItemID).Scan(&total)
	if err != nil {
		return 0, apperrors.Internal("failed to get time sum", err)
	}

	return total, nil
}

// ──────────────────────────────────────────────
// Bulk Operations
// ──────────────────────────────────────────────

// workItemColumnForField maps a JSON field name to its database column name for work items.
// Returns empty string if the field is not allowed for bulk update.
func workItemColumnForField(field string) string {
	switch field {
	case "status":
		return "status"
	case "priority":
		return "priority"
	case "assigneeId":
		return "assignee_id"
	case "dueDate":
		return "due_date"
	default:
		return ""
	}
}

// BulkUpdateWorkItems updates multiple work items matching the given IDs with the provided field values.
// Only allowed fields (status, priority, assigneeId, dueDate) are accepted.
func (s *WorkItemService) BulkUpdateWorkItems(ctx context.Context, ids []uuid.UUID, fields map[string]string) (int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return 0, apperrors.Unauthorized("authentication required")
	}

	if len(ids) == 0 {
		return 0, apperrors.BadRequest("ids must not be empty")
	}

	if len(fields) == 0 {
		return 0, apperrors.BadRequest("fields must not be empty")
	}

	// Build dynamic SET clause.
	setClauses := []string{}
	args := []any{auth.TenantID, ids}
	argIdx := 3

	for field, value := range fields {
		col := workItemColumnForField(field)
		if col == "" {
			return 0, apperrors.BadRequest(fmt.Sprintf("field %q is not allowed for bulk update", field))
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, argIdx))
		args = append(args, value)
		argIdx++
	}

	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argIdx))
	args = append(args, time.Now().UTC())

	query := fmt.Sprintf(`
		UPDATE work_items
		SET %s
		WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
		joinWorkItemStrings(setClauses, ", "),
	)

	tag, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return 0, apperrors.Internal("failed to bulk update work items", err)
	}

	return tag.RowsAffected(), nil
}

// joinWorkItemStrings joins a slice of strings with a separator.
func joinWorkItemStrings(elems []string, sep string) string {
	if len(elems) == 0 {
		return ""
	}
	result := elems[0]
	for _, e := range elems[1:] {
		result += sep + e
	}
	return result
}

package people

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
// ChecklistService
// ──────────────────────────────────────────────

// ChecklistService handles business logic for checklist templates, checklists, and tasks.
type ChecklistService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewChecklistService creates a new ChecklistService.
func NewChecklistService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ChecklistService {
	return &ChecklistService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Checklist Templates
// ──────────────────────────────────────────────

// CreateChecklistTemplate creates a new checklist template.
func (s *ChecklistService) CreateChecklistTemplate(ctx context.Context, req CreateChecklistTemplateRequest) (ChecklistTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChecklistTemplate{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	var tasks json.RawMessage
	if req.Tasks != nil {
		tasks = *req.Tasks
	} else {
		tasks = json.RawMessage("[]")
	}

	query := `
		INSERT INTO checklist_templates (
			id, tenant_id, type, role_type, name,
			tasks, is_active, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9
		)
		RETURNING id, tenant_id, type, name, role_type,
			tasks, is_active, created_at, updated_at`

	var tmpl ChecklistTemplate
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Type, req.RoleType, req.Name,
		tasks, isActive, now, now,
	).Scan(
		&tmpl.ID, &tmpl.TenantID, &tmpl.Type, &tmpl.Name, &tmpl.RoleType,
		&tmpl.Tasks, &tmpl.IsActive, &tmpl.CreatedAt, &tmpl.UpdatedAt,
	)
	if err != nil {
		return ChecklistTemplate{}, apperrors.Internal("failed to create checklist template", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name, "type": req.Type})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:checklist_template",
		EntityType: "checklist_template",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return tmpl, nil
}

// GetChecklistTemplate retrieves a single checklist template by ID.
func (s *ChecklistService) GetChecklistTemplate(ctx context.Context, id uuid.UUID) (ChecklistTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChecklistTemplate{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, type, name, role_type,
			tasks, is_active, created_at, updated_at
		FROM checklist_templates
		WHERE id = $1 AND tenant_id = $2`

	var tmpl ChecklistTemplate
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&tmpl.ID, &tmpl.TenantID, &tmpl.Type, &tmpl.Name, &tmpl.RoleType,
		&tmpl.Tasks, &tmpl.IsActive, &tmpl.CreatedAt, &tmpl.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ChecklistTemplate{}, apperrors.NotFound("ChecklistTemplate", id.String())
		}
		return ChecklistTemplate{}, apperrors.Internal("failed to get checklist template", err)
	}

	return tmpl, nil
}

// ListChecklistTemplates returns checklist templates, optionally filtered by type and role_type.
func (s *ChecklistService) ListChecklistTemplates(ctx context.Context, checklistType, roleType *string) ([]ChecklistTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, type, name, role_type,
			tasks, is_active, created_at, updated_at
		FROM checklist_templates
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR type = $2)
			AND ($3::text IS NULL OR role_type = $3)
		ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, checklistType, roleType)
	if err != nil {
		return nil, apperrors.Internal("failed to list checklist templates", err)
	}
	defer rows.Close()

	var templates []ChecklistTemplate
	for rows.Next() {
		var tmpl ChecklistTemplate
		if err := rows.Scan(
			&tmpl.ID, &tmpl.TenantID, &tmpl.Type, &tmpl.Name, &tmpl.RoleType,
			&tmpl.Tasks, &tmpl.IsActive, &tmpl.CreatedAt, &tmpl.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan checklist template", err)
		}
		templates = append(templates, tmpl)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate checklist templates", err)
	}

	if templates == nil {
		templates = []ChecklistTemplate{}
	}

	return templates, nil
}

// UpdateChecklistTemplate updates an existing checklist template using COALESCE partial update.
func (s *ChecklistService) UpdateChecklistTemplate(ctx context.Context, id uuid.UUID, req UpdateChecklistTemplateRequest) (ChecklistTemplate, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChecklistTemplate{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetChecklistTemplate(ctx, id); err != nil {
		return ChecklistTemplate{}, err
	}

	now := time.Now().UTC()

	// Dereference Tasks pointer for COALESCE.
	var tasks json.RawMessage
	if req.Tasks != nil {
		tasks = *req.Tasks
	}

	updateQuery := `
		UPDATE checklist_templates SET
			name = COALESCE($1, name),
			role_type = COALESCE($2, role_type),
			tasks = COALESCE($3, tasks),
			is_active = COALESCE($4, is_active),
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7
		RETURNING id, tenant_id, type, name, role_type,
			tasks, is_active, created_at, updated_at`

	var tmpl ChecklistTemplate
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.RoleType, tasks,
		req.IsActive, now, id, auth.TenantID,
	).Scan(
		&tmpl.ID, &tmpl.TenantID, &tmpl.Type, &tmpl.Name, &tmpl.RoleType,
		&tmpl.Tasks, &tmpl.IsActive, &tmpl.CreatedAt, &tmpl.UpdatedAt,
	)
	if err != nil {
		return ChecklistTemplate{}, apperrors.Internal("failed to update checklist template", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:checklist_template",
		EntityType: "checklist_template",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return tmpl, nil
}

// DeleteChecklistTemplate deletes a checklist template by ID.
func (s *ChecklistService) DeleteChecklistTemplate(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM checklist_templates WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete checklist template", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ChecklistTemplate", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:checklist_template",
		EntityType: "checklist_template",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Checklists
// ──────────────────────────────────────────────

// CreateChecklist creates a new checklist instance. If template_id is provided,
// tasks are auto-created from the template.
func (s *ChecklistService) CreateChecklist(ctx context.Context, req CreateChecklistRequest) (Checklist, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Checklist{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO checklists (
			id, tenant_id, template_id, user_id, type,
			status, completion_pct, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			'pending', 0, $6, $7
		)
		RETURNING id, tenant_id, template_id, user_id, type,
			status, completion_pct, started_at, completed_at,
			created_at, updated_at`

	var cl Checklist
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.TemplateID, req.UserID, req.Type,
		now, now,
	).Scan(
		&cl.ID, &cl.TenantID, &cl.TemplateID, &cl.UserID, &cl.Type,
		&cl.Status, &cl.CompletionPct, &cl.StartedAt, &cl.CompletedAt,
		&cl.CreatedAt, &cl.UpdatedAt,
	)
	if err != nil {
		return Checklist{}, apperrors.Internal("failed to create checklist", err)
	}

	// If a template was provided, auto-create tasks from it.
	if req.TemplateID != nil {
		tmpl, tmplErr := s.GetChecklistTemplate(ctx, *req.TemplateID)
		if tmplErr == nil && tmpl.Tasks != nil {
			type TemplateTask struct {
				Title       string `json:"title"`
				Description string `json:"description"`
				SortOrder   int    `json:"sortOrder"`
			}
			var templateTasks []TemplateTask
			if jsonErr := json.Unmarshal(tmpl.Tasks, &templateTasks); jsonErr == nil {
				for _, tt := range templateTasks {
					taskID := uuid.New()
					taskQuery := `
						INSERT INTO checklist_tasks (
							id, checklist_id, title, description, status,
							sort_order, created_at, updated_at
						) VALUES (
							$1, $2, $3, $4, 'pending',
							$5, $6, $7
						)`
					var desc *string
					if tt.Description != "" {
						desc = &tt.Description
					}
					if _, taskErr := s.pool.Exec(ctx, taskQuery,
						taskID, id, tt.Title, desc,
						tt.SortOrder, now, now,
					); taskErr != nil {
						slog.ErrorContext(ctx, "failed to create task from template",
							"error", taskErr, "checklist_id", id, "task_title", tt.Title)
					}
				}
			}
		}
	}

	changes, _ := json.Marshal(map[string]any{
		"userId": req.UserID,
		"type":   req.Type,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:checklist",
		EntityType: "checklist",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cl, nil
}

// GetChecklist retrieves a single checklist by ID.
func (s *ChecklistService) GetChecklist(ctx context.Context, id uuid.UUID) (Checklist, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return Checklist{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, template_id, user_id, type,
			status, completion_pct, started_at, completed_at,
			created_at, updated_at
		FROM checklists
		WHERE id = $1 AND tenant_id = $2`

	var cl Checklist
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&cl.ID, &cl.TenantID, &cl.TemplateID, &cl.UserID, &cl.Type,
		&cl.Status, &cl.CompletionPct, &cl.StartedAt, &cl.CompletedAt,
		&cl.CreatedAt, &cl.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Checklist{}, apperrors.NotFound("Checklist", id.String())
		}
		return Checklist{}, apperrors.Internal("failed to get checklist", err)
	}

	return cl, nil
}

// ListChecklists returns a filtered, paginated list of checklists.
func (s *ChecklistService) ListChecklists(ctx context.Context, checklistType, status *string, userID *uuid.UUID, page, limit int) ([]Checklist, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	offset := (page - 1) * limit

	// Build org-scope filter. Next param index after $4 (userID) is 5.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 5)

	// Build args: tenant_id, checklistType, status, userID [, orgParam]
	countArgs := []interface{}{auth.TenantID, checklistType, status, userID}
	orgSQL := ""
	nextIdx := 5
	if orgClause != "" {
		orgSQL = " AND " + orgClause
		if orgParam != nil {
			countArgs = append(countArgs, orgParam)
			nextIdx = 6
		}
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM checklists
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR type = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::uuid IS NULL OR user_id = $4)%s`, orgSQL)

	var total int
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count checklists", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT id, tenant_id, template_id, user_id, type,
			status, completion_pct, started_at, completed_at,
			created_at, updated_at
		FROM checklists
		WHERE tenant_id = $1
			AND ($2::text IS NULL OR type = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::uuid IS NULL OR user_id = $4)%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, orgSQL, nextIdx, nextIdx+1)

	dataArgs := append(countArgs, limit, offset)
	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list checklists", err)
	}
	defer rows.Close()

	var checklists []Checklist
	for rows.Next() {
		var cl Checklist
		if err := rows.Scan(
			&cl.ID, &cl.TenantID, &cl.TemplateID, &cl.UserID, &cl.Type,
			&cl.Status, &cl.CompletionPct, &cl.StartedAt, &cl.CompletedAt,
			&cl.CreatedAt, &cl.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan checklist", err)
		}
		checklists = append(checklists, cl)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate checklists", err)
	}

	if checklists == nil {
		checklists = []Checklist{}
	}

	return checklists, total, nil
}

// UpdateChecklistStatus updates a checklist's status.
func (s *ChecklistService) UpdateChecklistStatus(ctx context.Context, id uuid.UUID, req UpdateChecklistStatusRequest) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE checklists SET
			status = $1,
			completion_pct = COALESCE($2, completion_pct),
			started_at = COALESCE($3, started_at),
			completed_at = COALESCE($4, completed_at),
			updated_at = $5
		WHERE id = $6 AND tenant_id = $7`

	result, err := s.pool.Exec(ctx, query,
		req.Status, req.CompletionPct, req.StartedAt, req.CompletedAt,
		now, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to update checklist status", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Checklist", id.String())
	}

	changes, _ := json.Marshal(map[string]any{"status": req.Status})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:checklist_status",
		EntityType: "checklist",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// DeleteChecklist deletes a checklist by ID.
func (s *ChecklistService) DeleteChecklist(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM checklists WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete checklist", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("Checklist", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:checklist",
		EntityType: "checklist",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Checklist Tasks
// ──────────────────────────────────────────────

// CreateChecklistTask creates a new checklist task.
func (s *ChecklistService) CreateChecklistTask(ctx context.Context, req CreateChecklistTaskRequest) (ChecklistTask, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChecklistTask{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	query := `
		INSERT INTO checklist_tasks (
			id, checklist_id, title, description, assignee_id,
			status, due_date, sort_order, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			'pending', $6, $7, $8, $9
		)
		RETURNING id, checklist_id, title, description, assignee_id,
			status, due_date, completed_at, completed_by,
			evidence_doc_id, notes, sort_order, created_at, updated_at`

	var task ChecklistTask
	err := s.pool.QueryRow(ctx, query,
		id, req.ChecklistID, req.Title, req.Description, req.AssigneeID,
		req.DueDate, sortOrder, now, now,
	).Scan(
		&task.ID, &task.ChecklistID, &task.Title, &task.Description, &task.AssigneeID,
		&task.Status, &task.DueDate, &task.CompletedAt, &task.CompletedBy,
		&task.EvidenceDocID, &task.Notes, &task.SortOrder, &task.CreatedAt, &task.UpdatedAt,
	)
	if err != nil {
		return ChecklistTask{}, apperrors.Internal("failed to create checklist task", err)
	}

	changes, _ := json.Marshal(map[string]any{"title": req.Title, "checklistId": req.ChecklistID})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:checklist_task",
		EntityType: "checklist_task",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return task, nil
}

// GetChecklistTask retrieves a single checklist task by ID.
func (s *ChecklistService) GetChecklistTask(ctx context.Context, id uuid.UUID) (ChecklistTask, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChecklistTask{}, apperrors.Unauthorized("authentication required")
	}
	_ = auth // tenant filtering is via checklist join if needed

	query := `
		SELECT id, checklist_id, title, description, assignee_id,
			status, due_date, completed_at, completed_by,
			evidence_doc_id, notes, sort_order, created_at, updated_at
		FROM checklist_tasks
		WHERE id = $1`

	var task ChecklistTask
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&task.ID, &task.ChecklistID, &task.Title, &task.Description, &task.AssigneeID,
		&task.Status, &task.DueDate, &task.CompletedAt, &task.CompletedBy,
		&task.EvidenceDocID, &task.Notes, &task.SortOrder, &task.CreatedAt, &task.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ChecklistTask{}, apperrors.NotFound("ChecklistTask", id.String())
		}
		return ChecklistTask{}, apperrors.Internal("failed to get checklist task", err)
	}

	return task, nil
}

// ListChecklistTasks returns all tasks for a given checklist.
func (s *ChecklistService) ListChecklistTasks(ctx context.Context, checklistID uuid.UUID) ([]ChecklistTask, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}
	_ = auth

	query := `
		SELECT id, checklist_id, title, description, assignee_id,
			status, due_date, completed_at, completed_by,
			evidence_doc_id, notes, sort_order, created_at, updated_at
		FROM checklist_tasks
		WHERE checklist_id = $1
		ORDER BY sort_order ASC, created_at ASC`

	rows, err := s.pool.Query(ctx, query, checklistID)
	if err != nil {
		return nil, apperrors.Internal("failed to list checklist tasks", err)
	}
	defer rows.Close()

	var tasks []ChecklistTask
	for rows.Next() {
		var task ChecklistTask
		if err := rows.Scan(
			&task.ID, &task.ChecklistID, &task.Title, &task.Description, &task.AssigneeID,
			&task.Status, &task.DueDate, &task.CompletedAt, &task.CompletedBy,
			&task.EvidenceDocID, &task.Notes, &task.SortOrder, &task.CreatedAt, &task.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan checklist task", err)
		}
		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate checklist tasks", err)
	}

	if tasks == nil {
		tasks = []ChecklistTask{}
	}

	return tasks, nil
}

// UpdateChecklistTask updates a checklist task using COALESCE partial update.
func (s *ChecklistService) UpdateChecklistTask(ctx context.Context, id uuid.UUID, req UpdateChecklistTaskRequest) (ChecklistTask, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return ChecklistTask{}, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE checklist_tasks SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			assignee_id = COALESCE($3, assignee_id),
			status = COALESCE($4, status),
			due_date = COALESCE($5, due_date),
			notes = COALESCE($6, notes),
			sort_order = COALESCE($7, sort_order),
			updated_at = $8
		WHERE id = $9
		RETURNING id, checklist_id, title, description, assignee_id,
			status, due_date, completed_at, completed_by,
			evidence_doc_id, notes, sort_order, created_at, updated_at`

	var task ChecklistTask
	err := s.pool.QueryRow(ctx, updateQuery,
		req.Title, req.Description, req.AssigneeID,
		req.Status, req.DueDate, req.Notes,
		req.SortOrder, now, id,
	).Scan(
		&task.ID, &task.ChecklistID, &task.Title, &task.Description, &task.AssigneeID,
		&task.Status, &task.DueDate, &task.CompletedAt, &task.CompletedBy,
		&task.EvidenceDocID, &task.Notes, &task.SortOrder, &task.CreatedAt, &task.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ChecklistTask{}, apperrors.NotFound("ChecklistTask", id.String())
		}
		return ChecklistTask{}, apperrors.Internal("failed to update checklist task", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:checklist_task",
		EntityType: "checklist_task",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return task, nil
}

// CompleteChecklistTask marks a task as completed and recalculates checklist completion_pct.
func (s *ChecklistService) CompleteChecklistTask(ctx context.Context, taskID uuid.UUID, completedBy uuid.UUID, req CompleteChecklistTaskRequest) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	// Mark the task as completed.
	taskQuery := `
		UPDATE checklist_tasks SET
			status = 'completed',
			completed_at = $1,
			completed_by = $2,
			evidence_doc_id = COALESCE($3, evidence_doc_id),
			notes = COALESCE($4, notes),
			updated_at = $5
		WHERE id = $6
		RETURNING checklist_id`

	var checklistID uuid.UUID
	err := s.pool.QueryRow(ctx, taskQuery,
		now, completedBy, req.EvidenceDocID, req.Notes, now, taskID,
	).Scan(&checklistID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("ChecklistTask", taskID.String())
		}
		return apperrors.Internal("failed to complete checklist task", err)
	}

	// Recalculate checklist completion percentage.
	pctQuery := `
		UPDATE checklists SET
			completion_pct = (
				SELECT COALESCE(
					ROUND(
						COUNT(*) FILTER (WHERE status IN ('completed', 'skipped'))::numeric /
						NULLIF(COUNT(*)::numeric, 0) * 100, 2
					), 0
				)
				FROM checklist_tasks WHERE checklist_id = $1
			),
			updated_at = $2
		WHERE id = $1`

	if _, err := s.pool.Exec(ctx, pctQuery, checklistID, now); err != nil {
		slog.ErrorContext(ctx, "failed to recalculate checklist completion",
			"error", err, "checklist_id", checklistID)
	}

	changes, _ := json.Marshal(map[string]any{"completedBy": completedBy})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "complete:checklist_task",
		EntityType: "checklist_task",
		EntityID:   taskID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// DeleteChecklistTask deletes a checklist task by ID.
func (s *ChecklistService) DeleteChecklistTask(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM checklist_tasks WHERE id = $1`

	result, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return apperrors.Internal("failed to delete checklist task", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("ChecklistTask", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:checklist_task",
		EntityType: "checklist_task",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

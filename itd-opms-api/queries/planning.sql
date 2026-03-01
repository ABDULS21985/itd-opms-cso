-- ──────────────────────────────────────────────
-- Portfolios
-- ──────────────────────────────────────────────

-- name: CreatePortfolio :one
INSERT INTO portfolios (tenant_id, name, description, owner_id, fiscal_year, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetPortfolio :one
SELECT * FROM portfolios WHERE id = $1 AND tenant_id = $2;

-- name: ListPortfolios :many
SELECT * FROM portfolios
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY fiscal_year DESC, name ASC
LIMIT $3 OFFSET $4;

-- name: UpdatePortfolio :one
UPDATE portfolios
SET name = COALESCE($3, name),
    description = COALESCE($4, description),
    owner_id = COALESCE($5, owner_id),
    fiscal_year = COALESCE($6, fiscal_year),
    status = COALESCE($7, status)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeletePortfolio :exec
DELETE FROM portfolios WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Projects
-- ──────────────────────────────────────────────

-- name: CreateProject :one
INSERT INTO projects (
    tenant_id, portfolio_id, title, code, description, charter, scope,
    business_case, sponsor_id, project_manager_id, status, rag_status,
    priority, planned_start, planned_end, budget_approved, metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
RETURNING *;

-- name: GetProject :one
SELECT * FROM projects WHERE id = $1 AND tenant_id = $2;

-- name: ListProjects :many
SELECT * FROM projects
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR portfolio_id = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::text IS NULL OR rag_status = $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: UpdateProject :one
UPDATE projects
SET portfolio_id = COALESCE($3, portfolio_id),
    title = COALESCE($4, title),
    code = COALESCE($5, code),
    description = COALESCE($6, description),
    charter = COALESCE($7, charter),
    scope = COALESCE($8, scope),
    business_case = COALESCE($9, business_case),
    sponsor_id = COALESCE($10, sponsor_id),
    project_manager_id = COALESCE($11, project_manager_id),
    status = COALESCE($12, status),
    rag_status = COALESCE($13, rag_status),
    priority = COALESCE($14, priority),
    planned_start = COALESCE($15, planned_start),
    planned_end = COALESCE($16, planned_end),
    actual_start = COALESCE($17, actual_start),
    actual_end = COALESCE($18, actual_end),
    budget_approved = COALESCE($19, budget_approved),
    budget_spent = COALESCE($20, budget_spent),
    completion_pct = COALESCE($21, completion_pct),
    metadata = COALESCE($22, metadata)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateProjectStatus :exec
UPDATE projects
SET status = $3, rag_status = $4
WHERE id = $1 AND tenant_id = $2;

-- name: DeleteProject :exec
DELETE FROM projects WHERE id = $1 AND tenant_id = $2;

-- name: CountProjectsByPortfolio :one
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'active') AS active,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COALESCE(AVG(completion_pct), 0) AS avg_completion_pct,
    COALESCE(SUM(budget_approved), 0) AS total_budget_approved,
    COALESCE(SUM(budget_spent), 0) AS total_budget_spent
FROM projects
WHERE portfolio_id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Project Dependencies
-- ──────────────────────────────────────────────

-- name: CreateProjectDependency :one
INSERT INTO project_dependencies (project_id, depends_on_project_id, dependency_type, description, impact_if_delayed)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListProjectDependencies :many
SELECT * FROM project_dependencies
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: DeleteProjectDependency :exec
DELETE FROM project_dependencies WHERE id = $1;

-- ──────────────────────────────────────────────
-- Project Stakeholders
-- ──────────────────────────────────────────────

-- name: AddProjectStakeholder :one
INSERT INTO project_stakeholders (project_id, user_id, role, influence, interest, communication_preference)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListProjectStakeholders :many
SELECT * FROM project_stakeholders
WHERE project_id = $1
ORDER BY role, created_at ASC;

-- name: RemoveProjectStakeholder :exec
DELETE FROM project_stakeholders WHERE id = $1;

-- ──────────────────────────────────────────────
-- Work Items
-- ──────────────────────────────────────────────

-- name: CreateWorkItem :one
INSERT INTO work_items (
    tenant_id, project_id, parent_id, type, title, description,
    assignee_id, reporter_id, status, priority, estimated_hours,
    due_date, sort_order, tags, metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
RETURNING *;

-- name: GetWorkItem :one
SELECT * FROM work_items WHERE id = $1 AND tenant_id = $2;

-- name: ListWorkItemsByProject :many
SELECT * FROM work_items
WHERE project_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::uuid IS NULL OR assignee_id = $3)
  AND ($4::text IS NULL OR priority = $4)
  AND ($5::text IS NULL OR type = $5)
ORDER BY sort_order ASC, created_at ASC
LIMIT $6 OFFSET $7;

-- name: ListWorkItemsByParent :many
SELECT * FROM work_items
WHERE parent_id = $1
ORDER BY sort_order ASC, created_at ASC;

-- name: UpdateWorkItem :one
UPDATE work_items
SET parent_id = COALESCE($3, parent_id),
    type = COALESCE($4, type),
    title = COALESCE($5, title),
    description = COALESCE($6, description),
    assignee_id = COALESCE($7, assignee_id),
    reporter_id = COALESCE($8, reporter_id),
    status = COALESCE($9, status),
    priority = COALESCE($10, priority),
    estimated_hours = COALESCE($11, estimated_hours),
    actual_hours = COALESCE($12, actual_hours),
    due_date = COALESCE($13, due_date),
    completed_at = CASE WHEN $9 = 'done' THEN NOW() ELSE completed_at END,
    sort_order = COALESCE($14, sort_order),
    tags = COALESCE($15, tags),
    metadata = COALESCE($16, metadata)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateWorkItemStatus :exec
UPDATE work_items
SET status = $3,
    completed_at = CASE WHEN $3 = 'done' THEN NOW() ELSE completed_at END
WHERE id = $1 AND tenant_id = $2;

-- name: DeleteWorkItem :exec
DELETE FROM work_items WHERE id = $1 AND tenant_id = $2;

-- name: CountWorkItemsByStatus :many
SELECT status, COUNT(*)::int AS count
FROM work_items
WHERE project_id = $1
GROUP BY status
ORDER BY status;

-- name: ListOverdueWorkItems :many
SELECT * FROM work_items
WHERE tenant_id = $1
  AND status IN ('todo', 'in_progress')
  AND due_date < NOW()
ORDER BY due_date ASC
LIMIT $2 OFFSET $3;

-- ──────────────────────────────────────────────
-- Milestones
-- ──────────────────────────────────────────────

-- name: CreateMilestone :one
INSERT INTO milestones (tenant_id, project_id, title, description, target_date, status, evidence_refs, completion_criteria)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetMilestone :one
SELECT * FROM milestones WHERE id = $1 AND tenant_id = $2;

-- name: ListMilestonesByProject :many
SELECT * FROM milestones
WHERE project_id = $1
ORDER BY target_date ASC;

-- name: UpdateMilestone :one
UPDATE milestones
SET title = COALESCE($3, title),
    description = COALESCE($4, description),
    target_date = COALESCE($5, target_date),
    actual_date = COALESCE($6, actual_date),
    status = COALESCE($7, status),
    evidence_refs = COALESCE($8, evidence_refs),
    completion_criteria = COALESCE($9, completion_criteria)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteMilestone :exec
DELETE FROM milestones WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Time Entries
-- ──────────────────────────────────────────────

-- name: CreateTimeEntry :one
INSERT INTO time_entries (work_item_id, user_id, hours, description, logged_date)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListTimeEntriesByWorkItem :many
SELECT * FROM time_entries
WHERE work_item_id = $1
ORDER BY logged_date DESC, created_at DESC;

-- name: SumTimeByWorkItem :one
SELECT COALESCE(SUM(hours), 0)::decimal(8,2) AS total_hours
FROM time_entries
WHERE work_item_id = $1;

-- name: DeleteTimeEntry :exec
DELETE FROM time_entries WHERE id = $1;

-- ──────────────────────────────────────────────
-- Risk Register
-- ──────────────────────────────────────────────

-- name: CreateRisk :one
INSERT INTO risk_register (
    tenant_id, project_id, title, description, category,
    likelihood, impact, status, mitigation_plan, contingency_plan,
    owner_id, review_date
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetRisk :one
SELECT * FROM risk_register WHERE id = $1 AND tenant_id = $2;

-- name: ListRisksByProject :many
SELECT * FROM risk_register
WHERE project_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY risk_score DESC, created_at DESC;

-- name: ListRisksByTenant :many
SELECT * FROM risk_register
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR category = $3)
ORDER BY risk_score DESC, created_at DESC
LIMIT $4 OFFSET $5;

-- name: UpdateRisk :one
UPDATE risk_register
SET project_id = COALESCE($3, project_id),
    title = COALESCE($4, title),
    description = COALESCE($5, description),
    category = COALESCE($6, category),
    likelihood = COALESCE($7, likelihood),
    impact = COALESCE($8, impact),
    status = COALESCE($9, status),
    mitigation_plan = COALESCE($10, mitigation_plan),
    contingency_plan = COALESCE($11, contingency_plan),
    owner_id = COALESCE($12, owner_id),
    review_date = COALESCE($13, review_date)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteRisk :exec
DELETE FROM risk_register WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Issues
-- ──────────────────────────────────────────────

-- name: CreateIssue :one
INSERT INTO issues (
    tenant_id, project_id, title, description, category,
    severity, status, assignee_id, due_date
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetIssue :one
SELECT * FROM issues WHERE id = $1 AND tenant_id = $2;

-- name: ListIssuesByProject :many
SELECT * FROM issues
WHERE project_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR severity = $3)
ORDER BY created_at DESC;

-- name: ListIssuesByTenant :many
SELECT * FROM issues
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdateIssue :one
UPDATE issues
SET project_id = COALESCE($3, project_id),
    title = COALESCE($4, title),
    description = COALESCE($5, description),
    category = COALESCE($6, category),
    severity = COALESCE($7, severity),
    status = COALESCE($8, status),
    assignee_id = COALESCE($9, assignee_id),
    resolution = COALESCE($10, resolution),
    escalation_level = COALESCE($11, escalation_level),
    escalated_to_id = COALESCE($12, escalated_to_id),
    due_date = COALESCE($13, due_date)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteIssue :exec
DELETE FROM issues WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Change Requests
-- ──────────────────────────────────────────────

-- name: CreateChangeRequest :one
INSERT INTO change_requests (
    tenant_id, project_id, title, description, justification,
    impact_assessment, status, requested_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetChangeRequest :one
SELECT * FROM change_requests WHERE id = $1 AND tenant_id = $2;

-- name: ListChangeRequestsByProject :many
SELECT * FROM change_requests
WHERE project_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY created_at DESC;

-- name: ListChangeRequestsByTenant :many
SELECT * FROM change_requests
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdateChangeRequest :one
UPDATE change_requests
SET project_id = COALESCE($3, project_id),
    title = COALESCE($4, title),
    description = COALESCE($5, description),
    justification = COALESCE($6, justification),
    impact_assessment = COALESCE($7, impact_assessment),
    status = COALESCE($8, status),
    reviewed_by = COALESCE($9, reviewed_by),
    approval_chain_id = COALESCE($10, approval_chain_id)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateChangeRequestStatus :exec
UPDATE change_requests
SET status = $3, reviewed_by = $4
WHERE id = $1 AND tenant_id = $2;

-- name: DeleteChangeRequest :exec
DELETE FROM change_requests WHERE id = $1 AND tenant_id = $2;

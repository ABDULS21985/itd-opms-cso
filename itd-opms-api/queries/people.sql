-- ──────────────────────────────────────────────
-- Skill Categories
-- ──────────────────────────────────────────────

-- name: CreateSkillCategory :one
INSERT INTO skill_categories (tenant_id, name, description, parent_id)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSkillCategory :one
SELECT * FROM skill_categories WHERE id = $1 AND tenant_id = $2;

-- name: ListSkillCategories :many
SELECT * FROM skill_categories
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR parent_id = $2)
ORDER BY name;

-- name: UpdateSkillCategory :one
UPDATE skill_categories
SET name        = COALESCE($3, name),
    description = COALESCE($4, description),
    parent_id   = COALESCE($5, parent_id)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteSkillCategory :exec
DELETE FROM skill_categories WHERE id = $1 AND tenant_id = $2;

-- name: CountSkillCategories :one
SELECT COUNT(*)::int AS count FROM skill_categories WHERE tenant_id = $1;

-- ──────────────────────────────────────────────
-- Skills
-- ──────────────────────────────────────────────

-- name: CreateSkill :one
INSERT INTO skills (tenant_id, category_id, name, description)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSkill :one
SELECT * FROM skills WHERE id = $1 AND tenant_id = $2;

-- name: ListSkills :many
SELECT * FROM skills
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR category_id = $2)
ORDER BY name
LIMIT $3 OFFSET $4;

-- name: CountSkills :one
SELECT COUNT(*)::int AS count FROM skills
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR category_id = $2);

-- name: UpdateSkill :one
UPDATE skills
SET name        = COALESCE($3, name),
    category_id = COALESCE($4, category_id),
    description = COALESCE($5, description)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteSkill :exec
DELETE FROM skills WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- User Skills
-- ──────────────────────────────────────────────

-- name: CreateUserSkill :one
INSERT INTO user_skills (tenant_id, user_id, skill_id, proficiency_level, certified, certification_name, certification_expiry)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetUserSkill :one
SELECT * FROM user_skills WHERE id = $1 AND tenant_id = $2;

-- name: ListUserSkills :many
SELECT * FROM user_skills
WHERE tenant_id = $1
  AND user_id = $2
ORDER BY created_at DESC;

-- name: ListUsersBySkill :many
SELECT * FROM user_skills
WHERE tenant_id = $1
  AND skill_id = $2
  AND ($3::text IS NULL OR proficiency_level = $3)
ORDER BY proficiency_level DESC;

-- name: UpdateUserSkill :one
UPDATE user_skills
SET proficiency_level    = COALESCE($3, proficiency_level),
    certified            = COALESCE($4, certified),
    certification_name   = COALESCE($5, certification_name),
    certification_expiry = COALESCE($6, certification_expiry)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteUserSkill :exec
DELETE FROM user_skills WHERE id = $1 AND tenant_id = $2;

-- name: VerifyUserSkill :exec
UPDATE user_skills
SET verified_by = $2, verified_at = now()
WHERE id = $1;

-- ──────────────────────────────────────────────
-- Role Skill Requirements
-- ──────────────────────────────────────────────

-- name: CreateRoleSkillRequirement :one
INSERT INTO role_skill_requirements (tenant_id, role_type, skill_id, required_level)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListRoleSkillRequirements :many
SELECT * FROM role_skill_requirements
WHERE tenant_id = $1
  AND role_type = $2;

-- name: DeleteRoleSkillRequirement :exec
DELETE FROM role_skill_requirements WHERE id = $1 AND tenant_id = $2;

-- name: GetSkillGapAnalysis :many
SELECT s.name AS skill_name,
       rsr.required_level,
       COALESCE(us.proficiency_level, 'none') AS current_level
FROM role_skill_requirements rsr
JOIN skills s ON s.id = rsr.skill_id
LEFT JOIN user_skills us ON us.skill_id = rsr.skill_id AND us.user_id = $3
WHERE rsr.tenant_id = $1
  AND rsr.role_type = $2;

-- ──────────────────────────────────────────────
-- Checklist Templates
-- ──────────────────────────────────────────────

-- name: CreateChecklistTemplate :one
INSERT INTO checklist_templates (tenant_id, type, role_type, name, tasks, is_active)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetChecklistTemplate :one
SELECT * FROM checklist_templates WHERE id = $1 AND tenant_id = $2;

-- name: ListChecklistTemplates :many
SELECT * FROM checklist_templates
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type = $2)
  AND ($3::text IS NULL OR role_type = $3)
ORDER BY name;

-- name: UpdateChecklistTemplate :one
UPDATE checklist_templates
SET name      = COALESCE($3, name),
    role_type = COALESCE($4, role_type),
    tasks     = COALESCE($5, tasks),
    is_active = COALESCE($6, is_active)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteChecklistTemplate :exec
DELETE FROM checklist_templates WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Checklists
-- ──────────────────────────────────────────────

-- name: CreateChecklist :one
INSERT INTO checklists (tenant_id, template_id, user_id, type, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetChecklist :one
SELECT * FROM checklists WHERE id = $1 AND tenant_id = $2;

-- name: ListChecklists :many
SELECT * FROM checklists
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::uuid IS NULL OR user_id = $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountChecklists :one
SELECT COUNT(*)::int AS count FROM checklists
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::uuid IS NULL OR user_id = $4);

-- name: UpdateChecklistStatus :exec
UPDATE checklists
SET status         = $2,
    completion_pct = $3,
    started_at     = $4,
    completed_at   = $5
WHERE id = $1;

-- name: DeleteChecklist :exec
DELETE FROM checklists WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Checklist Tasks
-- ──────────────────────────────────────────────

-- name: CreateChecklistTask :one
INSERT INTO checklist_tasks (checklist_id, title, description, assignee_id, due_date, sort_order)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetChecklistTask :one
SELECT * FROM checklist_tasks WHERE id = $1;

-- name: ListChecklistTasks :many
SELECT * FROM checklist_tasks
WHERE checklist_id = $1
ORDER BY sort_order, created_at;

-- name: UpdateChecklistTask :one
UPDATE checklist_tasks
SET title       = COALESCE($2, title),
    description = COALESCE($3, description),
    assignee_id = COALESCE($4, assignee_id),
    status      = COALESCE($5, status),
    due_date    = COALESCE($6, due_date),
    notes       = COALESCE($7, notes),
    sort_order  = COALESCE($8, sort_order)
WHERE id = $1
RETURNING *;

-- name: CompleteChecklistTask :exec
UPDATE checklist_tasks
SET status       = 'completed',
    completed_at = now(),
    completed_by = $2
WHERE id = $1;

-- name: DeleteChecklistTask :exec
DELETE FROM checklist_tasks WHERE id = $1;

-- ──────────────────────────────────────────────
-- Rosters
-- ──────────────────────────────────────────────

-- name: CreateRoster :one
INSERT INTO rosters (tenant_id, team_id, name, period_start, period_end, status, shifts)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetRoster :one
SELECT * FROM rosters WHERE id = $1 AND tenant_id = $2;

-- name: ListRosters :many
SELECT * FROM rosters
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR team_id = $2)
  AND ($3::text IS NULL OR status = $3)
ORDER BY period_start DESC
LIMIT $4 OFFSET $5;

-- name: CountRosters :one
SELECT COUNT(*)::int AS count FROM rosters
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR team_id = $2)
  AND ($3::text IS NULL OR status = $3);

-- name: UpdateRoster :one
UPDATE rosters
SET name         = COALESCE($3, name),
    status       = COALESCE($4, status),
    period_start = COALESCE($5, period_start),
    period_end   = COALESCE($6, period_end),
    shifts       = COALESCE($7, shifts)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- ──────────────────────────────────────────────
-- Leave Records
-- ──────────────────────────────────────────────

-- name: CreateLeaveRecord :one
INSERT INTO leave_records (tenant_id, user_id, leave_type, start_date, end_date, status, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetLeaveRecord :one
SELECT * FROM leave_records WHERE id = $1 AND tenant_id = $2;

-- name: ListLeaveRecords :many
SELECT * FROM leave_records
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR user_id = $2)
  AND ($3::text IS NULL OR status = $3)
ORDER BY start_date DESC
LIMIT $4 OFFSET $5;

-- name: CountLeaveRecords :one
SELECT COUNT(*)::int AS count FROM leave_records
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR user_id = $2)
  AND ($3::text IS NULL OR status = $3);

-- name: UpdateLeaveRecordStatus :exec
UPDATE leave_records
SET status      = $2,
    approved_by = $3
WHERE id = $1;

-- name: DeleteLeaveRecord :exec
DELETE FROM leave_records WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Capacity Allocations
-- ──────────────────────────────────────────────

-- name: CreateCapacityAllocation :one
INSERT INTO capacity_allocations (tenant_id, user_id, project_id, allocation_pct, period_start, period_end)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListCapacityAllocations :many
SELECT * FROM capacity_allocations
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR user_id = $2)
  AND ($3::uuid IS NULL OR project_id = $3)
ORDER BY period_start
LIMIT $4 OFFSET $5;

-- name: CountCapacityAllocations :one
SELECT COUNT(*)::int AS count FROM capacity_allocations
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR user_id = $2)
  AND ($3::uuid IS NULL OR project_id = $3);

-- name: UpdateCapacityAllocation :one
UPDATE capacity_allocations
SET project_id     = COALESCE($3, project_id),
    allocation_pct = COALESCE($4, allocation_pct),
    period_start   = COALESCE($5, period_start),
    period_end     = COALESCE($6, period_end)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteCapacityAllocation :exec
DELETE FROM capacity_allocations WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Training Records
-- ──────────────────────────────────────────────

-- name: CreateTrainingRecord :one
INSERT INTO training_records (tenant_id, user_id, title, provider, type, status, cost, expiry_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetTrainingRecord :one
SELECT * FROM training_records WHERE id = $1 AND tenant_id = $2;

-- name: ListTrainingRecords :many
SELECT * FROM training_records
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR user_id = $2)
  AND ($3::text IS NULL OR type = $3)
  AND ($4::text IS NULL OR status = $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountTrainingRecords :one
SELECT COUNT(*)::int AS count FROM training_records
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR user_id = $2)
  AND ($3::text IS NULL OR type = $3)
  AND ($4::text IS NULL OR status = $4);

-- name: UpdateTrainingRecord :one
UPDATE training_records
SET title              = COALESCE($3, title),
    provider           = COALESCE($4, provider),
    type               = COALESCE($5, type),
    status             = COALESCE($6, status),
    completed_at       = COALESCE($7, completed_at),
    expiry_date        = COALESCE($8, expiry_date),
    certificate_doc_id = COALESCE($9, certificate_doc_id),
    cost               = COALESCE($10, cost)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteTrainingRecord :exec
DELETE FROM training_records WHERE id = $1 AND tenant_id = $2;

-- name: GetExpiringCertifications :many
SELECT * FROM training_records
WHERE tenant_id = $1
  AND expiry_date IS NOT NULL
  AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2::int || ' days')::interval
ORDER BY expiry_date ASC;

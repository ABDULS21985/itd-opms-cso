-- ──────────────────────────────────────────────
-- Release Management SQLC Queries
-- ──────────────────────────────────────────────

-- name: CreateRelease :one
INSERT INTO releases (
    tenant_id, title, description, release_type, environment,
    planned_start, planned_end, release_manager_id, deployment_team,
    deployment_plan, rollback_plan, risk_assessment, readiness_checklist,
    change_ticket_ids, created_by
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12, $13,
    $14, $15
)
RETURNING *;

-- name: GetRelease :one
SELECT r.*,
       mgr.display_name AS release_manager_name,
       cr.display_name AS created_by_name
FROM releases r
LEFT JOIN users mgr ON mgr.id = r.release_manager_id
LEFT JOIN users cr ON cr.id = r.created_by
WHERE r.id = $1 AND r.tenant_id = $2;

-- name: ListReleases :many
SELECT r.*,
       mgr.display_name AS release_manager_name,
       cr.display_name AS created_by_name
FROM releases r
LEFT JOIN users mgr ON mgr.id = r.release_manager_id
LEFT JOIN users cr ON cr.id = r.created_by
WHERE r.tenant_id = $1
  AND ($2::text IS NULL OR r.status = $2)
  AND ($3::text IS NULL OR r.release_type = $3)
  AND ($4::text IS NULL OR r.environment = $4)
  AND ($5::uuid IS NULL OR r.release_manager_id = $5)
ORDER BY r.created_at DESC
LIMIT $6 OFFSET $7;

-- name: CountReleases :one
SELECT COUNT(*) FROM releases
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR release_type = $3)
  AND ($4::text IS NULL OR environment = $4)
  AND ($5::uuid IS NULL OR release_manager_id = $5);

-- name: UpdateRelease :one
UPDATE releases SET
    title = COALESCE($3, title),
    description = COALESCE($4, description),
    release_type = COALESCE($5, release_type),
    environment = COALESCE($6, environment),
    planned_start = COALESCE($7, planned_start),
    planned_end = COALESCE($8, planned_end),
    release_manager_id = COALESCE($9, release_manager_id),
    deployment_plan = COALESCE($10, deployment_plan),
    rollback_plan = COALESCE($11, rollback_plan),
    risk_assessment = COALESCE($12, risk_assessment),
    readiness_checklist = COALESCE($13, readiness_checklist),
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: TransitionReleaseStatus :exec
UPDATE releases SET status = $3, updated_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: CountReleasesByStatus :many
SELECT status, COUNT(*) AS count
FROM releases
WHERE tenant_id = $1
GROUP BY status;

-- name: GetReleaseCalendar :many
SELECT r.id, r.release_number, r.title, r.release_type, r.status,
       r.environment, r.planned_start, r.planned_end,
       mgr.display_name AS release_manager_name
FROM releases r
LEFT JOIN users mgr ON mgr.id = r.release_manager_id
WHERE r.tenant_id = $1
  AND r.planned_start IS NOT NULL
  AND r.planned_start <= $3
  AND COALESCE(r.planned_end, r.planned_start) >= $2
ORDER BY r.planned_start;

-- ──────────────────────────────────────────────
-- Release Items
-- ──────────────────────────────────────────────

-- name: CreateReleaseItem :one
INSERT INTO release_items (
    tenant_id, release_id, item_type, name, version, description, ci_id, deploy_order
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListReleaseItems :many
SELECT * FROM release_items
WHERE release_id = $1 AND tenant_id = $2
ORDER BY deploy_order, created_at;

-- name: UpdateReleaseItemStatus :exec
UPDATE release_items SET status = $3
WHERE id = $1 AND tenant_id = $2;

-- name: DeleteReleaseItem :exec
DELETE FROM release_items WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Release Deployments
-- ──────────────────────────────────────────────

-- name: CreateReleaseDeployment :one
INSERT INTO release_deployments (
    tenant_id, release_id, environment, deployment_type, deployed_by, notes
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListReleaseDeployments :many
SELECT rd.*,
       u.display_name AS deployed_by_name
FROM release_deployments rd
LEFT JOIN users u ON u.id = rd.deployed_by
WHERE rd.release_id = $1 AND rd.tenant_id = $2
ORDER BY rd.created_at DESC;

-- name: UpdateReleaseDeployment :exec
UPDATE release_deployments
SET status = COALESCE($3, status),
    started_at = COALESCE($4, started_at),
    completed_at = COALESCE($5, completed_at),
    notes = COALESCE($6, notes)
WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Release Approvals
-- ──────────────────────────────────────────────

-- name: CreateReleaseApproval :one
INSERT INTO release_approvals (
    tenant_id, release_id, approver_id, approval_type
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListReleaseApprovals :many
SELECT ra.*,
       u.display_name AS approver_name
FROM release_approvals ra
LEFT JOIN users u ON u.id = ra.approver_id
WHERE ra.release_id = $1 AND ra.tenant_id = $2
ORDER BY ra.created_at;

-- name: DecideReleaseApproval :one
UPDATE release_approvals
SET status = $3, comments = $4, decided_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

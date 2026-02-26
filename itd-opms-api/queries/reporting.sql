-- ──────────────────────────────────────────────
-- Report Definitions
-- ──────────────────────────────────────────────

-- name: CreateReportDefinition :one
INSERT INTO report_definitions (
    tenant_id, name, description, type, template,
    schedule_cron, recipients, is_active, created_by
)
VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9
)
RETURNING *;

-- name: GetReportDefinition :one
SELECT * FROM report_definitions WHERE id = $1 AND tenant_id = $2;

-- name: ListReportDefinitions :many
SELECT * FROM report_definitions
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountReportDefinitions :one
SELECT COUNT(*)::int AS count FROM report_definitions
WHERE tenant_id = $1
  AND ($2::text IS NULL OR type = $2);

-- name: UpdateReportDefinition :one
UPDATE report_definitions
SET name          = COALESCE($3, name),
    description   = COALESCE($4, description),
    type          = COALESCE($5, type),
    template      = COALESCE($6, template),
    schedule_cron = COALESCE($7, schedule_cron),
    recipients    = COALESCE($8, recipients),
    is_active     = COALESCE($9, is_active)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteReportDefinition :exec
DELETE FROM report_definitions WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Report Runs
-- ──────────────────────────────────────────────

-- name: CreateReportRun :one
INSERT INTO report_runs (
    definition_id, tenant_id, status
)
VALUES (
    $1, $2, 'pending'
)
RETURNING *;

-- name: GetReportRun :one
SELECT * FROM report_runs WHERE id = $1 AND tenant_id = $2;

-- name: ListReportRuns :many
SELECT * FROM report_runs
WHERE definition_id = $1
  AND tenant_id = $2
  AND ($3::text IS NULL OR status = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountReportRuns :one
SELECT COUNT(*)::int AS count FROM report_runs
WHERE definition_id = $1
  AND tenant_id = $2
  AND ($3::text IS NULL OR status = $3);

-- name: UpdateReportRunStatus :exec
UPDATE report_runs
SET status        = $3,
    completed_at  = $4,
    document_id   = $5,
    data_snapshot = $6,
    error_message = $7
WHERE id = $1 AND tenant_id = $2;

-- name: GetLatestReportRun :one
SELECT * FROM report_runs
WHERE definition_id = $1 AND tenant_id = $2
ORDER BY created_at DESC
LIMIT 1;

-- ──────────────────────────────────────────────
-- Dashboard Cache
-- ──────────────────────────────────────────────

-- name: UpsertDashboardCache :one
INSERT INTO dashboard_cache (tenant_id, cache_key, data, expires_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (tenant_id, cache_key)
DO UPDATE SET data       = EXCLUDED.data,
              expires_at = EXCLUDED.expires_at
RETURNING *;

-- name: GetDashboardCache :one
SELECT * FROM dashboard_cache
WHERE tenant_id = $1
  AND cache_key = $2
  AND expires_at > now();

-- name: DeleteExpiredCache :exec
DELETE FROM dashboard_cache WHERE expires_at <= now();

-- name: DeleteDashboardCache :exec
DELETE FROM dashboard_cache WHERE tenant_id = $1 AND cache_key = $2;

-- ──────────────────────────────────────────────
-- Saved Searches
-- ──────────────────────────────────────────────

-- name: CreateSavedSearch :one
INSERT INTO saved_searches (
    tenant_id, user_id, query, entity_types, is_saved
)
VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: ListRecentSearches :many
SELECT * FROM saved_searches
WHERE tenant_id = $1
  AND user_id = $2
ORDER BY last_used_at DESC
LIMIT 10;

-- name: ListSavedSearches :many
SELECT * FROM saved_searches
WHERE tenant_id = $1
  AND user_id = $2
  AND is_saved = true
ORDER BY last_used_at DESC;

-- name: UpdateSearchLastUsed :exec
UPDATE saved_searches
SET last_used_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: DeleteSavedSearch :exec
DELETE FROM saved_searches WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Executive Dashboard Queries (cross-module aggregations)
-- ──────────────────────────────────────────────

-- name: GetExecutiveSummary :one
SELECT * FROM mv_executive_summary WHERE tenant_id = $1;

-- name: RefreshExecutiveSummary :exec
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_executive_summary;

-- name: GetTicketsByPriority :many
SELECT priority AS label, COUNT(*)::int AS value
FROM tickets
WHERE tenant_id = $1
  AND status NOT IN ('resolved','closed')
GROUP BY priority;

-- name: GetTicketsByStatus :many
SELECT status AS label, COUNT(*)::int AS value
FROM tickets
WHERE tenant_id = $1
GROUP BY status;

-- name: GetProjectsByStatus :many
SELECT status AS label, COUNT(*)::int AS value
FROM projects
WHERE tenant_id = $1
GROUP BY status;

-- name: GetAssetsByType :many
SELECT asset_type AS label, COUNT(*)::int AS value
FROM assets
WHERE tenant_id = $1
GROUP BY asset_type;

-- name: GetAssetsByStatus :many
SELECT status AS label, COUNT(*)::int AS value
FROM assets
WHERE tenant_id = $1
GROUP BY status;

-- name: GetSLAComplianceRate :one
SELECT COALESCE(
    COUNT(*) FILTER (WHERE sla_breached = false) * 100.0 / NULLIF(COUNT(*), 0),
    0
)::float AS rate
FROM tickets
WHERE tenant_id = $1
  AND created_at >= $2;

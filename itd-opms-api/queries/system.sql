-- ──────────────────────────────────────────────
-- System Module: User Management Queries
-- ──────────────────────────────────────────────

-- name: SystemListUsers :many
SELECT u.id, u.entra_id, u.email, u.display_name, u.job_title,
       u.department, u.office, u.unit, u.tenant_id, t.name AS tenant_name,
       u.photo_url, u.phone, u.is_active, u.last_login_at,
       u.metadata, u.created_at, u.updated_at
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE u.tenant_id = @tenant_id
  AND (CAST(@status AS TEXT) = 'all' OR
       (CAST(@status AS TEXT) = 'active' AND u.is_active = true) OR
       (CAST(@status AS TEXT) = 'inactive' AND u.is_active = false))
  AND (CAST(@search AS TEXT) = '' OR
       u.display_name ILIKE '%' || CAST(@search AS TEXT) || '%' OR
       u.email ILIKE '%' || CAST(@search AS TEXT) || '%')
  AND (CAST(@department AS TEXT) = '' OR u.department = CAST(@department AS TEXT))
  AND (CAST(@role_filter AS TEXT) = '' OR EXISTS (
       SELECT 1 FROM role_bindings rb
       JOIN roles r ON r.id = rb.role_id
       WHERE rb.user_id = u.id AND rb.is_active = true AND r.name = CAST(@role_filter AS TEXT)))
ORDER BY
  CASE WHEN CAST(@sort_by AS TEXT) = 'name' AND CAST(@sort_order AS TEXT) = 'asc' THEN u.display_name END ASC,
  CASE WHEN CAST(@sort_by AS TEXT) = 'name' AND CAST(@sort_order AS TEXT) = 'desc' THEN u.display_name END DESC,
  CASE WHEN CAST(@sort_by AS TEXT) = 'email' AND CAST(@sort_order AS TEXT) = 'asc' THEN u.email END ASC,
  CASE WHEN CAST(@sort_by AS TEXT) = 'email' AND CAST(@sort_order AS TEXT) = 'desc' THEN u.email END DESC,
  CASE WHEN CAST(@sort_by AS TEXT) = 'lastLoginAt' AND CAST(@sort_order AS TEXT) = 'asc' THEN u.last_login_at END ASC,
  CASE WHEN CAST(@sort_by AS TEXT) = 'lastLoginAt' AND CAST(@sort_order AS TEXT) = 'desc' THEN u.last_login_at END DESC,
  CASE WHEN CAST(@sort_by AS TEXT) = 'createdAt' AND CAST(@sort_order AS TEXT) = 'asc' THEN u.created_at END ASC,
  CASE WHEN CAST(@sort_by AS TEXT) = 'createdAt' AND CAST(@sort_order AS TEXT) = 'desc' THEN u.created_at END DESC,
  u.created_at DESC
LIMIT @page_limit OFFSET @page_offset;

-- name: SystemCountUsers :one
SELECT COUNT(*) FROM users u
WHERE u.tenant_id = @tenant_id
  AND (CAST(@status AS TEXT) = 'all' OR
       (CAST(@status AS TEXT) = 'active' AND u.is_active = true) OR
       (CAST(@status AS TEXT) = 'inactive' AND u.is_active = false))
  AND (CAST(@search AS TEXT) = '' OR
       u.display_name ILIKE '%' || CAST(@search AS TEXT) || '%' OR
       u.email ILIKE '%' || CAST(@search AS TEXT) || '%')
  AND (CAST(@department AS TEXT) = '' OR u.department = CAST(@department AS TEXT))
  AND (CAST(@role_filter AS TEXT) = '' OR EXISTS (
       SELECT 1 FROM role_bindings rb
       JOIN roles r ON r.id = rb.role_id
       WHERE rb.user_id = u.id AND rb.is_active = true AND r.name = CAST(@role_filter AS TEXT)));

-- name: SystemGetUserByID :one
SELECT u.id, u.entra_id, u.email, u.display_name, u.job_title,
       u.department, u.office, u.unit, u.tenant_id, t.name AS tenant_name,
       u.photo_url, u.phone, u.is_active, u.last_login_at,
       u.metadata, u.created_at, u.updated_at
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE u.id = @user_id AND u.tenant_id = @tenant_id;

-- name: SystemUpdateUser :exec
UPDATE users SET
  display_name = COALESCE(NULLIF(@display_name, ''), display_name),
  job_title = COALESCE(NULLIF(@job_title, ''), job_title),
  department = COALESCE(NULLIF(@department, ''), department),
  office = COALESCE(NULLIF(@office, ''), office),
  unit = COALESCE(NULLIF(@unit, ''), unit),
  phone = COALESCE(NULLIF(@phone, ''), phone),
  updated_at = NOW()
WHERE id = @user_id AND tenant_id = @tenant_id;

-- name: SystemDeactivateUser :exec
UPDATE users SET is_active = false, updated_at = NOW()
WHERE id = @user_id AND tenant_id = @tenant_id;

-- name: SystemDeactivateUserRoleBindings :exec
UPDATE role_bindings SET is_active = false
WHERE user_id = @user_id AND is_active = true;

-- name: SystemReactivateUser :exec
UPDATE users SET is_active = true, updated_at = NOW()
WHERE id = @user_id AND tenant_id = @tenant_id;

-- name: SystemSearchUsers :many
SELECT id, display_name, email, photo_url, department, is_active
FROM users
WHERE tenant_id = @tenant_id AND is_active = true
  AND (display_name ILIKE '%' || @query || '%' OR email ILIKE '%' || @query || '%')
ORDER BY display_name
LIMIT 20;

-- name: SystemCountActiveUsers :one
SELECT COUNT(*) FROM users WHERE tenant_id = @tenant_id AND is_active = true;

-- ──────────────────────────────────────────────
-- System Module: Role Binding Queries
-- ──────────────────────────────────────────────

-- name: SystemGetUserRoleBindings :many
SELECT rb.id, rb.user_id, rb.role_id, r.name AS role_name,
       rb.tenant_id, rb.scope_type::text, rb.scope_id,
       rb.granted_by, rb.granted_at, rb.expires_at, rb.is_active
FROM role_bindings rb
JOIN roles r ON r.id = rb.role_id
WHERE rb.user_id = @user_id AND rb.is_active = true
  AND (rb.expires_at IS NULL OR rb.expires_at > NOW())
ORDER BY rb.granted_at DESC;

-- name: SystemAssignRoleToUser :one
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by)
VALUES (@user_id, @role_id, @tenant_id, @scope_type::scope_type, @scope_id, @granted_by)
RETURNING id, user_id, role_id, tenant_id, scope_type::text, scope_id, granted_by, granted_at, expires_at, is_active;

-- name: SystemRevokeRoleFromUser :exec
UPDATE role_bindings SET is_active = false
WHERE id = @binding_id AND user_id = @user_id AND is_active = true;

-- name: SystemCheckExistingBinding :one
SELECT COUNT(*) FROM role_bindings
WHERE user_id = @user_id AND role_id = @role_id AND tenant_id = @tenant_id
  AND scope_type = @scope_type::scope_type
  AND COALESCE(scope_id, '00000000-0000-0000-0000-000000000000') = COALESCE(@scope_id, '00000000-0000-0000-0000-000000000000')
  AND is_active = true;

-- ──────────────────────────────────────────────
-- System Module: Delegation Queries
-- ──────────────────────────────────────────────

-- name: SystemGetUserDelegations :many
SELECT d.id, d.delegator_id, delegator.display_name AS delegator_name,
       d.delegate_id, delegate.display_name AS delegate_name,
       d.role_id, r.name AS role_name, d.tenant_id,
       d.reason, d.approved_by, d.starts_at, d.ends_at,
       d.is_active, d.created_at
FROM delegations d
JOIN users delegator ON delegator.id = d.delegator_id
JOIN users delegate ON delegate.id = d.delegate_id
JOIN roles r ON r.id = d.role_id
WHERE (d.delegator_id = @user_id OR d.delegate_id = @user_id)
  AND d.tenant_id = @tenant_id
  AND d.is_active = true
ORDER BY d.created_at DESC;

-- name: SystemCreateDelegation :one
INSERT INTO delegations (delegator_id, delegate_id, role_id, tenant_id, reason, starts_at, ends_at)
VALUES (@delegator_id, @delegate_id, @role_id, @tenant_id, @reason, @starts_at, @ends_at)
RETURNING id, delegator_id, delegate_id, role_id, tenant_id, reason, approved_by, starts_at, ends_at, is_active, created_at;

-- name: SystemRevokeDelegation :exec
UPDATE delegations SET is_active = false
WHERE id = @delegation_id AND tenant_id = @tenant_id AND is_active = true;

-- name: SystemGetDelegationByID :one
SELECT d.id, d.delegator_id, d.delegate_id, d.role_id, d.tenant_id,
       d.reason, d.approved_by, d.starts_at, d.ends_at, d.is_active, d.created_at
FROM delegations d
WHERE d.id = @delegation_id AND d.tenant_id = @tenant_id;

-- ──────────────────────────────────────────────
-- System Module: Role Management Queries
-- ──────────────────────────────────────────────

-- name: SystemListRoles :many
SELECT r.id, r.name, r.description, r.permissions, r.is_system, r.created_at,
       (SELECT COUNT(*) FROM role_bindings rb WHERE rb.role_id = r.id AND rb.is_active = true) AS user_count
FROM roles r
ORDER BY r.is_system DESC, r.name ASC;

-- name: SystemGetRoleByID :one
SELECT r.id, r.name, r.description, r.permissions, r.is_system, r.created_at,
       (SELECT COUNT(*) FROM role_bindings rb WHERE rb.role_id = r.id AND rb.is_active = true) AS user_count
FROM roles r
WHERE r.id = @role_id;

-- name: SystemCreateRole :one
INSERT INTO roles (name, description, permissions, is_system)
VALUES (@name, @description, @permissions, false)
RETURNING id, name, description, permissions, is_system, created_at;

-- name: SystemUpdateRole :exec
UPDATE roles SET
  description = COALESCE(NULLIF(@description, ''), description),
  permissions = CASE WHEN @update_permissions::boolean THEN @permissions ELSE permissions END
WHERE id = @role_id AND is_system = false;

-- name: SystemDeleteRole :exec
DELETE FROM roles WHERE id = @role_id AND is_system = false;

-- name: SystemGetRoleByName :one
SELECT id, name FROM roles WHERE name = @name;

-- name: SystemCountRoleBindings :one
SELECT COUNT(*) FROM role_bindings WHERE role_id = @role_id AND is_active = true;

-- name: SystemCountUsersByRole :many
SELECT r.id, r.name, COUNT(rb.id) AS user_count
FROM roles r
LEFT JOIN role_bindings rb ON rb.role_id = r.id AND rb.is_active = true
GROUP BY r.id, r.name
ORDER BY user_count DESC;

-- ──────────────────────────────────────────────
-- System Module: Tenant Management Queries
-- ──────────────────────────────────────────────

-- name: SystemListTenants :many
SELECT t.id, t.name, t.code, t.type::text, t.parent_id,
       COALESCE(p.name, '') AS parent_name,
       t.is_active, t.config, t.created_at, t.updated_at,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
FROM tenants t
LEFT JOIN tenants p ON p.id = t.parent_id
ORDER BY t.name ASC;

-- name: SystemGetTenantByID :one
SELECT t.id, t.name, t.code, t.type::text, t.parent_id,
       COALESCE(p.name, '') AS parent_name,
       t.is_active, t.config, t.created_at, t.updated_at,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
FROM tenants t
LEFT JOIN tenants p ON p.id = t.parent_id
WHERE t.id = @tenant_id;

-- name: SystemGetTenantChildren :many
SELECT t.id, t.name, t.code, t.type::text, t.is_active,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
FROM tenants t
WHERE t.parent_id = @parent_id
ORDER BY t.name ASC;

-- name: SystemCreateTenant :one
INSERT INTO tenants (name, code, type, parent_id, config)
VALUES (@name, @code, @type::tenant_type, @parent_id, @config)
RETURNING id, name, code, type::text, parent_id, is_active, config, created_at, updated_at;

-- name: SystemUpdateTenant :exec
UPDATE tenants SET
  name = COALESCE(NULLIF(@name, ''), name),
  config = CASE WHEN @update_config::boolean THEN @config ELSE config END,
  is_active = CASE WHEN @update_active::boolean THEN @is_active ELSE is_active END
WHERE id = @tenant_id;

-- name: SystemDeactivateTenant :exec
UPDATE tenants SET is_active = false WHERE id = @tenant_id;

-- name: SystemDeactivateChildTenants :exec
UPDATE tenants SET is_active = false WHERE parent_id = @parent_id;

-- name: SystemGetTenantByCode :one
SELECT id FROM tenants WHERE code = @code;

-- name: SystemGetTenantHierarchy :many
SELECT t.id, t.name, t.code, t.type::text, t.parent_id, t.is_active,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
FROM tenants t
ORDER BY t.parent_id NULLS FIRST, t.name ASC;

-- ──────────────────────────────────────────────
-- System Module: Org Unit Management Queries
-- ──────────────────────────────────────────────

-- name: SystemListOrgUnits :many
SELECT o.id, o.tenant_id, o.name, o.code, o.level::text,
       o.parent_id, COALESCE(p.name, '') AS parent_name,
       o.manager_user_id, COALESCE(m.display_name, '') AS manager_name,
       o.is_active, o.metadata, o.created_at, o.updated_at,
       (SELECT COUNT(*) FROM org_units c WHERE c.parent_id = o.id) AS child_count,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = o.tenant_id AND u.department = o.name AND u.is_active = true) AS user_count
FROM org_units o
LEFT JOIN org_units p ON p.id = o.parent_id
LEFT JOIN users m ON m.id = o.manager_user_id
WHERE o.tenant_id = @tenant_id
ORDER BY o.level, o.name ASC
LIMIT @page_limit OFFSET @page_offset;

-- name: SystemCountOrgUnits :one
SELECT COUNT(*) FROM org_units WHERE tenant_id = @tenant_id;

-- name: SystemGetOrgUnitByID :one
SELECT o.id, o.tenant_id, o.name, o.code, o.level::text,
       o.parent_id, COALESCE(p.name, '') AS parent_name,
       o.manager_user_id, COALESCE(m.display_name, '') AS manager_name,
       o.is_active, o.metadata, o.created_at, o.updated_at,
       (SELECT COUNT(*) FROM org_units c WHERE c.parent_id = o.id) AS child_count,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = o.tenant_id AND u.department = o.name AND u.is_active = true) AS user_count
FROM org_units o
LEFT JOIN org_units p ON p.id = o.parent_id
LEFT JOIN users m ON m.id = o.manager_user_id
WHERE o.id = @org_unit_id AND o.tenant_id = @tenant_id;

-- name: SystemGetOrgTree :many
SELECT o.id, o.name, o.code, o.level::text, o.parent_id,
       COALESCE(m.display_name, '') AS manager_name,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = o.tenant_id AND u.department = o.name AND u.is_active = true) AS user_count
FROM org_units o
LEFT JOIN users m ON m.id = o.manager_user_id
WHERE o.tenant_id = @tenant_id AND o.is_active = true
ORDER BY o.level, o.name ASC;

-- name: SystemCreateOrgUnit :one
INSERT INTO org_units (tenant_id, name, code, level, parent_id, manager_user_id, metadata)
VALUES (@tenant_id, @name, @code, @level::org_level_type, @parent_id, @manager_user_id, COALESCE(@metadata, '{}'))
RETURNING id, tenant_id, name, code, level::text, parent_id, manager_user_id, is_active, metadata, created_at, updated_at;

-- name: SystemUpdateOrgUnit :exec
UPDATE org_units SET
  name = COALESCE(NULLIF(@name, ''), name),
  manager_user_id = CASE WHEN @update_manager::boolean THEN @manager_user_id ELSE manager_user_id END,
  is_active = CASE WHEN @update_active::boolean THEN @is_active ELSE is_active END
WHERE id = @org_unit_id AND tenant_id = @tenant_id;

-- name: SystemGetOrgUnitChildCount :one
SELECT COUNT(*) FROM org_units WHERE parent_id = @org_unit_id;

-- name: SystemGetOrgUnitUserCount :one
SELECT COUNT(*) FROM users WHERE tenant_id = @tenant_id AND department = @org_unit_name AND is_active = true;

-- name: SystemDeleteOrgUnit :exec
UPDATE org_units SET is_active = false WHERE id = @org_unit_id AND tenant_id = @tenant_id;

-- name: SystemMoveOrgUnit :exec
UPDATE org_units SET parent_id = @new_parent_id WHERE id = @org_unit_id AND tenant_id = @tenant_id;

-- name: SystemDeleteOrgHierarchyDescendants :exec
DELETE FROM org_hierarchy WHERE descendant_id = @org_unit_id AND ancestor_id != @org_unit_id;

-- name: SystemInsertOrgHierarchyFromParent :exec
INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
SELECT h.ancestor_id, @org_unit_id, h.depth + 1
FROM org_hierarchy h
WHERE h.descendant_id = @new_parent_id;

-- name: SystemGetOrgUnitByCode :one
SELECT id FROM org_units WHERE tenant_id = @tenant_id AND code = @code;

-- name: SystemGetOrgUnitUsers :many
SELECT u.id, u.display_name, u.email, u.photo_url, u.department, u.is_active
FROM users u
WHERE u.tenant_id = @tenant_id
  AND u.department = @org_unit_name
  AND u.is_active = true
ORDER BY u.display_name ASC;

-- ──────────────────────────────────────────────
-- System Module: Platform Statistics Queries
-- ──────────────────────────────────────────────

-- name: SystemGetUserStats :one
SELECT
  (SELECT COUNT(*) FROM users WHERE tenant_id = @tenant_id) AS total_users,
  (SELECT COUNT(*) FROM users WHERE tenant_id = @tenant_id AND is_active = true) AS active_users,
  (SELECT COUNT(*) FROM users WHERE tenant_id = @tenant_id AND is_active = false) AS inactive_users,
  (SELECT COUNT(*) FROM users WHERE tenant_id = @tenant_id AND created_at >= date_trunc('month', CURRENT_DATE)) AS new_this_month;

-- name: SystemGetOnlineUserCount :one
SELECT COUNT(DISTINCT user_id) AS online_count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '15 minutes';

-- name: SystemGetDatabaseSize :one
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;

-- name: SystemGetTableCount :one
SELECT COUNT(*)::int AS table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- name: SystemGetConnectionStats :one
SELECT
  (SELECT COUNT(*)::int FROM pg_stat_activity WHERE state = 'active') AS active_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections;

-- name: SystemGetAuditStats :one
SELECT
  (SELECT COUNT(*) FROM audit_log) AS total_events,
  (SELECT COUNT(*)::int FROM audit_log WHERE created_at >= CURRENT_DATE) AS events_today,
  (SELECT COUNT(*)::int FROM audit_log WHERE created_at >= date_trunc('week', CURRENT_DATE)) AS events_this_week;

-- name: SystemGetModuleRecordCounts :many
SELECT module_name, record_count, active_items, last_activity FROM (
  SELECT 'tickets'::text AS module_name, COUNT(*) AS record_count,
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled'))::int AS active_items,
         MAX(updated_at) AS last_activity FROM tickets WHERE tenant_id = @tenant_id
  UNION ALL
  SELECT 'assets', COUNT(*), COUNT(*) FILTER (WHERE status = 'active')::int, MAX(updated_at) FROM assets WHERE tenant_id = @tenant_id
  UNION ALL
  SELECT 'projects', COUNT(*), COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled'))::int, MAX(updated_at) FROM projects WHERE tenant_id = @tenant_id
  UNION ALL
  SELECT 'policies', COUNT(*), COUNT(*) FILTER (WHERE status = 'active')::int, MAX(updated_at) FROM policies WHERE tenant_id = @tenant_id
  UNION ALL
  SELECT 'risks', COUNT(*), COUNT(*) FILTER (WHERE status = 'open')::int, MAX(updated_at) FROM risks WHERE tenant_id = @tenant_id
  UNION ALL
  SELECT 'articles', COUNT(*), COUNT(*) FILTER (WHERE status = 'published')::int, MAX(updated_at) FROM kb_articles WHERE tenant_id = @tenant_id
) AS module_stats
ORDER BY module_name;

-- ──────────────────────────────────────────────
-- System Module: Directory Sync Queries
-- ──────────────────────────────────────────────

-- name: SystemListDirectorySyncRuns :many
SELECT id, started_at, completed_at, users_created, users_updated, users_deactivated,
       COALESCE(jsonb_array_length(errors), 0)::int AS error_count,
       errors::text AS error_details, status
FROM directory_sync_runs
ORDER BY started_at DESC
LIMIT @page_limit OFFSET @page_offset;

-- name: SystemCountDirectorySyncRuns :one
SELECT COUNT(*) FROM directory_sync_runs;

-- name: SystemGetLatestSyncRun :one
SELECT id, started_at, completed_at, users_created, users_updated, users_deactivated,
       COALESCE(jsonb_array_length(errors), 0)::int AS error_count,
       errors::text AS error_details, status
FROM directory_sync_runs
ORDER BY started_at DESC
LIMIT 1;

-- name: SystemCleanExpiredAuditSessions :exec
DELETE FROM audit_log
WHERE action = 'session.expired' AND created_at < NOW() - INTERVAL '90 days';

-- ──────────────────────────────────────────────
-- System Module: Settings Management Queries
-- ──────────────────────────────────────────────

-- name: SystemListSettings :many
-- Returns settings for a category, resolving tenant overrides (tenant-specific > global).
SELECT s.id, s.tenant_id, s.category, s.key, s.value,
       s.description, s.is_secret, s.updated_by, s.updated_at, s.created_at
FROM system_settings s
WHERE s.category = @category
  AND (s.tenant_id IS NULL OR s.tenant_id = @tenant_id)
ORDER BY s.key ASC;

-- name: SystemGetSetting :one
SELECT s.id, s.tenant_id, s.category, s.key, s.value,
       s.description, s.is_secret, s.updated_by, s.updated_at, s.created_at
FROM system_settings s
WHERE s.category = @category AND s.key = @key
  AND (s.tenant_id = @tenant_id OR (s.tenant_id IS NULL AND NOT EXISTS (
       SELECT 1 FROM system_settings s2
       WHERE s2.category = @category AND s2.key = @key AND s2.tenant_id = @tenant_id)))
ORDER BY s.tenant_id NULLS LAST
LIMIT 1;

-- name: SystemUpsertSetting :one
INSERT INTO system_settings (tenant_id, category, key, value, updated_by, updated_at)
VALUES (@tenant_id, @category, @key, @value, @updated_by, NOW())
ON CONFLICT (tenant_id, category, key) DO UPDATE SET
  value = @value, updated_by = @updated_by, updated_at = NOW()
RETURNING id, tenant_id, category, key, value, description, is_secret, updated_by, updated_at, created_at;

-- name: SystemDeleteTenantSetting :exec
DELETE FROM system_settings
WHERE category = @category AND key = @key AND tenant_id = @tenant_id;

-- name: SystemListSettingCategories :many
SELECT DISTINCT category FROM system_settings ORDER BY category;

-- ──────────────────────────────────────────────
-- System Module: Audit Explorer Queries
-- ──────────────────────────────────────────────

-- name: SystemGetAuditEventDetail :one
SELECT ae.id, ae.tenant_id, ae.actor_id,
       COALESCE(u.display_name, '') AS actor_name,
       ae.actor_role, ae.action, ae.entity_type, ae.entity_id,
       ae.changes, ae.previous_state,
       COALESCE(ae.ip_address::text, '') AS ip_address,
       COALESCE(ae.user_agent, '') AS user_agent,
       COALESCE(ae.correlation_id::text, '') AS correlation_id,
       ae.checksum, ae.created_at
FROM audit_events ae
LEFT JOIN users u ON u.id = ae.actor_id
WHERE ae.id = @event_id;

-- name: SystemGetAuditEntityTimeline :many
SELECT ae.id, ae.tenant_id, ae.actor_id,
       COALESCE(u.display_name, '') AS actor_name,
       ae.actor_role, ae.action, ae.entity_type, ae.entity_id,
       ae.changes, ae.previous_state,
       COALESCE(ae.ip_address::text, '') AS ip_address,
       COALESCE(ae.user_agent, '') AS user_agent,
       COALESCE(ae.correlation_id::text, '') AS correlation_id,
       ae.checksum, ae.created_at
FROM audit_events ae
LEFT JOIN users u ON u.id = ae.actor_id
WHERE ae.entity_type = @entity_type AND ae.entity_id = @entity_id
ORDER BY ae.created_at DESC;

-- name: SystemGetAuditEventsPerDay :many
SELECT DATE(ae.created_at)::text AS day, COUNT(*)::int AS event_count
FROM audit_events ae
WHERE ae.tenant_id = @tenant_id
  AND ae.created_at >= @date_from
  AND ae.created_at <= @date_to
GROUP BY DATE(ae.created_at)
ORDER BY day ASC;

-- name: SystemGetAuditTopActors :many
SELECT ae.actor_id, COALESCE(u.display_name, '') AS actor_name, COUNT(*)::int AS event_count
FROM audit_events ae
LEFT JOIN users u ON u.id = ae.actor_id
WHERE ae.tenant_id = @tenant_id
  AND ae.created_at >= @date_from
  AND ae.created_at <= @date_to
GROUP BY ae.actor_id, u.display_name
ORDER BY event_count DESC
LIMIT 10;

-- name: SystemGetAuditTopEntityTypes :many
SELECT ae.entity_type, COUNT(*)::int AS event_count
FROM audit_events ae
WHERE ae.tenant_id = @tenant_id
  AND ae.created_at >= @date_from
  AND ae.created_at <= @date_to
GROUP BY ae.entity_type
ORDER BY event_count DESC
LIMIT 10;

-- name: SystemGetAuditTopActions :many
SELECT ae.action, COUNT(*)::int AS event_count
FROM audit_events ae
WHERE ae.tenant_id = @tenant_id
  AND ae.created_at >= @date_from
  AND ae.created_at <= @date_to
GROUP BY ae.action
ORDER BY event_count DESC
LIMIT 10;

-- name: SystemCountAllAuditEvents :one
SELECT COUNT(*) FROM audit_events WHERE tenant_id = @tenant_id;

-- ──────────────────────────────────────────────
-- System Module: Session Management Queries
-- ──────────────────────────────────────────────

-- name: SystemListActiveSessions :many
SELECT s.id, s.user_id, COALESCE(u.display_name, '') AS user_name,
       COALESCE(u.email, '') AS user_email,
       s.tenant_id, COALESCE(s.ip_address::text, '') AS ip_address,
       COALESCE(s.user_agent, '') AS user_agent,
       COALESCE(s.device_info, '{}') AS device_info,
       COALESCE(s.location, '') AS location,
       s.created_at, s.last_active, s.expires_at, s.is_revoked
FROM active_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.tenant_id = @tenant_id
  AND NOT s.is_revoked AND s.expires_at > NOW()
ORDER BY s.last_active DESC
LIMIT @page_limit OFFSET @page_offset;

-- name: SystemCountActiveSessionRecords :one
SELECT COUNT(*) FROM active_sessions
WHERE tenant_id = @tenant_id AND NOT is_revoked AND expires_at > NOW();

-- name: SystemListUserSessions :many
SELECT s.id, s.user_id, COALESCE(u.display_name, '') AS user_name,
       COALESCE(u.email, '') AS user_email,
       s.tenant_id, COALESCE(s.ip_address::text, '') AS ip_address,
       COALESCE(s.user_agent, '') AS user_agent,
       COALESCE(s.device_info, '{}') AS device_info,
       COALESCE(s.location, '') AS location,
       s.created_at, s.last_active, s.expires_at, s.is_revoked
FROM active_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.user_id = @user_id AND s.tenant_id = @tenant_id
  AND NOT s.is_revoked AND s.expires_at > NOW()
ORDER BY s.last_active DESC;

-- name: SystemGetSessionByID :one
SELECT s.id, s.user_id, COALESCE(u.display_name, '') AS user_name,
       COALESCE(u.email, '') AS user_email,
       s.tenant_id, COALESCE(s.ip_address::text, '') AS ip_address,
       COALESCE(s.user_agent, '') AS user_agent,
       COALESCE(s.device_info, '{}') AS device_info,
       COALESCE(s.location, '') AS location,
       s.created_at, s.last_active, s.expires_at, s.is_revoked
FROM active_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.id = @session_id;

-- name: SystemCreateSession :one
INSERT INTO active_sessions (user_id, tenant_id, token_hash, ip_address, user_agent, device_info, location, expires_at)
VALUES (@user_id, @tenant_id, @token_hash, @ip_address::inet, @user_agent, COALESCE(@device_info, '{}'), @location, @expires_at)
RETURNING id, user_id, tenant_id, created_at, last_active, expires_at;

-- name: SystemUpdateSessionActivity :exec
UPDATE active_sessions SET last_active = NOW()
WHERE id = @session_id AND NOT is_revoked;

-- name: SystemRevokeSession :exec
UPDATE active_sessions SET is_revoked = true, revoked_at = NOW(), revoked_by = @revoked_by
WHERE id = @session_id AND NOT is_revoked;

-- name: SystemRevokeAllUserSessions :exec
UPDATE active_sessions SET is_revoked = true, revoked_at = NOW(), revoked_by = @revoked_by
WHERE user_id = @user_id AND NOT is_revoked;

-- name: SystemCleanExpiredSessionRecords :exec
DELETE FROM active_sessions WHERE expires_at < NOW() - INTERVAL '30 days';

-- name: SystemGetSessionMgmtStats :one
SELECT
  (SELECT COUNT(*) FROM active_sessions WHERE tenant_id = @tenant_id AND NOT is_revoked AND expires_at > NOW()) AS active_sessions,
  (SELECT COUNT(DISTINCT user_id) FROM active_sessions WHERE tenant_id = @tenant_id AND NOT is_revoked AND expires_at > NOW()) AS unique_users;

-- ──────────────────────────────────────────────
-- System Module: Email Template Queries
-- ──────────────────────────────────────────────

-- name: SystemListEmailTemplates :many
SELECT id, tenant_id, name, subject, body_html, body_text,
       variables, category, is_active, updated_by, created_at, updated_at
FROM email_templates
WHERE (tenant_id IS NULL OR tenant_id = @tenant_id)
  AND (CAST(@category_filter AS TEXT) = '' OR category = CAST(@category_filter AS TEXT))
ORDER BY category, name ASC
LIMIT @page_limit OFFSET @page_offset;

-- name: SystemCountEmailTemplates :one
SELECT COUNT(*) FROM email_templates
WHERE (tenant_id IS NULL OR tenant_id = @tenant_id)
  AND (CAST(@category_filter AS TEXT) = '' OR category = CAST(@category_filter AS TEXT));

-- name: SystemGetEmailTemplateByID :one
SELECT id, tenant_id, name, subject, body_html, body_text,
       variables, category, is_active, updated_by, created_at, updated_at
FROM email_templates
WHERE id = @template_id;

-- name: SystemGetEmailTemplateByName :one
SELECT id, tenant_id, name, subject, body_html, body_text,
       variables, category, is_active, updated_by, created_at, updated_at
FROM email_templates
WHERE name = @name AND (tenant_id = @tenant_id OR (tenant_id IS NULL AND NOT EXISTS (
      SELECT 1 FROM email_templates e2 WHERE e2.name = @name AND e2.tenant_id = @tenant_id)))
ORDER BY tenant_id NULLS LAST
LIMIT 1;

-- name: SystemCreateEmailTemplate :one
INSERT INTO email_templates (tenant_id, name, subject, body_html, body_text, variables, category, updated_by)
VALUES (@tenant_id, @name, @subject, @body_html, @body_text, COALESCE(@variables, '[]'), @category, @updated_by)
RETURNING id, tenant_id, name, subject, body_html, body_text, variables, category, is_active, updated_by, created_at, updated_at;

-- name: SystemUpdateEmailTemplate :exec
UPDATE email_templates SET
  subject = COALESCE(NULLIF(@subject, ''), subject),
  body_html = COALESCE(NULLIF(@body_html, ''), body_html),
  body_text = CASE WHEN @update_body_text::boolean THEN @body_text ELSE body_text END,
  variables = CASE WHEN @update_variables::boolean THEN @variables ELSE variables END,
  is_active = CASE WHEN @update_active::boolean THEN @is_active ELSE is_active END,
  updated_by = @updated_by,
  updated_at = NOW()
WHERE id = @template_id;

-- name: SystemDeleteEmailTemplate :exec
DELETE FROM email_templates WHERE id = @template_id;

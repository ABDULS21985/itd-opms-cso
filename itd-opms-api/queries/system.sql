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

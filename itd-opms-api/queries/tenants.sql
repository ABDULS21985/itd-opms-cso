-- name: GetTenantByID :one
SELECT * FROM tenants WHERE id = $1 AND is_active = true;

-- name: GetTenantByCode :one
SELECT * FROM tenants WHERE code = $1 AND is_active = true;

-- name: ListTenants :many
SELECT * FROM tenants WHERE is_active = true ORDER BY name;

-- name: GetOrgUnit :one
SELECT * FROM org_units WHERE id = $1 AND is_active = true;

-- name: ListOrgUnitsByTenant :many
SELECT * FROM org_units WHERE tenant_id = $1 AND is_active = true ORDER BY level, name;

-- name: GetOrgUnitDescendants :many
SELECT ou.* FROM org_units ou
JOIN org_hierarchy oh ON oh.descendant_id = ou.id
WHERE oh.ancestor_id = $1 AND ou.is_active = true
ORDER BY oh.depth, ou.name;

-- name: GetOrgUnitAncestors :many
SELECT ou.* FROM org_units ou
JOIN org_hierarchy oh ON oh.ancestor_id = ou.id
WHERE oh.descendant_id = $1 AND ou.is_active = true
ORDER BY oh.depth DESC;

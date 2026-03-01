-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 AND is_active = true;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 AND is_active = true;

-- name: GetUserByEntraID :one
SELECT * FROM users WHERE entra_id = $1 AND is_active = true;

-- name: ListUsersByTenant :many
SELECT * FROM users
WHERE tenant_id = $1 AND is_active = true
ORDER BY display_name
LIMIT $2 OFFSET $3;

-- name: CountUsersByTenant :one
SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true;

-- name: CreateUser :one
INSERT INTO users (email, display_name, entra_id, job_title, department, office, unit, tenant_id, password_hash)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateUserLastLogin :exec
UPDATE users SET last_login_at = NOW() WHERE id = $1;

-- name: GetUserRoles :many
SELECT r.name, r.permissions, rb.scope_type, rb.scope_id
FROM role_bindings rb
JOIN roles r ON r.id = rb.role_id
WHERE rb.user_id = $1 AND rb.is_active = true
  AND (rb.expires_at IS NULL OR rb.expires_at > NOW());

-- name: GetActiveDelegations :many
SELECT d.*, r.name as role_name, r.permissions as role_permissions
FROM delegations d
JOIN roles r ON r.id = d.role_id
WHERE d.delegate_id = $1 AND d.is_active = true
  AND d.starts_at <= NOW() AND d.ends_at > NOW();

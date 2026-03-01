-- +goose Up
-- Migration 017: Add system module permissions to role seeds.
-- Adds system.* permission namespace to global_admin, itd_director, and auditor roles.
-- global_admin already has "*" wildcard, but explicit system permissions are added for
-- completeness and to support future per-permission auditing.

-- global_admin — add explicit system permissions (wildcard already covers, but for clarity)
UPDATE roles
SET permissions = permissions || '["system.view", "system.manage", "system.users.view", "system.users.manage", "system.roles.view", "system.roles.manage", "system.tenants.manage", "system.settings.manage", "system.sessions.manage", "system.audit.view", "system.audit.export", "system.audit.verify"]'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000001';

-- itd_director — read-only system access + audit viewing
UPDATE roles
SET permissions = permissions || '["system.view", "system.audit.view", "system.audit.export"]'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000002';

-- auditor — system view + full audit access
UPDATE roles
SET permissions = permissions || '["system.view", "system.audit.view", "system.audit.export", "system.audit.verify"]'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000006';

-- +goose Down
-- Remove system.* permissions from roles (revert to pre-017 state)

UPDATE roles
SET permissions = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(permissions) AS elem
    WHERE elem::text NOT LIKE '"system.%"'
)
WHERE id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000006'
);

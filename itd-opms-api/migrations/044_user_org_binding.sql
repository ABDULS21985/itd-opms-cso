-- +goose Up
-- Migration 044: User-Org Binding, Scope Enum Extension, and Scope Resolution Function
--
-- This migration establishes the foundation for hierarchical scope-based access control
-- tied to the CBN organogram. It:
-- 1. Extends the scope_type enum with missing hierarchy levels
-- 2. Adds org_unit_id FK to users table and backfills from TEXT fields
-- 3. Auto-assigns scope_type/scope_id on existing role_bindings
-- 4. Creates the fn_resolve_visible_org_units() function for scope resolution

-- ──────────────────────────────────────────────
-- 1. Extend scope_type enum with missing levels
-- ──────────────────────────────────────────────
ALTER TYPE scope_type ADD VALUE IF NOT EXISTS 'directorate';
ALTER TYPE scope_type ADD VALUE IF NOT EXISTS 'department';
ALTER TYPE scope_type ADD VALUE IF NOT EXISTS 'section';
ALTER TYPE scope_type ADD VALUE IF NOT EXISTS 'team';

-- ──────────────────────────────────────────────
-- 2. Add org_unit_id to users table
-- ──────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_users_org_unit ON users(org_unit_id) WHERE org_unit_id IS NOT NULL;

-- Backfill: match users to org_units by office name first (most specific)
UPDATE users u
SET org_unit_id = o.id
FROM org_units o
WHERE u.org_unit_id IS NULL
  AND u.tenant_id = o.tenant_id
  AND o.is_active = true
  AND u.office IS NOT NULL
  AND u.office != ''
  AND u.office = o.name;

-- Backfill: match by department code
UPDATE users u
SET org_unit_id = o.id
FROM org_units o
WHERE u.org_unit_id IS NULL
  AND u.tenant_id = o.tenant_id
  AND o.is_active = true
  AND u.department IS NOT NULL
  AND u.department != ''
  AND u.department = o.code;

-- Backfill: match by department name
UPDATE users u
SET org_unit_id = o.id
FROM org_units o
WHERE u.org_unit_id IS NULL
  AND u.tenant_id = o.tenant_id
  AND o.is_active = true
  AND u.department IS NOT NULL
  AND u.department != ''
  AND u.department = o.name;

-- ──────────────────────────────────────────────
-- 3. Auto-assign scope_type/scope_id on existing role_bindings
-- ──────────────────────────────────────────────

-- Global bypass roles → scope_type = 'global'
UPDATE role_bindings rb
SET scope_type = 'global'
FROM roles r
WHERE rb.role_id = r.id
  AND r.name IN ('global_admin', 'auditor', 'itd_director')
  AND rb.scope_type = 'tenant'
  AND rb.is_active = true;

-- Scoped roles → scope_type = user's org_unit level, scope_id = user's org_unit
-- Only update bindings where the user has an org_unit_id assigned
UPDATE role_bindings rb
SET scope_id = u.org_unit_id
FROM roles r, users u, org_units o
WHERE rb.role_id = r.id
  AND rb.user_id = u.id
  AND u.org_unit_id = o.id
  AND r.name IN ('head_of_division', 'supervisor', 'staff', 'service_desk_agent')
  AND rb.scope_type = 'tenant'
  AND rb.is_active = true
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- 4. Scope resolution function
-- ──────────────────────────────────────────────

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_resolve_visible_org_units(
    p_user_id UUID,
    p_tenant_id UUID
) RETURNS TABLE(org_unit_id UUID) AS $$
BEGIN
    -- Global bypass: users with global_admin, auditor, or itd_director roles,
    -- or any role binding with scope_type = 'global', see all org units.
    IF EXISTS (
        SELECT 1 FROM role_bindings rb
        JOIN roles r ON r.id = rb.role_id
        WHERE rb.user_id = p_user_id
          AND rb.is_active = true
          AND (rb.expires_at IS NULL OR rb.expires_at > NOW())
          AND (r.name IN ('global_admin', 'auditor', 'itd_director')
               OR rb.scope_type = 'global')
    ) THEN
        RETURN QUERY
        SELECT o.id FROM org_units o
        WHERE o.tenant_id = p_tenant_id AND o.is_active = true;
        RETURN;
    END IF;

    -- Scoped roles: for each role binding, use the closure table to resolve
    -- all descendants of the scope anchor (scope_id or user's org_unit).
    RETURN QUERY
    SELECT DISTINCT sub.oid FROM (
        -- From direct role bindings: resolve descendants of scope anchor
        SELECT h.descendant_id AS oid
        FROM role_bindings rb
        JOIN org_hierarchy h ON h.ancestor_id = COALESCE(
            rb.scope_id,
            (SELECT u.org_unit_id FROM users u WHERE u.id = p_user_id)
        )
        WHERE rb.user_id = p_user_id
          AND rb.is_active = true
          AND (rb.expires_at IS NULL OR rb.expires_at > NOW())
          AND COALESCE(
              rb.scope_id,
              (SELECT u.org_unit_id FROM users u WHERE u.id = p_user_id)
          ) IS NOT NULL

        UNION

        -- Always include the user's own org unit (self-scope)
        SELECT u.org_unit_id AS oid
        FROM users u
        WHERE u.id = p_user_id
          AND u.org_unit_id IS NOT NULL

        UNION

        -- Active delegations: inherit the delegator's org scope
        SELECT h.descendant_id AS oid
        FROM delegations d
        JOIN users delegator ON delegator.id = d.delegator_id
        JOIN org_hierarchy h ON h.ancestor_id = delegator.org_unit_id
        WHERE d.delegate_id = p_user_id
          AND d.is_active = true
          AND d.starts_at <= NOW()
          AND d.ends_at > NOW()
          AND delegator.org_unit_id IS NOT NULL
    ) sub;
END;
$$ LANGUAGE plpgsql STABLE;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS fn_resolve_visible_org_units(UUID, UUID);
DROP INDEX IF EXISTS idx_users_org_unit;
ALTER TABLE users DROP COLUMN IF EXISTS org_unit_id;
-- Note: PostgreSQL does not support removing enum values.
-- The added scope_type values (directorate, department, section, team) will remain.

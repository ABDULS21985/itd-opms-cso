-- +goose Up
-- Migration 071: Add missing .manage permissions to itd_director role.
-- The ITD Director is the top of the hierarchy and should have manage
-- access across all operational modules (ITSM, CMDB, knowledge, vendor, SSA).

UPDATE roles
SET permissions = permissions || '["itsm.manage", "cmdb.manage", "knowledge.manage", "vendor.manage", "ssa.manage", "approval.manage"]'::jsonb
WHERE name = 'itd_director'
  AND NOT permissions @> '"itsm.manage"';

-- +goose Down
UPDATE roles
SET permissions = (
    SELECT jsonb_agg(p)
    FROM jsonb_array_elements(permissions) p
    WHERE p::text NOT IN ('"itsm.manage"', '"cmdb.manage"', '"knowledge.manage"', '"vendor.manage"', '"ssa.manage"', '"approval.manage"')
)
WHERE name = 'itd_director';

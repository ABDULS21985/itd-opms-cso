-- +goose Up
-- Migration 067: Seed ITD leadership chain from CBN organogram
-- Governor → Deputy Governor → Director ITD → Deputy Director → Heads of Division
-- Also cleans up stale org_units (IT-DEP, OPS-DIR, ITD-ASD)

-- ══════════════════════════════════════════════════════════════
-- 1. Clean up stale org_units from earlier seeds
-- ══════════════════════════════════════════════════════════════

-- Remove stale hierarchy entries first
DELETE FROM org_hierarchy WHERE ancestor_id IN (
  SELECT id FROM org_units WHERE code IN ('IT-DEP', 'OPS-DIR', 'ITD - ASD')
    AND tenant_id = '00000000-0000-0000-0000-000000000001'
) OR descendant_id IN (
  SELECT id FROM org_units WHERE code IN ('IT-DEP', 'OPS-DIR', 'ITD - ASD')
    AND tenant_id = '00000000-0000-0000-0000-000000000001'
);

-- Detach any children of IT-DEP before deleting
UPDATE org_units SET parent_id = NULL
WHERE parent_id IN (
  SELECT id FROM org_units WHERE code IN ('IT-DEP', 'OPS-DIR')
    AND tenant_id = '00000000-0000-0000-0000-000000000001'
);

-- Reassign users on stale org_units to the correct new ones
-- ITD-ASD users → ASD (Architecture & Strategy)
UPDATE users SET org_unit_id = 'd0d0d0d0-0000-4000-a000-000000000003'
WHERE org_unit_id IN (
  SELECT id FROM org_units WHERE code = 'ITD - ASD'
    AND tenant_id = '00000000-0000-0000-0000-000000000001'
);
-- IT-DEP / OPS-DIR users → ITD department
UPDATE users SET org_unit_id = 'a0a0a0a0-0000-4000-a000-000000000001'
WHERE org_unit_id IN (
  SELECT id FROM org_units WHERE code IN ('IT-DEP', 'OPS-DIR')
    AND tenant_id = '00000000-0000-0000-0000-000000000001'
);

-- Reassign all other entity references (tickets, assets, policies, risks, etc.)
-- to the correct org_units before deleting stale ones
-- +goose StatementBegin
DO $$
DECLARE
  stale_ids uuid[];
  asd_id uuid := 'd0d0d0d0-0000-4000-a000-000000000003';
  itd_id uuid := 'a0a0a0a0-0000-4000-a000-000000000001';
BEGIN
  SELECT array_agg(id) INTO stale_ids
  FROM org_units WHERE code IN ('IT-DEP', 'OPS-DIR', 'ITD - ASD')
    AND tenant_id = '00000000-0000-0000-0000-000000000001';

  IF stale_ids IS NOT NULL THEN
    UPDATE tickets SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE assets SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE policies SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE risks SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE portfolios SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE okrs SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE meetings SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE documents SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE announcements SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE kb_articles SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE vendors SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE contracts SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE audits SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE projects SET division_id = itd_id WHERE division_id = ANY(stale_ids);
    UPDATE project_division_assignments SET division_id = itd_id WHERE division_id = ANY(stale_ids);
    UPDATE action_items SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE automation_rules SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE checklists SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE leave_records SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE document_folders SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE workflow_definitions SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE approval_chains SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE custom_field_definitions SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE change_freeze_periods SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
    UPDATE maintenance_windows SET org_unit_id = itd_id WHERE org_unit_id = ANY(stale_ids);
  END IF;
END $$;
-- +goose StatementEnd

DELETE FROM org_units WHERE code IN ('IT-DEP', 'OPS-DIR', 'ITD - ASD')
  AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- ══════════════════════════════════════════════════════════════
-- 2. CBN Directorate chain (above ITD)
-- ══════════════════════════════════════════════════════════════

-- CBN (root directorate — Governor's office)
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active)
VALUES ('b0b0b0b0-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000001',
        'Central Bank of Nigeria', 'CBN', 'directorate', NULL, true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Economic Policy Directorate (Deputy Governor)
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active)
VALUES ('b0b0b0b0-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000001',
        'Economic Policy Directorate', 'EPD', 'directorate', 'b0b0b0b0-0000-4000-a000-000000000001', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. Re-parent ITD department under Economic Policy Directorate
-- ══════════════════════════════════════════════════════════════

UPDATE org_units
SET parent_id  = 'b0b0b0b0-0000-4000-a000-000000000002',
    updated_at = NOW()
WHERE id = 'a0a0a0a0-0000-4000-a000-000000000001';

-- Manually add hierarchy entries (trigger only fires on INSERT)
-- CBN → ITD (depth 2), EPD → ITD (depth 1)
INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth) VALUES
  ('b0b0b0b0-0000-4000-a000-000000000002', 'a0a0a0a0-0000-4000-a000-000000000001', 1),
  ('b0b0b0b0-0000-4000-a000-000000000001', 'a0a0a0a0-0000-4000-a000-000000000001', 2)
ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

-- CBN/EPD → all divisions (depth 3/2)
INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
SELECT 'b0b0b0b0-0000-4000-a000-000000000001', descendant_id, depth + 2
FROM org_hierarchy
WHERE ancestor_id = 'a0a0a0a0-0000-4000-a000-000000000001' AND depth > 0
ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
SELECT 'b0b0b0b0-0000-4000-a000-000000000002', descendant_id, depth + 1
FROM org_hierarchy
WHERE ancestor_id = 'a0a0a0a0-0000-4000-a000-000000000001' AND depth > 0
ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. Seed leadership users
-- ══════════════════════════════════════════════════════════════

-- Governor: Cardoso, Olayemi
INSERT INTO users (id, email, display_name, job_title, department, tenant_id, is_active, org_unit_id, password_hash)
VALUES (
  'c0c0c0c0-0000-4000-a000-000000000001',
  'ocardoso@cbn.gov.ng',
  'Cardoso, Olayemi',
  'Governor',
  'CBN',
  '00000000-0000-0000-0000-000000000001',
  true,
  'b0b0b0b0-0000-4000-a000-000000000001',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
) ON CONFLICT (email) DO NOTHING;

-- Deputy Governor: Muhammad Sani Abdullahi
INSERT INTO users (id, email, display_name, job_title, department, tenant_id, is_active, org_unit_id, password_hash)
VALUES (
  'c0c0c0c0-0000-4000-a000-000000000002',
  'msabdullahi@cbn.gov.ng',
  'Muhammad Sani Abdullahi',
  'Deputy Governor, Economic Policy',
  'Economic Policy',
  '00000000-0000-0000-0000-000000000001',
  true,
  'b0b0b0b0-0000-4000-a000-000000000002',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
) ON CONFLICT (email) DO NOTHING;

-- Director ITD: Jide-Samuel, Omoyemen
INSERT INTO users (id, email, display_name, job_title, department, tenant_id, is_active, org_unit_id, password_hash)
VALUES (
  'c0c0c0c0-0000-4000-a000-000000000003',
  'ojidesamuel@cbn.gov.ng',
  'Jide-Samuel, Omoyemen',
  'Director, Information Technology',
  'Information Technology',
  '00000000-0000-0000-0000-000000000001',
  true,
  'a0a0a0a0-0000-4000-a000-000000000001',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
) ON CONFLICT (email) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 5. Set org_unit managers
-- ══════════════════════════════════════════════════════════════

-- Governor manages CBN directorate
UPDATE org_units SET manager_user_id = 'c0c0c0c0-0000-4000-a000-000000000001'
WHERE id = 'b0b0b0b0-0000-4000-a000-000000000001';

-- Deputy Governor manages Economic Policy Directorate
UPDATE org_units SET manager_user_id = 'c0c0c0c0-0000-4000-a000-000000000002'
WHERE id = 'b0b0b0b0-0000-4000-a000-000000000002';

-- Director Jide-Samuel manages ITD department
UPDATE org_units SET manager_user_id = 'c0c0c0c0-0000-4000-a000-000000000003'
WHERE id = 'a0a0a0a0-0000-4000-a000-000000000001';

-- Deputy Director Olaniyan manages the Administrator division
UPDATE org_units SET manager_user_id = '0f6fe766-af61-4610-b8c4-371b42fe6d5f'
WHERE id = 'd0d0d0d0-0000-4000-a000-000000000001';

-- Update Olaniyan's org_unit to ITD department (deputy director is department-level)
UPDATE users
SET org_unit_id = 'a0a0a0a0-0000-4000-a000-000000000001',
    job_title   = 'Deputy Director (Comp), ITech'
WHERE id = '0f6fe766-af61-4610-b8c4-371b42fe6d5f';

-- ══════════════════════════════════════════════════════════════
-- 6. Role bindings for leadership
-- ══════════════════════════════════════════════════════════════

-- Director Jide-Samuel gets itd_director role (cross-division visibility)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
VALUES (
  'c0c0c0c0-0000-4000-a000-000000000003',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'global', NULL,
  '20000000-0000-0000-0000-000000000001',
  true
) ON CONFLICT DO NOTHING;

-- Deputy Director Olaniyan — ensure itd_director role too (deputy sees everything)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
VALUES (
  '0f6fe766-af61-4610-b8c4-371b42fe6d5f',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'global', NULL,
  'c0c0c0c0-0000-4000-a000-000000000003',
  true
) ON CONFLICT DO NOTHING;


-- +goose Down

-- Remove role bindings
DELETE FROM role_bindings
WHERE user_id IN ('c0c0c0c0-0000-4000-a000-000000000003')
  AND role_id = '10000000-0000-0000-0000-000000000002';

DELETE FROM role_bindings
WHERE user_id = '0f6fe766-af61-4610-b8c4-371b42fe6d5f'
  AND role_id = '10000000-0000-0000-0000-000000000002';

-- Revert Olaniyan to AMD
UPDATE users
SET org_unit_id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
    job_title   = 'Deputy Director (Comp), ITech'
WHERE id = '0f6fe766-af61-4610-b8c4-371b42fe6d5f';

-- Remove org_unit managers
UPDATE org_units SET manager_user_id = NULL
WHERE id IN (
  'b0b0b0b0-0000-4000-a000-000000000001',
  'b0b0b0b0-0000-4000-a000-000000000002',
  'a0a0a0a0-0000-4000-a000-000000000001',
  'd0d0d0d0-0000-4000-a000-000000000001'
);

-- Delete leadership users
DELETE FROM users WHERE id IN (
  'c0c0c0c0-0000-4000-a000-000000000001',
  'c0c0c0c0-0000-4000-a000-000000000002',
  'c0c0c0c0-0000-4000-a000-000000000003'
);

-- Re-parent ITD to no parent
UPDATE org_units SET parent_id = NULL, updated_at = NOW()
WHERE id = 'a0a0a0a0-0000-4000-a000-000000000001';

-- Remove directorate hierarchy entries
DELETE FROM org_hierarchy WHERE ancestor_id IN (
  'b0b0b0b0-0000-4000-a000-000000000001',
  'b0b0b0b0-0000-4000-a000-000000000002'
) OR descendant_id IN (
  'b0b0b0b0-0000-4000-a000-000000000001',
  'b0b0b0b0-0000-4000-a000-000000000002'
);

-- Delete directorate org_units
DELETE FROM org_units WHERE id IN (
  'b0b0b0b0-0000-4000-a000-000000000001',
  'b0b0b0b0-0000-4000-a000-000000000002'
);

-- +goose Up
-- Migration 066: Seed complete ITD Organogram
-- Seeds: ITD department org_unit, 10 divisions, 32 offices
-- Also renames AMD division and its offices to match official organogram

-- ══════════════════════════════════════════════════════════════
-- 1. ITD Department (root org_unit for the entire hierarchy)
-- ══════════════════════════════════════════════════════════════

INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active)
VALUES ('a0a0a0a0-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000001',
        'Information Technology Department', 'ITD', 'department', NULL, true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. Rename AMD division and offices to match organogram
-- ══════════════════════════════════════════════════════════════

-- Division: "Application Management Division" → "Applications Management"
UPDATE org_units
SET name      = 'Applications Management',
    parent_id = 'a0a0a0a0-0000-4000-a000-000000000001',
    updated_at = NOW()
WHERE id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787';

-- Office renames (drop "Office" suffix, fix "Payment" → "Payments")
UPDATE org_units SET name = 'Payments & Operations Services', updated_at = NOW()
WHERE id = '2a5f2e13-d303-1895-16e1-1b048c9d791d';

UPDATE org_units SET name = 'Financial Surveillance Services', updated_at = NOW()
WHERE id = 'c22d15fd-f6f0-a86a-d541-f4cd13051094';

UPDATE org_units SET name = 'Internal Support Services', updated_at = NOW()
WHERE id = '2464f477-fd51-01ff-2cfc-edc0846be881';

UPDATE org_units SET name = 'Business Intelligence Services', updated_at = NOW()
WHERE id = '4493b788-602f-e1a7-ab04-3058bbe61ff4';

UPDATE org_units SET name = 'Collaboration Services', updated_at = NOW()
WHERE id = 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90';

-- Fix org_hierarchy for AMD: add ITD→AMD ancestry (trigger only fires on INSERT)
INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
VALUES ('a0a0a0a0-0000-4000-a000-000000000001', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 1)
ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

-- Add ITD→AMD-office ancestry (depth 2)
INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth) VALUES
  ('a0a0a0a0-0000-4000-a000-000000000001', '2a5f2e13-d303-1895-16e1-1b048c9d791d', 2),
  ('a0a0a0a0-0000-4000-a000-000000000001', 'c22d15fd-f6f0-a86a-d541-f4cd13051094', 2),
  ('a0a0a0a0-0000-4000-a000-000000000001', '2464f477-fd51-01ff-2cfc-edc0846be881', 2),
  ('a0a0a0a0-0000-4000-a000-000000000001', '4493b788-602f-e1a7-ab04-3058bbe61ff4', 2),
  ('a0a0a0a0-0000-4000-a000-000000000001', 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90', 2)
ON CONFLICT (ancestor_id, descendant_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. Insert 9 new divisions under ITD
-- ══════════════════════════════════════════════════════════════

INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  -- Direct reports to Director ITD
  ('d0d0d0d0-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Administrator', 'ADMIN', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),
  ('d0d0d0d0-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Program Management Office', 'PMO', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),

  -- 8 Divisions
  ('d0d0d0d0-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Architecture & Strategy', 'ASD', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),
  ('d0d0d0d0-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Business Relationship Management', 'BRMD', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),
  -- AMD already exists (ce6d2f59-...), updated above
  ('d0d0d0d0-0000-4000-a000-000000000005', '00000000-0000-0000-0000-000000000001',
   'IT Service Support Management', 'ITSSM', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),
  ('d0d0d0d0-0000-4000-a000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Infrastructure Management', 'IMD', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),
  ('d0d0d0d0-0000-4000-a000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Information Security Management', 'ISMD', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),
  ('d0d0d0d0-0000-4000-a000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Quality & Compliance Management', 'QCMD', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true),
  ('d0d0d0d0-0000-4000-a000-000000000009', '00000000-0000-0000-0000-000000000001',
   'Operations Management', 'OMD', 'division', 'a0a0a0a0-0000-4000-a000-000000000001', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. Insert offices under each division
-- ══════════════════════════════════════════════════════════════

-- ── Architecture & Strategy (ASD) ── 2 offices ──
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  ('0f0f0f0f-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000001',
   'IT Architecture', 'ASD-ITA', 'office', 'd0d0d0d0-0000-4000-a000-000000000003', true),
  ('0f0f0f0f-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000001',
   'IT Strategy & Innovation', 'ASD-ITSI', 'office', 'd0d0d0d0-0000-4000-a000-000000000003', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Business Relationship Management (BRMD) ── 5 offices ──
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  ('0f0f0f0f-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Internal Systems', 'BRMD-IS', 'office', 'd0d0d0d0-0000-4000-a000-000000000004', true),
  ('0f0f0f0f-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Surveillance Systems', 'BRMD-SS', 'office', 'd0d0d0d0-0000-4000-a000-000000000004', true),
  ('0f0f0f0f-0000-4000-a000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Payment Systems', 'BRMD-PS', 'office', 'd0d0d0d0-0000-4000-a000-000000000004', true),
  ('0f0f0f0f-0000-4000-a000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Developmental Initiatives', 'BRMD-DI', 'office', 'd0d0d0d0-0000-4000-a000-000000000004', true),
  ('0f0f0f0f-0000-4000-a000-000000000007', '00000000-0000-0000-0000-000000000001',
   'External Relationships', 'BRMD-ER', 'office', 'd0d0d0d0-0000-4000-a000-000000000004', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Applications Management (AMD) ── 5 offices already exist (renamed above) ──

-- ── IT Service Support Management (ITSSM) ── 3 offices ──
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  ('0f0f0f0f-0000-4000-a000-000000000008', '00000000-0000-0000-0000-000000000001',
   'IT Service Center', 'ITSSM-ITSC', 'office', 'd0d0d0d0-0000-4000-a000-000000000005', true),
  ('0f0f0f0f-0000-4000-a000-000000000009', '00000000-0000-0000-0000-000000000001',
   'Branch IT Support', 'ITSSM-BITS', 'office', 'd0d0d0d0-0000-4000-a000-000000000005', true),
  ('0f0f0f0f-0000-4000-a000-000000000010', '00000000-0000-0000-0000-000000000001',
   'IT Assets Management', 'ITSSM-ITAM', 'office', 'd0d0d0d0-0000-4000-a000-000000000005', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Infrastructure Management (IMD) ── 4 offices ──
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  ('0f0f0f0f-0000-4000-a000-000000000011', '00000000-0000-0000-0000-000000000001',
   'Network Management', 'IMD-NM', 'office', 'd0d0d0d0-0000-4000-a000-000000000006', true),
  ('0f0f0f0f-0000-4000-a000-000000000012', '00000000-0000-0000-0000-000000000001',
   'Data Center Management', 'IMD-DCM', 'office', 'd0d0d0d0-0000-4000-a000-000000000006', true),
  ('0f0f0f0f-0000-4000-a000-000000000013', '00000000-0000-0000-0000-000000000001',
   'Network Operations Center', 'IMD-NOC', 'office', 'd0d0d0d0-0000-4000-a000-000000000006', true),
  ('0f0f0f0f-0000-4000-a000-000000000014', '00000000-0000-0000-0000-000000000001',
   'Cloud Services Management', 'IMD-CSM', 'office', 'd0d0d0d0-0000-4000-a000-000000000006', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Information Security Management (ISMD) ── 4 offices ──
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  ('0f0f0f0f-0000-4000-a000-000000000015', '00000000-0000-0000-0000-000000000001',
   'Security Programs Office', 'ISMD-SPO', 'office', 'd0d0d0d0-0000-4000-a000-000000000007', true),
  ('0f0f0f0f-0000-4000-a000-000000000016', '00000000-0000-0000-0000-000000000001',
   'Payments & Applications Security', 'ISMD-PAS', 'office', 'd0d0d0d0-0000-4000-a000-000000000007', true),
  ('0f0f0f0f-0000-4000-a000-000000000017', '00000000-0000-0000-0000-000000000001',
   'Systems & Network Security', 'ISMD-SNS', 'office', 'd0d0d0d0-0000-4000-a000-000000000007', true),
  ('0f0f0f0f-0000-4000-a000-000000000018', '00000000-0000-0000-0000-000000000001',
   'Security Operations Center', 'ISMD-SOC', 'office', 'd0d0d0d0-0000-4000-a000-000000000007', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Quality & Compliance Management (QCMD) ── 5 offices ──
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  ('0f0f0f0f-0000-4000-a000-000000000019', '00000000-0000-0000-0000-000000000001',
   'Quality Management', 'QCMD-QM', 'office', 'd0d0d0d0-0000-4000-a000-000000000008', true),
  ('0f0f0f0f-0000-4000-a000-000000000020', '00000000-0000-0000-0000-000000000001',
   'IT Risk & Compliance Management', 'QCMD-IRCM', 'office', 'd0d0d0d0-0000-4000-a000-000000000008', true),
  ('0f0f0f0f-0000-4000-a000-000000000021', '00000000-0000-0000-0000-000000000001',
   'IT Change Management', 'QCMD-ITCM', 'office', 'd0d0d0d0-0000-4000-a000-000000000008', true),
  ('0f0f0f0f-0000-4000-a000-000000000022', '00000000-0000-0000-0000-000000000001',
   'Vendor Management', 'QCMD-VM', 'office', 'd0d0d0d0-0000-4000-a000-000000000008', true),
  ('0f0f0f0f-0000-4000-a000-000000000023', '00000000-0000-0000-0000-000000000001',
   'IT Service Continuity & Availability', 'QCMD-ITSCA', 'office', 'd0d0d0d0-0000-4000-a000-000000000008', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Operations Management (OMD) ── 4 offices ──
INSERT INTO org_units (id, tenant_id, name, code, level, parent_id, is_active) VALUES
  ('0f0f0f0f-0000-4000-a000-000000000024', '00000000-0000-0000-0000-000000000001',
   'Systems Services', 'OMD-SYSS', 'office', 'd0d0d0d0-0000-4000-a000-000000000009', true),
  ('0f0f0f0f-0000-4000-a000-000000000025', '00000000-0000-0000-0000-000000000001',
   'Applications Administration', 'OMD-AA', 'office', 'd0d0d0d0-0000-4000-a000-000000000009', true),
  ('0f0f0f0f-0000-4000-a000-000000000026', '00000000-0000-0000-0000-000000000001',
   'Database Management', 'OMD-DBM', 'office', 'd0d0d0d0-0000-4000-a000-000000000009', true),
  ('0f0f0f0f-0000-4000-a000-000000000027', '00000000-0000-0000-0000-000000000001',
   'Systems Operations', 'OMD-SO', 'office', 'd0d0d0d0-0000-4000-a000-000000000009', true)
ON CONFLICT (tenant_id, code) DO NOTHING;


-- +goose Down
-- Reverse: delete new offices, divisions, ITD dept; revert AMD renames

-- Delete new offices (27 new offices across 7 divisions)
DELETE FROM org_hierarchy WHERE ancestor_id IN (
  '0f0f0f0f-0000-4000-a000-000000000001','0f0f0f0f-0000-4000-a000-000000000002',
  '0f0f0f0f-0000-4000-a000-000000000003','0f0f0f0f-0000-4000-a000-000000000004',
  '0f0f0f0f-0000-4000-a000-000000000005','0f0f0f0f-0000-4000-a000-000000000006',
  '0f0f0f0f-0000-4000-a000-000000000007','0f0f0f0f-0000-4000-a000-000000000008',
  '0f0f0f0f-0000-4000-a000-000000000009','0f0f0f0f-0000-4000-a000-000000000010',
  '0f0f0f0f-0000-4000-a000-000000000011','0f0f0f0f-0000-4000-a000-000000000012',
  '0f0f0f0f-0000-4000-a000-000000000013','0f0f0f0f-0000-4000-a000-000000000014',
  '0f0f0f0f-0000-4000-a000-000000000015','0f0f0f0f-0000-4000-a000-000000000016',
  '0f0f0f0f-0000-4000-a000-000000000017','0f0f0f0f-0000-4000-a000-000000000018',
  '0f0f0f0f-0000-4000-a000-000000000019','0f0f0f0f-0000-4000-a000-000000000020',
  '0f0f0f0f-0000-4000-a000-000000000021','0f0f0f0f-0000-4000-a000-000000000022',
  '0f0f0f0f-0000-4000-a000-000000000023','0f0f0f0f-0000-4000-a000-000000000024',
  '0f0f0f0f-0000-4000-a000-000000000025','0f0f0f0f-0000-4000-a000-000000000026',
  '0f0f0f0f-0000-4000-a000-000000000027'
) OR descendant_id IN (
  '0f0f0f0f-0000-4000-a000-000000000001','0f0f0f0f-0000-4000-a000-000000000002',
  '0f0f0f0f-0000-4000-a000-000000000003','0f0f0f0f-0000-4000-a000-000000000004',
  '0f0f0f0f-0000-4000-a000-000000000005','0f0f0f0f-0000-4000-a000-000000000006',
  '0f0f0f0f-0000-4000-a000-000000000007','0f0f0f0f-0000-4000-a000-000000000008',
  '0f0f0f0f-0000-4000-a000-000000000009','0f0f0f0f-0000-4000-a000-000000000010',
  '0f0f0f0f-0000-4000-a000-000000000011','0f0f0f0f-0000-4000-a000-000000000012',
  '0f0f0f0f-0000-4000-a000-000000000013','0f0f0f0f-0000-4000-a000-000000000014',
  '0f0f0f0f-0000-4000-a000-000000000015','0f0f0f0f-0000-4000-a000-000000000016',
  '0f0f0f0f-0000-4000-a000-000000000017','0f0f0f0f-0000-4000-a000-000000000018',
  '0f0f0f0f-0000-4000-a000-000000000019','0f0f0f0f-0000-4000-a000-000000000020',
  '0f0f0f0f-0000-4000-a000-000000000021','0f0f0f0f-0000-4000-a000-000000000022',
  '0f0f0f0f-0000-4000-a000-000000000023','0f0f0f0f-0000-4000-a000-000000000024',
  '0f0f0f0f-0000-4000-a000-000000000025','0f0f0f0f-0000-4000-a000-000000000026',
  '0f0f0f0f-0000-4000-a000-000000000027'
);

DELETE FROM org_units WHERE id IN (
  '0f0f0f0f-0000-4000-a000-000000000001','0f0f0f0f-0000-4000-a000-000000000002',
  '0f0f0f0f-0000-4000-a000-000000000003','0f0f0f0f-0000-4000-a000-000000000004',
  '0f0f0f0f-0000-4000-a000-000000000005','0f0f0f0f-0000-4000-a000-000000000006',
  '0f0f0f0f-0000-4000-a000-000000000007','0f0f0f0f-0000-4000-a000-000000000008',
  '0f0f0f0f-0000-4000-a000-000000000009','0f0f0f0f-0000-4000-a000-000000000010',
  '0f0f0f0f-0000-4000-a000-000000000011','0f0f0f0f-0000-4000-a000-000000000012',
  '0f0f0f0f-0000-4000-a000-000000000013','0f0f0f0f-0000-4000-a000-000000000014',
  '0f0f0f0f-0000-4000-a000-000000000015','0f0f0f0f-0000-4000-a000-000000000016',
  '0f0f0f0f-0000-4000-a000-000000000017','0f0f0f0f-0000-4000-a000-000000000018',
  '0f0f0f0f-0000-4000-a000-000000000019','0f0f0f0f-0000-4000-a000-000000000020',
  '0f0f0f0f-0000-4000-a000-000000000021','0f0f0f0f-0000-4000-a000-000000000022',
  '0f0f0f0f-0000-4000-a000-000000000023','0f0f0f0f-0000-4000-a000-000000000024',
  '0f0f0f0f-0000-4000-a000-000000000025','0f0f0f0f-0000-4000-a000-000000000026',
  '0f0f0f0f-0000-4000-a000-000000000027'
);

-- Delete new divisions
DELETE FROM org_hierarchy WHERE ancestor_id IN (
  'd0d0d0d0-0000-4000-a000-000000000001','d0d0d0d0-0000-4000-a000-000000000002',
  'd0d0d0d0-0000-4000-a000-000000000003','d0d0d0d0-0000-4000-a000-000000000004',
  'd0d0d0d0-0000-4000-a000-000000000005','d0d0d0d0-0000-4000-a000-000000000006',
  'd0d0d0d0-0000-4000-a000-000000000007','d0d0d0d0-0000-4000-a000-000000000008',
  'd0d0d0d0-0000-4000-a000-000000000009'
) OR descendant_id IN (
  'd0d0d0d0-0000-4000-a000-000000000001','d0d0d0d0-0000-4000-a000-000000000002',
  'd0d0d0d0-0000-4000-a000-000000000003','d0d0d0d0-0000-4000-a000-000000000004',
  'd0d0d0d0-0000-4000-a000-000000000005','d0d0d0d0-0000-4000-a000-000000000006',
  'd0d0d0d0-0000-4000-a000-000000000007','d0d0d0d0-0000-4000-a000-000000000008',
  'd0d0d0d0-0000-4000-a000-000000000009'
);

DELETE FROM org_units WHERE id IN (
  'd0d0d0d0-0000-4000-a000-000000000001','d0d0d0d0-0000-4000-a000-000000000002',
  'd0d0d0d0-0000-4000-a000-000000000003','d0d0d0d0-0000-4000-a000-000000000004',
  'd0d0d0d0-0000-4000-a000-000000000005','d0d0d0d0-0000-4000-a000-000000000006',
  'd0d0d0d0-0000-4000-a000-000000000007','d0d0d0d0-0000-4000-a000-000000000008',
  'd0d0d0d0-0000-4000-a000-000000000009'
);

-- Revert AMD renames
UPDATE org_units SET name = 'Application Management Division', parent_id = NULL, updated_at = NOW()
WHERE id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787';

UPDATE org_units SET name = 'Payment & Operations Services Office', updated_at = NOW()
WHERE id = '2a5f2e13-d303-1895-16e1-1b048c9d791d';
UPDATE org_units SET name = 'Financial Surveillance Services Office', updated_at = NOW()
WHERE id = 'c22d15fd-f6f0-a86a-d541-f4cd13051094';
UPDATE org_units SET name = 'Internal Support Services Office', updated_at = NOW()
WHERE id = '2464f477-fd51-01ff-2cfc-edc0846be881';
UPDATE org_units SET name = 'Business Intelligence Services Office', updated_at = NOW()
WHERE id = '4493b788-602f-e1a7-ab04-3058bbe61ff4';
UPDATE org_units SET name = 'Collaboration Services Office', updated_at = NOW()
WHERE id = 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90';

-- Remove ITD→AMD hierarchy entries added in up
DELETE FROM org_hierarchy
WHERE ancestor_id = 'a0a0a0a0-0000-4000-a000-000000000001'
  AND descendant_id IN (
    'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
    '2a5f2e13-d303-1895-16e1-1b048c9d791d',
    'c22d15fd-f6f0-a86a-d541-f4cd13051094',
    '2464f477-fd51-01ff-2cfc-edc0846be881',
    '4493b788-602f-e1a7-ab04-3058bbe61ff4',
    'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90'
  );

-- Delete ITD department
DELETE FROM org_hierarchy WHERE ancestor_id = 'a0a0a0a0-0000-4000-a000-000000000001'
   OR descendant_id = 'a0a0a0a0-0000-4000-a000-000000000001';
DELETE FROM org_units WHERE id = 'a0a0a0a0-0000-4000-a000-000000000001';

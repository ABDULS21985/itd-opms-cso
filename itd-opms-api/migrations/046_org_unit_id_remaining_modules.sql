-- +goose Up
-- Migration 046: Add org_unit_id to Remaining Module Root Entities
--
-- Extends org-scope filtering to Knowledge, Approval, Calendar, Vault,
-- Vendor, Automation, and Custom Fields modules.
--
-- Pattern: ALTER TABLE + partial index + backfill from creator's org_unit.
-- Records without a resolvable owner get NULL (visible to all tenant users).

-- ──────────────────────────────────────────────
-- kb_articles (Knowledge) — scoped by author's org
-- ──────────────────────────────────────────────
ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_org_unit ON kb_articles(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE kb_articles a
SET org_unit_id = u.org_unit_id
FROM users u
WHERE a.author_id = u.id
  AND a.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- announcements (Knowledge) — scoped by author's org
-- ──────────────────────────────────────────────
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_announcements_org_unit ON announcements(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE announcements a
SET org_unit_id = u.org_unit_id
FROM users u
WHERE a.author_id = u.id
  AND a.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- workflow_definitions (Approval) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org_unit ON workflow_definitions(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE workflow_definitions wd
SET org_unit_id = u.org_unit_id
FROM users u
WHERE wd.created_by = u.id
  AND wd.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- approval_chains (Approval) — scoped by initiator's org
-- ──────────────────────────────────────────────
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_approval_chains_org_unit ON approval_chains(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE approval_chains ac
SET org_unit_id = u.org_unit_id
FROM users u
WHERE ac.created_by = u.id
  AND ac.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- maintenance_windows (Calendar) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE maintenance_windows ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_org_unit ON maintenance_windows(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE maintenance_windows mw
SET org_unit_id = u.org_unit_id
FROM users u
WHERE mw.created_by = u.id
  AND mw.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- change_freeze_periods (Calendar) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE change_freeze_periods ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_change_freeze_periods_org_unit ON change_freeze_periods(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE change_freeze_periods cfp
SET org_unit_id = u.org_unit_id
FROM users u
WHERE cfp.created_by = u.id
  AND cfp.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- documents (Vault) — scoped by uploader's org
-- ──────────────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_documents_org_unit ON documents(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE documents d
SET org_unit_id = u.org_unit_id
FROM users u
WHERE d.uploaded_by = u.id
  AND d.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- document_folders (Vault) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_document_folders_org_unit ON document_folders(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE document_folders df
SET org_unit_id = u.org_unit_id
FROM users u
WHERE df.created_by = u.id
  AND df.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- vendors (Vendor) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_vendors_org_unit ON vendors(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE vendors v
SET org_unit_id = u.org_unit_id
FROM users u
WHERE v.created_by = u.id
  AND v.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- contracts (Vendor) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_unit ON contracts(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE contracts c
SET org_unit_id = u.org_unit_id
FROM users u
WHERE c.created_by = u.id
  AND c.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- automation_rules (Automation) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_org_unit ON automation_rules(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE automation_rules ar
SET org_unit_id = u.org_unit_id
FROM users u
WHERE ar.created_by = u.id
  AND ar.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- custom_field_definitions (Custom Fields) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE custom_field_definitions ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_org_unit ON custom_field_definitions(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE custom_field_definitions cfd
SET org_unit_id = u.org_unit_id
FROM users u
WHERE cfd.created_by = u.id
  AND cfd.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- +goose Down
ALTER TABLE custom_field_definitions DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE automation_rules DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE contracts DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE vendors DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE document_folders DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE documents DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE change_freeze_periods DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE maintenance_windows DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE approval_chains DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE workflow_definitions DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE announcements DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE kb_articles DROP COLUMN IF EXISTS org_unit_id;

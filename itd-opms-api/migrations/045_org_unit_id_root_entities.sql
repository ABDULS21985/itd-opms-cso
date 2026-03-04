-- +goose Up
-- Migration 045: Add org_unit_id to Root Entity Tables
--
-- Adds org_unit_id FK to business entity tables that "own" data and need
-- direct org-hierarchy-based visibility filtering. Child entities (work_items,
-- ticket_comments, etc.) inherit scope from their parent via JOINs.
--
-- Backfill strategy: set org_unit_id from the record's owner/creator user.
-- Records without a resolvable owner get NULL (visible to all tenant users
-- during the rollout period).

-- ──────────────────────────────────────────────
-- tickets (ITSM) — scoped by reporter's org
-- ──────────────────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_tickets_org_unit ON tickets(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE tickets t
SET org_unit_id = u.org_unit_id
FROM users u
WHERE t.reporter_id = u.id
  AND t.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- portfolios (Planning) — scoped by owner's org
-- ──────────────────────────────────────────────
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_portfolios_org_unit ON portfolios(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE portfolios p
SET org_unit_id = u.org_unit_id
FROM users u
WHERE p.owner_id = u.id
  AND p.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- policies (Governance) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE policies ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_policies_org_unit ON policies(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE policies p
SET org_unit_id = u.org_unit_id
FROM users u
WHERE p.created_by = u.id
  AND p.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- okrs (Governance) — scoped by owner's org
-- ──────────────────────────────────────────────
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_okrs_org_unit ON okrs(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE okrs o
SET org_unit_id = u.org_unit_id
FROM users u
WHERE o.owner_id = u.id
  AND o.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- risks (GRC) — scoped by owner's org
-- ──────────────────────────────────────────────
ALTER TABLE risks ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_risks_org_unit ON risks(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE risks r
SET org_unit_id = u.org_unit_id
FROM users u
WHERE r.owner_id = u.id
  AND r.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- meetings (Governance) — scoped by organizer's org
-- ──────────────────────────────────────────────
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_meetings_org_unit ON meetings(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE meetings m
SET org_unit_id = u.org_unit_id
FROM users u
WHERE m.organizer_id = u.id
  AND m.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- assets (CMDB) — cross-cutting, NULL = tenant-visible
-- ──────────────────────────────────────────────
ALTER TABLE assets ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_assets_org_unit ON assets(org_unit_id) WHERE org_unit_id IS NOT NULL;

-- Assets backfill from owner_id if available
UPDATE assets a
SET org_unit_id = u.org_unit_id
FROM users u
WHERE a.owner_id = u.id
  AND a.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- audits (GRC) — cross-cutting, NULL = tenant-visible
-- ──────────────────────────────────────────────
ALTER TABLE audits ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_audits_org_unit ON audits(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE audits a
SET org_unit_id = u.org_unit_id
FROM users u
WHERE a.created_by = u.id
  AND a.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- leave_records (People) — scoped by user's org
-- ──────────────────────────────────────────────
ALTER TABLE leave_records ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_leave_records_org_unit ON leave_records(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE leave_records lr
SET org_unit_id = u.org_unit_id
FROM users u
WHERE lr.user_id = u.id
  AND lr.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- checklists (People) — scoped by assigned user's org
-- ──────────────────────────────────────────────
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_checklists_org_unit ON checklists(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE checklists c
SET org_unit_id = u.org_unit_id
FROM users u
WHERE c.user_id = u.id
  AND c.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- action_items (Governance) — scoped by owner's org
-- ──────────────────────────────────────────────
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_action_items_org_unit ON action_items(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE action_items ai
SET org_unit_id = u.org_unit_id
FROM users u
WHERE ai.owner_id = u.id
  AND ai.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- +goose Down
ALTER TABLE action_items DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE checklists DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE leave_records DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE audits DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE assets DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE meetings DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE risks DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE okrs DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE policies DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE portfolios DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS org_unit_id;

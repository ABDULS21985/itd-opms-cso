-- +goose Up
-- Migration 022: Add division/office assignment to projects and work items
-- Supports: Primary owner division, collaborating divisions, assignment history

-- ══════════════════════════════════════════════
-- Add division_id to projects table
-- ══════════════════════════════════════════════

ALTER TABLE projects ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_projects_division_id ON projects(division_id) WHERE division_id IS NOT NULL;

-- ══════════════════════════════════════════════
-- Project-Division assignment (collaborating divisions + history)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_division_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    division_id     UUID NOT NULL REFERENCES org_units(id),
    assignment_type TEXT NOT NULL DEFAULT 'collaborator', -- 'primary' or 'collaborator'
    assigned_by     UUID REFERENCES users(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at   TIMESTAMPTZ,                          -- NULL = currently active
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'active',        -- 'active', 'removed'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pda_unique_active
    ON project_division_assignments (project_id, division_id, assignment_type)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pda_project_id ON project_division_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pda_division_id ON project_division_assignments(division_id);
CREATE INDEX IF NOT EXISTS idx_pda_active ON project_division_assignments(project_id, status) WHERE status = 'active';

-- ══════════════════════════════════════════════
-- Assignment audit log
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS division_assignment_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL,         -- 'project' or 'work_item'
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,         -- 'assigned', 'unassigned', 'reassigned'
    from_division_id UUID REFERENCES org_units(id),
    to_division_id   UUID REFERENCES org_units(id),
    performed_by    UUID NOT NULL REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dal_entity ON division_assignment_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_dal_created ON division_assignment_log(created_at DESC);

-- ══════════════════════════════════════════════
-- Seed: Assign existing AMD projects to offices
-- ══════════════════════════════════════════════

-- Map seeded projects to offices based on their project managers' offices
-- BISO projects (Fatima Ibrahim's office)
UPDATE projects SET division_id = '4493b788-602f-e1a7-ab04-3058bbe61ff4'
WHERE project_manager_id = 'e712da03-d912-0288-98e7-7907f066d7cd' AND division_id IS NULL;

-- CSO projects (Chukwuemeka Okafor's office)
UPDATE projects SET division_id = 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90'
WHERE project_manager_id = '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8' AND division_id IS NULL;

-- FSSO projects (Amina Yusuf's office)
UPDATE projects SET division_id = 'c22d15fd-f6f0-a86a-d541-f4cd13051094'
WHERE project_manager_id = '90377934-1644-8547-b018-c4bb2449aaef' AND division_id IS NULL;

-- ISSO projects (Oluwaseun Adeyemi's office)
UPDATE projects SET division_id = '2464f477-fd51-01ff-2cfc-edc0846be881'
WHERE project_manager_id = 'f3947e51-26fa-f488-4a13-e65c608d2e7b' AND division_id IS NULL;

-- POSO projects (Musa Abdullahi's office)
UPDATE projects SET division_id = '2a5f2e13-d303-1895-16e1-1b048c9d791d'
WHERE project_manager_id = 'c59b492e-b071-8565-6194-633cad81d471' AND division_id IS NULL;

-- Also assign via project managers who are staff members
UPDATE projects SET division_id = '4493b788-602f-e1a7-ab04-3058bbe61ff4'
WHERE project_manager_id = '5db8e9fc-125b-4883-62c3-372b18e64d33' AND division_id IS NULL;

UPDATE projects SET division_id = 'c22d15fd-f6f0-a86a-d541-f4cd13051094'
WHERE project_manager_id = '60fbf979-e97b-ae83-3a87-57727c9b06dc' AND division_id IS NULL;

UPDATE projects SET division_id = 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90'
WHERE project_manager_id = '4b7fb185-6c8d-f83b-9180-5515c64c7245' AND division_id IS NULL;

UPDATE projects SET division_id = '2a5f2e13-d303-1895-16e1-1b048c9d791d'
WHERE project_manager_id IN ('5f1114e9-d327-5eb1-e390-8225a895a60d', '959762a9-a7c4-c568-6dd3-f781ab060843') AND division_id IS NULL;

UPDATE projects SET division_id = '2464f477-fd51-01ff-2cfc-edc0846be881'
WHERE project_manager_id = 'e5332a5f-7fb2-edb6-0691-998591b8dc3e' AND division_id IS NULL;

-- For any remaining unassigned projects under AMD, distribute to AMD division head's scope
UPDATE projects SET division_id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'
WHERE division_id IS NULL
  AND project_manager_id = 'b57c7521-672f-307c-9878-e3504b0e18d7';

-- +goose Down
DROP TABLE IF EXISTS division_assignment_log;
DROP TABLE IF EXISTS project_division_assignments;
ALTER TABLE projects DROP COLUMN IF EXISTS division_id;

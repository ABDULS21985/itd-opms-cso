-- +goose Up
-- Migration 011: People & Workforce Module
-- Supports: Skills management, Skill gap analysis, Onboarding/offboarding checklists,
-- Roster/shift management, Leave records, Capacity allocation, Training records.

-- ──────────────────────────────────────────────
-- Skill Categories (hierarchical)
-- ──────────────────────────────────────────────
CREATE TABLE skill_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    parent_id   UUID REFERENCES skill_categories(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_categories_tenant ON skill_categories(tenant_id);

CREATE TRIGGER trg_skill_categories_updated
    BEFORE UPDATE ON skill_categories
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Skills
-- ──────────────────────────────────────────────
CREATE TABLE skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    category_id UUID NOT NULL REFERENCES skill_categories(id),
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_tenant ON skills(tenant_id);
CREATE INDEX idx_skills_category ON skills(category_id);

CREATE TRIGGER trg_skills_updated
    BEFORE UPDATE ON skills
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- User Skills
-- ──────────────────────────────────────────────
CREATE TABLE user_skills (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id),
    user_id              UUID NOT NULL,
    skill_id             UUID NOT NULL REFERENCES skills(id),
    proficiency_level    TEXT NOT NULL DEFAULT 'beginner' CHECK (proficiency_level IN ('beginner','intermediate','advanced','expert')),
    certified            BOOLEAN DEFAULT false,
    certification_name   TEXT,
    certification_expiry DATE,
    verified_by          UUID,
    verified_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_user_skills_tenant ON user_skills(tenant_id);
CREATE INDEX idx_user_skills_tenant_user ON user_skills(tenant_id, user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_id);

CREATE TRIGGER trg_user_skills_updated
    BEFORE UPDATE ON user_skills
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Role Skill Requirements
-- ──────────────────────────────────────────────
CREATE TABLE role_skill_requirements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id),
    role_type      TEXT NOT NULL,
    skill_id       UUID NOT NULL REFERENCES skills(id),
    required_level TEXT NOT NULL CHECK (required_level IN ('beginner','intermediate','advanced','expert')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_role_skill_requirements_tenant ON role_skill_requirements(tenant_id);
CREATE INDEX idx_role_skill_requirements_skill ON role_skill_requirements(skill_id);

-- ──────────────────────────────────────────────
-- Checklist Templates
-- ──────────────────────────────────────────────
CREATE TABLE checklist_templates (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    type      TEXT NOT NULL CHECK (type IN ('onboarding','offboarding')),
    role_type TEXT,
    name      TEXT NOT NULL,
    tasks     JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_templates_tenant ON checklist_templates(tenant_id);
CREATE INDEX idx_checklist_templates_tenant_type ON checklist_templates(tenant_id, type);

CREATE TRIGGER trg_checklist_templates_updated
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Checklists (instantiated from templates)
-- ──────────────────────────────────────────────
CREATE TABLE checklists (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id),
    template_id    UUID REFERENCES checklist_templates(id),
    user_id        UUID NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('onboarding','offboarding')),
    status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
    completion_pct DECIMAL(5,2) DEFAULT 0,
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklists_tenant ON checklists(tenant_id);
CREATE INDEX idx_checklists_tenant_user ON checklists(tenant_id, user_id);
CREATE INDEX idx_checklists_tenant_type ON checklists(tenant_id, type);
CREATE INDEX idx_checklists_tenant_status ON checklists(tenant_id, status);

CREATE TRIGGER trg_checklists_updated
    BEFORE UPDATE ON checklists
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Checklist Tasks
-- ──────────────────────────────────────────────
CREATE TABLE checklist_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id    UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    assignee_id     UUID,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    completed_by    UUID,
    evidence_doc_id UUID,
    notes           TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_tasks_checklist ON checklist_tasks(checklist_id);

CREATE TRIGGER trg_checklist_tasks_updated
    BEFORE UPDATE ON checklist_tasks
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Rosters (shift management)
-- ──────────────────────────────────────────────
CREATE TABLE rosters (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    team_id      UUID,
    name         TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,
    status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    shifts       JSONB DEFAULT '[]',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rosters_tenant ON rosters(tenant_id);
CREATE INDEX idx_rosters_tenant_team ON rosters(tenant_id, team_id);

CREATE TRIGGER trg_rosters_updated
    BEFORE UPDATE ON rosters
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Leave Records
-- ──────────────────────────────────────────────
CREATE TABLE leave_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    user_id     UUID NOT NULL,
    leave_type  TEXT NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
    approved_by UUID,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leave_records_tenant ON leave_records(tenant_id);
CREATE INDEX idx_leave_records_tenant_user ON leave_records(tenant_id, user_id);
CREATE INDEX idx_leave_records_tenant_status ON leave_records(tenant_id, status);

CREATE TRIGGER trg_leave_records_updated
    BEFORE UPDATE ON leave_records
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Capacity Allocations
-- ──────────────────────────────────────────────
CREATE TABLE capacity_allocations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id),
    user_id        UUID NOT NULL,
    project_id     UUID,
    allocation_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    period_start   DATE NOT NULL,
    period_end     DATE NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_capacity_allocations_tenant ON capacity_allocations(tenant_id);
CREATE INDEX idx_capacity_allocations_tenant_user ON capacity_allocations(tenant_id, user_id);

CREATE TRIGGER trg_capacity_allocations_updated
    BEFORE UPDATE ON capacity_allocations
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Training Records
-- ──────────────────────────────────────────────
CREATE TABLE training_records (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(id),
    user_id            UUID NOT NULL,
    title              TEXT NOT NULL,
    provider           TEXT,
    type               TEXT NOT NULL CHECK (type IN ('course','certification','workshop','conference')),
    status             TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','expired')),
    completed_at       TIMESTAMPTZ,
    expiry_date        DATE,
    certificate_doc_id UUID,
    cost               DECIMAL(15,2),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_records_tenant ON training_records(tenant_id);
CREATE INDEX idx_training_records_tenant_user ON training_records(tenant_id, user_id);
CREATE INDEX idx_training_records_tenant_status ON training_records(tenant_id, status);
CREATE INDEX idx_training_records_tenant_expiry ON training_records(tenant_id, expiry_date);

CREATE TRIGGER trg_training_records_updated
    BEFORE UPDATE ON training_records
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- +goose Down
DROP TABLE IF EXISTS training_records;
DROP TABLE IF EXISTS capacity_allocations;
DROP TABLE IF EXISTS leave_records;
DROP TABLE IF EXISTS rosters;
DROP TABLE IF EXISTS checklist_tasks;
DROP TABLE IF EXISTS checklists;
DROP TABLE IF EXISTS checklist_templates;
DROP TABLE IF EXISTS role_skill_requirements;
DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS skill_categories;

-- +goose Up
-- Migration 008: Planning/PMO Module
-- Supports: Portfolios, Projects, Work items (WBS), Milestones, Time tracking,
-- Risk register, Issues, Change requests, Dependencies, Stakeholders.

-- ──────────────────────────────────────────────
-- Portfolios
-- ──────────────────────────────────────────────
CREATE TABLE portfolios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    owner_id    UUID REFERENCES users(id),
    fiscal_year INT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolios_tenant ON portfolios(tenant_id);

-- ──────────────────────────────────────────────
-- Projects
-- ──────────────────────────────────────────────
CREATE TABLE projects (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(id),
    portfolio_id       UUID REFERENCES portfolios(id),
    title              TEXT NOT NULL,
    code               TEXT NOT NULL,
    description        TEXT,
    charter            TEXT,
    scope              TEXT,
    business_case      TEXT,
    sponsor_id         UUID REFERENCES users(id),
    project_manager_id UUID REFERENCES users(id),
    status             TEXT NOT NULL DEFAULT 'proposed',
    rag_status         TEXT NOT NULL DEFAULT 'green',
    priority           TEXT NOT NULL DEFAULT 'medium',
    planned_start      DATE,
    planned_end        DATE,
    actual_start       DATE,
    actual_end         DATE,
    budget_approved    DECIMAL(15,2),
    budget_spent       DECIMAL(15,2) DEFAULT 0,
    completion_pct     DECIMAL(5,2) DEFAULT 0,
    metadata           JSONB DEFAULT '{}',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_portfolio ON projects(portfolio_id);
CREATE INDEX idx_projects_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_pm ON projects(project_manager_id);

CREATE TRIGGER trg_projects_updated
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Project Dependencies
-- ──────────────────────────────────────────────
CREATE TABLE project_dependencies (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    depends_on_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    dependency_type       TEXT NOT NULL DEFAULT 'finish_to_start',
    description           TEXT,
    impact_if_delayed     TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_deps_project ON project_dependencies(project_id);

-- ──────────────────────────────────────────────
-- Project Stakeholders
-- ──────────────────────────────────────────────
CREATE TABLE project_stakeholders (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id               UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id                  UUID NOT NULL REFERENCES users(id),
    role                     TEXT NOT NULL,
    influence                TEXT,
    interest                 TEXT,
    communication_preference TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_stakeholders_project ON project_stakeholders(project_id);

-- ──────────────────────────────────────────────
-- Work Items (WBS)
-- ──────────────────────────────────────────────
CREATE TABLE work_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES work_items(id),
    type            TEXT NOT NULL DEFAULT 'task',
    title           TEXT NOT NULL,
    description     TEXT,
    assignee_id     UUID REFERENCES users(id),
    reporter_id     UUID REFERENCES users(id),
    status          TEXT NOT NULL DEFAULT 'todo',
    priority        TEXT NOT NULL DEFAULT 'medium',
    estimated_hours DECIMAL(8,2),
    actual_hours    DECIMAL(8,2) DEFAULT 0,
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    sort_order      INT DEFAULT 0,
    tags            TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_items_project ON work_items(project_id);
CREATE INDEX idx_work_items_parent ON work_items(parent_id);
CREATE INDEX idx_work_items_assignee ON work_items(assignee_id);
CREATE INDEX idx_work_items_status ON work_items(project_id, status);
CREATE INDEX idx_work_items_overdue ON work_items(due_date) WHERE status IN ('todo', 'in_progress') AND due_date IS NOT NULL;

CREATE TRIGGER trg_work_items_updated
    BEFORE UPDATE ON work_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Milestones
-- ──────────────────────────────────────────────
CREATE TABLE milestones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    target_date         DATE NOT NULL,
    actual_date         DATE,
    status              TEXT NOT NULL DEFAULT 'pending',
    evidence_refs       UUID[] DEFAULT '{}',
    completion_criteria TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_milestones_project ON milestones(project_id);

CREATE TRIGGER trg_milestones_updated
    BEFORE UPDATE ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Time Entries
-- ──────────────────────────────────────────────
CREATE TABLE time_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id),
    hours        DECIMAL(6,2) NOT NULL,
    description  TEXT,
    logged_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_work_item ON time_entries(work_item_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);

-- ──────────────────────────────────────────────
-- Risk Register
-- ──────────────────────────────────────────────
CREATE TABLE risk_register (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    description      TEXT,
    category         TEXT,
    likelihood       TEXT NOT NULL DEFAULT 'medium',
    impact           TEXT NOT NULL DEFAULT 'medium',
    risk_score       INT GENERATED ALWAYS AS (
        (CASE likelihood WHEN 'very_low' THEN 1 WHEN 'low' THEN 2 WHEN 'medium' THEN 3 WHEN 'high' THEN 4 WHEN 'very_high' THEN 5 ELSE 3 END) *
        (CASE impact WHEN 'very_low' THEN 1 WHEN 'low' THEN 2 WHEN 'medium' THEN 3 WHEN 'high' THEN 4 WHEN 'very_high' THEN 5 ELSE 3 END)
    ) STORED,
    status           TEXT NOT NULL DEFAULT 'identified',
    mitigation_plan  TEXT,
    contingency_plan TEXT,
    owner_id         UUID REFERENCES users(id),
    review_date      DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_register_project ON risk_register(project_id);
CREATE INDEX idx_risk_register_tenant ON risk_register(tenant_id);
CREATE INDEX idx_risk_register_status ON risk_register(tenant_id, status);

CREATE TRIGGER trg_risk_register_updated
    BEFORE UPDATE ON risk_register
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Issues
-- ──────────────────────────────────────────────
CREATE TABLE issues (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    description      TEXT,
    category         TEXT,
    severity         TEXT NOT NULL DEFAULT 'medium',
    status           TEXT NOT NULL DEFAULT 'open',
    assignee_id      UUID REFERENCES users(id),
    resolution       TEXT,
    escalation_level INT DEFAULT 0,
    escalated_to_id  UUID REFERENCES users(id),
    due_date         DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_tenant ON issues(tenant_id);
CREATE INDEX idx_issues_status ON issues(tenant_id, status);

CREATE TRIGGER trg_issues_updated
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Change Requests
-- ──────────────────────────────────────────────
CREATE TABLE change_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    justification     TEXT,
    impact_assessment TEXT,
    status            TEXT NOT NULL DEFAULT 'submitted',
    requested_by      UUID NOT NULL REFERENCES users(id),
    reviewed_by       UUID REFERENCES users(id),
    approval_chain_id UUID REFERENCES approval_chains(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_requests_project ON change_requests(project_id);
CREATE INDEX idx_change_requests_tenant ON change_requests(tenant_id);
CREATE INDEX idx_change_requests_status ON change_requests(tenant_id, status);

CREATE TRIGGER trg_change_requests_updated
    BEFORE UPDATE ON change_requests
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- +goose Down
DROP TABLE IF EXISTS change_requests;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS risk_register;
DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS work_items;
DROP TABLE IF EXISTS project_stakeholders;
DROP TABLE IF EXISTS project_dependencies;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS portfolios;

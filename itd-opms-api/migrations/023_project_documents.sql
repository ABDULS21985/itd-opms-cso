-- +goose Up
-- Migration 023: Project Documents — links projects to documents with enrichment metadata

CREATE TYPE project_document_category AS ENUM (
    'project_charter',
    'project_approval',
    'business_case',
    'business_requirements',
    'solution_architecture',
    'solution_design',
    'solution_brief',
    'technical_specification',
    'test_plan',
    'test_results',
    'user_manual',
    'training_material',
    'deployment_guide',
    'meeting_minutes',
    'status_report',
    'risk_register',
    'change_request',
    'sign_off',
    'closure_report',
    'other'
);

CREATE TABLE project_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    category      project_document_category NOT NULL DEFAULT 'other',
    label         TEXT,
    version       TEXT DEFAULT '1.0',
    display_order INT DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'active',
    uploaded_by   UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, document_id)
);

CREATE INDEX idx_pd_project  ON project_documents(project_id);
CREATE INDEX idx_pd_category ON project_documents(project_id, category);
CREATE INDEX idx_pd_status   ON project_documents(project_id, status);

-- +goose Down
DROP TABLE IF EXISTS project_documents;
DROP TYPE IF EXISTS project_document_category;

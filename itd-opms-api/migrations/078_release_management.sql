-- +goose Up
-- Migration 078: Release Management module
-- BRD §6.5 — Plan Deployment → Deploy/Release → Roll Back → Close-Out Report

-- ──────────────────────────────────────────────
-- releases table
-- ──────────────────────────────────────────────
CREATE TABLE releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    release_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    release_type TEXT NOT NULL CHECK (release_type IN ('major', 'minor', 'patch', 'emergency')),
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
        'planning', 'build', 'testing', 'approved', 'scheduled',
        'deploying', 'deployed', 'rolled_back', 'closed', 'cancelled'
    )),
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    release_manager_id UUID REFERENCES users(id),
    deployment_team UUID[] DEFAULT '{}',
    environment TEXT NOT NULL DEFAULT 'production'
        CHECK (environment IN ('development', 'testing', 'staging', 'production')),
    deployment_plan TEXT,
    rollback_plan TEXT,
    risk_assessment JSONB DEFAULT '{}',
    readiness_checklist JSONB DEFAULT '[]',
    change_ticket_ids UUID[] DEFAULT '{}',
    implementation_certificate JSONB,
    close_out_report TEXT,
    lessons_learned TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, release_number)
);

-- ──────────────────────────────────────────────
-- Auto-numbering trigger
-- ──────────────────────────────────────────────
CREATE SEQUENCE release_number_seq START WITH 1;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_release_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.release_number IS NULL OR NEW.release_number = '' THEN
        NEW.release_number := 'REL-' || lpad(nextval('release_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_release_number BEFORE INSERT ON releases
    FOR EACH ROW WHEN (NEW.release_number IS NULL OR NEW.release_number = '')
    EXECUTE FUNCTION set_release_number();

-- ──────────────────────────────────────────────
-- release_items (what's being released)
-- ──────────────────────────────────────────────
CREATE TABLE release_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN (
        'software', 'hardware', 'configuration', 'documentation', 'data_migration'
    )),
    name TEXT NOT NULL,
    version TEXT,
    description TEXT,
    ci_id UUID REFERENCES cmdb_items(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'built', 'tested', 'deployed', 'rolled_back', 'failed'
    )),
    deploy_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- release_deployments (execution tracking)
-- ──────────────────────────────────────────────
CREATE TABLE release_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    deployment_type TEXT NOT NULL CHECK (deployment_type IN (
        'full', 'pilot', 'canary', 'blue_green', 'rolling'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
    )),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- release_approvals (implementation certificate sign-offs)
-- ──────────────────────────────────────────────
CREATE TABLE release_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approval_type TEXT NOT NULL CHECK (approval_type IN (
        'uat_signoff', 'security_clearance', 'ditd_approval', 'operational_readiness'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected'
    )),
    comments TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────
CREATE INDEX idx_releases_tenant ON releases(tenant_id);
CREATE INDEX idx_releases_status ON releases(tenant_id, status);
CREATE INDEX idx_release_items_release ON release_items(release_id);
CREATE INDEX idx_release_deployments_release ON release_deployments(release_id);
CREATE INDEX idx_release_approvals_release ON release_approvals(release_id);

-- ──────────────────────────────────────────────
-- RBAC: seed release permissions into existing roles
-- ──────────────────────────────────────────────
UPDATE roles SET permissions = permissions || '["release.view", "release.manage"]'::jsonb
WHERE name IN ('global_admin', 'itd_director', 'service_owner', 'portfolio_manager')
  AND NOT permissions @> '"release.view"';

-- +goose Down
DROP TABLE IF EXISTS release_approvals;
DROP TABLE IF EXISTS release_deployments;
DROP TABLE IF EXISTS release_items;
DROP TRIGGER IF EXISTS trg_release_number ON releases;
DROP FUNCTION IF EXISTS set_release_number();
DROP SEQUENCE IF EXISTS release_number_seq;
DROP TABLE IF EXISTS releases;

-- Revert permissions
UPDATE roles SET permissions = permissions - 'release.view' - 'release.manage'
WHERE permissions @> '"release.view"';

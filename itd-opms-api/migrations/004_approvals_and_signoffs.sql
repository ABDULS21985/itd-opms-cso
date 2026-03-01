-- +goose Up
-- Migration 004: Workflow Definitions, Approval Chains, Steps, and Signoffs

-- Approval chain status
CREATE TYPE approval_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'cancelled');

-- Individual step decision
CREATE TYPE approval_decision AS ENUM ('pending', 'approved', 'rejected', 'skipped');

-- ──────────────────────────────────────────────
-- Workflow Definitions (configurable approval templates)
-- ──────────────────────────────────────────────
CREATE TABLE workflow_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    description     TEXT,
    entity_type     TEXT NOT NULL,  -- e.g., 'policy', 'change_request', 'disposal'
    steps           JSONB NOT NULL DEFAULT '[]',  -- ordered array of step definitions
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_defs_tenant ON workflow_definitions(tenant_id);
CREATE INDEX idx_workflow_defs_entity ON workflow_definitions(entity_type);

CREATE TRIGGER trg_workflow_defs_updated
    BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Approval Chains (instances of a workflow)
-- ──────────────────────────────────────────────
CREATE TABLE approval_chains (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type             TEXT NOT NULL,
    entity_id               UUID NOT NULL,
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    workflow_definition_id  UUID REFERENCES workflow_definitions(id),
    status                  approval_status NOT NULL DEFAULT 'pending',
    current_step            INT NOT NULL DEFAULT 1,
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ
);

CREATE INDEX idx_approval_chains_entity ON approval_chains(entity_type, entity_id);
CREATE INDEX idx_approval_chains_tenant ON approval_chains(tenant_id);
CREATE INDEX idx_approval_chains_status ON approval_chains(status) WHERE status IN ('pending', 'in_progress');

-- ──────────────────────────────────────────────
-- Approval Steps (individual approver decisions)
-- ──────────────────────────────────────────────
CREATE TABLE approval_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id        UUID NOT NULL REFERENCES approval_chains(id) ON DELETE CASCADE,
    step_order      INT NOT NULL,
    approver_id     UUID NOT NULL REFERENCES users(id),
    decision        approval_decision NOT NULL DEFAULT 'pending',
    comments        TEXT,
    decided_at      TIMESTAMPTZ,
    evidence_refs   UUID[] DEFAULT '{}',
    delegated_from  UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_steps_chain ON approval_steps(chain_id, step_order);
CREATE INDEX idx_approval_steps_approver ON approval_steps(approver_id) WHERE decision = 'pending';

-- ──────────────────────────────────────────────
-- Signoffs (formal sign-off records)
-- ──────────────────────────────────────────────
CREATE TABLE signoffs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    signer_id       UUID NOT NULL REFERENCES users(id),
    signer_role     TEXT NOT NULL,
    signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comments        TEXT,
    checksum        TEXT NOT NULL
);

CREATE INDEX idx_signoffs_entity ON signoffs(entity_type, entity_id);
CREATE INDEX idx_signoffs_signer ON signoffs(signer_id);

-- +goose Down
DROP TABLE IF EXISTS signoffs;
DROP TABLE IF EXISTS approval_steps;
DROP TABLE IF EXISTS approval_chains;
DROP TABLE IF EXISTS workflow_definitions;
DROP TYPE IF EXISTS approval_decision;
DROP TYPE IF EXISTS approval_status;

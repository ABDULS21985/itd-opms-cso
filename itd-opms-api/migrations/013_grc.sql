-- +goose Up
-- Migration 013: GRC (Governance, Risk & Compliance) & Audit Readiness Module
-- Supports: Risk register with heat map, risk assessments, audits with readiness scoring,
-- audit findings, evidence collections, access review campaigns, compliance controls.

-- ──────────────────────────────────────────────
-- Risks
-- ──────────────────────────────────────────────
CREATE TABLE risks (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id),
    risk_number          TEXT NOT NULL,
    title                TEXT NOT NULL,
    description          TEXT,
    category             TEXT NOT NULL DEFAULT 'operational',
    likelihood           TEXT NOT NULL DEFAULT 'medium' CHECK (likelihood IN ('very_low','low','medium','high','very_high')),
    impact               TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('very_low','low','medium','high','very_high')),
    risk_score           INT GENERATED ALWAYS AS (
        (CASE likelihood WHEN 'very_low' THEN 1 WHEN 'low' THEN 2 WHEN 'medium' THEN 3 WHEN 'high' THEN 4 WHEN 'very_high' THEN 5 END) *
        (CASE impact WHEN 'very_low' THEN 1 WHEN 'low' THEN 2 WHEN 'medium' THEN 3 WHEN 'high' THEN 4 WHEN 'very_high' THEN 5 END)
    ) STORED,
    status               TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified','assessed','mitigating','accepted','closed','escalated')),
    treatment_plan       TEXT,
    contingency_plan     TEXT,
    owner_id             UUID REFERENCES users(id),
    reviewer_id          UUID REFERENCES users(id),
    review_date          DATE,
    next_review_date     DATE,
    linked_project_id    UUID,
    linked_audit_id      UUID,
    escalation_threshold INT DEFAULT 15,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_risks_number_tenant ON risks(risk_number, tenant_id);
CREATE INDEX idx_risks_tenant_status ON risks(tenant_id, status);
CREATE INDEX idx_risks_tenant_score ON risks(tenant_id, risk_score);
CREATE INDEX idx_risks_owner ON risks(owner_id);

CREATE TRIGGER trg_risks_updated
    BEFORE UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Risk Assessments
-- ──────────────────────────────────────────────
CREATE TABLE risk_assessments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id             UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    assessed_by         UUID NOT NULL REFERENCES users(id),
    assessment_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    previous_likelihood TEXT,
    previous_impact     TEXT,
    new_likelihood      TEXT NOT NULL,
    new_impact          TEXT NOT NULL,
    rationale           TEXT,
    evidence_refs       UUID[] DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_assessments_risk ON risk_assessments(risk_id);
CREATE INDEX idx_risk_assessments_assessed_by ON risk_assessments(assessed_by);

-- ──────────────────────────────────────────────
-- Audits
-- ──────────────────────────────────────────────
CREATE TABLE audits (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES tenants(id),
    title                  TEXT NOT NULL,
    audit_type             TEXT NOT NULL DEFAULT 'internal' CHECK (audit_type IN ('internal','external','regulatory')),
    scope                  TEXT,
    auditor                TEXT,
    audit_body             TEXT,
    status                 TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','preparing','in_progress','findings_review','completed')),
    scheduled_start        DATE,
    scheduled_end          DATE,
    evidence_requirements  JSONB DEFAULT '[]',
    readiness_score        DECIMAL(5,2) DEFAULT 0,
    created_by             UUID NOT NULL REFERENCES users(id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audits_tenant_status ON audits(tenant_id, status);
CREATE INDEX idx_audits_created_by ON audits(created_by);

CREATE TRIGGER trg_audits_updated
    BEFORE UPDATE ON audits
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Audit Findings
-- ──────────────────────────────────────────────
CREATE TABLE audit_findings (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id                 UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    tenant_id                UUID NOT NULL REFERENCES tenants(id),
    finding_number           TEXT NOT NULL,
    title                    TEXT NOT NULL,
    description              TEXT,
    severity                 TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    status                   TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','remediation_planned','in_remediation','closed','accepted')),
    remediation_plan         TEXT,
    owner_id                 UUID REFERENCES users(id),
    due_date                 DATE,
    closed_at                TIMESTAMPTZ,
    evidence_of_remediation  UUID[] DEFAULT '{}',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_findings_audit ON audit_findings(audit_id);
CREATE INDEX idx_audit_findings_tenant_status ON audit_findings(tenant_id, status);
CREATE INDEX idx_audit_findings_owner ON audit_findings(owner_id);

CREATE TRIGGER trg_audit_findings_updated
    BEFORE UPDATE ON audit_findings
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Evidence Collections
-- ──────────────────────────────────────────────
CREATE TABLE evidence_collections (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id          UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    title             TEXT NOT NULL,
    description       TEXT,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','collecting','review','approved','submitted')),
    evidence_item_ids UUID[] DEFAULT '{}',
    collector_id      UUID REFERENCES users(id),
    reviewer_id       UUID REFERENCES users(id),
    approved_at       TIMESTAMPTZ,
    checksum          TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_collections_audit ON evidence_collections(audit_id);
CREATE INDEX idx_evidence_collections_tenant_status ON evidence_collections(tenant_id, status);

CREATE TRIGGER trg_evidence_collections_updated
    BEFORE UPDATE ON evidence_collections
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Access Review Campaigns
-- ──────────────────────────────────────────────
CREATE TABLE access_review_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    scope           TEXT,
    status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','review','completed')),
    reviewer_ids    UUID[] DEFAULT '{}',
    due_date        DATE,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_review_campaigns_tenant_status ON access_review_campaigns(tenant_id, status);
CREATE INDEX idx_access_review_campaigns_created_by ON access_review_campaigns(created_by);

CREATE TRIGGER trg_access_review_campaigns_updated
    BEFORE UPDATE ON access_review_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Access Review Entries
-- ──────────────────────────────────────────────
CREATE TABLE access_review_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID NOT NULL REFERENCES access_review_campaigns(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    user_id          UUID NOT NULL REFERENCES users(id),
    role_id          UUID,
    reviewer_id      UUID REFERENCES users(id),
    decision         TEXT CHECK (decision IN ('approved','revoked','exception')),
    justification    TEXT,
    exception_expiry DATE,
    decided_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_review_entries_campaign ON access_review_entries(campaign_id);
CREATE INDEX idx_access_review_entries_tenant_user ON access_review_entries(tenant_id, user_id);

-- ──────────────────────────────────────────────
-- Compliance Controls
-- ──────────────────────────────────────────────
CREATE TABLE compliance_controls (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id),
    framework             TEXT NOT NULL,
    control_id            TEXT NOT NULL,
    control_name          TEXT NOT NULL,
    description           TEXT,
    implementation_status TEXT NOT NULL DEFAULT 'not_started' CHECK (implementation_status IN ('not_started','partial','implemented','verified')),
    evidence_refs         UUID[] DEFAULT '{}',
    owner_id              UUID REFERENCES users(id),
    last_assessed_at      TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_controls_tenant_framework ON compliance_controls(tenant_id, framework);
CREATE INDEX idx_compliance_controls_tenant_status ON compliance_controls(tenant_id, implementation_status);
CREATE INDEX idx_compliance_controls_owner ON compliance_controls(owner_id);

CREATE TRIGGER trg_compliance_controls_updated
    BEFORE UPDATE ON compliance_controls
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- +goose Down
DROP TRIGGER IF EXISTS trg_compliance_controls_updated ON compliance_controls;
DROP TRIGGER IF EXISTS trg_access_review_campaigns_updated ON access_review_campaigns;
DROP TRIGGER IF EXISTS trg_evidence_collections_updated ON evidence_collections;
DROP TRIGGER IF EXISTS trg_audit_findings_updated ON audit_findings;
DROP TRIGGER IF EXISTS trg_audits_updated ON audits;
DROP TRIGGER IF EXISTS trg_risks_updated ON risks;

DROP INDEX IF EXISTS idx_compliance_controls_owner;
DROP INDEX IF EXISTS idx_compliance_controls_tenant_status;
DROP INDEX IF EXISTS idx_compliance_controls_tenant_framework;
DROP INDEX IF EXISTS idx_access_review_entries_tenant_user;
DROP INDEX IF EXISTS idx_access_review_entries_campaign;
DROP INDEX IF EXISTS idx_access_review_campaigns_created_by;
DROP INDEX IF EXISTS idx_access_review_campaigns_tenant_status;
DROP INDEX IF EXISTS idx_evidence_collections_tenant_status;
DROP INDEX IF EXISTS idx_evidence_collections_audit;
DROP INDEX IF EXISTS idx_audit_findings_owner;
DROP INDEX IF EXISTS idx_audit_findings_tenant_status;
DROP INDEX IF EXISTS idx_audit_findings_audit;
DROP INDEX IF EXISTS idx_audits_created_by;
DROP INDEX IF EXISTS idx_audits_tenant_status;
DROP INDEX IF EXISTS idx_risk_assessments_assessed_by;
DROP INDEX IF EXISTS idx_risk_assessments_risk;
DROP INDEX IF EXISTS idx_risks_owner;
DROP INDEX IF EXISTS idx_risks_tenant_score;
DROP INDEX IF EXISTS idx_risks_tenant_status;
DROP INDEX IF EXISTS idx_risks_number_tenant;

DROP TABLE IF EXISTS compliance_controls;
DROP TABLE IF EXISTS access_review_entries;
DROP TABLE IF EXISTS access_review_campaigns;
DROP TABLE IF EXISTS evidence_collections;
DROP TABLE IF EXISTS audit_findings;
DROP TABLE IF EXISTS audits;
DROP TABLE IF EXISTS risk_assessments;
DROP TABLE IF EXISTS risks;

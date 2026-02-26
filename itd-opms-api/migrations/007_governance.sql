-- +goose Up
-- Migration 007: Governance Module
-- Supports: Policies & attestation campaigns, RACI matrices, Meetings & decisions,
-- Action items, OKRs & key results, KPIs.

-- ──────────────────────────────────────────────
-- Policies
-- ──────────────────────────────────────────────
CREATE TABLE policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    description     TEXT,
    category        TEXT NOT NULL,
    tags            TEXT[],
    scope_type      TEXT NOT NULL DEFAULT 'tenant',
    scope_tenant_ids UUID[],
    status          TEXT NOT NULL DEFAULT 'draft',
    version         INT NOT NULL DEFAULT 1,
    content         TEXT NOT NULL,
    effective_date  DATE,
    review_date     DATE,
    expiry_date     DATE,
    owner_id        UUID REFERENCES users(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_tenant ON policies(tenant_id);
CREATE INDEX idx_policies_status ON policies(tenant_id, status);
CREATE INDEX idx_policies_category ON policies(tenant_id, category);
CREATE INDEX idx_policies_owner ON policies(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_policies_review_date ON policies(review_date) WHERE review_date IS NOT NULL;

CREATE TRIGGER trg_policies_updated
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Policy Versions (immutable history)
-- ──────────────────────────────────────────────
CREATE TABLE policy_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    changes_summary TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(policy_id, version)
);

CREATE INDEX idx_policy_versions_policy ON policy_versions(policy_id);

-- ──────────────────────────────────────────────
-- Attestation Campaigns
-- ──────────────────────────────────────────────
CREATE TABLE attestation_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    policy_id       UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    policy_version  INT NOT NULL,
    target_scope    TEXT NOT NULL,
    target_user_ids UUID[],
    due_date        DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attestation_campaigns_tenant ON attestation_campaigns(tenant_id);
CREATE INDEX idx_attestation_campaigns_policy ON attestation_campaigns(policy_id);
CREATE INDEX idx_attestation_campaigns_status ON attestation_campaigns(tenant_id, status);

-- ──────────────────────────────────────────────
-- Policy Attestations
-- ──────────────────────────────────────────────
CREATE TABLE policy_attestations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    policy_version  INT NOT NULL,
    user_id         UUID NOT NULL REFERENCES users(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    attested_at     TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'pending',
    campaign_id     UUID REFERENCES attestation_campaigns(id) ON DELETE SET NULL,
    reminder_sent_at TIMESTAMPTZ,
    UNIQUE(policy_id, policy_version, user_id)
);

CREATE INDEX idx_policy_attestations_policy ON policy_attestations(policy_id);
CREATE INDEX idx_policy_attestations_tenant ON policy_attestations(tenant_id);
CREATE INDEX idx_policy_attestations_user ON policy_attestations(user_id);
CREATE INDEX idx_policy_attestations_campaign ON policy_attestations(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_policy_attestations_status ON policy_attestations(status);

-- ──────────────────────────────────────────────
-- RACI Matrices
-- ──────────────────────────────────────────────
CREATE TABLE raci_matrices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       UUID,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'draft',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raci_matrices_tenant ON raci_matrices(tenant_id);
CREATE INDEX idx_raci_matrices_entity ON raci_matrices(entity_type, entity_id) WHERE entity_id IS NOT NULL;

CREATE TRIGGER trg_raci_matrices_updated
    BEFORE UPDATE ON raci_matrices
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- RACI Entries
-- ──────────────────────────────────────────────
CREATE TABLE raci_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matrix_id       UUID NOT NULL REFERENCES raci_matrices(id) ON DELETE CASCADE,
    activity        TEXT NOT NULL,
    responsible_ids UUID[] NOT NULL,
    accountable_id  UUID NOT NULL,
    consulted_ids   UUID[],
    informed_ids    UUID[],
    notes           TEXT
);

CREATE INDEX idx_raci_entries_matrix ON raci_entries(matrix_id);

-- ──────────────────────────────────────────────
-- Meetings
-- ──────────────────────────────────────────────
CREATE TABLE meetings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    title               TEXT NOT NULL,
    meeting_type        TEXT,
    agenda              TEXT,
    minutes             TEXT,
    location            TEXT,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    duration_minutes    INT,
    recurrence_rule     TEXT,
    template_agenda     TEXT,
    attendee_ids        UUID[],
    organizer_id        UUID NOT NULL REFERENCES users(id),
    status              TEXT NOT NULL DEFAULT 'scheduled',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_tenant ON meetings(tenant_id);
CREATE INDEX idx_meetings_status ON meetings(tenant_id, status);
CREATE INDEX idx_meetings_scheduled ON meetings(tenant_id, scheduled_at);
CREATE INDEX idx_meetings_organizer ON meetings(organizer_id);

-- ──────────────────────────────────────────────
-- Meeting Decisions
-- ──────────────────────────────────────────────
CREATE TABLE meeting_decisions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id          UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    decision_number     TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    rationale           TEXT,
    impact_assessment   TEXT,
    decided_by_ids      UUID[],
    status              TEXT NOT NULL DEFAULT 'active',
    evidence_refs       UUID[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meeting_decisions_meeting ON meeting_decisions(meeting_id);
CREATE INDEX idx_meeting_decisions_tenant ON meeting_decisions(tenant_id);

-- ──────────────────────────────────────────────
-- Action Items
-- ──────────────────────────────────────────────
CREATE TABLE action_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    source_type         TEXT NOT NULL,
    source_id           UUID NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    owner_id            UUID NOT NULL REFERENCES users(id),
    due_date            DATE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'open',
    completion_evidence TEXT,
    completed_at        TIMESTAMPTZ,
    priority            TEXT NOT NULL DEFAULT 'medium',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_action_items_tenant ON action_items(tenant_id);
CREATE INDEX idx_action_items_status ON action_items(tenant_id, status);
CREATE INDEX idx_action_items_source ON action_items(source_type, source_id);
CREATE INDEX idx_action_items_owner ON action_items(owner_id);
CREATE INDEX idx_action_items_due_date ON action_items(due_date);
CREATE INDEX idx_action_items_overdue ON action_items(status, due_date) WHERE status IN ('open', 'in_progress');

-- ──────────────────────────────────────────────
-- OKRs (Objectives and Key Results)
-- ──────────────────────────────────────────────
CREATE TABLE okrs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    parent_id       UUID REFERENCES okrs(id),
    level           TEXT NOT NULL,
    scope_id        UUID,
    objective       TEXT NOT NULL,
    period          TEXT NOT NULL,
    owner_id        UUID NOT NULL REFERENCES users(id),
    status          TEXT NOT NULL DEFAULT 'draft',
    progress_pct    DECIMAL(5,2) DEFAULT 0,
    scoring_method  TEXT NOT NULL DEFAULT 'percentage',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_okrs_tenant ON okrs(tenant_id);
CREATE INDEX idx_okrs_status ON okrs(tenant_id, status);
CREATE INDEX idx_okrs_parent ON okrs(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_okrs_period ON okrs(tenant_id, period);
CREATE INDEX idx_okrs_owner ON okrs(owner_id);

-- ──────────────────────────────────────────────
-- Key Results
-- ──────────────────────────────────────────────
CREATE TABLE key_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    okr_id          UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    target_value    DECIMAL,
    current_value   DECIMAL DEFAULT 0,
    unit            TEXT,
    status          TEXT NOT NULL DEFAULT 'on_track',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_key_results_okr ON key_results(okr_id);

CREATE TRIGGER trg_key_results_updated
    BEFORE UPDATE ON key_results
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- KPIs (Key Performance Indicators)
-- ──────────────────────────────────────────────
CREATE TABLE kpis (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    name                TEXT NOT NULL,
    description         TEXT,
    formula             TEXT,
    target_value        DECIMAL,
    warning_threshold   DECIMAL,
    critical_threshold  DECIMAL,
    current_value       DECIMAL,
    unit                TEXT,
    frequency           TEXT NOT NULL DEFAULT 'monthly',
    owner_id            UUID REFERENCES users(id),
    last_updated_at     TIMESTAMPTZ
);

CREATE INDEX idx_kpis_tenant ON kpis(tenant_id);
CREATE INDEX idx_kpis_owner ON kpis(owner_id) WHERE owner_id IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS kpis;
DROP TABLE IF EXISTS key_results;
DROP TABLE IF EXISTS okrs;
DROP TABLE IF EXISTS action_items;
DROP TABLE IF EXISTS meeting_decisions;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS raci_entries;
DROP TABLE IF EXISTS raci_matrices;
DROP TABLE IF EXISTS policy_attestations;
DROP TABLE IF EXISTS attestation_campaigns;
DROP TABLE IF EXISTS policy_versions;
DROP TABLE IF EXISTS policies;

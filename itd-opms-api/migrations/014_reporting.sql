-- +goose Up
-- Migration 014: Reporting & Analytics Module
-- Supports: Configurable report definitions, scheduled report runs, dashboard caching,
-- saved searches, and materialized views for executive dashboard aggregations.

-- ──────────────────────────────────────────────
-- Report Definitions
-- ──────────────────────────────────────────────
CREATE TABLE report_definitions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    name          TEXT NOT NULL,
    description   TEXT,
    type          TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('executive_pack','sla_report','asset_report','grc_report','pmo_report','custom')),
    template      JSONB NOT NULL DEFAULT '{}',
    schedule_cron TEXT,
    recipients    UUID[] DEFAULT '{}',
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_by    UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_definitions_tenant_type ON report_definitions(tenant_id, type);
CREATE INDEX idx_report_definitions_tenant_active ON report_definitions(tenant_id, is_active);
CREATE INDEX idx_report_definitions_created_by ON report_definitions(created_by);

CREATE TRIGGER trg_report_definitions_updated
    BEFORE UPDATE ON report_definitions
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Report Runs
-- ──────────────────────────────────────────────
CREATE TABLE report_runs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','completed','failed')),
    generated_at  TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    document_id   UUID,
    data_snapshot JSONB DEFAULT '{}',
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_runs_definition ON report_runs(definition_id);
CREATE INDEX idx_report_runs_tenant_status ON report_runs(tenant_id, status);
CREATE INDEX idx_report_runs_tenant_generated ON report_runs(tenant_id, generated_at DESC);

-- ──────────────────────────────────────────────
-- Dashboard Cache
-- ──────────────────────────────────────────────
CREATE TABLE dashboard_cache (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id),
    cache_key  TEXT NOT NULL,
    data       JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, cache_key)
);

CREATE TRIGGER trg_dashboard_cache_updated
    BEFORE UPDATE ON dashboard_cache
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Saved Searches
-- ──────────────────────────────────────────────
CREATE TABLE saved_searches (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    user_id      UUID NOT NULL REFERENCES users(id),
    query        TEXT NOT NULL,
    entity_types TEXT[] DEFAULT '{}',
    is_saved     BOOLEAN NOT NULL DEFAULT false,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_user_recent ON saved_searches(tenant_id, user_id, last_used_at DESC);
CREATE INDEX idx_saved_searches_user_saved ON saved_searches(tenant_id, user_id, is_saved);

-- ──────────────────────────────────────────────
-- Materialized View: Executive Dashboard Summary
-- ──────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_executive_summary AS
SELECT
    t.id AS tenant_id,
    -- Governance
    (SELECT COUNT(*) FROM policies p WHERE p.tenant_id = t.id AND p.status = 'active') AS active_policies,
    (SELECT COUNT(*) FROM action_items ai WHERE ai.tenant_id = t.id AND ai.status != 'completed' AND ai.due_date < CURRENT_DATE) AS overdue_actions,
    (SELECT COALESCE(AVG(progress_pct), 0) FROM okrs o WHERE o.tenant_id = t.id AND o.status = 'active') AS avg_okr_progress,
    -- ITSM
    (SELECT COUNT(*) FROM tickets tk WHERE tk.tenant_id = t.id AND tk.status NOT IN ('resolved','closed')) AS open_tickets,
    (SELECT COUNT(*) FROM tickets tk WHERE tk.tenant_id = t.id AND tk.status NOT IN ('resolved','closed') AND tk.priority = 'critical') AS critical_tickets,
    -- PMO
    (SELECT COUNT(*) FROM projects pj WHERE pj.tenant_id = t.id AND pj.status = 'active') AS active_projects,
    -- CMDB
    (SELECT COUNT(*) FROM assets a WHERE a.tenant_id = t.id AND a.status = 'active') AS active_assets,
    (SELECT COUNT(*) FROM licenses l WHERE l.tenant_id = t.id AND l.compliance_status = 'over_deployed') AS over_deployed_licenses,
    -- GRC
    (SELECT COUNT(*) FROM risks rk WHERE rk.tenant_id = t.id AND rk.status NOT IN ('closed','accepted') AND rk.risk_score >= 12) AS high_risks,
    -- People
    (SELECT COUNT(*) FROM training_records tr WHERE tr.tenant_id = t.id AND tr.expiry_date IS NOT NULL AND tr.expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_certs,
    -- Timestamp
    now() AS refreshed_at
FROM tenants t;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_executive_summary_tenant ON mv_executive_summary(tenant_id);

-- +goose Down
DROP INDEX IF EXISTS idx_mv_executive_summary_tenant;
DROP MATERIALIZED VIEW IF EXISTS mv_executive_summary;

DROP TRIGGER IF EXISTS trg_dashboard_cache_updated ON dashboard_cache;
DROP TRIGGER IF EXISTS trg_report_definitions_updated ON report_definitions;

DROP INDEX IF EXISTS idx_saved_searches_user_saved;
DROP INDEX IF EXISTS idx_saved_searches_user_recent;
DROP INDEX IF EXISTS idx_report_runs_tenant_generated;
DROP INDEX IF EXISTS idx_report_runs_tenant_status;
DROP INDEX IF EXISTS idx_report_runs_definition;
DROP INDEX IF EXISTS idx_report_definitions_created_by;
DROP INDEX IF EXISTS idx_report_definitions_tenant_active;
DROP INDEX IF EXISTS idx_report_definitions_tenant_type;

DROP TABLE IF EXISTS saved_searches;
DROP TABLE IF EXISTS dashboard_cache;
DROP TABLE IF EXISTS report_runs;
DROP TABLE IF EXISTS report_definitions;

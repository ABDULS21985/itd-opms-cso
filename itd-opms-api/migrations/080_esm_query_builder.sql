-- +goose Up
-- Migration 080: Ad-hoc query builder — saved_queries table and scheduled-report template.

-- ──────────────────────────────────────────────
-- 1. saved_queries table
-- ──────────────────────────────────────────────
CREATE TABLE saved_queries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    name             TEXT NOT NULL,
    description      TEXT,
    entity_type      TEXT NOT NULL CHECK (entity_type IN (
        'tickets', 'assets', 'cmdb_items', 'problems', 'changes',
        'releases', 'service_requests', 'kb_articles'
    )),
    filters          JSONB NOT NULL DEFAULT '[]',
    columns          TEXT[] NOT NULL,
    sort_by          TEXT,
    sort_order       TEXT DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
    group_by         TEXT,
    chart_type       TEXT CHECK (chart_type IN ('table', 'bar', 'line', 'pie', 'donut')),
    is_shared        BOOLEAN DEFAULT false,
    schedule         TEXT,               -- cron expression (5-field)
    email_recipients TEXT[] DEFAULT '{}',
    created_by       UUID NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_queries_tenant ON saved_queries(tenant_id);
CREATE INDEX idx_saved_queries_created_by ON saved_queries(tenant_id, created_by);

CREATE TRIGGER trg_saved_queries_updated
    BEFORE UPDATE ON saved_queries
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 2. query_runs — tracks scheduled/manual query executions
-- ──────────────────────────────────────────────
CREATE TABLE query_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_query_id  UUID NOT NULL REFERENCES saved_queries(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    trigger_source  TEXT NOT NULL DEFAULT 'manual'
                        CHECK (trigger_source IN ('manual', 'schedule')),
    scheduled_for   TIMESTAMPTZ,
    generated_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    row_count       INT DEFAULT 0,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_query_runs_saved_query ON query_runs(saved_query_id);
CREATE INDEX idx_query_runs_tenant_status ON query_runs(tenant_id, status);

-- ──────────────────────────────────────────────
-- 3. Notification template for scheduled report delivery
-- ──────────────────────────────────────────────
INSERT INTO notification_templates (id, key, name, channel, subject_template, body_template, version, is_active)
VALUES (
    gen_random_uuid(),
    'scheduled-report-delivery',
    'Scheduled Report Email Delivery',
    'email',
    'Scheduled Report: {{.QueryName}}',
    '<p>Hello,</p>
<p>Your scheduled report <strong>{{.QueryName}}</strong> has been generated.</p>
<p><strong>Entity type:</strong> {{.EntityType}}</p>
<p><strong>Rows returned:</strong> {{.RowCount}}</p>
<p>The report is attached as a CSV file. You can also view and re-run this query in the <a href="{{.PortalURL}}">Query Builder</a>.</p>
<p>This is an automated message from ITD-OPMS.</p>',
    1,
    true
)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS query_runs;
DROP TRIGGER IF EXISTS trg_saved_queries_updated ON saved_queries;
DROP TABLE IF EXISTS saved_queries;
DELETE FROM notification_templates WHERE key = 'scheduled-report-delivery';

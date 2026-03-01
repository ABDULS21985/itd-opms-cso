-- +goose Up
-- Migration 025: Change Calendar & Maintenance Windows

CREATE TABLE IF NOT EXISTS maintenance_windows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    description     TEXT,
    window_type     TEXT NOT NULL CHECK (window_type IN ('maintenance', 'deployment', 'release', 'freeze', 'outage')),
    status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    is_all_day      BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,
    affected_services TEXT[] DEFAULT '{}',
    impact_level    TEXT DEFAULT 'low' CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
    change_request_id UUID REFERENCES change_requests(id),
    ticket_id       UUID,
    project_id      UUID REFERENCES projects(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_tenant ON maintenance_windows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_dates ON maintenance_windows(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_status ON maintenance_windows(status) WHERE status IN ('scheduled', 'in_progress');

CREATE TRIGGER trg_maintenance_windows_updated
    BEFORE UPDATE ON maintenance_windows
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Change freeze periods
CREATE TABLE IF NOT EXISTS change_freeze_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    reason          TEXT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    exceptions      JSONB DEFAULT '[]',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_freeze_periods_dates ON change_freeze_periods(start_time, end_time);

-- +goose Down
DROP TRIGGER IF EXISTS trg_maintenance_windows_updated ON maintenance_windows;
DROP TABLE IF EXISTS change_freeze_periods;
DROP TABLE IF EXISTS maintenance_windows;

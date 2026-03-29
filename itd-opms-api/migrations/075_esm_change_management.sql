-- +goose Up
-- Migration 075: ESM Change Management
-- Adds change-specific columns to tickets and creates cab_meetings table.

-- ──────────────────────────────────────────────
-- Change-specific columns on tickets
-- ──────────────────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS change_classification TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS change_type TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS risk_assessment JSONB;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS implementation_plan TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rollback_plan TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS test_plan TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cab_required BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cab_meeting_id UUID;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cab_decision TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cab_decision_date TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pir_required BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pir_completed BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pir_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_change_classification ON tickets(tenant_id, change_classification) WHERE type = 'change';
CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_dates ON tickets(scheduled_start, scheduled_end) WHERE type = 'change';
CREATE INDEX IF NOT EXISTS idx_tickets_cab_meeting ON tickets(cab_meeting_id) WHERE cab_meeting_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- CAB Meetings
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cab_meetings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    description     TEXT,
    scheduled_date  TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    chair_id        UUID REFERENCES users(id),
    attendees       UUID[] DEFAULT '{}',
    minutes         TEXT,
    decisions       JSONB DEFAULT '[]',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cab_meetings_tenant ON cab_meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cab_meetings_date ON cab_meetings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cab_meetings_status ON cab_meetings(tenant_id, status);

CREATE TRIGGER trg_cab_meetings_updated
    BEFORE UPDATE ON cab_meetings
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- RLS
ALTER TABLE cab_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY cab_meetings_tenant_isolation ON cab_meetings
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- FK from tickets.cab_meeting_id
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_cab_meeting
    FOREIGN KEY (cab_meeting_id) REFERENCES cab_meetings(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_cab_meeting;

DROP TRIGGER IF EXISTS trg_cab_meetings_updated ON cab_meetings;
DROP TABLE IF EXISTS cab_meetings;

DROP INDEX IF EXISTS idx_tickets_cab_meeting;
DROP INDEX IF EXISTS idx_tickets_scheduled_dates;
DROP INDEX IF EXISTS idx_tickets_change_classification;

ALTER TABLE tickets DROP COLUMN IF EXISTS pir_notes;
ALTER TABLE tickets DROP COLUMN IF EXISTS pir_completed;
ALTER TABLE tickets DROP COLUMN IF EXISTS pir_required;
ALTER TABLE tickets DROP COLUMN IF EXISTS cab_decision_date;
ALTER TABLE tickets DROP COLUMN IF EXISTS cab_decision;
ALTER TABLE tickets DROP COLUMN IF EXISTS cab_meeting_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS cab_required;
ALTER TABLE tickets DROP COLUMN IF EXISTS actual_end;
ALTER TABLE tickets DROP COLUMN IF EXISTS actual_start;
ALTER TABLE tickets DROP COLUMN IF EXISTS scheduled_end;
ALTER TABLE tickets DROP COLUMN IF EXISTS scheduled_start;
ALTER TABLE tickets DROP COLUMN IF EXISTS test_plan;
ALTER TABLE tickets DROP COLUMN IF EXISTS rollback_plan;
ALTER TABLE tickets DROP COLUMN IF EXISTS implementation_plan;
ALTER TABLE tickets DROP COLUMN IF EXISTS risk_assessment;
ALTER TABLE tickets DROP COLUMN IF EXISTS risk_level;
ALTER TABLE tickets DROP COLUMN IF EXISTS change_type;
ALTER TABLE tickets DROP COLUMN IF EXISTS change_classification;

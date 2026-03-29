-- +goose Up
-- Migration 077: ESM Change Management v2
-- Adds missing BRD columns, CHECK constraints, and change-freeze trigger.

-- ──────────────────────────────────────────────
-- tickets: missing columns
-- ──────────────────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cab_notes TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS change_success BOOLEAN;

-- ──────────────────────────────────────────────
-- tickets: CHECK constraints on change enum columns
-- ──────────────────────────────────────────────
ALTER TABLE tickets ADD CONSTRAINT chk_change_classification
    CHECK (change_classification IS NULL OR change_classification IN ('emergency', 'standard', 'normal'));

ALTER TABLE tickets ADD CONSTRAINT chk_change_type
    CHECK (change_type IS NULL OR change_type IN ('application', 'infrastructure', 'network', 'security'));

ALTER TABLE tickets ADD CONSTRAINT chk_risk_level
    CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE tickets ADD CONSTRAINT chk_cab_decision
    CHECK (cab_decision IS NULL OR cab_decision IN ('approved', 'rejected', 'deferred', 'conditionally_approved'));

-- ──────────────────────────────────────────────
-- cab_meetings: missing columns
-- ──────────────────────────────────────────────
ALTER TABLE cab_meetings ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60;
ALTER TABLE cab_meetings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE cab_meetings ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE cab_meetings ADD CONSTRAINT chk_cab_meeting_type
    CHECK (meeting_type IN ('regular', 'emergency'));
ALTER TABLE cab_meetings ADD COLUMN IF NOT EXISTS secretary_user_id UUID REFERENCES users(id);
ALTER TABLE cab_meetings ADD COLUMN IF NOT EXISTS agenda JSONB DEFAULT '[]';
ALTER TABLE cab_meetings ADD COLUMN IF NOT EXISTS change_ticket_ids UUID[] DEFAULT '{}';

-- ──────────────────────────────────────────────
-- change-freeze enforcement trigger
-- ──────────────────────────────────────────────
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION check_change_freeze() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'change'
       AND NEW.scheduled_start IS NOT NULL
       AND (NEW.change_classification IS NULL OR NEW.change_classification <> 'emergency')
    THEN
        IF EXISTS (
            SELECT 1
            FROM change_freeze_periods cfp
            WHERE cfp.tenant_id = NEW.tenant_id
              AND cfp.start_time <= COALESCE(NEW.scheduled_end, NEW.scheduled_start)
              AND cfp.end_time >= NEW.scheduled_start
        ) THEN
            RAISE EXCEPTION 'Change blocked: scheduled dates overlap with a freeze period';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_check_change_freeze
    BEFORE INSERT OR UPDATE ON tickets
    FOR EACH ROW
    WHEN (NEW.type = 'change')
    EXECUTE FUNCTION check_change_freeze();

-- +goose Down
DROP TRIGGER IF EXISTS trg_check_change_freeze ON tickets;
DROP FUNCTION IF EXISTS check_change_freeze();

ALTER TABLE cab_meetings DROP COLUMN IF EXISTS change_ticket_ids;
ALTER TABLE cab_meetings DROP COLUMN IF EXISTS agenda;
ALTER TABLE cab_meetings DROP COLUMN IF EXISTS secretary_user_id;
ALTER TABLE cab_meetings DROP CONSTRAINT IF EXISTS chk_cab_meeting_type;
ALTER TABLE cab_meetings DROP COLUMN IF EXISTS meeting_type;
ALTER TABLE cab_meetings DROP COLUMN IF EXISTS location;
ALTER TABLE cab_meetings DROP COLUMN IF EXISTS duration_minutes;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_cab_decision;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_risk_level;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_change_type;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_change_classification;

ALTER TABLE tickets DROP COLUMN IF EXISTS change_success;
ALTER TABLE tickets DROP COLUMN IF EXISTS cab_notes;

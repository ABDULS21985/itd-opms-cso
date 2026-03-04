-- +goose Up
-- Migration 024: Approval Engine Enhancements

-- Add fields to workflow_definitions for richer configuration
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS auto_assign_rules JSONB DEFAULT '{}';

-- Add urgency and deadline support to approval chains
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical'));
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add delegation and reminder tracking to approval steps
ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Approval delegation log
CREATE TABLE IF NOT EXISTS approval_delegations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    step_id         UUID NOT NULL REFERENCES approval_steps(id),
    delegated_by    UUID NOT NULL REFERENCES users(id),
    delegated_to    UUID NOT NULL REFERENCES users(id),
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_delegations_step ON approval_delegations(step_id);

-- Approval notifications log
CREATE TABLE IF NOT EXISTS approval_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id        UUID NOT NULL REFERENCES approval_chains(id),
    step_id         UUID REFERENCES approval_steps(id),
    recipient_id    UUID NOT NULL REFERENCES users(id),
    notification_type TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_notifications_recipient ON approval_notifications(recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_notifications_chain ON approval_notifications(chain_id);

-- +goose Down
DROP TABLE IF EXISTS approval_notifications;
DROP TABLE IF EXISTS approval_delegations;
ALTER TABLE approval_steps DROP COLUMN IF EXISTS deadline;
ALTER TABLE approval_steps DROP COLUMN IF EXISTS reminder_sent_at;
ALTER TABLE approval_chains DROP COLUMN IF EXISTS metadata;
ALTER TABLE approval_chains DROP COLUMN IF EXISTS urgency;
ALTER TABLE approval_chains DROP COLUMN IF EXISTS deadline;
ALTER TABLE workflow_definitions DROP COLUMN IF EXISTS auto_assign_rules;
ALTER TABLE workflow_definitions DROP COLUMN IF EXISTS version;

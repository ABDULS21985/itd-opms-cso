-- +goose Up
-- ESM BRD: Escalation event tracking for automated escalation worker.

CREATE TABLE IF NOT EXISTS escalation_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    ticket_id     UUID NOT NULL REFERENCES tickets(id),
    rule_id       UUID NOT NULL REFERENCES escalation_rules(id),
    trigger_type  TEXT NOT NULL,
    action_taken  TEXT NOT NULL,
    details       JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_escalation_events_ticket ON escalation_events(ticket_id);
CREATE INDEX idx_escalation_events_tenant ON escalation_events(tenant_id);

-- Deduplication: prevent the same rule from firing on the same ticket more
-- than once per hour.
CREATE UNIQUE INDEX idx_escalation_events_dedup
    ON escalation_events(ticket_id, rule_id, DATE_TRUNC('hour', created_at AT TIME ZONE 'UTC'));

-- +goose Down
DROP TABLE IF EXISTS escalation_events;

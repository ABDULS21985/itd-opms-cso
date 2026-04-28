-- +goose Up
-- Allow SLA/escalation events to target tickets and service requests.

ALTER TABLE escalation_events
    ADD COLUMN IF NOT EXISTS entity_type TEXT,
    ADD COLUMN IF NOT EXISTS entity_id UUID;

UPDATE escalation_events
SET entity_type = COALESCE(entity_type, 'ticket'),
    entity_id = COALESCE(entity_id, ticket_id)
WHERE entity_type IS NULL OR entity_id IS NULL;

ALTER TABLE escalation_events
    ALTER COLUMN entity_type SET DEFAULT 'ticket',
    ALTER COLUMN entity_type SET NOT NULL,
    ALTER COLUMN entity_id SET NOT NULL;

ALTER TABLE escalation_events DROP CONSTRAINT IF EXISTS escalation_events_entity_type_check;
ALTER TABLE escalation_events ADD CONSTRAINT escalation_events_entity_type_check
    CHECK (entity_type IN ('ticket', 'service_request'));

ALTER TABLE escalation_events
    ALTER COLUMN ticket_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escalation_events_entity
    ON escalation_events(entity_type, entity_id);

DROP INDEX IF EXISTS idx_escalation_events_entity_dedup;
CREATE UNIQUE INDEX idx_escalation_events_entity_dedup
    ON escalation_events(entity_type, entity_id, rule_id, DATE_TRUNC('hour', created_at AT TIME ZONE 'UTC'));

-- +goose Down
DROP INDEX IF EXISTS idx_escalation_events_entity_dedup;
DROP INDEX IF EXISTS idx_escalation_events_entity;

ALTER TABLE escalation_events DROP CONSTRAINT IF EXISTS escalation_events_entity_type_check;

DELETE FROM escalation_events
WHERE entity_type <> 'ticket';

UPDATE escalation_events
SET ticket_id = entity_id
WHERE entity_type = 'ticket' AND ticket_id IS NULL;

ALTER TABLE escalation_events
    ALTER COLUMN ticket_id SET NOT NULL;

ALTER TABLE escalation_events
    DROP COLUMN IF EXISTS entity_id,
    DROP COLUMN IF EXISTS entity_type;

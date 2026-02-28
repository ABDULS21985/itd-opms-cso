-- +goose Up
-- Migration 029: Workflow Automation Rules

CREATE TABLE IF NOT EXISTS automation_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'condition')),
    trigger_config  JSONB NOT NULL,
    condition_config JSONB DEFAULT '{}',
    actions         JSONB NOT NULL DEFAULT '[]',
    max_executions_per_hour INT DEFAULT 100,
    cooldown_minutes        INT DEFAULT 0,
    execution_count INT NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);

CREATE TRIGGER trg_automation_rules_updated
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TABLE IF NOT EXISTS automation_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID NOT NULL REFERENCES automation_rules(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    trigger_event   JSONB,
    entity_type     TEXT,
    entity_id       UUID,
    actions_taken   JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
    error_message   TEXT,
    duration_ms     INT,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_entity ON automation_executions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status) WHERE status != 'success';
CREATE INDEX IF NOT EXISTS idx_automation_executions_date ON automation_executions(executed_at);

-- +goose Down
DROP TABLE IF EXISTS automation_executions;
DROP TRIGGER IF EXISTS trg_automation_rules_updated ON automation_rules;
DROP TABLE IF EXISTS automation_rules;

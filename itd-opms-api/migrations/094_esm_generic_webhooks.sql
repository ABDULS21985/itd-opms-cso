-- +goose Up

-- Configurable webhook endpoints for arbitrary external system integrations.
CREATE TABLE webhook_endpoints (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    name              TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,          -- globally unique; URL path: /api/v1/webhooks/custom/{slug}
    description       TEXT,
    secret            TEXT NOT NULL,                 -- HMAC-SHA256 verification secret
    is_active         BOOLEAN DEFAULT true,
    payload_transform JSONB DEFAULT '{}',            -- {"mapping": {"title": "$.alert.name", ...}}
    target_action     TEXT NOT NULL CHECK (target_action IN (
        'create_ticket', 'update_ticket', 'create_ci', 'trigger_notification', 'log_only'
    )),
    last_received_at  TIMESTAMPTZ,
    total_received    INT DEFAULT 0,
    total_errors      INT DEFAULT 0,
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);

-- Execution log for every received webhook invocation.
CREATE TABLE webhook_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_ip       TEXT,
    headers         JSONB,
    payload         JSONB,
    signature_valid BOOLEAN,
    action_taken    TEXT,
    action_result   JSONB,
    error           TEXT
);

CREATE INDEX idx_webhook_logs_endpoint ON webhook_logs(endpoint_id, received_at DESC);

CREATE TRIGGER set_updated_at_webhook_endpoints
    BEFORE UPDATE ON webhook_endpoints
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS webhook_logs;
DROP TABLE IF EXISTS webhook_endpoints;

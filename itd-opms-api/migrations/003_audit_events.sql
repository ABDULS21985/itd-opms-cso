-- +goose Up
-- Migration 003: Audit Events (APPEND-ONLY, immutable)

-- ──────────────────────────────────────────────
-- Audit Events table — CRITICAL for CBN compliance
-- NO UPDATE/DELETE operations allowed
-- ──────────────────────────────────────────────
CREATE TABLE audit_events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    actor_id        UUID NOT NULL REFERENCES users(id),
    actor_role      TEXT NOT NULL,
    action          TEXT NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    changes         JSONB,
    previous_state  JSONB,
    evidence_refs   UUID[] DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    correlation_id  UUID,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum        TEXT NOT NULL
);

-- Performance indexes
CREATE INDEX idx_audit_tenant_time ON audit_events(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_action ON audit_events(action);
CREATE INDEX idx_audit_correlation ON audit_events(correlation_id) WHERE correlation_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- Trigger: compute SHA-256 checksum on INSERT
-- ──────────────────────────────────────────────
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_audit_checksum()
RETURNS TRIGGER AS $$
BEGIN
    NEW.checksum = encode(
        sha256(
            convert_to(
                COALESCE(NEW.tenant_id::text, '') || '|' ||
                COALESCE(NEW.actor_id::text, '') || '|' ||
                COALESCE(NEW.action, '') || '|' ||
                COALESCE(NEW.entity_type, '') || '|' ||
                COALESCE(NEW.entity_id::text, '') || '|' ||
                COALESCE(NEW.changes::text, '') || '|' ||
                COALESCE(NEW.timestamp::text, ''),
                'UTF8'
            )
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_audit_checksum
    BEFORE INSERT ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_checksum();

-- ──────────────────────────────────────────────
-- REVOKE UPDATE and DELETE on audit_events
-- The application role should not be able to modify audit records
-- NOTE: Execute this after creating the application role
-- ──────────────────────────────────────────────
-- REVOKE UPDATE, DELETE ON audit_events FROM opms_app;

-- Create a rule to prevent UPDATE/DELETE at the SQL level
CREATE RULE no_update_audit AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_events DO INSTEAD NOTHING;

-- +goose Down
DROP RULE IF EXISTS no_delete_audit ON audit_events;
DROP RULE IF EXISTS no_update_audit ON audit_events;
DROP TRIGGER IF EXISTS trg_audit_checksum ON audit_events;
DROP FUNCTION IF EXISTS fn_audit_checksum();
DROP TABLE IF EXISTS audit_events;

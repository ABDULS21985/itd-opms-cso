-- +goose Up
-- Migration 072: Create the sla_breaches table for ITSM SLA breach tracking.
-- The service already writes/reads this table but it was never created.

CREATE TABLE IF NOT EXISTS sla_breaches (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id               UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    breach_type             TEXT        NOT NULL,
    breached_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    target_was              TIMESTAMPTZ NOT NULL,
    actual_duration_minutes INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_breaches_ticket_id ON sla_breaches (ticket_id);

-- +goose Down
DROP TABLE IF EXISTS sla_breaches;

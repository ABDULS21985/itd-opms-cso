-- +goose Up
-- Migration 052: Service Requests
-- Supports: Service catalog request submissions, approval workflows,
-- and request lifecycle timeline tracking.

-- ──────────────────────────────────────────────
-- Sequence for auto-numbered request identifiers
-- ──────────────────────────────────────────────
CREATE SEQUENCE service_request_seq START 1;

-- ──────────────────────────────────────────────
-- Service Requests
-- ──────────────────────────────────────────────
CREATE TABLE service_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    request_number      TEXT NOT NULL UNIQUE,
    catalog_item_id     UUID NOT NULL REFERENCES service_catalog_items(id),
    requester_id        UUID NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending_approval'
                        CHECK (status IN ('pending_approval','approved','rejected','in_progress','fulfilled','cancelled')),
    form_data           JSONB,
    assigned_to         UUID,
    priority            TEXT NOT NULL DEFAULT 'P3_medium',
    ticket_id           UUID REFERENCES tickets(id),
    rejection_reason    TEXT,
    fulfillment_notes   TEXT,
    fulfilled_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requests_tenant_requester ON service_requests(tenant_id, requester_id);
CREATE INDEX idx_service_requests_tenant_status ON service_requests(tenant_id, status);
CREATE INDEX idx_service_requests_tenant_assigned ON service_requests(tenant_id, assigned_to);
CREATE INDEX idx_service_requests_tenant_created ON service_requests(tenant_id, created_at DESC);

CREATE TRIGGER trg_service_requests_updated
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- Auto-generate request_number
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := 'REQ-' || LPAD(nextval('service_request_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_request_number
    BEFORE INSERT ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION fn_generate_request_number();

-- ──────────────────────────────────────────────
-- Approval Tasks
-- ──────────────────────────────────────────────
CREATE TABLE approval_tasks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    request_id        UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    approver_id       UUID NOT NULL,
    sequence_order    INT NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','delegated','skipped')),
    decision_at       TIMESTAMPTZ,
    comment           TEXT,
    delegated_to      UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_tasks_request_seq ON approval_tasks(request_id, sequence_order);
CREATE INDEX idx_approval_tasks_tenant_approver_status ON approval_tasks(tenant_id, approver_id, status);

-- ──────────────────────────────────────────────
-- Request Timeline
-- ──────────────────────────────────────────────
CREATE TABLE request_timeline (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id    UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    event_type    TEXT NOT NULL CHECK (event_type IN ('submitted','approval_requested','approved','rejected','delegated','in_progress','fulfilled','cancelled','comment')),
    actor_id      UUID NOT NULL,
    description   TEXT,
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_timeline_request_created ON request_timeline(request_id, created_at);

-- +goose Down
DROP TABLE IF EXISTS request_timeline;
DROP TABLE IF EXISTS approval_tasks;
DROP TRIGGER IF EXISTS trg_request_number ON service_requests;
DROP FUNCTION IF EXISTS fn_generate_request_number();
DROP TRIGGER IF EXISTS trg_service_requests_updated ON service_requests;
DROP TABLE IF EXISTS service_requests;
DROP SEQUENCE IF EXISTS service_request_seq;

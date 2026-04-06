-- +goose Up
-- Migration 088: Add SLA tracking columns to service_requests.

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sla_policy_id UUID REFERENCES sla_policies(id);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sla_resolution_target TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sla_resolution_met BOOLEAN;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sla_fulfillment_target TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sla_fulfillment_met BOOLEAN;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS sla_paused_duration_minutes INT DEFAULT 0;

COMMENT ON COLUMN service_requests.sla_resolution_target IS 'When the approval must complete by';
COMMENT ON COLUMN service_requests.sla_fulfillment_target IS 'When the fulfillment must complete by';

CREATE INDEX IF NOT EXISTS idx_service_requests_sla_breach
    ON service_requests (sla_fulfillment_target)
    WHERE sla_fulfillment_target IS NOT NULL
      AND status NOT IN ('fulfilled', 'cancelled', 'rejected');

-- +goose Down
ALTER TABLE service_requests DROP COLUMN IF EXISTS sla_policy_id;
ALTER TABLE service_requests DROP COLUMN IF EXISTS sla_resolution_target;
ALTER TABLE service_requests DROP COLUMN IF EXISTS sla_resolution_met;
ALTER TABLE service_requests DROP COLUMN IF EXISTS sla_fulfillment_target;
ALTER TABLE service_requests DROP COLUMN IF EXISTS sla_fulfillment_met;
ALTER TABLE service_requests DROP COLUMN IF EXISTS sla_paused_at;
ALTER TABLE service_requests DROP COLUMN IF EXISTS sla_paused_duration_minutes;
DROP INDEX IF EXISTS idx_service_requests_sla_breach;

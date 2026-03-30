-- +goose Up
-- Oracle ERP financial data columns on assets table.

ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(15,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS current_book_value NUMERIC(15,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC(5,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS erp_sync_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS erp_asset_id TEXT;

-- ERP sync log — tracks each sync run.
CREATE TABLE IF NOT EXISTS erp_sync_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    status      TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','completed','failed')),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    assets_synced INT NOT NULL DEFAULT 0,
    assets_failed INT NOT NULL DEFAULT 0,
    error_details JSONB,
    triggered_by UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_tenant ON erp_sync_logs(tenant_id);

-- +goose Down
DROP INDEX IF EXISTS idx_erp_sync_logs_tenant;
DROP TABLE IF EXISTS erp_sync_logs;

ALTER TABLE assets DROP COLUMN IF EXISTS erp_asset_id;
ALTER TABLE assets DROP COLUMN IF EXISTS erp_sync_at;
ALTER TABLE assets DROP COLUMN IF EXISTS depreciation_rate;
ALTER TABLE assets DROP COLUMN IF EXISTS po_number;
ALTER TABLE assets DROP COLUMN IF EXISTS cost_center;
ALTER TABLE assets DROP COLUMN IF EXISTS current_book_value;
-- NOTE: currency and purchase_price may have existed before this migration
-- via the original purchase_cost/currency columns. Only drop if they were
-- added by this migration. Using IF EXISTS for safety.
ALTER TABLE assets DROP COLUMN IF EXISTS purchase_price;

-- +goose Up
-- Migration 089: Verification campaigns and enhanced physical asset verification.

-- ──────────────────────────────────────────────
-- 1. Verification campaigns
-- ──────────────────────────────────────────────
CREATE TABLE asset_verification_campaigns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    name                TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
        'planned', 'in_progress', 'completed', 'cancelled'
    )),
    scope_filter        JSONB DEFAULT '{}',
    target_asset_count  INT DEFAULT 0,
    verified_count      INT DEFAULT 0,
    discrepancy_count   INT DEFAULT 0,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_campaigns_tenant ON asset_verification_campaigns(tenant_id);

CREATE TRIGGER trg_verification_campaigns_updated
    BEFORE UPDATE ON asset_verification_campaigns
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────
-- 2. Extend asset_verifications with campaign + discrepancy support
-- ──────────────────────────────────────────────
ALTER TABLE asset_verifications
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES asset_verification_campaigns(id),
    ADD COLUMN IF NOT EXISTS actual_location TEXT,
    ADD COLUMN IF NOT EXISTS discrepancy_type TEXT DEFAULT 'none'
        CHECK (discrepancy_type IN (
            'none', 'location_mismatch', 'condition_issue',
            'missing', 'unregistered', 'attribute_mismatch'
        ));

CREATE INDEX IF NOT EXISTS idx_verifications_campaign ON asset_verifications(campaign_id);

-- ──────────────────────────────────────────────
-- 3. Extend assets with verification status tracking
-- ──────────────────────────────────────────────
ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS last_verified_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified'
        CHECK (verification_status IN ('verified', 'unverified', 'discrepancy', 'overdue'));

-- +goose Down
ALTER TABLE assets DROP COLUMN IF EXISTS verification_status;
ALTER TABLE assets DROP COLUMN IF EXISTS last_verified_by;

ALTER TABLE asset_verifications DROP COLUMN IF EXISTS discrepancy_type;
ALTER TABLE asset_verifications DROP COLUMN IF EXISTS actual_location;
ALTER TABLE asset_verifications DROP COLUMN IF EXISTS campaign_id;

DROP TRIGGER IF EXISTS trg_verification_campaigns_updated ON asset_verification_campaigns;
DROP TABLE IF EXISTS asset_verification_campaigns;

-- +goose Up
-- Migration 084: Moderate gaps — parallel approvals, asset verification, boolean search support.

-- ──────────────────────────────────────────────
-- 1. Parallel approval mode on catalog items
-- ──────────────────────────────────────────────
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS
    approval_mode TEXT DEFAULT 'sequential' CHECK (approval_mode IN ('sequential', 'parallel'));

-- ──────────────────────────────────────────────
-- 2. Physical asset verification
-- ──────────────────────────────────────────────
ALTER TABLE assets ADD COLUMN IF NOT EXISTS
    last_verified_at TIMESTAMPTZ;

CREATE TABLE asset_verifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    asset_id            UUID NOT NULL REFERENCES assets(id),
    verifier_id         UUID NOT NULL REFERENCES users(id),
    verified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    location_confirmed  BOOLEAN,
    condition           TEXT CHECK (condition IN ('good', 'fair', 'poor', 'damaged', 'missing')),
    notes               TEXT,
    photo_evidence_ids  UUID[] DEFAULT '{}'
);

CREATE INDEX idx_asset_verifications_asset ON asset_verifications(asset_id);
CREATE INDEX idx_asset_verifications_tenant ON asset_verifications(tenant_id);

-- ──────────────────────────────────────────────
-- 3. Full-text search index for KB articles
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kb_articles_fts
    ON kb_articles USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

-- +goose Down
ALTER TABLE catalog_items DROP COLUMN IF EXISTS approval_mode;
ALTER TABLE assets DROP COLUMN IF EXISTS last_verified_at;
DROP TABLE IF EXISTS asset_verifications;
DROP INDEX IF EXISTS idx_kb_articles_fts;

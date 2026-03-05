-- +goose Up
-- Migration 053: Add full-text search to service catalog items,
-- user favorites table, and materialized popularity view.

-- ──────────────────────────────────────────────────────────────
-- 1. Full-text search vector on service_catalog_items
-- ──────────────────────────────────────────────────────────────

-- Add search vector column
ALTER TABLE service_catalog_items ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX idx_catalog_items_search ON service_catalog_items USING GIN(search_vector);

-- Function to auto-update search_vector on INSERT/UPDATE
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_catalog_item_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_catalog_item_search_vector
    BEFORE INSERT OR UPDATE OF name, description ON service_catalog_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_catalog_item_search_vector();

-- Backfill existing rows
UPDATE service_catalog_items SET search_vector =
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- ──────────────────────────────────────────────────────────────
-- 2. Favorites table
-- ──────────────────────────────────────────────────────────────

CREATE TABLE service_catalog_favorites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id),
    user_id    UUID NOT NULL,
    item_id    UUID NOT NULL REFERENCES service_catalog_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, item_id)
);

CREATE INDEX idx_catalog_favorites_user ON service_catalog_favorites(tenant_id, user_id);
CREATE INDEX idx_catalog_favorites_item ON service_catalog_favorites(item_id);

-- ──────────────────────────────────────────────────────────────
-- 3. Popular services materialized view
-- ──────────────────────────────────────────────────────────────

-- Count service requests per catalog item for popularity ranking.
-- Uses the service_requests table created in migration 052.
CREATE MATERIALIZED VIEW mv_catalog_item_popularity AS
SELECT
    ci.tenant_id,
    ci.id AS item_id,
    ci.name AS item_name,
    COUNT(sr.id) AS request_count,
    MAX(sr.created_at) AS last_requested_at
FROM service_catalog_items ci
LEFT JOIN service_requests sr ON sr.catalog_item_id = ci.id
WHERE ci.status = 'active'
GROUP BY ci.tenant_id, ci.id, ci.name;

CREATE UNIQUE INDEX idx_mv_popularity ON mv_catalog_item_popularity(tenant_id, item_id);

-- +goose Down

-- 3. Drop materialized view
DROP INDEX IF EXISTS idx_mv_popularity;
DROP MATERIALIZED VIEW IF EXISTS mv_catalog_item_popularity;

-- 2. Drop favorites table
DROP INDEX IF EXISTS idx_catalog_favorites_item;
DROP INDEX IF EXISTS idx_catalog_favorites_user;
DROP TABLE IF EXISTS service_catalog_favorites;

-- 1. Drop full-text search infrastructure
DROP TRIGGER IF EXISTS trg_catalog_item_search_vector ON service_catalog_items;
DROP FUNCTION IF EXISTS fn_catalog_item_search_vector();
DROP INDEX IF EXISTS idx_catalog_items_search;
ALTER TABLE service_catalog_items DROP COLUMN IF EXISTS search_vector;

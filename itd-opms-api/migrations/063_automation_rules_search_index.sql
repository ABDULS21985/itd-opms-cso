-- +goose Up
-- +goose NO TRANSACTION
-- Migration 063: GIN indexes for automation_rules full-text search
--
-- The ListRules query filters on name ILIKE and description ILIKE which
-- does a sequential scan on large tenants. We add a tsvector GIN index
-- so that the planner can use index scans for text search workloads.
--
-- CONCURRENTLY requires running outside a transaction block; goose NO TRANSACTION handles this.

-- Requires pg_trgm for trigram indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Combined tsvector column over name + description with English stemming.
-- COALESCE guards the nullable description column.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_fts
    ON automation_rules
    USING GIN (
        to_tsvector('english',
            name || ' ' || COALESCE(description, '')
        )
    );

-- Trigram index on name for prefix/infix ILIKE patterns (e.g. "auto%").
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_name_trgm
    ON automation_rules
    USING GIN (name gin_trgm_ops);

-- Trigram index on description for ILIKE patterns.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_description_trgm
    ON automation_rules
    USING GIN (COALESCE(description, '') gin_trgm_ops);

-- +goose Down
DROP INDEX CONCURRENTLY IF EXISTS idx_automation_rules_description_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_automation_rules_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_automation_rules_fts;

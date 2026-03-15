-- Migration 063: GIN indexes for automation_rules full-text search
--
-- The ListRules query filters on name ILIKE and description ILIKE which
-- does a sequential scan on large tenants. We add a tsvector GIN index
-- so that the planner can use index scans for text search workloads.

-- Combined tsvector column over name + description with English stemming.
-- COALESCE guards the nullable description column.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_fts
    ON automation_rules
    USING GIN (
        to_tsvector('english',
            name || ' ' || COALESCE(description, '')
        )
    );

-- Supplementary trigram index on name alone for prefix/infix ILIKE patterns
-- that tsvector cannot handle (e.g. "auto%").
-- Requires pg_trgm extension (available in all modern Postgres distributions).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_name_trgm
    ON automation_rules
    USING GIN (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_description_trgm
    ON automation_rules
    USING GIN (COALESCE(description, '') gin_trgm_ops);

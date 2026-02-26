-- +goose Up
-- Migration 001: Tenants, Org Units, and Org Hierarchy (closure table)

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenant types
CREATE TYPE tenant_type AS ENUM ('department', 'division', 'office');

-- Org unit levels
CREATE TYPE org_level_type AS ENUM ('department', 'division', 'office', 'unit');

-- ──────────────────────────────────────────────
-- Tenants table
-- ──────────────────────────────────────────────
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE,
    type        tenant_type NOT NULL DEFAULT 'division',
    parent_id   UUID REFERENCES tenants(id),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    config      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_code ON tenants(code);
CREATE INDEX idx_tenants_parent ON tenants(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;

-- ──────────────────────────────────────────────
-- Org Units table
-- ──────────────────────────────────────────────
CREATE TABLE org_units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    level           org_level_type NOT NULL,
    parent_id       UUID REFERENCES org_units(id),
    manager_user_id UUID,  -- FK added after users table is created
    is_active       BOOLEAN NOT NULL DEFAULT true,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_org_units_tenant_code ON org_units(tenant_id, code);
CREATE INDEX idx_org_units_tenant ON org_units(tenant_id);
CREATE INDEX idx_org_units_parent ON org_units(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_org_units_level ON org_units(tenant_id, level);

-- ──────────────────────────────────────────────
-- Org Hierarchy closure table
-- Enables efficient ancestor/descendant queries
-- ──────────────────────────────────────────────
CREATE TABLE org_hierarchy (
    ancestor_id     UUID NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    descendant_id   UUID NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    depth           INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE INDEX idx_org_hierarchy_descendant ON org_hierarchy(descendant_id);
CREATE INDEX idx_org_hierarchy_depth ON org_hierarchy(depth);

-- ──────────────────────────────────────────────
-- Trigger: auto-populate org_hierarchy on INSERT
-- ──────────────────────────────────────────────
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_org_hierarchy_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Self-reference (depth 0)
    INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
    VALUES (NEW.id, NEW.id, 0);

    -- Copy ancestor paths from parent
    IF NEW.parent_id IS NOT NULL THEN
        INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
        SELECT h.ancestor_id, NEW.id, h.depth + 1
        FROM org_hierarchy h
        WHERE h.descendant_id = NEW.parent_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_org_units_hierarchy
    AFTER INSERT ON org_units
    FOR EACH ROW
    EXECUTE FUNCTION fn_org_hierarchy_insert();

-- ──────────────────────────────────────────────
-- Trigger: auto-update updated_at
-- ──────────────────────────────────────────────
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_tenants_updated
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_org_units_updated
    BEFORE UPDATE ON org_units
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Seed: ITD department as root tenant
-- ──────────────────────────────────────────────
INSERT INTO tenants (id, name, code, type, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Information Technology Department', 'ITD', 'department', true);

-- +goose Down
DROP TRIGGER IF EXISTS trg_org_units_updated ON org_units;
DROP TRIGGER IF EXISTS trg_tenants_updated ON tenants;
DROP TRIGGER IF EXISTS trg_org_units_hierarchy ON org_units;
DROP FUNCTION IF EXISTS fn_update_timestamp();
DROP FUNCTION IF EXISTS fn_org_hierarchy_insert();
DROP TABLE IF EXISTS org_hierarchy;
DROP TABLE IF EXISTS org_units;
DROP TABLE IF EXISTS tenants;
DROP TYPE IF EXISTS org_level_type;
DROP TYPE IF EXISTS tenant_type;

-- +goose Up
-- Migration 030: Custom Fields System

CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    entity_type     TEXT NOT NULL,
    field_key       TEXT NOT NULL,
    field_label     TEXT NOT NULL,
    field_type      TEXT NOT NULL CHECK (field_type IN (
        'text', 'textarea', 'number', 'decimal', 'boolean',
        'date', 'datetime', 'select', 'multiselect',
        'url', 'email', 'phone', 'user_reference'
    )),
    description     TEXT,
    is_required     BOOLEAN NOT NULL DEFAULT false,
    is_filterable   BOOLEAN NOT NULL DEFAULT false,
    is_visible_in_list BOOLEAN NOT NULL DEFAULT false,
    display_order   INT NOT NULL DEFAULT 0,
    validation_rules JSONB DEFAULT '{}',
    default_value   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, entity_type, field_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_defs_tenant_entity ON custom_field_definitions(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_active ON custom_field_definitions(tenant_id, entity_type, is_active) WHERE is_active = true;

CREATE TRIGGER trg_custom_field_defs_updated
    BEFORE UPDATE ON custom_field_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Ensure entities have custom_fields JSONB column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_tickets_custom_fields ON tickets USING GIN (custom_fields) WHERE custom_fields IS NOT NULL AND custom_fields != '{}';
CREATE INDEX IF NOT EXISTS idx_projects_custom_fields ON projects USING GIN (custom_fields) WHERE custom_fields IS NOT NULL AND custom_fields != '{}';
CREATE INDEX IF NOT EXISTS idx_work_items_custom_fields ON work_items USING GIN (custom_fields) WHERE custom_fields IS NOT NULL AND custom_fields != '{}';

-- +goose Down
DROP INDEX IF EXISTS idx_work_items_custom_fields;
DROP INDEX IF EXISTS idx_projects_custom_fields;
DROP INDEX IF EXISTS idx_tickets_custom_fields;
ALTER TABLE work_items DROP COLUMN IF EXISTS custom_fields;
ALTER TABLE projects DROP COLUMN IF EXISTS custom_fields;
DROP TRIGGER IF EXISTS trg_custom_field_defs_updated ON custom_field_definitions;
DROP TABLE IF EXISTS custom_field_definitions;

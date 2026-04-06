-- +goose Up
-- Migration 026: Budget & Cost Tracking

CREATE TABLE IF NOT EXISTS cost_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    code        TEXT,
    parent_id   UUID REFERENCES cost_categories(id),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_categories_tenant ON cost_categories(tenant_id);

CREATE TABLE IF NOT EXISTS project_cost_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES cost_categories(id),
    description     TEXT NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    entry_type      TEXT NOT NULL CHECK (entry_type IN ('actual', 'committed', 'forecast')),
    entry_date      DATE NOT NULL,
    vendor_name     TEXT,
    invoice_ref     TEXT,
    document_id     UUID REFERENCES documents(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_entries_project ON project_cost_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_date ON project_cost_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_cost_entries_type ON project_cost_entries(entry_type);

CREATE TRIGGER trg_cost_entries_updated
    BEFORE UPDATE ON project_cost_entries
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TABLE IF NOT EXISTS budget_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    approved_budget DECIMAL(15,2) NOT NULL,
    actual_spend    DECIMAL(15,2) NOT NULL,
    committed_spend DECIMAL(15,2) NOT NULL DEFAULT 0,
    forecast_total  DECIMAL(15,2) NOT NULL DEFAULT 0,
    completion_pct  DECIMAL(5,2),
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_snapshots_project ON budget_snapshots(project_id, snapshot_date);

-- Auto-update projects.budget_spent when cost entries change
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_update_project_budget_spent() RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects SET budget_spent = (
        SELECT COALESCE(SUM(amount), 0) FROM project_cost_entries
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND entry_type = 'actual'
    ), updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_cost_entry_budget_sync
    AFTER INSERT OR UPDATE OR DELETE ON project_cost_entries
    FOR EACH ROW EXECUTE FUNCTION fn_update_project_budget_spent();

-- +goose Down
DROP TRIGGER IF EXISTS trg_cost_entry_budget_sync ON project_cost_entries;
DROP FUNCTION IF EXISTS fn_update_project_budget_spent();
DROP TABLE IF EXISTS budget_snapshots;
DROP TRIGGER IF EXISTS trg_cost_entries_updated ON project_cost_entries;
DROP TABLE IF EXISTS project_cost_entries;
DROP TABLE IF EXISTS cost_categories;

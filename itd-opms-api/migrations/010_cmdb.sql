-- +goose Up
-- Migration 010: CMDB Module
-- Supports: Asset management, Configuration items, Relationships, Reconciliation,
-- License management, Warranty tracking, Renewal alerts, Disposal workflow.

-- ──────────────────────────────────────────────
-- 1. Assets
-- ──────────────────────────────────────────────
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    asset_tag       TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL CHECK (type IN ('hardware','software','virtual','cloud','network','peripheral')),
    category        TEXT,
    name            TEXT NOT NULL,
    description     TEXT,
    manufacturer    TEXT,
    model           TEXT,
    serial_number   TEXT,
    status          TEXT NOT NULL DEFAULT 'procured' CHECK (status IN ('procured','received','active','maintenance','retired','disposed')),
    location        TEXT,
    building        TEXT,
    floor           TEXT,
    room            TEXT,
    owner_id        UUID,
    custodian_id    UUID,
    purchase_date   DATE,
    purchase_cost   DECIMAL(15,2),
    currency        TEXT DEFAULT 'NGN',
    classification  TEXT,
    attributes      JSONB DEFAULT '{}',
    tags            TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX idx_assets_tenant_type ON assets(tenant_id, type);
CREATE INDEX idx_assets_tenant_asset_tag ON assets(tenant_id, asset_tag);

CREATE TRIGGER trg_assets_updated
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 2. Asset Lifecycle Events
-- ──────────────────────────────────────────────
CREATE TABLE asset_lifecycle_events (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id             UUID NOT NULL REFERENCES assets(id),
    tenant_id            UUID NOT NULL,
    event_type           TEXT NOT NULL CHECK (event_type IN ('procured','received','deployed','transferred','maintenance_start','maintenance_end','retired','disposed')),
    performed_by         UUID NOT NULL,
    details              JSONB DEFAULT '{}',
    evidence_document_id UUID,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_lifecycle_events_asset ON asset_lifecycle_events(asset_id);

-- ──────────────────────────────────────────────
-- 3. Asset Disposals
-- ──────────────────────────────────────────────
CREATE TABLE asset_disposals (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id                    UUID NOT NULL REFERENCES assets(id),
    tenant_id                   UUID NOT NULL,
    disposal_method             TEXT NOT NULL CHECK (disposal_method IN ('resale','donation','recycling','destruction')),
    reason                      TEXT,
    approved_by                 UUID,
    approval_chain_id           UUID,
    disposal_date               DATE,
    disposal_certificate_doc_id UUID,
    witness_ids                 UUID[] DEFAULT '{}',
    data_wipe_confirmed         BOOLEAN DEFAULT FALSE,
    status                      TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','approved','completed','cancelled')),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_disposals_asset ON asset_disposals(asset_id);

CREATE TRIGGER trg_asset_disposals_updated
    BEFORE UPDATE ON asset_disposals
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 4. CMDB Items (Configuration Items)
-- ──────────────────────────────────────────────
CREATE TABLE cmdb_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL,
    ci_type    TEXT NOT NULL,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','planned','decommissioned')),
    asset_id   UUID REFERENCES assets(id),
    attributes JSONB DEFAULT '{}',
    version    INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cmdb_items_tenant_status ON cmdb_items(tenant_id, status);
CREATE INDEX idx_cmdb_items_tenant ON cmdb_items(tenant_id);

CREATE TRIGGER trg_cmdb_items_updated
    BEFORE UPDATE ON cmdb_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 5. CMDB Relationships
-- ──────────────────────────────────────────────
CREATE TABLE cmdb_relationships (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_ci_id      UUID NOT NULL REFERENCES cmdb_items(id),
    target_ci_id      UUID NOT NULL REFERENCES cmdb_items(id),
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('runs_on','depends_on','connected_to','managed_by','contains','uses')),
    description       TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cmdb_relationships_source ON cmdb_relationships(source_ci_id);
CREATE INDEX idx_cmdb_relationships_target ON cmdb_relationships(target_ci_id);

-- ──────────────────────────────────────────────
-- 6. Reconciliation Runs
-- ──────────────────────────────────────────────
CREATE TABLE reconciliation_runs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    source        TEXT NOT NULL,
    started_at    TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    matches       INT DEFAULT 0,
    discrepancies INT DEFAULT 0,
    new_items     INT DEFAULT 0,
    report        JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_runs_tenant ON reconciliation_runs(tenant_id);

-- ──────────────────────────────────────────────
-- 7. Licenses
-- ──────────────────────────────────────────────
CREATE TABLE licenses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL,
    software_name      TEXT NOT NULL,
    vendor             TEXT,
    license_type       TEXT NOT NULL CHECK (license_type IN ('perpetual','subscription','per_user','per_device','site')),
    total_entitlements INT NOT NULL DEFAULT 0,
    assigned_count     INT NOT NULL DEFAULT 0,
    compliance_status  TEXT NOT NULL DEFAULT 'compliant' CHECK (compliance_status IN ('compliant','over_deployed','under_utilized')),
    expiry_date        DATE,
    cost               DECIMAL(15,2),
    renewal_contact    TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX idx_licenses_tenant_expiry ON licenses(tenant_id, expiry_date);

CREATE TRIGGER trg_licenses_updated
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 8. License Assignments
-- ──────────────────────────────────────────────
CREATE TABLE license_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id  UUID NOT NULL REFERENCES licenses(id),
    tenant_id   UUID NOT NULL,
    user_id     UUID,
    asset_id    UUID,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_assignments_license ON license_assignments(license_id);
CREATE INDEX idx_license_assignments_tenant ON license_assignments(tenant_id);

-- ──────────────────────────────────────────────
-- 9. Warranties
-- ──────────────────────────────────────────────
CREATE TABLE warranties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID NOT NULL REFERENCES assets(id),
    tenant_id       UUID NOT NULL,
    vendor          TEXT,
    contract_number TEXT,
    coverage_type   TEXT,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    cost            DECIMAL(15,2),
    renewal_status  TEXT NOT NULL DEFAULT 'active' CHECK (renewal_status IN ('active','expiring_soon','expired','renewed')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warranties_asset ON warranties(asset_id);
CREATE INDEX idx_warranties_tenant_end_date ON warranties(tenant_id, end_date);

CREATE TRIGGER trg_warranties_updated
    BEFORE UPDATE ON warranties
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 10. Renewal Alerts
-- ──────────────────────────────────────────────
CREATE TABLE renewal_alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    alert_date  DATE NOT NULL,
    sent        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_renewal_alerts_tenant_entity ON renewal_alerts(tenant_id, entity_type, entity_id);

-- +goose Down
DROP TABLE IF EXISTS renewal_alerts;
DROP TABLE IF EXISTS warranties;
DROP TABLE IF EXISTS license_assignments;
DROP TABLE IF EXISTS licenses;
DROP TABLE IF EXISTS reconciliation_runs;
DROP TABLE IF EXISTS cmdb_relationships;
DROP TABLE IF EXISTS cmdb_items;
DROP TABLE IF EXISTS asset_disposals;
DROP TABLE IF EXISTS asset_lifecycle_events;
DROP TABLE IF EXISTS assets;

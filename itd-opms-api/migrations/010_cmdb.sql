-- +goose Up
-- Migration 010: CMDB Module
-- Supports: Asset management, Configuration items, Relationships, Reconciliation,
-- License management, Warranty tracking, Renewal alerts, Disposal workflow.

-- ──────────────────────────────────────────────
-- Enum types
-- ──────────────────────────────────────────────
CREATE TYPE asset_type AS ENUM ('hardware','software','virtual','cloud','network','peripheral');
CREATE TYPE asset_status AS ENUM ('procured','received','active','maintenance','retired','disposed');
CREATE TYPE lifecycle_event_type AS ENUM ('procured','received','deployed','transferred','maintenance_start','maintenance_end','retired','disposed');
CREATE TYPE disposal_method AS ENUM ('resale','donation','recycling','destruction');
CREATE TYPE disposal_status AS ENUM ('pending_approval','approved','completed','cancelled');
CREATE TYPE ci_relationship_type AS ENUM ('runs_on','depends_on','connected_to','managed_by','contains','uses');
CREATE TYPE license_type AS ENUM ('perpetual','subscription','per_user','per_device','site');
CREATE TYPE compliance_status AS ENUM ('compliant','over_deployed','under_utilized');
CREATE TYPE warranty_renewal_status AS ENUM ('active','expiring_soon','expired','renewed');

-- ──────────────────────────────────────────────
-- 1. Assets
-- ──────────────────────────────────────────────
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    asset_tag       TEXT NOT NULL,
    type            asset_type NOT NULL,
    category        TEXT NOT NULL DEFAULT '',
    name            TEXT NOT NULL,
    description     TEXT,
    manufacturer    TEXT,
    model           TEXT,
    serial_number   TEXT,
    status          asset_status NOT NULL DEFAULT 'procured',
    location        TEXT,
    building        TEXT,
    floor           TEXT,
    room            TEXT,
    owner_id        UUID REFERENCES users(id),
    custodian_id    UUID REFERENCES users(id),
    purchase_date   DATE,
    purchase_cost   DECIMAL(15,2),
    currency        TEXT NOT NULL DEFAULT 'NGN',
    classification  TEXT,
    attributes      JSONB DEFAULT '{}',
    tags            TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, asset_tag)
);

CREATE INDEX idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX idx_assets_tenant_type ON assets(tenant_id, type);
CREATE INDEX idx_assets_tenant_owner ON assets(tenant_id, owner_id);
CREATE INDEX idx_assets_tenant_custodian ON assets(tenant_id, custodian_id);
CREATE INDEX idx_assets_serial_number ON assets(serial_number);

CREATE TRIGGER trg_assets_updated
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 2. Asset Lifecycle Events
-- ──────────────────────────────────────────────
CREATE TABLE asset_lifecycle_events (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id             UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    event_type           lifecycle_event_type NOT NULL,
    performed_by         UUID REFERENCES users(id),
    details              JSONB DEFAULT '{}',
    evidence_document_id UUID,
    timestamp            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_lifecycle_events_asset_ts ON asset_lifecycle_events(asset_id, timestamp DESC);

-- ──────────────────────────────────────────────
-- 3. Asset Disposals
-- ──────────────────────────────────────────────
CREATE TABLE asset_disposals (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id                   UUID NOT NULL REFERENCES assets(id),
    tenant_id                  UUID NOT NULL REFERENCES tenants(id),
    disposal_method            disposal_method NOT NULL,
    reason                     TEXT,
    approved_by                UUID REFERENCES users(id),
    approval_chain_id          UUID,
    disposal_date              DATE,
    disposal_certificate_doc_id UUID,
    witness_ids                UUID[] DEFAULT '{}',
    data_wipe_confirmed        BOOLEAN NOT NULL DEFAULT FALSE,
    status                     disposal_status NOT NULL DEFAULT 'pending_approval',
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_disposals_tenant_status ON asset_disposals(tenant_id, status);
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
    tenant_id  UUID NOT NULL REFERENCES tenants(id),
    ci_type    TEXT NOT NULL,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active',
    asset_id   UUID REFERENCES assets(id),
    attributes JSONB DEFAULT '{}',
    version    INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cmdb_items_tenant_ci_type ON cmdb_items(tenant_id, ci_type);
CREATE INDEX idx_cmdb_items_tenant_status ON cmdb_items(tenant_id, status);
CREATE INDEX idx_cmdb_items_asset ON cmdb_items(asset_id);

CREATE TRIGGER trg_cmdb_items_updated
    BEFORE UPDATE ON cmdb_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 5. CMDB Relationships
-- ──────────────────────────────────────────────
CREATE TABLE cmdb_relationships (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_ci_id      UUID NOT NULL REFERENCES cmdb_items(id) ON DELETE CASCADE,
    target_ci_id      UUID NOT NULL REFERENCES cmdb_items(id) ON DELETE CASCADE,
    relationship_type ci_relationship_type NOT NULL,
    description       TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cmdb_relationships_source ON cmdb_relationships(source_ci_id);
CREATE INDEX idx_cmdb_relationships_target ON cmdb_relationships(target_ci_id);

-- ──────────────────────────────────────────────
-- 6. Reconciliation Runs
-- ──────────────────────────────────────────────
CREATE TABLE reconciliation_runs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    source        TEXT NOT NULL,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    matches       INT NOT NULL DEFAULT 0,
    discrepancies INT NOT NULL DEFAULT 0,
    new_items     INT NOT NULL DEFAULT 0,
    report        JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- 7. Licenses
-- ──────────────────────────────────────────────
CREATE TABLE licenses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(id),
    software_name      TEXT NOT NULL,
    vendor             TEXT,
    license_type       license_type NOT NULL,
    license_key        TEXT,
    total_entitlements INT NOT NULL DEFAULT 0,
    assigned_count     INT NOT NULL DEFAULT 0,
    compliance_status  compliance_status NOT NULL DEFAULT 'compliant',
    expiry_date        DATE,
    cost               DECIMAL(15,2),
    currency           TEXT NOT NULL DEFAULT 'NGN',
    renewal_contact    TEXT,
    notes              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_licenses_tenant_compliance ON licenses(tenant_id, compliance_status);
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
    license_id  UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    asset_id    UUID REFERENCES assets(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_license_assignments_license ON license_assignments(license_id);
CREATE INDEX idx_license_assignments_user ON license_assignments(user_id);
CREATE INDEX idx_license_assignments_asset ON license_assignments(asset_id);

-- ──────────────────────────────────────────────
-- 9. Warranties
-- ──────────────────────────────────────────────
CREATE TABLE warranties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID NOT NULL REFERENCES assets(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    vendor          TEXT NOT NULL,
    contract_number TEXT,
    coverage_type   TEXT,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    cost            DECIMAL(15,2),
    currency        TEXT NOT NULL DEFAULT 'NGN',
    renewal_status  warranty_renewal_status NOT NULL DEFAULT 'active',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_warranties_tenant_renewal ON warranties(tenant_id, renewal_status);
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
    entity_type TEXT NOT NULL,
    entity_id   UUID NOT NULL,
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    alert_date  DATE NOT NULL,
    sent        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_alerts_tenant_entity ON renewal_alerts(tenant_id, entity_type, entity_id);
CREATE INDEX idx_renewal_alerts_date_sent ON renewal_alerts(alert_date, sent);

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
DROP TYPE IF EXISTS warranty_renewal_status;
DROP TYPE IF EXISTS compliance_status;
DROP TYPE IF EXISTS license_type;
DROP TYPE IF EXISTS ci_relationship_type;
DROP TYPE IF EXISTS disposal_status;
DROP TYPE IF EXISTS disposal_method;
DROP TYPE IF EXISTS lifecycle_event_type;
DROP TYPE IF EXISTS asset_status;
DROP TYPE IF EXISTS asset_type;

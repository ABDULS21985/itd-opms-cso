-- +goose Up
-- Migration 082: OLA (Operational Level Agreements) and UC (Underpinning Contracts)
-- for SLA dependency chain management as required by the ESM BRD.

-- ──────────────────────────────────────────────
-- 1. Operational Level Agreements
-- ──────────────────────────────────────────────
CREATE TABLE operational_level_agreements (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id),
    name                        TEXT NOT NULL,
    description                 TEXT,
    support_team_id             UUID REFERENCES support_queues(id),
    service_catalog_item_id     UUID REFERENCES service_catalog_items(id),
    parent_sla_id               UUID REFERENCES sla_policies(id),
    response_target_minutes     INT NOT NULL,
    resolution_target_minutes   INT NOT NULL,
    business_hours_calendar_id  UUID REFERENCES business_hours_calendars(id),
    escalation_contact_id       UUID REFERENCES users(id),
    status                      TEXT NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'active', 'expired', 'suspended')),
    effective_from              DATE,
    effective_to                DATE,
    review_date                 DATE,
    created_by                  UUID NOT NULL REFERENCES users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ola_tenant ON operational_level_agreements(tenant_id);
CREATE INDEX idx_ola_tenant_status ON operational_level_agreements(tenant_id, status);
CREATE INDEX idx_ola_parent_sla ON operational_level_agreements(parent_sla_id);

CREATE TRIGGER trg_ola_updated
    BEFORE UPDATE ON operational_level_agreements
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 2. Underpinning Contracts
-- ──────────────────────────────────────────────
CREATE TABLE underpinning_contracts (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id),
    name                        TEXT NOT NULL,
    vendor_id                   UUID REFERENCES vendors(id),
    contract_id                 UUID REFERENCES contracts(id),
    parent_sla_id               UUID REFERENCES sla_policies(id),
    response_target_minutes     INT NOT NULL,
    resolution_target_minutes   INT NOT NULL,
    penalty_clause              TEXT,
    status                      TEXT NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'active', 'expired', 'suspended')),
    effective_from              DATE,
    effective_to                DATE,
    review_date                 DATE,
    created_by                  UUID NOT NULL REFERENCES users(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_uc_tenant ON underpinning_contracts(tenant_id);
CREATE INDEX idx_uc_tenant_status ON underpinning_contracts(tenant_id, status);
CREATE INDEX idx_uc_parent_sla ON underpinning_contracts(parent_sla_id);

CREATE TRIGGER trg_uc_updated
    BEFORE UPDATE ON underpinning_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 3. SLA Dependency Chain (SLA → OLA → UC)
-- ──────────────────────────────────────────────
CREATE TABLE sla_dependency_chain (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sla_policy_id   UUID NOT NULL REFERENCES sla_policies(id),
    ola_id          UUID REFERENCES operational_level_agreements(id),
    uc_id           UUID REFERENCES underpinning_contracts(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_chain_sla ON sla_dependency_chain(sla_policy_id);
CREATE INDEX idx_sla_chain_ola ON sla_dependency_chain(ola_id);
CREATE INDEX idx_sla_chain_uc ON sla_dependency_chain(uc_id);

-- +goose Down
DROP TABLE IF EXISTS sla_dependency_chain;
DROP TABLE IF EXISTS underpinning_contracts;
DROP TABLE IF EXISTS operational_level_agreements;

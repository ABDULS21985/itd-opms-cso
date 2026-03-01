-- +goose Up
-- Migration 027: Vendor/Contract Management

CREATE TABLE IF NOT EXISTS vendors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    code            TEXT,
    vendor_type     TEXT NOT NULL CHECK (vendor_type IN ('hardware', 'software', 'services', 'cloud', 'telecom', 'consulting', 'other')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'blacklisted')),
    primary_contact_name    TEXT,
    primary_contact_email   TEXT,
    primary_contact_phone   TEXT,
    account_manager_name    TEXT,
    account_manager_email   TEXT,
    website         TEXT,
    address         TEXT,
    tax_id          TEXT,
    payment_terms   TEXT,
    notes           TEXT,
    tags            TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_tenant_name ON vendors(tenant_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);

CREATE TRIGGER trg_vendors_updated
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TABLE IF NOT EXISTS contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    contract_number TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    contract_type   TEXT NOT NULL CHECK (contract_type IN ('license', 'support', 'maintenance', 'consulting', 'cloud_service', 'hardware', 'sla', 'nda', 'msa', 'other')),
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expiring_soon', 'expired', 'renewed', 'terminated', 'under_review')),
    start_date      DATE NOT NULL,
    end_date        DATE,
    auto_renew      BOOLEAN DEFAULT false,
    renewal_notice_days INT DEFAULT 90,
    total_value     DECIMAL(15,2),
    annual_value    DECIMAL(15,2),
    currency        TEXT DEFAULT 'NGN',
    payment_schedule TEXT,
    sla_terms       JSONB DEFAULT '{}',
    document_ids    UUID[] DEFAULT '{}',
    owner_id        UUID REFERENCES users(id),
    approval_chain_id UUID REFERENCES approval_chains(id),
    tags            TEXT[] DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_number ON contracts(tenant_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status) WHERE status IN ('active', 'expiring_soon');
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date) WHERE end_date IS NOT NULL;

CREATE TRIGGER trg_contracts_updated
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TABLE IF NOT EXISTS vendor_scorecards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    contract_id     UUID REFERENCES contracts(id),
    review_period   TEXT NOT NULL,
    quality_score       DECIMAL(3,1),
    delivery_score      DECIMAL(3,1),
    responsiveness_score DECIMAL(3,1),
    cost_score          DECIMAL(3,1),
    compliance_score    DECIMAL(3,1),
    overall_score       DECIMAL(3,1),
    strengths       TEXT,
    weaknesses      TEXT,
    improvement_areas TEXT,
    notes           TEXT,
    sla_metrics     JSONB DEFAULT '{}',
    reviewed_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_scorecards_vendor ON vendor_scorecards(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_scorecards_period ON vendor_scorecards(review_period);

CREATE TABLE IF NOT EXISTS contract_renewals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID NOT NULL REFERENCES contracts(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    renewal_type    TEXT NOT NULL CHECK (renewal_type IN ('renewal', 'renegotiation', 'termination', 'upgrade', 'downgrade')),
    new_start_date  DATE,
    new_end_date    DATE,
    new_value       DECIMAL(15,2),
    change_notes    TEXT,
    approval_chain_id UUID REFERENCES approval_chains(id),
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract ON contract_renewals(contract_id);

-- +goose Down
DROP TABLE IF EXISTS contract_renewals;
DROP TABLE IF EXISTS vendor_scorecards;
DROP TRIGGER IF EXISTS trg_contracts_updated ON contracts;
DROP TABLE IF EXISTS contracts;
DROP TRIGGER IF EXISTS trg_vendors_updated ON vendors;
DROP TABLE IF EXISTS vendors;

-- +goose Up
-- Migration 080: CMDB Automated Discovery
-- BRD — Automated CI discovery via IP range scanning, AD import, CSV import

-- ──────────────────────────────────────────────
-- discovery_profiles
-- ──────────────────────────────────────────────
CREATE TABLE discovery_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('network', 'ad_import', 'csv_import', 'sccm')),
    configuration JSONB NOT NULL DEFAULT '{}',
    -- For network: {"ip_ranges": ["10.0.0.0/24"], "protocols": ["snmp", "wmi", "ssh"],
    --              "credentials_vault_key": "...", "ports": [22, 161, 135]}
    -- For ad_import: {"domain": "cbn.gov.ng", "ou_filter": "OU=Computers,DC=cbn,DC=gov,DC=ng"}
    -- For csv_import: {"mapping": {"hostname": "A", "ip": "B", "type": "C"}}
    schedule TEXT, -- cron expression, null = manual only
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- discovery_runs
-- ──────────────────────────────────────────────
CREATE TABLE discovery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    profile_id UUID NOT NULL REFERENCES discovery_profiles(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'scanning', 'reconciling', 'completed', 'failed'
    )),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    devices_found INT DEFAULT 0,
    new_cis INT DEFAULT 0,
    updated_cis INT DEFAULT 0,
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- discovered_devices
-- ──────────────────────────────────────────────
CREATE TABLE discovered_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
    hostname TEXT,
    ip_address INET,
    mac_address MACADDR,
    device_type TEXT,
    os_name TEXT,
    os_version TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    open_ports INT[] DEFAULT '{}',
    attributes JSONB DEFAULT '{}',
    matched_ci_id UUID REFERENCES cmdb_items(id),
    match_confidence NUMERIC(3,2), -- 0.00 to 1.00
    action TEXT CHECK (action IN ('new', 'update', 'no_change', 'conflict')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────
CREATE INDEX idx_discovery_profiles_tenant ON discovery_profiles(tenant_id);
CREATE INDEX idx_discovery_runs_profile ON discovery_runs(profile_id);
CREATE INDEX idx_discovered_devices_run ON discovered_devices(run_id);
CREATE INDEX idx_discovered_devices_ip ON discovered_devices(ip_address);

-- ──────────────────────────────────────────────
-- RBAC: seed discovery permission
-- ──────────────────────────────────────────────
UPDATE roles SET permissions = permissions || '["cmdb.discovery"]'::jsonb
WHERE name IN ('global_admin', 'itd_director', 'service_owner')
  AND NOT permissions @> '"cmdb.discovery"';

-- +goose Down
DROP TABLE IF EXISTS discovered_devices;
DROP TABLE IF EXISTS discovery_runs;
DROP TABLE IF EXISTS discovery_profiles;

-- Revert permissions
UPDATE roles SET permissions = permissions - 'cmdb.discovery'
WHERE permissions @> '"cmdb.discovery"';

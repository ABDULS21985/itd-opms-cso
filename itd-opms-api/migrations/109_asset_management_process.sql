-- +goose Up
-- BRD §6.8 IT Assets Management Process.

CREATE SEQUENCE IF NOT EXISTS asset_process_seq START WITH 1;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_asset_process_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.process_number IS NULL OR NEW.process_number = '' THEN
        NEW.process_number := 'AMP-' || lpad(nextval('asset_process_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TABLE asset_process_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    process_number TEXT NOT NULL,
    process_type TEXT NOT NULL CHECK (process_type IN (
        'deployment', 'redeployment', 'maintenance', 'retirement_disposal', 'management_report'
    )),
    title TEXT NOT NULL,
    description TEXT,
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN (
        'manual', 'service_request', 'ticket', 'incident', 'memo', 'email', 'hr_exit', 'stocktake'
    )),
    source_id UUID,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    assigned_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    stop_gap_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    requested_for_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'request_received' CHECK (status IN (
        'request_received', 'approval_review', 'requester_check', 'replacement_check',
        'availability_check', 'waiting_list', 'procurement', 'issue_from_store',
        'configuration', 'issued_to_user', 'buyback_decision', 'buyback_approval',
        'old_asset_return', 'data_wipe', 'redeployment_intake', 'asset_retrieval',
        'maintenance_intake', 'warranty_check', 'vendor_dispatch', 'stop_gap_issued',
        'repaired_received', 'maintenance_signoff', 'stop_gap_returned',
        'obsolete_identified', 'replacement_planned', 'asset_database_updated',
        'degaussing_reported', 'management_reported', 'closed', 'rejected', 'cancelled'
    )),
    approval_required BOOLEAN NOT NULL DEFAULT false,
    approval_status TEXT NOT NULL DEFAULT 'not_required' CHECK (approval_status IN (
        'not_required', 'pending', 'approved', 'rejected'
    )),
    availability_status TEXT NOT NULL DEFAULT 'unknown' CHECK (availability_status IN (
        'unknown', 'available', 'unavailable', 'procurement_required', 'waiting_list'
    )),
    requester_status TEXT CHECK (requester_status IN ('new_staff', 'replacement', 'exit_retirement', 'exit_resignation', 'transfer')),
    replacement_eligible BOOLEAN,
    buyback_option BOOLEAN,
    buyback_approved BOOLEAN,
    exit_reason TEXT CHECK (exit_reason IN ('retirement', 'resignation', 'transfer', 'other')),
    warranty_status TEXT CHECK (warranty_status IN ('under_warranty', 'out_of_warranty', 'unknown')),
    data_wipe_confirmed BOOLEAN NOT NULL DEFAULT false,
    delivery_signed BOOLEAN NOT NULL DEFAULT false,
    return_signed BOOLEAN NOT NULL DEFAULT false,
    responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    accountable_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB NOT NULL DEFAULT '{}',
    evidence JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, process_number)
);

CREATE TRIGGER trg_asset_process_number
BEFORE INSERT ON asset_process_runs
FOR EACH ROW
WHEN (NEW.process_number IS NULL OR NEW.process_number = '')
EXECUTE FUNCTION set_asset_process_number();

CREATE TRIGGER trg_asset_process_runs_updated
BEFORE UPDATE ON asset_process_runs
FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TABLE asset_process_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    process_id UUID NOT NULL REFERENCES asset_process_runs(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'transition',
    actor_id UUID NOT NULL REFERENCES users(id),
    comment TEXT,
    decision TEXT,
    evidence JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_process_runs_tenant_status ON asset_process_runs(tenant_id, status);
CREATE INDEX idx_asset_process_runs_tenant_type ON asset_process_runs(tenant_id, process_type);
CREATE INDEX idx_asset_process_runs_asset ON asset_process_runs(tenant_id, asset_id);
CREATE INDEX idx_asset_process_runs_requested_for ON asset_process_runs(tenant_id, requested_for_id);
CREATE INDEX idx_asset_process_events_process ON asset_process_events(process_id, created_at DESC);

CREATE POLICY tenant_isolation ON asset_process_runs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE asset_process_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_process_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON asset_process_events
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE asset_process_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_process_events FORCE ROW LEVEL SECURITY;

INSERT INTO roles (id, name, description, permissions, is_system)
VALUES
(
    '10000000-0000-0000-0000-000000000046',
    'assistant_it_facilities_specialist',
    'Assistant IT Facilities Specialist - responsible for BRD 6.8 asset deployment, redeployment, maintenance, and disposal process steps',
    '["cmdb.view", "cmdb.manage", "cmdb.asset_process.view", "cmdb.asset_process.manage", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000047',
    'it_facilities_specialist',
    'IT Facilities Specialist - responsible for asset status and management reporting',
    '["cmdb.view", "cmdb.manage", "cmdb.asset_process.view", "cmdb.asset_process.manage", "reporting.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000048',
    'senior_it_facilities_specialist',
    'Senior IT Facilities Specialist - accountable for asset management reports and BRD 6.8 process quality',
    '["cmdb.view", "cmdb.manage", "cmdb.asset_process.view", "cmdb.asset_process.manage", "cmdb.asset_process.approve", "reporting.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000049',
    'it_facilities_lead',
    'IT Facilities Lead - accountable for redeployment, replacement, maintenance, and stop-gap asset decisions',
    '["cmdb.view", "cmdb.manage", "cmdb.asset_process.view", "cmdb.asset_process.manage", "cmdb.asset_process.approve", "reporting.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000050',
    'asset_disposal_committee',
    'Asset Disposal Committee - accountable for buy-back, degaussing, and disposal approvals',
    '["cmdb.view", "cmdb.asset_process.view", "cmdb.asset_process.approve", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000051',
    'inventory_officer',
    'Inventory Officer - responsible for old asset returns and stock custody',
    '["cmdb.view", "cmdb.manage", "cmdb.asset_process.view", "cmdb.asset_process.manage", "documents.view"]'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = true;

UPDATE roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["cmdb.asset_process.view", "cmdb.asset_process.manage", "cmdb.asset_process.approve"]'::jsonb
WHERE name IN ('global_admin', 'admin', 'tenant_admin', 'itd_director');

UPDATE roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["cmdb.asset_process.view"]'::jsonb
WHERE name IN ('cmdb_viewer', 'asset_viewer');

UPDATE roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["cmdb.asset_process.view", "cmdb.asset_process.manage"]'::jsonb
WHERE name IN ('cmdb_manager', 'asset_manager', 'service_desk_analyst', 'senior_service_desk_analyst');

CREATE TEMP TABLE tmp_asset_process_role_candidates AS
SELECT
    u.id,
    u.tenant_id,
    u.org_unit_id,
    upper(coalesce(u.job_title, '')) AS job_title,
    string_agg(upper(coalesce(ou.name, '')), ' ') AS org_path
FROM users u
LEFT JOIN org_hierarchy oh ON oh.descendant_id = u.org_unit_id
LEFT JOIN org_units ou ON ou.id = oh.ancestor_id
WHERE u.is_active = true
  AND u.org_unit_id IS NOT NULL
GROUP BY u.id, u.tenant_id, u.org_unit_id, u.job_title;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_asset_process_role_candidates c
JOIN roles r ON r.name = 'assistant_it_facilities_specialist'
WHERE c.job_title LIKE '%ASSISTANT%IT%FACILIT%'
   OR c.job_title LIKE '%IT%FACILIT%ASSISTANT%'
   OR c.org_path LIKE '%FACILIT%MANAGEMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_asset_process_role_candidates c
JOIN roles r ON r.name = 'it_facilities_specialist'
WHERE c.job_title LIKE '%IT%FACILIT%SPECIALIST%'
   OR c.job_title LIKE '%FACILIT%MANAGEMENT%'
   OR c.job_title LIKE '%ASSET%MANAGEMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_asset_process_role_candidates c
JOIN roles r ON r.name = 'senior_it_facilities_specialist'
WHERE (c.job_title LIKE '%SENIOR%' OR c.job_title LIKE '%LEAD%' OR c.job_title LIKE '%HEAD%')
  AND (c.job_title LIKE '%FACILIT%' OR c.org_path LIKE '%FACILIT%MANAGEMENT%' OR c.job_title LIKE '%ASSET%')
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_asset_process_role_candidates c
JOIN roles r ON r.name = 'it_facilities_lead'
WHERE (c.job_title LIKE '%LEAD%' OR c.job_title LIKE '%HEAD%' OR c.job_title LIKE '%MANAGER%')
  AND (c.job_title LIKE '%FACILIT%' OR c.org_path LIKE '%FACILIT%MANAGEMENT%' OR c.job_title LIKE '%ASSET%')
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_asset_process_role_candidates c
JOIN roles r ON r.name = 'inventory_officer'
WHERE c.job_title LIKE '%INVENTORY%'
   OR c.job_title LIKE '%STORE%'
   OR c.job_title LIKE '%PSSD%'
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS tmp_asset_process_role_candidates;

-- +goose Down
DROP POLICY IF EXISTS tenant_isolation ON asset_process_events;
DROP POLICY IF EXISTS tenant_isolation ON asset_process_runs;
DROP TABLE IF EXISTS asset_process_events;
DROP TRIGGER IF EXISTS trg_asset_process_runs_updated ON asset_process_runs;
DROP TRIGGER IF EXISTS trg_asset_process_number ON asset_process_runs;
DROP TABLE IF EXISTS asset_process_runs;
DROP FUNCTION IF EXISTS set_asset_process_number();
DROP SEQUENCE IF EXISTS asset_process_seq;

DELETE FROM role_bindings
WHERE role_id IN (
    SELECT id FROM roles WHERE name IN (
        'assistant_it_facilities_specialist',
        'it_facilities_specialist',
        'senior_it_facilities_specialist',
        'it_facilities_lead',
        'asset_disposal_committee',
        'inventory_officer'
    )
);

DELETE FROM roles
WHERE name IN (
    'assistant_it_facilities_specialist',
    'it_facilities_specialist',
    'senior_it_facilities_specialist',
    'it_facilities_lead',
    'asset_disposal_committee',
    'inventory_officer'
);

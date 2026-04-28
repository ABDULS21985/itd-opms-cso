-- +goose Up
-- BRD §6.6-6.7 ITD Test Solution Process.

CREATE SEQUENCE IF NOT EXISTS test_solution_run_seq START WITH 1;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION set_test_solution_run_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.run_number IS NULL OR NEW.run_number = '' THEN
        NEW.run_number := 'TST-' || lpad(nextval('test_solution_run_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TABLE test_solution_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    run_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'change', 'release', 'project')),
    source_id UUID,
    release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
    change_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN (
        'intake', 'planning', 'authorized',
        'system_prereq', 'system_planning', 'system_preparation', 'system_readiness', 'system_execution', 'system_review',
        'integration_preparation', 'integration_execution',
        'stress_preparation', 'stress_execution',
        'security_preparation', 'security_execution',
        'data_conversion_preparation', 'data_conversion_execution',
        'uat_confirmation', 'uat_preparation', 'uat_nominees', 'uat_execution', 'uat_review',
        'release_handoff', 'build_rework', 'closed', 'cancelled'
    )),
    required_test_types TEXT[] NOT NULL DEFAULT ARRAY['system','integration','stress_performance','security','data_conversion','uat'],
    authorized_test_types TEXT[] NOT NULL DEFAULT '{}',
    test_manager_id UUID REFERENCES users(id),
    test_lead_id UUID REFERENCES users(id),
    release_management_lead_id UUID REFERENCES users(id),
    requirements JSONB NOT NULL DEFAULT '{}',
    test_plan JSONB NOT NULL DEFAULT '{}',
    readiness_checklist JSONB NOT NULL DEFAULT '[]',
    evidence JSONB NOT NULL DEFAULT '{}',
    uat_signoff JSONB NOT NULL DEFAULT '{}',
    overall_outcome TEXT NOT NULL DEFAULT 'pending' CHECK (overall_outcome IN ('pending', 'successful', 'failed', 'blocked', 'cancelled')),
    failure_reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, run_number)
);

CREATE TRIGGER trg_test_solution_run_number
BEFORE INSERT ON test_solution_runs
FOR EACH ROW
WHEN (NEW.run_number IS NULL OR NEW.run_number = '')
EXECUTE FUNCTION set_test_solution_run_number();

CREATE TABLE test_solution_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    run_id UUID NOT NULL REFERENCES test_solution_runs(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL CHECK (test_type IN ('system', 'integration', 'stress_performance', 'security', 'data_conversion', 'uat')),
    title TEXT NOT NULL,
    script_reference TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'executing', 'passed', 'failed', 'blocked', 'skipped')),
    assigned_to UUID REFERENCES users(id),
    evidence JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE test_solution_signoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    run_id UUID NOT NULL REFERENCES test_solution_runs(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL CHECK (test_type IN ('system', 'integration', 'stress_performance', 'security', 'data_conversion', 'uat', 'overall')),
    signer_id UUID NOT NULL REFERENCES users(id),
    role_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
    comments TEXT,
    evidence JSONB NOT NULL DEFAULT '{}',
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_solution_runs_tenant_status ON test_solution_runs(tenant_id, status);
CREATE INDEX idx_test_solution_runs_release ON test_solution_runs(tenant_id, release_id);
CREATE INDEX idx_test_solution_runs_change ON test_solution_runs(tenant_id, change_ticket_id);
CREATE INDEX idx_test_solution_cases_run ON test_solution_cases(run_id);
CREATE INDEX idx_test_solution_cases_type_status ON test_solution_cases(tenant_id, test_type, status);
CREATE INDEX idx_test_solution_signoffs_run ON test_solution_signoffs(run_id);
CREATE INDEX idx_test_solution_signoffs_signer ON test_solution_signoffs(tenant_id, signer_id, status);

CREATE POLICY tenant_isolation ON test_solution_runs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE test_solution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_solution_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON test_solution_cases
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE test_solution_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_solution_cases FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON test_solution_signoffs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
ALTER TABLE test_solution_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_solution_signoffs FORCE ROW LEVEL SECURITY;

INSERT INTO roles (id, name, description, permissions, is_system)
VALUES
(
    '10000000-0000-0000-0000-000000000042',
    'test_manager',
    'Test Manager - responsible for planning, authorizing, monitoring, and closing ITD test solution runs',
    '["test_solution.view", "test_solution.manage", "release.view", "itsm.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000043',
    'solution_developer',
    'Solution Developer - responsible for preparing artefacts, environments, data conversion, and rework during test solution execution',
    '["test_solution.view", "test_solution.manage", "release.view", "itsm.view", "cmdb.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000044',
    'senior_solution_developer',
    'Senior Solution Developer - accountable for solution artefact, environment, and rework quality during test solution execution',
    '["test_solution.view", "test_solution.manage", "release.view", "itsm.view", "cmdb.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000045',
    'test_analyst',
    'Test Analyst - responsible for data conversion testing and test execution evidence',
    '["test_solution.view", "test_solution.manage", "release.view", "itsm.view", "documents.view"]'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = true;

UPDATE roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["test_solution.view", "test_solution.manage"]'::jsonb
WHERE name IN (
    'global_admin',
    'admin',
    'tenant_admin',
    'itd_director',
    'release_manager',
    'release_management_lead',
    'test_management_specialist',
    'solutions_delivery_specialist'
);

CREATE TEMP TABLE tmp_test_solution_role_candidates AS
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
FROM tmp_test_solution_role_candidates c
JOIN roles r ON r.name = 'test_manager'
WHERE c.job_title LIKE '%TEST MANAGER%'
   OR c.job_title LIKE '%QA MANAGER%'
   OR c.org_path LIKE '%TEST MANAGEMENT%'
   OR c.org_path LIKE '%QUALITY ASSURANCE%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_test_solution_role_candidates c
JOIN roles r ON r.name = 'solution_developer'
WHERE c.job_title LIKE '%SOLUTION%DEVELOPER%'
   OR c.job_title LIKE '%SOFTWARE%DEVELOPER%'
   OR c.job_title LIKE '%APPLICATION%DEVELOPER%'
   OR c.org_path LIKE '%APPLICATION DEVELOPMENT%'
   OR c.org_path LIKE '%SOLUTION DELIVERY%'
   OR c.org_path LIKE '%SOLUTIONS DELIVERY%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_test_solution_role_candidates c
JOIN roles r ON r.name = 'senior_solution_developer'
WHERE (c.job_title LIKE '%SENIOR%' OR c.job_title LIKE '%LEAD%' OR c.job_title LIKE '%HEAD%' OR c.job_title LIKE '%MANAGER%')
  AND (
      c.job_title LIKE '%SOLUTION%DEVELOPER%'
      OR c.job_title LIKE '%SOFTWARE%DEVELOPER%'
      OR c.job_title LIKE '%APPLICATION%DEVELOPER%'
      OR c.org_path LIKE '%APPLICATION DEVELOPMENT%'
      OR c.org_path LIKE '%SOLUTION DELIVERY%'
      OR c.org_path LIKE '%SOLUTIONS DELIVERY%'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_test_solution_role_candidates c
JOIN roles r ON r.name = 'test_analyst'
WHERE c.job_title LIKE '%TEST ANALYST%'
   OR c.job_title LIKE '%QA ANALYST%'
   OR c.job_title LIKE '%TESTER%'
   OR c.org_path LIKE '%TEST MANAGEMENT%'
   OR c.org_path LIKE '%QUALITY ASSURANCE%'
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS tmp_test_solution_role_candidates;

-- +goose Down
DROP TABLE IF EXISTS test_solution_signoffs;
DROP TABLE IF EXISTS test_solution_cases;
DROP TRIGGER IF EXISTS trg_test_solution_run_number ON test_solution_runs;
DROP TABLE IF EXISTS test_solution_runs;
DROP FUNCTION IF EXISTS set_test_solution_run_number();
DROP SEQUENCE IF EXISTS test_solution_run_seq;

DELETE FROM role_bindings
WHERE role_id IN (
    SELECT id FROM roles
    WHERE name IN ('test_manager', 'solution_developer', 'senior_solution_developer', 'test_analyst')
);

DELETE FROM roles
WHERE name IN ('test_manager', 'solution_developer', 'senior_solution_developer', 'test_analyst');

UPDATE roles
SET permissions = permissions - 'test_solution.view' - 'test_solution.manage'
WHERE permissions @> '["test_solution.view"]';

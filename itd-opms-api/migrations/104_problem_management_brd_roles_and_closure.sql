-- +goose Up
-- BRD-aligned Problem Management responsibility roles and lifecycle closure.

INSERT INTO roles (id, name, description, permissions, is_system)
VALUES
(
    '10000000-0000-0000-0000-000000000020',
    'it_service_center_specialist',
    'IT Service Center Specialist — responsible for problem logging, categorization, prioritization, investigation, workaround, resolution, and closure preparation',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "knowledge.manage", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000021',
    'senior_it_service_center_specialist',
    'Senior IT Service Center Specialist — accountable for Problem Management decisions, third-party escalation, resolution acceptance, and closure',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "knowledge.manage", "documents.view", "reporting.view", "system.audit.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000022',
    'it_service_support_specialist',
    'IT Service Support Specialist — responsible for technical inputs, diagnostics, workaround definition, and implementation support in Problem Management',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view"]'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = true;

ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_status_check;
ALTER TABLE problems
    ADD CONSTRAINT problems_status_check
    CHECK (status IN (
        'logged',
        'investigating',
        'root_cause_identified',
        'known_error',
        'third_party_escalated',
        'resolved',
        'closed'
    ));

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_validate_problem_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'logged' AND NEW.status = 'investigating') OR
            (OLD.status = 'investigating' AND NEW.status IN ('root_cause_identified', 'known_error', 'third_party_escalated')) OR
            (OLD.status = 'third_party_escalated' AND NEW.status IN ('investigating', 'root_cause_identified', 'known_error')) OR
            (OLD.status = 'root_cause_identified' AND NEW.status IN ('known_error', 'resolved')) OR
            (OLD.status = 'known_error' AND NEW.status = 'resolved') OR
            (OLD.status = 'resolved' AND NEW.status IN ('closed', 'investigating'))
        ) THEN
            RAISE EXCEPTION 'invalid problem transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_validate_problem_status_transition ON problems;
CREATE TRIGGER trg_validate_problem_status_transition
    BEFORE UPDATE OF status ON problems
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_problem_status_transition();

WITH problem_role_candidates AS (
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
    GROUP BY u.id, u.tenant_id, u.org_unit_id, u.job_title
),
eligible AS (
    SELECT *
    FROM problem_role_candidates
    WHERE job_title LIKE '%IT SERVICE CENTER SPECIALIST%'
       OR job_title LIKE '%IT SERVICE CENTRE SPECIALIST%'
       OR job_title LIKE '%IT SERVICE SUPPORT SPECIALIST%'
       OR org_path LIKE '%IT SERVICE SUPPORT%'
       OR org_path LIKE '%IT SERVICE CENTRE%'
       OR org_path LIKE '%IT SERVICE CENTER%'
       OR org_path LIKE '%IT - SERVICE CENTRE%'
       OR org_path LIKE '%USER SUPPORT HELP DESK%'
       OR org_path LIKE '%BRANCH IT SUPPORT%'
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT e.id, r.id, e.tenant_id, 'unit'::scope_type, e.org_unit_id, NULL, true
FROM eligible e
JOIN roles r ON r.name = 'senior_it_service_center_specialist'
WHERE e.job_title LIKE '%SENIOR%'
   OR e.job_title LIKE '%LEAD%'
   OR e.job_title LIKE '%SUPERVISOR%'
   OR e.job_title LIKE '%MANAGER%'
   OR e.job_title LIKE '%HEAD%'
   OR e.job_title LIKE '%DIRECTOR%'
ON CONFLICT DO NOTHING;

WITH problem_role_candidates AS (
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
    GROUP BY u.id, u.tenant_id, u.org_unit_id, u.job_title
),
center_candidates AS (
    SELECT *
    FROM problem_role_candidates
    WHERE job_title LIKE '%IT SERVICE CENTER SPECIALIST%'
       OR job_title LIKE '%IT SERVICE CENTRE SPECIALIST%'
       OR org_path LIKE '%IT SERVICE CENTRE%'
       OR org_path LIKE '%IT SERVICE CENTER%'
       OR org_path LIKE '%IT - SERVICE CENTRE%'
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM center_candidates c
JOIN roles r ON r.name = 'it_service_center_specialist'
WHERE NOT EXISTS (
    SELECT 1
    FROM role_bindings rb
    JOIN roles existing_role ON existing_role.id = rb.role_id
    WHERE rb.user_id = c.id
      AND rb.tenant_id = c.tenant_id
      AND rb.is_active = true
      AND existing_role.name = 'senior_it_service_center_specialist'
)
ON CONFLICT DO NOTHING;

WITH problem_role_candidates AS (
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
    GROUP BY u.id, u.tenant_id, u.org_unit_id, u.job_title
),
support_candidates AS (
    SELECT *
    FROM problem_role_candidates
    WHERE job_title LIKE '%IT SERVICE SUPPORT SPECIALIST%'
       OR org_path LIKE '%IT SERVICE SUPPORT%'
       OR org_path LIKE '%USER SUPPORT HELP DESK%'
       OR org_path LIKE '%BRANCH IT SUPPORT%'
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT s.id, r.id, s.tenant_id, 'unit'::scope_type, s.org_unit_id, NULL, true
FROM support_candidates s
JOIN roles r ON r.name = 'it_service_support_specialist'
WHERE NOT EXISTS (
    SELECT 1
    FROM role_bindings rb
    JOIN roles existing_role ON existing_role.id = rb.role_id
    WHERE rb.user_id = s.id
      AND rb.tenant_id = s.tenant_id
      AND rb.is_active = true
      AND existing_role.name IN ('senior_it_service_center_specialist', 'it_service_center_specialist')
)
ON CONFLICT DO NOTHING;

-- +goose Down
UPDATE problems SET status = 'resolved' WHERE status = 'closed';
UPDATE problems SET status = 'investigating' WHERE status = 'third_party_escalated';

DROP TRIGGER IF EXISTS trg_validate_problem_status_transition ON problems;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_validate_problem_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'logged' AND NEW.status = 'investigating') OR
            (OLD.status = 'investigating' AND NEW.status IN ('root_cause_identified', 'known_error')) OR
            (OLD.status = 'root_cause_identified' AND NEW.status IN ('known_error', 'resolved')) OR
            (OLD.status = 'known_error' AND NEW.status = 'resolved') OR
            (OLD.status = 'resolved' AND NEW.status = 'investigating')
        ) THEN
            RAISE EXCEPTION 'invalid problem transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_validate_problem_status_transition
    BEFORE UPDATE OF status ON problems
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_problem_status_transition();

ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_status_check;
ALTER TABLE problems
    ADD CONSTRAINT problems_status_check
    CHECK (status IN ('logged', 'investigating', 'root_cause_identified', 'known_error', 'resolved'));

DELETE FROM role_bindings
WHERE role_id IN (
    SELECT id FROM roles
    WHERE name IN (
        'it_service_center_specialist',
        'senior_it_service_center_specialist',
        'it_service_support_specialist'
    )
);

DELETE FROM roles
WHERE name IN (
    'it_service_center_specialist',
    'senior_it_service_center_specialist',
    'it_service_support_specialist'
);

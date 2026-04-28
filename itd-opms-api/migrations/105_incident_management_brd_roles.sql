-- +goose Up
-- BRD-aligned Incident Management responsibility roles.

INSERT INTO roles (id, name, description, permissions, is_system)
VALUES
(
    '10000000-0000-0000-0000-000000000023',
    'service_desk_specialist',
    'Service Desk Specialist — responsible for incident identification, recording, categorization, prioritization, initial diagnosis, customer communication, and closure preparation',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "knowledge.manage", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000024',
    'end_user_support_specialist',
    'End User Support Specialist — first-line technical support responsible for incident escalation support, investigation, and diagnosis',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000025',
    'second_level_support_specialist',
    'Second-Level Support Specialist — resolver group specialist responsible for advanced diagnosis, recovery actions, and 3rd party/vendor escalation',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view"]'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = true;

-- Preserve already mapped service desk staff under the BRD incident title.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT rb.user_id, target.id, rb.tenant_id, rb.scope_type, rb.scope_id, rb.granted_by, true
FROM role_bindings rb
JOIN roles source ON source.id = rb.role_id
JOIN roles target ON target.name = 'service_desk_specialist'
WHERE rb.is_active = true
  AND source.name IN ('service_desk_agent', 'service_desk_analyst', 'senior_service_desk_analyst')
ON CONFLICT DO NOTHING;

-- Existing IT service support specialists are valid first-line incident support.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT rb.user_id, target.id, rb.tenant_id, rb.scope_type, rb.scope_id, rb.granted_by, true
FROM role_bindings rb
JOIN roles source ON source.id = rb.role_id
JOIN roles target ON target.name = 'end_user_support_specialist'
WHERE rb.is_active = true
  AND source.name = 'it_service_support_specialist'
ON CONFLICT DO NOTHING;

-- Existing IT service centre/support specialists can act as second-level resolver groups.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT rb.user_id, target.id, rb.tenant_id, rb.scope_type, rb.scope_id, rb.granted_by, true
FROM role_bindings rb
JOIN roles source ON source.id = rb.role_id
JOIN roles target ON target.name = 'second_level_support_specialist'
WHERE rb.is_active = true
  AND source.name IN ('it_service_center_specialist', 'it_service_support_specialist')
ON CONFLICT DO NOTHING;

WITH incident_role_candidates AS (
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
service_desk_candidates AS (
    SELECT *
    FROM incident_role_candidates
    WHERE job_title LIKE '%SERVICE DESK SPECIALIST%'
       OR job_title LIKE '%SERVICE DESK%'
       OR job_title LIKE '%HELP DESK%'
       OR org_path LIKE '%SERVICE DESK%'
       OR org_path LIKE '%USER SUPPORT HELP DESK%'
       OR (org_path LIKE '%HELP DESK%' AND (org_path LIKE '%IT%' OR org_path LIKE '%USER SUPPORT%'))
),
end_user_candidates AS (
    SELECT *
    FROM incident_role_candidates
    WHERE job_title LIKE '%END USER SUPPORT%'
       OR job_title LIKE '%USER SUPPORT%'
       OR job_title LIKE '%DESKTOP SUPPORT%'
       OR org_path LIKE '%END USER SUPPORT%'
       OR org_path LIKE '%USER SUPPORT HELP DESK%'
       OR org_path LIKE '%BRANCH IT SUPPORT%'
       OR org_path LIKE '%IT SERVICE SUPPORT%'
),
second_level_candidates AS (
    SELECT *
    FROM incident_role_candidates
    WHERE job_title LIKE '%SECOND LEVEL%'
       OR job_title LIKE '%SPECIALIST SUPPORT%'
       OR org_path LIKE '%APPLICATION MANAGEMENT%'
       OR org_path LIKE '%INFRASTRUCTURE OPERATIONS%'
       OR org_path LIKE '%INFORMATION SECURITY%'
       OR org_path LIKE '%NETWORK%'
       OR org_path LIKE '%DATABASE%'
       OR org_path LIKE '%SYSTEM%'
       OR org_path LIKE '%IT SERVICE CENTRE%'
       OR org_path LIKE '%IT SERVICE CENTER%'
       OR org_path LIKE '%IOMD%'
       OR org_path LIKE '%ISMD%'
       OR org_path LIKE '%AMD%'
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM service_desk_candidates c
JOIN roles r ON r.name = 'service_desk_specialist'
ON CONFLICT DO NOTHING;

WITH incident_role_candidates AS (
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
end_user_candidates AS (
    SELECT *
    FROM incident_role_candidates
    WHERE job_title LIKE '%END USER SUPPORT%'
       OR job_title LIKE '%USER SUPPORT%'
       OR job_title LIKE '%DESKTOP SUPPORT%'
       OR org_path LIKE '%END USER SUPPORT%'
       OR org_path LIKE '%USER SUPPORT HELP DESK%'
       OR org_path LIKE '%BRANCH IT SUPPORT%'
       OR org_path LIKE '%IT SERVICE SUPPORT%'
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM end_user_candidates c
JOIN roles r ON r.name = 'end_user_support_specialist'
ON CONFLICT DO NOTHING;

WITH incident_role_candidates AS (
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
second_level_candidates AS (
    SELECT *
    FROM incident_role_candidates
    WHERE job_title LIKE '%SECOND LEVEL%'
       OR job_title LIKE '%SPECIALIST SUPPORT%'
       OR org_path LIKE '%APPLICATION MANAGEMENT%'
       OR org_path LIKE '%INFRASTRUCTURE OPERATIONS%'
       OR org_path LIKE '%INFORMATION SECURITY%'
       OR org_path LIKE '%NETWORK%'
       OR org_path LIKE '%DATABASE%'
       OR org_path LIKE '%SYSTEM%'
       OR org_path LIKE '%IT SERVICE CENTRE%'
       OR org_path LIKE '%IT SERVICE CENTER%'
       OR org_path LIKE '%IOMD%'
       OR org_path LIKE '%ISMD%'
       OR org_path LIKE '%AMD%'
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM second_level_candidates c
JOIN roles r ON r.name = 'second_level_support_specialist'
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM role_bindings
WHERE role_id IN (
    SELECT id FROM roles
    WHERE name IN (
        'service_desk_specialist',
        'end_user_support_specialist',
        'second_level_support_specialist'
    )
);

DELETE FROM roles
WHERE name IN (
    'service_desk_specialist',
    'end_user_support_specialist',
    'second_level_support_specialist'
);

-- +goose Up
-- BRD-aligned IT Release and Deployment Management responsibility roles.

INSERT INTO roles (id, name, description, permissions, is_system)
VALUES
(
    '10000000-0000-0000-0000-000000000038',
    'release_management_lead',
    'Release Management Lead - accountable for release planning, deployment authorization, rollback oversight, and close-out governance',
    '["release.view", "release.manage", "itsm.view", "cmdb.view", "cmdb.manage", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000039',
    'solutions_delivery_specialist',
    'Solutions Delivery Specialist - responsible for deployment team setup, environment readiness, solution rollout, evaluation, data migration, and rollback execution',
    '["release.view", "release.manage", "itsm.view", "cmdb.view", "cmdb.manage", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000040',
    'senior_release_management_specialist',
    'Senior Release Management Specialist - accountable for release close-out report quality and management evidence',
    '["release.view", "release.manage", "itsm.view", "cmdb.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000041',
    'ditd_approver',
    'DITD Approver - accountable for Director ITD approval of solution deployment requests',
    '["release.view", "release.manage", "itsm.view", "cmdb.view", "documents.view", "reporting.view", "system.audit.view"]'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = true;

CREATE TEMP TABLE tmp_release_role_candidates ON COMMIT DROP AS
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

-- Refresh release managers using the explicit BRD release/deployment office signals.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_release_role_candidates c
JOIN roles r ON r.name = 'release_manager'
WHERE c.job_title LIKE '%RELEASE%'
   OR c.job_title LIKE '%DEPLOYMENT%'
   OR c.org_path LIKE '%RELEASE%'
   OR c.org_path LIKE '%DEPLOYMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_release_role_candidates c
JOIN roles r ON r.name = 'release_management_lead'
WHERE c.job_title LIKE '%RELEASE MANAGEMENT LEAD%'
   OR c.job_title LIKE '%RELEASE LEAD%'
   OR (
        (c.org_path LIKE '%RELEASE%' OR c.org_path LIKE '%DEPLOYMENT%' OR c.org_path LIKE '%SOLUTION%DELIVERY%')
        AND (
            c.job_title LIKE '%LEAD%'
            OR c.job_title LIKE '%HEAD%'
            OR c.job_title LIKE '%MANAGER%'
            OR c.job_title LIKE '%DIRECTOR%'
        )
   )
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_release_role_candidates c
JOIN roles r ON r.name = 'solutions_delivery_specialist'
WHERE c.job_title LIKE '%SOLUTION%DELIVERY%'
   OR c.job_title LIKE '%SOLUTIONS%DELIVERY%'
   OR c.org_path LIKE '%SOLUTION%DELIVERY%'
   OR c.org_path LIKE '%SOLUTIONS%DELIVERY%'
   OR c.org_path LIKE '%APPLICATION DEVELOPMENT%'
   OR c.org_path LIKE '%APPLICATION MANAGEMENT%'
   OR c.org_path LIKE '%SERVICE DELIVERY%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_release_role_candidates c
JOIN roles r ON r.name = 'senior_release_management_specialist'
WHERE c.job_title LIKE '%SENIOR RELEASE MANAGEMENT SPECIALIST%'
   OR (c.job_title LIKE '%SENIOR%' AND c.job_title LIKE '%RELEASE%' AND c.job_title LIKE '%SPECIALIST%')
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_release_role_candidates c
JOIN roles r ON r.name = 'ditd_approver'
WHERE c.job_title LIKE '%DITD%'
   OR c.org_path LIKE '%DITD%'
   OR (
        (c.job_title LIKE '%DIRECTOR%' OR c.job_title LIKE '%DEPUTY DIRECTOR%')
        AND (c.org_path LIKE '%ITD%' OR c.org_path LIKE '%INFORMATION TECHNOLOGY%')
   )
ON CONFLICT DO NOTHING;

-- Existing release managers with explicit seniority are also accountable leads.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT rb.user_id, target.id, rb.tenant_id, rb.scope_type, rb.scope_id, rb.granted_by, true
FROM role_bindings rb
JOIN roles source ON source.id = rb.role_id
JOIN roles target ON target.name = 'release_management_lead'
JOIN users u ON u.id = rb.user_id
WHERE rb.is_active = true
  AND source.name = 'release_manager'
  AND (
      upper(coalesce(u.job_title, '')) LIKE '%LEAD%'
      OR upper(coalesce(u.job_title, '')) LIKE '%HEAD%'
      OR upper(coalesce(u.job_title, '')) LIKE '%MANAGER%'
      OR upper(coalesce(u.job_title, '')) LIKE '%DIRECTOR%'
  )
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM role_bindings
WHERE role_id IN (
    SELECT id FROM roles
    WHERE name IN (
        'release_management_lead',
        'solutions_delivery_specialist',
        'senior_release_management_specialist',
        'ditd_approver'
    )
);

DELETE FROM roles
WHERE name IN (
    'release_management_lead',
    'solutions_delivery_specialist',
    'senior_release_management_specialist',
    'ditd_approver'
);

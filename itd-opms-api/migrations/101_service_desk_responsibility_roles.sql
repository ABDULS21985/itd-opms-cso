-- +goose Up
-- First-class BRD responsibility roles for request fulfillment.

INSERT INTO roles (id, name, description, permissions, is_system)
VALUES
(
    '10000000-0000-0000-0000-000000000018',
    'service_desk_analyst',
    'Service Desk Analyst — responsible for request receive/review, package, route, monitor, execute, notify, and close',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "knowledge.manage", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000019',
    'senior_service_desk_analyst',
    'Senior Service Desk Analyst — accountable for request fulfillment and authorized to override or escalate service provisioning',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "knowledge.manage", "documents.view", "reporting.view", "system.audit.view"]'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = true;

-- Preserve existing generic service desk agents by granting the analyst responsibility role.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT rb.user_id, r2.id, rb.tenant_id, rb.scope_type, rb.scope_id, rb.granted_by, true
FROM role_bindings rb
JOIN roles r1 ON r1.id = rb.role_id
JOIN roles r2 ON r2.name = 'service_desk_analyst'
WHERE rb.is_active = true
  AND r1.name = 'service_desk_agent'
ON CONFLICT DO NOTHING;

-- Auto-map existing directory users when job titles already carry the BRD responsibility labels.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT u.id, r.id, u.tenant_id, 'tenant'::scope_type, NULL, NULL, true
FROM users u
JOIN roles r ON r.name = 'senior_service_desk_analyst'
WHERE u.is_active = true
  AND (
      upper(coalesce(u.job_title, '')) LIKE '%SERVICE DESK%'
      OR upper(coalesce(u.job_title, '')) LIKE '%HELP DESK%'
  )
  AND (
      upper(coalesce(u.job_title, '')) LIKE '%ANALYST%'
      OR upper(coalesce(u.job_title, '')) LIKE '%AGENT%'
      OR upper(coalesce(u.job_title, '')) LIKE '%OFFICER%'
  )
  AND (
      upper(coalesce(u.job_title, '')) LIKE '%SENIOR%'
      OR upper(coalesce(u.job_title, '')) LIKE '%LEAD%'
      OR upper(coalesce(u.job_title, '')) LIKE '%SUPERVISOR%'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT u.id, r.id, u.tenant_id, 'tenant'::scope_type, NULL, NULL, true
FROM users u
JOIN roles r ON r.name = 'service_desk_analyst'
WHERE u.is_active = true
  AND (
      upper(coalesce(u.job_title, '')) LIKE '%SERVICE DESK%'
      OR upper(coalesce(u.job_title, '')) LIKE '%HELP DESK%'
  )
  AND (
      upper(coalesce(u.job_title, '')) LIKE '%ANALYST%'
      OR upper(coalesce(u.job_title, '')) LIKE '%AGENT%'
      OR upper(coalesce(u.job_title, '')) LIKE '%OFFICER%'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM role_bindings rb
      JOIN roles existing_role ON existing_role.id = rb.role_id
      WHERE rb.user_id = u.id
        AND rb.tenant_id = u.tenant_id
        AND rb.is_active = true
        AND existing_role.name = 'senior_service_desk_analyst'
  )
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM role_bindings
WHERE role_id IN (
    SELECT id FROM roles WHERE name IN ('service_desk_analyst', 'senior_service_desk_analyst')
);

DELETE FROM roles
WHERE name IN ('service_desk_analyst', 'senior_service_desk_analyst');

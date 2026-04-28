-- +goose Up
-- Bind already-imported ERP users in service desk org units to first-class
-- request fulfillment responsibility roles.

WITH service_desk_users AS (
    SELECT u.id, u.tenant_id, u.org_unit_id, upper(coalesce(u.job_title, '')) AS job_title
    FROM users u
    WHERE u.is_active = true
      AND u.org_unit_id IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM org_hierarchy oh
          JOIN org_units ou ON ou.id = oh.ancestor_id
          WHERE oh.descendant_id = u.org_unit_id
            AND (
                upper(ou.name) LIKE '%USER SUPPORT HELP DESK%'
                OR upper(ou.name) LIKE '%IT SERVICE SUPPORT%'
                OR upper(ou.name) LIKE '%SERVICE DESK%'
                OR (
                    upper(ou.name) LIKE '%HELP DESK%'
                    AND (upper(ou.name) LIKE '%IT%' OR upper(ou.name) LIKE '%USER SUPPORT%')
                )
            )
      )
),
senior_service_desk_users AS (
    SELECT *
    FROM service_desk_users
    WHERE job_title LIKE '%SENIOR%'
       OR job_title LIKE '%LEAD%'
       OR job_title LIKE '%SUPERVISOR%'
       OR job_title LIKE '%MANAGER%'
       OR job_title LIKE '%HEAD%'
       OR job_title LIKE '%DIRECTOR%'
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT sdu.id, r.id, sdu.tenant_id, 'unit'::scope_type, sdu.org_unit_id, NULL, true
FROM senior_service_desk_users sdu
JOIN roles r ON r.name = 'senior_service_desk_analyst'
ON CONFLICT DO NOTHING;

WITH service_desk_users AS (
    SELECT u.id, u.tenant_id, u.org_unit_id, upper(coalesce(u.job_title, '')) AS job_title
    FROM users u
    WHERE u.is_active = true
      AND u.org_unit_id IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM org_hierarchy oh
          JOIN org_units ou ON ou.id = oh.ancestor_id
          WHERE oh.descendant_id = u.org_unit_id
            AND (
                upper(ou.name) LIKE '%USER SUPPORT HELP DESK%'
                OR upper(ou.name) LIKE '%IT SERVICE SUPPORT%'
                OR upper(ou.name) LIKE '%SERVICE DESK%'
                OR (
                    upper(ou.name) LIKE '%HELP DESK%'
                    AND (upper(ou.name) LIKE '%IT%' OR upper(ou.name) LIKE '%USER SUPPORT%')
                )
            )
      )
)
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT sdu.id, r.id, sdu.tenant_id, 'unit'::scope_type, sdu.org_unit_id, NULL, true
FROM service_desk_users sdu
JOIN roles r ON r.name = 'service_desk_analyst'
WHERE NOT EXISTS (
    SELECT 1
    FROM role_bindings rb
    JOIN roles existing_role ON existing_role.id = rb.role_id
    WHERE rb.user_id = sdu.id
      AND rb.tenant_id = sdu.tenant_id
      AND rb.is_active = true
      AND existing_role.name = 'senior_service_desk_analyst'
)
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM role_bindings rb
USING roles r, users u
WHERE rb.role_id = r.id
  AND rb.user_id = u.id
  AND rb.granted_by IS NULL
  AND r.name IN ('service_desk_analyst', 'senior_service_desk_analyst')
  AND u.org_unit_id IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM org_hierarchy oh
      JOIN org_units ou ON ou.id = oh.ancestor_id
      WHERE oh.descendant_id = u.org_unit_id
        AND (
            upper(ou.name) LIKE '%USER SUPPORT HELP DESK%'
            OR upper(ou.name) LIKE '%IT SERVICE SUPPORT%'
            OR upper(ou.name) LIKE '%SERVICE DESK%'
            OR (
                upper(ou.name) LIKE '%HELP DESK%'
                AND (upper(ou.name) LIKE '%IT%' OR upper(ou.name) LIKE '%USER SUPPORT%')
            )
        )
  );

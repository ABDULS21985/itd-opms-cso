-- +goose Up
-- Remove generated service desk role bindings from non-IT help desk org units
-- while preserving manually granted bindings.

DELETE FROM role_bindings rb
USING roles r
WHERE rb.role_id = r.id
  AND rb.granted_by IS NULL
  AND rb.scope_id IS NOT NULL
  AND r.name IN ('service_desk_analyst', 'senior_service_desk_analyst')
  AND NOT EXISTS (
      SELECT 1
      FROM org_hierarchy oh
      JOIN org_units ou ON ou.id = oh.ancestor_id
      WHERE oh.descendant_id = rb.scope_id
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

-- +goose Down
-- No-op. The pruned generated bindings can be recreated by re-running ERP import
-- or by a manual role grant if the org is intentionally responsible.

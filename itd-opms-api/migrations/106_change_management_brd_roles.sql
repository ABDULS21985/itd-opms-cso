-- +goose Up
-- BRD-aligned IT Change Management responsibility roles and ERP backfill.

INSERT INTO roles (id, name, description, permissions, is_system)
VALUES
(
    '10000000-0000-0000-0000-000000000026',
    'change_requestor',
    'Change Requestor - responsible for initiating or preparing RFC information for change management',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000027',
    'business_analyst',
    'Business Analyst - responsible for receiving RFCs, documenting change requests, requester communication, and PIR support',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000028',
    'business_relationship_manager',
    'Business Relationship Manager - accountable for RFC intake, requester communication, and post-implementation satisfaction',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000029',
    'change_manager',
    'Change Manager - responsible for change planning, scheduling, implementation control, closure, and management reporting',
    '["itsm.view", "itsm.manage", "cmdb.view", "cmdb.manage", "knowledge.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000030',
    'test_management_specialist',
    'Test Management Specialist - accountable for RFC validation, testing evidence, implementation planning, and closure evidence',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000031',
    'subject_matter_expert',
    'Subject Matter Expert - responsible for technical impact analysis and risk assessment for normal changes',
    '["itsm.view", "itsm.manage", "cmdb.view", "cmdb.manage", "knowledge.view", "documents.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000032',
    'it_compliance_specialist',
    'IT Compliance Specialist - responsible for compliance input, risk review, and control evidence for changes',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view", "grc.view", "system.audit.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000033',
    'cab_member',
    'CAB Member - responsible for reviewing, approving, rejecting, or deferring change requests',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000034',
    'cab_meeting_secretary',
    'CAB Meeting Secretary - responsible for CAB meeting scheduling, agenda preparation, invitations, and decision recording',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000035',
    'release_manager',
    'Release Manager - responsible for release handoff, implementation authorization, execution reporting, and rollback support',
    '["itsm.view", "itsm.manage", "cmdb.view", "cmdb.manage", "knowledge.view", "documents.view", "reporting.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000036',
    'change_approver',
    'Change Approver - accountable for emergency, normal, and implementation authorization decisions',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view", "reporting.view", "system.audit.view"]'::jsonb,
    true
),
(
    '10000000-0000-0000-0000-000000000037',
    'support_analyst',
    'Support Analyst - responsible for requester notification and support coordination during change implementation',
    '["itsm.view", "itsm.manage", "cmdb.view", "knowledge.view", "documents.view"]'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = true;

CREATE TEMP TABLE tmp_change_role_candidates ON COMMIT DROP AS
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
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'business_analyst'
WHERE c.job_title LIKE '%BUSINESS ANALYST%'
   OR c.org_path LIKE '%BUSINESS ANALYST%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'business_relationship_manager'
WHERE c.job_title LIKE '%BUSINESS RELATIONSHIP%'
   OR c.job_title LIKE '%BRM%'
   OR c.org_path LIKE '%BUSINESS RELATIONSHIP%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'change_requestor'
WHERE c.job_title LIKE '%CHANGE REQUESTOR%'
   OR c.job_title LIKE '%BUSINESS ANALYST%'
   OR c.job_title LIKE '%BUSINESS RELATIONSHIP%'
   OR c.job_title LIKE '%CHANGE MANAGER%'
   OR c.org_path LIKE '%BUSINESS RELATIONSHIP%'
   OR c.org_path LIKE '%CHANGE MANAGEMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'change_manager'
WHERE c.job_title LIKE '%CHANGE MANAGER%'
   OR c.job_title LIKE '%PROJECT MANAGER%'
   OR c.org_path LIKE '%CHANGE MANAGEMENT%'
   OR c.org_path LIKE '%TEST MANAGEMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'test_management_specialist'
WHERE c.job_title LIKE '%TEST MANAGEMENT%'
   OR c.org_path LIKE '%TEST MANAGEMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'subject_matter_expert'
WHERE c.job_title LIKE '%SUBJECT MATTER EXPERT%'
   OR c.job_title LIKE '%SPECIALIST%'
   OR c.org_path LIKE '%APPLICATION MANAGEMENT%'
   OR c.org_path LIKE '%INFRASTRUCTURE%'
   OR c.org_path LIKE '%NETWORK%'
   OR c.org_path LIKE '%DATABASE%'
   OR c.org_path LIKE '%SYSTEM%'
   OR c.org_path LIKE '%INFORMATION SECURITY%'
   OR c.org_path LIKE '%IOMD%'
   OR c.org_path LIKE '%ISMD%'
   OR c.org_path LIKE '%AMD%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'it_compliance_specialist'
WHERE c.job_title LIKE '%COMPLIANCE%'
   OR c.job_title LIKE '%CONTROL%'
   OR c.job_title LIKE '%RISK%'
   OR c.org_path LIKE '%COMPLIANCE%'
   OR c.org_path LIKE '%QUALITY%'
   OR c.org_path LIKE '%QCMD%'
   OR c.org_path LIKE '%CONTROL%'
   OR c.org_path LIKE '%RISK%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'cab_member'
WHERE c.job_title LIKE '%CAB%'
   OR c.job_title LIKE '%DIRECTOR%'
   OR c.job_title LIKE '%HEAD%'
   OR c.job_title LIKE '%MANAGER%'
   OR c.job_title LIKE '%LEAD%'
   OR c.org_path LIKE '%CHANGE ADVISORY%'
   OR c.org_path LIKE '%DITD%'
   OR c.org_path LIKE '%QCMD%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'cab_meeting_secretary'
WHERE c.job_title LIKE '%CAB SECRETARY%'
   OR c.job_title LIKE '%SECRETARY%'
   OR c.org_path LIKE '%CHANGE ADVISORY%'
   OR c.org_path LIKE '%CHANGE MANAGEMENT%'
   OR c.org_path LIKE '%TEST MANAGEMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'release_manager'
WHERE c.job_title LIKE '%RELEASE%'
   OR c.job_title LIKE '%DEPLOYMENT%'
   OR c.org_path LIKE '%RELEASE%'
   OR c.org_path LIKE '%DEPLOYMENT%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'change_approver'
WHERE c.job_title LIKE '%DIRECTOR%'
   OR c.job_title LIKE '%DEPUTY DIRECTOR%'
   OR c.job_title LIKE '%HEAD%'
   OR c.job_title LIKE '%CHANGE APPROVER%'
   OR c.org_path LIKE '%DITD%'
   OR c.org_path LIKE '%QCMD%'
ON CONFLICT DO NOTHING;

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT c.id, r.id, c.tenant_id, 'unit'::scope_type, c.org_unit_id, NULL, true
FROM tmp_change_role_candidates c
JOIN roles r ON r.name = 'support_analyst'
WHERE c.job_title LIKE '%SUPPORT ANALYST%'
   OR c.org_path LIKE '%IT SERVICE SUPPORT%'
   OR c.org_path LIKE '%USER SUPPORT%'
   OR c.org_path LIKE '%SERVICE DESK%'
   OR c.org_path LIKE '%HELP DESK%'
ON CONFLICT DO NOTHING;

-- Keep existing operational roles aligned with the new change-management responsibility model.
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active)
SELECT rb.user_id, target.id, rb.tenant_id, rb.scope_type, rb.scope_id, rb.granted_by, true
FROM role_bindings rb
JOIN roles source ON source.id = rb.role_id
JOIN roles target ON target.name = 'support_analyst'
WHERE rb.is_active = true
  AND source.name IN ('service_desk_analyst', 'senior_service_desk_analyst', 'service_desk_specialist')
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM role_bindings
WHERE role_id IN (
    SELECT id FROM roles
    WHERE name IN (
        'change_requestor',
        'business_analyst',
        'business_relationship_manager',
        'change_manager',
        'test_management_specialist',
        'subject_matter_expert',
        'it_compliance_specialist',
        'cab_member',
        'cab_meeting_secretary',
        'release_manager',
        'change_approver',
        'support_analyst'
    )
);

DELETE FROM roles
WHERE name IN (
    'change_requestor',
    'business_analyst',
    'business_relationship_manager',
    'change_manager',
    'test_management_specialist',
    'subject_matter_expert',
    'it_compliance_specialist',
    'cab_member',
    'cab_meeting_secretary',
    'release_manager',
    'change_approver',
    'support_analyst'
);

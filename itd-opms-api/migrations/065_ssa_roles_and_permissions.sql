-- Migration 065: SSA Roles & Stage-Specific Permissions
-- Implements separation of duties across the SSA workflow.
--
-- Permission scheme:
--   ssa.view            – view requests and approval history
--   ssa.manage          – create, edit, submit, cancel own requests
--   ssa.endorse         – HOO endorsement
--   ssa.assess          – ASD technical assessment
--   ssa.analyse         – QCMD capacity analysis
--   ssa.approve.dc      – Head Data Centre approval
--   ssa.approve.sso     – Head SSO approval
--   ssa.approve.imd     – Head IMD approval
--   ssa.approve.asd     – Head ASD approval
--   ssa.approve.scao    – Head SCAO approval
--   ssa.provision       – SAN provisioning
--   ssa.dco             – DCO server creation
--
-- Service-layer enforcement:
--   1. Requestor can NEVER act on their own request (self-approval guard)
--   2. An officer who acted at one stage is blocked from acting at another
--      stage of the same request (separation-of-duties guard)
--   3. Each workflow endpoint checks the stage-specific permission
-- ──────────────────────────────────────────────────────────────────────

-- UP ──────────────────────────────────────────────────────────────────

-- 1. Grant ssa.view + ssa.manage to existing general roles so that all
--    staff can raise requests, supervisors/heads can see them, etc.

-- staff → can view SSA and create own requests
UPDATE roles
SET permissions = permissions || '["ssa.view", "ssa.manage"]'::jsonb
WHERE name = 'staff'
  AND NOT permissions @> '"ssa.view"';

-- supervisor → same as staff
UPDATE roles
SET permissions = permissions || '["ssa.view", "ssa.manage"]'::jsonb
WHERE name = 'supervisor'
  AND NOT permissions @> '"ssa.view"';

-- head_of_division → view + manage + endorse (HOO for their division)
UPDATE roles
SET permissions = permissions || '["ssa.view", "ssa.manage", "ssa.endorse"]'::jsonb
WHERE name = 'head_of_division'
  AND NOT permissions @> '"ssa.view"';

-- itd_director → view only (approves via specific SSA roles below)
UPDATE roles
SET permissions = permissions || '["ssa.view"]'::jsonb
WHERE name = 'itd_director'
  AND NOT permissions @> '"ssa.view"';

-- auditor → view only
UPDATE roles
SET permissions = permissions || '["ssa.view"]'::jsonb
WHERE name = 'auditor'
  AND NOT permissions @> '"ssa.view"';

-- 2. Create SSA workflow-specific roles.  Each role maps to ONE stage
--    in the approval chain.  Assign these to the relevant officers.

INSERT INTO roles (id, name, description, permissions, is_system) VALUES
(
    '10000000-0000-0000-0000-100000000001',
    'ssa_hoo',
    'SSA Head of Office — endorses server/storage requests from their division',
    '["ssa.view", "ssa.manage", "ssa.endorse"]',
    true
),
(
    '10000000-0000-0000-0000-100000000002',
    'ssa_asd_assessor',
    'SSA ASD Assessor — performs technical feasibility assessment',
    '["ssa.view", "ssa.assess"]',
    true
),
(
    '10000000-0000-0000-0000-100000000003',
    'ssa_qcmd_analyst',
    'SSA QCMD Analyst — performs capacity analysis and server assignment',
    '["ssa.view", "ssa.analyse"]',
    true
),
(
    '10000000-0000-0000-0000-100000000004',
    'ssa_head_dc',
    'SSA Head Data Centre — approves at DC tier',
    '["ssa.view", "ssa.manage", "ssa.approve.dc"]',
    true
),
(
    '10000000-0000-0000-0000-100000000005',
    'ssa_head_sso',
    'SSA Head SSO — approves at SSO tier',
    '["ssa.view", "ssa.manage", "ssa.approve.sso"]',
    true
),
(
    '10000000-0000-0000-0000-100000000006',
    'ssa_head_imd',
    'SSA Head IMD — approves at IMD tier',
    '["ssa.view", "ssa.manage", "ssa.approve.imd"]',
    true
),
(
    '10000000-0000-0000-0000-100000000007',
    'ssa_head_asd',
    'SSA Head ASD — approves at ASD tier',
    '["ssa.view", "ssa.manage", "ssa.approve.asd"]',
    true
),
(
    '10000000-0000-0000-0000-100000000008',
    'ssa_head_scao',
    'SSA Head SCAO — final approval tier',
    '["ssa.view", "ssa.manage", "ssa.approve.scao"]',
    true
),
(
    '10000000-0000-0000-0000-100000000009',
    'ssa_san_admin',
    'SSA SAN Administrator — provisions SAN storage',
    '["ssa.view", "ssa.provision"]',
    true
),
(
    '10000000-0000-0000-0000-100000000010',
    'ssa_dco_operator',
    'SSA DCO Operator — creates servers in DCO',
    '["ssa.view", "ssa.dco"]',
    true
)
ON CONFLICT (name) DO UPDATE
SET permissions = EXCLUDED.permissions,
    description = EXCLUDED.description;


-- DOWN ────────────────────────────────────────────────────────────────

-- To roll back:
--   DELETE FROM roles WHERE name IN (
--     'ssa_hoo','ssa_asd_assessor','ssa_qcmd_analyst',
--     'ssa_head_dc','ssa_head_sso','ssa_head_imd','ssa_head_asd','ssa_head_scao',
--     'ssa_san_admin','ssa_dco_operator'
--   );
--   -- Then remove ssa.* entries from existing roles' permissions JSONB.

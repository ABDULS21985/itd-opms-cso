-- +goose Up
-- Migration 065: SSA Roles & Stage-Specific Permissions
-- Implements separation of duties across the SSA workflow.
--
-- Aligned to the ITD Organogram (Central Bank of Nigeria):
-- 10 Divisions, 33 Offices
--
--   Director ITD
--   ├─ 1. Administrator                    ← SCAO final sign-off
--   ├─ 2. Program Management Office
--   ├─ 3. Architecture & Strategy        ← ASD assessment + ASD head approval
--   │   ├─ IT Architecture
--   │   └─ IT Strategy & Innovation
--   ├─ 4. Business Relationship Management
--   │   ├─ Internal Systems
--   │   ├─ Surveillance Systems
--   │   ├─ Payment Systems
--   │   ├─ Developmental Initiatives
--   │   └─ External Relationships
--   ├─ 5. Applications Management
--   │   ├─ Payments & Operations Services
--   │   ├─ Financial Surveillance Services
--   │   ├─ Internal Support Services
--   │   ├─ Business Intelligence Services
--   │   └─ Collaboration Services
--   ├─ 6. IT Service Support Management
--   │   ├─ IT Service Center
--   │   ├─ Branch IT Support
--   │   └─ IT Assets Management
--   ├─ 7. Infrastructure Management        ← IMD head approval
--   │   ├─ Network Management
--   │   ├─ Data Center Management          ← DC approval + SAN provisioning
--   │   ├─ Network Operations Center
--   │   └─ Cloud Services Management
--   ├─ 8. Information Security Management  ← SSO approval
--   │   ├─ Security Programs Office
--   │   ├─ Payments & Applications Security
--   │   ├─ Systems & Network Security
--   │   └─ Security Operations Center
--   ├─ 9. Quality & Compliance Management  ← QCMD capacity analysis
--   │   ├─ Quality Management
--   │   ├─ IT Risk & Compliance Management
--   │   ├─ IT Change Management
--   │   ├─ Vendor Management
--   │   └─ IT Service Continuity & Availability
--   └─ 10. Operations Management           ← DCO server creation
--       ├─ Systems Services
--       ├─ Applications Administration
--       ├─ Database Management
--       └─ Systems Operations
--
-- Permission scheme:
--   ssa.view            – view requests and approval history
--   ssa.manage          – create, edit, submit, cancel own requests
--   ssa.endorse         – HOO endorsement (any division head for their staff)
--   ssa.assess          – Architecture & Strategy Division technical assessment
--   ssa.analyse         – Quality & Compliance Management capacity analysis
--   ssa.approve.dc      – Data Center Management approval
--   ssa.approve.sso     – Information Security Management approval
--   ssa.approve.imd     – Infrastructure Management head approval
--   ssa.approve.asd     – Architecture & Strategy Division head approval
--   ssa.approve.scao    – Administrator (SCAO) final approval
--   ssa.provision       – SAN provisioning (Data Center Management)
--   ssa.dco             – Server creation (Operations Management)
--
-- Service-layer enforcement:
--   1. Requestor can NEVER act on their own request (self-approval guard)
--   2. An officer who acted at one stage is blocked from acting at another
--      stage of the same request (separation-of-duties guard)
--   3. Each workflow endpoint checks the stage-specific permission
-- ──────────────────────────────────────────────────────────────────────

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

-- head_of_division → view + manage + endorse (HOO for their division's staff)
UPDATE roles
SET permissions = permissions || '["ssa.view", "ssa.manage", "ssa.endorse"]'::jsonb
WHERE name = 'head_of_division'
  AND NOT permissions @> '"ssa.view"';

-- itd_director → view only (Director ITD oversees but does not act in the chain)
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
--    in the approval chain, tied to a real division/office in the ITD
--    organogram.

INSERT INTO roles (id, name, description, permissions, is_system) VALUES
(
    '10000000-0000-0000-0000-100000000001',
    'ssa_hoo',
    'SSA Head of Office — endorses server/storage requests from staff in their division (any of the 10 ITD divisions)',
    '["ssa.view", "ssa.manage", "ssa.endorse"]',
    true
),
(
    '10000000-0000-0000-0000-100000000002',
    'ssa_asd_assessor',
    'SSA Architecture & Strategy Assessor — performs technical feasibility assessment (Architecture & Strategy division)',
    '["ssa.view", "ssa.assess"]',
    true
),
(
    '10000000-0000-0000-0000-100000000003',
    'ssa_qcmd_analyst',
    'SSA Quality & Compliance Analyst — performs capacity analysis and server assignment (Quality & Compliance Management division)',
    '["ssa.view", "ssa.analyse"]',
    true
),
(
    '10000000-0000-0000-0000-100000000004',
    'ssa_head_dc',
    'SSA Head Data Center Management — approves at DC tier (Infrastructure Management → Data Center Management)',
    '["ssa.view", "ssa.manage", "ssa.approve.dc"]',
    true
),
(
    '10000000-0000-0000-0000-100000000005',
    'ssa_head_sso',
    'SSA Head Information Security — approves at SSO tier (Information Security Management division)',
    '["ssa.view", "ssa.manage", "ssa.approve.sso"]',
    true
),
(
    '10000000-0000-0000-0000-100000000006',
    'ssa_head_imd',
    'SSA Head Infrastructure Management — approves at IMD tier (Infrastructure Management division head)',
    '["ssa.view", "ssa.manage", "ssa.approve.imd"]',
    true
),
(
    '10000000-0000-0000-0000-100000000007',
    'ssa_head_asd',
    'SSA Head Architecture & Strategy — approves at ASD tier (Architecture & Strategy division head)',
    '["ssa.view", "ssa.manage", "ssa.approve.asd"]',
    true
),
(
    '10000000-0000-0000-0000-100000000008',
    'ssa_head_scao',
    'SSA Administrator (SCAO) — final approval tier (Administrator under Director ITD)',
    '["ssa.view", "ssa.manage", "ssa.approve.scao"]',
    true
),
(
    '10000000-0000-0000-0000-100000000009',
    'ssa_san_admin',
    'SSA SAN Administrator — provisions SAN storage (Infrastructure Management → Data Center Management)',
    '["ssa.view", "ssa.provision"]',
    true
),
(
    '10000000-0000-0000-0000-100000000010',
    'ssa_dco_operator',
    'SSA Server Operations — creates servers in DCO (Operations Management → Systems Operations)',
    '["ssa.view", "ssa.dco"]',
    true
)
ON CONFLICT (name) DO UPDATE
SET permissions = EXCLUDED.permissions,
    description = EXCLUDED.description;


-- +goose Down

DELETE FROM roles WHERE name IN (
    'ssa_hoo','ssa_asd_assessor','ssa_qcmd_analyst',
    'ssa_head_dc','ssa_head_sso','ssa_head_imd','ssa_head_asd','ssa_head_scao',
    'ssa_san_admin','ssa_dco_operator'
);

-- Remove ssa.* permissions from existing general roles
UPDATE roles SET permissions = (
    SELECT jsonb_agg(p) FROM jsonb_array_elements(permissions) p
    WHERE p::text NOT LIKE '"ssa.%"'
)
WHERE name IN ('staff','supervisor','head_of_division','itd_director','auditor')
  AND permissions @> '"ssa.view"';

-- +goose Up
-- Migration 095: Client BRD completion gaps.
-- Adds configurable ITSM priority/reference data, structured RCA, request closure,
-- CI linking, evidence due dates/packs, team work assignment, and default approval workflows.

-- ──────────────────────────────────────────────
-- 1. ITSM service request lifecycle completion
-- ──────────────────────────────────────────────
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check;
ALTER TABLE service_requests ADD CONSTRAINT service_requests_status_check
    CHECK (status IN (
        'pending_approval', 'approved', 'rejected',
        'in_progress', 'fulfilled', 'closed', 'cancelled'
    ));

ALTER TABLE request_timeline DROP CONSTRAINT IF EXISTS request_timeline_event_type_check;
ALTER TABLE request_timeline ADD CONSTRAINT request_timeline_event_type_check
    CHECK (event_type IN (
        'submitted', 'approval_requested', 'approved', 'all_approved',
        'rejected', 'delegated', 'in_progress', 'fulfilled',
        'closed', 'cancelled', 'comment'
    ));

ALTER TABLE service_catalog_items DROP CONSTRAINT IF EXISTS service_catalog_items_approval_mode_check;
ALTER TABLE service_catalog_items ADD CONSTRAINT service_catalog_items_approval_mode_check
    CHECK (approval_mode IN ('sequential', 'parallel', 'any_of'));

-- ──────────────────────────────────────────────
-- 2. Configurable reference data and ITSM priority matrix
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reference_data (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),
    domain      TEXT NOT NULL,
    key         TEXT NOT NULL,
    label       TEXT NOT NULL,
    value       JSONB NOT NULL DEFAULT '{}',
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, domain, key)
);

CREATE INDEX IF NOT EXISTS idx_reference_data_domain
    ON reference_data (tenant_id, domain, is_active);

CREATE TRIGGER trg_reference_data_updated
    BEFORE UPDATE ON reference_data
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

INSERT INTO system_settings (tenant_id, category, key, value, description)
VALUES
(
    NULL,
    'itsm',
    'priority_matrix',
    '{
      "critical": {"critical": "P1_critical", "high": "P1_critical", "medium": "P2_high", "low": "P3_medium"},
      "high":     {"critical": "P1_critical", "high": "P2_high",     "medium": "P3_medium", "low": "P3_medium"},
      "medium":   {"critical": "P2_high",     "high": "P3_medium",   "medium": "P3_medium", "low": "P3_medium"},
      "low":      {"critical": "P3_medium",   "high": "P3_medium",   "medium": "P3_medium", "low": "P4_low"}
    }'::jsonb,
    'Configurable urgency x impact matrix used to derive ITSM ticket priority'
),
(
    NULL,
    'itsm',
    'ticket_mandatory_fields_by_priority',
    '{
      "P1_critical": ["category", "impact", "urgency", "description"],
      "P2_high": ["category", "impact", "urgency", "description"],
      "P3_medium": ["category", "impact", "urgency", "description"],
      "P4_low": ["category", "impact", "urgency", "description"]
    }'::jsonb,
    'Priority-specific mandatory fields for ticket creation'
),
(
    NULL,
    'grc',
    'audit_log_retention_years',
    '7'::jsonb,
    'Minimum audit log retention in years'
),
(
    NULL,
    'nfr',
    'availability_target_business_hours',
    '"99.5%"'::jsonb,
    'Client availability target for OPMS business hours'
),
(
    NULL,
    'nfr',
    'dr_targets',
    '{"rpoMinutes": 15, "rtoHours": 4}'::jsonb,
    'Client disaster recovery targets'
)
ON CONFLICT (tenant_id, category, key) DO NOTHING;

INSERT INTO reference_data (tenant_id, domain, key, label, value, sort_order)
VALUES
(NULL, 'itsm.priority', 'P1_critical', 'P1 Critical', '{"rank":1,"color":"red"}', 1),
(NULL, 'itsm.priority', 'P2_high', 'P2 High', '{"rank":2,"color":"orange"}', 2),
(NULL, 'itsm.priority', 'P3_medium', 'P3 Medium', '{"rank":3,"color":"yellow"}', 3),
(NULL, 'itsm.priority', 'P4_low', 'P4 Low', '{"rank":4,"color":"green"}', 4),
(NULL, 'itsm.category', 'incident', 'Incident', '{}', 1),
(NULL, 'itsm.category', 'service_request', 'Service Request', '{}', 2),
(NULL, 'cmdb.ci_type', 'application', 'Application', '{}', 1),
(NULL, 'cmdb.ci_type', 'server', 'Server', '{}', 2),
(NULL, 'cmdb.ci_type', 'database', 'Database', '{}', 3),
(NULL, 'cmdb.location', 'head_office', 'Head Office', '{}', 1)
ON CONFLICT (tenant_id, domain, key) DO NOTHING;

-- ──────────────────────────────────────────────
-- 3. CI/asset links and structured problem RCA
-- ──────────────────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS linked_ci_ids UUID[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_tickets_linked_ci_ids ON tickets USING GIN (linked_ci_ids);

CREATE TABLE IF NOT EXISTS problem_rca_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),
    name        TEXT NOT NULL,
    method      TEXT NOT NULL CHECK (method IN ('5_whys', 'ishikawa', 'timeline', 'custom')),
    schema      JSONB NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_problem_rca_templates_tenant
    ON problem_rca_templates (tenant_id, is_active);

CREATE TRIGGER trg_problem_rca_templates_updated
    BEFORE UPDATE ON problem_rca_templates
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

ALTER TABLE problems ADD COLUMN IF NOT EXISTS rca_template_id UUID REFERENCES problem_rca_templates(id);
ALTER TABLE problems ADD COLUMN IF NOT EXISTS rca_data JSONB DEFAULT '{}';
ALTER TABLE problems ADD COLUMN IF NOT EXISTS linked_asset_ids UUID[] DEFAULT '{}';
ALTER TABLE problems ADD COLUMN IF NOT EXISTS linked_ci_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_problems_linked_asset_ids ON problems USING GIN (linked_asset_ids);
CREATE INDEX IF NOT EXISTS idx_problems_linked_ci_ids ON problems USING GIN (linked_ci_ids);

INSERT INTO problem_rca_templates (tenant_id, name, method, schema)
VALUES
(
    NULL,
    '5 Whys RCA',
    '5_whys',
    '{"fields":[
      {"key":"problemStatement","label":"Problem statement","type":"textarea","required":true},
      {"key":"why1","label":"Why 1","type":"textarea","required":true},
      {"key":"why2","label":"Why 2","type":"textarea","required":true},
      {"key":"why3","label":"Why 3","type":"textarea","required":false},
      {"key":"why4","label":"Why 4","type":"textarea","required":false},
      {"key":"why5","label":"Why 5","type":"textarea","required":false},
      {"key":"rootCause","label":"Root cause","type":"textarea","required":true},
      {"key":"correctiveActions","label":"Corrective actions","type":"array","required":true}
    ]}'::jsonb
),
(
    NULL,
    'Ishikawa RCA',
    'ishikawa',
    '{"categories":["People","Process","Technology","Environment","Measurement","Management"],
      "fields":[
        {"key":"effect","label":"Effect","type":"textarea","required":true},
        {"key":"causes","label":"Causes by category","type":"object","required":true},
        {"key":"rootCause","label":"Root cause","type":"textarea","required":true},
        {"key":"correctiveActions","label":"Corrective actions","type":"array","required":true}
      ]}'::jsonb
)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ──────────────────────────────────────────────
-- 4. PMO team assignment
-- ──────────────────────────────────────────────
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS assigned_team_id UUID;
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_team
    ON work_items(assigned_team_id) WHERE assigned_team_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- 5. Audit evidence due dates and evidence pack generation trail
-- ──────────────────────────────────────────────
ALTER TABLE evidence_collections ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE evidence_collections ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS audit_evidence_packs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    audit_id        UUID NOT NULL REFERENCES grc_audits(id) ON DELETE CASCADE,
    generated_by    UUID NOT NULL REFERENCES users(id),
    format          TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'html', 'pdf')),
    status          TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'failed')),
    document_id     UUID,
    pack_snapshot   JSONB NOT NULL DEFAULT '{}',
    checksum        TEXT,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_packs_audit
    ON audit_evidence_packs(audit_id, generated_at DESC);

-- ──────────────────────────────────────────────
-- 6. Default approval workflows for the seeded ITD tenant.
-- New tenants get equivalent workflows from TenantService bootstrap.
-- ──────────────────────────────────────────────
INSERT INTO workflow_definitions (
    id, tenant_id, name, description, entity_type, steps,
    is_active, version, auto_assign_rules, created_by, created_at, updated_at
)
VALUES
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Default Policy Approval',
    'Single-step policy approval for client BRD governance workflow.',
    'policy',
    '[{"stepOrder":1,"name":"Policy approval","mode":"any_of","quorum":1,"approverType":"role:global_admin","approverIds":["20000000-0000-0000-0000-000000000001"],"timeoutHours":72,"allowDelegation":true}]'::jsonb,
    true,
    1,
    '{}'::jsonb,
    '20000000-0000-0000-0000-000000000001',
    now(),
    now()
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Default Project Initiation Approval',
    'Single-step PMO initiation and baseline approval workflow.',
    'project',
    '[{"stepOrder":1,"name":"Project approval","mode":"any_of","quorum":1,"approverType":"role:global_admin","approverIds":["20000000-0000-0000-0000-000000000001"],"timeoutHours":72,"allowDelegation":true}]'::jsonb,
    true,
    1,
    '{}'::jsonb,
    '20000000-0000-0000-0000-000000000001',
    now(),
    now()
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Default Asset Disposal Approval',
    'Single-step asset disposal approval workflow.',
    'asset_disposal',
    '[{"stepOrder":1,"name":"Disposal approval","mode":"any_of","quorum":1,"approverType":"role:global_admin","approverIds":["20000000-0000-0000-0000-000000000001"],"timeoutHours":72,"allowDelegation":true}]'::jsonb,
    true,
    1,
    '{}'::jsonb,
    '20000000-0000-0000-0000-000000000001',
    now(),
    now()
)
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM workflow_definitions
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND name IN (
      'Default Policy Approval',
      'Default Project Initiation Approval',
      'Default Asset Disposal Approval'
  );

DROP TABLE IF EXISTS audit_evidence_packs;
ALTER TABLE evidence_collections DROP COLUMN IF EXISTS assigned_at;
ALTER TABLE evidence_collections DROP COLUMN IF EXISTS due_date;

DROP INDEX IF EXISTS idx_work_items_assigned_team;
ALTER TABLE work_items DROP COLUMN IF EXISTS assigned_team_id;

DROP INDEX IF EXISTS idx_problems_linked_ci_ids;
DROP INDEX IF EXISTS idx_problems_linked_asset_ids;
ALTER TABLE problems DROP COLUMN IF EXISTS linked_ci_ids;
ALTER TABLE problems DROP COLUMN IF EXISTS linked_asset_ids;
ALTER TABLE problems DROP COLUMN IF EXISTS rca_data;
ALTER TABLE problems DROP COLUMN IF EXISTS rca_template_id;
DROP TRIGGER IF EXISTS trg_problem_rca_templates_updated ON problem_rca_templates;
DROP TABLE IF EXISTS problem_rca_templates;

DROP INDEX IF EXISTS idx_tickets_linked_ci_ids;
ALTER TABLE tickets DROP COLUMN IF EXISTS linked_ci_ids;

DELETE FROM reference_data
WHERE tenant_id IS NULL
  AND domain IN ('itsm.priority', 'itsm.category', 'cmdb.ci_type', 'cmdb.location');
DROP TRIGGER IF EXISTS trg_reference_data_updated ON reference_data;
DROP TABLE IF EXISTS reference_data;

DELETE FROM system_settings
WHERE tenant_id IS NULL
  AND category IN ('itsm', 'grc', 'nfr')
  AND key IN (
      'priority_matrix',
      'ticket_mandatory_fields_by_priority',
      'audit_log_retention_years',
      'availability_target_business_hours',
      'dr_targets'
  );

ALTER TABLE service_catalog_items DROP CONSTRAINT IF EXISTS service_catalog_items_approval_mode_check;
ALTER TABLE service_catalog_items ADD CONSTRAINT service_catalog_items_approval_mode_check
    CHECK (approval_mode IN ('sequential', 'parallel'));

ALTER TABLE request_timeline DROP CONSTRAINT IF EXISTS request_timeline_event_type_check;
ALTER TABLE request_timeline ADD CONSTRAINT request_timeline_event_type_check
    CHECK (event_type IN (
        'submitted', 'approval_requested', 'approved',
        'rejected', 'delegated', 'in_progress',
        'fulfilled', 'cancelled', 'comment'
    ));

ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check;
ALTER TABLE service_requests ADD CONSTRAINT service_requests_status_check
    CHECK (status IN (
        'pending_approval', 'approved', 'rejected',
        'in_progress', 'fulfilled', 'cancelled'
    ));
ALTER TABLE service_requests DROP COLUMN IF EXISTS closed_at;

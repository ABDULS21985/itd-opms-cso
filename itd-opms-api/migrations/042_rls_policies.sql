-- +goose Up
-- Migration 042: Create DORMANT Row-Level Security (RLS) policies on all tenant-scoped tables.
--
-- IMPORTANT: These policies are created but RLS is NOT enabled yet.
-- Policies have no effect until ALTER TABLE ... ENABLE ROW LEVEL SECURITY is run
-- in migration 043. This two-step approach allows safe rollout:
--   042 = create policies (dormant, zero-impact)
--   043 = enable RLS (activates enforcement)

-- ══════════════════════════════════════════════════════════════════
-- Helper expression used in all policies:
--   current_setting('app.current_tenant_id', true)::uuid
--   The second arg (true) = missing_ok, returns NULL instead of error
--   if the GUC is not set. This means queries without the GUC set
--   will see NO rows once RLS is enabled (fail-closed).
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────
-- 001: Tenants & Org Hierarchy
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON org_units
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 002: Users & RBAC
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON role_bindings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON delegations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 003: Audit Events
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON audit_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 004: Approvals & Signoffs
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON workflow_definitions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON approval_chains
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON signoffs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 005: Documents & Evidence
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON documents
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON evidence_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 006: Notifications & Directory Sync
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON notification_outbox
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON notifications
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON teams_channel_mappings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 007: Governance
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON policies
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON attestation_campaigns
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON policy_attestations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON raci_matrices
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON meetings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON meeting_decisions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON action_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON okrs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON kpis
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 008: Planning / PMO
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON portfolios
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON projects
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON work_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON milestones
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON risk_register
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON issues
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON change_requests
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 009: ITSM
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON business_hours_calendars
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON sla_policies
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON service_catalog_categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON service_catalog_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON support_queues
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON tickets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON escalation_rules
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON problems
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 010: CMDB
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON assets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON asset_lifecycle_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON asset_disposals
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON cmdb_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON reconciliation_runs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON licenses
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON license_assignments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON warranties
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON renewal_alerts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 011: People & Workforce
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON skill_categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON skills
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON user_skills
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON role_skill_requirements
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON checklist_templates
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON checklists
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON rosters
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON leave_records
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON capacity_allocations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON training_records
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 012: Knowledge Management
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON kb_categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON kb_articles
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON announcements
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 013: GRC & Audit Readiness
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON risks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON audits
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON audit_findings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON evidence_collections
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON access_review_campaigns
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON access_review_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON compliance_controls
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 014: Reporting & Analytics
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON report_definitions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON report_runs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON dashboard_cache
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON saved_searches
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 016: System Settings & Sessions (NULLABLE tenant_id)
-- ──────────────────────────────────────────────────
-- system_settings and email_templates allow NULL tenant_id for global entries.
-- The policy permits rows that match the current tenant OR have NULL tenant_id.
CREATE POLICY tenant_or_global ON system_settings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid OR tenant_id IS NULL);

CREATE POLICY tenant_isolation ON active_sessions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_or_global ON email_templates
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid OR tenant_id IS NULL);

-- ──────────────────────────────────────────────────
-- 020: Post-Implementation Reviews
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON post_implementation_reviews
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON pir_templates
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 023: Project Documents
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON project_documents
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 024: Approval Engine Enhancements
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON approval_delegations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 025: Change Calendar
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON maintenance_windows
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON change_freeze_periods
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 026: Budget & Cost Tracking
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON cost_categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON project_cost_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON budget_snapshots
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 027: Vendor / Contract Management
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON vendors
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON contracts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON vendor_scorecards
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON contract_renewals
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 028: Document Vault
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON document_folders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON document_access_log
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON document_shares
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 029: Automation Rules
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON automation_rules
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON automation_executions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 030: Custom Fields
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON custom_field_definitions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ──────────────────────────────────────────────────
-- 041: Child tables that receive tenant_id in migration 041
-- These tables originally lacked tenant_id and inherit it from
-- their parent. Policies are created here so they are ready
-- when migration 043 enables RLS.
-- ──────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON approval_steps
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON policy_versions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON raci_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON key_results
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON project_dependencies
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON project_stakeholders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON time_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON ticket_comments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON ticket_status_history
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON cmdb_relationships
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON checklist_tasks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON kb_article_versions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON kb_article_feedback
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON risk_assessments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);


-- +goose Down
-- ══════════════════════════════════════════════════════════════════
-- Drop all RLS policies created above (reverse order by module)
-- ══════════════════════════════════════════════════════════════════

-- 041: Child tables (migration 041 tenant_id additions)
DROP POLICY IF EXISTS tenant_isolation ON risk_assessments;
DROP POLICY IF EXISTS tenant_isolation ON kb_article_feedback;
DROP POLICY IF EXISTS tenant_isolation ON kb_article_versions;
DROP POLICY IF EXISTS tenant_isolation ON checklist_tasks;
DROP POLICY IF EXISTS tenant_isolation ON cmdb_relationships;
DROP POLICY IF EXISTS tenant_isolation ON ticket_status_history;
DROP POLICY IF EXISTS tenant_isolation ON ticket_comments;
DROP POLICY IF EXISTS tenant_isolation ON time_entries;
DROP POLICY IF EXISTS tenant_isolation ON project_stakeholders;
DROP POLICY IF EXISTS tenant_isolation ON project_dependencies;
DROP POLICY IF EXISTS tenant_isolation ON key_results;
DROP POLICY IF EXISTS tenant_isolation ON raci_entries;
DROP POLICY IF EXISTS tenant_isolation ON policy_versions;
DROP POLICY IF EXISTS tenant_isolation ON approval_steps;

-- 030: Custom Fields
DROP POLICY IF EXISTS tenant_isolation ON custom_field_definitions;

-- 029: Automation Rules
DROP POLICY IF EXISTS tenant_isolation ON automation_executions;
DROP POLICY IF EXISTS tenant_isolation ON automation_rules;

-- 028: Document Vault
DROP POLICY IF EXISTS tenant_isolation ON document_shares;
DROP POLICY IF EXISTS tenant_isolation ON document_access_log;
DROP POLICY IF EXISTS tenant_isolation ON document_folders;

-- 027: Vendor / Contract Management
DROP POLICY IF EXISTS tenant_isolation ON contract_renewals;
DROP POLICY IF EXISTS tenant_isolation ON vendor_scorecards;
DROP POLICY IF EXISTS tenant_isolation ON contracts;
DROP POLICY IF EXISTS tenant_isolation ON vendors;

-- 026: Budget & Cost Tracking
DROP POLICY IF EXISTS tenant_isolation ON budget_snapshots;
DROP POLICY IF EXISTS tenant_isolation ON project_cost_entries;
DROP POLICY IF EXISTS tenant_isolation ON cost_categories;

-- 025: Change Calendar
DROP POLICY IF EXISTS tenant_isolation ON change_freeze_periods;
DROP POLICY IF EXISTS tenant_isolation ON maintenance_windows;

-- 024: Approval Engine Enhancements
DROP POLICY IF EXISTS tenant_isolation ON approval_delegations;

-- 023: Project Documents
DROP POLICY IF EXISTS tenant_isolation ON project_documents;

-- 020: Post-Implementation Reviews
DROP POLICY IF EXISTS tenant_isolation ON pir_templates;
DROP POLICY IF EXISTS tenant_isolation ON post_implementation_reviews;

-- 016: System Settings & Sessions
DROP POLICY IF EXISTS tenant_or_global ON email_templates;
DROP POLICY IF EXISTS tenant_isolation ON active_sessions;
DROP POLICY IF EXISTS tenant_or_global ON system_settings;

-- 014: Reporting & Analytics
DROP POLICY IF EXISTS tenant_isolation ON saved_searches;
DROP POLICY IF EXISTS tenant_isolation ON dashboard_cache;
DROP POLICY IF EXISTS tenant_isolation ON report_runs;
DROP POLICY IF EXISTS tenant_isolation ON report_definitions;

-- 013: GRC & Audit Readiness
DROP POLICY IF EXISTS tenant_isolation ON compliance_controls;
DROP POLICY IF EXISTS tenant_isolation ON access_review_entries;
DROP POLICY IF EXISTS tenant_isolation ON access_review_campaigns;
DROP POLICY IF EXISTS tenant_isolation ON evidence_collections;
DROP POLICY IF EXISTS tenant_isolation ON audit_findings;
DROP POLICY IF EXISTS tenant_isolation ON audits;
DROP POLICY IF EXISTS tenant_isolation ON risks;

-- 012: Knowledge Management
DROP POLICY IF EXISTS tenant_isolation ON announcements;
DROP POLICY IF EXISTS tenant_isolation ON kb_articles;
DROP POLICY IF EXISTS tenant_isolation ON kb_categories;

-- 011: People & Workforce
DROP POLICY IF EXISTS tenant_isolation ON training_records;
DROP POLICY IF EXISTS tenant_isolation ON capacity_allocations;
DROP POLICY IF EXISTS tenant_isolation ON leave_records;
DROP POLICY IF EXISTS tenant_isolation ON rosters;
DROP POLICY IF EXISTS tenant_isolation ON checklists;
DROP POLICY IF EXISTS tenant_isolation ON checklist_templates;
DROP POLICY IF EXISTS tenant_isolation ON role_skill_requirements;
DROP POLICY IF EXISTS tenant_isolation ON user_skills;
DROP POLICY IF EXISTS tenant_isolation ON skills;
DROP POLICY IF EXISTS tenant_isolation ON skill_categories;

-- 010: CMDB
DROP POLICY IF EXISTS tenant_isolation ON renewal_alerts;
DROP POLICY IF EXISTS tenant_isolation ON warranties;
DROP POLICY IF EXISTS tenant_isolation ON license_assignments;
DROP POLICY IF EXISTS tenant_isolation ON licenses;
DROP POLICY IF EXISTS tenant_isolation ON reconciliation_runs;
DROP POLICY IF EXISTS tenant_isolation ON cmdb_items;
DROP POLICY IF EXISTS tenant_isolation ON asset_disposals;
DROP POLICY IF EXISTS tenant_isolation ON asset_lifecycle_events;
DROP POLICY IF EXISTS tenant_isolation ON assets;

-- 009: ITSM
DROP POLICY IF EXISTS tenant_isolation ON problems;
DROP POLICY IF EXISTS tenant_isolation ON escalation_rules;
DROP POLICY IF EXISTS tenant_isolation ON tickets;
DROP POLICY IF EXISTS tenant_isolation ON support_queues;
DROP POLICY IF EXISTS tenant_isolation ON service_catalog_items;
DROP POLICY IF EXISTS tenant_isolation ON service_catalog_categories;
DROP POLICY IF EXISTS tenant_isolation ON sla_policies;
DROP POLICY IF EXISTS tenant_isolation ON business_hours_calendars;

-- 008: Planning / PMO
DROP POLICY IF EXISTS tenant_isolation ON change_requests;
DROP POLICY IF EXISTS tenant_isolation ON issues;
DROP POLICY IF EXISTS tenant_isolation ON risk_register;
DROP POLICY IF EXISTS tenant_isolation ON milestones;
DROP POLICY IF EXISTS tenant_isolation ON work_items;
DROP POLICY IF EXISTS tenant_isolation ON projects;
DROP POLICY IF EXISTS tenant_isolation ON portfolios;

-- 007: Governance
DROP POLICY IF EXISTS tenant_isolation ON kpis;
DROP POLICY IF EXISTS tenant_isolation ON okrs;
DROP POLICY IF EXISTS tenant_isolation ON action_items;
DROP POLICY IF EXISTS tenant_isolation ON meeting_decisions;
DROP POLICY IF EXISTS tenant_isolation ON meetings;
DROP POLICY IF EXISTS tenant_isolation ON raci_matrices;
DROP POLICY IF EXISTS tenant_isolation ON policy_attestations;
DROP POLICY IF EXISTS tenant_isolation ON attestation_campaigns;
DROP POLICY IF EXISTS tenant_isolation ON policies;

-- 006: Notifications
DROP POLICY IF EXISTS tenant_isolation ON teams_channel_mappings;
DROP POLICY IF EXISTS tenant_isolation ON notifications;
DROP POLICY IF EXISTS tenant_isolation ON notification_outbox;

-- 005: Documents & Evidence
DROP POLICY IF EXISTS tenant_isolation ON evidence_items;
DROP POLICY IF EXISTS tenant_isolation ON documents;

-- 004: Approvals & Signoffs
DROP POLICY IF EXISTS tenant_isolation ON signoffs;
DROP POLICY IF EXISTS tenant_isolation ON approval_chains;
DROP POLICY IF EXISTS tenant_isolation ON workflow_definitions;

-- 003: Audit Events
DROP POLICY IF EXISTS tenant_isolation ON audit_events;

-- 002: Users & RBAC
DROP POLICY IF EXISTS tenant_isolation ON delegations;
DROP POLICY IF EXISTS tenant_isolation ON role_bindings;
DROP POLICY IF EXISTS tenant_isolation ON users;

-- 001: Tenants & Org Hierarchy
DROP POLICY IF EXISTS tenant_isolation ON org_units;

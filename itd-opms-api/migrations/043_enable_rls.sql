-- +goose Up
-- Migration 043: Enable Row-Level Security on all tenant-scoped tables.
--
-- The RLS policies were created (dormant) in migration 042. This migration
-- flips the switch by enabling RLS and forcing it for the table owner.
--
-- FORCE ROW LEVEL SECURITY ensures even the table owner (opms) is subject
-- to RLS policies, which is critical because the application connects as
-- the table owner.
--
-- Global tables that are intentionally EXCLUDED from RLS:
--   tenants, org_hierarchy, roles, refresh_tokens,
--   notification_templates, notification_dlq,
--   user_notification_preferences, directory_sync_runs

-- ══════════════════════════════════════════════════════
-- 001: Org Units (tenants & org hierarchy)
-- ══════════════════════════════════════════════════════
ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_units FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 002: Users & RBAC
-- ══════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE role_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_bindings FORCE ROW LEVEL SECURITY;

ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 003: Audit
-- ══════════════════════════════════════════════════════
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 004: Approvals & Signoffs
-- ══════════════════════════════════════════════════════
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions FORCE ROW LEVEL SECURITY;

ALTER TABLE approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_chains FORCE ROW LEVEL SECURITY;

ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps FORCE ROW LEVEL SECURITY;

ALTER TABLE signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE signoffs FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 005: Documents & Evidence
-- ══════════════════════════════════════════════════════
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 006: Notifications
-- ══════════════════════════════════════════════════════
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE teams_channel_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_channel_mappings FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 007: Governance
-- ══════════════════════════════════════════════════════
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies FORCE ROW LEVEL SECURITY;

ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE attestation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestation_campaigns FORCE ROW LEVEL SECURITY;

ALTER TABLE policy_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_attestations FORCE ROW LEVEL SECURITY;

ALTER TABLE raci_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE raci_matrices FORCE ROW LEVEL SECURITY;

ALTER TABLE raci_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE raci_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings FORCE ROW LEVEL SECURITY;

ALTER TABLE meeting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_decisions FORCE ROW LEVEL SECURITY;

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items FORCE ROW LEVEL SECURITY;

ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs FORCE ROW LEVEL SECURITY;

ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results FORCE ROW LEVEL SECURITY;

ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 008: Planning / PMO
-- ══════════════════════════════════════════════════════
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios FORCE ROW LEVEL SECURITY;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

ALTER TABLE project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_dependencies FORCE ROW LEVEL SECURITY;

ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stakeholders FORCE ROW LEVEL SECURITY;

ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items FORCE ROW LEVEL SECURITY;

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones FORCE ROW LEVEL SECURITY;

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE risk_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_register FORCE ROW LEVEL SECURITY;

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues FORCE ROW LEVEL SECURITY;

ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 009: ITSM
-- ══════════════════════════════════════════════════════
ALTER TABLE business_hours_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours_calendars FORCE ROW LEVEL SECURITY;

ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies FORCE ROW LEVEL SECURITY;

ALTER TABLE service_catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE service_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog_items FORCE ROW LEVEL SECURITY;

ALTER TABLE support_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_queues FORCE ROW LEVEL SECURITY;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history FORCE ROW LEVEL SECURITY;

ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 010: CMDB
-- ══════════════════════════════════════════════════════
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;

ALTER TABLE asset_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_lifecycle_events FORCE ROW LEVEL SECURITY;

ALTER TABLE asset_disposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_disposals FORCE ROW LEVEL SECURITY;

ALTER TABLE cmdb_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmdb_items FORCE ROW LEVEL SECURITY;

ALTER TABLE cmdb_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmdb_relationships FORCE ROW LEVEL SECURITY;

ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs FORCE ROW LEVEL SECURITY;

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses FORCE ROW LEVEL SECURITY;

ALTER TABLE license_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties FORCE ROW LEVEL SECURITY;

ALTER TABLE renewal_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_alerts FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 011: People & Workforce
-- ══════════════════════════════════════════════════════
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills FORCE ROW LEVEL SECURITY;

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills FORCE ROW LEVEL SECURITY;

ALTER TABLE role_skill_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_skill_requirements FORCE ROW LEVEL SECURITY;

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates FORCE ROW LEVEL SECURITY;

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists FORCE ROW LEVEL SECURITY;

ALTER TABLE checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters FORCE ROW LEVEL SECURITY;

ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records FORCE ROW LEVEL SECURITY;

ALTER TABLE capacity_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_allocations FORCE ROW LEVEL SECURITY;

ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 012: Knowledge Management
-- ══════════════════════════════════════════════════════
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles FORCE ROW LEVEL SECURITY;

ALTER TABLE kb_article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_feedback FORCE ROW LEVEL SECURITY;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 013: GRC & Audit Readiness
-- ══════════════════════════════════════════════════════
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks FORCE ROW LEVEL SECURITY;

ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments FORCE ROW LEVEL SECURITY;

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings FORCE ROW LEVEL SECURITY;

ALTER TABLE evidence_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_collections FORCE ROW LEVEL SECURITY;

ALTER TABLE access_review_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_review_campaigns FORCE ROW LEVEL SECURITY;

ALTER TABLE access_review_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_review_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE compliance_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_controls FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 014: Reporting & Analytics
-- ══════════════════════════════════════════════════════
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_definitions FORCE ROW LEVEL SECURITY;

ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_runs FORCE ROW LEVEL SECURITY;

ALTER TABLE dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_cache FORCE ROW LEVEL SECURITY;

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 016: System Settings & Sessions
-- ══════════════════════════════════════════════════════
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 020: Post-Implementation Reviews
-- ══════════════════════════════════════════════════════
ALTER TABLE post_implementation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_implementation_reviews FORCE ROW LEVEL SECURITY;

ALTER TABLE pir_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pir_templates FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 023: Project Documents
-- ══════════════════════════════════════════════════════
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 024: Approval Engine Enhancements
-- ══════════════════════════════════════════════════════
ALTER TABLE approval_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_delegations FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 025: Change Calendar
-- ══════════════════════════════════════════════════════
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows FORCE ROW LEVEL SECURITY;

ALTER TABLE change_freeze_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_freeze_periods FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 026: Budget & Cost Tracking
-- ══════════════════════════════════════════════════════
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE project_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE budget_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_snapshots FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 027: Vendor / Contract Management
-- ══════════════════════════════════════════════════════
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors FORCE ROW LEVEL SECURITY;

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;

ALTER TABLE vendor_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_scorecards FORCE ROW LEVEL SECURITY;

ALTER TABLE contract_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_renewals FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 028: Document Vault
-- ══════════════════════════════════════════════════════
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders FORCE ROW LEVEL SECURITY;

ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log FORCE ROW LEVEL SECURITY;

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 029: Automation Rules
-- ══════════════════════════════════════════════════════
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- 030: Custom Fields
-- ══════════════════════════════════════════════════════
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions FORCE ROW LEVEL SECURITY;


-- +goose Down
-- Disable RLS on all tenant-scoped tables (reverse order).

-- 030: Custom Fields
ALTER TABLE custom_field_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions NO FORCE ROW LEVEL SECURITY;

-- 029: Automation Rules
ALTER TABLE automation_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions NO FORCE ROW LEVEL SECURITY;

ALTER TABLE automation_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules NO FORCE ROW LEVEL SECURITY;

-- 028: Document Vault
ALTER TABLE document_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares NO FORCE ROW LEVEL SECURITY;

ALTER TABLE document_access_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log NO FORCE ROW LEVEL SECURITY;

ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders NO FORCE ROW LEVEL SECURITY;

-- 027: Vendor / Contract Management
ALTER TABLE contract_renewals DISABLE ROW LEVEL SECURITY;
ALTER TABLE contract_renewals NO FORCE ROW LEVEL SECURITY;

ALTER TABLE vendor_scorecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_scorecards NO FORCE ROW LEVEL SECURITY;

ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts NO FORCE ROW LEVEL SECURITY;

ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors NO FORCE ROW LEVEL SECURITY;

-- 026: Budget & Cost Tracking
ALTER TABLE budget_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_snapshots NO FORCE ROW LEVEL SECURITY;

ALTER TABLE project_cost_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_entries NO FORCE ROW LEVEL SECURITY;

ALTER TABLE cost_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_categories NO FORCE ROW LEVEL SECURITY;

-- 025: Change Calendar
ALTER TABLE change_freeze_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_freeze_periods NO FORCE ROW LEVEL SECURITY;

ALTER TABLE maintenance_windows DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows NO FORCE ROW LEVEL SECURITY;

-- 024: Approval Engine Enhancements
ALTER TABLE approval_delegations DISABLE ROW LEVEL SECURITY;
ALTER TABLE approval_delegations NO FORCE ROW LEVEL SECURITY;

-- 023: Project Documents
ALTER TABLE project_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents NO FORCE ROW LEVEL SECURITY;

-- 020: Post-Implementation Reviews
ALTER TABLE pir_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE pir_templates NO FORCE ROW LEVEL SECURITY;

ALTER TABLE post_implementation_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_implementation_reviews NO FORCE ROW LEVEL SECURITY;

-- 016: System Settings & Sessions
ALTER TABLE email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates NO FORCE ROW LEVEL SECURITY;

ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions NO FORCE ROW LEVEL SECURITY;

ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings NO FORCE ROW LEVEL SECURITY;

-- 014: Reporting & Analytics
ALTER TABLE saved_searches DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches NO FORCE ROW LEVEL SECURITY;

ALTER TABLE dashboard_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_cache NO FORCE ROW LEVEL SECURITY;

ALTER TABLE report_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_runs NO FORCE ROW LEVEL SECURITY;

ALTER TABLE report_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_definitions NO FORCE ROW LEVEL SECURITY;

-- 013: GRC & Audit Readiness
ALTER TABLE compliance_controls DISABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_controls NO FORCE ROW LEVEL SECURITY;

ALTER TABLE access_review_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_review_entries NO FORCE ROW LEVEL SECURITY;

ALTER TABLE access_review_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_review_campaigns NO FORCE ROW LEVEL SECURITY;

ALTER TABLE evidence_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_collections NO FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_findings DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings NO FORCE ROW LEVEL SECURITY;

ALTER TABLE audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE audits NO FORCE ROW LEVEL SECURITY;

ALTER TABLE risk_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments NO FORCE ROW LEVEL SECURITY;

ALTER TABLE risks DISABLE ROW LEVEL SECURITY;
ALTER TABLE risks NO FORCE ROW LEVEL SECURITY;

-- 012: Knowledge Management
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements NO FORCE ROW LEVEL SECURITY;

ALTER TABLE kb_article_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_feedback NO FORCE ROW LEVEL SECURITY;

ALTER TABLE kb_article_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_versions NO FORCE ROW LEVEL SECURITY;

ALTER TABLE kb_articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles NO FORCE ROW LEVEL SECURITY;

ALTER TABLE kb_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categories NO FORCE ROW LEVEL SECURITY;

-- 011: People & Workforce
ALTER TABLE training_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_records NO FORCE ROW LEVEL SECURITY;

ALTER TABLE capacity_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_allocations NO FORCE ROW LEVEL SECURITY;

ALTER TABLE leave_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records NO FORCE ROW LEVEL SECURITY;

ALTER TABLE rosters DISABLE ROW LEVEL SECURITY;
ALTER TABLE rosters NO FORCE ROW LEVEL SECURITY;

ALTER TABLE checklist_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_tasks NO FORCE ROW LEVEL SECURITY;

ALTER TABLE checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklists NO FORCE ROW LEVEL SECURITY;

ALTER TABLE checklist_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates NO FORCE ROW LEVEL SECURITY;

ALTER TABLE role_skill_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_skill_requirements NO FORCE ROW LEVEL SECURITY;

ALTER TABLE user_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills NO FORCE ROW LEVEL SECURITY;

ALTER TABLE skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE skills NO FORCE ROW LEVEL SECURITY;

ALTER TABLE skill_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories NO FORCE ROW LEVEL SECURITY;

-- 010: CMDB
ALTER TABLE renewal_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_alerts NO FORCE ROW LEVEL SECURITY;

ALTER TABLE warranties DISABLE ROW LEVEL SECURITY;
ALTER TABLE warranties NO FORCE ROW LEVEL SECURITY;

ALTER TABLE license_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE license_assignments NO FORCE ROW LEVEL SECURITY;

ALTER TABLE licenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE licenses NO FORCE ROW LEVEL SECURITY;

ALTER TABLE reconciliation_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs NO FORCE ROW LEVEL SECURITY;

ALTER TABLE cmdb_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE cmdb_relationships NO FORCE ROW LEVEL SECURITY;

ALTER TABLE cmdb_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE cmdb_items NO FORCE ROW LEVEL SECURITY;

ALTER TABLE asset_disposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_disposals NO FORCE ROW LEVEL SECURITY;

ALTER TABLE asset_lifecycle_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_lifecycle_events NO FORCE ROW LEVEL SECURITY;

ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE assets NO FORCE ROW LEVEL SECURITY;

-- 009: ITSM
ALTER TABLE problems DISABLE ROW LEVEL SECURITY;
ALTER TABLE problems NO FORCE ROW LEVEL SECURITY;

ALTER TABLE escalation_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules NO FORCE ROW LEVEL SECURITY;

ALTER TABLE ticket_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history NO FORCE ROW LEVEL SECURITY;

ALTER TABLE ticket_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments NO FORCE ROW LEVEL SECURITY;

ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets NO FORCE ROW LEVEL SECURITY;

ALTER TABLE support_queues DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_queues NO FORCE ROW LEVEL SECURITY;

ALTER TABLE service_catalog_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog_items NO FORCE ROW LEVEL SECURITY;

ALTER TABLE service_catalog_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog_categories NO FORCE ROW LEVEL SECURITY;

ALTER TABLE sla_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies NO FORCE ROW LEVEL SECURITY;

ALTER TABLE business_hours_calendars DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours_calendars NO FORCE ROW LEVEL SECURITY;

-- 008: Planning / PMO
ALTER TABLE change_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests NO FORCE ROW LEVEL SECURITY;

ALTER TABLE issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE issues NO FORCE ROW LEVEL SECURITY;

ALTER TABLE risk_register DISABLE ROW LEVEL SECURITY;
ALTER TABLE risk_register NO FORCE ROW LEVEL SECURITY;

ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries NO FORCE ROW LEVEL SECURITY;

ALTER TABLE milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE milestones NO FORCE ROW LEVEL SECURITY;

ALTER TABLE work_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_items NO FORCE ROW LEVEL SECURITY;

ALTER TABLE project_stakeholders DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_stakeholders NO FORCE ROW LEVEL SECURITY;

ALTER TABLE project_dependencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_dependencies NO FORCE ROW LEVEL SECURITY;

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects NO FORCE ROW LEVEL SECURITY;

ALTER TABLE portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios NO FORCE ROW LEVEL SECURITY;

-- 007: Governance
ALTER TABLE kpis DISABLE ROW LEVEL SECURITY;
ALTER TABLE kpis NO FORCE ROW LEVEL SECURITY;

ALTER TABLE key_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE key_results NO FORCE ROW LEVEL SECURITY;

ALTER TABLE okrs DISABLE ROW LEVEL SECURITY;
ALTER TABLE okrs NO FORCE ROW LEVEL SECURITY;

ALTER TABLE action_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE action_items NO FORCE ROW LEVEL SECURITY;

ALTER TABLE meeting_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_decisions NO FORCE ROW LEVEL SECURITY;

ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings NO FORCE ROW LEVEL SECURITY;

ALTER TABLE raci_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE raci_entries NO FORCE ROW LEVEL SECURITY;

ALTER TABLE raci_matrices DISABLE ROW LEVEL SECURITY;
ALTER TABLE raci_matrices NO FORCE ROW LEVEL SECURITY;

ALTER TABLE policy_attestations DISABLE ROW LEVEL SECURITY;
ALTER TABLE policy_attestations NO FORCE ROW LEVEL SECURITY;

ALTER TABLE attestation_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE attestation_campaigns NO FORCE ROW LEVEL SECURITY;

ALTER TABLE policy_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions NO FORCE ROW LEVEL SECURITY;

ALTER TABLE policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE policies NO FORCE ROW LEVEL SECURITY;

-- 006: Notifications
ALTER TABLE teams_channel_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams_channel_mappings NO FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications NO FORCE ROW LEVEL SECURITY;

ALTER TABLE notification_outbox DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox NO FORCE ROW LEVEL SECURITY;

-- 005: Documents & Evidence
ALTER TABLE evidence_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items NO FORCE ROW LEVEL SECURITY;

ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents NO FORCE ROW LEVEL SECURITY;

-- 004: Approvals & Signoffs
ALTER TABLE signoffs DISABLE ROW LEVEL SECURITY;
ALTER TABLE signoffs NO FORCE ROW LEVEL SECURITY;

ALTER TABLE approval_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps NO FORCE ROW LEVEL SECURITY;

ALTER TABLE approval_chains DISABLE ROW LEVEL SECURITY;
ALTER TABLE approval_chains NO FORCE ROW LEVEL SECURITY;

ALTER TABLE workflow_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions NO FORCE ROW LEVEL SECURITY;

-- 003: Audit
ALTER TABLE audit_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events NO FORCE ROW LEVEL SECURITY;

-- 002: Users & RBAC
ALTER TABLE delegations DISABLE ROW LEVEL SECURITY;
ALTER TABLE delegations NO FORCE ROW LEVEL SECURITY;

ALTER TABLE role_bindings DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_bindings NO FORCE ROW LEVEL SECURITY;

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users NO FORCE ROW LEVEL SECURITY;

-- 001: Org Units
ALTER TABLE org_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_units NO FORCE ROW LEVEL SECURITY;

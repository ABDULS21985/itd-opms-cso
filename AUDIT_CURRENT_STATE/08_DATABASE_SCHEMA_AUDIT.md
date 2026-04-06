# 08 -- Database Schema Audit

**Project:** ITD-OPMS
**Scope:** PostgreSQL schema across 37 migrations (`itd-opms-api/migrations/`)
**Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (automated code analysis)

---

## 1. Executive Summary

The database schema spans **37 migration files** (001-038, with 035 missing) creating **119 tables**, **2 sequences**, **1 materialized view**, and **7 trigger functions**. The schema is well-structured with consistent tenant isolation (all operational tables have `tenant_id`), proper foreign key relationships, and appropriate indexing. However, there are significant gaps: **no soft delete pattern**, **no row-level security (RLS)**, **no field-level encryption**, and several tables created by migrations that lack corresponding application code.

### Key Metrics

| Metric | Count |
|--------|-------|
| Tables (unique) | 119 |
| Migrations | 37 (001-038, 035 missing) |
| Sequences | 2 (ticket_seq, problem_seq) |
| Materialized Views | 1 (mv_executive_summary) |
| Trigger Functions | 7 |
| Triggers | 40+ |
| GIN Indexes | 4+ (JSONB custom_fields, full-text search) |
| Generated Columns | 2 (risk_score in risks and risk_register) |
| Seed Migrations | 8 (021, 031, 032, 033, 034, 036, 037, 038) |

---

## 2. Schema Inventory by Module

### 2.1 Foundation / Platform (Migrations 001-006, 016-018)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| tenants | platform | Multi-tenant root | All modules | IS tenant root | PK, UNIQUE(code) | code, parent, active | ACTIVE | Seeded with ITD dept |
| org_units | platform | Organizational hierarchy | system | tenant_id FK | PK, UNIQUE(tenant_id, code), FK(tenants, org_units parent, users manager) | tenant, parent, level | ACTIVE | Closure table pattern |
| org_hierarchy | platform | Closure table for org tree | system | -- (via org_units) | PK(ancestor, descendant), FK(org_units) CASCADE | descendant, depth | ACTIVE | Auto-populated by trigger |
| users | platform | User accounts | auth, all modules | tenant_id FK | PK, UNIQUE(email), UNIQUE(entra_id) | email, entra_id, tenant, active | ACTIVE | password_hash for dev mode |
| roles | platform | RBAC role definitions | auth, system | NONE (global) | PK, UNIQUE(name) | -- | ACTIVE | 7 system roles seeded |
| role_bindings | platform | User-role assignments | auth, system | tenant_id FK | PK, UNIQUE(user, role, tenant, scope, scope_id) partial | user, tenant | ACTIVE | Supports scope types |
| delegations | platform | Time-bound role elevation | auth, system | tenant_id FK | PK, FK(users x3, roles, tenants) | delegate, active | ACTIVE | |
| refresh_tokens | platform | JWT refresh tokens | auth | -- (via user) | PK, UNIQUE(token_hash), FK(users) CASCADE | user, hash (partial) | ACTIVE | |
| audit_events | platform | Immutable audit log | audit middleware | tenant_id FK | PK, FK(tenants, users), NO UPDATE/DELETE rules | tenant+time, entity, actor, action, correlation | ACTIVE | SHA-256 checksum trigger |
| workflow_definitions | approval | Approval workflow templates | approval | tenant_id FK | PK, FK(tenants) | -- | ACTIVE | Enhanced in 024 |
| approval_chains | approval | Active approval instances | approval | tenant_id FK | PK, FK(workflow_definitions, tenants) | entity | ACTIVE | Enhanced in 024 |
| approval_steps | approval | Individual approval steps | approval | -- (via chain) | PK, FK(approval_chains) CASCADE | chain, approver | ACTIVE | Enhanced in 024 |
| signoffs | approval | Completed sign-offs | approval | tenant_id FK | PK, FK(users, tenants) | entity | ACTIVE | |
| documents | platform | File metadata (shared) | planning, vault | tenant_id FK | PK, FK(tenants, users) | tenant, type | ACTIVE | Extended in 028 with vault columns |
| evidence_items | platform | Evidence attachments | grc | tenant_id FK | PK, FK(tenants) | entity, tenant | ACTIVE | |
| directory_sync_runs | platform | Entra ID sync history | dirsync | NONE (global) | PK | -- | ACTIVE | |
| notification_templates | platform | Email/notification templates | notification | NONE (global) | PK, UNIQUE(key) | key | ACTIVE | |
| notification_outbox | platform | Notification delivery queue | notification | tenant_id FK | PK, FK(tenants) | status, tenant | ACTIVE | Outbox pattern |
| notification_dlq | platform | Dead letter queue | notification | -- (via outbox) | PK, FK(notification_outbox) CASCADE | outbox_id | ACTIVE | |
| notifications | platform | In-app user notifications | notification | tenant_id FK | PK, FK(users) CASCADE | user+read, tenant | ACTIVE | |
| user_notification_preferences | platform | Per-user prefs | notification | -- (via user) | PK, FK(users) CASCADE UNIQUE | -- | ACTIVE | |
| teams_channel_mappings | platform | Teams integration config | notification | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | |
| system_settings | system | Key-value config store | system | tenant_id FK (nullable) | PK, UNIQUE(tenant, category, key) | -- | ACTIVE | is_secret flag (no encryption) |
| active_sessions | system | User session tracking | system | tenant_id FK | PK, FK(users, tenants) | user, token_hash | ACTIVE | |
| email_templates | system | Email template content | system | tenant_id FK | PK, FK(tenants) | category, tenant | ACTIVE | Created in 016 |

### 2.2 Governance Module (Migration 007)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| policies | governance | IT policies/standards | PolicyService | tenant_id FK | PK, FK(tenants, users) | tenant, status, type | ACTIVE | State machine lifecycle |
| policy_versions | governance | Version history | PolicyService | -- (via policy) | PK, FK(policies) CASCADE | policy_id, version | ACTIVE | |
| attestation_campaigns | governance | Policy attestation drives | PolicyService | tenant_id FK | PK, FK(policies) CASCADE, FK(tenants) | policy, status | ACTIVE | |
| policy_attestations | governance | Individual attestation records | PolicyService | tenant_id FK | PK, FK(policies) CASCADE, FK(users) | policy+user, status | ACTIVE | |
| raci_matrices | governance | RACI responsibility matrices | RACIService | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | |
| raci_entries | governance | RACI matrix cells | RACIService | -- (via matrix) | PK, FK(raci_matrices) CASCADE | matrix_id | ACTIVE | |
| meetings | governance | Governance meetings | MeetingService | tenant_id FK | PK, FK(tenants, users) | tenant, date, type | ACTIVE | |
| meeting_decisions | governance | Meeting decisions | MeetingService | -- (via meeting) | PK, FK(meetings) CASCADE | meeting_id | ACTIVE | |
| action_items | governance | Action tracking | MeetingService | tenant_id FK | PK, FK(tenants, users, meetings) | tenant, owner, status, due_date | ACTIVE | Enhanced in 019 with reminder columns |
| okrs | governance | Objectives & Key Results | OKRService | tenant_id FK | PK, FK(tenants, users, okrs parent) | tenant, period, owner | ACTIVE | Hierarchical |
| key_results | governance | Measurable key results | OKRService | -- (via okr) | PK, FK(okrs) CASCADE | okr_id | ACTIVE | |
| kpis | governance | Key Performance Indicators | OKRService | tenant_id FK | PK, FK(tenants) | tenant, category | ACTIVE | |

### 2.3 Planning Module (Migrations 008, 020, 022, 023, 026)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| portfolios | planning | Project portfolios | PortfolioService | tenant_id FK | PK, FK(tenants, users) | tenant | ACTIVE | |
| projects | planning | Project definitions | PortfolioService | tenant_id FK | PK, FK(tenants, portfolios, users) | tenant, portfolio, status, rag | ACTIVE | division_id added in 022, custom_fields in 030 |
| project_dependencies | planning | Inter-project dependencies | PortfolioService | -- (via projects) | PK, FK(projects x2) CASCADE | project_id | ACTIVE | |
| project_stakeholders | planning | Stakeholder assignments | PortfolioService | -- (via project) | PK, FK(projects) CASCADE, FK(users) | project_id | ACTIVE | |
| work_items | planning | Tasks/deliverables | WorkItemService | tenant_id FK | PK, FK(projects) CASCADE | project, assignee, status, parent | ACTIVE | Hierarchical, custom_fields in 030 |
| milestones | planning | Project milestones | WorkItemService | tenant_id FK | PK, FK(projects) CASCADE | project, date | ACTIVE | |
| time_entries | planning | Time logging | WorkItemService | -- (via work_item) | PK, FK(work_items) CASCADE, FK(users) | work_item, user | ACTIVE | |
| risk_register | planning | Project-level risks | RiskService | tenant_id FK | PK, FK(tenants) | tenant, project, severity | ACTIVE | Generated column: risk_score |
| issues | planning | Project issues | -- | tenant_id FK | PK, FK(tenants, projects) | tenant, project, status | ACTIVE | |
| change_requests | planning | Change requests | -- | tenant_id FK | PK, FK(tenants, projects) | tenant, project, status | ACTIVE | |
| post_implementation_reviews | planning | PIR records | PIRService | tenant_id FK | PK, FK(tenants, projects, users) | tenant, project, status | ACTIVE | Created in 020 |
| pir_templates | planning | PIR question templates | PIRService | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | Created in 020 |
| project_documents | planning | Project file metadata | DocumentService | -- (via project) | PK, FK(projects, users) | project, category, status | ACTIVE | Created in 023 |
| cost_categories | planning | Budget cost categories | BudgetService | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | Created in 026 |
| project_cost_entries | planning | Budget line items | BudgetService | -- (via project) | PK, FK(projects) | project, date, type | ACTIVE | Trigger: fn_update_project_budget_spent |
| budget_snapshots | planning | Point-in-time budget snapshots | BudgetService | -- (via project) | PK, FK(projects) | project+date | ACTIVE | Created in 026 |

### 2.4 ITSM Module (Migration 009)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| business_hours_calendars | itsm | SLA business hours | SLAService | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | JSONB schedule |
| sla_policies | itsm | SLA target definitions | SLAService | tenant_id FK | PK, FK(tenants, business_hours_calendars) | tenant | ACTIVE | |
| service_catalog_categories | itsm | Service catalog categories | CatalogService | tenant_id FK | PK, FK(tenants, service_catalog_categories parent) | tenant | ACTIVE | Hierarchical |
| service_catalog_items | itsm | Service catalog items | CatalogService | tenant_id FK | PK, FK(service_catalog_categories, tenants) | tenant, category | ACTIVE | |
| support_queues | itsm | Support team queues | QueueService | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | JSONB members |
| tickets | itsm | Incidents/SRs/changes | TicketService | tenant_id FK | PK, FK(tenants, users x3, sla_policies) | tenant, status, priority, assignee, queue, type | ACTIVE | Auto-numbered, custom_fields JSONB |
| ticket_comments | itsm | Ticket conversation | TicketService | -- (via ticket) | PK, FK(tickets) CASCADE, FK(users) | ticket_id | ACTIVE | |
| ticket_status_history | itsm | Status transition log | TicketService | -- (via ticket) | PK, FK(tickets) CASCADE | ticket_id | ACTIVE | |
| escalation_rules | itsm | Auto-escalation config | SLAService | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | |
| sla_breach_log | itsm | SLA breach records | SLAService | -- (via ticket) | PK, FK(tickets) CASCADE | ticket_id | ACTIVE | |
| problems | itsm | Problem records | ProblemService | tenant_id FK | PK, FK(tenants, users) | tenant, status | ACTIVE | Auto-numbered |
| known_errors | itsm | Known error database | ProblemService | -- (via problem) | PK, FK(problems) CASCADE | problem_id | ACTIVE | |
| csat_surveys | itsm | Customer satisfaction | TicketService | -- (via ticket) | PK, FK(tickets) CASCADE, FK(users) | ticket_id | ACTIVE | |

### 2.5 CMDB Module (Migration 010)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| assets | cmdb | IT asset register | AssetService | tenant_id (no FK) | PK, UNIQUE(asset_tag), CHECK(type), CHECK(status) | tenant, type, status, assigned_to | ACTIVE | **Missing FK to tenants** |
| asset_lifecycle_events | cmdb | Asset lifecycle history | AssetService | -- (via asset) | PK, FK(assets) | asset_id | ACTIVE | |
| asset_disposals | cmdb | Asset disposal workflow | AssetService | tenant_id FK | PK, FK(assets, tenants, users) | asset, tenant | ACTIVE | |
| cmdb_items | cmdb | Configuration items | CMDBService | tenant_id FK | PK, FK(tenants) | tenant, type, ci_id | ACTIVE | JSONB attributes |
| cmdb_relationships | cmdb | CI relationship graph | CMDBService | tenant_id FK | PK, FK(tenants, cmdb_items x2) | source, target, tenant | ACTIVE | |
| reconciliation_runs | cmdb | CMDB reconciliation | CMDBService | tenant_id FK | PK, FK(tenants, users) | tenant | ACTIVE | |
| licenses | cmdb | Software licenses | LicenseService | tenant_id FK | PK, FK(tenants) | tenant, vendor, expiry | ACTIVE | |
| license_assignments | cmdb | License-to-user mapping | LicenseService | -- (via license) | PK, FK(licenses, users) | license, user | ACTIVE | |
| warranties | cmdb | Warranty records | WarrantyService | tenant_id FK | PK, FK(tenants, assets) | tenant, asset, expiry | ACTIVE | |
| renewal_alerts | cmdb | Renewal notifications | -- | tenant_id FK | PK, FK(tenants) | tenant, entity | ACTIVE | Not clearly used by app code |

### 2.6 People Module (Migration 011)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| skill_categories | people | Skill taxonomy | SkillService | tenant_id FK | PK, FK(tenants, skill_categories parent) | tenant | ACTIVE | Hierarchical |
| skills | people | Skill definitions | SkillService | tenant_id FK | PK, FK(tenants, skill_categories) | tenant, category | ACTIVE | |
| user_skills | people | User skill assessments | SkillService | -- (via user/skill) | PK, FK(users, skills) | user, skill, tenant | ACTIVE | Verification workflow |
| role_skill_requirements | people | Role-to-skill mapping | SkillService | tenant_id FK | PK, FK(tenants, skills) | tenant, role_type | ACTIVE | For gap analysis |
| checklist_templates | people | Onboard/offboard templates | ChecklistService | tenant_id FK | PK, FK(tenants) | tenant, type | ACTIVE | JSONB items |
| checklists | people | Active checklist instances | ChecklistService | tenant_id FK | PK, FK(tenants, checklist_templates, users) | tenant, user, status | ACTIVE | |
| checklist_tasks | people | Individual task items | ChecklistService | -- (via checklist) | PK, FK(checklists) CASCADE | checklist_id | ACTIVE | |
| rosters | people | Shift/roster schedules | RosterService | tenant_id FK | PK, FK(tenants) | tenant, date | ACTIVE | |
| leave_records | people | Leave/absence records | RosterService | tenant_id FK | PK, FK(tenants, users) | tenant, user, dates | ACTIVE | |
| capacity_allocations | people | Resource allocation | RosterService, HeatmapService | tenant_id FK | PK, FK(tenants, users) | tenant, user, project | ACTIVE | |
| training_records | people | Training & certifications | TrainingService | tenant_id FK | PK, FK(tenants, users) | tenant, user, expiry | ACTIVE | |

### 2.7 Knowledge Module (Migration 012)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| kb_categories | knowledge | Article categories | ArticleService | tenant_id FK | PK, FK(tenants, kb_categories parent) | tenant | ACTIVE | Hierarchical |
| kb_articles | knowledge | Knowledge base articles | ArticleService | tenant_id FK | PK, FK(tenants, kb_categories, users) | tenant, category, slug, status, **GIN full-text** | ACTIVE | Full-text search on title+content |
| kb_article_versions | knowledge | Article version history | ArticleService | -- (via article) | PK, FK(kb_articles) CASCADE | article_id | ACTIVE | |
| kb_article_feedback | knowledge | User feedback on articles | FeedbackService | -- (via article) | PK, FK(kb_articles) CASCADE, FK(users) | article_id | ACTIVE | |
| announcements | knowledge | System announcements | AnnouncementService | tenant_id FK | PK, FK(tenants, users) | tenant, active, priority | ACTIVE | |

### 2.8 GRC Module (Migration 013)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| risks | grc | Enterprise risk register | RiskService | tenant_id FK | PK, FK(tenants, users), UNIQUE(risk_number, tenant_id) | tenant, category, status | ACTIVE | Generated column: risk_score = likelihood * impact |
| risk_assessments | grc | Risk assessment records | RiskService | -- (via risk) | PK, FK(risks) CASCADE, FK(users) | risk_id | ACTIVE | |
| audits | grc | Audit engagements | AuditMgmtService | tenant_id FK | PK, FK(tenants, users x2) | tenant, status, type | ACTIVE | |
| audit_findings | grc | Audit findings | AuditMgmtService | -- (via audit) | PK, FK(audits) CASCADE | audit_id, severity | ACTIVE | Finding number generation |
| evidence_collections | grc | Audit evidence bundles | AuditMgmtService | -- (via audit) | PK, FK(audits) CASCADE | audit_id | ACTIVE | |
| access_review_campaigns | grc | Access review campaigns | AccessReviewService | tenant_id FK | PK, FK(tenants, users) | tenant, status | ACTIVE | |
| access_review_entries | grc | Individual review entries | AccessReviewService | -- (via campaign) | PK, FK(access_review_campaigns) CASCADE | campaign_id, user | ACTIVE | |
| compliance_controls | grc | Compliance control register | ComplianceService | tenant_id FK | PK, FK(tenants) | tenant, framework, status | ACTIVE | |

### 2.9 Reporting Module (Migrations 014-015)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| report_definitions | reporting | Report templates/schedules | ReportService | tenant_id FK | PK, FK(tenants, users), CHECK(type) | tenant, type | ACTIVE | |
| report_runs | reporting | Report execution records | ReportService | tenant_id FK | PK, FK(report_definitions) CASCADE | definition, status, UNIQUE(definition, scheduled_for) | ACTIVE | Runs stay pending (no generation) |
| dashboard_cache | reporting | Dashboard data cache | DashboardService | tenant_id FK | PK, FK(tenants) | tenant, cache_key | ACTIVE | |
| saved_searches | reporting | User saved searches | SearchService | tenant_id FK | PK, FK(tenants, users) | tenant, user | ACTIVE | |
| mv_executive_summary | reporting | Cross-module KPI aggregation | DashboardService, ReportService | tenant_id | MATERIALIZED VIEW, UNIQUE INDEX on tenant_id | tenant_id | ACTIVE | Refreshed every 5 minutes |

### 2.10 Vendor Module (Migration 027)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| vendors | vendor | Vendor registry | VendorService | tenant_id FK | PK, FK(tenants) | tenant | ACTIVE | |
| contracts | vendor | Contract management | VendorService | tenant_id FK | PK, FK(vendors, tenants) | vendor, status, end_date | ACTIVE | |
| vendor_scorecards | vendor | Vendor performance | VendorService | -- (via vendor) | PK, FK(vendors) | vendor, period | ACTIVE | |
| contract_renewals | vendor | Contract renewal records | VendorService | -- (via contract) | PK, FK(contracts) | contract_id | ACTIVE | |

### 2.11 Document Vault Module (Migration 028)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| document_folders | vault | Folder hierarchy | VaultService | tenant_id FK | PK, FK(tenants, document_folders parent) | parent, path | ACTIVE | |
| document_access_log | vault | File access audit trail | VaultService | -- (via document) | PK, FK(documents, users) | document, user | ACTIVE | |
| document_shares | vault | Document sharing permissions | VaultService | -- (via document) | PK, FK(documents, users x2) | document, shared_with_user | ACTIVE | |

### 2.12 Automation Module (Migration 029)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| automation_rules | automation | Rule definitions | AutomationService | tenant_id FK | PK, FK(tenants) | tenant, active, trigger | ACTIVE | JSONB conditions/actions |
| automation_executions | automation | Execution history | AutomationService | -- (via rule) | PK, FK(automation_rules) | rule, entity, status, date | ACTIVE | |

### 2.13 Custom Fields Module (Migration 030)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| custom_field_definitions | customfields | Field schema definitions | CustomFieldsService | tenant_id FK | PK, FK(tenants) | tenant+entity, active | ACTIVE | |
| *(plus GIN indexes on tickets.custom_fields, projects.custom_fields, work_items.custom_fields)* | | | | | | | | |

### 2.14 Calendar Module (Migration 025)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| maintenance_windows | calendar | Maintenance window scheduling | CalendarService | tenant_id FK | PK, FK(tenants) | tenant, dates, status | ACTIVE | |
| change_freeze_periods | calendar | Change freeze periods | CalendarService | tenant_id FK | PK, FK(tenants) | dates | ACTIVE | |

### 2.15 Approval Enhancements (Migration 024)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| approval_delegations | approval | Step-level delegation | ApprovalService | -- (via step) | PK, FK(approval_steps) | step_id | ACTIVE | |
| approval_notifications | approval | Approval-specific notifications | ApprovalService | -- (via chain) | PK, FK(approval_chains, users) | recipient, chain | ACTIVE | |

### 2.16 Seed-Only / Administrative (Migrations 021-022)

| Table | Module | Purpose | Used By | Tenant Column | Constraints | Indexes | Status | Notes |
|-------|--------|---------|---------|--------------|-------------|---------|--------|-------|
| project_division_assignments | planning | Division-to-project mapping | -- | -- | PK | -- | UNCERTAIN | Created in 022, unclear application usage |
| division_assignment_log | planning | Assignment audit trail | -- | -- | PK | -- | UNCERTAIN | Created in 022, unclear application usage |

---

## 3. Triggers Inventory

| Trigger | Function | Table | Event | Purpose |
|---------|----------|-------|-------|---------|
| trg_tenants_updated | fn_update_timestamp | tenants | BEFORE UPDATE | Auto-set updated_at |
| trg_org_units_updated | fn_update_timestamp | org_units | BEFORE UPDATE | Auto-set updated_at |
| trg_org_units_hierarchy | fn_org_hierarchy_insert | org_units | AFTER INSERT | Populate closure table |
| trg_users_updated | fn_update_timestamp | users | BEFORE UPDATE | Auto-set updated_at |
| trg_audit_checksum | fn_audit_checksum | audit_events | BEFORE INSERT | Compute SHA-256 checksum |
| trg_ticket_number | fn_generate_ticket_number | tickets | BEFORE INSERT | Auto-generate INC/SR/CHG numbers |
| trg_problem_number | fn_generate_problem_number | problems | BEFORE INSERT | Auto-generate PRB numbers |
| trg_cost_entry_budget_sync | fn_update_project_budget_spent | project_cost_entries | AFTER INSERT/UPDATE/DELETE | Sync budget_spent on projects |
| trg_*_updated (x30+) | fn_update_timestamp | 30+ tables | BEFORE UPDATE | Auto-set updated_at |

### Trigger Coverage Gaps

| Table | Has updated_at | Has Trigger | Gap |
|-------|---------------|-------------|-----|
| action_items | YES | NO | Missing fn_update_timestamp trigger |
| csat_surveys | YES | NO | No updated_at column, no trigger needed |
| approval_delegations | YES | NO | Created in 024, may lack trigger |
| approval_notifications | YES | NO | Created in 024, may lack trigger |

---

## 4. Sequences

| Sequence | Used By | Purpose | Current Pattern |
|----------|---------|---------|----------------|
| ticket_seq | fn_generate_ticket_number | Auto-increment ticket numbers | INC-0001, SR-0001, CHG-0001 |
| problem_seq | fn_generate_problem_number | Auto-increment problem numbers | PRB-0001 |

---

## 5. Materialized View

### mv_executive_summary

**Created in:** Migration 014, **replaced in** Migration 015

**Purpose:** Cross-module KPI aggregation for executive dashboard

**Refreshed by:** DashboardRefresher (every 5 minutes) via `REFRESH MATERIALIZED VIEW CONCURRENTLY`

**Columns:** tenant_id, plus aggregated metrics from tickets, projects, assets, risks, compliance controls, training, and more.

**Index:** `UNIQUE INDEX idx_mv_executive_summary_tenant ON mv_executive_summary(tenant_id)` -- required for `CONCURRENTLY` refresh.

---

## 6. Constraint Analysis

### 6.1 Foreign Key Patterns

- **CASCADE DELETE**: Used on child tables (policy_versions, ticket_comments, approval_steps, etc.) -- appropriate for dependent records
- **No CASCADE on tenants**: Deleting a tenant would fail due to FK constraints from all module tables -- this is correct behavior (tenants should never be deleted)
- **Missing FK on assets.tenant_id**: The `assets` table references `tenant_id` but does not have an explicit `REFERENCES tenants(id)` constraint

### 6.2 CHECK Constraints

| Table | Column | Constraint |
|-------|--------|-----------|
| assets | type | IN ('hardware','software','virtual','cloud','network','peripheral') |
| assets | status | IN ('procured','received','active','maintenance','retired','disposed') |
| report_definitions | type | IN ('executive_pack','sla_report','asset_report','grc_report','pmo_report','custom') |
| documents | status | IN ('active','archived','deleted') |
| documents | access_level | IN ('public','internal','confidential','restricted') |
| approval_chains | urgency | IN ('low','normal','high','critical') |

### 6.3 Missing Constraints

| Table | Issue | Risk |
|-------|-------|------|
| tickets | No CHECK on `type` column | Invalid ticket types possible |
| tickets | No CHECK on `priority` column | Invalid priority values possible |
| tickets | No CHECK on `status` column | Invalid status values possible (state machine only enforced in app) |
| projects | No CHECK on `status` or `rag_status` | Invalid values possible |
| work_items | No CHECK on `status` | State machine only enforced in app |
| policies | No CHECK on `status` | Lifecycle only enforced in app |
| problems | No CHECK on `status` | State machine only enforced in app |

---

## 7. Index Analysis

### 7.1 GIN Indexes (JSONB / Full-Text)

| Table | Column(s) | Type | Purpose |
|-------|----------|------|---------|
| kb_articles | tsvector(title \|\| content) | GIN | Full-text search |
| tickets | custom_fields | GIN (partial) | Custom field queries |
| projects | custom_fields | GIN (partial) | Custom field queries |
| work_items | custom_fields | GIN (partial) | Custom field queries |

### 7.2 Notable Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| role_bindings | (user, role, tenant, scope_type, scope_id) | UNIQUE partial | Prevent duplicate active bindings |
| org_units | (tenant_id, code) | UNIQUE | Ensure code uniqueness per tenant |
| report_runs | (definition_id, scheduled_for) | UNIQUE partial | Prevent duplicate scheduled runs |
| risks | (risk_number, tenant_id) | UNIQUE | Ensure risk number uniqueness per tenant |
| audit_events | (tenant_id, timestamp DESC) | B-tree | Time-range queries per tenant |

### 7.3 Missing Indexes (Potential)

| Table | Suggested Index | Reason |
|-------|----------------|--------|
| action_items | (tenant_id, status, due_date) | ActionReminderService queries by status + due_date |
| action_items | (owner_id, status) | MyOverdueActions query |
| notification_outbox | (status, priority, created_at) | OutboxProcessor batch claim query |
| refresh_tokens | (expires_at) WHERE revoked = false | Cleanup of expired tokens |

---

## 8. Soft Delete Patterns

**Status: NONE**

No table in the schema has a `deleted_at` column or any soft-delete mechanism. All DELETE operations are **hard deletes** with CASCADE propagation to child records.

**Impact:**
- Deleted records cannot be recovered
- Audit trail shows the delete event but the original data is lost from operational tables
- CASCADE deletes can remove large amounts of dependent data (e.g., deleting a project removes all work items, milestones, time entries, cost entries, documents, etc.)

---

## 9. Audit Table Analysis

### 9.1 audit_events Table

- **Immutability enforced** via PostgreSQL rules: `no_update_audit`, `no_delete_audit`
- **SHA-256 checksum** computed on INSERT via trigger (tenant_id + actor_id + action + entity_type + entity_id + changes + timestamp)
- **Integrity verification**: MaintenanceWorker runs weekly checksum verification (but references `audit_log` table name -- potential bug)
- **Indexes**: 5 indexes covering tenant+time, entity, actor, action, correlation_id

### 9.2 What IS Logged

- All POST/PUT/PATCH/DELETE requests via AuditMiddleware
- Service-level audit entries for specific business operations (policy lifecycle, report runs, etc.)

### 9.3 What IS NOT Logged

- GET requests (read access not audited)
- Failed authentication attempts
- Configuration changes (system_settings mutations)
- Role assignment/revocation (not explicitly audited beyond generic middleware)
- Password changes
- Session creation/destruction

---

## 10. Tables Not Clearly Used by Application

| Table | Migration | Evidence |
|-------|-----------|---------|
| renewal_alerts | 010 | No handler or service references found for direct CRUD |
| project_division_assignments | 022 | Created in seed migration, unclear if application code references it |
| division_assignment_log | 022 | Created in seed migration, unclear if application code references it |
| signoffs | 004 | Approval module uses approval_steps for decisions; signoffs table may be legacy |
| evidence_items | 005 | GRC uses evidence_collections; evidence_items may be platform-level but underutilized |

---

## 11. Features with No Schema Backing

| Feature | Module | Gap |
|---------|--------|-----|
| Row-Level Security (RLS) | All | No RLS policies exist; tenant isolation is app-enforced only |
| Field-level encryption | system | `is_secret` flag on system_settings but no actual encryption |
| Soft deletes | All | No deleted_at columns anywhere |
| Rate limit persistence | platform | Rate limits use Redis only; no database-backed rate limit history |
| User preferences (general) | system | Only notification preferences exist; no general user preferences table |

---

## 12. Migration Numbering Gaps

| Gap | Notes |
|-----|-------|
| 035 missing | Migration files jump from 034_seed_policies.sql to 036_seed_raci_matrices.sql |
| No 015 down migration safety | Migration 015 drops and recreates mv_executive_summary but 014 already created it |

---

## 13. Schema/Code Mismatches

| Mismatch | Detail |
|----------|--------|
| MaintenanceWorker references `audit_log` | Code in maintenance_worker.go queries `audit_log` table, but schema table is `audit_events` |
| Role permissions mismatch | Seeded roles use `governance.read`, `itsm.write` but middleware checks `governance.view`, `itsm.manage` |
| CSRF allowed origins hardcoded | Server setup hardcodes `localhost:3000`, `localhost:5173` -- no production origins in CSRF config |

---

## 14. Recommendations

1. **Add RLS policies** to all tenant-scoped tables for defense-in-depth against application-level tenant isolation bugs
2. **Add CHECK constraints** to status/type columns on tickets, projects, work_items, policies, and problems
3. **Add FK constraint** to `assets.tenant_id` referencing `tenants(id)`
4. **Implement soft delete** for business-critical entities (projects, tickets, assets, policies) using a `deleted_at` column
5. **Add missing indexes** for action_items (reminder queries), notification_outbox (batch processing), and refresh_tokens (cleanup)
6. **Fix table name mismatch** in MaintenanceWorker (`audit_log` --> `audit_events`)
7. **Reconcile permission names** between seeded roles and middleware checks
8. **Add migration 035** or renumber to fill the gap
9. **Implement field-level encryption** for system_settings where `is_secret = true`
10. **Add audit logging** for GET requests on sensitive resources, failed auth attempts, and configuration changes

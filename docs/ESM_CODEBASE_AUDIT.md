# ITD-OPMS CODEBASE AUDIT — ESM IMPLEMENTATION READINESS

**Date**: 2026-03-29
**Source**: Full codebase audit of ITD-OPMS (Go backend + Next.js frontend)
**Purpose**: Map existing capabilities against CBN ESM BRD (234 requirements)

---

## Table of Contents

- [Phase 8A: Module Inventory Table](#phase-8a-module-inventory-table)
- [Phase 8B: ESM Capability Matrix](#phase-8b-esm-capability-matrix)
- [Phase 8C: Database Table Inventory](#phase-8c-database-table-inventory)
- [Phase 8D: API Route Map](#phase-8d-api-route-map)
- [Phase 8E: Frontend Page Map](#phase-8e-frontend-page-map)
- [Phase 8F: State Machine / Workflow Definitions](#phase-8f-state-machine--workflow-definitions)
- [Phase 8G: Notification Templates & Channels](#phase-8g-notification-templates--channels)
- [Phase 8H: Integration Points](#phase-8h-integration-points)
- [Key Gaps Summary](#key-gaps-summary-for-esm-implementation)

---

## Phase 8A: Module Inventory Table

| Module | DB Tables | API Endpoints | Frontend Pages | Handlers | Services | Maturity |
|--------|-----------|---------------|----------------|----------|----------|----------|
| **ITSM** | tickets, ticket_comments, ticket_status_history, ticket_kb_links, sla_policies, business_hours_calendars, escalation_rules, sla_breach_log, sla_breaches, problems, known_errors, csat_surveys, service_catalog_categories, service_catalog_items, service_catalog_favorites, service_requests, approval_tasks, request_timeline, support_queues, mv_catalog_item_popularity (20) | 87 endpoints | 13 pages | 9 handlers | 8 services | **High** |
| **CMDB** | assets, asset_lifecycle_events, asset_disposals, cmdb_items, cmdb_relationships, reconciliation_runs, licenses, license_assignments, warranties, renewal_alerts (10) | 42 endpoints | 14 pages | 4 handlers | 4 services | **High** |
| **Knowledge** | kb_categories, kb_articles, kb_article_versions, kb_article_feedback, announcements (5) | 20 endpoints | 7 pages | 3 handlers | 3 services | **High** |
| **GRC** | risks, risk_assessments, grc_audits, audit_findings, evidence_collections, access_review_campaigns, access_review_entries, compliance_controls (8) | 29 endpoints | 10 pages | 4 handlers | 4 services | **High** |
| **Reporting** | report_definitions, report_runs, dashboard_cache, saved_searches, mv_executive_summary (5) | 24 endpoints | 9 pages (1 reports + 8 analytics) | 3 handlers | 3 services + 2 workers | **High** |
| **System** | users, roles, role_bindings, delegations, refresh_tokens, system_settings, active_sessions, email_templates, tenants, org_units, org_hierarchy (11) | 62 endpoints | 16 pages | 9 handlers | 9 services + 1 worker | **High** |
| **Governance** | policies, policy_versions, attestation_campaigns, policy_attestations, raci_matrices, raci_entries, meetings, meeting_decisions, action_items, okrs, key_results, kpis (12) | ~40 endpoints | 12 pages | ~6 handlers | ~6 services | **High** |
| **Planning** | portfolios, projects, project_dependencies, project_stakeholders, work_items, milestones, time_entries, risk_register, issues, change_requests, post_implementation_reviews, pir_templates, project_division_assignments, division_assignment_log, project_documents, project_import_batches, project_import_batch_errors (17) | ~55 endpoints | 14 pages | ~8 handlers | ~8 services | **High** |
| **People** | skill_categories, skills, user_skills, role_skill_requirements, checklist_templates, checklists, checklist_tasks, rosters, leave_records, capacity_allocations, training_records (11) | ~40 endpoints | 10 pages | ~6 handlers | ~6 services | **High** |
| **Vendor** | vendors, contracts, vendor_scorecards, contract_renewals (4) | ~15 endpoints | integrated in CMDB | 2 handlers | 2 services | **Medium** |
| **SSA** | ssa_requests, ssa_service_impacts, ssa_approvals, ssa_asd_assessments, ssa_qcmd_analyses, ssa_san_provisionings, ssa_dco_servers, ssa_audit_logs, ssa_delegations (9) | ~25 endpoints | dedicated pages | ~4 handlers | ~4 services | **High** |
| **Platform** | audit_events, workflow_definitions, approval_chains, approval_steps, signoffs, documents, evidence_items, notification_templates, notification_outbox, notification_dlq, notifications, user_notification_preferences, teams_channel_mappings, directory_sync_runs, automation_rules, automation_executions, custom_field_definitions, document_folders, document_access_log, document_shares, document_comments, document_lifecycle_log, approval_delegations, approval_notifications, maintenance_windows, change_freeze_periods, cost_categories, project_cost_entries, budget_snapshots, password_reset_tokens (30) | shared middleware | shared components | N/A | auth, audit, notification, middleware | **High** |

**Totals**: ~140 tables, 2 materialized views, 549 SQLC queries, ~435+ API endpoints, 109+ frontend pages, 28 hook files, 17+ shared components

---

## Phase 8B: ESM Capability Matrix

### Incident Management

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Create/Modify/Close Incidents | `tickets` table with per-type auto-numbering (INC-/SR-/CHG-/TKT- prefixes via migration 074, gapless sequences starting at 1001) | **Yes** | Fully implemented with ESM-compliant prefixes |
| Status Workflow (Open->Assigned->Waiting->OnHold->Resolved->Closed) | 9-state workflow: logged->classified->assigned->in_progress->pending_customer/pending_vendor->resolved->closed + cancelled | **Yes** | State names differ from ESM BRD (e.g., `logged` vs `Open`, `pending_customer` vs `Waiting`). No `OnHold` state distinct from `pending_vendor`. |
| Priority Matrix (Urgency x Impact) | 4x4 matrix (`CalculatePriority()`) producing P1-P4 | **Yes** | Fully implemented |
| Subtasks / Child Tickets | `parent_ticket_id` FK on tickets table | **Partial** | Schema supports parent-child, but no dedicated subtask UI or workflow. No subtask creation from parent ticket page. |
| Email-to-Ticket | SendGrid Inbound Parse webhook at `POST /api/v1/webhooks/email/inbound` (490 lines). Reply detection, ticket creation, attachment upload, user matching, email threading columns (migration 079) | **Yes** | Fully implemented |
| Auto-Escalation (SLA-based) | `escalation_rules` table + background `escalation_worker.go` (338 lines) evaluating rules every 60s. Trigger types: sla_warning, sla_breach, priority. Escalation chain actions: reassign, change_priority, notify. NATS events, Prometheus metrics, dedup via `escalation_events` table (migration 086) | **Yes** | Fully implemented with automated background worker |
| Major Incident Management | `is_major_incident` flag, `DeclareMajorIncident` endpoint | **Partial** | Flag-based only. No dedicated major incident workflow, bridge call coordination, PIR trigger, or communication blast. |
| Bidirectional Ticket Linking | `related_ticket_ids` UUID array with `LinkTickets` endpoint | **Yes** | Implemented with dedup guard |
| SLA Timer with Pause/Resume | `sla_paused_at`, `sla_paused_duration_minutes` on tickets. Pause on `pending_customer` and `pending_vendor`, resume on `in_progress` | **Yes** | Fully implemented for both pending statuses |
| First Response Tracking | `first_response_at` set on first assignment | **Yes** | Fully implemented |
| CSAT Surveys | `csat_surveys` table with 1-5 rating | **Yes** | Post-resolution surveys implemented |
| CSV Export | `ExportTickets` endpoint, max 10,000 rows | **Yes** | Implemented |
| Bulk Operations | `BulkUpdate` for status/priority/assigneeId with validation | **Yes** | Implemented |

### Problem Management

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Create/Track Problems | `problems` table with PRB-NNNNNN auto-numbering | **Yes** | Fully implemented |
| Known Error Database (KEDB) | `known_errors` table linked to problems, with workaround and KB article reference | **Yes** | Implemented with `kb_article_id` FK |
| Root Cause Analysis | `root_cause` field on problems | **Partial** | Text field only. No structured RCA template (5-Whys, Ishikawa). |
| Problem-to-Incident Matching | `linked_incident_ids` UUID array with `LinkIncident` endpoint | **Partial** | Manual linking only. No automated matching based on symptoms/category. |
| Problem Status Workflow | Statuses defined: logged->investigating->root_cause_identified->known_error->resolved | **Partial** | **No enforced state machine** -- any status accepted via COALESCE update |

### Change Management

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| RFC Lifecycle | `change_requests` table in Planning + ITSM `change_service.go` with CHG- ticket type (migration 075). Classification validation, freeze period checks, auto-approval for emergency/standard | **Yes** | Full ITSM change lifecycle with CHG- prefix numbering |
| CAB Workflow | `cab_meetings` table (migration 075), `ChangeService` with full CRUD: CreateCABMeeting, ListCABMeetings, SubmitCABDecision | **Yes** | Full CAB workflow with meeting scheduling and decision tracking |
| Emergency/Standard/Normal Classification | `change_classification` column on tickets (migration 075) with emergency/standard/normal types. Validated in `ChangeService` | **Yes** | Fully implemented with auto-approval rules per classification |
| Change Freeze Periods | `change_freeze_periods` table + DB trigger `check_change_freeze()` (migration 077) blocking non-emergency changes during freeze + application-level enforcement | **Yes** | Enforced at both DB trigger and application level |
| Maintenance Windows | `maintenance_windows` table | **Yes** | Schema exists |
| Post-Implementation Review | `post_implementation_reviews` + `pir_templates` tables | **Yes** | Implemented in Planning module |

### Release Management

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Release Planning & Scheduling | Full `release/` module (service.go, handler.go, types.go). `releases` table (migration 078) with REL- numbering, types (major/minor/patch/emergency), planning/scheduled/in_progress/completed/cancelled/rolled_back states | **Yes** | Fully implemented with release calendar and lifecycle |
| Deployment Pipeline Tracking | `release_deployments` table tracking environment, version, status, deploy_log. Per-deployment status lifecycle | **Yes** | Deployment tracking with environment and version management |
| Rollback Procedures | `rolled_back` state on releases, rollback tracking in deployment records | **Yes** | Rollback state and deployment logging implemented |
| Release-to-Change Linking | `release_items` table linking releases to changes/tickets with item_type and item_id FKs | **Yes** | Full release-to-change and release-to-ticket linking |

### Request Fulfillment

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Service Catalog | `service_catalog_categories` + `service_catalog_items` with full-text search (GIN tsvector) | **Yes** | Rich implementation with categories, entitlements, favorites, popularity, search |
| Dynamic Request Forms | `form_schema` JSONB on catalog items, `DynamicFormRenderer` on frontend | **Yes** | `FormSchemaBuilder` supports 10 field types with validation |
| Approval Workflow | `service_requests` + `approval_tasks` with sequential, parallel, and any_of approval modes, auto-transition | **Yes** | Fully implemented with three approval modes |
| Step-by-Step Request Tracking | `request_timeline` table, `StepProgress` UI component | **Yes** | 4-step progress: Submitted->Approval->Fulfillment->Completed |
| Request Auto-Numbering | REQ-NNNNNN via DB trigger | **Yes** | Implemented |
| SLA on Requests | `sla_policy_id` on catalog items | **Partial** | SLA reference exists but no SLA timer enforcement on service requests |

### CMDB / SACM

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| CI Discovery (IP Range Scan) | `discovery_service.go` (1184 lines) with `discovery_profiles`, `discovery_runs`, `discovered_devices` tables (migration 083). CSV import working, 4-strategy CI matching with confidence scoring. Network/AD/SCCM sources are stubbed | **Partial** | CSV import functional. Network/AD/SCCM discovery sources are stubs only — no live scanning |
| CI Relationship Graphical Display | `topology/page.tsx` with CI cards, type icons, relationship visualization | **Yes** | Visual topology map implemented |
| Auto-Reconciliation Engine | `reconciliation_runs` table with CRUD | **Partial** | Manual trigger only. No automated scan source (SCCM, AD, etc.) to reconcile against. |
| CI Change History/Audit Trail | `audit_events` with SHA-256 checksums, entity timeline endpoint | **Yes** | Immutable audit with `audit-logs/entity/{type}/{id}` |
| CI Version Control | `version` INT on `cmdb_items`, auto-incremented on update | **Yes** | Implemented |
| CI Access Control | RBAC with `cmdb.view`/`cmdb.manage` + org-scope filtering | **Partial** | Module-level permissions only. No CI-level access control. |
| Physical Infrastructure Verification | Not implemented | **No** | No barcode/QR scanning, physical audit workflow |
| Asset Lifecycle Management | 6 statuses with state machine, lifecycle events, disposal workflow | **Yes** | Full lifecycle: procured->received->active->maintenance->retired->disposed |
| License Compliance | `licenses` + `license_assignments` with automatic compliance calculation | **Yes** | compliant/over_deployed/under_utilized auto-calculated |
| Warranty Tracking | `warranties` + `renewal_alerts` with expiring warranty alerts | **Yes** | Implemented with configurable thresholds |

### Knowledge Management

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Search from Incident Screen | `ticket_kb_links` table (migration 081) with link types (reference/resolution/workaround). Knowledge tab on ticket detail page with KB search, auto-suggestions (OR-joined FTS), linked articles with type badges, "Mark as Resolution" action (auto-adds comment + increments helpful_count). Ticket creation wizard shows "Suggested Solutions" panel based on title | **Yes** | Fully implemented with link/unlink, FTS suggestions, resolution tracking, and auto-comments |
| Boolean/Natural Language Queries | PostgreSQL GIN index with `to_tsquery` supporting AND/OR/NOT boolean operators + `plainto_tsquery` fallback + ILIKE search | **Yes** | Full boolean search implemented |
| Version Control | `kb_article_versions` with snapshot on publish, version auto-increment | **Yes** | Implemented |
| Authoring Workflow | draft->in_review->published->archived->retired | **Yes** | Implemented |
| Article Types | how_to, troubleshooting, faq, best_practice, runbook | **Yes** | 5 types supported |
| Feedback/Voting | `kb_article_feedback` with helpful/not_helpful voting + stats | **Yes** | Implemented |
| Announcements | `announcements` with audience targeting (all/division/unit/role) | **Yes** | Implemented |

### SLA Management

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Threshold Monitoring | `sla_response_target`, `sla_resolution_target`, `sla_response_met`, `sla_resolution_met` on tickets | **Yes** | Response and resolution SLA tracking |
| OLA/UC Management | `operational_level_agreements`, `underpinning_contracts`, `sla_dependency_chain` tables (migration 082). `sla_management_service.go` with full CRUD, compliance overviews, expiring agreement alerts | **Yes** | Fully implemented with SLA dependency chains |
| Business Hours Calendars | `business_hours_calendars` with timezone, schedule (JSON), holidays (JSON) | **Yes** | Fully configurable |
| SLA Clock Pause/Resume | Implemented for both `pending_customer` and `pending_vendor` transitions | **Yes** | Fully implemented for both pending statuses |
| Real-Time SLA Dashboard | `sla-dashboard/page.tsx` with gauge charts, compliance stats, policy cards | **Yes** | Implemented |
| SLA Breach Logging | `sla_breaches` table with breach type, target, actual duration | **Yes** | Implemented |
| SLA Compliance Statistics | `GetComplianceStats` with FILTER aggregation, optional priority filter | **Yes** | Implemented |

### Reporting

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| MTTR/MTTA Reports | `mv_executive_summary` materialized view computes MTTR and MTTA | **Yes** | Calculated in executive dashboard KPIs |
| Query Builder | `query_builder_service.go` (900 lines) with safe parameterized queries, whitelisted fields/tables, 12 filter operators, saved queries with scheduling (migration 080). Email delivery for saved query results | **Yes** | Fully implemented with scheduling and email delivery |
| Scheduled Email Reports | `report_definitions` with cron schedule, `ReportScheduler` background worker | **Partial** | Scheduling infrastructure exists. Email delivery of generated reports not confirmed (depends on SendGrid integration). |
| Executive Dashboard | 30+ KPIs, 12 chart endpoints, Redis-cached with 5-min refresh | **Yes** | Comprehensive implementation |
| Report Definitions & Runs | CRUD + lifecycle (pending->generating->completed->failed) | **Yes** | Implemented with executive pack generation |
| Global Search | Cross-module search across tickets, articles, assets, projects, policies, users, meetings, decisions | **Yes** | 8 entity types searchable |

### Security

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| RBAC | 7+ system roles with JSONB permissions, scoped bindings (tenant/project/org_unit), delegation | **Yes** | Comprehensive RBAC with delegation support |
| MFA | Not implemented | **No** | No multi-factor authentication. Relies on Entra ID for MFA in production. |
| SIEM Integration | `siem_exporter.go` (321 lines) with CEF-formatted syslog export + webhook mode. Checkpointing, Prometheus metrics, configurable batch size | **Yes** | Dual-mode SIEM export (syslog + webhook) implemented |
| AD/LDAP/SAML Integration | Entra ID OIDC with PKCE, JWKS RS256 validation, directory sync via Microsoft Graph delta queries | **Yes** | Full Entra ID integration with auto-provisioning |
| Data Encryption (at rest) | MinIO server-side encryption in production docker-compose | **Partial** | Object storage encrypted. PostgreSQL at-rest encryption depends on host config (not enforced in schema). |
| Session Management | `active_sessions` table, session revocation, 30-min inactivity timeout, hourly cleanup | **Yes** | Implemented |
| Audit Trail with Integrity | SHA-256 checksums, immutable (no UPDATE/DELETE rules), integrity verification endpoint | **Yes** | Enterprise-grade audit trail |

### Integration

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Microsoft Teams | `teams_channel_mappings` table, notification orchestrator with NATS events, full adaptive card delivery pipeline via Microsoft Graph API | **Yes** | Full Teams adaptive card integration implemented |
| Azure SSO | Entra ID OIDC with PKCE flow | **Yes** | Implemented |
| SCCM Integration | `connectors/sccm.go` CSV parser for SCCM export data import. Discovery service processes SCCM CSV files for CI reconciliation | **Partial** | CSV import works. Live SCCM API connector is stubbed — no real-time polling |
| MEGA EA (XSD/XML) | Not implemented | **No** | No enterprise architecture tool integration |
| Oracle ERP | Not implemented | **No** | No ERP integration (financials, procurement) |
| Email Manager (SendGrid) | `sendgrid/client.go`, notification outbox pattern, email templates | **Yes** | SendGrid email delivery via outbox processor |
| SSE (Server-Sent Events) | `notification/sse.go` with hub/subscription pattern, exponential backoff on frontend | **Yes** | Real-time in-app notifications |
| NATS JetStream | 4 consumer subjects (itsm, governance, cmdb, grc), NOTIFICATIONS stream | **Yes** | Event-driven notification orchestration |

### Enterprise / Non-Functional

| ESM Requirement Area | OPMS Current State | Exists? | Gap Description |
|---|---|---|---|
| Multi-Tenant ESM (beyond IT) | `tenant_id` on all tables, RLS policies, hierarchical tenants | **Yes** | Full multi-tenancy with row-level security |
| 575+ Concurrent Licenses | `license_enforcer.go` (196 lines) with Redis-backed atomic concurrent session limiting via Lua script. DB-synced crash recovery. Configurable license cap | **Yes** | Fully implemented with atomic enforcement |
| HA/DR (99.9%-99.999%) | Docker prod overrides with resource limits, PostgreSQL WAL archiving, DR runbook | **Partial** | Infrastructure supports HA but single-node deployment. No clustering, no automatic failover. DR runbook is documented but manual. |
| Org-Scope Access Control | `org_unit_id` on major entities, `BuildOrgFilter` in services, closure table hierarchy | **Yes** | Hierarchical org-level data isolation |

---

## Phase 8C: Database Table Inventory (Key Tables)

| Table Name | Module | Key Columns | Indexes | FKs | tenant_id? |
|---|---|---|---|---|---|
| `tenants` | Platform | id, name, code, type, domain, settings JSONB | unique(code) | - | NO |
| `org_units` | Platform | id, tenant_id, name, code, level, parent_id, manager_user_id | tenant, parent, unique(tenant,code) | tenants, users, self | YES |
| `users` | System | id, tenant_id, email, password_hash, display_name, job_title, org_unit_id | tenant, email(unique), org_unit | tenants, org_units | YES |
| `roles` | System | id, name, description, permissions JSONB, is_system | unique(name) | - | NO |
| `role_bindings` | System | id, tenant_id, user_id, role_id, scope_type, scope_id | user, role | users, roles | YES |
| `audit_events` | Platform | event_id, tenant_id, actor_id, action, entity_type, entity_id, changes JSONB, checksum | tenant_time, entity, actor, action, correlation | tenants, users | YES |
| `tickets` | ITSM | id, tenant_id, ticket_number, type, title, priority, urgency, impact, status, reporter_id, assignee_id, queue_id, sla_* fields, is_major_incident, parent_ticket_id, related_asset_id, related_ci_id | tenant, assignee, status | tenants, users, queues, sla_policies, assets, cmdb_items | YES |
| `ticket_comments` | ITSM | id, tenant_id, ticket_id, author_id, content, is_internal, attachments | ticket | tickets, users | YES |
| `ticket_status_history` | ITSM | id, tenant_id, ticket_id, from_status, to_status, changed_by, reason | ticket | tickets, users | YES |
| `ticket_kb_links` | ITSM | id, ticket_id, article_id, linked_by, link_type (reference/resolution/workaround), created_at | ticket_id, article_id, UNIQUE(ticket_id, article_id) | tickets(CASCADE), kb_articles(CASCADE), users | NO |
| `problems` | ITSM | id, tenant_id, problem_number, title, status, root_cause, workaround, linked_incident_ids UUID[], owner_id | tenant | tenants, users | YES |
| `known_errors` | ITSM | id, problem_id, title, description, workaround, status, kb_article_id | tenant | problems, kb_articles | YES |
| `sla_policies` | ITSM | id, tenant_id, name, priority_targets JSONB, business_hours_calendar_id, is_default | tenant | tenants, calendars | YES |
| `business_hours_calendars` | ITSM | id, tenant_id, name, timezone, schedule JSONB, holidays JSONB | - | tenants | YES |
| `escalation_rules` | ITSM | id, tenant_id, name, trigger_type, trigger_config JSONB, escalation_chain JSONB, is_active | tenant | tenants | YES |
| `sla_breaches` | ITSM | id, ticket_id, breach_type, breached_at, target_was, actual_duration_minutes | ticket_id | tickets (CASCADE) | NO |
| `csat_surveys` | ITSM | id, tenant_id, ticket_id, respondent_id, rating (1-5), comment | ticket | tickets, users | YES |
| `support_queues` | ITSM | id, tenant_id, name, team_id, priority_filter, auto_assign_rule, is_active | tenant | tenants | YES |
| `service_catalog_categories` | ITSM | id, tenant_id, name, description, icon, parent_id, sort_order | tenant | tenants, self | YES |
| `service_catalog_items` | ITSM | id, tenant_id, name, category_id, form_schema JSONB, approval_required, sla_policy_id, entitlement_roles TEXT[], search_vector tsvector, status, version | category, search(GIN) | categories, sla_policies | YES |
| `service_requests` | ITSM | id, tenant_id, request_number, catalog_item_id, requester_id, status, form_data JSONB, assigned_to, priority, ticket_id | tenant_requester, tenant_status | catalog_items, tickets | YES |
| `approval_tasks` | ITSM | id, tenant_id, request_id, approver_id, sequence_order, status, decision_at, comment | request_seq, tenant_approver_status | service_requests, users | YES |
| `request_timeline` | ITSM | id, request_id, event_type, actor_id, description, metadata JSONB | request_created | service_requests, users | YES |
| `assets` | CMDB | id, tenant_id, name, asset_tag, type, status, category, manufacturer, model, serial_number, owner_id | tenant, status | tenants, users | YES |
| `asset_lifecycle_events` | CMDB | id, tenant_id, asset_id, event_type, description, performed_by | asset | assets, users | YES |
| `asset_disposals` | CMDB | id, tenant_id, asset_id, disposal_method, status, reason, witnesses | asset | assets | YES |
| `cmdb_items` | CMDB | id, tenant_id, name, ci_type, status, version, attributes JSONB, configuration JSONB | tenant | tenants | YES |
| `cmdb_relationships` | CMDB | id, tenant_id, source_ci_id, target_ci_id, relationship_type | source, target | cmdb_items x2 | YES |
| `reconciliation_runs` | CMDB | id, tenant_id, status, source, matches, discrepancies, new_items | tenant | tenants | YES |
| `licenses` | CMDB | id, tenant_id, name, type, total_entitlements, assigned_count, compliance_status | tenant | tenants | YES |
| `license_assignments` | CMDB | id, tenant_id, license_id, assigned_to, assigned_by | license | licenses, users | YES |
| `warranties` | CMDB | id, tenant_id, asset_id, vendor, start_date, end_date, renewal_status | asset | assets | YES |
| `renewal_alerts` | CMDB | id, tenant_id, entity_type, entity_id, alert_date, is_sent | tenant | tenants | YES |
| `kb_categories` | Knowledge | id, tenant_id, name, description, parent_id, icon, sort_order | tenant | tenants, self | YES |
| `kb_articles` | Knowledge | id, tenant_id, title, slug, content, status, type, category_id, author_id, version, tags TEXT[], helpful_count, not_helpful_count, view_count, search_vector tsvector | category, search(GIN) | categories, users | YES |
| `kb_article_versions` | Knowledge | id, tenant_id, article_id, version, title, content, created_by | article | kb_articles, users | YES |
| `kb_article_feedback` | Knowledge | id, tenant_id, article_id, user_id, is_helpful, comment | article | kb_articles, users | YES |
| `announcements` | Knowledge | id, tenant_id, title, content, priority, audience, is_active, published_at, expires_at | tenant | tenants | YES |
| `risks` | GRC | id, tenant_id, title, likelihood, impact, risk_score (GENERATED), status, owner_id | tenant | tenants, users | YES |
| `risk_assessments` | GRC | id, tenant_id, risk_id, assessor_id, previous_likelihood, previous_impact | risk | risks, users | YES |
| `grc_audits` | GRC | id, tenant_id, title, type, status, created_by | tenant_status, created_by | tenants, users | YES |
| `audit_findings` | GRC | id, tenant_id, audit_id, title, severity, status | audit | grc_audits (CASCADE) | YES |
| `evidence_collections` | GRC | id, tenant_id, audit_id, title, status, collector_id | audit | grc_audits (CASCADE), users | YES |
| `access_review_campaigns` | GRC | id, tenant_id, name, status, completion_rate | tenant | tenants | YES |
| `compliance_controls` | GRC | id, tenant_id, control_id, framework, title, implementation_status | tenant | tenants | YES |
| `report_definitions` | Reporting | id, tenant_id, name, type, schedule, parameters JSONB | tenant | tenants | YES |
| `report_runs` | Reporting | id, definition_id, status, trigger, result JSONB | definition | report_definitions | YES |
| `mv_executive_summary` | Reporting | 30+ KPI columns (materialized view) | unique | - | - |
| `mv_catalog_item_popularity` | Reporting | item_id, request_count (materialized view) | unique | - | - |
| `notification_outbox` | Platform | id, tenant_id, channel, recipient_id, template_key, template_data JSONB, status | status | tenants, users | YES |
| `notifications` | Platform | id, tenant_id, user_id, title, message, type, is_read | user, user_unread | tenants, users | YES |
| `workflow_definitions` | Platform | id, tenant_id, name, entity_type, is_active | tenant | tenants | YES |
| `documents` | Platform | id, tenant_id, title, file_path, classification, version, status, folder_id, owner_id, legal_hold | tenant, classification, expiry, retention | tenants, users, folders | YES |
| `vendors` | Vendor | id, tenant_id, name, code, vendor_type, contact_name, contact_email | tenant | tenants | YES |
| `contracts` | Vendor | id, tenant_id, vendor_id, name, type, value, start_date, end_date, status | vendor, expiry | vendors | YES |
| `ssa_requests` | SSA | id, tenant_id, reference_no, requestor_id, status (15 states), app_name, server_type, vcpu_count, memory_gb | reference(unique), tenant_status | tenants, users | YES |

### Database Statistics

| Metric | Count |
|--------|-------|
| Total Tables | ~139 |
| Materialized Views | 2 |
| Sequences | 4 (ticket_seq, problem_seq, service_request_seq, ssa_reference_seq) |
| Custom Enums | 7 (tenant_type, org_level_type, scope_type, approval_status, approval_decision, document_classification, project_document_category) |
| Trigger Functions | 11 |
| Immutability Rules | 2 (audit_events) + 2 (ssa_audit_logs) |
| RLS Policies | On all tenant-scoped tables |
| Extensions | pgcrypto, uuid-ossp, pg_trgm |

---

## Phase 8D: API Route Map (Key Routes)

### Authentication

| Method | Path | Permission |
|---|---|---|
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public |
| POST | `/api/v1/auth/logout` | Authenticated |
| GET/POST | `/api/v1/auth/oidc/*` | Public |

### ITSM (82 endpoints)

| Method | Path | Permission |
|---|---|---|
| GET | `/api/v1/itsm/tickets` | itsm.view |
| POST | `/api/v1/itsm/tickets` | itsm.manage |
| GET | `/api/v1/itsm/tickets/stats` | itsm.view |
| GET | `/api/v1/itsm/tickets/my-queue` | itsm.view |
| GET | `/api/v1/itsm/tickets/team-queue/{teamId}` | itsm.view |
| GET | `/api/v1/itsm/tickets/csat-stats` | itsm.view |
| GET | `/api/v1/itsm/tickets/export` | itsm.view |
| POST | `/api/v1/itsm/tickets/bulk/update` | itsm.manage |
| POST | `/api/v1/itsm/tickets/csat` | itsm.manage |
| GET | `/api/v1/itsm/tickets/{id}` | itsm.view |
| PUT | `/api/v1/itsm/tickets/{id}` | itsm.manage |
| POST | `/api/v1/itsm/tickets/{id}/transition` | itsm.manage |
| POST | `/api/v1/itsm/tickets/{id}/assign` | itsm.manage |
| POST | `/api/v1/itsm/tickets/{id}/escalate` | itsm.manage |
| POST | `/api/v1/itsm/tickets/{id}/resolve` | itsm.manage |
| POST | `/api/v1/itsm/tickets/{id}/close` | itsm.manage |
| POST | `/api/v1/itsm/tickets/{id}/major-incident` | itsm.manage |
| POST | `/api/v1/itsm/tickets/{id}/link` | itsm.manage |
| GET | `/api/v1/itsm/tickets/{id}/comments` | itsm.view |
| POST | `/api/v1/itsm/tickets/{id}/comments` | itsm.manage |
| GET | `/api/v1/itsm/tickets/{id}/history` | itsm.view |
| GET | `/api/v1/itsm/tickets/{id}/kb-links` | itsm.view |
| POST | `/api/v1/itsm/tickets/{id}/kb-links` | itsm.manage |
| DELETE | `/api/v1/itsm/tickets/{id}/kb-links/{linkId}` | itsm.manage |
| GET | `/api/v1/itsm/tickets/{id}/kb-suggestions` | itsm.view |
| GET | `/api/v1/itsm/tickets/{id}/kb-search?q=&limit=` | itsm.view |
| GET/POST | `/api/v1/itsm/problems` | itsm.view/manage |
| GET/PUT/DELETE | `/api/v1/itsm/problems/{id}` | itsm.view/manage |
| POST | `/api/v1/itsm/problems/{id}/link-incident` | itsm.manage |
| GET/POST | `/api/v1/itsm/problems/known-errors` | itsm.view/manage |
| GET/PUT/DELETE | `/api/v1/itsm/problems/known-errors/{id}` | itsm.view/manage |
| GET/POST | `/api/v1/itsm/sla-policies` | itsm.view/manage |
| GET | `/api/v1/itsm/sla-policies/default` | itsm.view |
| GET/PUT/DELETE | `/api/v1/itsm/sla-policies/{id}` | itsm.view/manage |
| GET/POST | `/api/v1/itsm/business-hours` | itsm.view/manage |
| GET/PUT/DELETE | `/api/v1/itsm/business-hours/{id}` | itsm.view/manage |
| GET/POST | `/api/v1/itsm/escalation-rules` | itsm.view/manage |
| GET/PUT/DELETE | `/api/v1/itsm/escalation-rules/{id}` | itsm.view/manage |
| GET | `/api/v1/itsm/sla-compliance` | itsm.view |
| GET | `/api/v1/itsm/sla-breaches/{ticketId}` | itsm.view |
| GET/POST | `/api/v1/itsm/catalog/categories` | itsm.view/manage |
| GET/PUT/DELETE | `/api/v1/itsm/catalog/categories/{id}` | itsm.view/manage |
| GET/POST | `/api/v1/itsm/catalog/items` | itsm.view/manage |
| GET | `/api/v1/itsm/catalog/items/entitled` | itsm.view |
| GET | `/api/v1/itsm/catalog/items/{id}` | itsm.view |
| GET | `/api/v1/itsm/catalog/items/{id}/related` | itsm.view |
| POST | `/api/v1/itsm/catalog/items/bulk/status` | itsm.manage |
| GET | `/api/v1/itsm/catalog/search/search` | itsm.view |
| GET/POST | `/api/v1/itsm/catalog/search/favorites` | itsm.view |
| GET | `/api/v1/itsm/catalog/search/popular` | itsm.view |
| GET | `/api/v1/itsm/catalog/search/recent` | itsm.view |
| POST | `/api/v1/itsm/catalog/requests` | itsm.view |
| GET | `/api/v1/itsm/catalog/requests` | itsm.view |
| GET | `/api/v1/itsm/catalog/requests/pending-approvals` | itsm.view |
| GET | `/api/v1/itsm/catalog/requests/{id}` | itsm.view |
| POST | `/api/v1/itsm/catalog/requests/{id}/approve` | itsm.view |
| POST | `/api/v1/itsm/catalog/requests/{id}/reject` | itsm.view |
| POST | `/api/v1/itsm/catalog/requests/{id}/cancel` | itsm.view |
| GET/POST | `/api/v1/itsm/queues` | itsm.view/manage |
| GET/PUT/DELETE | `/api/v1/itsm/queues/{id}` | itsm.view/manage |

### CMDB (42 endpoints)

| Method | Path | Permission |
|---|---|---|
| GET/POST | `/api/v1/cmdb/assets` | cmdb.view/manage |
| GET | `/api/v1/cmdb/assets/stats` | cmdb.view |
| GET | `/api/v1/cmdb/assets/search` | cmdb.view |
| GET | `/api/v1/cmdb/assets/disposals` | cmdb.view |
| GET/PUT/DELETE | `/api/v1/cmdb/assets/{id}` | cmdb.view/manage |
| POST | `/api/v1/cmdb/assets/{id}/transition` | cmdb.manage |
| GET/POST | `/api/v1/cmdb/assets/{id}/lifecycle` | cmdb.view/manage |
| POST | `/api/v1/cmdb/assets/disposals` | cmdb.manage |
| PUT | `/api/v1/cmdb/assets/disposals/{id}/status` | cmdb.manage |
| GET/POST | `/api/v1/cmdb/items` | cmdb.view/manage |
| GET | `/api/v1/cmdb/items/search` | cmdb.view |
| GET/PUT/DELETE | `/api/v1/cmdb/items/{id}` | cmdb.view/manage |
| GET | `/api/v1/cmdb/items/{id}/relationships` | cmdb.view |
| POST/DELETE | `/api/v1/cmdb/relationships` | cmdb.manage |
| GET/POST | `/api/v1/cmdb/reconciliation` | cmdb.view/manage |
| PUT | `/api/v1/cmdb/reconciliation/{id}/complete` | cmdb.manage |
| GET/POST | `/api/v1/cmdb/licenses` | cmdb.view/manage |
| GET | `/api/v1/cmdb/licenses/compliance-stats` | cmdb.view |
| GET/PUT/DELETE | `/api/v1/cmdb/licenses/{id}` | cmdb.view/manage |
| GET/POST | `/api/v1/cmdb/licenses/{id}/assignments` | cmdb.view/manage |
| DELETE | `/api/v1/cmdb/licenses/assignments/{assignmentId}` | cmdb.manage |
| GET/POST | `/api/v1/cmdb/warranties` | cmdb.view/manage |
| GET | `/api/v1/cmdb/warranties/expiring` | cmdb.view |
| GET/PUT/DELETE | `/api/v1/cmdb/warranties/{id}` | cmdb.view/manage |
| GET/POST | `/api/v1/cmdb/renewal-alerts` | cmdb.view/manage |
| PUT | `/api/v1/cmdb/renewal-alerts/{id}/sent` | cmdb.manage |

### Knowledge (20 endpoints)

| Method | Path | Permission |
|---|---|---|
| GET/POST | `/api/v1/knowledge/categories` | knowledge.view/manage |
| GET/PUT/DELETE | `/api/v1/knowledge/categories/{id}` | knowledge.view/manage |
| GET/POST | `/api/v1/knowledge/articles` | knowledge.view/manage |
| GET | `/api/v1/knowledge/articles/search` | knowledge.view |
| GET | `/api/v1/knowledge/articles/slug/{slug}` | knowledge.view |
| GET/PUT/DELETE | `/api/v1/knowledge/articles/{id}` | knowledge.view/manage |
| POST | `/api/v1/knowledge/articles/{id}/publish` | knowledge.manage |
| POST | `/api/v1/knowledge/articles/{id}/archive` | knowledge.manage |
| POST | `/api/v1/knowledge/articles/{id}/view` | knowledge.view |
| GET/POST | `/api/v1/knowledge/articles/{articleId}/feedback` | knowledge.view |
| GET | `/api/v1/knowledge/articles/{articleId}/feedback/stats` | knowledge.view |
| DELETE | `/api/v1/knowledge/articles/{articleId}/feedback/{id}` | knowledge.manage |
| GET/POST | `/api/v1/knowledge/announcements` | knowledge.view/manage |
| GET/PUT/DELETE | `/api/v1/knowledge/announcements/{id}` | knowledge.view/manage |

### GRC (29 endpoints)

| Method | Path | Permission |
|---|---|---|
| GET/POST | `/api/v1/grc/risks` | grc.view/manage |
| GET | `/api/v1/grc/risks/heat-map` | grc.view |
| GET | `/api/v1/grc/risks/review-needed` | grc.view |
| GET/PUT/DELETE | `/api/v1/grc/risks/{id}` | grc.view/manage |
| POST | `/api/v1/grc/risks/{id}/assess` | grc.manage |
| GET | `/api/v1/grc/risks/{id}/assessments` | grc.view |
| POST | `/api/v1/grc/risks/{id}/escalate` | grc.manage |
| GET/POST | `/api/v1/grc/audits` | grc.view/manage |
| GET/PUT/DELETE | `/api/v1/grc/audits/{id}` | grc.view/manage |
| GET | `/api/v1/grc/audits/{id}/readiness` | grc.view |
| GET/POST | `/api/v1/grc/audits/{auditId}/findings` | grc.view/manage |
| GET/PUT | `/api/v1/grc/audits/{auditId}/findings/{findingId}` | grc.view/manage |
| POST | `/api/v1/grc/audits/{auditId}/findings/{findingId}/close` | grc.manage |
| GET/POST | `/api/v1/grc/audits/{auditId}/evidence` | grc.view/manage |
| GET/PUT | `/api/v1/grc/audits/{auditId}/evidence/{evidenceId}` | grc.view/manage |
| POST | `/api/v1/grc/audits/{auditId}/evidence/{evidenceId}/approve` | grc.manage |
| GET/POST | `/api/v1/grc/access-reviews` | grc.view/manage |
| GET/PUT | `/api/v1/grc/access-reviews/{id}` | grc.view/manage |
| GET/POST | `/api/v1/grc/access-reviews/{campaignId}/entries` | grc.view/manage |
| POST | `/api/v1/grc/access-reviews/{campaignId}/entries/{entryId}/decide` | grc.manage |
| GET/POST | `/api/v1/grc/compliance` | grc.view/manage |
| GET | `/api/v1/grc/compliance/stats` | grc.view |
| GET/PUT/DELETE | `/api/v1/grc/compliance/{id}` | grc.view/manage |

### Reporting (24 endpoints)

| Method | Path | Permission |
|---|---|---|
| GET | `/api/v1/reporting/dashboards/executive` | reporting.view |
| GET | `/api/v1/reporting/dashboards/tenant/{tenantId}` | reporting.view |
| POST | `/api/v1/reporting/dashboards/executive/refresh` | reporting.manage |
| GET | `/api/v1/reporting/dashboards/my` | reporting.view |
| GET | `/api/v1/reporting/dashboards/my-tasks` | reporting.view |
| GET | `/api/v1/reporting/dashboards/activity-feed` | reporting.view |
| GET | `/api/v1/reporting/dashboards/upcoming` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/tickets-by-priority` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/tickets-by-status` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/projects-by-status` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/assets-by-type` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/assets-by-status` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/sla-compliance` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/projects-by-rag` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/projects-by-priority` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/risks-by-category` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/work-items-by-status` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/office-analytics` | reporting.view |
| GET | `/api/v1/reporting/dashboards/charts/projects-by-office` | reporting.view |
| GET/POST | `/api/v1/reporting/reports` | reporting.view/manage |
| POST | `/api/v1/reporting/reports/executive-pack/generate` | reporting.manage |
| POST | `/api/v1/reporting/reports/{id}/run` | reporting.manage |
| GET | `/api/v1/reporting/search` | reporting.view |
| GET/POST/DELETE | `/api/v1/reporting/search/saved` | reporting.view |

### System (62 endpoints)

| Method | Path | Permission |
|---|---|---|
| GET | `/api/v1/system/users` | system.view |
| GET | `/api/v1/system/users/search` | Authenticated (any) |
| GET | `/api/v1/system/users/stats` | system.view |
| POST | `/api/v1/system/users` | system.manage |
| GET | `/api/v1/system/users/{id}` | system.view |
| PATCH | `/api/v1/system/users/{id}` | system.manage |
| POST | `/api/v1/system/users/{id}/deactivate` | system.manage |
| POST | `/api/v1/system/users/{id}/reactivate` | system.manage |
| POST | `/api/v1/system/users/{id}/roles` | system.manage |
| DELETE | `/api/v1/system/users/{id}/roles/{bindingId}` | system.manage |
| GET | `/api/v1/system/users/{id}/delegations` | system.view |
| POST | `/api/v1/system/users/{id}/delegations` | system.manage |
| DELETE | `/api/v1/system/users/{id}/delegations/{delegationId}` | system.manage |
| GET/POST | `/api/v1/system/roles` | system.view/manage |
| GET | `/api/v1/system/roles/stats` | system.view |
| GET/PATCH/DELETE | `/api/v1/system/roles/{id}` | system.view/manage |
| GET | `/api/v1/system/permissions` | system.view |
| GET/POST | `/api/v1/system/tenants` | system.view/manage |
| GET | `/api/v1/system/tenants/tree` | system.view |
| GET/PATCH | `/api/v1/system/tenants/{id}` | system.view/manage |
| POST | `/api/v1/system/tenants/{id}/deactivate` | system.manage |
| GET/POST | `/api/v1/system/org-units` | system.view/manage |
| GET | `/api/v1/system/org-units/tree` | system.view |
| GET | `/api/v1/system/org-units/analytics` | system.view |
| GET/PATCH/DELETE | `/api/v1/system/org-units/{id}` | system.view/manage |
| POST | `/api/v1/system/org-units/{id}/move` | system.manage |
| GET | `/api/v1/system/org-units/{id}/users` | system.view |
| GET | `/api/v1/system/health` | system.view |
| GET | `/api/v1/system/health/stats` | system.view |
| GET | `/api/v1/system/health/directory-sync` | system.view |
| POST | `/api/v1/system/health/directory-sync/trigger` | system.manage |
| GET | `/api/v1/system/settings` | system.view |
| GET | `/api/v1/system/settings/categories` | system.view |
| GET/PUT/DELETE | `/api/v1/system/settings/{category}/{key}` | system.view/manage |
| GET | `/api/v1/system/sessions` | system.manage |
| GET | `/api/v1/system/sessions/stats` | system.manage |
| DELETE | `/api/v1/system/sessions/{id}` | system.manage |
| DELETE | `/api/v1/system/sessions/user/{userId}` | system.manage |
| GET/POST | `/api/v1/system/email-templates` | system.view/manage |
| GET/PATCH/DELETE | `/api/v1/system/email-templates/{id}` | system.view/manage |
| POST | `/api/v1/system/email-templates/{id}/preview` | system.manage |
| GET | `/api/v1/system/audit-logs` | system.audit.view |
| GET | `/api/v1/system/audit-logs/stats` | system.audit.view |
| GET | `/api/v1/system/audit-logs/export` | system.audit.export |
| POST | `/api/v1/system/audit-logs/verify` | system.audit.verify |
| GET | `/api/v1/system/audit-logs/entity/{type}/{id}` | system.audit.view |
| GET | `/api/v1/system/audit-logs/{id}` | system.audit.view |

---

## Phase 8E: Frontend Page Map

| Route | Module | Key Features |
|---|---|---|
| `/dashboard` | Home | KPIs, activity feed, quick links |
| `/dashboard/itsm` | ITSM Hub | Donut/gauge charts, KPI cards, navigation |
| `/dashboard/itsm/tickets` | ITSM | DataTable, bulk ops, filters, CSV export |
| `/dashboard/itsm/tickets/new` | ITSM | 4-step wizard, priority matrix |
| `/dashboard/itsm/tickets/[id]` | ITSM | Timeline, SLA gauge, comments, transitions |
| `/dashboard/itsm/my-queue` | ITSM | Priority-sorted queue, inline replies |
| `/dashboard/itsm/problems` | ITSM | Problem board, known errors tab |
| `/dashboard/itsm/problems/[id]` | ITSM | Problem detail |
| `/dashboard/itsm/sla-dashboard` | ITSM | Gauge charts, compliance stats, policy cards |
| `/dashboard/itsm/service-catalog` | ITSM | Storefront, search, favorites, categories |
| `/dashboard/itsm/service-catalog/[itemId]` | ITSM | Dynamic form, request submission |
| `/dashboard/itsm/service-catalog/manage` | ITSM | Category/item CRUD, form builder, DnD |
| `/dashboard/itsm/service-catalog/my-requests` | ITSM | Request cards, step progress |
| `/dashboard/itsm/service-catalog/my-requests/[id]` | ITSM | Approval/rejection, timeline |
| `/dashboard/cmdb` | CMDB Hub | Summary cards, quick links |
| `/dashboard/cmdb/assets` | CMDB | DataTable, search, type/status filters |
| `/dashboard/cmdb/assets/new` | CMDB | 4-step wizard |
| `/dashboard/cmdb/assets/[id]` | CMDB | Detail, lifecycle timeline, transitions |
| `/dashboard/cmdb/assets/[id]/edit` | CMDB | Edit form |
| `/dashboard/cmdb/assets/[id]/dispose` | CMDB | Disposal form |
| `/dashboard/cmdb/licenses` | CMDB | License cards, compliance, assignments |
| `/dashboard/cmdb/warranties` | CMDB | Expiring warranties, countdown timers |
| `/dashboard/cmdb/topology` | CMDB | CI topology visualization |
| `/dashboard/cmdb/reconciliation` | CMDB | Run cards, trigger, results |
| `/dashboard/cmdb/vendors` | Vendor | DataTable, create modal |
| `/dashboard/cmdb/vendors/[id]` | Vendor | 4 tabs, scorecards, charts |
| `/dashboard/cmdb/contracts` | Vendor | DataTable, filters |
| `/dashboard/cmdb/reports` | CMDB | Stats cards grid |
| `/dashboard/knowledge` | KM Hub | Stats, recent articles, announcements |
| `/dashboard/knowledge/search` | KM | Full-text search, category filter |
| `/dashboard/knowledge/articles/new` | KM | 3-step wizard |
| `/dashboard/knowledge/articles/[slug]` | KM | Article viewer, feedback, publish/archive |
| `/dashboard/knowledge/articles/[slug]/edit` | KM | Edit form |
| `/dashboard/knowledge/categories` | KM | Category CRUD |
| `/dashboard/knowledge/announcements` | KM | Announcement CRUD |
| `/dashboard/analytics` | Analytics | Executive overview |
| `/dashboard/analytics/portfolio` | Analytics | Portfolio health, budget |
| `/dashboard/analytics/projects` | Analytics | Project table, RAG, work items |
| `/dashboard/analytics/risks` | Analytics | 5x5 heat map, risk by category |
| `/dashboard/analytics/resources` | Analytics | Workload, utilization |
| `/dashboard/analytics/governance` | Analytics | Ticket/SLA/asset distribution |
| `/dashboard/analytics/offices` | Analytics | Per-office breakdown |
| `/dashboard/analytics/collaboration` | Analytics | Cross-office matrix |
| `/dashboard/reports` | Reporting | Report definitions, runs, executive pack |
| `/dashboard/system` | System Hub | KPI cards, charts, quick actions |
| `/dashboard/system/users` | System | User management, create/deactivate |
| `/dashboard/system/users/[id]` | System | 4-tab detail (roles/delegations/activity/sessions) |
| `/dashboard/system/roles` | System | Role cards, permission counts |
| `/dashboard/system/roles/[id]` | System | Permission editor by module |
| `/dashboard/system/settings` | System | 5-tab settings |
| `/dashboard/system/audit-logs` | System | Advanced filtering, JsonDiff, integrity |
| `/dashboard/system/health` | System | Service health cards, directory sync |
| `/dashboard/system/sessions` | System | Active sessions, revocation |
| `/dashboard/system/tenants` | System | Tree view, CRUD |
| `/dashboard/system/workflows` | System | Approval workflow definitions |
| `/dashboard/system/automation` | System | Rules engine, execution history |
| `/dashboard/system/custom-fields` | System | Field definitions per entity type |
| `/dashboard/system/org-units` | System | Tree/org-chart/sunburst views |
| `/dashboard/system/email-templates` | System | Template listing |
| `/dashboard/system/email-templates/[id]` | System | Template editor with preview |

---

## Phase 8F: State Machine / Workflow Definitions

### 1. Ticket Status State Machine (enforced via `validTicketTransitions`)

```
logged           -> classified, assigned, cancelled
classified       -> assigned, cancelled
assigned         -> in_progress, cancelled
in_progress      -> pending_customer, pending_vendor, resolved, cancelled
pending_customer -> in_progress, resolved, cancelled
pending_vendor   -> in_progress, resolved, cancelled
resolved         -> closed, in_progress
closed           -> (terminal)
cancelled        -> (terminal)
```

**Side effects**:
- SLA pause on `-> pending_customer` (sets `sla_paused_at`)
- SLA resume on `pending_customer ->` (calculates elapsed minutes, adds to `sla_paused_duration_minutes`)
- `first_response_at` set on first assignment
- Audit event on every transition
- Auto-transition `logged -> assigned` on first assignment
- Status history record inserted

### 2. Asset Status State Machine (enforced via `validAssetTransitions`)

```
procured     -> received, disposed
received     -> active, disposed
active       -> maintenance, retired, disposed
maintenance  -> active, retired, disposed
retired      -> disposed
disposed     -> (terminal)
```

**Side effects**:
- Lifecycle event created on transition
- Disposal completion triggers `-> disposed`

### 3. Service Request Status Flow (procedural enforcement)

```
pending_approval -> approved    (all approval tasks approved)
pending_approval -> rejected    (any approval task rejected)
pending_approval -> cancelled   (requester cancels)
approved         -> cancelled   (requester cancels)
in_progress      -> cancelled   (requester cancels)
fulfilled        -> (terminal)
cancelled        -> (terminal)
```

**Approval task states**: `pending -> approved | rejected | skipped | delegated`

### 4. Problem Status (NOT enforced -- freeform update)

```
logged -> investigating -> root_cause_identified -> known_error -> resolved
```

### 5. Article Status (action-based, not transition-map enforced)

```
draft -> in_review -> published -> archived -> retired
```

Triggered via `PublishArticle` (draft/in_review -> published) and `ArchiveArticle` (-> archived) actions.

### 6. GRC Audit Status (NOT enforced)

```
planned -> preparing -> in_progress -> findings_review -> completed
```

### 7. SSA Request Workflow (enforced -- 15 states with 5-tier approval)

```
DRAFT -> SUBMITTED -> HOD_REVIEW -> ITD_REVIEW -> ASD_ASSESSMENT -> QCMD_ANALYSIS
-> SAN_PROVISIONING -> DCO_IMPLEMENTATION -> COMPLETED
```

Plus REJECTED, REVISION_REQUESTED, CANCELLED states at each approval tier.

---

## Phase 8G: Notification Templates & Channels

### Channels

| Channel | Technology | Implementation |
|---|---|---|
| **Email** | SendGrid API | `sendgrid/client.go` with API key auth |
| **Microsoft Teams** | Graph API Adaptive Cards | `msgraph/client.go` with circuit breaker |
| **In-App** | PostgreSQL + SSE | `notification/sse.go` with hub/subscription pattern |

### Notification Infrastructure

| Component | Description |
|---|---|
| **Outbox Pattern** | `notification_outbox` table with `OutboxProcessor` background worker |
| **Dead Letter Queue** | `notification_dlq` for failed deliveries |
| **Template Rendering** | Go `html/template` with variable substitution, cached per template key |
| **Orchestrator** | NATS JetStream consumers for domain events |
| **User Preferences** | `user_notification_preferences` with `channel_preferences` and `disabled_types` |

### NATS Event Subjects

| Subject Pattern | Consumer Name | Module |
|---|---|---|
| `notify.itsm.>` | `NOTIFY_ITSM` | ITSM |
| `notify.governance.>` | `NOTIFY_GOVERNANCE` | Governance |
| `notify.cmdb.>` | `NOTIFY_CMDB` | CMDB |
| `notify.grc.>` | `NOTIFY_GRC` | GRC |

### Seeded Email Templates (11 premium templates)

ticket-created, ticket-assigned, ticket-resolved, sla-breach-warning, approval-request, approval-complete, password-reset, welcome-user, action-reminder, meeting-reminder, policy-attestation

---

## Phase 8H: Integration Points

### Microsoft Entra ID / Graph API

| Integration | Implementation |
|---|---|
| OIDC Authentication | PKCE flow with JWKS RS256 validation (`auth/oidc.go`, `auth/oidc_handler.go`) |
| Directory Sync | Delta queries via Microsoft Graph API, NATS-triggered (`dirsync/service.go`) |
| Circuit Breaker | Fault tolerance for Graph API calls (`msgraph/circuitbreaker.go`) |
| User Photos | Graph API photos stored in MinIO with presigned URL generation |

### NATS JetStream

| Item | Details |
|---|---|
| Stream | `NOTIFICATIONS` covering `notify.>` subjects |
| Consumers | 4 durable: `NOTIFY_ITSM`, `NOTIFY_GOVERNANCE`, `NOTIFY_CMDB`, `NOTIFY_GRC` |
| Publishers | Domain modules publish events on state changes |
| Storage | File-based JetStream storage |

### MinIO (S3)

| Bucket | Purpose |
|---|---|
| `evidence-vault` | GRC/audit evidence files |
| `attachments` | General document attachments |
| User Photos | Presigned URL generation for user avatars |

### Redis

| Usage | Details |
|---|---|
| Rate Limiting | IP-based, 100 requests/minute |
| Dashboard Cache | Executive summary with 5-minute TTL refresh |
| Token Revocation | JWT revocation list |
| Session Management | Active session tracking |

### SendGrid

| Item | Details |
|---|---|
| Email Delivery | Via `sendgrid/client.go` API wrapper |
| Coordination | Synchronized with `email_templates` and `notification_templates` tables |

### Observability Stack

| Tool | Integration |
|---|---|
| **Prometheus** | Metrics at `/metrics`: `http_requests_total`, `http_request_duration_seconds`, `db_query_duration_seconds`, `sla_breaches_total`, `http_active_connections` |
| **Grafana** | 2 provisioned dashboards: Platform Health (8 panels), API Performance (6 panels) |
| **Alertmanager** | 7 alert rules routed back to OPMS via webhook at `POST /api/v1/notifications/webhook/alertmanager` |
| **Loki** | Structured JSON log aggregation |
| **Tempo** | OTLP gRPC distributed tracing on port 4317 |

### Middleware Chain (in order)

```
Recovery -> Correlation -> Logging -> TrustedRealIP -> CORS -> SecurityHeaders
-> CSRFProtection -> MaxBodySize(10MB) -> MetricsMiddleware -> RateLimit(100/min)
-> [Auth(dual-mode) -> Tenant -> OrgScope -> Audit]
```

---

## Key Gaps Summary for ESM Implementation

> **Updated 2026-03-30** — Re-verified against migrations 074-086+ and ESM-specific modules (including migration 081: ticket_kb_links). Original audit incorrectly listed 19 gaps; 17 of those have since been implemented. **11 true gaps remain.**

### Remaining Gaps

| # | Severity | Gap | Current State | Impact |
|---|---|---|---|---|
| 1 | **Critical** | **Major Incident Workflow** | `is_major_incident` flag + `DeclareMajorIncident` endpoint exist | No dedicated MI workflow: no communications blast, no bridge call coordination, no automatic PIR trigger, no stakeholder notification cascade |
| 2 | **Critical** | **CI Discovery — Network/AD/SCCM Live Scanning** | `discovery_service.go` with CSV import working + 4-strategy CI matching. Network, AD, SCCM sources are stubs | Cannot auto-discover CIs via network scan, Active Directory, or live SCCM polling. Manual CSV import is the only functional path |
| 3 | **Critical** | **MEGA EA / Oracle ERP Integrations** | Not implemented | No enterprise architecture or ERP connectors |
| 4 | **Moderate** | **MFA** | No native TOTP/WebAuthn | Relies entirely on Entra ID conditional access for MFA in production. No fallback for non-Entra environments |
| 5 | **Moderate** | **Physical Asset Verification** | No barcode/QR scanning | No stocktake workflow, no barcode/QR code generation or scanning for physical asset audits |
| 6 | **Moderate** | **Problem State Machine Bypass** | `TransitionProblem` validates transitions but `UpdateProblem` accepts any status via COALESCE | Status can be set to any value via the update endpoint, bypassing the state machine |
| 7 | **Moderate** | **Subtask/Child Ticket UI** | `parent_ticket_id` FK exists on tickets table | No subtask creation UI, no parent-child ticket hierarchy view, no subtask progress tracking |
| 8 | **Moderate** | **Report Email Delivery** | Report definitions have cron scheduling; saved queries can email results | Report definition runs (executive packs) do not email recipients — only saved query results support email delivery |
| 9 | **Moderate** | **SLA on Service Requests** | `sla_policy_id` on catalog items, SLA timers on tickets | No SLA timer enforcement on service requests — only incident/change tickets have active SLA tracking |
| 10 | **Low** | **PostgreSQL Encryption at Rest** | MinIO server-side encryption configured | No TDE or filesystem-level encryption configured for PostgreSQL. Depends on infrastructure/host-level config |
| 11 | **Low** | **Generic Inbound Webhook Endpoints** | SendGrid inbound + Alertmanager webhook exist | No configurable/generic webhook receiver for arbitrary external system integrations |

### Previously Reported Gaps — Now Verified as IMPLEMENTED

| # | Previously Reported Gap | Implementation Found |
|---|---|---|
| 1 | Ticket auto-numbering (INC-/SR-/CHG-) | Migration 074: per-type gapless sequences starting at 1001 |
| 2 | Email-to-ticket | `platform/email/inbound.go` — SendGrid Inbound Parse webhook (490 lines) |
| 3 | Automated escalation engine | `platform/sla/escalation_worker.go` — 60s background worker (338 lines), migration 086 |
| 4 | Release management | Full `release/` module — REL- numbering, deployments, approvals (migration 078) |
| 5 | Change classification (emergency/standard/normal) | Migration 075: `change_classification` column + `ChangeService` validation |
| 6 | CAB workflow | Migration 075: `cab_meetings` table + `SubmitCABDecision` in `ChangeService` |
| 7 | OLA/UC management | Migration 082: `operational_level_agreements`, `underpinning_contracts`, `sla_dependency_chain` |
| 8 | SIEM integration | `platform/audit/siem_exporter.go` — CEF syslog + webhook (321 lines) |
| 9 | Concurrent license enforcement | `platform/auth/license_enforcer.go` — Redis Lua atomic check (196 lines) |
| 10 | SLA pause for pending_vendor | Both `pending_customer` and `pending_vendor` now trigger SLA pause |
| 11 | KB search from incident screen | Migration 081: `ticket_kb_links` table. `KBLinkService` + `KBLinkHandler` with 5 endpoints. Knowledge tab on ticket detail page with search, auto-suggestions (OR-joined FTS), linked articles with type badges, resolution action (auto-comment + helpful_count increment). Ticket creation wizard "Suggested Solutions" panel |
| 12 | Boolean KB search | `to_tsquery` with AND/OR/NOT boolean operators |
| 13 | Change freeze enforcement | Migration 077: DB trigger `check_change_freeze()` + application-level check |
| 14 | Parallel approval | Sequential + parallel + any_of approval modes implemented |
| 15 | Custom fields on tickets | `customfields` module with `custom_field_definitions` table |
| 16 | Teams adaptive card delivery | Full pipeline via Microsoft Graph API |
| 17 | SCCM connector | `connectors/sccm.go` CSV parser (live API connector still stubbed) |

### Already Production-Strength

| # | Capability | Assessment |
|---|---|---|
| 1 | Multi-tenancy with RLS | Full row-level security on all tenant-scoped tables |
| 2 | SLA Management | Timer, pause/resume (both statuses), breach logging, compliance stats, OLA/UC chains |
| 3 | Service Catalog | Dynamic forms, 3 approval modes, entitlements, search |
| 4 | Knowledge Management | Full lifecycle, versioning, boolean search, feedback, announcements |
| 5 | GRC | Risks, audits, compliance, access reviews with frameworks |
| 6 | Executive Analytics | 30+ KPIs, 12 chart endpoints, Redis-cached refresh, query builder |
| 7 | Audit Trail | SHA-256 checksums, immutable, integrity verification, SIEM export |
| 8 | RBAC with Delegation | 7+ roles, scoped bindings, time-bound delegation |
| 9 | Entra ID SSO | OIDC + PKCE, JWKS, directory sync, auto-provisioning |
| 10 | Real-time Notifications | SSE + outbox pattern + NATS event orchestration + Teams adaptive cards |
| 11 | Change Management | CAB workflow, freeze enforcement, emergency/standard/normal classification |
| 12 | Release Management | REL- numbering, deployment tracking, rollback, release-to-change linking |
| 13 | Automated Escalation | Background worker with SLA-triggered escalation chains |
| 14 | Email-to-Ticket | SendGrid Inbound Parse with reply threading and attachment handling |
| 15 | Concurrent License Enforcement | Redis atomic check with DB-synced crash recovery |

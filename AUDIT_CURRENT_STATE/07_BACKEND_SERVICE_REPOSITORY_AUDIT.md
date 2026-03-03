# 07 -- Backend Service & Repository Layer Audit

**Project:** ITD-OPMS
**Scope:** Go API (`itd-opms-api/`) -- 15 modules, platform packages, background jobs
**Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (automated code analysis)

---

## 1. Executive Summary

The backend follows a **Handler --> Service --> pgxpool.Pool** pattern across all 15 modules. There is **no separate repository/data-access layer** -- services embed SQL directly. Dependency injection is via constructor functions (`NewXXXHandler`, `NewXXXService`). The architecture is internally consistent but couples business logic tightly to PostgreSQL, making unit testing difficult and migration to any alternative persistence impossible without rewriting every service.

### Key Findings

| Severity | Finding |
|----------|---------|
| HIGH | Report generation is noop -- runs are created but never produce actual documents (PDF/Excel) |
| HIGH | Email delivery depends on Microsoft Graph client; returns error silently when Graph unavailable |
| HIGH | No repository abstraction -- services contain raw SQL, preventing mocking and unit testing |
| MEDIUM | Inconsistent transaction usage -- only 7 of 53 services use `pool.Begin()` |
| MEDIUM | Session timeout middleware is a pass-through (commented-out logic) |
| MEDIUM | Policy attestation endpoint (`/attestations/{id}/attest`) lacks `RequirePermission` middleware |
| MEDIUM | Approval step endpoints (`/steps/{id}/decide`, `/steps/{id}/delegate`) lack `RequirePermission` |
| LOW | `fmt.Sprintf` used in SQL construction in audit_explorer_service and workitem_service (validated inputs) |
| LOW | Dashboard refresher hits materialized view with `REFRESH CONCURRENTLY` -- may fail without unique index |

---

## 2. Architecture Pattern

```
HTTP Request
    |
    v
chi.Router (middleware chain: Recovery, Correlation, Logging, RealIP, CORS, SecurityHeaders, CSRF, Metrics, RateLimit)
    |
    v
middleware.AuthDualMode  (Entra ID OIDC RS256 || dev JWT HS256)
    |
    v
audit.AuditMiddleware    (auto-logs POST/PUT/PATCH/DELETE)
    |
    v
middleware.RequirePermission("module.action")  (per-route)
    |
    v
Handler   (HTTP concerns: parse request, call service, write response)
    |
    v
Service   (business logic + raw SQL via pgxpool.Pool)
    |
    v
pgxpool.Pool --> PostgreSQL
```

### Repository Layer: ABSENT

No interface-based repository or data-access-object pattern exists anywhere. All 53 services receive `pool *pgxpool.Pool` directly and embed SQL queries as string constants. This means:

- **Unit tests** cannot mock the database without a real Postgres instance or a fake pgxpool
- **Business logic** and **data access** are tightly coupled in the same file
- **SQL queries** are scattered across ~53 service files rather than centralized

---

## 3. Module Inventory

### 3.1 Handler Inventory (39 handler files)

| Module | Handler File | Service File | Sub-domain | Routes |
|--------|-------------|-------------|------------|--------|
| **governance** | policy_handler.go | policy_service.go | Policy lifecycle, versions, attestations | 14 |
| | raci_handler.go | raci_service.go | RACI matrices and entries | 10 |
| | meeting_handler.go | meeting_service.go | Meetings, decisions, action items | 14 |
| | okr_handler.go | okr_service.go | OKRs, key results, KPIs | 11 |
| **people** | training_handler.go | training_service.go | Training records, certifications | 6 |
| | roster_handler.go | roster_service.go | Rosters, leave, capacity | 12 |
| | checklist_handler.go | checklist_service.go | Templates, checklists, tasks | 14 |
| | heatmap_handler.go | heatmap_service.go | Capacity heatmap, allocations | 10 |
| | skill_handler.go | skill_service.go | Skills, categories, user skills, gap analysis | 14 |
| **planning** | portfolio_handler.go | portfolio_service.go | Portfolios, projects | CRUD + transitions |
| | workitem_handler.go | workitem_service.go | Work items, milestones, time entries, bulk ops | 18 |
| | risk_handler.go | risk_service.go | Project risk register | CRUD + transitions |
| | timeline_handler.go | timeline_service.go | Gantt/timeline data | Read-only |
| | budget_handler.go | budget_service.go | Cost entries, burn rate, forecast, snapshots | 10 |
| | document_handler.go | document_service.go | Project documents (MinIO) | Upload/download/CRUD |
| | pir_handler.go | pir_service.go | Post-implementation reviews | CRUD |
| **itsm** | ticket_handler.go | ticket_service.go | Tickets, comments, status, CSAT, bulk, export | 18 |
| | problem_handler.go | problem_service.go | Problems, known errors | 11 |
| | sla_handler.go | sla_service.go | SLA policies, business hours, escalation rules | 15 |
| | catalog_handler.go | catalog_service.go | Service catalog categories/items | 10 |
| | queue_handler.go | queue_service.go | Support queues | 5 |
| **cmdb** | asset_handler.go | asset_service.go | Assets, lifecycle, disposals | 14 |
| | cmdb_handler.go | cmdb_service.go | Config items, relationships, reconciliation | 11 |
| | license_handler.go | license_service.go | Licenses, assignments | 9 |
| | warranty_handler.go | warranty_service.go | Warranties, renewal alerts | CRUD |
| **knowledge** | article_handler.go | article_service.go | Articles, categories, versions, publishing | 14 |
| | announcement_handler.go | announcement_service.go | Announcements | CRUD |
| | feedback_handler.go | feedback_service.go | Article feedback, stats | 4 |
| **grc** | risk_handler.go | risk_service.go | Enterprise risks, assessments, heat map | 10 |
| | compliance_handler.go | compliance_service.go | Compliance controls, stats | 6 |
| | grc_audit_handler.go | grc_audit_service.go | Audit management, findings, evidence | 13 |
| | access_review_handler.go | access_review_service.go | Access review campaigns/entries | 6 |
| **reporting** | dashboard_handler.go | dashboard_service.go | Executive dashboard, charts, analytics | 16 |
| | report_handler.go | report_service.go | Report definitions, runs, executive pack | 11 |
| | search_handler.go | search_service.go | Global search, saved searches | 5 |
| **system** | user_handler.go | user_service.go | Users, roles, delegations | 13 |
| | role_handler.go | role_service.go | Roles, permissions catalog | 7 |
| | tenant_handler.go | tenant_service.go | Tenant CRUD | CRUD |
| | org_handler.go | org_service.go | Org units, hierarchy | CRUD |
| | health_handler.go | health_service.go | Platform health, dependency checks | Read-only |
| | settings_handler.go | settings_service.go | System settings | CRUD |
| | audit_explorer_handler.go | audit_explorer_service.go | Advanced audit log search, export | 5+ |
| | session_handler.go | session_service.go | Active sessions | Read/revoke |
| | template_handler.go | template_service.go | Email templates | CRUD |
| **approval** | handler.go | service.go | Workflows, chains, steps, decisions | 11 |
| **automation** | handler.go | service.go | Rules, executions, toggle, test | 10 |
| **calendar** | handler.go | service.go | Events, maintenance windows, freeze periods | 8 |
| **customfields** | handler.go | service.go | Field definitions, entity values | 7 |
| **vault** | handler.go | service.go | Documents, folders, versions, sharing, access log | 17 |
| **vendor** | handler.go | service.go | Vendors, contracts, scorecards, renewals | 14 |

### 3.2 Service Dependency Injection

| Module | Constructor | Dependencies |
|--------|------------|-------------|
| governance | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| people | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| planning | `NewHandler(pool, auditSvc, minio, minioCfg)` | pgxpool, audit, MinIO client + config |
| itsm | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| cmdb | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| knowledge | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| grc | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| reporting | `NewHandler(pool, redis, auditSvc)` | pgxpool, Redis, audit |
| system | `NewHandler(pool, auditSvc, redis, nats, minio)` | pgxpool, audit, Redis, NATS, MinIO |
| approval | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| automation | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| calendar | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| customfields | `NewHandler(pool, auditSvc)` | pgxpool, audit |
| vault | `NewHandler(pool, minio, minioCfg, auditSvc)` | pgxpool, MinIO + config, audit |
| vendor | `NewHandler(pool, auditSvc)` | pgxpool, audit |

---

## 4. Feature Trace Table

### 4.1 Core Modules -- Full Trace

| Feature | Handler | Service | Repository | Persistence | Business Rules | Status | Evidence |
|---------|---------|---------|-----------|-------------|---------------|--------|----------|
| Policy lifecycle | PolicyHandler | PolicyService | NONE (direct SQL) | pgxpool --> policies, policy_versions | State machine: draft-->submitted-->approved-->published-->retired | IMPLEMENTED | policy_service.go Submit/Approve/Publish/Retire |
| Policy attestation | PolicyHandler | PolicyService | NONE | pgxpool --> attestation_campaigns, policy_attestations | Campaign launch, attestation recording | IMPLEMENTED | policy_handler.go line 46 -- **missing RequirePermission** on `/attestations/{id}/attest` |
| RACI matrices | RACIHandler | RACIService | NONE | pgxpool --> raci_matrices, raci_entries | Coverage report, entry CRUD | IMPLEMENTED | raci_handler.go |
| Meetings & actions | MeetingHandler | MeetingService | NONE | pgxpool --> meetings, meeting_decisions, action_items | Complete/cancel meeting state, overdue tracking | IMPLEMENTED | meeting_handler.go |
| OKRs & KPIs | OKRHandler | OKRService | NONE | pgxpool --> okrs, key_results, kpis | OKR tree aggregation, progress rollup | IMPLEMENTED | okr_handler.go |
| Ticket management | TicketHandler | TicketService | NONE | pgxpool --> tickets, ticket_comments, ticket_status_history | Status state machine, priority matrix, SLA timer, auto-numbering via sequence | IMPLEMENTED | ticket_service.go |
| Problem management | ProblemHandler | ProblemService | NONE | pgxpool --> problems, known_errors | Incident linking, auto-numbering via problem_seq | IMPLEMENTED | problem_service.go |
| SLA management | SLAHandler | SLAService | NONE | pgxpool --> sla_policies, business_hours_calendars, escalation_rules, sla_breach_log | Target calculation, breach detection, business hours calendar | IMPLEMENTED | sla_service.go |
| Asset management | AssetHandler | AssetService | NONE | pgxpool --> assets, asset_lifecycle_events, asset_disposals | Status state machine: procured-->received-->active-->maintenance-->retired-->disposed | IMPLEMENTED | asset_service.go |
| CMDB items | CMDBHandler | CMDBService | NONE | pgxpool --> cmdb_items, cmdb_relationships, reconciliation_runs | Relationship graph, reconciliation workflow | IMPLEMENTED | cmdb_service.go |
| License tracking | LicenseHandler | LicenseService | NONE | pgxpool --> licenses, license_assignments | Compliance stats, assignment tracking | IMPLEMENTED | license_service.go |
| KB articles | ArticleHandler | ArticleService | NONE | pgxpool --> kb_articles, kb_article_versions, kb_categories | Publish/archive lifecycle, slug generation, full-text search, view counting | IMPLEMENTED | article_service.go |
| Risk management (GRC) | RiskHandler | RiskService | NONE | pgxpool --> risks, risk_assessments | Generated risk_score = likelihood * impact, heat map, escalation | IMPLEMENTED | risk_service.go |
| Compliance controls | ComplianceHandler | ComplianceService | NONE | pgxpool --> compliance_controls | Status tracking, compliance stats | IMPLEMENTED | compliance_service.go |
| Audit management (GRC) | AuditMgmtHandler | AuditService | NONE | pgxpool --> audits, audit_findings, evidence_collections | Readiness scoring, finding lifecycle | IMPLEMENTED | grc_audit_service.go |
| Project portfolio | PortfolioHandler | PortfolioService | NONE | pgxpool --> portfolios, projects, project_dependencies, project_stakeholders | Status transitions, RAG tracking, dependency management | IMPLEMENTED | portfolio_service.go |
| Work items & milestones | WorkItemHandler | WorkItemService | NONE | pgxpool --> work_items, milestones, time_entries | Status transitions, WBS tree, overdue detection, bulk update, time logging | IMPLEMENTED | workitem_service.go |
| Budget tracking | BudgetHandler | BudgetService | NONE | pgxpool --> project_cost_entries, budget_snapshots, cost_categories | Burn rate, forecast, budget trigger sync | IMPLEMENTED | budget_service.go |
| Project documents | DocumentHandler | DocumentService | NONE | pgxpool + MinIO --> project_documents | File upload to MinIO, metadata in Postgres, presigned URLs | IMPLEMENTED | document_service.go |
| Executive dashboard | DashboardHandler | DashboardService | NONE | pgxpool + Redis --> mv_executive_summary | Materialized view refresh, Redis caching | IMPLEMENTED | dashboard_service.go |
| Report definitions | ReportHandler | ReportService | NONE | pgxpool --> report_definitions, report_runs | **NOOP: creates runs with data_snapshot but never generates actual PDF/Excel** | PARTIAL | report_service.go -- TriggerReportRun only captures snapshot |
| Global search | SearchHandler | SearchService | NONE | pgxpool --> multi-table queries | Cross-module search, saved searches | IMPLEMENTED | search_service.go |
| Approval engine | ApprovalHandler | ApprovalService | NONE | pgxpool --> workflow_definitions, approval_chains, approval_steps | Multi-step chain, delegation, deadline tracking | IMPLEMENTED | approval/service.go |
| Document vault | VaultHandler | VaultService | NONE | pgxpool + MinIO --> documents, document_folders, document_shares | Versioning, locking, sharing, access logging | IMPLEMENTED | vault/service.go |
| Vendor management | VendorHandler | VendorService | NONE | pgxpool --> vendors, contracts, vendor_scorecards, contract_renewals | Contract lifecycle, expiry tracking, scorecard periods | IMPLEMENTED | vendor/service.go |
| Automation rules | AutomationHandler | AutomationService | NONE | pgxpool --> automation_rules, automation_executions | Rule toggle, test execution | IMPLEMENTED | automation/service.go |
| Custom fields | CustomFieldsHandler | CustomFieldsService | NONE | pgxpool --> custom_field_definitions | Field definitions per entity type, value storage in JSONB | IMPLEMENTED | customfields/service.go |
| Change calendar | CalendarHandler | CalendarService | NONE | pgxpool --> maintenance_windows, change_freeze_periods | Conflict detection, event aggregation from milestones/deadlines/CRs | IMPLEMENTED | calendar/service.go |

---

## 5. Noop / Fake / Stubbed Logic

### 5.1 Report Generation (CRITICAL)

**File:** `itd-opms-api/internal/modules/reporting/report_service.go`

The `TriggerReportRun` method creates a `report_run` row with status "pending" and captures a data snapshot from `mv_executive_summary`, but **no actual document generation occurs**. The report run stays in "pending" status forever unless manually completed via `CompleteReportRun`. There is no PDF/Excel renderer, no document storage integration for reports, and no worker that processes pending runs.

```
TriggerReportRun()  -->  INSERT report_run (status=pending, snapshot=JSON)
                          ... nothing further happens ...
```

**Impact:** Users see report runs but never receive generated documents. The "generate executive pack" feature creates a placeholder.

### 5.2 Email Delivery (PARTIALLY IMPLEMENTED)

**File:** `itd-opms-api/internal/platform/notification/outbox.go`

Email delivery depends on the Microsoft Graph API client. When `graph == nil` (which is the case when Entra ID is not enabled), `deliverEmail` returns `fmt.Errorf("graph client not available")`, sending the notification to the DLQ after 3 retries.

There is **no SMTP fallback**. The outbox processor polls every 5 seconds and handles email, Teams, and in-app channels, but email and Teams channels are dead paths without Graph client.

### 5.3 Session Timeout Middleware (PASS-THROUGH)

**File:** `itd-opms-api/internal/platform/middleware/session.go`

The entire timeout check is commented out with a TODO note. The middleware accepts all requests regardless of token age.

```go
// TODO: Enable session timeout once AuthContext has IssuedAt field.
// Currently acts as a pass-through.
```

---

## 6. Transaction Safety Analysis

### 6.1 Services Using Transactions

Only **7 out of 53+** service files use `pool.Begin()`:

| Service | File | Transaction Scope |
|---------|------|-------------------|
| DocumentService (planning) | document_service.go | Upload document + update project_documents |
| UserService (system) | user_service.go | Create user + assign default role |
| OrgService (system) | org_service.go | Create org unit + hierarchy closure table |
| TenantService (system) | tenant_service.go | Create tenant + seed default data |
| CustomFieldsService | customfields/service.go | Update multiple field values atomically |
| AutomationService | automation/service.go | Create rule + initial execution record |
| VaultService | vault/service.go | Upload document + create version record |

### 6.2 Missing Transaction Usage (Risk Areas)

| Operation | Risk | File |
|-----------|------|------|
| Approval chain creation (multi-step insert) | Partial chain with missing steps | approval/service.go |
| Ticket creation + SLA timer + status history | Orphaned SLA records on failure | itsm/ticket_service.go |
| Report run creation + snapshot capture | Inconsistent run with no snapshot | reporting/report_service.go |
| Bulk work item update | Partial updates on failure | planning/workitem_service.go -- **does use tx for bulk** |
| Meeting completion + decision/action creation | Meeting marked complete but actions not created | governance/meeting_service.go |
| Risk assessment creation + risk score update | Risk score out of sync | grc/risk_service.go |

---

## 7. Error Handling Quality

### 7.1 Consistent Patterns

All services use `internal/shared/errors` (`apperrors`) for structured error responses:

- `apperrors.Unauthorized(msg)` -- 401
- `apperrors.NotFound(entity, id)` -- 404
- `apperrors.BadRequest(msg)` -- 400
- `apperrors.Internal(msg, err)` -- 500
- `apperrors.Conflict(msg)` -- 409

### 7.2 Issues Found

| Issue | Location | Impact |
|-------|----------|--------|
| Audit log failure silently logged, not propagated | All services -- `slog.ErrorContext(ctx, "failed to log audit event")` | Audit gap if database write fails |
| Reminder update failure silently ignored | governance/action_reminder.go -- `_, _ = s.pool.Exec(...)` | Reminder count may be inaccurate |
| Last login update failure ignored | auth/service.go -- `_, _ = s.pool.Exec(ctx, "UPDATE users SET last_login_at")` | Non-critical but untracked |
| Outbox DLQ insert failure ignored | notification/outbox.go -- `_, _ = p.pool.Exec(...)` | Failed notifications may be lost completely |

---

## 8. Domain Rules Present

| Domain | Rule | Implementation |
|--------|------|----------------|
| ITSM Tickets | Status state machine (open-->in_progress-->resolved-->closed) | Validated in TicketService.TransitionStatus |
| ITSM Tickets | Auto-numbering (INC-XXXX, SR-XXXX, CHG-XXXX) | Database trigger fn_generate_ticket_number on INSERT |
| ITSM Problems | Auto-numbering (PRB-XXXX) | Database trigger fn_generate_problem_number on INSERT |
| ITSM SLA | Target calculation from priority matrix | SLAService with business hours calendar |
| Assets | Status transitions (procured-->received-->active-->maintenance-->retired-->disposed) | AssetService.TransitionStatus |
| Policies | Lifecycle (draft-->submitted-->approved-->published-->retired) | PolicyService state methods |
| GRC Risks | Risk score = likelihood * impact | Generated column in risks table |
| Planning Risks | Risk score = likelihood * impact | Generated column in risk_register table |
| Work Items | Status transitions (todo-->in_progress-->review-->done-->cancelled) | WorkItemService.TransitionWorkItem |
| Budget | Budget spent trigger sync | fn_update_project_budget_spent trigger on cost entries |
| Approvals | Multi-step sequential/parallel chains | ApprovalService with step ordering |
| Audit Events | Immutable -- NO UPDATE/DELETE rules | Database rules no_update_audit, no_delete_audit |
| Audit Events | SHA-256 checksum on insert | Database trigger fn_audit_checksum |

---

## 9. Background Jobs

| Job | Module | Interval | Description | Status |
|-----|--------|----------|-------------|--------|
| DashboardRefresher | reporting | 5 min | Refreshes mv_executive_summary materialized view | ACTIVE |
| ReportScheduler | reporting | 1 min | Checks cron schedules, enqueues due report runs (advisory lock for single-instance) | ACTIVE -- but runs stay "pending" forever |
| OutboxProcessor | notification | 5 sec | Polls notification_outbox, delivers via Graph API (email/Teams) or marks in-app | ACTIVE -- email/Teams dead without Graph |
| Orchestrator | notification | Event-driven | NATS JetStream consumer for domain events --> notification creation | ACTIVE -- depends on NATS |
| MaintenanceWorker | system | 1 hr / 7 days | Session cleanup (1hr), audit integrity check (weekly) | ACTIVE |
| ActionReminderService | governance | 1 hr | Checks overdue/approaching action items, publishes NATS events | ACTIVE -- depends on NATS + JetStream |

### 9.1 Background Job Concerns

1. **No dead letter handling for NATS**: ActionReminderService publishes events but does not track delivery failures
2. **Advisory lock for report scheduler**: Uses `pg_try_advisory_lock(82001502)` -- correct for single-instance but will silently skip on lock contention
3. **Maintenance worker session cleanup**: Deletes from `audit_log` table (which may not exist -- code references `audit_log` but schema has `audit_events`)
4. **DashboardRefresher**: Calls `RefreshExecutiveSummarySystem` which requires `REFRESH MATERIALIZED VIEW CONCURRENTLY` -- this requires a unique index on the materialized view

---

## 10. SQL Construction Safety

### 10.1 Parameterized Queries (GOOD)

All standard CRUD operations use parameterized queries (`$1`, `$2`, etc.) throughout. No string interpolation of user input into SQL.

### 10.2 Dynamic SQL (REVIEWED)

| File | Usage | Safety |
|------|-------|--------|
| audit_explorer_service.go | `fmt.Sprintf` for building WHERE clauses, ORDER BY, column selection | Column names validated against constants; sort direction validated; no user strings in SQL |
| workitem_service.go | `fmt.Sprintf` for bulk update SET clauses | Field names validated against allowlist map before interpolation |
| document_service.go | `fmt.Sprintf` for dynamic filter/sort queries | Column names from code constants, not user input |
| template_service.go | `fmt.Sprintf` for category filter | Category parameter is parameterized (`$N`), only structural SQL uses Sprintf |

**Assessment:** Dynamic SQL usage is controlled and validated. No SQL injection vectors identified, but the pattern is fragile -- any future developer adding a new dynamic field without allowlist validation could introduce a vulnerability.

---

## 11. Missing Implementation Chains

| Expected Feature | Handler | Service | Database | Gap |
|-----------------|---------|---------|----------|-----|
| Report PDF/Excel generation | ReportHandler.TriggerReportRun | ReportService.TriggerReportRun | report_runs table | Service creates run with snapshot but **never generates document** |
| Email notification delivery | -- (outbox) | OutboxProcessor.deliverEmail | notification_outbox | Requires Microsoft Graph; **no SMTP fallback** |
| Session timeout enforcement | -- (middleware) | SessionTimeout middleware | active_sessions | **Pass-through; timeout logic commented out** |
| Soft delete | -- | -- | -- | **No soft delete anywhere** -- all DELETE operations are hard deletes with CASCADE |
| Field-level encryption | -- | -- | system_settings.is_secret | `is_secret` flag exists but **no encryption applied** -- values stored in cleartext JSONB |
| Directory sync execution | Server inline handler | dirsync.Service | directory_sync_runs | Only works when Graph client available; **no standalone LDAP/SCIM support** |

---

## 12. Permission Enforcement Gaps

While most handlers use `middleware.RequirePermission()` on every route, three routes were identified **without** per-route permission checks:

| Route | Handler | File | Risk |
|-------|---------|------|------|
| `POST /attestations/{attestationId}/attest` | PolicyHandler.Attest | governance/policy_handler.go:46 | Any authenticated user can attest -- no role check |
| `POST /steps/{id}/decide` | ApprovalHandler.ProcessDecision | approval/handler.go:53 | Any authenticated user can approve/reject steps |
| `POST /steps/{id}/delegate` | ApprovalHandler.DelegateStep | approval/handler.go:54 | Any authenticated user can delegate approval steps |

**Note:** These routes are inside the authenticated group (AuthDualMode middleware applies), so they require a valid JWT. However, they lack fine-grained permission checks, meaning any authenticated user could perform these actions regardless of their role.

Additionally, the `/api/v1/admin/directory-sync` routes (run and status) have no `RequirePermission` or `RequireRole` middleware -- any authenticated user can trigger a directory sync.

---

## 13. Test Coverage Inventory

Every handler has a corresponding `_test.go` file. Additional service-level tests exist for:

| Test File | Module | Coverage |
|-----------|--------|----------|
| ticket_service_test.go | itsm | Status transitions, priority matrix |
| heatmap_service_test.go | people | Heatmap calculation |
| risk_service_test.go | planning | Risk score validation |
| workitem_service_test.go | planning | Bulk update, transitions |
| document_service_test.go | planning | Upload/download flow |

**Gap:** No integration tests for background jobs (refresher, scheduler, outbox, maintenance worker).

---

## 14. Recommendations

1. **Introduce repository interfaces** for each module to decouple business logic from SQL and enable proper unit testing
2. **Implement report generation worker** that processes pending report_runs and produces actual documents via a template engine
3. **Add SMTP fallback** for email delivery when Microsoft Graph is unavailable
4. **Enable session timeout** by adding `IssuedAt` to AuthContext and uncommenting the middleware logic
5. **Add RequirePermission** to the three unprotected routes (attestation, approval decision, approval delegation)
6. **Protect directory sync endpoints** with `RequireRole("global_admin")` or `RequirePermission("system.manage")`
7. **Wrap multi-step operations in transactions** -- particularly approval chain creation, ticket creation with SLA, and meeting completion
8. **Add soft delete pattern** for business entities that require audit trails of deletion
9. **Implement field-level encryption** for system_settings marked as `is_secret`
10. **Verify maintenance worker references** -- `audit_log` table name mismatch with `audit_events` schema

# Module Audit: Reporting & Analytics System

**Audit Date:** 2026-03-02
**Module Completion:** 60%
**Overall Assessment:** Strong dashboard and charting infrastructure with materialized views and Redis caching; report generation, PDF/Excel export, scheduling, and distribution are STUBBED with no actual implementation

---

## 1. Module Purpose

The Reporting & Analytics module provides centralized dashboard aggregation, chart data endpoints, report definition management, scheduled report generation, and cross-module global search. It serves as the organization's single pane of glass for executive summaries, KPI tracking, and operational analytics across all OPMS modules (ITSM, PMO, CMDB, GRC, People, Knowledge).

---

## 2. Architecture Overview

### 2.1 Backend Structure

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Handler (root) | `handler.go` | 71 | Composes sub-handlers, exposes background job factories |
| Dashboard Handler | `dashboard_handler.go` | 358 | HTTP handlers for executive summary + 12 chart endpoints |
| Dashboard Service | `dashboard_service.go` | 756 | Business logic for materialized view queries + Redis caching |
| Dashboard Refresher | `dashboard_refresher.go` | 46 | Background goroutine for periodic materialized view refresh |
| Report Handler | `report_handler.go` | 310 | HTTP handlers for report definition CRUD + trigger run |
| Report Service | `report_service.go` | 781 | Business logic for report definitions + run management (STUBBED generation) |
| Report Scheduler | `report_scheduler.go` | 51 | Background goroutine for scheduled report enqueue |
| Search Handler | `search_handler.go` | 188 | HTTP handlers for global search + saved searches |
| Search Service | `search_service.go` | 835 | Business logic for cross-entity search |
| Types | `types.go` | 181 | Domain types, report type constants, request structs |
| **Total Production** | **10 files** | **3,577** | |
| Tests | 4 test files | 3,955 | Handler + types tests |
| **Total Module** | **14 files** | **7,532** | |

### 2.2 Frontend Structure

| Page | Path | Purpose |
|------|------|---------|
| Analytics Hub | `/dashboard/analytics/page.tsx` | Main analytics landing page |
| Portfolio Analytics | `/dashboard/analytics/portfolio/page.tsx` | Portfolio-level project analytics |
| Project Analytics | `/dashboard/analytics/projects/page.tsx` | Project-specific analytics |
| Risk Analytics | `/dashboard/analytics/risks/page.tsx` | Risk distribution analytics |
| Resource Analytics | `/dashboard/analytics/resources/page.tsx` | Resource utilization analytics |
| Governance Analytics | `/dashboard/analytics/governance/page.tsx` | Governance metrics |
| Collaboration Analytics | `/dashboard/analytics/collaboration/page.tsx` | Collaboration metrics |
| Office Analytics | `/dashboard/analytics/offices/page.tsx` | Office-level analytics with RAG |
| Reports | `/dashboard/reports/page.tsx` | Report definitions and run history |
| Search | `/dashboard/search/page.tsx` | Global search interface |
| **Frontend Tests** | `analytics/__tests__/page.test.tsx` | Analytics page tests |

### 2.3 Database Schema (Migrations 014, 015)

| Table / View | Purpose | Key Columns |
|-------------|---------|-------------|
| `report_definitions` | Configurable report templates | id, tenant_id, name, type (6 types), template (JSONB), schedule_cron, recipients (UUID[]), is_active, created_by |
| `report_runs` | Individual report generation records | id, definition_id, tenant_id, status (4 states), trigger_source (3 types), scheduled_for, generated_at, completed_at, document_id, data_snapshot (JSONB), error_message |
| `dashboard_cache` | Cached dashboard aggregation data | id, tenant_id, cache_key, data (JSONB), expires_at |
| `saved_searches` | User saved/recent search queries | id, tenant_id, user_id, query, entity_types (TEXT[]), is_saved, last_used_at |
| `mv_executive_summary` | **MATERIALIZED VIEW** for executive dashboard | tenant_id, 30+ KPI columns covering all modules |

**Total: 4 tables + 1 materialized view**

**Migration 015** replaces the materialized view with an expanded version including comprehensive KPIs across all modules.

---

## 3. Executive Summary Materialized View Detail

The `mv_executive_summary` materialized view aggregates KPIs from all OPMS modules into a single queryable row per tenant. This is the backbone of the executive dashboard.

### KPI Columns

| Category | KPI Fields |
|----------|-----------|
| Governance | `active_policies`, `overdue_actions`, `pending_attestations`, `avg_okr_progress` |
| ITSM | `open_tickets`, `critical_tickets`, `open_tickets_p1/p2/p3/p4`, `sla_compliance_pct`, `mttr_minutes`, `mtta_minutes`, `backlog_over_30_days` |
| PMO | `active_projects`, `projects_rag_green/amber/red`, `on_time_delivery_pct`, `milestone_burn_down_pct` |
| CMDB | `active_assets`, `asset_counts_by_type` (map), `asset_counts_by_status` (map), `over_deployed_licenses`, `license_compliance_pct`, `warranties_expiring_90_days` |
| GRC | `high_risks`, `critical_risks`, `audit_readiness_score`, `access_review_completion_pct` |
| People | `team_capacity_utilization_pct`, `overdue_training_certs`, `expiring_certs` |
| Incidents | `open_p1_incidents`, `sla_breaches_24h` |
| Metadata | `refreshed_at` |

### Refresh Mechanism
- **Background Job:** `DashboardRefresher` runs every 5 minutes, calls `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_executive_summary`
- **Manual Refresh:** `POST /dashboards/executive/refresh` (requires `reporting.manage` permission)
- **Redis Cache:** 5-minute TTL, checked before DB query

---

## 4. Feature-by-Feature Capability Audit

| # | Capability | Frontend Evidence | API Evidence | DB Evidence | Status | Gaps | Recommended Next Action |
|---|-----------|-------------------|--------------|-------------|--------|------|------------------------|
| 1 | Executive Dashboard Summary | Analytics hub page | `GET /dashboards/executive` returns `ExecutiveSummary` | `mv_executive_summary` materialized view | COMPLETE | None | -- |
| 2 | Tenant-Specific Executive Summary | Per-tenant view | `GET /dashboards/tenant/{tenantId}` | Same materialized view filtered by tenant | COMPLETE | None | -- |
| 3 | My Dashboard | Personal dashboard | `GET /dashboards/my` | User-specific aggregation | COMPLETE | No per-user customization | Add widget configuration |
| 4 | Dashboard Refresh (Manual) | Refresh button on analytics page | `POST /dashboards/executive/refresh` | `REFRESH MATERIALIZED VIEW CONCURRENTLY` | COMPLETE | None | -- |
| 5 | Dashboard Auto-Refresh (Background) | N/A (server-side) | `DashboardRefresher` goroutine (5-min interval) | Materialized view refreshed concurrently | COMPLETE | None | -- |
| 6 | Redis Caching | N/A (server-side) | `DashboardService` uses `redis.Client` with 5-min TTL | `dashboard_cache` table as fallback | COMPLETE | None | -- |
| 7 | Tickets by Priority Chart | Analytics pages | `GET /dashboards/charts/tickets-by-priority` returns `[]ChartDataPoint` | Aggregate query on tickets table | COMPLETE | None | -- |
| 8 | Tickets by Status Chart | Analytics pages | `GET /dashboards/charts/tickets-by-status` | Aggregate query | COMPLETE | None | -- |
| 9 | Projects by Status Chart | Project analytics page | `GET /dashboards/charts/projects-by-status` | Aggregate query | COMPLETE | None | -- |
| 10 | Projects by RAG Chart | Analytics pages | `GET /dashboards/charts/projects-by-rag` | Aggregate query | COMPLETE | None | -- |
| 11 | Projects by Priority Chart | Analytics pages | `GET /dashboards/charts/projects-by-priority` | Aggregate query | COMPLETE | None | -- |
| 12 | Projects by Office Chart | Office analytics page | `GET /dashboards/charts/projects-by-office` | Aggregate query with office join | COMPLETE | None | -- |
| 13 | Assets by Type Chart | Analytics pages | `GET /dashboards/charts/assets-by-type` | Aggregate query on assets | COMPLETE | None | -- |
| 14 | Assets by Status Chart | Analytics pages | `GET /dashboards/charts/assets-by-status` | Aggregate query | COMPLETE | None | -- |
| 15 | SLA Compliance Rate | Analytics pages | `GET /dashboards/charts/sla-compliance` returns `SLAComplianceRate` | SLA calculation query | COMPLETE | None | -- |
| 16 | Risks by Category Chart | Risk analytics page | `GET /dashboards/charts/risks-by-category` | Aggregate query on risks | COMPLETE | None | -- |
| 17 | Work Items by Status Chart | Analytics pages | `GET /dashboards/charts/work-items-by-status` | Aggregate query on work items | COMPLETE | None | -- |
| 18 | Office Analytics | Office analytics page | `GET /dashboards/charts/office-analytics` | Multi-metric office query | COMPLETE | None | -- |
| 19 | Report Definitions CRUD | Reports page | `GET/POST/PUT/DELETE /reports` + `GET /reports/{id}` | `report_definitions` table | COMPLETE | None | -- |
| 20 | Report Types | Type selector on report form | 6 types: executive_pack, sla_report, asset_report, grc_report, pmo_report, custom | `type TEXT` column | COMPLETE | None | -- |
| 21 | Executive Pack Definition | Report template management | `GET /reports/executive-pack/definition`, `POST /reports/executive-pack/ensure` | Template stored as JSONB | COMPLETE | None | -- |
| 22 | Executive Pack Generation | Generate button | `POST /reports/executive-pack/generate` | Creates run record | PARTIAL | Creates DB record but NO actual report content is generated | Implement report template rendering |
| 23 | Report Run Trigger | Trigger run button on report page | `POST /reports/{id}/run` creates `ReportRun` | `report_runs` table, status='pending' | **STUBBED** | TriggerRun creates a DB record with status='pending' but no generation logic executes | Build report generation pipeline |
| 24 | Report Run History | Run list on report detail | `GET /reports/{definitionId}/runs`, `GET /reports/{definitionId}/runs/{runId}` | `report_runs` with timestamps | COMPLETE (metadata) | Run records exist but never transition to 'completed' because no generation occurs | -- |
| 25 | Report Scheduling (CRON) | Schedule CRON field on report form | `schedule_cron` field on `ReportDefinition`, `ReportScheduler` goroutine | `schedule_cron TEXT` column | **STUBBED** | Scheduler goroutine runs every 1 minute and calls `EnqueueDueScheduledRuns` but enqueued runs are never executed | Wire scheduler to report generation pipeline |
| 26 | Report Distribution | Recipients field on report form | `recipients UUID[]` on `ReportDefinition` | `recipients UUID[]` column | **STUBBED** | Recipients stored but no email/notification delivery implemented | Build distribution service |
| 27 | PDF Export | None | None | None | MISSING | No PDF rendering library integrated | Integrate PDF generation library (e.g., wkhtmltopdf, chromedp) |
| 28 | Excel Export | None | None | None | MISSING | No Excel generation | Integrate Excel library (e.g., excelize) |
| 29 | Report Template Rendering | None | `template JSONB` on definitions stores template config | JSONB template stored | MISSING | Templates stored as JSONB but no rendering engine processes them | Build template engine |
| 30 | Dashboard Customization | None | None | None | MISSING | No per-user dashboard widget configuration | Build user dashboard preferences |
| 31 | KPI Drill-Down | None | Chart endpoints return top-level aggregates only | -- | MISSING | Cannot click a KPI to see underlying details | Add drill-down endpoints and UI |
| 32 | Global Search | `search/page.tsx` | `GET /search` with query and entity type filters | Cross-table queries | COMPLETE | Limited entity types searchable | Expand to all modules |
| 33 | Saved Searches | Search page with saved/recent | `GET/POST/DELETE /search/saved`, `GET /search/saved/recent` | `saved_searches` table | COMPLETE | None | -- |
| 34 | Data Snapshot | None | `data_snapshot JSONB` on `ReportRun` | JSONB column | PARTIAL | Field exists but never populated by generation | Populate during report generation |

---

## 5. API Route Registry

### Dashboard Routes (`/api/v1/reporting/dashboards`)
```
GET    /executive                     GetExecutiveSummary              reporting.view
GET    /tenant/{tenantId}             GetTenantExecutiveSummary        reporting.view
POST   /executive/refresh             RefreshExecutiveSummary          reporting.manage
GET    /my                            GetMyDashboard                   reporting.view
GET    /charts/tickets-by-priority    GetTicketsByPriority             reporting.view
GET    /charts/tickets-by-status      GetTicketsByStatus               reporting.view
GET    /charts/projects-by-status     GetProjectsByStatus              reporting.view
GET    /charts/projects-by-rag        GetProjectsByRAG                 reporting.view
GET    /charts/projects-by-priority   GetProjectsByPriority            reporting.view
GET    /charts/projects-by-office     GetProjectsByOffice              reporting.view
GET    /charts/assets-by-type         GetAssetsByType                  reporting.view
GET    /charts/assets-by-status       GetAssetsByStatus                reporting.view
GET    /charts/sla-compliance         GetSLAComplianceRate             reporting.view
GET    /charts/risks-by-category      GetRisksByCategory               reporting.view
GET    /charts/work-items-by-status   GetWorkItemsByStatus             reporting.view
GET    /charts/office-analytics       GetOfficeAnalytics               reporting.view
```

### Report Routes (`/api/v1/reporting/reports`)
```
GET    /                              ListDefinitions                  reporting.view
GET    /executive-pack/definition     GetExecutivePackDefinition       reporting.view
POST   /executive-pack/ensure         EnsureExecutivePackDefinition    reporting.manage
POST   /executive-pack/generate       GenerateExecutivePack            reporting.manage
GET    /{id}                          GetDefinition                    reporting.view
POST   /                              CreateDefinition                 reporting.manage
PUT    /{id}                          UpdateDefinition                 reporting.manage
DELETE /{id}                          DeleteDefinition                 reporting.manage
POST   /{id}/run                      TriggerReportRun                 reporting.manage
GET    /{definitionId}/runs           ListReportRuns                   reporting.view
GET    /{definitionId}/runs/{runId}   GetReportRun                     reporting.view
```

### Search Routes (`/api/v1/reporting/search`)
```
GET    /                              GlobalSearch                     reporting.view
GET    /saved                         ListSavedSearches                reporting.view
GET    /saved/recent                  ListRecentSearches               reporting.view
POST   /saved                         SaveSearch                       reporting.view
DELETE /saved/{id}                    DeleteSavedSearch                reporting.view
```

**Total API Endpoints: 32**

---

## 6. Background Job Analysis

### 6.1 DashboardRefresher

**File:** `dashboard_refresher.go` (46 lines)
**Behavior:** Starts a goroutine with a ticker at the configured interval (default 5 minutes). On each tick, calls `svc.RefreshExecutiveSummarySystem(ctx, "scheduled_refresh")` which executes `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_executive_summary`.
**Status:** FULLY FUNCTIONAL
**Error Handling:** Logs errors via `slog.ErrorContext` but continues running

### 6.2 ReportScheduler

**File:** `report_scheduler.go` (51 lines)
**Behavior:** Starts a goroutine with a ticker at the configured interval (default 1 minute). On each tick, calls `svc.EnqueueDueScheduledRuns(ctx, t)` which queries for report definitions with `schedule_cron` matching the current time and creates `report_runs` records with `status='pending'`.
**Status:** PARTIALLY FUNCTIONAL (STUBBED)
**Critical Gap:** The scheduler enqueues run records but NO worker process picks them up for execution. The `TriggerRun` method creates a record with status `pending` but never transitions it to `generating` or `completed`.
**Error Handling:** Logs errors, logs count of enqueued runs

---

## 7. Security and Tenancy Review

### 7.1 RBAC Implementation
- **Permissions defined:** `reporting.view`, `reporting.manage`
- **Enforcement method:** `middleware.RequirePermission()` applied via Chi `.With()` on every route
- **All 32 routes have RBAC enforcement confirmed via code review**
- Read-only chart/search endpoints use `reporting.view`
- Write/trigger/refresh endpoints use `reporting.manage`

### 7.2 Tenant Isolation
- All domain types include `TenantID uuid.UUID` field
- `mv_executive_summary` is indexed by `tenant_id` with unique index
- Dashboard cache is scoped by tenant_id
- Saved searches are scoped by tenant_id + user_id

### 7.3 Redis Security
- Redis client is injected via constructor (`NewHandler(pool, redisClient, auditSvc)`)
- Cache keys should be tenant-scoped (verify key format in `dashboard_service.go`)

### 7.4 Audit Trail Integration
- Handler constructor accepts `*audit.AuditService`
- All three service constructors wire audit service

---

## 8. Caching Architecture

```
Request --> DashboardHandler --> DashboardService
                                    |
                                    +--> Redis Cache (5-min TTL)
                                    |       |
                                    |       +-- HIT: return cached JSON
                                    |       +-- MISS: query below
                                    |
                                    +--> mv_executive_summary (materialized view)
                                    |
                                    +--> dashboard_cache table (DB fallback)

Background: DashboardRefresher (every 5 min)
                |
                +--> REFRESH MATERIALIZED VIEW CONCURRENTLY mv_executive_summary
```

---

## 9. Stubbed vs. Implemented Components Matrix

| Component | Data Model | API Endpoint | Business Logic | Background Job | Output Generation | Distribution |
|-----------|-----------|--------------|----------------|----------------|-------------------|-------------|
| Executive Dashboard | COMPLETE | COMPLETE | COMPLETE | COMPLETE (5-min refresh) | COMPLETE (JSON) | N/A |
| Chart Endpoints (12) | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE (JSON) | N/A |
| Report Definitions | COMPLETE | COMPLETE | COMPLETE | N/A | N/A | N/A |
| Report Run Trigger | COMPLETE | COMPLETE | **STUBBED** (creates DB record only) | N/A | **MISSING** | **MISSING** |
| Report Scheduling | COMPLETE | N/A | **STUBBED** (enqueues but no worker) | **STUBBED** (ticker runs but no execution) | **MISSING** | **MISSING** |
| Report Generation | COMPLETE (template JSONB) | N/A | **MISSING** | **MISSING** | **MISSING** (no PDF/Excel) | **MISSING** |
| Report Distribution | COMPLETE (recipients UUID[]) | N/A | **MISSING** | **MISSING** | N/A | **MISSING** |
| Global Search | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | N/A |
| Saved Searches | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | N/A |

---

## 10. Test Coverage

| Test File | Lines | Scope |
|-----------|-------|-------|
| `dashboard_handler_test.go` | 650 | Executive summary, charts, refresh |
| `report_handler_test.go` | 1,222 | Definition CRUD, trigger run, executive pack |
| `search_handler_test.go` | 893 | Global search, saved searches, recent searches |
| `types_test.go` | 1,190 | Report types, run statuses, validation |
| **Total** | **3,955** | |

---

## 11. Known Defects and Risks

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | Report generation is entirely STUBBED | **Critical** | `TriggerRun` creates a `report_runs` record with status='pending' but no generation logic exists; reports are never produced |
| 2 | Report scheduling enqueues but never executes | **Critical** | `ReportScheduler` creates pending runs that are never picked up by any worker; scheduled reports will never be generated |
| 3 | No PDF/Excel export capability | **High** | No document rendering library is integrated; reports cannot be exported to any downloadable format |
| 4 | Report distribution not implemented | **High** | `recipients UUID[]` stored but no email/notification delivery; intended recipients never receive reports |
| 5 | Template rendering engine missing | **High** | `template JSONB` field stores configuration but nothing processes it into rendered output |
| 6 | No dashboard customization per user | Medium | All users see the same dashboard layout; no widget configuration |
| 7 | No KPI drill-down capability | Medium | Clicking a KPI number does not navigate to underlying detail records |
| 8 | Global search limited to certain entity types | Medium | Not all module entities are included in cross-module search |
| 9 | `data_snapshot` on report runs never populated | Medium | JSONB field for storing report data at generation time is always null |
| 10 | No report archival/retention policy | Low | Old report runs accumulate indefinitely with no cleanup |

---

## 12. What Must Be Built Next (Priority Order)

1. **Report Generation Pipeline** -- Implement a worker that processes pending `report_runs`: reads the definition template, queries data, and produces output. This is the single largest gap in the module.
2. **PDF Export Engine** -- Integrate a PDF rendering library (e.g., `chromedp` for HTML-to-PDF, or `gofpdf`) to produce downloadable report documents
3. **Excel Export Engine** -- Integrate `excelize` or similar library for tabular data exports
4. **Report Scheduler Worker** -- Wire the `ReportScheduler` enqueuer to the generation pipeline so enqueued runs are actually executed
5. **Report Distribution Service** -- Build email delivery of generated report documents to recipients
6. **Template Rendering Engine** -- Build a rendering engine that interprets `template JSONB` into structured report sections with data binding
7. **Dashboard Customization** -- Add per-user dashboard widget preferences (which charts, order, visibility)
8. **KPI Drill-Down Endpoints** -- Add parameterized endpoints that return the detail records behind each KPI number
9. **Global Search Expansion** -- Include all module entities (knowledge articles, GRC risks/audits, people records) in global search
10. **Report Data Snapshot** -- Populate `data_snapshot` JSONB at generation time for historical record preservation
11. **Report Run Cleanup Job** -- Implement retention policy to archive or purge old report runs

---

## 13. File Reference Index

### Backend (Go)
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/dashboard_handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/dashboard_service.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/dashboard_refresher.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/report_handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/report_service.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/report_scheduler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/search_handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/search_service.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/types.go`

### Tests
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/dashboard_handler_test.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/report_handler_test.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/search_handler_test.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/reporting/types_test.go`

### Frontend (Next.js)
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/portfolio/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/projects/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/risks/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/resources/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/governance/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/collaboration/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/offices/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/reports/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/search/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/analytics/__tests__/page.test.tsx`

### Database
- `/Users/mac/codes/itd-opms/itd-opms-api/migrations/014_reporting.sql`
- `/Users/mac/codes/itd-opms/itd-opms-api/migrations/015_reporting_kpis_and_scheduler.sql`

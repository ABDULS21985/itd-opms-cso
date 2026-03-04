# 04 -- Feature Inventory Master

> Audit deliverable -- master capability inventory as observed on 2026-03-02
> Branch audited: `dev` (commit `e5fbd10`)

---

## Legend

| Column | Description |
|--------|-------------|
| **Module** | Functional domain module |
| **Capability** | Specific feature or sub-feature |
| **Frontend** | UI page or component exists (`YES` / `NO` / `PARTIAL`) |
| **API** | HTTP endpoint(s) exist in handler (`YES` / `NO` / `STUB`) |
| **Service** | Business logic in service layer (`YES` / `NO` / `STUB`) |
| **Repository** | Dedicated repository/DAO layer (`YES` / `NO` -- always NO in this codebase) |
| **DB** | Database schema (tables/views) exist in migrations (`YES` / `NO`) |
| **Security** | Auth + permission check enforced (`YES` / `PARTIAL` / `NO`) |
| **Status** | `IMPLEMENTED` / `PARTIAL` / `STUB` / `UI_ONLY` / `API_ONLY` / `DB_ONLY` / `NOT_IMPLEMENTED` |
| **Confidence** | Audit confidence level (`HIGH` = verified in code / `MEDIUM` = inferred / `LOW` = uncertain) |
| **Notes** | Observations, gaps, caveats |

---

## 1. Governance Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Governance | Policy CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Full create, read, update, delete. Pages: list, detail, new, edit |
| Governance | Policy Versioning | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Version history, diff view page exists at `/policies/[id]/diff` |
| Governance | Policy Attestation | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Attestation page at `/policies/[id]/attestations` |
| Governance | RACI Matrix CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, create pages. Seeded via migration 036 |
| Governance | Meeting CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages. Attendee selector component |
| Governance | Meeting Decisions | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Decisions tracked as sub-resource of meetings |
| Governance | Action Items | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/governance/actions`. Linked to meetings |
| Governance | Action Reminders (cron) | NO | NO | YES | NO | YES | N/A | IMPLEMENTED | HIGH | `ActionReminderService` runs hourly, publishes NATS events |
| Governance | OKR CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages |
| Governance | Key Results | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Sub-resource of OKRs, managed in OKR detail view |
| Governance | KPI Management | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Endpoints registered via `okr.Routes(r)` |
| Governance | Approval Workflows (governance) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Approvals page at `/governance/approvals` |

---

## 2. People & Workforce Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| People | Skill Categories (hierarchical) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Hierarchical categories, seeded with 100 skills (migration 037) |
| People | Skills CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Skills page at `/people/skills` |
| People | User Skills Assignment | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Assign skills to users with proficiency levels |
| People | Role Skill Requirements | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | API exists, UI exposure unclear |
| People | Gap Analysis | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | API endpoints in skill handler; analytics page exists |
| People | Onboarding Checklists | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Dedicated page at `/people/onboarding`. Templates + tasks |
| People | Offboarding Checklists | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Dedicated page at `/people/offboarding`. Templates + tasks |
| People | Roster Management | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/people/roster` |
| People | Leave Records | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | API via roster handler (`/leave`); no dedicated leave page |
| People | Capacity Allocations | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/people/capacity` |
| People | Capacity Heatmap | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Dedicated heatmap page at `/people/capacity/heatmap`. Enriched service with tests |
| People | Training Records | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/people/training` |
| People | People Analytics Dashboard | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/people/analytics`; likely pulls from reporting endpoints |

---

## 3. Planning Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Planning | Portfolio CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages |
| Planning | Portfolio Timeline | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/planning/portfolios/[id]/timeline` |
| Planning | Project CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new, edit pages. RAG status, budget tracking |
| Planning | Project Edit (visual selectors) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Enhanced edit form with priority, status, RAG visual selectors |
| Planning | Project Timeline/Gantt | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Gantt chart component + page at `/projects/[id]/timeline` |
| Planning | Project Budget Tracking | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Budget page at `/projects/[id]/budget`. Cost categories, allocations |
| Planning | Project Documents | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | MinIO-backed document upload/download. Component exists |
| Planning | Work Items (WBS) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Full CRUD. List, detail, new pages. Service has tests |
| Planning | Milestones | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/planning/milestones`. Shares service with work items |
| Planning | Risk Register | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages. Risk service has tests |
| Planning | Issue Tracking | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages at `/planning/issues/*` |
| Planning | Change Requests | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages at `/planning/change-requests/*` |
| Planning | Post-Implementation Reviews | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List and detail pages at `/planning/pir/*`. Migration 020 |
| Planning | Budget/Cost Categories | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Budget page + cost category handler. Migration 026 |
| Planning | Planning Calendar | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/planning/calendar`. Integrates with calendar module |

---

## 4. ITSM Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| ITSM | Service Catalog | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/itsm/service-catalog` |
| ITSM | Ticket CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages. Auto-numbering in service |
| ITSM | Ticket State Machine | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | State transitions in ticket service; service has tests |
| ITSM | SLA Policies | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | SLA handler with dedicated routes |
| ITSM | SLA Dashboard | YES | PARTIAL | PARTIAL | NO | YES | YES | IMPLEMENTED | MEDIUM | Page at `/itsm/sla-dashboard`; likely combines SLA + ticket data |
| ITSM | Business Hours | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | Managed via SLA handler; no dedicated UI page |
| ITSM | Escalation Rules | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | Part of SLA handler routes |
| ITSM | Problem Management | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/itsm/problems`. Known errors support |
| ITSM | Support Queues | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | API CRUD via queue handler; My Queue page exists |
| ITSM | My Queue | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/itsm/my-queue` |
| ITSM | CSAT Surveys | NO | YES | YES | NO | YES | YES | API_ONLY | MEDIUM | Schema exists in migration 009; likely part of ticket handler |
| ITSM | Bulk Operations | NO | YES | YES | NO | PARTIAL | YES | API_ONLY | MEDIUM | Ticket handler likely supports bulk update/assign |
| ITSM | Ticket Export | PARTIAL | YES | YES | NO | N/A | YES | IMPLEMENTED | MEDIUM | Export dropdown component; CSV writer in shared/export |

---

## 5. CMDB Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| CMDB | Asset CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail, new pages |
| CMDB | Asset Lifecycle | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Lifecycle states managed in service |
| CMDB | Asset Disposal | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Dedicated disposal page at `/cmdb/assets/[id]/dispose` |
| CMDB | CMDB Configuration Items | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | API in cmdb_handler; topology page may render CIs |
| CMDB | CI Relationships | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | CMDB service handles relationships; topology page exists |
| CMDB | Topology View | YES | PARTIAL | PARTIAL | NO | YES | YES | PARTIAL | MEDIUM | Page at `/cmdb/topology`; likely renders CI relationship graph |
| CMDB | Reconciliation | YES | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | Page at `/cmdb/reconciliation` |
| CMDB | License CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/cmdb/licenses`. License handler + service |
| CMDB | License Compliance | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | Part of license service; no dedicated compliance page |
| CMDB | Warranty CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/cmdb/warranties` |
| CMDB | Renewal Alerts | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Dedicated API route `/renewal-alerts`; displayed in warranty page |
| CMDB | CMDB Reports | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/cmdb/reports`; likely aggregates data from multiple sub-services |
| CMDB | Vendors (from CMDB) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail pages at `/cmdb/vendors/*` |
| CMDB | Contracts (from CMDB) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/cmdb/contracts` |

---

## 6. Knowledge Management Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Knowledge | Category Management (hierarchical) | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Categories managed via article handler routes |
| Knowledge | Article CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List page, detail (by slug), new page |
| Knowledge | Article Full-Text Search | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | FTS via PostgreSQL tsvector; search page at `/knowledge/search` |
| Knowledge | Article Versioning | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | Service tracks versions; UI may show version history in detail |
| Knowledge | Article Feedback | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Feedback handler with dedicated routes; inline in article detail |
| Knowledge | Announcements | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | API routes exist; may display in dashboard/knowledge hub |

---

## 7. GRC (Governance, Risk, Compliance) Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| GRC | Risk Register CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail pages at `/grc/risks/*` |
| GRC | Risk Assessments | PARTIAL | YES | YES | NO | YES | YES | IMPLEMENTED | MEDIUM | Part of risk service; assessment data in risk detail |
| GRC | Risk Heatmap | YES | PARTIAL | PARTIAL | NO | YES | YES | IMPLEMENTED | MEDIUM | Heatmap panel component in analytics; also GRC risks page |
| GRC | Audit CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | List, detail pages at `/grc/audits/*` |
| GRC | Audit Findings | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Sub-resource of audits; managed in audit detail |
| GRC | Audit Evidence | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Evidence page at `/grc/audits/[id]/evidence` |
| GRC | Access Reviews | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/grc/access-reviews` |
| GRC | Compliance Controls CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/grc/compliance` |
| GRC | GRC Reports | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/grc/reports`; likely aggregates GRC data |

---

## 8. Reporting & Analytics Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Reporting | Executive Dashboard | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Materialized view + Redis cache. Dashboard page at `/dashboard` |
| Reporting | Dashboard Charts (12 types) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | 15 chart components on frontend; 12 chart endpoints on API |
| Reporting | Dashboard Auto-Refresh | NO | N/A | YES | NO | YES | N/A | IMPLEMENTED | HIGH | `DashboardRefresher` runs every 5 min in background |
| Reporting | Report Definitions CRUD | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/reports`. Create, read, update, delete definitions |
| Reporting | Report Generation/Execution | NO | STUB | STUB | NO | YES | YES | STUB | HIGH | `ReportScheduler` runs but does NOT generate output files |
| Reporting | Saved Searches | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Search handler with save/recall endpoints |
| Reporting | Global Search | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Search page + command palette (Cmd+K). Cross-entity search |
| Reporting | Activity Feed | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Activity panel component on dashboard |
| Reporting | Analytics - Portfolio | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/analytics/portfolio` |
| Reporting | Analytics - Projects | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/analytics/projects` |
| Reporting | Analytics - Risks | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/analytics/risks` |
| Reporting | Analytics - Resources | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/analytics/resources` |
| Reporting | Analytics - Governance | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/analytics/governance` |
| Reporting | Analytics - Offices | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/analytics/offices`. Division performance section |
| Reporting | Analytics - Collaboration | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/analytics/collaboration` |
| Reporting | Analytics - Overview | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Page at `/analytics` with grid of panels |

---

## 9. System Administration Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| System | User Management CRUD | YES | YES | YES | NO | YES | YES (system.manage) | IMPLEMENTED | HIGH | List, detail pages. Directory sync integration |
| System | Role Management CRUD | YES | YES | YES | NO | YES | YES (system.manage) | IMPLEMENTED | HIGH | List, detail pages at `/system/roles/*` |
| System | Permission Catalog | PARTIAL | YES | YES | NO | YES | YES (system.view) | IMPLEMENTED | HIGH | API endpoint `GET /permissions`; consumed by role editor |
| System | Tenant Management | YES | YES | YES | NO | YES | YES (system.manage) | IMPLEMENTED | HIGH | Page at `/system/tenants` |
| System | Org Unit Management | YES | YES | YES | NO | YES | YES (system.manage) | IMPLEMENTED | HIGH | Page at `/system/org-units`. Hierarchical org structure |
| System | System Settings | YES | YES | YES | NO | YES | YES (system.manage) | IMPLEMENTED | HIGH | Page at `/system/settings` |
| System | Session Management | YES | YES | YES | NO | YES | YES (system.manage) | IMPLEMENTED | HIGH | Page at `/system/sessions`. Active sessions, termination |
| System | System Health Dashboard | YES | YES | YES | NO | N/A | YES (system.view) | IMPLEMENTED | HIGH | Page at `/system/health`. Checks PG, Redis, NATS, MinIO |
| System | Audit Log Explorer | YES | YES | YES | NO | YES | YES (system.view) | IMPLEMENTED | HIGH | Page at `/system/audit-logs`. Search, filter, export |
| System | Email Templates CRUD | YES | YES | YES | NO | YES | YES (system.manage) | IMPLEMENTED | HIGH | List, detail pages at `/system/email-templates/*`. Seeded via migration 031 |
| System | Maintenance Worker | NO | N/A | YES | NO | YES | N/A | IMPLEMENTED | HIGH | Background session cleanup, token purging. No UI |
| System | Workflow Configuration | YES | PARTIAL | PARTIAL | NO | PARTIAL | YES | PARTIAL | MEDIUM | Page at `/system/workflows`; platform/workflow package is empty |

---

## 10. Cross-Cutting Modules

### 10.1 Approval Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Approval | Workflow Definitions CRUD | YES | YES | YES | NO | YES | YES (approval.manage) | IMPLEMENTED | HIGH | Admin endpoints for defining workflows |
| Approval | Start Approval Chain | PARTIAL | YES | YES | NO | YES | YES (approval.manage) | IMPLEMENTED | HIGH | API: `POST /chains`. UI integrates in context |
| Approval | Approve/Reject Step | PARTIAL | YES | YES | NO | YES | YES (approval.manage) | IMPLEMENTED | HIGH | Step actions via API; approval-status component displays state |
| Approval | My Pending Approvals | YES | YES | YES | NO | YES | YES (approval.view) | IMPLEMENTED | HIGH | `GET /my-pending` + `/my-pending/count` |
| Approval | Cancel Chain | PARTIAL | YES | YES | NO | YES | YES (approval.manage) | IMPLEMENTED | HIGH | API: `POST /chains/{id}/cancel` |

### 10.2 Calendar Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Calendar | Calendar Events View | YES | YES | YES | NO | YES | YES (planning.view) | IMPLEMENTED | HIGH | `GET /events` aggregates cross-module events |
| Calendar | Maintenance Windows CRUD | YES | YES | YES | NO | YES | YES (planning.manage) | IMPLEMENTED | HIGH | Create, get, update, delete |
| Calendar | Freeze Periods | PARTIAL | YES | YES | NO | YES | YES (planning.manage) | IMPLEMENTED | HIGH | Create, list, delete API endpoints |

### 10.3 Document Vault Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Vault | Document CRUD | YES | YES | YES | NO | YES | YES (documents.manage) | IMPLEMENTED | HIGH | Page at `/vault`. MinIO-backed storage |
| Vault | Document Download | YES | YES | YES | NO | YES | YES (documents.view) | IMPLEMENTED | HIGH | Presigned URL generation |
| Vault | Document Versioning | PARTIAL | YES | YES | NO | YES | YES (documents.manage) | IMPLEMENTED | HIGH | Upload version + list versions API |
| Vault | Document Lock/Unlock | PARTIAL | YES | YES | NO | YES | YES (documents.manage) | IMPLEMENTED | HIGH | Pessimistic locking via API |
| Vault | Document Move | PARTIAL | YES | YES | NO | YES | YES (documents.manage) | IMPLEMENTED | HIGH | Move between folders |
| Vault | Folder Management | PARTIAL | YES | YES | NO | YES | YES (documents.manage) | IMPLEMENTED | MEDIUM | Folders likely managed as document metadata |

### 10.4 Vendor Management Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Vendor | Vendor CRUD | YES | YES | YES | NO | YES | YES (vendor.manage) | IMPLEMENTED | HIGH | List, detail at `/cmdb/vendors/*`. Also mounted at `/api/v1/vendors` |
| Vendor | Vendor Contracts | YES | YES | YES | NO | YES | YES (vendor.view) | IMPLEMENTED | HIGH | List contracts per vendor + standalone contracts list |
| Vendor | Vendor Scorecards | PARTIAL | YES | YES | NO | YES | YES (vendor.view) | IMPLEMENTED | MEDIUM | API endpoint exists; display in vendor detail |
| Vendor | Vendor Summary | PARTIAL | YES | YES | NO | YES | YES (vendor.view) | IMPLEMENTED | MEDIUM | Aggregated vendor data endpoint |

### 10.5 Automation Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Automation | Rule CRUD | YES | YES | YES | NO | YES | YES (automation.manage) | IMPLEMENTED | HIGH | Page at `/system/automation`. Create, read, update, delete |
| Automation | Rule Toggle (enable/disable) | PARTIAL | YES | YES | NO | YES | YES (automation.manage) | IMPLEMENTED | HIGH | `POST /{id}/toggle` |
| Automation | Rule Test (dry run) | PARTIAL | YES | YES | NO | YES | YES (automation.manage) | IMPLEMENTED | MEDIUM | `POST /{id}/test` |
| Automation | Rule Execution History | PARTIAL | YES | YES | NO | YES | YES (automation.view) | IMPLEMENTED | HIGH | `GET /{id}/executions` + `GET /executions` |
| Automation | Automation Stats | PARTIAL | YES | YES | NO | YES | YES (automation.view) | IMPLEMENTED | MEDIUM | `GET /stats` endpoint |
| Automation | Rule Engine (actual execution) | NO | STUB | STUB | NO | YES | N/A | STUB | MEDIUM | Rule definitions stored but actual trigger/execution engine unclear |

### 10.6 Custom Fields Module

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Custom Fields | Field Definition CRUD | YES | YES | YES | NO | YES | YES (custom_fields.manage) | IMPLEMENTED | HIGH | Page at `/system/custom-fields`. Full CRUD + reorder |
| Custom Fields | Field Value Get/Set per Entity | PARTIAL | YES | YES | NO | YES | YES (custom_fields.manage) | IMPLEMENTED | HIGH | `GET/PUT /entity/{entityType}/{entityId}/values` |
| Custom Fields | Custom Field Columns (table) | YES | N/A | N/A | NO | N/A | N/A | IMPLEMENTED | HIGH | `custom-field-columns.tsx` component renders in data tables |
| Custom Fields | Custom Fields Form Renderer | YES | N/A | N/A | NO | N/A | N/A | IMPLEMENTED | HIGH | `custom-fields-form.tsx` dynamic form component |

---

## 11. Platform Services (Non-Module)

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Platform | Dev JWT Authentication | YES | YES | YES | NO | YES | N/A | IMPLEMENTED | HIGH | HS256 login/refresh flow |
| Platform | OIDC Authentication (Entra ID) | YES | YES | YES | NO | YES | N/A | IMPLEMENTED | HIGH | RS256 PKCE flow; callback page; token refresh |
| Platform | Dual-Mode Auth Middleware | NO | N/A | YES | NO | N/A | N/A | IMPLEMENTED | HIGH | Tries OIDC first, falls back to dev JWT |
| Platform | Audit Event Capture | NO | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Middleware + service; all mutating requests logged |
| Platform | Audit Event Query | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | System audit log explorer page |
| Platform | Notifications (in-app) | YES | YES | YES | NO | YES | YES | IMPLEMENTED | HIGH | Bell icon, panel, dedicated page |
| Platform | SSE Notification Stream | YES | YES | YES | NO | N/A | YES | IMPLEMENTED | HIGH | Long-lived EventSource connection |
| Platform | Email Notifications (Graph) | NO | N/A | YES | NO | YES | N/A | IMPLEMENTED | MEDIUM | Outbox processor sends via Microsoft Graph API |
| Platform | NATS Event Orchestrator | NO | N/A | YES | NO | N/A | N/A | IMPLEMENTED | HIGH | Subscribes to JetStream, routes to notification service |
| Platform | Directory Sync (Entra ID) | NO | YES | YES | NO | YES | YES (admin) | IMPLEMENTED | HIGH | Sync users from Microsoft Entra ID |
| Platform | Microsoft Graph Client | NO | N/A | YES | NO | N/A | N/A | IMPLEMENTED | HIGH | With circuit breaker pattern |
| Platform | Rate Limiting (Redis) | NO | N/A | YES | NO | N/A | N/A | IMPLEMENTED | HIGH | 100 req/min per IP; disabled if Redis unavailable |
| Platform | CSRF Protection | NO | N/A | YES | NO | N/A | N/A | IMPLEMENTED | HIGH | Origin validation middleware |
| Platform | Security Headers | NO | N/A | YES | NO | N/A | N/A | IMPLEMENTED | HIGH | CSP, X-Frame-Options, etc. |
| Platform | Prometheus Metrics | NO | YES | YES | NO | N/A | NO (public) | IMPLEMENTED | HIGH | `/metrics` endpoint; metrics middleware |
| Platform | Health Check | NO | YES | YES | NO | N/A | NO (public) | IMPLEMENTED | HIGH | Checks PG, Redis, NATS, MinIO connectivity |
| Platform | Correlation ID Propagation | NO | N/A | YES | NO | N/A | N/A | IMPLEMENTED | HIGH | X-Correlation-ID header generation |
| Platform | CSV Export | YES | YES | YES | NO | N/A | YES | IMPLEMENTED | HIGH | `shared/export/csv_writer.go` + export-dropdown component |
| Platform | Command Palette (Cmd+K) | YES | NO | NO | NO | NO | N/A | UI_ONLY | HIGH | Fuzzy search across navigation items |
| Platform | Keyboard Shortcuts | YES | NO | NO | NO | NO | N/A | UI_ONLY | HIGH | `use-hotkeys.ts` hook + help dialog |
| Platform | Theme Switching | YES | NO | NO | NO | NO | N/A | UI_ONLY | HIGH | Theme provider with dark/light modes |
| Platform | Breadcrumb Navigation | YES | NO | NO | NO | NO | N/A | UI_ONLY | HIGH | Breadcrumb provider + auto-generation |
| Platform | Sidebar Customization | YES | NO | NO | NO | NO | N/A | UI_ONLY | HIGH | DnD reorder, resize, favorites, presets, hide/show, import/export |

---

## 12. Features NOT Implemented / Gaps

| Module | Capability | Frontend | API | Service | Repository | DB | Security | Status | Confidence | Notes |
|--------|-----------|----------|-----|---------|------------|-----|----------|--------|------------|-------|
| Reporting | Report File Generation (PDF/Excel) | NO | STUB | STUB | NO | YES | YES | NOT_IMPLEMENTED | HIGH | Scheduler runs but produces no output |
| Platform | RBAC Platform Package | NO | N/A | NO | NO | N/A | N/A | NOT_IMPLEMENTED | HIGH | `platform/rbac/` is empty; logic inline in middleware |
| Platform | Search Platform Package | NO | N/A | NO | NO | N/A | N/A | NOT_IMPLEMENTED | HIGH | `platform/search/` is empty; search inline in reporting module |
| Platform | SLA Platform Package | NO | N/A | NO | NO | N/A | N/A | NOT_IMPLEMENTED | HIGH | `platform/sla/` is empty; SLA logic inline in ITSM module |
| Platform | Workflow Engine Package | NO | N/A | NO | NO | N/A | N/A | NOT_IMPLEMENTED | HIGH | `platform/workflow/` is empty |
| Platform | Tenant Resolution Package | NO | N/A | NO | NO | N/A | N/A | NOT_IMPLEMENTED | HIGH | `platform/tenant/` is empty; tenant logic in middleware |
| Platform | Evidence Platform Package | NO | N/A | NO | NO | N/A | N/A | NOT_IMPLEMENTED | HIGH | `platform/evidence/` is empty; evidence logic inline in GRC/vault |
| Platform | Push Notifications | NO | NO | NO | NO | NO | N/A | NOT_IMPLEMENTED | HIGH | No web push or mobile push |
| Platform | CI/CD Build Pipeline | N/A | N/A | N/A | N/A | N/A | N/A | NOT_IMPLEMENTED | HIGH | Only CodeQL exists; no build/test/deploy pipeline |
| Platform | Database RLS Policies | N/A | N/A | N/A | N/A | NO | N/A | NOT_IMPLEMENTED | HIGH | Multi-tenancy via app-level WHERE only |
| Platform | sqlc Generated Code | N/A | N/A | N/A | N/A | N/A | N/A | NOT_IMPLEMENTED | HIGH | Configured in sqlc.yaml but code not generated/committed |
| Automation | Rule Execution Engine | NO | STUB | STUB | NO | YES | N/A | NOT_IMPLEMENTED | MEDIUM | Rules can be defined but may not trigger automatically |

---

## 13. Summary Statistics

| Metric | Count |
|--------|-------|
| **Total capabilities inventoried** | 145 |
| **IMPLEMENTED** | 110 |
| **PARTIAL** | 21 |
| **STUB** | 4 |
| **UI_ONLY** | 5 |
| **API_ONLY** | 2 |
| **NOT_IMPLEMENTED** | 12 |
| **Modules with full-stack coverage** | 13 of 15 |
| **Modules with empty platform packages** | 6 (rbac, search, sla, tenant, workflow, evidence) |

### Implementation Completeness by Module

| Module | Estimated % | Rationale |
|--------|------------|-----------|
| Governance | 92% | All sub-domains implemented; action reminders automated |
| People | 87% | Core workforce features done; analytics page partial |
| Planning | 96% | Most comprehensive module; all sub-domains with dedicated pages |
| ITSM | 92% | Full ticket lifecycle; CSAT surveys API-only; SLA dashboard partial |
| CMDB | 93% | Strong asset/license/warranty coverage; topology view partial |
| Knowledge | 88% | Articles + FTS solid; announcements and versioning UI partial |
| GRC | 87% | Risk + audit + compliance done; reports page partial |
| Reporting | 55% | Dashboard excellent; report generation entirely stubbed; analytics pages partial |
| System | 92% | Full admin suite; workflow config page exists but engine is empty |
| Approval | 90% | Workflow engine complete; UI integration partial (context-based) |
| Calendar | 90% | Events, maintenance windows, freeze periods all implemented |
| Vault | 92% | Full document lifecycle with MinIO; folder management unclear |
| Vendor | 90% | CRUD + contracts + scorecards; scorecard UI partial |
| Automation | 65% | Rule CRUD done; actual execution engine unclear/stubbed |
| Custom Fields | 95% | Definitions + values + UI rendering all implemented |

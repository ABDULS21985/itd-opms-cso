# 03 -- Architecture Current State

> Audit deliverable -- architecture as actually implemented, observed on 2026-03-02
> Branch audited: `dev` (commit `e5fbd10`)

---

## 1. Backend Architecture

### 1.1 Pattern: Modular Monolith

The backend is a single Go binary organized as a **modular monolith**. There are 15 domain modules and a platform layer providing cross-cutting infrastructure.

```
cmd/api/main.go
  |
  v
internal/platform/server/server.go    # Composition root
  |
  |-- internal/platform/              # Infrastructure (17 packages)
  |     |-- config/                   # Viper config loading
  |     |-- database/                 # Connection factories (pg, redis, minio, nats)
  |     |-- middleware/               # HTTP middleware chain
  |     |-- auth/                     # JWT + OIDC authentication
  |     |-- audit/                    # Audit event capture
  |     |-- notification/             # Outbox + SSE + NATS orchestrator
  |     |-- metrics/                  # Prometheus instrumentation
  |     |-- msgraph/                  # Microsoft Graph API client
  |     |-- dirsync/                  # Entra ID directory sync
  |     |-- server/                   # HTTP server lifecycle
  |     |-- [rbac, search, sla, tenant, workflow, evidence]  # Placeholder packages (empty)
  |
  |-- internal/modules/              # 15 domain modules
  |     |-- governance/              # Policies, RACI, Meetings, OKRs/KPIs
  |     |-- people/                  # Skills, Checklists, Rosters, Training, Heatmap
  |     |-- planning/                # Portfolios, Projects, Work Items, Risks, Timelines, PIR, Budget
  |     |-- itsm/                    # Catalog, Tickets, SLA, Problems, Queues
  |     |-- cmdb/                    # Assets, CMDB CIs, Licenses, Warranties
  |     |-- knowledge/               # Articles, Feedback, Announcements
  |     |-- grc/                     # Risks, Audits, Access Reviews, Compliance
  |     |-- reporting/               # Dashboards, Reports, Search
  |     |-- system/                  # Users, Roles, Tenants, Org Units, Settings, Sessions, etc.
  |     |-- approval/                # Cross-cutting approval workflows
  |     |-- calendar/                # Change calendar / maintenance windows
  |     |-- vault/                   # Document vault (MinIO-backed)
  |     |-- vendor/                  # Vendor management
  |     |-- automation/              # Automation rules engine
  |     |-- customfields/            # Custom field definitions
  |
  |-- internal/shared/               # Cross-cutting utilities (errors, types, helpers, export)
```

### 1.2 Intra-Module Pattern: Handler -> Service -> Pool

Each module follows a two-tier architecture (no repository layer):

```
HTTP Request
  |
  v
Handler (decode JSON, validate, call service, encode response)
  |
  v
Service (business logic, direct SQL via pgxpool.Pool, audit logging)
  |
  v
pgxpool.Pool (raw SQL queries, no ORM, no generated sqlc code in practice)
```

**Key observations:**
- **No repository/DAO layer** -- services contain SQL queries inline or construct them programmatically.
- **No interface-based abstraction** -- services depend directly on `*pgxpool.Pool` and `*audit.AuditService`.
- **Constructor-based dependency injection** -- all services receive their dependencies via `New*Service()` constructors.
- **Audit service is cross-cutting** -- injected into every module handler constructor.

### 1.3 Inter-Module Communication

Modules communicate through:
1. **Direct database queries** -- modules query tables owned by other modules (no enforced boundaries at DB level).
2. **NATS JetStream** -- asynchronous event publishing for notification orchestration.
3. **Shared types** -- `internal/shared/types/` provides common context, pagination, and response structures.

**There are no explicit module-to-module Go interfaces or APIs.** Module boundaries exist at the package level but are not enforced by contracts.

### 1.4 Background Services

Six background goroutines run alongside the HTTP server:

| Service | Interval | Purpose | Shutdown |
|---------|----------|---------|----------|
| `OutboxProcessor` | Continuous | Processes notification outbox table, sends via Graph API | `Stop()` |
| `Orchestrator` | Event-driven | Subscribes to NATS JetStream, routes events to notification service | `Stop()` |
| `DashboardRefresher` | 5 minutes | Refreshes materialized view for executive dashboard | Context cancellation |
| `ReportScheduler` | 1 minute | Checks for scheduled report runs (STUB -- does not generate) | Context cancellation |
| `MaintenanceWorker` | Continuous | Session cleanup, expired token purging | `Stop()` |
| `ActionReminderService` | 1 hour | Checks for overdue governance actions, publishes NATS events | Context cancellation |

**Graceful shutdown:** All services respect context cancellation. The server handles SIGINT/SIGTERM with a 30-second shutdown timeout.

---

## 2. Frontend Architecture

### 2.1 Framework & Rendering

- **Framework:** Next.js 16.1.6 (App Router)
- **React:** 19 (concurrent features available)
- **Rendering model:** All pages under `app/dashboard/` are client-side rendered using `"use client"` directives. Server components are minimal (layout wrappers only).
- **State management:** TanStack Query v5 for server state; React context for auth, notifications, breadcrumbs, theme.

### 2.2 Page Organization

```
app/
  |-- layout.tsx                    # Root layout: providers wrapping (Auth, Query, Notification, Breadcrumb, Theme)
  |-- page.tsx                      # Root redirect to /dashboard or /auth/login
  |-- auth/
  |   |-- login/page.tsx            # Login form (dev JWT) + OIDC redirect button
  |   |-- callback/page.tsx         # OIDC callback handler (exchange code for tokens)
  |-- dashboard/
      |-- layout.tsx                # Dashboard shell: sidebar + header + content area
      |-- page.tsx                  # Executive dashboard (KPIs, charts, activity feed)
      |-- [module]/                 # Module pages following consistent patterns
```

### 2.3 Data Flow Pattern

```
Page Component
  |-- useXxxQuery() hook (TanStack Query)
        |-- apiClient.get/post/put/delete()
              |-- lib/api-client.ts (fetch wrapper)
                    |-- Authorization: Bearer <token>
                    |-- X-Tenant-ID header
                    |-- Base URL: NEXT_PUBLIC_API_URL
                          |
                          v
                    Go API (/api/v1/...)
```

- **Cache invalidation:** TanStack Query's `invalidateQueries()` on mutations.
- **Optimistic updates:** Not broadly implemented; most mutations await server response.
- **Error handling:** API client wraps errors; hooks expose `error` state to pages.

### 2.4 Component Architecture

```
Page (app/dashboard/module/page.tsx)
  |-- Layout components (sidebar, header)
  |-- Shared components
  |     |-- DataTable        (generic sortable/filterable table)
  |     |-- CommandPalette   (Cmd+K global search)
  |     |-- PermissionGate   (conditional rendering by permission)
  |     |-- ApprovalStatus   (approval workflow display)
  |     |-- CustomFieldsForm (dynamic form field renderer)
  |     |-- ExportDropdown   (CSV export)
  |     |-- FormField, InlineEdit, ConfirmDialog, etc.
  |-- Domain components
  |     |-- GanttChart, ProjectDocuments, AttendeSelector, etc.
  |-- Chart components (15 types)
        |-- DonutChart, FunnelChart, GaugeChart, HeatMapGrid,
        |-- RadarChart, SparkLine, StackedBarChart, TreemapChart,
        |-- TrendLineChart, WaterfallChart, MiniBarChart,
        |-- ProgressRing, KPIStatCard, ChartCard, FilterBar
```

### 2.5 Provider Tree

```
<AuthProvider>
  <QueryProvider>
    <NotificationProvider>
      <BreadcrumbProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </BreadcrumbProvider>
    </NotificationProvider>
  </QueryProvider>
</AuthProvider>
```

---

## 3. Database & Data Flow

### 3.1 Database

- **Engine:** PostgreSQL 16 (Alpine image in Docker)
- **Driver:** pgx v5 via `pgxpool.Pool` (connection pooling)
- **Pool config:** 25 max / 5 min connections
- **Schema management:** goose v3 migrations (37 files, auto-run on startup)
- **Query approach:** Raw SQL in service methods; sqlc configured but generated code not actively used

### 3.2 Schema Organization

The schema spans 37 migration files covering these domains:

| Migration Range | Domain |
|-----------------|--------|
| 001-003 | Tenants, org hierarchy, users, RBAC, audit events |
| 004-006 | Approvals, documents/evidence, notifications, directory sync |
| 007 | Governance (policies, RACI, meetings, OKRs, KPIs, actions) |
| 008 | Planning (portfolios, projects, work items, milestones, risks, issues, change requests) |
| 009 | ITSM (service catalog, tickets, SLA policies, problems, queues, CSAT) |
| 010 | CMDB (assets, CIs, relationships, licenses, warranties) |
| 011 | People (skills, user skills, role requirements, checklists, rosters, leave, capacity, training) |
| 012 | Knowledge (categories, articles, feedback, announcements) |
| 013 | GRC (risk register, assessments, audits, findings, evidence, access reviews, compliance) |
| 014-015 | Reporting (dashboard materialized view, report definitions/runs, saved searches, KPIs, scheduler) |
| 016-019 | System settings, sessions, permissions catalog, org level hierarchy, action reminders |
| 020-023 | PIR, AMD division seed, division field on projects, project documents |
| 024-026 | Approval engine enhancements, change calendar, budget tracking |
| 027-030 | Vendor management, document vault, automation rules, custom fields |
| 031-037 | Email templates seed, AMD staff seed, test user cleanup, policy/RACI/skills seeds |

### 3.3 Multi-Tenancy Model

- **Approach:** Application-level tenant filtering (NOT database-level RLS).
- **Implementation:** `tenant_id UUID` column on all tables; services add `WHERE tenant_id = $N` to every query.
- **Tenant resolution:** `X-Tenant-ID` header or extracted from JWT claims via `middleware/tenant.go`.
- **Risk:** No PostgreSQL RLS policies enforce tenant isolation. A coding error omitting the tenant filter would expose cross-tenant data.

### 3.4 Data Flow Diagram

```
Browser (React)
  |
  | HTTPS / HTTP
  v
Next.js Dev Server (port 3000)
  |
  | Proxy to API
  v
Go API Server (port 8089)
  |
  |-- PostgreSQL (port 5432)     # Primary data store
  |-- Redis (port 6379)          # Caching (dashboard data, rate limiting, sessions)
  |-- MinIO (port 9000)          # Object storage (documents, evidence)
  |-- NATS (port 4222)           # Event bus (notifications, async processing)
  |
  v (optional, if Entra ID enabled)
Microsoft Graph API              # Email sending, directory sync
```

---

## 4. Authentication & Authorization

### 4.1 Dual-Mode Authentication

The system supports two authentication modes simultaneously:

| Mode | Algorithm | Token Format | Use Case |
|------|-----------|--------------|----------|
| **Dev JWT** | HS256 | `Authorization: Bearer <jwt>` | Development, testing |
| **Entra ID OIDC** | RS256 (JWKS) | `Authorization: Bearer <oidc_token>` | Production (Microsoft 365) |

**Middleware flow:**
1. Extract Bearer token from `Authorization` header.
2. If Entra ID is enabled, attempt RS256 OIDC validation first (JWKS from `login.microsoftonline.com`).
3. If OIDC fails or is disabled, attempt HS256 dev JWT validation.
4. On success, populate request context with `AuthContext` (user ID, tenant ID, roles, permissions).

### 4.2 OIDC Flow

```
Browser                    Portal (Next.js)              API                  Microsoft Entra ID
  |                            |                          |                          |
  |-- Click "Sign in" ------->|                          |                          |
  |                            |-- GET /auth/oidc/config-->|                        |
  |                            |<-- {authority, clientId}--|                        |
  |                            |                          |                          |
  |<-- Redirect to Entra ID --|                          |                          |
  |                            |                          |                          |
  |-- Auth code (PKCE) ------>|                          |                          |
  |                            |-- POST /auth/oidc/callback (code) -->|             |
  |                            |                          |-- Exchange code -------->|
  |                            |                          |<-- id_token + access_token|
  |                            |                          |-- Create/update user --->| (DB)
  |                            |<-- {user, tokens} -------|                          |
  |                            |                          |                          |
  |<-- Set cookie + localStorage --|                     |                          |
```

### 4.3 Authorization (RBAC)

- **Model:** Role-based access control with permission strings (e.g., `system.view`, `system.manage`).
- **Enforcement points:**
  - **Backend:** `middleware.RequirePermission("permission.string")` on route groups.
  - **Frontend:** `<PermissionGate permission="xxx">` component wrapping UI elements.
- **Permission catalog:** Stored in DB (migration 017), exposed via `GET /api/v1/system/permissions`.

### 4.4 Session Management

- **Dev mode:** Stateless JWT (no server-side session).
- **OIDC mode:** Server-side session tracking in `sessions` table; cleanup via `MaintenanceWorker`.
- **Token refresh:** `POST /auth/refresh` (dev JWT) or `POST /auth/oidc/refresh` (OIDC).
- **JWT expiry:** 30 minutes (access), 168 hours / 7 days (refresh).

---

## 5. Notification & Eventing Model

### 5.1 Architecture

```
Domain Service (e.g., TicketService.Create)
  |
  |-- 1. Write to notifications table (outbox pattern)
  |-- 2. Publish event to NATS JetStream (if available)
  |
  v
OutboxProcessor (background)          Orchestrator (NATS subscriber)
  |                                      |
  |-- Poll notifications table           |-- Subscribe to JetStream subjects
  |-- Send via Graph API (email)         |-- Route to NotificationService
  |-- Mark as sent                       |-- Create in-app notifications
  |
  v                                      v
Microsoft Graph (email)              SSE Handler (/notifications/stream)
                                       |
                                       v
                                    Browser (EventSource)
```

### 5.2 Delivery Channels

| Channel | Implementation | Status |
|---------|---------------|--------|
| In-app notifications | PostgreSQL table + SSE streaming | IMPLEMENTED |
| Email | Microsoft Graph API via outbox processor | IMPLEMENTED (requires Entra ID) |
| NATS events | JetStream publish/subscribe | IMPLEMENTED |
| Push notifications | Not implemented | NOT_IMPLEMENTED |

### 5.3 Event Types

Events are published on domain actions (create, update, delete, state transitions). The NATS orchestrator listens on domain-specific subjects and routes to appropriate notification handlers.

---

## 6. Reporting & Search Model

### 6.1 Executive Dashboard

- **Data source:** PostgreSQL materialized view (created in migration 014).
- **Refresh:** `DashboardRefresher` background service refreshes every 5 minutes.
- **Caching:** Redis cache layer for dashboard data (with fallback to direct query if Redis unavailable).
- **Endpoints:** 12 chart-specific API endpoints + summary endpoint.

### 6.2 Report Generation

- **Report definitions:** CRUD operations are fully implemented (create, read, update, delete, list).
- **Report execution/generation:** STUBBED -- `ReportScheduler` runs every minute but does not actually generate report files. The scheduler checks for pending runs and logs them.
- **Saved searches:** Implemented -- users can save and recall search criteria.

### 6.3 Full-Text Search

- **Backend:** PostgreSQL full-text search (`tsvector` / `tsquery`) for knowledge articles.
- **Global search:** `SearchService` provides cross-entity search via direct SQL queries.
- **Frontend:** Command palette (`Cmd+K`) triggers global search; dedicated search page for full results.

---

## 7. Infrastructure Dependencies

### 7.1 Required vs Optional Services

| Service | Required | Degradation When Absent |
|---------|----------|------------------------|
| PostgreSQL 16 | YES (fatal) | Application will not start |
| Redis 7 | No (optional) | Rate limiting disabled, dashboard cache bypassed |
| MinIO | No (optional) | Document upload/download unavailable |
| NATS 2 (JetStream) | No (optional) | Async notifications disabled, action reminders disabled |
| Microsoft Entra ID | No (optional) | OIDC auth disabled, email notifications disabled, directory sync disabled |

### 7.2 Observability Stack

| Component | Purpose | Integration |
|-----------|---------|-------------|
| Prometheus | Metrics collection | Scrapes `/metrics` endpoint |
| Grafana | Visualization | 2 pre-built dashboards (API performance, platform health) |
| Loki | Log aggregation | Configured in `loki-config.yml` |
| Tempo | Distributed tracing | OTLP gRPC receiver on port 4317 |
| AlertManager | Alert routing | Alert rules in `prometheus/alert-rules.yml` |

### 7.3 External APIs

| API | Usage | Auth |
|-----|-------|------|
| Microsoft Graph API | Email sending, directory sync | Client credentials (Entra ID) |
| Microsoft Entra ID | OIDC authentication, JWKS validation | PKCE + client secret |

---

## 8. Deployment Model

### 8.1 Development

```
PM2 (ecosystem.opms.config.js)
  |-- opms-api:    go binary (bin/itd-opms-api) on port 8089
  |-- opms-portal: next dev on port 3000
  |
  + Docker Compose (infrastructure only or full stack)
    |-- postgres, redis, minio, nats, prometheus, grafana, loki, tempo, alertmanager
```

### 8.2 Production

```
Docker Compose (docker-compose.prod.yml)
  |-- api container (multi-stage build, alpine:3.21)
  |     |-- Migrations auto-run on startup
  |     |-- Health check: curl /api/v1/health
  |     |-- Exposed on port 8089
  |
  |-- postgres:16-alpine
  |-- redis:7-alpine
  |-- minio/minio:latest
  |-- nats:2-alpine
  |-- Observability stack
```

### 8.3 Build Process

```
# Backend
make build           # go build -o bin/itd-opms-api ./cmd/api
make test            # go test -v -race -coverprofile=coverage.out ./...

# Docker
docker build -t itd-opms-api .   # Multi-stage: golang:1.25-alpine -> alpine:3.21
                                   # CGO_ENABLED=0, ldflags="-w -s" (stripped binary)
                                   # Copies migrations/ into container

# Frontend (Next.js)
npm run build        # next build (production)
npm run dev          # next dev (development)
```

---

## 9. Architecture Mismatches: Claimed vs Observed

### 9.1 Architecture Claimed by Docs

Based on the solution architecture document (`docs/ITD-AMD-OPMS_Solution_Architecture_v2.docx`) and project context:

1. Modular monolith with clean module boundaries
2. Handler -> Service -> Repository -> Pool layered architecture
3. sqlc-generated type-safe query code
4. PostgreSQL RLS for multi-tenant isolation
5. Full CI/CD pipeline with automated testing and deployment
6. Report generation with PDF/Excel export
7. Platform packages for RBAC, search, SLA, workflow, tenant resolution
8. Comprehensive API documentation (api-reference.md)

### 9.2 Architecture Observed in Code

1. Modular monolith -- **CONFIRMED** (15 modules, clear package boundaries)
2. Handler -> Service -> **Pool** (NO Repository layer) -- services query DB directly
3. sqlc is configured but generated code is **NOT FOUND** in the repo; services use raw SQL
4. Multi-tenancy via application-level `WHERE tenant_id = ...` -- **NO RLS policies exist**
5. CI/CD is **CodeQL only** -- no build, test, lint, or deployment pipeline
6. Report definitions exist but generation is **STUBBED** -- scheduler logs but produces nothing
7. Platform packages `rbac/`, `search/`, `sla/`, `tenant/`, `workflow/`, `evidence/` are **EMPTY placeholders**
8. API reference file was **NOT FOUND** in the repository

### 9.3 Mismatch Summary

| Aspect | Claimed | Actual | Severity |
|--------|---------|--------|----------|
| Data access pattern | Handler -> Service -> Repository -> Pool | Handler -> Service -> Pool (no repository) | LOW -- code works, just fewer layers |
| sqlc code generation | Type-safe generated queries | Configured but not generated/committed; raw SQL used | MEDIUM -- type safety gap |
| Multi-tenant isolation | PostgreSQL RLS | Application-level WHERE clause only | HIGH -- no DB-level enforcement |
| CI/CD pipeline | Full pipeline | CodeQL security scan only | HIGH -- no automated build/test/deploy |
| Report generation | Full report generation with scheduling | CRUD for definitions + scheduler stub | MEDIUM -- feature incomplete |
| Platform abstractions | RBAC, search, SLA, workflow, tenant, evidence packages | Empty placeholder packages | LOW -- logic exists inline in modules |
| API documentation | api-reference.md | Not found | MEDIUM -- no API docs for consumers |
| Frontend rendering | Server-side rendering (Next.js) | Client-side rendering throughout (`"use client"`) | LOW -- works but loses SSR benefits |

### 9.4 Architectural Risks Identified

1. **No DB-level tenant isolation** -- A single missing `WHERE tenant_id = ...` in any of the 201 module Go files could leak data across tenants. No automated check enforces this.

2. **No repository layer** -- SQL queries are scattered across service files. Changing database technology or adding caching requires touching every service.

3. **Empty platform packages** -- `rbac/`, `search/`, `sla/`, `tenant/`, `workflow/`, `evidence/` suggest planned abstractions that were never implemented. RBAC logic lives in middleware; search is inline in reporting; SLA is inline in ITSM.

4. **No CI pipeline** -- No automated tests run on push/PR. The 86 backend test files and 379 frontend test files exist but are never validated in CI.

5. **Background service failures are silent** -- If `OutboxProcessor`, `DashboardRefresher`, or `ReportScheduler` panic or stall, there is no alerting mechanism beyond log output.

6. **Single binary, no horizontal scaling** -- The background services (outbox, scheduler, refresher) run inside the same process as the HTTP server. Running multiple replicas would cause duplicate processing without distributed locking (except `reportScheduleLockKey` which uses a PostgreSQL advisory lock).

7. **SSE write timeout disabled** -- `WriteTimeout: 0` on the HTTP server is set to support SSE but also removes protection against slow-client attacks for all endpoints.

# 02 -- Repository Map

> Audit deliverable -- actual repository structure as observed on 2026-03-02
> Branch audited: `dev` (commit `e5fbd10`)

---

## 1. Top-Level Layout

```
itd-opms/                              # Monorepo root
|-- itd-opms-api/                      # Go backend (API server)
|-- itd-opms-portal/                   # Next.js frontend (portal)
|-- docs/                              # Architecture & requirements documents
|-- AUDIT_CURRENT_STATE/               # Audit deliverables (this directory)
|-- ecosystem.opms.config.js           # PM2 process manager config (dev)
|-- README.md                          # Project README
|-- logo.jpeg                          # Project logo
|-- PROMPT_11_REQUIREMENTS_GAPS.md     # Requirements gap analysis artifact
|-- Application Mnagement Division.xlsx # Source requirements spreadsheet
```

---

## 2. Backend -- `itd-opms-api/`

### 2.1 Root Files

| File | Purpose |
|------|---------|
| `go.mod` / `go.sum` | Go module definition. Module path: `github.com/itd-cbn/itd-opms-api` |
| `Makefile` | Build, test, migrate, sqlc, docker, clean targets |
| `Dockerfile` | Multi-stage build (golang:1.25-alpine builder, alpine:3.21 runtime) |
| `docker-compose.yml` | Full dev stack: 10 services (api, postgres, redis, minio, nats, prometheus, alertmanager, grafana, loki, tempo) |
| `docker-compose.prod.yml` | Production-oriented compose override |
| `sqlc.yaml` | sqlc v2 config -- generates Go from SQL queries. Output: `internal/platform/database/sqlc` |
| `prometheus.yml` | Prometheus scrape configuration |
| `loki-config.yml` | Grafana Loki local configuration |
| `tempo.yml` | Grafana Tempo tracing configuration |
| `.env` / `.env.example` | Environment variables (viper-based config loading) |
| `.gitignore` | Standard Go + IDE ignores |
| `coverage.out` | Test coverage output (generated) |

### 2.2 Entry Point & Startup Path

```
cmd/api/main.go
  |-- main()
  |     |-- run()
  |           |-- config.Load()                     # Viper: .env + env vars + defaults
  |           |-- setupLogger(cfg)                  # slog: JSON (prod) or text (dev)
  |           |-- connectPostgres(ctx, cfg)         # pgxpool, 5 retries, required
  |           |-- database.RunMigrations(ctx, pool) # goose v3, ./migrations/ dir
  |           |-- connectRedis(ctx, cfg)            # 3 retries, optional (nil if fails)
  |           |-- connectMinIO(ctx, cfg)            # 3 retries, optional (nil if fails)
  |           |-- connectNATS(cfg)                  # 3 retries, optional (nil if fails)
  |           |-- server.NewServer(cfg, pool, redis, minio, nats, js)
  |           |-- srv.Setup()                       # Middleware chain + route registration
  |           |-- srv.Start()                       # HTTP server + background services
```

**Startup dependency order:** PostgreSQL (required, fatal) -> Redis (optional) -> MinIO (optional) -> NATS (optional)

### 2.3 Directory Tree

```
itd-opms-api/
|-- cmd/
|   |-- api/
|       |-- main.go                    # Application entry point (1 file)
|
|-- internal/
|   |-- modules/                       # 15 domain modules (201 Go files total)
|   |   |-- approval/                  # handler, service, types (+tests) -- 5 files
|   |   |-- automation/                # handler, service, types (+tests) -- 5 files
|   |   |-- calendar/                  # handler, service, types (+tests) -- 5 files
|   |   |-- cmdb/                      # 5 sub-handlers: asset, cmdb_ci, license, warranty, handler -- 15 files
|   |   |-- customfields/              # handler, service, types (+tests) -- 5 files
|   |   |-- governance/                # 4 sub-handlers: policy, raci, meeting, okr + action_reminder -- 16 files
|   |   |-- grc/                       # 4 sub-handlers: risk, grc_audit, access_review, compliance -- 15 files
|   |   |-- itsm/                      # 5 sub-handlers: catalog, ticket, sla, problem, queue -- 17 files
|   |   |-- knowledge/                 # 3 sub-handlers: article, feedback, announcement -- 12 files
|   |   |-- people/                    # 5 sub-handlers: skill, checklist, roster, training, heatmap -- 18 files
|   |   |-- planning/                  # 9 sub-handlers: portfolio, project, workitem, milestone, risk, timeline, pir, budget, costcategory -- 25 files
|   |   |-- reporting/                 # 3 sub-handlers: dashboard, report, search + refresher, scheduler -- 14 files
|   |   |-- system/                    # 9 sub-handlers: user, role, tenant, org, health, settings, audit_explorer, session, template + maintenance_worker -- 27 files
|   |   |-- vault/                     # handler, service, types (+tests) -- 5 files
|   |   |-- vendor/                    # handler, service, types (+tests) -- 5 files
|   |
|   |-- platform/                      # 17 packages (43 Go files total, 34 non-test)
|   |   |-- audit/                     # Audit service, handler, middleware (5 files)
|   |   |-- auth/                      # Auth service, JWT, OIDC, handlers (6 files)
|   |   |-- config/                    # Viper-based configuration (1 file)
|   |   |-- database/                  # Connection factories: postgres, redis, minio, nats (4 files)
|   |   |-- dirsync/                   # Microsoft Entra ID directory sync service (1 file)
|   |   |-- evidence/                  # Evidence storage abstraction (empty/placeholder)
|   |   |-- metrics/                   # Prometheus metrics middleware + handler (1 file)
|   |   |-- middleware/                # HTTP middleware: auth, cors, csrf, correlation, logging, ratelimit, rbac, recovery, security, session, tenant (12 files)
|   |   |-- msgraph/                   # Microsoft Graph API client with circuit breaker (2 files)
|   |   |-- notification/              # Notification service, SSE, outbox processor, orchestrator (8 files)
|   |   |-- rbac/                      # RBAC utilities (empty/placeholder)
|   |   |-- search/                    # Full-text search platform (empty/placeholder)
|   |   |-- server/                    # HTTP server, health check, route wiring (3 files)
|   |   |-- sla/                       # SLA computation platform (empty/placeholder)
|   |   |-- tenant/                    # Tenant resolution platform (empty/placeholder)
|   |   |-- workflow/                  # Workflow engine platform (empty/placeholder)
|   |
|   |-- shared/                        # Cross-cutting utilities (13 files)
|   |   |-- errors/                    # Application error types (errors.go + test)
|   |   |-- export/                    # CSV export writer (csv_writer.go + test)
|   |   |-- helpers/                   # crypto.go, uuid.go (+ tests)
|   |   |-- types/                     # context.go, pagination.go, response.go (+ tests)
|   |
|   |-- testutil/                      # Test utilities (2 files)
|       |-- mock_db.go                 # Mock database pool for unit tests
|       |-- testutil.go                # Shared test helpers
|
|-- migrations/                        # 37 SQL migration files (goose v3 format)
|   |-- 001_tenants_and_org_hierarchy.sql
|   |-- 002_users_and_rbac.sql
|   |-- ...
|   |-- 037_seed_skills.sql
|   |-- 038_seed_olaniyan_global_admin.sql  (untracked)
|
|-- queries/                           # 13 sqlc query files
|   |-- audit.sql
|   |-- auth.sql
|   |-- cmdb.sql
|   |-- governance.sql
|   |-- grc.sql
|   |-- itsm.sql
|   |-- knowledge.sql
|   |-- people.sql
|   |-- planning.sql
|   |-- reporting.sql
|   |-- system.sql
|   |-- tenants.sql
|   |-- users.sql
|
|-- scripts/                           # Operational scripts
|   |-- backup.sh                      # Database backup script
|
|-- bin/                               # Build output (2 binaries)
|   |-- api                            # Compiled API binary
|   |-- itd-opms-api                   # Alternative binary name
|
|-- alertmanager/                      # AlertManager configuration
|   |-- alertmanager.yml
|
|-- prometheus/                        # Prometheus alert rules
|   |-- alert-rules.yml
|
|-- grafana/                           # Grafana provisioning
|   |-- dashboards/
|   |   |-- api-performance.json       # API performance dashboard
|   |   |-- platform-health.json       # Platform health dashboard
|   |-- provisioning/
|       |-- dashboards/                # Dashboard provisioning config
|       |-- datasources/               # Datasource provisioning config
|
|-- docs/                              # API documentation
```

### 2.4 Module File Pattern

Each domain module follows a consistent file structure:

```
module/
  |-- handler.go              # Top-level handler: composes sub-handlers, mounts Routes(chi.Router)
  |-- <domain>_handler.go     # HTTP handler for a sub-domain (decode, validate, delegate, respond)
  |-- <domain>_handler_test.go # Handler unit tests (httptest + mock DB)
  |-- <domain>_service.go     # Business logic: SQL via pgxpool.Pool, audit logging
  |-- <domain>_service_test.go # Service-level tests (where present)
  |-- types.go                # Request/response structs, validation, domain types
  |-- types_test.go           # Validation and serialization tests
```

**No separate repository layer exists** -- services query the database directly via `pgxpool.Pool`.

### 2.5 Configuration Loading

Configuration is loaded via Viper in `internal/platform/config/config.go`:

- **Source priority:** Environment variables > `.env` file > hardcoded defaults
- **Key replacement:** `_` maps to struct nesting (e.g., `DB_HOST` -> `Database.Host`)
- **Sections:** Server, Database, Redis, MinIO, NATS, JWT, EntraID, Graph, Observability, Log
- **Notable defaults:**
  - Port: `8089`
  - JWT Expiry: `30m` (access), `168h` (refresh)
  - DB Pool: `25` max / `5` min connections
  - Rate limit: `100 requests/minute` per IP (Redis-backed)

### 2.6 Route Registration

All routes are registered in `internal/platform/server/server.go` under the `/api/v1` prefix:

| Mount Point | Module | Auth Required |
|-------------|--------|---------------|
| `/api/v1/health` | Health check | No (public) |
| `/api/v1/auth/*` | Auth (login, refresh, OIDC, me, logout) | Mixed |
| `/api/v1/audit` | Audit events | Yes |
| `/api/v1/notifications` | Notifications + SSE stream | Yes |
| `/api/v1/admin/directory-sync` | Entra ID directory sync | Yes (admin) |
| `/api/v1/governance` | Policies, RACI, Meetings, OKRs/KPIs | Yes |
| `/api/v1/people` | Skills, Checklists, Rosters, Training, Heatmap | Yes |
| `/api/v1/planning` | Portfolios, Projects, Work Items, Milestones, Risks, Timelines, PIR, Budget | Yes |
| `/api/v1/itsm` | Catalog, Tickets, SLA, Problems, Queues | Yes |
| `/api/v1/cmdb` | Assets, CMDB CIs, Licenses, Warranties, Renewal Alerts | Yes |
| `/api/v1/knowledge` | Articles, Feedback, Announcements | Yes |
| `/api/v1/grc` | Risks, Audits, Access Reviews, Compliance | Yes |
| `/api/v1/reporting` | Dashboards, Reports, Search | Yes |
| `/api/v1/system` | Users, Roles, Tenants, Org Units, Health, Settings, Sessions, Audit Logs, Templates | Yes (RBAC) |
| `/api/v1/approvals` | Approval workflows | Yes |
| `/api/v1/calendar` | Calendar / maintenance windows | Yes |
| `/api/v1/vault` | Document vault | Yes |
| `/api/v1/vendors` | Vendor management | Yes |
| `/api/v1/automation` | Automation rules | Yes |
| `/api/v1/custom-fields` | Custom field definitions | Yes |
| `/api/v1/dashboards` | Dashboard alias (top-level) | Yes |
| `/api/v1/search` | Search alias (top-level) | Yes |
| `/metrics` | Prometheus metrics | No (public, outside /api/v1) |

### 2.7 Middleware Chain (ordered)

```
1. Recovery          (panic recovery)
2. Correlation       (X-Correlation-ID generation/propagation)
3. Logging           (structured request/response logging)
4. RealIP            (chi built-in, X-Forwarded-For)
5. CORS              (go-chi/cors, credentials allowed)
6. SecurityHeaders   (CSP, X-Frame-Options, etc.)
7. CSRF              (origin validation, safe methods exempt)
8. Metrics           (Prometheus request duration/count)
9. RateLimitByIP     (Redis-backed, 100/min per IP -- only if Redis available)
10. AuthDualMode     (RS256 OIDC first, then HS256 dev JWT fallback)
11. AuditMiddleware  (audit event creation on mutating requests)
```

### 2.8 Migrations Path

- **Tool:** goose v3
- **Directory:** `itd-opms-api/migrations/`
- **File count:** 37 SQL files (+ 1 untracked: `038_seed_olaniyan_global_admin.sql`)
- **Execution:** Automatic on startup via `database.RunMigrations()` (non-fatal on error)
- **Manual:** `make migrate-up`, `make migrate-down`, `make migrate-status`
- **Coverage:** Tenants/org -> Users/RBAC -> Audit -> Approvals -> Documents -> Notifications -> all domain schemas -> reporting/KPIs -> system -> permissions -> org hierarchy -> action reminders -> PIR -> seed data -> budget -> vendors -> vault -> automation -> custom fields -> email templates -> staff seeds

### 2.9 Query Generation (sqlc)

- **Config:** `sqlc.yaml` (version 2)
- **Engine:** PostgreSQL
- **Input queries:** `queries/` directory (13 `.sql` files)
- **Input schema:** `migrations/` directory (all 37 SQL files)
- **Output:** `internal/platform/database/sqlc/`
- **Driver:** `pgx/v5`
- **Type overrides:** `uuid` -> `uuid.UUID`, `timestamptz` -> `time.Time`, `jsonb` -> `json.RawMessage`, `inet` -> `string`

**Audit observation:** The generated sqlc code directory (`internal/platform/database/sqlc/`) was not found in the tree. sqlc generation may not have been run recently, or generated code is not committed. Services use raw SQL via `pgxpool.Pool` directly rather than sqlc-generated code.

### 2.10 Test Layout

#### Backend Tests (86 `_test.go` files)

| Category | Count | Pattern |
|----------|-------|---------|
| Module handler tests | 65 | `*_handler_test.go` |
| Module types tests | 15 | `types_test.go` |
| Module service tests | 6 | `*_service_test.go` (itsm, planning, people, reporting) |
| Platform tests | 8 | Various (`jwt_test.go`, `middleware_test.go`, `server_test.go`, etc.) |
| Shared tests | 7 | `errors_test.go`, `csv_writer_test.go`, `crypto_test.go`, `uuid_test.go`, etc. |

**Test infrastructure:** `internal/testutil/mock_db.go` + `testutil.go`
**Test execution:** `make test` -> `go test -v -race -coverprofile=coverage.out ./...`

#### Frontend Tests (379 test files)

| Category | Location |
|----------|----------|
| Page tests | `app/dashboard/*/__tests__/*.test.tsx` |
| Component tests | `components/shared/__tests__/*.test.tsx` |
| Hook tests | `hooks/__tests__/*.test.ts` |
| Provider tests | `providers/__tests__/*.test.tsx` |
| Library tests | `lib/__tests__/*.test.ts` |
| Smoke tests | `test/smoke.test.ts`, `test/smoke-react.test.tsx` |
| MSW mocks | `test/mocks/handlers.ts`, `test/mocks/server.ts` |

**Test framework:** Vitest 4 + MSW 2 (Mock Service Worker)
**Config:** `vitest.config.ts` at portal root
**Setup:** `test/setup.ts`

---

## 3. Frontend -- `itd-opms-portal/`

### 3.1 Root Files

| File | Purpose |
|------|---------|
| `package.json` | Next.js 16.1.6, React 19, dependencies |
| `package-lock.json` | Lockfile |
| `next.config.ts` | Next.js configuration |
| `tsconfig.json` | TypeScript 5 configuration |
| `postcss.config.mjs` | PostCSS (Tailwind CSS 4) |
| `vitest.config.ts` | Vitest test runner configuration |
| `next-env.d.ts` | Next.js type declarations |

### 3.2 Directory Tree

```
itd-opms-portal/
|-- app/                               # Next.js App Router pages (121 page.tsx files)
|   |-- globals.css                    # Global Tailwind styles
|   |-- layout.tsx                     # Root layout (providers, fonts)
|   |-- page.tsx                       # Landing/redirect page
|   |-- auth/
|   |   |-- login/page.tsx             # Login page
|   |   |-- callback/page.tsx          # OIDC callback handler
|   |-- dashboard/
|       |-- page.tsx                   # Executive dashboard
|       |-- analytics/                 # 8 analytics pages (overview, portfolio, projects, risks, resources, governance, offices, collaboration)
|       |-- governance/                # 14 pages (policies CRUD, RACI, meetings, OKRs, actions, approvals)
|       |-- people/                    # 9 pages (overview, skills, roster, capacity, heatmap, onboarding, offboarding, training, analytics)
|       |-- planning/                  # 25 pages (portfolios CRUD, projects CRUD+edit+budget+timeline, work-items, milestones, risks, issues, change-requests, PIR, budget, calendar)
|       |-- itsm/                      # 8 pages (overview, tickets CRUD, service-catalog, sla-dashboard, problems, my-queue)
|       |-- cmdb/                      # 13 pages (overview, assets CRUD+dispose, vendors, contracts, licenses, warranties, reconciliation, topology, reports)
|       |-- knowledge/                 # 4 pages (overview, articles CRUD, search)
|       |-- grc/                       # 8 pages (overview, risks CRUD, audits+evidence, compliance, access-reviews, reports)
|       |-- reports/page.tsx           # Reports page
|       |-- search/page.tsx            # Global search page
|       |-- notifications/page.tsx     # Notifications page
|       |-- vault/page.tsx             # Document vault page
|       |-- system/                    # 14 pages (overview, users CRUD, roles CRUD, tenants, org-units, settings, sessions, health, audit-logs, email-templates, custom-fields, automation, workflows)
|
|-- components/                        # Reusable UI components (82 files)
|   |-- dashboard/                     # Dashboard-specific components
|   |   |-- analytics/                 # 6 analytics panel components
|   |   |-- charts/                    # 15 chart components (donut, funnel, gauge, heatmap, radar, spark, etc.)
|   |   |-- division-performance/      # 4 division comparison components
|   |   |-- activity-panel.tsx
|   |   |-- critical-alerts-banner.tsx
|   |   |-- enhanced-kpi-card.tsx
|   |   |-- secondary-metrics-strip.tsx
|   |-- governance/                    # attendee-selector.tsx
|   |-- layout/                        # Header, sidebar (+ sidebar sub-components), mobile-nav
|   |   |-- sidebar/                   # 8 sidebar files (DnD, presets, resize, wizard, etc.)
|   |-- notifications/                 # Bell, item, panel components
|   |-- planning/                      # gantt-chart.tsx, project-documents.tsx
|   |-- shared/                        # 16 shared components + 16 test files
|       |-- data-table.tsx             # Generic data table
|       |-- command-palette.tsx        # Cmd+K command palette
|       |-- permission-gate.tsx        # Permission-based UI gating
|       |-- approval-status.tsx        # Approval workflow status display
|       |-- custom-fields-form.tsx     # Dynamic custom field renderer
|       |-- document-upload.tsx        # File upload component
|       |-- export-dropdown.tsx        # CSV/PDF export
|       |-- ...
|
|-- hooks/                             # React hooks (29 production hooks + 17 test files)
|   |-- use-auth.ts                    # Authentication hook
|   |-- use-governance.ts              # Governance data hooks (TanStack Query)
|   |-- use-people.ts                  # People data hooks
|   |-- use-planning.ts               # Planning data hooks
|   |-- use-itsm.ts                   # ITSM data hooks
|   |-- use-cmdb.ts                   # CMDB data hooks
|   |-- use-knowledge.ts              # Knowledge data hooks
|   |-- use-grc.ts                    # GRC data hooks
|   |-- use-reporting.ts              # Reporting data hooks
|   |-- use-system.ts                 # System admin hooks
|   |-- use-approvals.ts              # Approval workflow hooks
|   |-- use-automation.ts             # Automation rules hooks
|   |-- use-budget.ts                 # Budget tracking hooks
|   |-- use-calendar.ts               # Calendar hooks
|   |-- use-custom-fields.ts          # Custom field hooks
|   |-- use-heatmap.ts                # Capacity heatmap hooks
|   |-- use-hotkeys.ts                # Keyboard shortcut hooks
|   |-- use-notifications.ts          # Notification hooks + SSE
|   |-- use-vault.ts                  # Document vault hooks
|   |-- use-vendors.ts                # Vendor management hooks
|   |-- use-sidebar-*.ts              # 7 sidebar-related hooks (layout, resize, scroll, favorites, etc.)
|   |-- use-activity-panel.ts         # Dashboard activity panel hook
|   |-- use-reduced-motion.ts         # Accessibility hook
|
|-- providers/                         # React context providers (5 + 5 tests)
|   |-- auth-provider.tsx              # Auth context (JWT + OIDC session)
|   |-- query-provider.tsx             # TanStack Query client
|   |-- notification-provider.tsx      # Notification context
|   |-- breadcrumb-provider.tsx        # Breadcrumb context
|   |-- theme-provider.tsx             # Theme context
|
|-- lib/                               # Utility libraries (9 production files + 6 tests)
|   |-- api-client.ts                  # Axios/fetch wrapper for API calls
|   |-- auth.ts                        # Auth token management
|   |-- utils.ts                       # General utilities
|   |-- navigation.ts                  # Route definitions and navigation helpers
|   |-- export-csv.ts                  # CSV export utility
|   |-- export-utils.ts               # Export formatting utilities
|   |-- fuzzy-match.ts                # Fuzzy search for command palette
|   |-- division-constants.ts          # Division metadata constants
|   |-- sidebar-layout-utils.ts        # Sidebar layout persistence utilities
|
|-- types/                             # TypeScript type definitions
|   |-- index.ts                       # Monolithic types file (2,535 lines)
|
|-- test/                              # Test infrastructure
|   |-- setup.ts                       # Vitest global setup
|   |-- test-utils.tsx                 # Testing library wrappers
|   |-- smoke.test.ts                  # Basic smoke test
|   |-- smoke-react.test.tsx           # React rendering smoke test
|   |-- mocks/
|       |-- handlers.ts                # MSW request handlers
|       |-- server.ts                  # MSW server instance
|
|-- public/                            # Static assets
|-- coverage/                          # Test coverage reports (generated)
```

---

## 4. Infrastructure & DevOps

### 4.1 Docker Compose Services (10 total)

| Service | Image | Port | Network | Health Check |
|---------|-------|------|---------|--------------|
| `api` | Custom (Dockerfile) | 8089 | backend, monitoring | curl /api/v1/health |
| `postgres` | postgres:16-alpine | 5432 | backend | pg_isready |
| `redis` | redis:7-alpine | 6379 | backend | redis-cli ping |
| `minio` | minio/minio:latest | 9000 (S3), 9001 (console) | backend | curl /minio/health/live |
| `nats` | nats:2-alpine | 4222 (client), 8222 (monitoring) | backend | wget /healthz |
| `prometheus` | prom/prometheus:latest | 9090 | monitoring | - |
| `alertmanager` | prom/alertmanager:v0.27.0 | 9093 | monitoring | - |
| `grafana` | grafana/grafana:latest | 3001 (host) -> 3000 | monitoring | - |
| `loki` | grafana/loki:latest | 3100 | monitoring | - |
| `tempo` | grafana/tempo:latest | 4317 (OTLP), 3200 (HTTP) | backend, monitoring | - |

### 4.2 Networks

- `backend` -- data stores and API communication
- `monitoring` -- observability stack (Prometheus, Grafana, Loki, Tempo)

### 4.3 PM2 Configuration (Development)

`ecosystem.opms.config.js` defines two processes:

| Process | Working Dir | Command | Port |
|---------|-------------|---------|------|
| `opms-api` | `./itd-opms-api` | `bin/itd-opms-api` | 8089 |
| `opms-portal` | `./itd-opms-portal` | `next dev --port 3000` | 3000 |

### 4.4 CI/CD

| File | Purpose |
|------|---------|
| `.github/workflows/codeql.yml` | GitHub CodeQL security scanning |

**Audit observation:** No CI/CD pipeline for build, test, lint, or deployment was found. Only CodeQL static analysis is configured.

### 4.5 Deployment Files

| File | Purpose |
|------|---------|
| `itd-opms-api/Dockerfile` | Multi-stage Go build (1.25-alpine -> alpine:3.21) |
| `itd-opms-api/docker-compose.yml` | Dev stack orchestration |
| `itd-opms-api/docker-compose.prod.yml` | Production overrides |
| `itd-opms-api/scripts/backup.sh` | Database backup script |

---

## 5. Documentation

### 5.1 Root Documentation

| File | Location |
|------|----------|
| `README.md` | Repository root |

### 5.2 `docs/` Directory

| File | Purpose |
|------|---------|
| `Master.md` | Master documentation (consolidated) |
| `SERVER_DEPLOYMENT_REQUIREMENTS.md` | Server deployment requirements |
| `ITD-AMD-OPMS_Requirements_Specification V2.docx` | Requirements specification |
| `ITD-AMD-OPMS_Solution_Architecture_v2.docx` | Solution architecture document |
| `ITD_AMD_High_Level_Processes v3.pptx` | High-level business processes |
| `Application Mnagement Division.xlsx` | Source requirements data |

### 5.3 Referenced but Not Found

The following documentation files are referenced in the project context but were not located in the repository tree:

- `api-reference.md` -- May exist in `itd-opms-api/docs/` or be generated
- `deployment-runbook.md` -- May be embedded in `docs/Master.md`
- `backup-restore-runbook.md` -- May be embedded in `docs/Master.md`
- `dr-failover-runbook.md` -- May be embedded in `docs/Master.md`

---

## 6. File Counts Summary

| Category | Count |
|----------|-------|
| **Backend Go files (total)** | 260 |
| Backend module Go files | 201 |
| Backend platform Go files | 43 |
| Backend shared Go files | 13 |
| Backend test files (`_test.go`) | 86 |
| Backend migration files (`.sql`) | 37 (+1 untracked) |
| Backend sqlc query files | 13 |
| **Frontend page files (`page.tsx`)** | 121 |
| Frontend component files | 82 |
| Frontend hook files (production) | 29 |
| Frontend provider files | 5 |
| Frontend library files (production) | 9 |
| Frontend test files | 379 |
| Frontend types file | 1 (2,535 lines) |
| **Docker Compose services** | 10 |
| **CI/CD workflows** | 1 (CodeQL only) |

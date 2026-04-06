# 21. Remediation Backlog

## Audit Metadata

| Field | Value |
|---|---|
| **Audit Date** | 2026-03-02 |
| **Branch** | `dev` |
| **Scope** | All identified gaps from audit deliverables 01-20, prioritized with effort estimates |
| **Total Items** | 25 remediation items across 4 priority levels |

---

## Priority Legend

| Priority | Label | Definition | SLA |
|---|---|---|---|
| **P0** | CRITICAL | Security vulnerabilities, data exposure risks, or blocking defects that must be resolved before any UAT or production deployment | Resolve within 1-2 weeks |
| **P1** | HIGH | Significant gaps that undermine system reliability, compliance, or developer productivity; required for UAT readiness | Resolve within 2-4 weeks |
| **P2** | MEDIUM | Quality improvements, performance optimizations, and architectural enhancements; required for production readiness | Resolve within 1-2 months |
| **P3** | LOW | Polish, UX improvements, and nice-to-have features; address in normal sprint cadence | Resolve within 1 quarter |

## Effort Legend

| Effort | Definition | Approximate Duration |
|---|---|---|
| **XS** | Configuration change or single-file edit | < 2 hours |
| **S** | Small code change, 1-3 files | 2-8 hours |
| **M** | Multi-file change, requires testing | 1-3 days |
| **L** | Significant feature work or refactoring | 1-2 weeks |
| **XL** | Major architectural change or new subsystem | 2-4 weeks |

---

## P0 -- CRITICAL (Resolve Before UAT)

| # | Priority | Module | Gap | Exact Work Required | Dependencies | Effort | Risk if Unresolved | Files Likely Affected |
|---|---|---|---|---|---|---|---|---|
| 1 | P0 | **System / Auth** | Hardcoded weak passwords in seed migrations | Replace all 37 user seed records using "password" hash with strong unique passwords or remove password seeding entirely; add migration to force password reset on first login | None | S | **Full account takeover** if seed data reaches production; violates every password policy | `migrations/0XX_seed_*.sql` (all user-seeding migrations) |
| 2 | P0 | **Platform / AuthZ** | Missing `RequirePermission` middleware on 8+ module handler groups | Add `RequirePermission(permission)` middleware to route registration for: ITSM, CMDB, Knowledge, GRC, Reporting, Vault, Automation, CustomFields handlers. Define required permissions for each endpoint (read, write, delete, admin) | Permission definitions must exist in DB seed | M | **Any authenticated user can read/modify/delete data in any module** regardless of role; complete authorization bypass | `internal/platform/server/server.go` (route registration), handler files for each module |
| 3 | P0 | **Notification** | Email notification delivery not implemented | 1) Choose and configure SMTP provider (Exchange Online, SendGrid, or AWS SES). 2) Implement outbox processor background worker that polls `notification_outbox` table. 3) Wire 31 seeded email templates to template rendering engine. 4) Add retry logic with exponential backoff. 5) Add dead-letter handling for failed deliveries | SMTP provider credentials; email sending approval from IT security | L | **All workflow notifications are silent**; approvals, escalations, SLA breaches, and assignment changes produce no communication; users unaware of pending actions | `internal/platform/notification/` (new outbox_processor.go), `.env` (SMTP config), `internal/platform/server/` (worker startup) |
| 4 | P0 | **Planning** | Failing OKR handler test (nil pool panic) | Debug the nil pointer dereference in OKR handler test; likely missing mock database pool setup in test initialization. Fix the test setup to properly initialize the pool mock or use testutil helpers | None | S | **Blocks CI pipeline trust**; cannot rely on automated test results if known panics exist; masks other potential failures | `internal/modules/planning/okr_handler_test.go` (approximate), `internal/modules/planning/okr_handler.go` |

---

## P1 -- HIGH (Resolve for UAT Readiness)

| # | Priority | Module | Gap | Exact Work Required | Dependencies | Effort | Risk if Unresolved | Files Likely Affected |
|---|---|---|---|---|---|---|---|---|
| 5 | P1 | **Database / Multi-Tenancy** | No PostgreSQL Row-Level Security (RLS) | 1) Design RLS policies for all 124 tables that have `tenant_id`. 2) Write migration to enable RLS and create policies: `CREATE POLICY tenant_isolation ON <table> USING (tenant_id = current_setting('app.current_tenant')::uuid)`. 3) Set `app.current_tenant` in each database connection from middleware. 4) Test that cross-tenant queries are blocked at DB level | Must coordinate with all services that open DB connections; test thoroughly to avoid locking out legitimate queries | XL | **Defense-in-depth failure**; if any application-level tenant filter is missed, data from all tenants is exposed; no DB-level safety net | All migration files (new migration), `internal/shared/db/` (connection setup), middleware for setting tenant context |
| 6 | P1 | **Platform / Auth** | Session timeout middleware is pass-through | 1) Add `IssuedAt` field to `AuthContext` struct (populated from JWT `iat` claim). 2) Implement actual timeout check in `SessionTimeout` middleware: compare `IssuedAt + maxSessionDuration` against `time.Now()`. 3) Return 401 with "session expired" when exceeded. 4) Remove the TODO comment | Item 1 (auth context must carry issued-at) | S | **Sessions never expire**; stolen tokens remain valid indefinitely; no force-logout capability; fails compliance requirements for session management | `internal/platform/middleware/session.go`, `internal/platform/auth/` (AuthContext struct), `internal/platform/middleware/middleware_test.go` |
| 7 | P1 | **DevOps / CI/CD** | No automated CI/CD pipeline beyond CodeQL | 1) Create GitHub Actions workflow: `ci.yml`. 2) Jobs: `go test -race ./...`, `golangci-lint run`, `npm run test`, `npm run build`, `docker build`. 3) Run on PR and push to `main`/`dev`. 4) Add branch protection rules requiring CI pass. 5) Add deployment job for staging environment | GitHub Actions runner access; staging environment provisioned | L | **Regressions ship silently**; no quality gates before merge; manual testing is only safeguard; no reproducible builds | `.github/workflows/ci.yml` (new), branch protection settings |
| 8 | P1 | **Testing** | No End-to-End tests | 1) Install Playwright. 2) Configure test environment with Docker Compose. 3) Write 5 critical path E2E tests: login flow, ticket CRUD, project CRUD, report access, admin user management. 4) Add to CI pipeline | CI/CD pipeline (item 7); stable test environment | L | **Full user journeys untested**; page navigation regressions, form submission failures, multi-step workflow breaks go undetected | `itd-opms-portal/e2e/` (new directory), `playwright.config.ts` (new), `package.json` (new dependency) |
| 9 | P1 | **Reporting** | Report generation engine stubbed (no PDF/Excel output) | 1) Choose PDF library (e.g., `go-wkhtmltopdf`, `gofpdf`, or headless Chrome). 2) Choose Excel library (e.g., `excelize`). 3) Implement report template rendering for each report type. 4) Wire report service methods to actual generation. 5) Store generated reports in MinIO `reports` bucket. 6) Add download endpoint | MinIO `reports` bucket (exists); report template definitions | L | **Reporting module is 60% complete**; users see report UI but cannot generate or download any actual report; blocks core business value | `internal/modules/reporting/report_service.go`, new template files, MinIO integration code |
| 10 | P1 | **Platform / Messaging** | NATS JetStream severely underutilized -- no event-driven architecture | 1) Design event schema (CloudEvents format). 2) Define subjects: `audit.>`, `notification.>`, `workflow.>`, `sync.>`. 3) Implement event publisher middleware. 4) Implement consumer workers for: audit event persistence, notification fanout, workflow state transitions. 5) Add dead-letter queue handling | NATS JetStream (already deployed); consumer worker infrastructure | XL | **Monolithic request handling**; all work done synchronously in HTTP handlers; no async processing; notification fanout impossible; audit events can be lost on failure | `internal/platform/` (event publisher), new consumer workers, handler files (add event publishing) |
| 11 | P1 | **Platform / Security** | No trusted proxy list for IP extraction | 1) Add `TRUSTED_PROXIES` environment variable. 2) Implement proxy-aware IP extraction that only trusts `X-Forwarded-For` from known proxy IPs. 3) Fall back to `RemoteAddr` for untrusted sources | None | S | **X-Forwarded-For header spoofing** allows rate limit bypass and audit log falsification; attacker can set arbitrary IP | `internal/platform/middleware/` (rate limiter, audit middleware), `.env` configuration |
| 12 | P1 | **Platform / Audit** | Incomplete audit logging coverage | 1) Add audit event capture for: failed authentication attempts, configuration changes (system settings), role/permission assignment changes, user deactivation/activation. 2) Ensure all audit events include actor, target, timestamp, tenant, and IP | Audit middleware exists; extend capture points | M | **Incomplete audit trail**; security investigations cannot determine who changed configurations or when authentication attacks occurred; compliance gap | `internal/platform/audit/middleware.go`, `internal/platform/auth/` (failed auth capture), system settings handlers |

---

## P2 -- MEDIUM (Resolve for Production Readiness)

| # | Priority | Module | Gap | Exact Work Required | Dependencies | Effort | Risk if Unresolved | Files Likely Affected |
|---|---|---|---|---|---|---|---|---|
| 13 | P2 | **Platform / Performance** | No Redis caching for read-heavy endpoints | 1) Implement cache service with `Get`/`Set`/`Invalidate` operations. 2) Add caching to: dashboard aggregation queries, KPI computations, list endpoints with filters. 3) Use appropriate TTLs (30s for dashboards, 5min for KPIs, 1min for lists). 4) Implement cache invalidation on writes | Redis (already deployed for rate limiting) | M | **Every page load hits PostgreSQL directly**; dashboard performance degrades under concurrent user load; no read scaling | New `internal/platform/cache/` package, handler/service files that call cache |
| 14 | P2 | **Observability** | No OpenTelemetry distributed tracing instrumentation | 1) Add `go.opentelemetry.io/otel` SDK to `go.mod`. 2) Instrument HTTP middleware with trace context propagation. 3) Instrument database calls with span creation. 4) Configure OTLP exporter pointing to Tempo. 5) Add trace ID to structured log output | Tempo (already deployed) | M | **Zero distributed tracing**; debugging production issues requires manual log correlation; cannot trace request flow through system layers | `go.mod`, `internal/platform/middleware/` (tracing middleware), `internal/shared/db/` (DB span instrumentation) |
| 15 | P2 | **Frontend / Code Quality** | `types/index.ts` is 2,535 lines in a single file | 1) Create domain-specific type files: `types/planning.ts`, `types/itsm.ts`, `types/governance.ts`, `types/cmdb.ts`, `types/grc.ts`, `types/knowledge.ts`, `types/people.ts`, `types/system.ts`, `types/common.ts`. 2) Move types to appropriate files. 3) Create `types/index.ts` barrel export. 4) Update all imports across the codebase | None; purely refactoring | M | **Merge conflicts on every PR** that touches types; difficult to navigate; cognitive overload for developers | `itd-opms-portal/types/index.ts` (split), all importing files (update imports) |
| 16 | P2 | **Platform / Security** | No CSRF token-based protection | 1) Implement CSRF token generation endpoint. 2) Add CSRF validation middleware for all state-changing requests (POST, PUT, DELETE). 3) Include CSRF token in frontend API client headers. 4) Use `SameSite=Strict` cookie attribute as defense-in-depth | Frontend API client must send token | M | **Cross-site request forgery possible**; malicious sites can trigger state changes on behalf of authenticated users | `internal/platform/middleware/` (new CSRF middleware), `itd-opms-portal/lib/api-client.ts` |
| 17 | P2 | **Platform / Security** | Rate limiting is global only (100 req/min/IP) | 1) Implement per-endpoint rate limiting configuration. 2) Add stricter limits for: login (5/min), password reset (3/min), report generation (10/min). 3) Add more lenient limits for read endpoints (300/min). 4) Consider user-based rate limiting in addition to IP-based | None | S | **Brute-force attacks against login** limited only by global rate; API abuse on expensive endpoints (report generation, search) not throttled | `internal/platform/middleware/` (rate limiter enhancement) |
| 18 | P2 | **Observability** | No Loki or Prometheus retention policies configured | 1) Add `retention_period: 720h` (30 days) to Loki configuration. 2) Add `--storage.tsdb.retention.time=30d` to Prometheus configuration. 3) Add disk usage alerting rule | None | XS | **Unbounded storage growth**; disk exhaustion in production will crash monitoring stack and potentially the host | `loki.yml` or `docker-compose.yml` (Loki config), `prometheus.yml` (retention flag) |
| 19 | P2 | **Platform / Auth** | No token revocation mechanism | 1) Create Redis-backed revocation set (`revoked_tokens` key). 2) Add `POST /api/v1/auth/revoke` endpoint. 3) Check revocation set in auth middleware on every request. 4) Add admin endpoint for force-revoking all tokens for a user | Redis (already deployed); auth middleware modification | M | **Compromised tokens remain valid until expiry**; no force-logout; no way to invalidate tokens after password change or account deactivation | `internal/platform/auth/` (revocation check), `internal/platform/middleware/` (auth middleware), new revocation handler |
| 20 | P2 | **CMDB** | Missing reports and contracts backend handlers | 1) Implement CMDB report generation handlers (asset inventory, lifecycle, compliance). 2) Implement contract management handlers (create, update, link to assets, renewal tracking). 3) Add corresponding sqlc queries | Report generation framework (item 9) | M | **CMDB module cannot produce asset reports or track vendor contracts**; manual Excel exports required | `internal/modules/cmdb/` (new handler and service files), `sqlc/queries/` (new query files) |

---

## P3 -- LOW (Normal Sprint Cadence)

| # | Priority | Module | Gap | Exact Work Required | Dependencies | Effort | Risk if Unresolved | Files Likely Affected |
|---|---|---|---|---|---|---|---|---|
| 21 | P3 | **Knowledge** | No article version history UI | 1) Add version history sidebar/panel to article detail page. 2) Implement version diff view. 3) Add "restore to version" action. 4) Wire to existing version history API (if backend supports it) or implement backend versioning | Backend version tracking (may need new table/queries) | M | **Knowledge base articles have no revision tracking**; accidental changes cannot be reverted; no audit of content changes | `app/dashboard/knowledge/` (article detail page), potentially new backend endpoints |
| 22 | P3 | **Knowledge** | No knowledge template system | 1) Design template schema (sections, default content, metadata). 2) Create template CRUD endpoints. 3) Add template selector when creating new articles. 4) Implement template preview | None | M | **Every article starts from scratch**; no standardized formats for runbooks, FAQs, guides, or procedures | `internal/modules/knowledge/` (new template service), `app/dashboard/knowledge/` (template selector UI) |
| 23 | P3 | **GRC** | No risk treatment workflow UI | 1) Design risk treatment plan UI (mitigation actions, owners, deadlines, status tracking). 2) Add treatment plan creation form. 3) Implement progress tracking dashboard. 4) Wire to risk entity | Risk module backend (exists) | M | **Risks can be identified but not formally treated**; risk register is view-only with no remediation workflow | `app/dashboard/grc/` (risk detail page enhancement), potentially new backend endpoints |
| 24 | P3 | **Platform / Audit** | No NATS-based audit event streaming | 1) Publish audit events to NATS JetStream `audit.>` subject. 2) Implement consumer that persists to audit_log table (replacing direct DB write). 3) Add consumer for real-time audit monitoring dashboard | NATS event architecture (item 10) | M | **Audit events written synchronously in request path**; adds latency; no real-time audit monitoring; no event replay capability | `internal/platform/audit/middleware.go` (publish instead of direct write), new NATS consumer |
| 25 | P3 | **Testing** | No accessibility testing | 1) Install `axe-core` and `@axe-core/react`. 2) Add accessibility checks to component test suite. 3) Add Playwright accessibility scanning to E2E tests. 4) Fix critical accessibility violations | E2E test setup (item 8) for full-page scanning | S | **Accessibility compliance unknown**; potential legal risk under digital accessibility requirements; poor experience for users with disabilities | `package.json` (new dependency), component test files, Playwright test files |

---

## 3. Dependency Graph

The following items have dependencies that must be resolved in order:

```
Item 6 (Session timeout) --> depends on AuthContext having IssuedAt field
Item 8 (E2E tests) ---------> depends on Item 7 (CI/CD pipeline)
Item 10 (NATS events) -------> enables Item 24 (Audit streaming)
Item 9 (Report generation) --> enables Item 20 (CMDB reports)
Item 7 (CI/CD) -------------> enables all automated quality gates
Item 5 (RLS) ----------------> requires coordination with all DB access patterns
Item 25 (A11y testing) ------> depends on Item 8 (E2E tests) for full-page scanning
```

---

## 4. Effort Distribution Summary

| Effort | Count | Items |
|---|---|---|
| **XS** (< 2 hours) | 1 | #18 |
| **S** (2-8 hours) | 5 | #1, #4, #6, #11, #17, #25 |
| **M** (1-3 days) | 11 | #2, #12, #13, #14, #15, #16, #19, #20, #21, #22, #23 |
| **L** (1-2 weeks) | 4 | #3, #7, #8, #9 |
| **XL** (2-4 weeks) | 2 | #5, #10 |

### Total Estimated Effort

| Priority | Items | Estimated Weeks |
|---|---|---|
| P0 (Critical) | 4 | 2-3 weeks |
| P1 (High) | 8 | 8-12 weeks |
| P2 (Medium) | 8 | 4-6 weeks |
| P3 (Low) | 5 | 3-4 weeks |
| **Total** | **25** | **17-25 weeks** (with parallelization: 10-14 weeks) |

---

*Generated 2026-03-02 as part of the ITD-OPMS comprehensive codebase audit. All findings reflect the `dev` branch state.*

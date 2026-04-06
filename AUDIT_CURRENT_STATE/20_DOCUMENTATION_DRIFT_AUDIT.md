# 20. Documentation Drift Audit

## Audit Metadata

| Field | Value |
|---|---|
| **Audit Date** | 2026-03-02 |
| **Branch** | `dev` |
| **Scope** | All documentation files compared against actual codebase implementation |
| **Verdict** | Documentation is comprehensive in scope but contains significant drift from implementation reality; several documented features are partially or fully unimplemented |

---

## 1. Documentation Inventory

### 1.1 Existing Documentation

| Document | Location | Size | Last Updated | Purpose |
|---|---|---|---|---|
| `README.md` | `/README.md` | ~29 KB | Recent | Architecture overview, setup instructions, module descriptions |
| `api-reference.md` | `/docs/` or root | ~58 KB | Recent | Full API endpoint documentation |
| `deployment-runbook.md` | `/docs/` | Medium | Recent | Production deployment procedures |
| `backup-restore-runbook.md` | `/docs/` | Medium | Recent | Backup and restore procedures |
| `dr-failover-runbook.md` | `/docs/` | Medium | Recent | Disaster recovery failover procedures |
| `SERVER_DEPLOYMENT_REQUIREMENTS.md` | `/docs/SERVER_DEPLOYMENT_REQUIREMENTS.md` | Medium | Recent | Hardware and OS requirements |
| `Master.md` | `/docs/Master.md` | Unknown | Unknown | Master reference document |

### 1.2 Missing Documentation

| Document | Need Level | Impact of Absence |
|---|---|---|
| **Architecture Decision Records (ADRs)** | HIGH | No record of why key technology choices were made (e.g., why NATS over RabbitMQ, why sqlc over GORM) |
| **API Changelog** | HIGH | No versioning history; breaking changes cannot be tracked |
| **Entity-Relationship Diagrams** | HIGH | 124 tables with no visual representation of relationships |
| **Module Developer Guides** | MEDIUM | New developers cannot understand module boundaries and interaction patterns |
| **Troubleshooting Guide** | MEDIUM | Operations team has no runbook for common application errors |
| **Contributing Guide** | LOW | No coding standards, PR process, or branch strategy documented |
| **Security Policy** | MEDIUM | No documented security practices, vulnerability disclosure process |
| **Runbook: Monitoring & Alerting** | MEDIUM | 7 alert rules configured but no documented response procedures |

---

## 2. Documentation Drift Analysis

### 2.1 Features Claimed in Documentation But Not Fully Implemented

| Documentation Claim | Source File | Actual Code Reality | Severity | Evidence |
|---|---|---|---|---|
| Email notifications for workflows | README.md (notification system description) | NOT IMPLEMENTED. Outbox pattern schema exists, 31 email templates seeded, but no SMTP provider configured and no outbox processor daemon runs | CRITICAL | `notification_outbox` table exists; `email_templates` seeded; zero SMTP client code; no background worker |
| Teams integration for channel notifications | README.md (integrations section) | NOT IMPLEMENTED. `teams_channel_mappings` table exists but zero webhook or Bot Framework code | HIGH | Migration DDL for `teams_channel_mappings`; no corresponding Go handler or service |
| Distributed tracing with Tempo | README.md / infrastructure docs | NOT FUNCTIONAL. Tempo service runs in Docker Compose with OTLP receiver configured, but zero OpenTelemetry SDK instrumentation exists in Go code | HIGH | `docker-compose.yml` has Tempo service; no `go.opentelemetry.io` import in any `.go` file |
| Report generation (PDF/Excel) | README.md (reporting module) | STUBBED. Report service exists with handler tests passing, but actual PDF/Excel output methods return placeholder data | HIGH | `internal/modules/reporting/report_service.go` -- service methods exist but generation is not wired |
| Event-driven architecture via NATS | README.md (architecture section) | MINIMAL. NATS JetStream enabled but only used for a single directory sync trigger. No event-driven workflow processing | MEDIUM | `nats_published` and `nats_consumed` Prometheus metrics exist but show minimal activity |
| Redis caching for performance | README.md / architecture docs | NOT IMPLEMENTED for caching. Redis is used exclusively for rate limiting (100 req/min/IP). No cache layer for dashboard queries, KPI computations, or session storage | MEDIUM | Rate limiting Lua script present; no `cache.Get`/`cache.Set` patterns anywhere in codebase |
| Full CI/CD pipeline | README.md (development workflow) | INCOMPLETE. Only CodeQL security scanning exists as a GitHub Actions workflow. No automated test execution, lint checks, build verification, or deployment automation | HIGH | `.github/workflows/codeql.yml` is the only workflow file |
| Session timeout enforcement | Architecture docs (security section) | NOT ENFORCED. Middleware exists but is a pass-through with a TODO comment: "Enable session timeout once AuthContext has IssuedAt field" | CRITICAL | `internal/platform/middleware/session.go:22` |

### 2.2 Implemented Features Missing from Documentation

| Implemented Feature | Location in Code | Documentation Gap | Severity | Evidence |
|---|---|---|---|---|
| SSE real-time notifications | `internal/platform/notification/sse.go` | Not documented as an integration point; frontend developers unaware of SSE endpoint contract | MEDIUM | SSE handler with 30s keepalive, per-user channels, 64-event buffer |
| Vault module (credential management) | `internal/modules/vault/`, `app/dashboard/vault/` | Not mentioned in API reference or module overview (or only briefly) | MEDIUM | Full CRUD service (1,592 lines), frontend page (1,651 lines) |
| Automation engine | `internal/modules/automation/`, `app/dashboard/system/automation/` | Not documented; rule engine capabilities unknown to operators | MEDIUM | Backend service + frontend rule builder (1,784 lines) |
| Custom fields system | `internal/modules/customfields/`, `app/dashboard/system/custom-fields/` | Not documented; extensibility mechanism unknown to module developers | MEDIUM | Dynamic field definition and rendering system |
| Vendor management module | `internal/modules/vendor/` | Backend exists but not documented in module overview | LOW | Service file (1,183 lines) |
| Approval workflow engine | `internal/modules/approval/` | Cross-cutting approval workflow not documented as a platform capability | MEDIUM | Service file (1,173 lines) with multi-stage approval logic |
| Health check endpoints | `GET /health`, `/system/health/*` | Endpoint contracts not in API reference | LOW | Public and authenticated health check routes |
| Prometheus metrics | 7 custom metrics exposed at `/metrics` | Metric names and labels not documented for operations team | MEDIUM | `http_requests_total`, `http_request_duration`, `db_query_duration`, etc. |

### 2.3 Incorrect or Misleading Setup Instructions

| Documentation Claim | Source File | Actual Code Reality | Severity | Evidence |
|---|---|---|---|---|
| Environment variable documentation may reference email/SMTP configuration | README.md or `.env.example` | SMTP variables may be documented as required but the system does not use them (no outbox processor) | MEDIUM | Environment template may list SMTP vars that are never read |
| Docker Compose "just works" for full stack | README.md (quick start) | Requires MinIO bucket creation, database migration execution, and seed data loading -- these steps may not be fully automated in compose | LOW | `docker-compose.yml` starts services but init steps may need manual intervention |
| Test execution instructions | README.md (development section) | `go test ./...` will hit 1 FAILING test (OKR nil pool); documentation does not warn about known failures | MEDIUM | OKR handler test panics with nil pointer |

### 2.4 Stale or Incorrect Architecture Claims

| Documentation Claim | Source File | Actual Code Reality | Severity | Evidence |
|---|---|---|---|---|
| Multi-tenant architecture with data isolation | Architecture docs | Application-level `tenant_id` filtering exists but no PostgreSQL Row-Level Security (RLS); a single SQL injection or missed WHERE clause exposes all tenants | HIGH | No `CREATE POLICY` statements in any migration file |
| "Comprehensive audit trail" | Security/compliance docs | Audit middleware captures successful operations but does NOT log failed authentication attempts, configuration changes, or role assignment changes | MEDIUM | `internal/platform/audit/middleware.go` -- captures request/response; no explicit failed-auth capture |
| "Role-based access control" | Architecture docs | RBAC infrastructure exists (roles, permissions tables, `RequirePermission` middleware) but middleware is NOT applied to 8+ modules: ITSM, CMDB, Knowledge, GRC, Reporting, Vault, Automation, CustomFields | CRITICAL | Handler registration in `server.go` shows which routes have middleware applied |

---

## 3. API Documentation Drift

### 3.1 API Reference Completeness

| Module | Endpoints Documented | Endpoints Implemented | Drift | Notes |
|---|---|---|---|---|
| **Governance** | Yes | Yes | LOW | Generally aligned |
| **Planning** | Yes | Yes | LOW | Generally aligned |
| **ITSM** | Yes | Yes | LOW | Generally aligned |
| **CMDB** | Partial | Yes | MEDIUM | Some newer endpoints may not be in docs |
| **Knowledge** | Partial | Yes | MEDIUM | Search endpoint behavior may differ from docs |
| **GRC** | Partial | Yes | MEDIUM | Access review endpoints may be undocumented |
| **Reporting** | Documented | Stubbed | HIGH | Docs describe PDF/Excel generation that returns placeholder data |
| **Vault** | Minimal | Yes | HIGH | Full CRUD exists but API docs incomplete |
| **Automation** | Minimal | Yes | HIGH | Rule engine API exists but docs incomplete |
| **Custom Fields** | Minimal | Yes | HIGH | Dynamic field API exists but docs incomplete |
| **Vendor** | Minimal | Yes | HIGH | Vendor management API exists but docs incomplete |
| **Approval** | Minimal | Yes | HIGH | Approval workflow API exists but docs incomplete |
| **Health** | Undocumented | Yes | MEDIUM | `/health` and `/system/health/*` not in API reference |

---

## 4. Operational Runbook Accuracy

### 4.1 Deployment Runbook

| Section | Accuracy | Notes |
|---|---|---|
| Service startup order | LIKELY ACCURATE | Docker Compose handles dependency ordering |
| Environment variables | PARTIALLY ACCURATE | May reference unimplemented features (SMTP, Teams) |
| Health verification | ACCURATE | `/health` endpoint correctly documented |
| Rollback procedures | UNVERIFIED | Rollback steps exist but have not been tested against actual deployment |

### 4.2 Backup & Restore Runbook

| Section | Accuracy | Notes |
|---|---|---|
| PostgreSQL backup | ACCURATE | `scripts/backup.sh` with pg_dump matches documentation |
| MinIO backup | LIKELY ACCURATE | Object storage sync documented |
| Restore procedures | UNVERIFIED | Restore steps documented but never tested in drill |
| Backup schedule | NOT AUTOMATED | Documented as if automated but no cron/scheduler configured |

### 4.3 DR Failover Runbook

| Section | Accuracy | Notes |
|---|---|---|
| Failover procedures | UNVERIFIED | Procedures documented but infrastructure for DR not observed |
| RTO/RPO targets | NOT DEFINED | Runbook exists but does not specify recovery time/point objectives |
| Communication plan | PRESENT | Escalation contacts documented |

---

## 5. Drift Severity Summary

| Severity | Count | Examples |
|---|---|---|
| **CRITICAL** | 3 | Session timeout docs vs. pass-through reality; RBAC docs vs. missing middleware; email notification docs vs. no delivery |
| **HIGH** | 6 | Report generation, Teams integration, distributed tracing, CI/CD pipeline, multi-tenant claims, newer module API docs |
| **MEDIUM** | 8 | Redis caching claims, NATS architecture claims, SSE undocumented, vault/automation/custom-fields docs incomplete |
| **LOW** | 3 | Docker setup nuances, vendor module docs, health endpoint docs |

---

## 6. Recommendations

### 6.1 Immediate Actions

1. **Add "Known Limitations" section to README.md** -- Explicitly list: email not implemented, Teams not implemented, Tempo not instrumented, report generation stubbed, session timeout not enforced.
2. **Update security claims** -- Remove or qualify claims about "comprehensive RBAC" and "multi-tenant isolation" until middleware is applied to all modules and RLS is implemented.
3. **Document the failing test** -- Add a note about the OKR nil pool panic so developers running tests are not surprised.

### 6.2 Short-Term Actions

4. **Complete API reference for newer modules** -- Document Vault, Automation, Custom Fields, Vendor, and Approval endpoints.
5. **Add ER diagrams** -- Generate from migration files or database introspection; include in docs.
6. **Create ADR templates and initial records** -- Document decisions for NATS, sqlc, Entra ID, and multi-tenant architecture.

### 6.3 Medium-Term Actions

7. **Create module developer guides** -- For each of the 15 modules, document: purpose, key entities, API endpoints, frontend pages, test coverage.
8. **Create troubleshooting guide** -- Document common errors, log locations, health check interpretation, and escalation procedures.
9. **Establish documentation update process** -- Require docs update as part of PR checklist; add docs-check to CI.

---

*Generated 2026-03-02 as part of the ITD-OPMS comprehensive codebase audit. All findings reflect the `dev` branch state.*

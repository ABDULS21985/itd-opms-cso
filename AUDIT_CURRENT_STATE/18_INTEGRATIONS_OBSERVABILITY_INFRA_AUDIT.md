# 18. Integrations, Observability & Infrastructure Audit

## Audit Metadata

| Field | Value |
|---|---|
| **Audit Date** | 2026-03-02 |
| **Branch** | `dev` |
| **Scope** | All third-party integrations, observability stack, infrastructure configuration |
| **Verdict** | Infrastructure is well-scaffolded but significantly underutilized; several integrations are configured but not wired |

---

## 1. Integration Inventory

### 1.1 Authentication & Identity

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Entra ID OIDC** | SSO authentication for all users | PKCE flow with JWKS caching (1hr TTL), auto-provisioning users from token claims | WORKING | No token revocation mechanism; session timeout middleware is a pass-through (TODO in code) | `internal/platform/auth/`, `internal/platform/middleware/session.go:22` |
| **Dev JWT Provider** | Local development authentication | Fully functional JWT issuer for dev mode, bypasses Entra ID | WORKING (dev only) | No safeguard preventing dev JWT provider from being enabled in production builds | `internal/platform/auth/jwt.go` |

### 1.2 Microsoft Ecosystem

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Microsoft Graph** | Directory sync, org chart population | `msgraph.NewClient` instantiated with circuit breaker pattern; used exclusively for directory sync trigger | PARTIAL | Only triggered via NATS message; no scheduled sync, no incremental delta queries, no photo sync | `internal/platform/` (Graph client setup) |
| **Email (Exchange/SMTP)** | Notification delivery for workflows | NOT IMPLEMENTED. Outbox pattern ready in schema (`notification_outbox` table), 31 email templates seeded in DB, notification orchestrator stubbed | NOT WORKING | No SMTP provider configured; no outbox processor daemon; all workflow notifications are silent | `internal/platform/notification/`, migrations for `notification_outbox` and `email_templates` |
| **Teams Integration** | Channel notifications for incidents/approvals | `teams_channel_mappings` table exists in migrations; NO webhook implementation, NO adaptive card templates, NO Teams bot | NOT WORKING | Table schema exists but zero application code references Teams webhooks or Microsoft Bot Framework | `migrations/` (teams_channel_mappings DDL), no matching handler/service code |

### 1.3 Real-Time Communication

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **SSE (Server-Sent Events)** | Real-time in-app notifications | Fully implemented: 30s keepalive, per-user channels, 64-event buffer, reconnection support | WORKING | No persistence of missed events across server restarts; buffer is in-memory only (no Redis pub-sub fallback) | `internal/platform/notification/sse.go`, `sse_test.go` |

### 1.4 Data Stores & Messaging

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **PostgreSQL** | Primary relational database | 124 tables, 37 migrations, sqlc-generated queries (3,758 lines across 13 query files) | WORKING | No Row-Level Security (RLS) policies; no connection pool tuning beyond defaults; no read replicas | `migrations/`, `internal/shared/db/` |
| **Redis** | Rate limiting, caching, sessions, pub-sub | Rate limiting ONLY: 100 req/min/IP via Lua script. NOT used for caching, sessions, or pub-sub | UNDERUTILIZED | Dashboard/KPI queries hit PostgreSQL directly on every request; no cache layer; SSE could benefit from Redis pub-sub for horizontal scaling | `internal/platform/middleware/` (rate limiter), `docker-compose.yml` (Redis service) |
| **NATS JetStream** | Event-driven architecture, workflow triggers | JetStream enabled but used ONLY for directory sync trigger. No event streams for audit, notifications, workflow state changes | SEVERELY UNDERUTILIZED | JetStream subjects defined but only 1 is actively published/consumed; no dead-letter queue; no consumer groups for scaling | `internal/platform/` (NATS connection), Prometheus metrics (`nats_published`, `nats_consumed`) |
| **MinIO** | Document/attachment/evidence storage | Fully functional: 3 buckets (attachments, evidence, reports), presigned URLs (15min expiry), server-side encryption enabled in prod compose | WORKING | No lifecycle policies for object expiration; no virus scanning on upload; bucket policies not verified for least-privilege | `docker-compose.yml`, `docker-compose.prod.yml`, handler code referencing MinIO client |

### 1.5 CI/CD & Build

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **GitHub Actions** | CI/CD pipeline | ONLY CodeQL security scanning workflow. NO automated test execution, NO lint checks, NO build verification, NO deployment automation | CRITICALLY INCOMPLETE | Any merge to `main` or `dev` has zero quality gates; regressions can ship silently; no artifact publishing | `.github/workflows/codeql.yml` |
| **Docker** | Container build & orchestration | Multi-stage Alpine build for API; 10-service compose stack; prod overrides with CPU/memory resource limits | WORKING | No container health checks in Dockerfile (only application-level `/health`); no image signing or vulnerability scanning | `itd-opms-api/Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` |

---

## 2. Observability Stack Assessment

### 2.1 Metrics (Prometheus)

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Prometheus** | Application metrics collection | 7 custom metrics exposed: `http_requests_total`, `http_request_duration`, `db_query_duration`, `db_active_connections`, `sla_breaches_total`, `nats_published`, `nats_consumed` | WORKING | No business-level metrics (e.g., active users, ticket resolution time, SLA compliance %); no retention policy configured; no remote write for long-term storage | `internal/platform/` (metrics registration), `prometheus.yml` |
| **Alert Rules** | Proactive incident detection | 7 alert rules defined (high error rate, slow responses, DB connection exhaustion, SLA breaches, NATS lag) | WORKING | No PagerDuty/OpsGenie integration; Alertmanager configured but no notification receivers beyond default | Prometheus alert rules config |

### 2.2 Logging (Loki)

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Loki** | Centralized log aggregation | Configured as Docker Compose service; receiving logs from all containers | PARTIAL | NO retention policy configured (logs grow unbounded); no structured logging standard enforced in Go code; no log-based alerting rules | `docker-compose.yml` (Loki service), Grafana datasource provisioning |

### 2.3 Tracing (Tempo)

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Tempo** | Distributed tracing | OTLP receiver configured and running as Docker service | NOT FUNCTIONAL | NO OpenTelemetry SDK instrumentation in Go code; zero traces being generated; Tempo is receiving nothing despite being deployed | `docker-compose.yml` (Tempo service), absence of `go.opentelemetry.io` imports in Go source |

### 2.4 Dashboards (Grafana)

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Grafana** | Operational dashboards | 2 auto-provisioned dashboards: "Platform Health" and "API Performance"; datasources for Prometheus, Loki, and Tempo auto-configured | WORKING | No business dashboards (SLA compliance, ticket volumes, user activity); Tempo datasource configured but useless without traces; no RBAC on Grafana access | Grafana provisioning configs |

### 2.5 Health Checks

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Health Endpoints** | Service liveness & readiness | Public `GET /health` checks PostgreSQL, Redis, NATS, MinIO connectivity. Authenticated `/system/health/*` provides detailed per-service stats | WORKING | No Kubernetes-style separate liveness/readiness probes; no startup probe for slow-starting dependencies; health check does not verify migration state | `internal/platform/server/` (health handler registration) |

---

## 3. Infrastructure Configuration

### 3.1 Docker Compose Services (10 total)

| Service | Image | Purpose | Resource Limits (Prod) | Health Check | Notes |
|---|---|---|---|---|---|
| `api` | Custom multi-stage Alpine | Go API server | Yes (CPU + memory in prod override) | Application-level `/health` | No Dockerfile health check instruction |
| `postgres` | postgres:16 | Primary database | Yes | pg_isready | No pgBouncer; no read replicas |
| `redis` | redis:7 | Rate limiting only | Yes | redis-cli ping | Massively underutilized |
| `nats` | nats:latest | JetStream messaging | Yes | nats-server health | Only 1 active subject |
| `minio` | minio/minio | Object storage | Yes | mc ready | 3 buckets configured |
| `prometheus` | prom/prometheus | Metrics collection | Yes | N/A | 7 custom metrics, 7 alert rules |
| `alertmanager` | prom/alertmanager | Alert routing | Yes | N/A | No external notification receivers |
| `grafana` | grafana/grafana | Dashboards | Yes | N/A | 2 dashboards, 3 datasources |
| `loki` | grafana/loki | Log aggregation | Yes | N/A | No retention policy |
| `tempo` | grafana/tempo | Distributed tracing | Yes | N/A | Receiving zero traces |

### 3.2 Backup & Recovery

| Component | Claimed Use | Actual Use Found | Status | Gaps | Evidence |
|---|---|---|---|---|---|
| **Backup Script** | Database backup automation | `scripts/backup.sh` exists with pg_dump, MinIO sync, and compression | PRESENT | No automated scheduling (no cron entry); no backup verification/restore testing documented; no offsite backup target | `scripts/backup.sh` |
| **Runbooks** | Operational procedures | `deployment-runbook.md`, `backup-restore-runbook.md`, `dr-failover-runbook.md` present in docs | PRESENT | DR runbook references procedures not yet validated; no RTO/RPO targets defined | `docs/` directory |

---

## 4. Integration Gap Analysis Summary

### 4.1 Underutilization Score

| Component | Utilization | Potential | Gap |
|---|---|---|---|
| Redis | 10% | Rate limiting, session cache, dashboard cache, SSE pub-sub | 90% unused capacity |
| NATS JetStream | 5% | Event-driven architecture, audit streaming, workflow triggers, notification fanout | 95% unused capacity |
| Tempo | 0% | Distributed tracing across all API requests | 100% -- deployed but producing zero value |
| Loki | 50% | Log aggregation + alerting + retention | Missing retention and alerting policies |
| Prometheus | 60% | Custom metrics + business metrics + SLA tracking | Missing business-level metrics |
| Email | 0% | Workflow notifications, approvals, escalations | Schema ready, zero delivery capability |
| Teams | 0% | Channel notifications for incidents | Schema-only, zero implementation |

### 4.2 Critical Integration Gaps Ranked by Business Impact

| Rank | Gap | Business Impact | Effort to Resolve |
|---|---|---|---|
| 1 | Email delivery not implemented | All workflow notifications are silent; approvals, escalations, SLA breaches go unnoticed | M (configure SMTP, implement outbox processor) |
| 2 | No CI/CD pipeline beyond CodeQL | Zero quality gates; regressions ship to production undetected | L (GitHub Actions for test/lint/build/deploy) |
| 3 | Redis not used for caching | Every dashboard/KPI/list request hits PostgreSQL directly; performance degrades under load | M (add cache layer for read-heavy endpoints) |
| 4 | NATS JetStream underutilized | No event-driven workflows; audit events not streamed; no async processing | L (design event schema, implement producers/consumers) |
| 5 | Tempo receiving zero traces | No visibility into request flow across services; debugging production issues requires log correlation only | S (add OTEL SDK instrumentation to Go handlers) |
| 6 | Teams webhooks not implemented | Incident channels cannot be auto-notified; approval workflows lack Teams integration | M (implement webhook sender, adaptive cards) |
| 7 | Loki has no retention policy | Log storage grows unbounded; disk exhaustion risk in production | XS (add retention config to loki.yml) |
| 8 | No token revocation | Compromised tokens remain valid until expiry; no force-logout capability | M (implement revocation list in Redis) |

---

## 5. Recommendations

### 5.1 Immediate Actions (Week 1-2)

1. **Configure Loki retention policy** -- Add `retention_period: 720h` (30 days) to prevent unbounded disk growth.
2. **Add OTEL instrumentation** -- Install `go.opentelemetry.io/otel` SDK; instrument HTTP middleware and DB calls. Tempo is already deployed and waiting.
3. **Implement email outbox processor** -- Configure SMTP provider; build background worker that polls `notification_outbox` table and sends via configured provider.

### 5.2 Short-Term Actions (Week 3-6)

4. **Build CI/CD pipeline** -- GitHub Actions workflow: `go test`, `golangci-lint`, `npm run test`, `npm run build`, Docker image build, deploy to staging.
5. **Implement Redis caching** -- Cache dashboard aggregation queries and KPI computations with appropriate TTLs (30s-5min).
6. **Design NATS event schema** -- Define event types for audit, notifications, workflow state changes. Implement producers in handlers, consumers in background workers.

### 5.3 Medium-Term Actions (Week 7-12)

7. **Implement Teams webhook integration** -- Wire `teams_channel_mappings` to actual webhook delivery for incident and approval notifications.
8. **Add business metrics to Prometheus** -- Track active users, ticket resolution time, SLA compliance percentage, approval turnaround time.
9. **Implement token revocation** -- Use Redis SET for revoked token JTIs; check on every authenticated request.
10. **Add Grafana business dashboards** -- SLA compliance, module usage, user activity, system throughput.

---

*Generated 2026-03-02 as part of the ITD-OPMS comprehensive codebase audit. All findings reflect the `dev` branch state.*

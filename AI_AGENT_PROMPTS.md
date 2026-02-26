# ITD-OPMS: 10 AI Agent Prompts for End-to-End Implementation

> **System**: ITD-AMD Operations & Performance Management System (ITD-OPMS)
> **Organization**: Central Bank of Nigeria — Information Technology Department
> **Architecture**: TOGAF 10 Aligned | 7 Domains | 100 Capabilities | 280+ Requirements
> **Baseline Reference**: talent-api (NestJS) + talent-portal (Next.js 16)
> **Target Stack**: Go modular monolith + Next.js 16 + PostgreSQL + MinIO + NATS + Redis

---

## Prompt Sequence & Phase Mapping

| # | Prompt | Phase | Weeks | Domains/Requirements |
|---|--------|-------|-------|---------------------|
| 1 | Foundation — Scaffolding, Multi-Tenant DB, Audit Framework | Foundation | 1–2 | Platform Core, BR-001 to BR-010 |
| 2 | Microsoft 365 Integration — Entra ID SSO, Graph API, Notifications | Foundation | 1–2 | IR-001 to IR-012 |
| 3 | Division Governance & Organisation | Governance+PMO | 3–5 | Domain A: FR-A001 to FR-A022 |
| 4 | Work Planning, PMO & Execution | Governance+PMO | 3–5 | Domain C: FR-C001 to FR-C020 |
| 5 | IT Service Management (ITSM) Core | ITSM Core | 6–8 | Domain D: FR-D001 to FR-D034 |
| 6 | Asset, Configuration & Inventory (CMDB) | CMDB+Evidence | 9–10 | Domain E: FR-E001 to FR-E012 |
| 7 | People, Workforce & Admin | Governance+PMO + Post-MVP | 3–5+ | Domain B: FR-B001 to FR-B016 |
| 8 | Knowledge Management + GRC/Audit Readiness | GRC+Reporting | 11–12 | Domain F: FR-F001-F010, Domain G: FR-G001-G014 |
| 9 | Dashboards, Executive Reporting, Analytics & Search | Cross-Cutting | All | BR-004, BR-013, NFR-004-005 |
| 10 | Security, NFRs, Testing, DevOps & Production Readiness | Stabilisation | 13–14 | NFR-001-027, SR-001-020, DRA-001-012, INR-001-013 |

---

## PROMPT 1: Foundation — Project Scaffolding, Multi-Tenant Data Architecture & Audit Event Framework

```
You are a senior full-stack engineer building ITD-OPMS (Operations & Performance Management System)
for the Central Bank of Nigeria's IT Department. This is a TOGAF 10-aligned, audit-ready, multi-tenant
enterprise platform with 7 capability domains and 100+ capabilities.

TECH STACK (MANDATORY — per Solution Architecture ADR decisions):
- Backend: Golang modular monolith with bounded contexts (NOT NestJS — migrating from TypeScript baseline to Go as mandated by CBN architecture standards ADR-001)
- Frontend: Next.js 16 + TypeScript + shadcn/ui + Tailwind CSS (reuse patterns from talent-portal)
- Database: PostgreSQL 16 with tenant_id on all scoped tables, JSONB for flexible attributes
- Object Storage: MinIO (S3-compatible) for evidence vault and attachments
- Event Bus: NATS JetStream for async domain events, notifications, and retry/DLQ
- Cache: Redis 7 for caching, rate limiting, background jobs
- Identity: Microsoft Entra ID via OIDC/PKCE (NO local credentials stored)
- Observability: OpenTelemetry → Prometheus + Grafana + Loki + Tempo
- Deployment: Docker Compose on Linux VMs

YOUR TASK — Phase 1: Foundation (Weeks 1-2)

1. Project Structure & Scaffolding
Create the Go backend project as a modular monolith:

itd-opms-api/
├── cmd/api/main.go
├── internal/
│   ├── platform/           (config, database, middleware, audit, auth, tenant, rbac, notification, workflow, sla, evidence, search, server)
│   ├── modules/            (governance, people, planning, itsm, cmdb, knowledge, grc, reporting)
│   └── shared/             (types, helpers, errors)
├── migrations/
├── docker-compose.yml
├── Dockerfile
└── Makefile

2. Database Foundation (Migrations 001-005)
- 001: tenants, org_units, org_hierarchy (closure table)
- 002: users (entra_id based), roles, role_bindings, delegations — seed 7 system roles
- 003: audit_events (APPEND-ONLY, SHA-256 checksums, NO UPDATE/DELETE)
- 004: approval_chains, approval_steps, signoffs
- 005: documents, evidence_items

3. Authentication & Tenant Resolution Middleware
- OIDC/PKCE with Entra ID, JWT validation, security group → role mapping
- Tenant resolution from claims + org_hierarchy, inject AuthContext

4. RBAC/ABAC Authorization Engine
- 7 roles, hybrid RBAC+ABAC, delegation support, audit all decisions

5. Audit Event Framework
- Immutable append-only, SHA-256 checksums, evidence_refs, query API

6. Docker Compose with all services (postgres, redis, minio, nats, grafana stack)

7. Frontend Foundation (Next.js shell)
- OIDC/PKCE login, httpOnly cookies, role-aware sidebar, CBN-branded theme
- Reuse patterns from talent-portal (DataTable, FormField, StatusBadge, etc.)

REFERENCE: Study talent-api and talent-portal codebases for patterns to adapt.
```

---

## PROMPT 2: Microsoft 365 Integration — Entra ID SSO, Graph API, Email & Teams Notifications

```
Build the Microsoft 365 integration layer for ITD-OPMS.

1. Entra ID OIDC Authentication (IR-001 to IR-005)
- Backend: JWT validation (issuer, audience, RS256/JWKS, expiry), group→role mapping, token refresh
- Frontend: OIDC/PKCE flow, httpOnly cookies, silent refresh, 30min timeout

2. Organizational Directory Sync (IR-006, IR-007)
- Delta sync from Graph API (/users with $deltatoken) every 15 minutes
- Map department→tenant, officeLocation→org unit, manager→hierarchy
- Reconciliation report, audit events for all changes

3. Email Notification Delivery (IR-008, IR-011, IR-012)
- Graph sendMail API with outbox pattern for reliability
- Template-driven (SLA breach, approval request, escalation, renewal, major incident)
- Retry with exponential backoff, DLQ for permanent failures
- Rate limit handling with batching

4. Teams Channel Notifications (IR-009, IR-010)
- Graph Teams API with Adaptive Cards (approve/reject buttons)
- Configurable channel mapping per tenant and notification type

5. Notification Orchestrator
- Listen to NATS domain events, resolve recipients, check preferences
- Route to email/Teams/in-app, support digest mode, DLQ monitoring

6. Frontend Notification Center
- Bell icon with badge, notification panel, preferences settings, real-time WebSocket
```

---

## PROMPT 3: Domain A — Division Governance & Organisation Module

```
Build Governance module (FR-A001 to FR-A022):

1. Policy Management (MUST): lifecycle (Draft→Review→Approve→Publish→Retire), version control
   with diff, approval workflows, attestation campaigns, scoped visibility, expiry notifications

2. RACI Matrix Management (MUST): create/maintain matrices, enforce single Accountable,
   coverage reports

3. Meetings & Decisions (MUST): meeting management with agenda/minutes, decision logging with
   rationale/attendees, action items with owner/due date/status/evidence, overdue dashboards

4. OKR Cascade (SHOULD): department→unit OKRs with parent-child alignment, configurable scoring,
   KPI definition with threshold alerts, org chart visualization

Frontend: Policy directory, RACI grid editor, meeting/decision tracker, OKR tree view,
governance dashboard
```

---

## PROMPT 4: Domain C — Work Planning, PMO & Execution Module

```
Build Planning/PMO module (FR-C001 to FR-C020):

1. Portfolio & Roadmap (MUST): portfolios with projects, Gantt timeline, dependencies, RAG status,
   project initiation with charter/scope/approval workflow

2. WBS & Task Management (MUST): hierarchical work items (epic→story→task→subtask),
   kanban board (drag-drop), milestone tracking with burn-down, effort tracking (actual vs estimated),
   configurable status workflow

3. Risk, Issue & Change (MUST): risk register (likelihood×impact scoring), issue tracker with
   escalation, change request management with approval chains

4. Reporting (MUST/SHOULD): auto-generated status reports, portfolio analytics, resource
   utilization heatmap, benefits realization tracking, PIR templates
```

---

## PROMPT 5: Domain D — IT Service Management (ITSM) Core Module

```
Build ITSM module (FR-D001 to FR-D034) — LARGEST module, ITIL 4-aligned:

1. Service Catalog (MUST): hierarchical categories, dynamic form schemas (JSONB),
   entitlement-based visibility, SLA policy linkage

2. Incident Management (MUST — CRITICAL): ticket lifecycle (Logged→Classified→Assigned→
   In Progress→Resolved→Closed), auto-priority from urgency×impact matrix, multi-channel
   creation, related incident linking, major incident with communication plan + PIR

3. SLA Engine (MUST): policy definition per priority, real-time countdown timers,
   business hours calendars with holidays, pause/resume for pending states,
   breach warnings at 80%/100%, multi-level escalation chains

4. Service Request Fulfilment (MUST): catalog-driven forms, configurable approval chains,
   status tracking with estimated delivery

5. Problem Management (MUST): problem records from incidents, RCA templates, known error
   database with workarounds linked to KB

6. Queue Management (MUST): configurable queues, auto-assignment (round-robin/skills/workload)

7. CSAT Surveys (SHOULD): trigger after closure, 1-5 rating, aggregate per service/team/agent

8. ITSM Dashboard (MUST): real-time metrics, SLA compliance charts, backlog aging, team performance

Performance: ticket list API ≤500ms at 500K records, cursor-based pagination
```

---

## PROMPT 6: Domain E — Asset, Configuration & Inventory (CMDB) Module

```
Build CMDB module (FR-E001 to FR-E012):

1. Asset Lifecycle (MUST): registration with type-specific attributes (JSONB), lifecycle
   (Procured→Received→Active→Maintenance→Retired→Disposed), tagging/location/owner tracking,
   disposal with approval workflow + certificate in evidence vault

2. CMDB & Relationships (MUST/SHOULD): CI types and attributes, relationship types
   (runs_on, depends_on, connected_to, managed_by), topology visualization,
   reconciliation engine with discrepancy reporting

3. License/Warranty/Renewal (MUST): license compliance (assigned vs entitled),
   warranty tracking, renewal alerts at 90/60/30 days, asset reporting

Target: ≥90% CMDB accuracy within 90 days (BR-006)
```

---

## PROMPT 7: Domain B — People, Workforce & Admin Module

```
Build People module (FR-B001 to FR-B016):

1. Skills & Competency (SHOULD): skills inventory per user, proficiency levels,
   skills search, gap analysis, competency framework

2. Onboarding/Offboarding (MUST): configurable checklist templates per role, progress
   tracking with overdue alerts, access revocation tracking, completion evidence for audit

3. Roster/Leave/Capacity (SHOULD): shift schedules, leave tracking with capacity impact,
   capacity planning (available vs allocated hours), workload balance reporting

4. Training & Development (SHOULD): training/certification tracking with expiry dates,
   expiry alerts (90/60/30 days), workforce analytics dashboard
```

---

## PROMPT 8: Domain F (Knowledge) + Domain G (GRC/Audit) Modules

```
Build Knowledge module (FR-F001-F010) and GRC module (FR-G001-G014):

KNOWLEDGE:
1. Knowledge Base: article lifecycle (Draft→Review→Published→Archived), Markdown editor,
   categorization/tagging, full-text search, templates per type, usage metrics,
   KB integration in service request portal

2. Workspaces & Search: team workspaces, global search across all modules,
   announcements, document management

GRC/AUDIT (CRITICAL for CBN):
1. Risk Management (MUST): risk register with likelihood×impact scoring, heat map,
   monitoring with review scheduling, auto-escalation on threshold breach

2. Audit Preparation (MUST): audit management with scope/timeline/evidence requirements,
   automated evidence collection workflows, evidence vault (immutable, SHA-256),
   audit readiness scoring — TARGET: evidence pack within 4 hours (BR-002)

3. Access Reviews (MUST): periodic campaigns with manager attestation, exception handling
   with justification/expiry, compliance control mapping to frameworks (ISO27001, COBIT)

4. Compliance dashboards, policy attestation integration, GRC reporting
```

---

## PROMPT 9: Cross-Cutting — Dashboards, Executive Reporting & Analytics

```
Build the reporting and analytics layer:

1. Executive Dashboard (MUST, BR-004): aggregated KPIs across all 7 domains,
   tenant-scoped views, role-specific personal dashboards, load ≤5 seconds (NFR-004)

2. Executive Pack Generator (SHOULD, BR-013): auto-generated monthly reports,
   PDF export with CBN branding, scheduled distribution via email

3. Domain Dashboards: ITSM (ticket volumes, SLA compliance, backlog), PMO (portfolio RAG,
   delivery %, milestones), CMDB (asset inventory, license compliance), GRC (risk heat map,
   audit readiness, access reviews)

4. Global Search (SHOULD, NFR-005): unified search across all entities,
   command palette (Cmd+K), results ≤2 seconds

5. Data Export: CSV/Excel export from all list views, report builder with scheduling

Implementation: Redis-cached aggregations (5min TTL), materialized views,
background refresh jobs, Recharts for charts, skeleton loading states
```

---

## PROMPT 10: Security, NFRs, Testing, DevOps & Production Readiness

```
Final hardening and production readiness:

1. SECURITY (SR-001 to SR-020): verify no stored credentials, session timeouts,
   RBAC/ABAC enforcement, tenant isolation, delegation security, TLS 1.2+, AES-256 at rest,
   Docker secrets, CSRF, security headers, rate limiting, field masking,
   immutable audit with checksums, 7-year retention

2. PERFORMANCE (NFR-001 to NFR-008): benchmark all endpoints (page ≤3s, API ≤500ms,
   dashboard ≤5s, search ≤2s), support 200 concurrent users, 500K records/table,
   database index optimization, connection pooling, Redis caching, load testing

3. DATA QUALITY (DRA-001 to DRA-012): tenant_id on all tables, RLS policies,
   FK constraints, input validation, idempotency, metadata columns, classification,
   retention tags, disposal evidence

4. OBSERVABILITY: Prometheus metrics (HTTP, DB, Redis, NATS, SLA, business),
   Grafana dashboards (6 key dashboards), Loki logging (structured JSON),
   Tempo tracing (OpenTelemetry), alerting (Critical→Low severity levels)

5. DOCKER COMPOSE PROD: resource limits, health checks, network isolation,
   secrets management, log rotation

6. DISASTER RECOVERY: WAL archiving (RPO ≤15min), daily backups (30-day retention),
   warm standby DR, failover script (RTO ≤4hrs), quarterly DR drills with evidence

7. TESTING: unit tests (>80% coverage), integration tests (tenant isolation, RBAC, SLA),
   E2E tests (Playwright: login, ticket lifecycle, policy workflow, asset disposal),
   security tests (OWASP Top 10, authz bypass, cross-tenant)

8. DOCUMENTATION: OpenAPI specs, deployment/backup/DR/incident runbooks,
   configuration guide, user guides per role

9. ACCESSIBILITY: responsive desktop (Chrome/Edge/Firefox), role-aware navigation,
   WCAG 2.1 AA compliance, usability testing
```

---

## Key Architecture Decisions Reflected in Prompts

| Decision | Rationale |
|----------|-----------|
| **Go backend** (not NestJS) | ADR-001: CBN mandated; high performance, small footprint |
| **Modular monolith** | ADR-002: Simple deployment, single DB transactions, can evolve to microservices |
| **PostgreSQL only** | ADR-003: Enterprise-grade, JSONB, RLS for tenant isolation |
| **Entra ID only** | ADR-004: CBN standard; no local credentials |
| **Docker Compose** | ADR-005: Simpler than K8s for initial scale; migration path exists |
| **Outbox pattern** | ADR-006: Guarantees no notification loss |
| **MinIO** | ADR-007: S3-compatible, on-premises, cloud-migratable |
| **NATS JetStream** | ADR-008: Lightweight, persistent, simpler than Kafka |
| **Next.js + shadcn/ui** | ADR-009/010: SSR, React ecosystem, accessible, CBN-brandable |

## Reuse from Existing Codebases

**From talent-api (adapt to Go):**
- Module structure (controller → service → repository → entity)
- Guard/middleware patterns (auth, roles, permissions, rate limiting)
- Base entity pattern (UUID PK, timestamps, soft delete)
- Response envelope pattern
- Audit logging pattern
- Notification patterns (outbox, templates, preferences)

**From talent-portal (reuse directly):**
- Auth provider pattern → adapt for OIDC/PKCE
- API client with token injection
- Role-aware sidebar navigation
- DataTable, FormField, StatusBadge, ConfirmDialog components
- React Query hooks pattern
- Animation variants (Framer Motion)
- Theme provider with dark mode
- Command palette (Cmd+K)
- Kanban board (dnd-kit)

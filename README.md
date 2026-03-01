# ITD-OPMS

**CBN IT Department Operations & Performance Management System**

A full-stack enterprise platform for managing IT operations, governance, service delivery, asset management, and compliance across the Central Bank of Nigeria's IT Department.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Domain Modules](#domain-modules)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database](#database)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Frontend](#frontend)
- [Observability](#observability)
- [Deployment](#deployment)
- [Development](#development)
- [Documentation](#documentation)

---

## Overview

ITD-OPMS is a comprehensive operations management system spanning **7 domain modules** with **100+ capabilities** across 280+ functional requirements. It provides end-to-end coverage for IT governance, project planning, service management, asset tracking, knowledge management, and governance/risk/compliance (GRC).

### Key Capabilities

- **Policy lifecycle management** with attestation campaigns and RACI matrices
- **Portfolio & project management** with WBS trees, Gantt charts, and risk heat maps
- **ITSM ticketing** with SLA timers, escalation rules, and CSAT surveys
- **Configuration management** with CI topology, license compliance, and warranty tracking
- **Workforce management** with skills inventory, gap analysis, and capacity planning
- **Knowledge base** with full-text search, versioning, and feedback loops
- **GRC** with risk assessments, audit management, access reviews, and compliance mapping
- **Executive analytics** with cross-module KPIs, dashboards, and report builder
- **Real-time notifications** via email, Microsoft Teams, and in-app SSE
- **Immutable audit trail** with SHA-256 integrity verification

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Portal                        │
│            React 19 · TanStack Query · Tailwind 4               │
│              Framer Motion · Recharts · Lucide                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST
┌────────────────────────┴────────────────────────────────────────┐
│                      Go API (chi/v5)                            │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Governance│ │ Planning │ │   ITSM   │ │   CMDB   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  People  │ │Knowledge │ │   GRC    │ │ System   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  Middleware: recovery → correlation → logging → CORS →          │
│  SecurityHeaders → CSRF → Metrics → RateLimit → Auth → Audit   │
└──────┬──────────┬──────────┬──────────┬─────────────────────────┘
       │          │          │          │
┌──────┴──┐ ┌────┴───┐ ┌───┴────┐ ┌───┴────┐
│PostgreSQL│ │ Redis  │ │ MinIO  │ │  NATS  │
│   16     │ │   7    │ │ (S3)   │ │JetStream│
└─────────┘ └────────┘ └────────┘ └────────┘
```

**Pattern**: Modular monolith — each domain module is isolated with its own types, services, and handlers, sharing the platform layer (auth, middleware, database, notifications).

**Multi-tenancy**: All domain tables include a `tenant_id` column with row-level isolation enforced via middleware context injection.

---

## Technology Stack

### Backend

| Component | Technology |
|-----------|-----------|
| Language | Go 1.25 |
| Router | chi/v5 |
| Database driver | pgx/v5 |
| Query codegen | sqlc |
| Migrations | goose/v3 |
| Auth | golang-jwt/v5 + Entra ID OIDC |
| Messaging | nats.go (JetStream) |
| Object storage | minio-go/v7 |
| Cache | redis/v9 |
| Config | viper |
| Metrics | prometheus/client_golang |
| Tracing | OpenTelemetry |

### Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State management | TanStack Query 5 |
| Animations | Framer Motion 12 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Validation | Zod 4 |
| Toasts | Sonner |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Object storage | MinIO |
| Message broker | NATS with JetStream |
| Metrics | Prometheus |
| Dashboards | Grafana (2 provisioned dashboards) |
| Logging | Loki |
| Tracing | Tempo (OTLP) |
| Containerization | Docker Compose (10 services) |
| Process management | PM2 (dev) |

---

## Domain Modules

### 1. Governance

Policy lifecycle management, RACI matrices, meeting & decision tracking, OKR/KPI management, action item tracking with reminders.

- Policy states: `draft → review → approved → published → archived → retired`
- Auto-numbered decisions (DEC-YYYY-NNN)
- OKR progress propagation from key results to objectives
- KPI threshold alerts and trend tracking

### 2. People & Workforce

Skills inventory, onboarding/offboarding checklists, roster & shift management, leave tracking, capacity allocation, training records.

- Skill proficiency levels: `beginner → intermediate → advanced → expert`
- Skill gap analysis (role requirements vs. user skills)
- Template-driven checklists with auto-task creation
- Certification expiry alerts (30/60/90 days)
- Over-allocation warnings for capacity planning

### 3. Planning & PMO

Portfolio management, project lifecycle, work breakdown structure, milestone tracking, risk register, issue management, change requests, post-implementation reviews.

- Portfolio roadmap with analytics
- Recursive CTE-based WBS tree
- Interactive Gantt chart visualization
- 5x5 risk heat map (likelihood x impact)
- Change request approval workflow
- Risk score: `GENERATED ALWAYS AS (likelihood * impact) STORED`

### 4. IT Service Management (ITSM)

Service catalog, multi-type ticketing (incidents, service requests, changes), SLA management, problem management, escalation rules, CSAT surveys.

- 9-state ticket lifecycle: `logged → classified → assigned → in_progress → pending_customer/pending_vendor → resolved → closed`
- Auto-numbering: INC-, SR-, CHG-, PRB- prefixes
- Urgency x impact priority matrix
- SLA timer with pause/resume and business hours calendars
- Major incident workflow with bidirectional ticket linking
- Problem → known error chain

### 5. Configuration Management (CMDB)

Asset lifecycle management, CI topology with relationship mapping, license compliance, warranty tracking, disposal workflow, reconciliation engine.

- 6 asset statuses with lifecycle events
- 6 CI relationship types (runs_on, depends_on, connects_to, etc.)
- License entitlements vs. assigned tracking
- Renewal alerts with configurable thresholds
- Evidence vault for disposal documentation

### 6. Knowledge Management

Article lifecycle, full-text search, version history, feedback/voting, announcements.

- Article states: `draft → review → published → archived → retired`
- PostgreSQL GIN index for full-text search
- Version diff tracking
- Feedback voting with helpfulness scores

### 7. Governance, Risk & Compliance (GRC)

Enterprise risk register, audit management, evidence collections, access review campaigns, compliance control mapping.

- 5x5 risk assessment matrix with inherent/residual scores
- Audit finding lifecycle with evidence attachment
- Access review campaigns with certification entries
- Compliance framework mapping (ISO 27001, COBIT, CBN ITSP)

---

## Project Structure

```
itd-opms/
├── itd-opms-api/                    # Go backend
│   ├── cmd/
│   │   ├── api/main.go              # Entry point with graceful shutdown
│   │   └── seed/                    # Database seeder
│   ├── internal/
│   │   ├── platform/                # Shared infrastructure
│   │   │   ├── auth/                # OIDC, JWT, dual-mode middleware
│   │   │   ├── middleware/          # Recovery, correlation, logging, CORS, etc.
│   │   │   ├── database/            # PostgreSQL, Redis, MinIO, NATS connections
│   │   │   ├── notification/        # Outbox, SSE, templates, orchestrator
│   │   │   ├── audit/               # Immutable audit trail
│   │   │   ├── rbac/                # Roles, permissions, delegation
│   │   │   ├── tenant/              # Multi-tenant context
│   │   │   ├── config/              # Viper configuration
│   │   │   ├── server/              # Chi router & middleware chain
│   │   │   ├── metrics/             # Prometheus metrics
│   │   │   ├── dirsync/             # Microsoft Graph directory sync
│   │   │   ├── msgraph/             # Graph API client + circuit breaker
│   │   │   ├── search/              # Global search service
│   │   │   ├── sla/                 # SLA timer & breach tracking
│   │   │   ├── workflow/            # State machine transitions
│   │   │   └── evidence/            # Evidence vault (MinIO)
│   │   └── modules/                 # Domain modules
│   │       ├── governance/          # Policies, RACI, meetings, OKRs, KPIs
│   │       ├── planning/            # Portfolios, projects, work items, risks
│   │       ├── itsm/                # Tickets, problems, SLA, catalog
│   │       ├── cmdb/                # Assets, CIs, licenses, warranties
│   │       ├── people/              # Skills, checklists, roster, training
│   │       ├── knowledge/           # Articles, feedback, announcements
│   │       ├── grc/                 # Risks, audits, compliance, access reviews
│   │       ├── reporting/           # Dashboard, reports, search
│   │       └── system/              # Users, roles, tenants, health, settings
│   ├── migrations/                  # 23 goose SQL migrations
│   ├── queries/                     # 13 sqlc query files
│   ├── config/                      # YAML configs (dev, prod, test)
│   ├── observability/               # Grafana dashboards, Prometheus rules
│   ├── docs/                        # Runbooks & API reference
│   ├── Dockerfile                   # Multi-stage Alpine build
│   ├── Makefile                     # Build, test, migrate commands
│   ├── docker-compose.yml           # 9 dev services
│   ├── docker-compose.prod.yml      # Production overrides
│   └── .env.example                 # Configuration template
│
├── itd-opms-portal/                 # Next.js frontend
│   ├── app/
│   │   ├── auth/                    # Login, OIDC callback
│   │   └── dashboard/               # Authenticated app shell
│   │       ├── analytics/           # Executive, portfolio, project dashboards
│   │       ├── governance/          # Policies, RACI, meetings, OKRs
│   │       ├── people/              # Directory, skills, onboarding, roster
│   │       ├── planning/            # Portfolios, projects, work items, risks
│   │       ├── itsm/                # Catalog, tickets, problems, SLA
│   │       ├── cmdb/                # Assets, topology, licenses, warranties
│   │       ├── knowledge/           # Articles, search, announcements
│   │       ├── grc/                 # Risks, audits, compliance, access reviews
│   │       ├── system/              # Users, roles, tenants, settings, health
│   │       ├── reports/             # Report library & builder
│   │       └── search/              # Global search
│   ├── components/
│   │   ├── layout/                  # Sidebar, header, mobile nav
│   │   ├── shared/                  # DataTable, StatusBadge, FormField, etc.
│   │   ├── dashboard/charts/        # 18 chart components (Recharts)
│   │   └── notifications/           # Bell, panel
│   ├── hooks/                       # 15 custom hooks (domain + utility)
│   ├── providers/                   # Auth, theme, notifications, query
│   ├── lib/                         # API client, auth utils, fuzzy match
│   └── types/                       # TypeScript type definitions
│
└── ecosystem.opms.config.js         # PM2 dev configuration
```

---

## Getting Started

### Prerequisites

- **Go** 1.25+
- **Node.js** 20+ and **npm**
- **Docker** and **Docker Compose**
- **goose** (migration tool): `go install github.com/pressly/goose/v3/cmd/goose@latest`
- **sqlc** (query codegen): `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`

### Quick Start

**1. Clone and configure**

```bash
git clone <repository-url> itd-opms
cd itd-opms

# Backend config
cp itd-opms-api/.env.example itd-opms-api/.env
```

**2. Start infrastructure services**

```bash
cd itd-opms-api
docker compose up -d
```

This starts PostgreSQL, Redis, MinIO, NATS, Prometheus, Grafana, Loki, and Tempo.

**3. Run database migrations**

```bash
make migrate-up
```

**4. Seed initial data**

```bash
make seed
```

**5. Start the API server**

```bash
make dev
# API available at http://localhost:8089
```

**6. Start the frontend**

```bash
cd ../itd-opms-portal
npm install
npm run dev
# Portal available at http://localhost:3000
```

### Using PM2 (Both Services)

```bash
# From project root
npm install -g pm2
pm2 start ecosystem.opms.config.js
pm2 logs
```

### Default Development Credentials

| Field | Value |
|-------|-------|
| Email | `admin@itd.cbn.gov.ng` |
| Password | `admin123` |
| Role | `global_admin` |
| Tenant | ITD (`00000000-0000-0000-0000-000000000001`) |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HOST` | `0.0.0.0` | API bind address |
| `SERVER_PORT` | `8089` | API port |
| `SERVER_ENV` | `development` | Environment (`development`, `production`) |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `opms` | Database user |
| `DB_PASSWORD` | `opms_secret` | Database password |
| `DB_NAME` | `itd_opms` | Database name |
| `DB_SSLMODE` | `disable` | SSL mode (`disable`, `require`, `verify-full`) |
| `DB_MAX_CONNS` | `25` | Max database connections |
| `DB_MIN_CONNS` | `5` | Min database connections |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO S3 endpoint |
| `MINIO_ACCESS_KEY` | `opms_minio` | MinIO access key |
| `MINIO_SECRET_KEY` | `opms_minio_secret` | MinIO secret key |
| `NATS_URL` | `nats://localhost:4222` | NATS server URL |
| `JWT_SECRET` | — | JWT signing secret (min 32 chars) |
| `JWT_EXPIRY` | `30m` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `168h` | Refresh token expiry |
| `ENTRA_TENANT_ID` | — | Microsoft Entra ID tenant (production) |
| `ENTRA_CLIENT_ID` | — | Entra ID application client ID |
| `ENTRA_CLIENT_SECRET` | — | Entra ID client secret |
| `LOG_LEVEL` | `debug` | Log level (`debug`, `info`, `warn`, `error`) |
| `LOG_FORMAT` | `json` | Log format (`text`, `json`) |

### Frontend Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8089/api/v1` | Backend API base URL |

---

## Database

### Schema Overview

PostgreSQL 16 with multi-tenant architecture:

- **23 migrations** covering tenant setup, RBAC, audit trail, and all 7 domain modules
- **13 sqlc query files** (~3,750 lines) with type-safe generated Go code
- **Materialized views** for executive dashboard KPIs
- **Full-text search** via GIN indexes on knowledge base articles
- **Generated columns** for computed fields (e.g., risk scores)
- **Triggers** for auto-numbering (INC-, SR-, CHG-, PRB- prefixes)
- **Immutable audit tables** with PostgreSQL rules preventing UPDATE/DELETE

### Key Database Patterns

```sql
-- Multi-tenant isolation
CREATE TABLE tickets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    ...
);

-- Immutable audit with SHA-256 checksums
CREATE TABLE audit_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY,
    checksum    TEXT NOT NULL, -- SHA-256 via trigger
    ...
);
CREATE RULE no_update_audit AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_events DO INSTEAD NOTHING;

-- Risk score as generated column
risk_score INT GENERATED ALWAYS AS (likelihood * impact) STORED
```

### Migration Commands

```bash
make migrate-up        # Apply all pending migrations
make migrate-down      # Rollback last migration
make migrate-status    # Show migration status
make migrate-create    # Create a new migration file
make sqlc              # Regenerate Go code from SQL queries
```

---

## Authentication

ITD-OPMS uses **dual-mode authentication**:

### Development Mode (JWT)

- Username/password login via `POST /api/v1/auth/login`
- JWT access tokens (30min) + refresh tokens (7 days)
- Tokens stored in `localStorage` on the frontend
- Default user: `admin@itd.cbn.gov.ng` / `admin123`

### Production Mode (Entra ID OIDC)

- Microsoft Entra ID with PKCE flow
- JWKS-based RS256 token validation with automatic key rotation
- httpOnly secure cookies for session management
- Directory sync via Microsoft Graph API delta queries
- Automatic user provisioning and deactivation

### RBAC

7 system roles with JSONB permission maps:

| Role | Scope |
|------|-------|
| `global_admin` | Full system access |
| `tenant_admin` | Full tenant access |
| `governance_lead` | Governance module management |
| `portfolio_manager` | Planning module management |
| `service_owner` | ITSM module management |
| `analyst` | Read-only cross-module analytics |
| `operator` | Day-to-day operations |

Permission format: `module.action` (e.g., `governance.view`, `itsm.manage`, `system.manage`)

Delegation support allows temporary permission transfer between users.

---

## API Reference

### Response Envelope

All API responses follow a consistent envelope:

```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 142,
      "totalPages": 8
    },
    "correlationId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "errors": null
}
```

### Middleware Chain

Every request passes through:

```
Recovery → CorrelationID → Logging → RealIP → CORS → SecurityHeaders
→ CSRFProtection → MetricsMiddleware → RateLimit → [Auth → Tenant → Audit]
```

### Module Endpoints

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/api/v1/auth` | login, refresh, logout, OIDC callback |
| Governance | `/api/v1/governance` | policies, raci, meetings, decisions, okrs, kpis |
| Planning | `/api/v1/planning` | portfolios, projects, work-items, milestones, risks, change-requests |
| ITSM | `/api/v1/itsm` | catalog, tickets, problems, sla, queues, escalations |
| CMDB | `/api/v1/cmdb` | assets, items, relationships, licenses, warranties |
| People | `/api/v1/people` | skills, checklists, rosters, training, capacity, leave |
| Knowledge | `/api/v1/knowledge` | articles, categories, feedback, announcements |
| GRC | `/api/v1/grc` | risks, audits, findings, access-reviews, compliance |
| Reporting | `/api/v1/reporting` | dashboard, reports, search |
| System | `/api/v1/system` | users, roles, tenants, org-units, settings, health, sessions |

See [API Reference](itd-opms-api/docs/api-reference.md) for full endpoint documentation.

---

## Frontend

### Page Structure

The portal contains **109 page files** organized by domain module:

| Module | Pages | Key Features |
|--------|-------|-------------|
| Dashboard | 1 | Live KPIs, activity feed, module quick links |
| Analytics | 8 | Executive overview, portfolio, project, risk, resource, governance, office, collaboration |
| Governance | 12 | Policy editor, RACI builder, meeting notes, OKR tree, KPI dashboard |
| People | 10 | Directory, skill matrix, checklist builder, roster calendar, capacity heatmap |
| Planning | 14 | Portfolio roadmap, project board, Gantt chart, WBS tree, risk heat map, change workflow |
| ITSM | 8 | Ticket queue, problem chain, catalog browser, SLA dashboard |
| CMDB | 8 | Asset inventory, CI topology, license compliance, warranty tracker |
| Knowledge | 5 | Article editor, search, feedback, announcements |
| GRC | 10 | Risk register, audit workflow, compliance mapping, access reviews |
| System | 14 | User management, roles grid, tenant tree, org chart, audit explorer, health dashboard |
| Reports | 2 | Report library, global search |

### Shared Components

- **DataTable** — Sortable, paginated data table with column definitions
- **StatusBadge** — Auto-resolves badge variant from status strings
- **FormField** — Consistent form wrapper with validation
- **PermissionGate** — Conditional rendering based on RBAC
- **ConfirmDialog** — Reusable confirmation modal
- **JsonDiff** — Side-by-side JSON diff viewer for audit logs
- **18 chart components** — KPI cards, trend lines, radar, funnel, treemap, sparklines, etc.

### Advanced Sidebar

The sidebar features CRM-grade navigation with:

- Collapsible sections with Framer Motion animations
- Fuzzy search with `/` keyboard shortcut and highlighted results
- Section pinning (persists across sessions)
- Favorites rail with right-click context menu
- Recently visited pages tracking
- Setup wizard for first-time layout customization
- 4 presets (Full, Essentials, Manager, Technical)
- Keyboard navigation (Arrow keys, Home/End, Space, Enter, Escape)
- Scroll progress bar
- Active indicator gradient animation
- Icon hover micro-interactions
- Reduced motion accessibility support

### Hooks Architecture

Domain hooks follow a consistent pattern using TanStack Query:

```typescript
// Query hook
export function useTickets(page, pageSize, filters) {
  return useQuery({
    queryKey: ["tickets", page, pageSize, filters],
    queryFn: () => apiClient.get("/itsm/tickets", { page, pageSize, ...filters }),
  });
}

// Mutation hook with cache invalidation
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post("/itsm/tickets", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket created");
    },
    onError: (err) => toast.error(err.message),
  });
}
```

---

## Observability

### Metrics (Prometheus)

Exposed at `/metrics`:

- `http_requests_total` — Request counter by method, path, status
- `http_request_duration_seconds` — Request latency histogram
- `db_query_duration_seconds` — Database query latency
- `db_active_connections` — Connection pool gauge
- `sla_breaches_total` — SLA breach counter

### Grafana Dashboards

Two provisioned dashboards:

1. **Platform Health** — Service status, connection pools, error rates
2. **API Performance** — Request throughput, latency percentiles, slow queries

### Alert Rules

7 Prometheus alert rules:

| Alert | Severity | Condition |
|-------|----------|-----------|
| `HighErrorRate` | critical | >5% error rate for 5min |
| `HighLatency` | critical | P95 latency >2s for 5min |
| `DatabaseConnectionsHigh` | critical | >80% pool utilization |
| `HighMemoryUsage` | high | >85% memory for 10min |
| `SLABreachRate` | high | >3 breaches in 15min |
| `NATSDisconnected` | medium | NATS unreachable for 2min |
| `MinIOUnhealthy` | medium | MinIO healthcheck failing |

### Distributed Tracing

OpenTelemetry traces exported to Tempo via OTLP gRPC (port 4317).

### Logging

Structured JSON logging aggregated by Loki, queryable in Grafana.

---

## Deployment

### Docker Compose (Development)

```bash
cd itd-opms-api
docker compose up -d          # Start all 9 services
docker compose logs -f api    # Follow API logs
docker compose down           # Stop all services
```

### Docker Compose (Production)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Production overrides include:

- Resource limits (CPU and memory) per service
- PostgreSQL: 512MB shared_buffers, WAL archiving, 200 max connections
- Redis: 128MB max memory with LRU eviction
- MinIO: Server-side encryption enabled
- JSON logging with rotation
- `restart: always` on all services

### API Docker Build

```dockerfile
# Multi-stage build
FROM golang:1.25-alpine AS builder
# ... builds static binary

FROM alpine:3.21
# ... ~11MB production image
EXPOSE 8089
HEALTHCHECK CMD wget -qO- http://localhost:8089/api/v1/health || exit 1
```

### Further Reading

- [Deployment Runbook](itd-opms-api/docs/deployment-runbook.md)
- [Backup & Restore](itd-opms-api/docs/backup-restore-runbook.md)
- [DR Failover](itd-opms-api/docs/dr-failover-runbook.md)

---

## Development

### Backend Commands

```bash
cd itd-opms-api

make build              # Build binary to bin/itd-opms-api
make dev                # Run with go run (hot reload with air)
make test               # Run tests with race detector + coverage
make test-coverage      # Generate HTML coverage report
make lint               # Run golangci-lint
make sqlc               # Regenerate Go code from SQL queries
make migrate-up         # Apply migrations
make migrate-down       # Rollback last migration
make migrate-create     # Create new migration
make seed               # Seed database with initial data
make docker-up          # Start infrastructure
make docker-down        # Stop infrastructure
make clean              # Remove build artifacts
```

### Frontend Commands

```bash
cd itd-opms-portal

npm install             # Install dependencies
npm run dev             # Start dev server (port 3000)
npm run build           # Production build
npm run lint            # ESLint
npx tsc --noEmit        # Type check
```

### Service URLs (Development)

| Service | URL |
|---------|-----|
| API | http://localhost:8089 |
| Portal | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MinIO Console | http://localhost:9001 |
| MinIO S3 API | http://localhost:9000 |
| NATS | localhost:4222 |
| NATS Monitoring | http://localhost:8222 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |
| Loki | http://localhost:3100 |
| Tempo | http://localhost:3200 |

### Code Statistics

| Metric | Count |
|--------|-------|
| Go source files | 149 |
| Frontend TypeScript files | 4,443 |
| Page components | 109 |
| SQL migrations | 23 |
| sqlc query files | 13 (~3,750 lines) |
| TanStack Query hooks | ~300 |
| Unit tests | 40+ |

---

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](itd-opms-api/docs/api-reference.md) | Full endpoint documentation |
| [Deployment Runbook](itd-opms-api/docs/deployment-runbook.md) | Step-by-step deployment procedures |
| [Backup & Restore](itd-opms-api/docs/backup-restore-runbook.md) | Database backup and restore guide |
| [DR Failover](itd-opms-api/docs/dr-failover-runbook.md) | Disaster recovery procedures |
| [Implementation Prompts](AI_AGENT_PROMPTS.md) | 10-phase AI-assisted implementation blueprint |
| [Requirements Gap Analysis](PROMPT_11_REQUIREMENTS_GAPS.md) | Gap analysis and enhancement roadmap |

---

## License

Proprietary. Central Bank of Nigeria - IT Department. All rights reserved.

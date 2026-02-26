# ITD-OPMS Deployment Runbook

## Overview

This document describes the step-by-step process for deploying the ITD-OPMS API
service. It covers prerequisites, deployment procedures, health verification,
and rollback steps.

---

## 1. Prerequisites

### 1.1 Required Software

| Tool            | Minimum Version | Purpose                          |
| --------------- | --------------- | -------------------------------- |
| Docker          | 24.x           | Container runtime                |
| Docker Compose  | 2.20+           | Multi-service orchestration      |
| Go              | 1.22+           | API build (if building locally)  |
| PostgreSQL CLI  | 16.x            | Database migrations (psql/goose) |
| goose           | v3.x            | SQL migration runner             |

### 1.2 Required Environment Variables

Copy `.env.example` to `.env` and fill in production values. Key variables:

| Variable               | Description                            | Example                                    |
| ---------------------- | -------------------------------------- | ------------------------------------------ |
| `SERVER_HOST`          | Bind address                           | `0.0.0.0`                                  |
| `SERVER_PORT`          | Bind port                              | `8080`                                     |
| `SERVER_ENV`           | Environment (development/production)   | `production`                                |
| `DB_HOST`              | PostgreSQL hostname                    | `postgres`                                  |
| `DB_PORT`              | PostgreSQL port                        | `5432`                                      |
| `DB_USER`              | PostgreSQL user                        | `opms`                                      |
| `DB_PASSWORD`          | PostgreSQL password                    | (secret)                                    |
| `DB_NAME`              | Database name                          | `itd_opms`                                  |
| `DB_SSLMODE`           | SSL mode (disable/require/verify-full) | `require`                                   |
| `DB_MAX_CONNS`         | Max pool connections                   | `25`                                        |
| `DB_MIN_CONNS`         | Min pool connections                   | `5`                                         |
| `REDIS_HOST`           | Redis hostname                         | `redis`                                     |
| `REDIS_PORT`           | Redis port                             | `6379`                                      |
| `REDIS_PASSWORD`       | Redis password                         | (secret)                                    |
| `MINIO_ENDPOINT`       | MinIO S3 endpoint                      | `minio:9000`                                |
| `MINIO_ACCESS_KEY`     | MinIO access key                       | (secret)                                    |
| `MINIO_SECRET_KEY`     | MinIO secret key                       | (secret)                                    |
| `MINIO_USE_SSL`        | Use SSL for MinIO                      | `true`                                      |
| `NATS_URL`             | NATS connection URL                    | `nats://nats:4222`                          |
| `JWT_SECRET`           | HMAC secret for dev JWT (min 32 chars) | (secret)                                    |
| `JWT_EXPIRY`           | Access token TTL                       | `30m`                                       |
| `JWT_REFRESH_EXPIRY`   | Refresh token TTL                      | `168h`                                      |
| `ENTRA_TENANT_ID`      | Azure AD tenant ID                     | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`      |
| `ENTRA_CLIENT_ID`      | Azure AD app client ID                 | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`      |
| `ENTRA_CLIENT_SECRET`  | Azure AD app client secret             | (secret)                                    |
| `ENTRA_REDIRECT_URI`   | OIDC redirect URI                      | `https://portal.itd-opms.gov.ng/auth/callback` |
| `LOG_LEVEL`            | Logging level                          | `info`                                      |
| `LOG_FORMAT`           | Log format (json/text)                 | `json`                                      |

### 1.3 Infrastructure Dependencies

- PostgreSQL 16 with a dedicated `itd_opms` database
- Redis 7 for rate limiting and caching
- MinIO (or S3-compatible storage) for evidence vault and attachments
- NATS with JetStream enabled for async notifications
- (Optional) Grafana/Prometheus/Loki/Tempo for observability

---

## 2. Deployment Procedure

### 2.1 Docker Compose (Development / Staging)

```bash
# Start all services (API + dependencies + monitoring)
docker compose up -d

# Start API only (assumes dependencies already running)
docker compose up -d api

# Verify all containers are running
docker compose ps

# Tail API logs
docker compose logs -f api
```

### 2.2 Docker Compose (Production)

```bash
# Use the production compose overlay
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 2.3 Manual Build and Deploy

```bash
# Build the binary
cd /path/to/itd-opms-api
go build -o itd-opms-api ./cmd/api

# Run database migrations
goose -dir migrations postgres "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=$DB_SSLMODE" up

# Start the server
./itd-opms-api
```

---

## 3. Database Migrations

Migrations are managed with goose and located in `migrations/`.

### 3.1 Run Pending Migrations

```bash
export GOOSE_DRIVER=postgres
export GOOSE_DBSTRING="postgresql://opms:$DB_PASSWORD@$DB_HOST:5432/itd_opms?sslmode=require"

goose -dir migrations up
```

### 3.2 Check Migration Status

```bash
goose -dir migrations status
```

### 3.3 Migration Files

| File                                      | Description                            |
| ----------------------------------------- | -------------------------------------- |
| `001_tenants_and_org_hierarchy.sql`       | Tenants, departments, org structure    |
| `002_users_and_rbac.sql`                  | Users, roles, permissions              |
| `003_audit_events.sql`                    | Audit trail with SHA-256 checksums     |
| `004_approvals_and_signoffs.sql`          | Approval workflows                     |
| `005_documents_and_evidence.sql`          | Document storage metadata              |
| `006_notifications_and_directory_sync.sql`| Notifications, outbox, directory sync  |
| `007_governance.sql`                      | Policies, RACI, meetings, OKRs/KPIs   |
| `008_planning.sql`                        | Portfolios, projects, work items       |
| `009_itsm.sql`                            | Tickets, SLA, problems, queues         |
| `010_cmdb.sql`                            | Assets, CIs, licenses, warranties      |
| `011_people.sql`                          | Skills, checklists, rosters, training  |
| `012_knowledge.sql`                       | KB categories, articles, announcements |
| `013_grc.sql`                             | Risks, audits, access reviews, compliance |
| `014_reporting.sql`                       | Reporting tables and views             |

---

## 4. Health Check Verification

After deployment, verify the API is healthy:

```bash
# Health check endpoint
curl -s http://localhost:8080/api/v1/health | jq .

# Expected response (all services healthy):
# {
#   "status": "healthy",
#   "version": "0.1.0",
#   "services": {
#     "postgres": { "status": "healthy", "latency": "1.2ms" },
#     "redis":    { "status": "healthy", "latency": "0.5ms" },
#     "nats":     { "status": "healthy" },
#     "minio":    { "status": "healthy", "latency": "3.1ms" }
#   }
# }
```

If any service shows "unhealthy" or "unavailable", check its container logs:

```bash
docker compose logs postgres
docker compose logs redis
docker compose logs nats
docker compose logs minio
```

### 4.1 Smoke Test

```bash
# Login with dev credentials
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@itd.cbn.gov.ng","password":"admin123"}' \
  | jq -r '.data.accessToken')

# Verify authenticated endpoint works
curl -s http://localhost:8080/api/v1/audit/events \
  -H "Authorization: Bearer $TOKEN" | jq .status
# Expected: "success"
```

---

## 5. Rollback Procedure

### 5.1 Rollback Application

```bash
# Option A: Roll back to previous container image
docker compose down api
docker compose pull api  # pull the previous tag
docker compose up -d api

# Option B: If using tagged images
docker compose down
# Edit docker-compose.yml to point to previous image tag
docker compose up -d
```

### 5.2 Rollback Database Migration

```bash
# Roll back the last migration
goose -dir migrations down

# Roll back to a specific version
goose -dir migrations down-to 011
```

**WARNING**: Rollback of destructive migrations (DROP TABLE, DROP COLUMN) cannot
recover data. Always take a database backup before deploying migrations.

### 5.3 Rollback Checklist

1. [ ] Take database backup before migration
2. [ ] Note current migration version (`goose status`)
3. [ ] Deploy new version
4. [ ] Verify health endpoint returns "healthy"
5. [ ] Run smoke tests
6. [ ] If issues detected:
   - Roll back application to previous version
   - Roll back database if schema changed
   - Investigate logs and fix before retrying

---

## 6. Monitoring Post-Deployment

| Service    | URL                        | Purpose            |
| ---------- | -------------------------- | ------------------ |
| API        | http://localhost:8080       | Application        |
| Grafana    | http://localhost:3001       | Dashboards         |
| Prometheus | http://localhost:9090       | Metrics            |
| Loki       | http://localhost:3100       | Log aggregation    |
| Tempo      | http://localhost:3200       | Distributed traces |
| MinIO      | http://localhost:9001       | Object storage UI  |
| NATS       | http://localhost:8222       | NATS monitoring    |

---

## 7. Contacts

| Role               | Responsibility                     |
| ------------------ | ---------------------------------- |
| DevOps Lead        | Infrastructure and deployment      |
| Backend Lead       | API issues and migration support   |
| DBA                | Database performance and backups   |
| Security Lead      | Entra ID / OIDC configuration      |

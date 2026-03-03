# Server Deployment Requirements

## ITD Office of the Project Management System (OPMS)

**Document Version:** 1.0
**Date:** March 2, 2026
**Prepared By:** ITD Development Team
**Classification:** Internal Use

---

## 1. Executive Summary

The ITD OPMS is a full-stack enterprise web application for managing IT projects, services, governance, and compliance across the organization. This document outlines the server infrastructure requirements for deploying the solution in a production environment.

The system comprises a **Go API backend**, a **Next.js frontend portal**, and supporting infrastructure services including PostgreSQL, Redis, MinIO (object storage), NATS (message broker), and a full observability stack (Prometheus, Grafana, Loki, Tempo).

---

## 2. Solution Architecture Overview

```
                        +-----------------+
                        |   Load Balancer |
                        |  (Nginx/HAProxy)|
                        +--------+--------+
                                 |
                 +---------------+---------------+
                 |                               |
         +-------+-------+             +--------+--------+
         | OPMS Portal   |             |   OPMS API      |
         | (Next.js)     |             |   (Go Binary)   |
         | Port: 3000    |             |   Port: 8089    |
         +-------+-------+             +---+----+----+---+
                 |                         |    |    |
                 +------------+------------+    |    |
                              |                 |    |
                    +---------+--------+        |    |
                    |   PostgreSQL 16  |--------+    |
                    |   Port: 5432     |             |
                    +------------------+             |
                                                     |
              +------------------+  +----------------+---+  +------------------+
              |   Redis 7        |  |   MinIO (S3)       |  |   NATS JetStream |
              |   Port: 6379     |  |   Ports: 9000/9001 |  |   Port: 4222     |
              +------------------+  +--------------------+  +------------------+

              +------------------+  +------------------+  +------------------+
              |   Prometheus     |  |   Grafana        |  |   Loki + Tempo   |
              |   Port: 9090     |  |   Port: 3001     |  |   Ports: 3100/   |
              +------------------+  +------------------+  |          3200    |
                                                          +------------------+
```

---

## 3. Server Requirements

### 3.1 Option A: Single Server Deployment (Recommended for Initial Rollout)

For deployments serving **up to 200 concurrent users**.

| Resource         | Minimum              | Recommended          |
|------------------|----------------------|----------------------|
| **CPU**          | 8 vCPUs              | 16 vCPUs             |
| **RAM**          | 16 GB                | 32 GB                |
| **OS Disk**      | 100 GB SSD           | 100 GB SSD           |
| **Data Disk**    | 250 GB SSD           | 500 GB SSD           |
| **Network**      | 1 Gbps NIC           | 1 Gbps NIC           |
| **OS**           | Ubuntu 22.04/24.04 LTS or RHEL 8/9 | Ubuntu 24.04 LTS    |

### 3.2 Option B: Multi-Server Deployment (Recommended for Production / HA)

For deployments serving **200+ concurrent users** with high availability.

#### Application Server (x2 for HA)

| Resource         | Specification        |
|------------------|----------------------|
| **CPU**          | 8 vCPUs              |
| **RAM**          | 16 GB                |
| **OS Disk**      | 100 GB SSD           |
| **Network**      | 1 Gbps NIC           |
| **OS**           | Ubuntu 24.04 LTS     |
| **Purpose**      | OPMS API + OPMS Portal |

#### Database Server (x1 primary, x1 standby for HA)

| Resource         | Specification        |
|------------------|----------------------|
| **CPU**          | 8 vCPUs              |
| **RAM**          | 16 GB                |
| **OS Disk**      | 50 GB SSD            |
| **Data Disk**    | 500 GB SSD (high IOPS) |
| **Network**      | 1 Gbps NIC           |
| **OS**           | Ubuntu 24.04 LTS     |
| **Purpose**      | PostgreSQL 16 + Redis 7 |

#### Storage & Messaging Server (x1)

| Resource         | Specification        |
|------------------|----------------------|
| **CPU**          | 4 vCPUs              |
| **RAM**          | 8 GB                 |
| **OS Disk**      | 50 GB SSD            |
| **Data Disk**    | 1 TB SSD/HDD         |
| **Network**      | 1 Gbps NIC           |
| **OS**           | Ubuntu 24.04 LTS     |
| **Purpose**      | MinIO (object storage) + NATS JetStream |

#### Monitoring Server (x1)

| Resource         | Specification        |
|------------------|----------------------|
| **CPU**          | 4 vCPUs              |
| **RAM**          | 8 GB                 |
| **OS Disk**      | 50 GB SSD            |
| **Data Disk**    | 250 GB SSD           |
| **Network**      | 1 Gbps NIC           |
| **OS**           | Ubuntu 24.04 LTS     |
| **Purpose**      | Prometheus, Grafana, Loki, Tempo |

---

## 4. Software Requirements

### 4.1 Operating System & Runtime

| Software                | Version           | Purpose                        |
|-------------------------|-------------------|--------------------------------|
| Ubuntu Server LTS       | 22.04 or 24.04    | Host operating system          |
| Docker Engine           | 27.x+             | Container runtime              |
| Docker Compose          | 2.29+             | Service orchestration          |
| Node.js                 | 22.x LTS          | Next.js portal runtime         |
| Go                      | 1.25+             | API build (if building on server) |
| PM2                     | 5.x               | Process management             |
| Nginx                   | 1.24+             | Reverse proxy / Load balancer  |
| Git                     | 2.x               | Deployment via git pull        |

### 4.2 Database & Infrastructure Services

| Service                 | Version           | Purpose                        |
|-------------------------|-------------------|--------------------------------|
| PostgreSQL              | 16.x              | Primary relational database    |
| Redis                   | 7.x               | Caching & session management   |
| MinIO                   | Latest (RELEASE)   | S3-compatible object storage   |
| NATS Server             | 2.x (with JetStream) | Message broker & event streaming |

### 4.3 Observability Stack

| Service                 | Version           | Purpose                        |
|-------------------------|-------------------|--------------------------------|
| Prometheus              | Latest             | Metrics collection & alerting  |
| Grafana                 | Latest             | Dashboards & visualization     |
| Loki                    | Latest             | Log aggregation                |
| Tempo                   | Latest             | Distributed tracing            |

---

## 5. Network Requirements

### 5.1 Firewall / Inbound Rules

| Port  | Protocol | Source           | Service              | Required |
|-------|----------|------------------|----------------------|----------|
| 22    | TCP      | Admin IPs only   | SSH                  | Yes      |
| 80    | TCP      | Internal network | HTTP (redirect to HTTPS) | Yes |
| 443   | TCP      | Internal network | HTTPS (Portal + API) | Yes      |
| 3001  | TCP      | Admin IPs only   | Grafana Dashboard    | Optional |
| 9001  | TCP      | Admin IPs only   | MinIO Console        | Optional |
| 8222  | TCP      | Admin IPs only   | NATS Monitoring      | Optional |

### 5.2 Internal Service Ports (Not exposed externally)

| Port  | Service          |
|-------|------------------|
| 3000  | Next.js Portal   |
| 8089  | Go API Server    |
| 5432  | PostgreSQL       |
| 6379  | Redis            |
| 9000  | MinIO S3 API     |
| 4222  | NATS             |
| 9090  | Prometheus       |
| 3100  | Loki             |
| 3200  | Tempo            |
| 4317  | OpenTelemetry (OTLP gRPC) |

### 5.3 Outbound Access

| Destination              | Port | Purpose                              |
|--------------------------|------|--------------------------------------|
| Microsoft Entra ID       | 443  | OIDC authentication (SSO)            |
| SMTP Server              | 587  | Email notifications                  |
| NTP Server               | 123  | Time synchronization                 |
| OS Package Repositories  | 443  | System updates                       |
| Docker Hub / GHCR        | 443  | Container image pulls (initial setup)|

### 5.4 DNS Requirements

| Record Type | Hostname (Example)       | Points To            |
|-------------|--------------------------|----------------------|
| A / CNAME   | opms.cbn.gov.ng          | Server IP / LB       |
| A / CNAME   | opms-api.cbn.gov.ng      | Server IP / LB       |
| A / CNAME   | opms-grafana.cbn.gov.ng  | Server IP (optional) |

### 5.5 SSL/TLS Certificate

- **Type:** Organization-validated (OV) or internal CA certificate
- **Domain(s):** opms.cbn.gov.ng, opms-api.cbn.gov.ng (or wildcard *.opms.cbn.gov.ng)
- **Key Length:** RSA 2048-bit minimum (4096-bit recommended) or ECDSA P-256
- **Validity:** Minimum 1 year
- **Format:** PEM (certificate + private key + chain)

---

## 6. Security Requirements

### 6.1 Operating System Hardening

- [ ] Disable root SSH login; use key-based authentication only
- [ ] Configure UFW/firewalld with rules per Section 5.1
- [ ] Enable automatic security updates (unattended-upgrades)
- [ ] Install and configure fail2ban for brute-force protection
- [ ] Set up audit logging (auditd)
- [ ] Disable unused services and ports

### 6.2 Application Security

- [ ] Run all services as non-root users
- [ ] Store secrets in environment variables (not in code or config files)
- [ ] Enable PostgreSQL SSL mode (`verify-full` in production)
- [ ] Configure Redis with password authentication
- [ ] Enable MinIO server-side encryption
- [ ] Set strong JWT secret (minimum 32 characters, randomly generated)
- [ ] Configure CORS to allow only the portal domain
- [ ] Enable CSRF protection
- [ ] Configure Content Security Policy (CSP) headers
- [ ] Rate limiting enabled on API endpoints

### 6.3 Backup Requirements

| Data                    | Frequency      | Retention  | Method                          |
|-------------------------|----------------|------------|---------------------------------|
| PostgreSQL database     | Daily (full)   | 30 days    | pg_dump + WAL archiving         |
| PostgreSQL WAL logs     | Continuous      | 7 days     | WAL archiving to backup storage |
| MinIO object storage    | Daily           | 30 days    | mc mirror to backup location    |
| Redis (RDB snapshots)   | Every 6 hours  | 7 days     | RDB file copy                   |
| Application configs     | On change       | 90 days    | Git + file backup               |
| Server configuration    | Weekly          | 30 days    | Full system snapshot            |

### 6.4 Microsoft Entra ID (Azure AD) Integration

For production SSO authentication, the following must be provisioned:

- [ ] Azure App Registration for OPMS
- [ ] Redirect URI: `https://opms.cbn.gov.ng/api/v1/auth/callback`
- [ ] Required environment variables:
  - `ENTRA_TENANT_ID`
  - `ENTRA_CLIENT_ID`
  - `ENTRA_CLIENT_SECRET`

---

## 7. Deployment Architecture

### 7.1 Recommended Production Deployment (Docker Compose)

The application ships with production-ready Docker Compose configuration:

```
docker-compose.yml                  # Base service definitions
docker-compose.production.yml       # Production overrides (resource limits, logging, SSL)
```

**Production overrides include:**
- CPU and memory resource limits per container
- PostgreSQL tuned: 512MB shared_buffers, 200 max connections, WAL archiving
- Redis: 128MB max memory with LRU eviction policy
- JSON structured logging with rotation
- Restart policy: `always` on all services
- Health checks on all critical services

### 7.2 Nginx Reverse Proxy Configuration

Nginx serves as the entry point, handling:
- SSL termination
- Routing `/` to the Next.js portal (port 3000)
- Routing `/api/` to the Go API (port 8089)
- Static asset caching
- Gzip compression
- Security headers

### 7.3 Process Management

| Process       | Manager         | Restart Policy | Memory Limit |
|---------------|-----------------|----------------|--------------|
| OPMS API      | Docker/PM2      | Always         | 1 GB         |
| OPMS Portal   | Docker/PM2      | Always         | 1 GB         |
| PostgreSQL    | Docker          | Always         | 4 GB         |
| Redis         | Docker          | Always         | 128 MB       |
| MinIO         | Docker          | Always         | 512 MB       |
| NATS          | Docker          | Always         | 256 MB       |
| Prometheus    | Docker          | Always         | 512 MB       |
| Grafana       | Docker          | Always         | 256 MB       |
| Loki          | Docker          | Always         | 512 MB       |
| Tempo         | Docker          | Always         | 256 MB       |

---

## 8. Capacity Estimates

### 8.1 Storage Growth Projections

| Data Category            | Initial Size | Monthly Growth | 1-Year Estimate |
|--------------------------|-------------|----------------|-----------------|
| PostgreSQL database      | 500 MB      | 2-5 GB         | 30-60 GB        |
| MinIO (documents/files)  | 1 GB        | 5-10 GB        | 60-120 GB       |
| Prometheus metrics       | 100 MB      | 2-3 GB         | 25-35 GB        |
| Loki logs                | 100 MB      | 3-5 GB         | 35-60 GB        |
| Tempo traces             | 50 MB       | 1-2 GB         | 12-24 GB        |
| Redis (in-memory)        | 50 MB       | Stable          | 128 MB cap      |
| **Total**                | **~2 GB**   | **~15-25 GB**   | **~170-310 GB** |

### 8.2 Concurrent User Estimates

| Metric                          | Estimate         |
|--------------------------------|------------------|
| Total registered users          | 50-500           |
| Peak concurrent users           | 50-200           |
| API requests per second (peak)  | 100-500 req/s    |
| Database connections (peak)     | 25-100           |
| WebSocket connections (NATS)    | 10-50            |

---

## 9. Environment Variables (Production)

The following environment variables must be configured on the production server:

```env
# === Server ===
SERVER_HOST=0.0.0.0
SERVER_PORT=8089
SERVER_ENV=production

# === Database ===
DB_HOST=<postgres-host>
DB_PORT=5432
DB_USER=opms
DB_PASSWORD=<strong-random-password>
DB_NAME=itd_opms
DB_SSLMODE=verify-full
DB_MAX_CONNS=100
DB_MIN_CONNS=10

# === Redis ===
REDIS_HOST=<redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<strong-random-password>
REDIS_DB=0

# === MinIO ===
MINIO_ENDPOINT=<minio-host>:9000
MINIO_ACCESS_KEY=<strong-random-key>
MINIO_SECRET_KEY=<strong-random-secret>
MINIO_USE_SSL=true
MINIO_BUCKET_EVIDENCE=evidence-vault
MINIO_BUCKET_ATTACHMENTS=attachments

# === NATS ===
NATS_URL=nats://<nats-host>:4222

# === Authentication ===
JWT_SECRET=<random-64-character-string>
JWT_EXPIRY=30m
JWT_REFRESH_EXPIRY=168h

# === Entra ID (SSO) ===
ENTRA_TENANT_ID=<azure-tenant-id>
ENTRA_CLIENT_ID=<azure-app-client-id>
ENTRA_CLIENT_SECRET=<azure-app-client-secret>

# === Observability ===
OTEL_EXPORTER_OTLP_ENDPOINT=<tempo-host>:4317
OTEL_SERVICE_NAME=itd-opms-api
LOG_LEVEL=info
LOG_FORMAT=json

# === Frontend ===
NEXT_PUBLIC_API_URL=https://opms-api.cbn.gov.ng/api/v1
```

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] Server provisioned per Section 3 specifications
- [ ] OS installed and hardened per Section 6.1
- [ ] Docker Engine and Docker Compose installed
- [ ] Nginx installed and configured
- [ ] SSL certificates obtained and installed
- [ ] DNS records configured per Section 5.4
- [ ] Firewall rules applied per Section 5.1
- [ ] Outbound access verified per Section 5.3
- [ ] Azure App Registration completed for Entra ID SSO
- [ ] Backup storage provisioned and accessible
- [ ] All environment variables prepared with production values

### Deployment

- [ ] Clone repository to server
- [ ] Configure production environment variables
- [ ] Start infrastructure services (PostgreSQL, Redis, MinIO, NATS)
- [ ] Run database migrations (`make migrate-up`)
- [ ] Seed initial data (`make seed`)
- [ ] Build and deploy API service
- [ ] Build and deploy Portal (`next build && next start`)
- [ ] Configure Nginx reverse proxy
- [ ] Start observability stack (Prometheus, Grafana, Loki, Tempo)
- [ ] Import Grafana dashboards

### Post-Deployment Verification

- [ ] API health check: `GET /api/v1/health` returns 200
- [ ] Portal accessible via browser at configured domain
- [ ] SSO login functional via Entra ID
- [ ] File upload/download working (MinIO connectivity)
- [ ] Grafana dashboards displaying metrics
- [ ] Alert rules firing correctly (test with simulated threshold)
- [ ] Backup jobs running on schedule
- [ ] Log aggregation visible in Loki
- [ ] Trace collection visible in Tempo

---

## 11. Support & Maintenance

### Routine Maintenance

| Task                              | Frequency  |
|-----------------------------------|------------|
| OS security patches               | Monthly    |
| Docker image updates              | Quarterly  |
| Database VACUUM/ANALYZE           | Weekly (automated) |
| Log rotation verification         | Monthly    |
| Backup restoration test           | Quarterly  |
| SSL certificate renewal           | Before expiry |
| Disk space monitoring review      | Weekly     |
| Performance baseline review       | Monthly    |

### Monitoring Alerts (Pre-configured)

| Alert                             | Condition               | Severity |
|-----------------------------------|-------------------------|----------|
| High API Error Rate               | >5% errors for 5 min    | Critical |
| High API Latency                  | P95 >2s for 5 min       | Warning  |
| Database Connection Exhaustion    | >80% pool used          | Critical |
| High Memory Usage                 | >85% for 10 min         | Warning  |
| SLA Breaches                      | >3 breaches in 15 min   | Critical |
| NATS Disconnection                | Service unreachable     | Critical |
| MinIO Health Failure              | Health check failing    | Critical |

---

## 12. Summary of Required Resources

### Option A: Single Server (Minimum Viable)

| Item                  | Specification           |
|-----------------------|-------------------------|
| Servers               | 1                       |
| CPU                   | 16 vCPUs                |
| RAM                   | 32 GB                   |
| Storage (OS)          | 100 GB SSD              |
| Storage (Data)        | 500 GB SSD              |
| Network               | 1 Gbps                  |
| SSL Certificate       | 1 (wildcard or multi-domain) |
| DNS Records           | 2-3                     |
| Azure App Registration| 1                       |
| Backup Storage        | 500 GB                  |

### Option B: Multi-Server (High Availability)

| Item                  | Specification           |
|-----------------------|-------------------------|
| Servers               | 5 (2 app + 2 DB + 1 storage/monitoring) |
| Total CPU             | 32 vCPUs                |
| Total RAM             | 64 GB                   |
| Total Storage         | ~2 TB SSD               |
| Network               | 1 Gbps per server       |
| Load Balancer         | 1 (hardware or software)|
| SSL Certificate       | 1 (wildcard or multi-domain) |
| DNS Records           | 3-4                     |
| Azure App Registration| 1                       |
| Backup Storage        | 1 TB                    |

---

*This document should be reviewed and approved by the Infrastructure Team Lead and Information Security Officer before server provisioning begins.*

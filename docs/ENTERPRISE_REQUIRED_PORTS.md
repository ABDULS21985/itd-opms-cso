# ITD-OPMS Enterprise Required Ports

## 1. Purpose

This document defines the required network ports to deploy ITD-OPMS in an enterprise environment.

It is based on the active runtime configuration in:

- `deploy/docker-compose.infra.yml`
- `deploy/nginx/conf.d/amsop.conf`
- `deploy/ecosystem.prod.config.js`
- `itd-opms-api/docker-compose.yml`
- `itd-opms-api/loki-config.yml`
- `itd-opms-api/tempo.yml`
- `itd-opms-api/prometheus.yml`

## 2. Deployment Profiles Covered

### Profile A (recommended for enterprise)

- Nginx terminates TLS and exposes HTTP/HTTPS.
- API and Portal run with PM2.
- Infra services (PostgreSQL, Redis, MinIO, NATS) run in Docker and bind to localhost.
- Only edge ports should be open externally.

### Profile B (full Docker stack / ops environments)

- API, data services, and observability run from `itd-opms-api/docker-compose.yml`.
- More host ports are published and must be restricted to admin networks where needed.

## 3. Mandatory Inbound Ports (North-South)

Open these at enterprise firewall/load balancer level.

| Port | Protocol | Source | Destination | Purpose | Required |
|------|----------|--------|-------------|---------|----------|
| 22 | TCP | Admin IP allowlist / bastion only | Host | SSH administration | Yes |
| 80 | TCP | Enterprise users / internal LB | Nginx | HTTP to HTTPS redirect | Yes |
| 443 | TCP | Enterprise users / internal LB | Nginx | HTTPS for Portal and API | Yes |

## 4. Conditional Inbound Ports (Admin/Ops Only)

Open only if you need direct access instead of going through Nginx, VPN, or SSH tunnel.

| Port | Protocol | Source | Service | Use Case |
|------|----------|--------|---------|----------|
| 3001 | TCP | Admin IP allowlist | Grafana (host mapped) | Direct dashboard access |
| 9090 | TCP | Admin IP allowlist | Prometheus | Direct metrics UI/API |
| 9093 | TCP | Admin IP allowlist | Alertmanager | Direct alert routing UI/API |
| 9011 | TCP | Admin IP allowlist | MinIO Console (host mapped) | Object storage admin console |
| 9010 | TCP | Integration subnet allowlist | MinIO S3 API (host mapped) | Direct S3 API access by external clients |
| 8222 | TCP | Admin IP allowlist | NATS monitoring | NATS health/monitor endpoints |
| 4317 | TCP | Observability subnet allowlist | Tempo OTLP gRPC | External telemetry ingestion |
| 4318 | TCP | Observability subnet allowlist | Tempo OTLP HTTP | External telemetry ingestion |

Security note: Keep these closed by default. Prefer private network access, bastion, or reverse proxy with authentication.

## 5. Internal Service Ports (East-West)

These ports are required for service-to-service communication inside the trusted network/host.

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| Nginx | Portal | 3000 | TCP | Reverse proxy to frontend |
| Nginx | API | 8089 | TCP | Reverse proxy to backend |
| API | PostgreSQL | 5432 | TCP | Primary database connectivity |
| API | Redis | 6379 | TCP | Cache/session/rate-limiter backend |
| API | MinIO | 9000 (or host-mapped 9010) | TCP | Object storage API |
| API | NATS | 4222 | TCP | Messaging and event streaming |
| API | Tempo | 4317 (or 4318 if HTTP exporter used) | TCP | OpenTelemetry export |
| Prometheus | API | 8089 | TCP | Scrape `/metrics` endpoint |
| Prometheus | Alertmanager | 9093 | TCP | Alert delivery |
| Grafana | Prometheus | 9090 | TCP | Metrics datasource |
| Grafana | Loki | 3100 | TCP | Logs datasource |
| Grafana | Tempo | 3200 | TCP | Traces datasource |
| Loki components | Loki gRPC server | 9096 | TCP | Internal Loki gRPC traffic |

## 6. Service Port Reference by Deployment Mode

| Service | Internal Service Port(s) | Host Port(s) in Full Docker Stack | Host Binding in Enterprise Profile |
|---------|---------------------------|-----------------------------------|------------------------------------|
| API | 8089 | 8089 | 8089 (typically behind Nginx) |
| Portal | 3000 | N/A in API compose | 3000 (behind Nginx) |
| PostgreSQL | 5432 | 5432 | 127.0.0.1:5432 |
| Redis | 6379 | 6379 | 127.0.0.1:6379 |
| MinIO S3 API | 9000 | 9010 -> 9000 | 127.0.0.1:9010 |
| MinIO Console | 9001 | 9011 -> 9001 | 127.0.0.1:9011 |
| NATS client | 4222 | 4222 | 127.0.0.1:4222 |
| NATS monitoring | 8222 | 8222 | 127.0.0.1:8222 |
| Prometheus | 9090 | 9090 | Optional/conditional |
| Alertmanager | 9093 | 9093 | Optional/conditional |
| Grafana | 3000 | 3001 -> 3000 | Optional/conditional |
| Loki HTTP | 3100 | 3100 | Optional/conditional |
| Loki gRPC | 9096 | not published | Internal only |
| Tempo HTTP API | 3200 | 3200 | Optional/conditional |
| Tempo OTLP gRPC | 4317 | 4317 | Internal or observability subnet only |
| Tempo OTLP HTTP | 4318 | not published by default | Internal only unless explicitly published |

## 7. Outbound Ports Required (Egress)

| Destination | Port | Protocol | Purpose |
|-------------|------|----------|---------|
| Microsoft Entra ID / Microsoft Graph | 443 | TCP | SSO and directory/API integration |
| SMTP relay | 587 | TCP | Email notifications |
| DNS resolvers | 53 | UDP/TCP | Name resolution |
| NTP servers | 123 | UDP | Time synchronization |
| OS package repositories | 443 | TCP | Security updates |
| Docker registries (Docker Hub/GHCR) | 443 | TCP | Pull container images |

## 8. Enterprise Firewall Baseline

1. Allow inbound `22/tcp` only from bastion/admin CIDRs.
2. Allow inbound `80/tcp` and `443/tcp` from enterprise user networks or ingress/load balancer.
3. Deny all other inbound ports by default.
4. Restrict conditional admin ports to dedicated operations subnets, VPN, or SSH tunnels.
5. Keep data-plane services (PostgreSQL, Redis, MinIO, NATS) bound to localhost or private VLAN interfaces.

## 9. Validation Checklist

- [ ] External scan shows only approved ingress ports are reachable.
- [ ] API health endpoint reachable through HTTPS reverse proxy.
- [ ] Data services are not internet-facing.
- [ ] Optional admin ports are closed or IP-restricted.
- [ ] OTLP ingestion ports are limited to observability network only.

## 10. Implementation Artifacts

- UFW baseline script: `deploy/enterprise-ufw-rules.sh`
- Enterprise firewall and security-group template: `docs/ENTERPRISE_FIREWALL_SECURITY_GROUP_RULES.md`
- CAB-ready network change request: `docs/CAB_NETWORK_CHANGE_REQUEST.md`

Example execution (update CIDRs first):

```bash
sudo ADMIN_CIDRS="10.20.0.0/24" \
	USER_CIDRS="10.0.0.0/8" \
	INTEGRATION_CIDRS="10.30.0.0/24" \
	OBSERVABILITY_CIDRS="10.40.0.0/24" \
	RESET_RULES=true \
	ASSUME_YES=true \
	bash deploy/enterprise-ufw-rules.sh
```

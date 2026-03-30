# CAB Network Change Request - ITD-OPMS Required Ports

## 1. Change Summary

- Change title: ITD-OPMS enterprise firewall and security-group rule implementation
- Change type: Normal
- Environment: Production
- Requested implementation window: <fill>
- Requested by: <fill>
- Application owner: <fill>
- Infrastructure owner: <fill>

## 2. Business Justification

This change enables secure production deployment of ITD-OPMS by allowing only mandatory network paths and restricting all other traffic.

Benefits:

- Enables user access to Portal and API over TLS
- Enables backend data and messaging connectivity
- Enables monitoring and alerting operations
- Aligns with least-privilege network segmentation

## 3. Scope

Systems in scope:

- OPMS edge reverse proxy
- OPMS application hosts (API and Portal)
- OPMS data services (PostgreSQL, Redis, MinIO, NATS)
- OPMS observability services (Prometheus, Alertmanager, Grafana, Loki, Tempo)

References:

- [docs/ENTERPRISE_REQUIRED_PORTS.md](docs/ENTERPRISE_REQUIRED_PORTS.md)
- [docs/ENTERPRISE_FIREWALL_SECURITY_GROUP_RULES.md](docs/ENTERPRISE_FIREWALL_SECURITY_GROUP_RULES.md)
- [deploy/enterprise-ufw-rules.sh](deploy/enterprise-ufw-rules.sh)

## 4. Proposed Rule Changes

### 4.1 Mandatory inbound rules

| Action | Source | Destination | Protocol | Port | Reason |
|--------|--------|-------------|----------|------|--------|
| Allow | ADMIN_BASTION_CIDRS | OPMS_HOST_OR_EDGE_LB | TCP | 22 | SSH admin access |
| Allow | ENTERPRISE_CLIENT_CIDRS | OPMS_EDGE_LB | TCP | 80 | HTTP to HTTPS redirect |
| Allow | ENTERPRISE_CLIENT_CIDRS | OPMS_EDGE_LB | TCP | 443 | User access to Portal and API |

### 4.2 Conditional inbound rules (only if approved)

| Action | Source | Destination | Protocol | Port | Reason |
|--------|--------|-------------|----------|------|--------|
| Allow | ADMIN_BASTION_CIDRS | GRAFANA_HOST | TCP | 3001 | Grafana admin UI |
| Allow | ADMIN_BASTION_CIDRS | PROMETHEUS_HOST | TCP | 9090 | Prometheus admin UI |
| Allow | ADMIN_BASTION_CIDRS | ALERTMANAGER_HOST | TCP | 9093 | Alertmanager admin UI |
| Allow | ADMIN_BASTION_CIDRS | MINIO_HOST | TCP | 9011 | MinIO console |
| Allow | INTEGRATION_S3_CIDRS | MINIO_HOST | TCP | 9010 | MinIO S3 integration |
| Allow | ADMIN_BASTION_CIDRS | NATS_HOST | TCP | 8222 | NATS monitoring |
| Allow | OBSERVABILITY_AGENT_CIDRS | TEMPO_HOST | TCP | 4317 | OTLP gRPC ingest |
| Allow | OBSERVABILITY_AGENT_CIDRS | TEMPO_HOST | TCP | 4318 | OTLP HTTP ingest |

### 4.3 East-west rules

| Action | Source zone | Destination zone | Protocol | Port(s) | Reason |
|--------|-------------|------------------|----------|---------|--------|
| Allow | EDGE | APP | TCP | 3000, 8089 | Nginx to portal/API |
| Allow | APP | DATA | TCP | 5432, 6379, 9000, 4222 | API dependencies |
| Allow | APP | OBS | TCP | 4317, 4318 (if used) | Telemetry export |
| Allow | OBS | APP | TCP | 8089 | Prometheus scrape |
| Allow | OBS | OBS | TCP | 9093, 9090, 3100, 3200, 9096 | Monitoring flows |

### 4.4 Egress rules

| Action | Source | Destination | Protocol | Port | Reason |
|--------|--------|-------------|----------|------|--------|
| Allow | OPMS_HOSTS | Microsoft Entra ID and Graph | TCP | 443 | SSO and Graph API |
| Allow | OPMS_HOSTS | Approved SMTP relay | TCP | 587 | Email notifications |
| Allow | OPMS_HOSTS | Approved DNS resolvers | UDP/TCP | 53 | DNS |
| Allow | OPMS_HOSTS | Approved NTP servers | UDP | 123 | Time sync |
| Allow | OPMS_HOSTS | Approved package and registry endpoints | TCP | 443 | Updates and image pulls |

## 5. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect source CIDRs block legitimate traffic | Service access failure | Validate CIDRs with network team before cutover |
| Missing east-west rule breaks internal dependencies | Partial service outage | Run pre-change connectivity checks and staged apply |
| Overly broad conditional port exposure | Security exposure | Keep conditional ports closed unless explicitly approved |
| Strict egress blocks required integrations | Auth and notifications fail | Validate outbound endpoints before enabling deny-by-default |

## 6. Implementation Plan

1. Confirm approved CIDR objects with network security team.
2. Apply mandatory inbound rules (22, 80, 443).
3. Apply east-west segmentation rules in app, data, and observability zones.
4. Apply required egress rules.
5. Apply conditional rules only where approved.
6. Validate application and observability health.

## 7. Validation Plan

Perform all checks after rule implementation.

- External reachability:
  - Portal and API accessible over HTTPS on 443
  - HTTP on 80 redirects to HTTPS
- Security controls:
  - No unapproved internet-exposed ports
  - Optional admin ports blocked unless approved and allowlisted
- Application health:
  - API health endpoint returns healthy
  - Portal loads successfully
- Service dependency checks:
  - API can connect to PostgreSQL, Redis, MinIO, NATS
- Observability checks:
  - Prometheus scrapes API metrics
  - Grafana dashboards load data
  - Logs and traces visible in Loki and Tempo

## 8. Rollback Plan

If impact is detected:

1. Revert newly added optional and conditional rules first.
2. Revert new east-west restrictions to previous known-good policy.
3. Maintain mandatory 22/80/443 access for administrative recovery.
4. Restore prior firewall/security-group backup configuration.
5. Re-run health checks and confirm service restoration.

## 9. Backout Criteria

Rollback is triggered if any of the following occur for more than 10 minutes:

- Portal/API unavailable to users
- API health endpoint reports unhealthy dependencies
- Authentication or notification integrations fail due to egress policy
- Monitoring data not visible in dashboards

## 10. Approvals

- Security Architect: <name/date>
- Network Operations Lead: <name/date>
- Application Owner: <name/date>
- CAB Chair: <name/date>

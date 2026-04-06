# ITD-OPMS Enterprise Firewall and Security Group Rules

## 1. Purpose

This document provides enterprise-ready rule templates for network firewall teams and cloud security-group teams.

Use this with [docs/ENTERPRISE_REQUIRED_PORTS.md](docs/ENTERPRISE_REQUIRED_PORTS.md).

## 2. Environment Variables for Rule Authoring

Replace these placeholders before submitting to network operations:

- ADMIN_BASTION_CIDRS: admin or bastion source networks
- ENTERPRISE_CLIENT_CIDRS: user or ingress client networks
- INTEGRATION_S3_CIDRS: approved subnets requiring direct MinIO S3 access
- OBSERVABILITY_AGENT_CIDRS: approved telemetry sources
- APP_SUBNETS: application subnet range(s)
- DATA_SUBNETS: data service subnet range(s)
- OBS_SUBNETS: observability subnet range(s)

## 3. North-South Inbound Rules (Mandatory)

| Rule ID | Action | Source | Destination | Protocol | Port | Notes |
|---------|--------|--------|-------------|----------|------|-------|
| NS-001 | Allow | ADMIN_BASTION_CIDRS | OPMS_HOST_OR_EDGE_LB | TCP | 22 | SSH, admin-only |
| NS-002 | Allow | ENTERPRISE_CLIENT_CIDRS | OPMS_EDGE_LB | TCP | 80 | HTTP to HTTPS redirect |
| NS-003 | Allow | ENTERPRISE_CLIENT_CIDRS | OPMS_EDGE_LB | TCP | 443 | Portal and API over TLS |
| NS-999 | Deny | Any | OPMS_EDGE_LB | Any | Any | Implicit or explicit deny all |

## 4. North-South Inbound Rules (Conditional)

Enable only if direct access is approved by security architecture.

| Rule ID | Action | Source | Destination | Protocol | Port | Notes |
|---------|--------|--------|-------------|----------|------|-------|
| NC-001 | Allow | ADMIN_BASTION_CIDRS | GRAFANA_HOST | TCP | 3001 | Direct Grafana access |
| NC-002 | Allow | ADMIN_BASTION_CIDRS | PROMETHEUS_HOST | TCP | 9090 | Direct Prometheus access |
| NC-003 | Allow | ADMIN_BASTION_CIDRS | ALERTMANAGER_HOST | TCP | 9093 | Direct Alertmanager access |
| NC-004 | Allow | ADMIN_BASTION_CIDRS | MINIO_HOST | TCP | 9011 | MinIO console |
| NC-005 | Allow | INTEGRATION_S3_CIDRS | MINIO_HOST | TCP | 9010 | MinIO S3 API |
| NC-006 | Allow | ADMIN_BASTION_CIDRS | NATS_HOST | TCP | 8222 | NATS monitoring |
| NC-007 | Allow | OBSERVABILITY_AGENT_CIDRS | TEMPO_HOST | TCP | 4317 | OTLP gRPC ingest |
| NC-008 | Allow | OBSERVABILITY_AGENT_CIDRS | TEMPO_HOST | TCP | 4318 | OTLP HTTP ingest |

## 5. East-West Rules for Segmented Networks

Apply in environments with subnet or zone-based micro-segmentation.

| Rule ID | Action | Source Zone | Destination Zone | Protocol | Port | Flow |
|---------|--------|-------------|------------------|----------|------|------|
| EW-001 | Allow | EDGE_ZONE | APP_ZONE | TCP | 3000 | Nginx to portal |
| EW-002 | Allow | EDGE_ZONE | APP_ZONE | TCP | 8089 | Nginx to API |
| EW-003 | Allow | APP_ZONE | DATA_ZONE | TCP | 5432 | API to PostgreSQL |
| EW-004 | Allow | APP_ZONE | DATA_ZONE | TCP | 6379 | API to Redis |
| EW-005 | Allow | APP_ZONE | DATA_ZONE | TCP | 9000 | API to MinIO |
| EW-006 | Allow | APP_ZONE | DATA_ZONE | TCP | 4222 | API to NATS |
| EW-007 | Allow | APP_ZONE | OBS_ZONE | TCP | 4317/4318 | API telemetry to Tempo |
| EW-008 | Allow | OBS_ZONE | APP_ZONE | TCP | 8089 | Prometheus scrape API |
| EW-009 | Allow | OBS_ZONE | OBS_ZONE | TCP | 9093 | Prometheus to Alertmanager |
| EW-010 | Allow | OBS_ZONE | OBS_ZONE | TCP | 9090 | Grafana to Prometheus |
| EW-011 | Allow | OBS_ZONE | OBS_ZONE | TCP | 3100 | Grafana to Loki |
| EW-012 | Allow | OBS_ZONE | OBS_ZONE | TCP | 3200 | Grafana to Tempo |
| EW-013 | Allow | OBS_ZONE | OBS_ZONE | TCP | 9096 | Loki internal gRPC |

## 6. Egress Rules

| Rule ID | Action | Source | Destination | Protocol | Port | Purpose |
|---------|--------|--------|-------------|----------|------|---------|
| EG-001 | Allow | OPMS_HOSTS | Microsoft Entra ID and Graph | TCP | 443 | SSO and Graph API |
| EG-002 | Allow | OPMS_HOSTS | Approved SMTP relay | TCP | 587 | Email notifications |
| EG-003 | Allow | OPMS_HOSTS | Approved DNS resolvers | UDP/TCP | 53 | DNS resolution |
| EG-004 | Allow | OPMS_HOSTS | Approved NTP servers | UDP | 123 | Time synchronization |
| EG-005 | Allow | OPMS_HOSTS | Approved package and image registries | TCP | 443 | Updates and image pulls |
| EG-999 | Deny | OPMS_HOSTS | Any | Any | Any | Optional default deny for strict egress |

## 7. Cloud Security Group Example (Fill in Values)

### 7.1 Edge Security Group

- Inbound allow:
  - TCP 22 from ADMIN_BASTION_CIDRS
  - TCP 80 from ENTERPRISE_CLIENT_CIDRS
  - TCP 443 from ENTERPRISE_CLIENT_CIDRS
- Inbound deny all else
- Outbound allow to APP_SUBNETS on TCP 3000 and 8089

### 7.2 Application Security Group

- Inbound allow from EDGE security group on TCP 8089 and 3000
- Outbound allow to DATA_SUBNETS on TCP 5432, 6379, 9000, 4222
- Outbound allow to OBS_SUBNETS on TCP 4317 and optionally 4318

### 7.3 Data Security Group

- Inbound allow from APPLICATION security group on TCP 5432, 6379, 9000, 4222
- Deny all other inbound

### 7.4 Observability Security Group

- Inbound allow from APPLICATION security group on TCP 4317 and optionally 4318
- Inbound allow from ADMIN_BASTION_CIDRS on TCP 3001, 9090, 9093 if enabled
- Internal allow for TCP 3100, 3200, 9096, 9093, 9090

## 8. Approval Checklist

- [ ] Rules match [docs/ENTERPRISE_REQUIRED_PORTS.md](docs/ENTERPRISE_REQUIRED_PORTS.md)
- [ ] Source CIDRs are least-privilege and approved
- [ ] Conditional ports are justified and approved
- [ ] Deny-all posture is enforced for non-required traffic
- [ ] Change ticket includes validation and rollback steps

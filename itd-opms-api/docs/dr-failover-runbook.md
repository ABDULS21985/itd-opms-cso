# ITD-OPMS Disaster Recovery and Failover Runbook

## Overview

This document describes the disaster recovery (DR) architecture, failover
procedures, failback steps, and quarterly drill process for the ITD-OPMS system.

---

## 1. DR Architecture

### 1.1 Components

```
 Primary Site (Active)                    DR Site (Standby)
 =====================                    ===================

 +-------------+                          +-------------+
 |  Load       |                          |  Load       |
 |  Balancer   |                          |  Balancer   |
 +------+------+                          +------+------+
        |                                        |
 +------v------+                          +------v------+
 |  API (x2)   |                          |  API (x2)   |
 +------+------+                          +------+------+
        |                                        |
 +------v------+     Streaming            +------v------+
 | PostgreSQL  | -----------------------> | PostgreSQL  |
 |  Primary    |     Replication          |  Replica    |
 +------+------+                          +------+------+
        |                                        |
 +------v------+     Mirror Sync          +------v------+
 |    MinIO    | -----------------------> |    MinIO    |
 +------+------+                          +------+------+
        |                                        |
 +------v------+     Cluster              +------v------+
 |    NATS     | -----------------------> |    NATS     |
 +------+------+                          +------+------+
        |                                        |
 +------v------+     AOF Replication      +------v------+
 |    Redis    | -----------------------> |    Redis    |
 +-------------+                          +-------------+
```

### 1.2 Recovery Objectives

| Metric | Target   | Description                               |
| ------ | -------- | ----------------------------------------- |
| RPO    | < 5 min  | Maximum data loss (WAL streaming lag)      |
| RTO    | < 30 min | Maximum time to restore service            |

### 1.3 Replication Configuration

| Component   | Method                | Lag Target |
| ----------- | --------------------- | ---------- |
| PostgreSQL  | Streaming replication | < 1 min    |
| MinIO       | Bucket replication    | < 5 min    |
| NATS        | JetStream cluster     | Real-time  |
| Redis       | Redis Sentinel/AOF    | < 1 min    |

---

## 2. Failover Trigger Criteria

Initiate failover when ANY of the following conditions are met:

### 2.1 Automatic Triggers

- Primary site health check fails for > 5 consecutive minutes
- PostgreSQL primary is unreachable for > 3 minutes
- Network connectivity to primary datacenter lost for > 5 minutes

### 2.2 Manual Triggers

- Datacenter-level outage confirmed by infrastructure team
- Planned maintenance requiring > 30 minutes of downtime
- Security incident requiring primary site isolation
- Directive from IT Department management

### 2.3 Decision Authority

| Severity        | Authorized By              |
| --------------- | -------------------------- |
| P1 - Critical   | On-call engineer (auto)    |
| P2 - High       | DevOps Lead                |
| Planned         | IT Director                |

---

## 3. Failover Procedure

### 3.1 Pre-Failover Checklist

```
[ ] Confirm primary site is truly unavailable (not a monitoring false positive)
[ ] Check replication lag on DR PostgreSQL replica
[ ] Notify stakeholders: "Initiating DR failover"
[ ] Record start time for RTO tracking
```

### 3.2 Step-by-Step Failover

#### Step 1: Promote PostgreSQL Replica

```bash
# On DR site PostgreSQL server:
# Check replication lag before promoting
docker exec dr-postgres psql -U opms -c "SELECT pg_last_wal_replay_lsn();"

# Promote replica to primary
docker exec dr-postgres pg_ctl promote -D /var/lib/postgresql/data

# Verify it is now accepting writes
docker exec dr-postgres psql -U opms -d itd_opms -c "SELECT pg_is_in_recovery();"
# Expected: false (no longer in recovery = now primary)
```

#### Step 2: Verify MinIO Data

```bash
# Check MinIO bucket status on DR site
mc ls dr-minio/evidence-vault --summarize
mc ls dr-minio/attachments --summarize

# Compare counts with last known primary counts (from monitoring)
```

#### Step 3: Start API Services on DR Site

```bash
# Update API environment to point to DR database
# (Should already be configured in DR docker-compose)
cd /opt/itd-opms-dr
docker compose up -d api

# Verify health
curl -s http://dr-api:8089/api/v1/health | jq .
```

#### Step 4: Switch DNS / Load Balancer

```bash
# Option A: Update DNS records
# Change api.itd-opms.gov.ng A record to DR site IP
# TTL should be set low (60s) in advance for fast propagation

# Option B: Update load balancer backend
# Remove primary site from backend pool
# Add DR site to backend pool
```

#### Step 5: Verify Service

```bash
# Health check through the public endpoint
curl -s https://api.itd-opms.gov.ng/api/v1/health | jq .

# Smoke test: login and fetch data
TOKEN=$(curl -s -X POST https://api.itd-opms.gov.ng/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@itd.cbn.gov.ng","password":"admin123"}' \
  | jq -r '.data.accessToken')

curl -s https://api.itd-opms.gov.ng/api/v1/audit/events \
  -H "Authorization: Bearer $TOKEN" | jq .status
```

#### Step 6: Post-Failover

```
[ ] Record completion time (RTO = completion - start)
[ ] Send notification: "DR failover complete. Service restored on DR site."
[ ] Monitor DR site closely for 24 hours
[ ] Begin root cause analysis on primary site
```

---

## 4. Failback Procedure

Once the primary site is repaired and ready to receive traffic again:

### 4.1 Pre-Failback Checklist

```
[ ] Primary site infrastructure verified healthy
[ ] Primary PostgreSQL is running and accessible
[ ] Sufficient maintenance window scheduled
[ ] Stakeholders notified of planned failback
```

### 4.2 Step-by-Step Failback

#### Step 1: Resynchronize PostgreSQL

```bash
# On primary site: set up as replica of DR (reverse replication)
# Stop the old primary PostgreSQL
docker compose stop postgres

# Clear data and configure as standby of DR
rm -rf /var/lib/postgresql/data/*
pg_basebackup -h dr-postgres-host -U replication -D /var/lib/postgresql/data -P

# Configure as standby
cat > /var/lib/postgresql/data/postgresql.auto.conf <<EOF
primary_conninfo = 'host=dr-postgres-host port=5432 user=replication password=xxx'
EOF
touch /var/lib/postgresql/data/standby.signal

# Start as replica
docker compose start postgres

# Wait for replication to catch up
docker exec opms-postgres psql -U opms -c "SELECT pg_last_wal_replay_lsn();"
```

#### Step 2: Promote Primary (Switchover)

```bash
# Stop DR API to prevent new writes
docker compose -f /opt/itd-opms-dr/docker-compose.yml stop api

# Promote primary PostgreSQL
docker exec opms-postgres pg_ctl promote -D /var/lib/postgresql/data

# Start primary API
docker compose up -d api

# Verify health
curl -s http://localhost:8089/api/v1/health | jq .
```

#### Step 3: Switch DNS Back

```bash
# Revert DNS / load balancer to primary site
```

#### Step 4: Reconfigure DR as Replica

```bash
# Reconfigure DR PostgreSQL as streaming replica of primary
# (Reverse of Step 1)
```

#### Step 5: Verify and Monitor

```
[ ] Primary site serving traffic
[ ] DR site replicating from primary
[ ] Replication lag < 1 minute
[ ] Send notification: "Failback complete. Traffic restored to primary site."
```

---

## 5. Quarterly DR Drill Procedure

DR drills should be conducted quarterly to validate the failover process.

### 5.1 Drill Schedule

| Quarter | Window                     | Type          |
| ------- | -------------------------- | ------------- |
| Q1      | Last Saturday of March     | Full failover |
| Q2      | Last Saturday of June      | Tabletop      |
| Q3      | Last Saturday of September | Full failover |
| Q4      | Last Saturday of December  | Tabletop      |

### 5.2 Full Failover Drill

1. **Preparation** (1 week before)
   - Notify all stakeholders of drill date and window
   - Verify DR site backups are current
   - Confirm replication lag is within targets
   - Prepare drill runsheet

2. **Execution** (during maintenance window)
   - Simulate primary site outage (stop primary API and database)
   - Follow Failover Procedure (Section 3)
   - Record all timestamps and issues
   - Run full smoke test suite against DR site
   - Follow Failback Procedure (Section 4)

3. **Post-Drill Review** (within 1 week)
   - Calculate actual RTO and RPO achieved
   - Document any issues encountered
   - Update runbook with lessons learned
   - File drill report

### 5.3 Tabletop Drill

1. Assemble DR team (DevOps, Backend, DBA)
2. Walk through failover procedure step by step
3. Discuss "what-if" scenarios:
   - What if PostgreSQL replication lag is > 5 minutes?
   - What if MinIO mirror is behind?
   - What if DNS propagation takes > 30 minutes?
4. Update runbook with identified gaps

### 5.4 Drill Report Template

```
DR Drill Report
===============
Date:        YYYY-MM-DD
Type:        Full Failover / Tabletop
Participants: [names]

Metrics:
  - Failover Start:   HH:MM
  - Service Restored:  HH:MM
  - Actual RTO:        XX minutes (target: 30 min)
  - Replication Lag:   XX seconds (target: < 5 min)
  - Data Verified:     Yes / No

Issues Found:
  1. [description]
  2. [description]

Action Items:
  1. [action] - Owner: [name] - Due: [date]
  2. [action] - Owner: [name] - Due: [date]

Next Drill: YYYY-MM-DD
```

---

## 6. Communication Templates

### 6.1 Failover Initiated

```
Subject: [ITD-OPMS] DR Failover Initiated

The ITD-OPMS system is experiencing an outage at the primary site.
We are initiating failover to the disaster recovery site.

Impact: Service may be briefly unavailable during failover.
Estimated recovery: 30 minutes
Next update: In 15 minutes or when failover is complete.
```

### 6.2 Failover Complete

```
Subject: [ITD-OPMS] DR Failover Complete - Service Restored

The ITD-OPMS system has been successfully failed over to the DR site.
Service is now restored.

RTO achieved: XX minutes
Data loss (RPO): None / XX minutes of data

We will continue monitoring the system closely.
Root cause analysis of the primary site outage is underway.
```

### 6.3 Failback Complete

```
Subject: [ITD-OPMS] Failback Complete - Primary Site Restored

The ITD-OPMS system has been successfully failed back to the primary site.
All services are operating normally.

The DR site has been reconfigured as standby.
```

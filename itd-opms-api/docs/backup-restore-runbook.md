# ITD-OPMS Backup and Restore Runbook

## Overview

This document describes backup and restore procedures for the ITD-OPMS system.
The primary data stores requiring backup are PostgreSQL, MinIO (object storage),
and Redis (ephemeral cache -- backup optional).

---

## 1. Backup Schedule

| Data Store  | Frequency       | Retention | Type         |
| ----------- | --------------- | --------- | ------------ |
| PostgreSQL  | Daily (02:00)   | 30 days   | Full dump    |
| PostgreSQL  | Continuous      | 7 days    | WAL archive  |
| MinIO       | Daily (03:00)   | 30 days   | Mirror sync  |
| Redis       | Not backed up   | N/A       | Ephemeral    |

---

## 2. PostgreSQL Backup

### 2.1 Manual Full Backup (pg_dump)

```bash
# Set connection variables
export PGHOST=localhost
export PGPORT=5432
export PGUSER=opms
export PGPASSWORD='<password>'
export PGDATABASE=itd_opms

# Create a compressed custom-format dump
pg_dump -Fc -f /backups/itd_opms_$(date +%Y%m%d_%H%M%S).dump

# Verify the backup file
pg_restore --list /backups/itd_opms_*.dump | head -20
```

### 2.2 Docker Compose Backup

```bash
# Backup from the running container
docker exec opms-postgres pg_dump -U opms -Fc itd_opms \
  > /backups/itd_opms_$(date +%Y%m%d_%H%M%S).dump
```

### 2.3 Automated Daily Backup (cron)

Add to crontab on the backup host:

```cron
# Daily full backup at 02:00 UTC
0 2 * * * /opt/scripts/backup-postgres.sh >> /var/log/opms-backup.log 2>&1
```

Example `/opt/scripts/backup-postgres.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR=/backups/postgres
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/itd_opms_${TIMESTAMP}.dump"

# Create backup
docker exec opms-postgres pg_dump -U opms -Fc itd_opms > "${BACKUP_FILE}"

# Verify backup is not empty
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file is empty" >&2
    exit 1
fi

echo "Backup created: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"

# Clean up old backups
find "${BACKUP_DIR}" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
echo "Cleaned backups older than ${RETENTION_DAYS} days"
```

### 2.4 WAL Archiving (Point-in-Time Recovery)

For production deployments, enable WAL archiving in `postgresql.conf`:

```ini
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'
archive_timeout = 300
```

Or use a dedicated WAL archiving tool like `pgBackRest` or `wal-g`:

```bash
# Install wal-g
# Configure wal-g for S3/MinIO storage
export WALG_S3_PREFIX=s3://opms-backups/wal
export AWS_ENDPOINT=http://minio:9000
export AWS_ACCESS_KEY_ID=opms_minio
export AWS_SECRET_ACCESS_KEY=opms_minio_secret

# Create a base backup
wal-g backup-push /var/lib/postgresql/data

# List backups
wal-g backup-list
```

---

## 3. MinIO Backup

### 3.1 Mirror to Another MinIO/S3 Bucket

```bash
# Install mc (MinIO client)
# Configure source and destination aliases
mc alias set source http://localhost:9000 opms_minio opms_minio_secret
mc alias set backup http://backup-minio:9000 backup_key backup_secret

# Mirror all buckets
mc mirror source/ backup/

# Mirror specific buckets
mc mirror source/evidence-vault backup/evidence-vault
mc mirror source/attachments backup/attachments
```

### 3.2 Local Filesystem Backup

```bash
# Export all objects to local filesystem
mc mirror source/ /backups/minio/
```

---

## 4. Restore Procedure

### 4.1 Restore PostgreSQL from Full Dump

```bash
# Stop the API to prevent writes during restore
docker compose stop api

# Drop and recreate the database
docker exec opms-postgres psql -U opms -c "DROP DATABASE IF EXISTS itd_opms;"
docker exec opms-postgres psql -U opms -c "CREATE DATABASE itd_opms OWNER opms;"

# Restore from backup
docker exec -i opms-postgres pg_restore -U opms -d itd_opms --no-owner \
  < /backups/itd_opms_20260226_020000.dump

# Verify row counts in key tables
docker exec opms-postgres psql -U opms -d itd_opms -c "
  SELECT 'users' AS tbl, count(*) FROM users
  UNION ALL
  SELECT 'tenants', count(*) FROM tenants
  UNION ALL
  SELECT 'audit_events', count(*) FROM audit_events;
"

# Restart the API
docker compose start api

# Verify health
curl -s http://localhost:8080/api/v1/health | jq .status
```

### 4.2 Point-in-Time Recovery (PITR)

If WAL archiving is enabled:

```bash
# Stop PostgreSQL
docker compose stop postgres

# Clear the data directory
rm -rf /var/lib/postgresql/data/*

# Restore base backup
wal-g backup-fetch /var/lib/postgresql/data LATEST

# Create recovery.conf (PostgreSQL 12+: recovery.signal)
cat > /var/lib/postgresql/data/recovery.signal <<EOF
EOF

cat >> /var/lib/postgresql/data/postgresql.auto.conf <<EOF
restore_command = 'wal-g wal-fetch %f %p'
recovery_target_time = '2026-02-26 01:00:00+00'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL (it will replay WAL up to target time)
docker compose start postgres
```

### 4.3 Restore MinIO

```bash
# Restore from backup mirror
mc mirror backup/evidence-vault source/evidence-vault
mc mirror backup/attachments source/attachments
```

---

## 5. Verification Steps

After any restore operation, verify data integrity:

### 5.1 API Health Check

```bash
curl -s http://localhost:8080/api/v1/health | jq .
# All services should show "healthy"
```

### 5.2 Audit Trail Integrity

```bash
# Login and verify audit checksum integrity
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@itd.cbn.gov.ng","password":"admin123"}' \
  | jq -r '.data.accessToken')

curl -s http://localhost:8080/api/v1/audit/verify \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 5.3 Row Count Verification

```bash
docker exec opms-postgres psql -U opms -d itd_opms -c "
  SELECT schemaname, relname, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 20;
"
```

### 5.4 Application Smoke Test

```bash
# Verify key endpoints return data
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/governance/policies | jq .status

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/itsm/tickets | jq .status
```

---

## 6. Backup Storage Recommendations

| Environment | Storage Target                         | Encryption  |
| ----------- | -------------------------------------- | ----------- |
| Development | Local filesystem                       | None        |
| Staging     | MinIO bucket on separate server        | SSE-S3      |
| Production  | Azure Blob / AWS S3 (cross-region)     | AES-256     |

### Production Encryption

- Enable server-side encryption on the backup bucket
- Encrypt dump files at rest using `gpg` or `age`:

```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 /backups/itd_opms_*.dump

# Decrypt for restore
gpg --decrypt /backups/itd_opms_*.dump.gpg > /tmp/restore.dump
```

---

## 7. Troubleshooting

| Issue                             | Resolution                                      |
| --------------------------------- | ----------------------------------------------- |
| pg_dump hangs                     | Check for long-running transactions / locks      |
| Restore fails with "role missing" | Use `--no-owner` flag on pg_restore              |
| Backup file is 0 bytes           | Check disk space and database connectivity        |
| WAL archive full                  | Increase retention or archive to external storage |
| MinIO mirror stalls               | Check network connectivity and bucket permissions |

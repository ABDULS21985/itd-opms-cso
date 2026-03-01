#!/usr/bin/env bash
set -euo pipefail

# ITD-OPMS Database Backup Script
# Usage: ./scripts/backup.sh [daily|weekly|monthly]

BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/itd-opms/${BACKUP_TYPE}"
BACKUP_FILE="${BACKUP_DIR}/opms_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Perform backup
echo "Starting ${BACKUP_TYPE} backup..."
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -s "${BACKUP_FILE}" ]; then
    echo "Backup created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
    echo "ERROR: Backup file is empty!" >&2
    exit 1
fi

# Retention: keep 30 daily, 12 weekly, 24 monthly
case "${BACKUP_TYPE}" in
    daily)   KEEP=30 ;;
    weekly)  KEEP=12 ;;
    monthly) KEEP=24 ;;
    *)       KEEP=30 ;;
esac

# Remove old backups
cd "${BACKUP_DIR}"
ls -t *.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -v

echo "Backup complete. Retained last ${KEEP} ${BACKUP_TYPE} backups."

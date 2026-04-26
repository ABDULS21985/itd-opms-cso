# PostgreSQL Encryption At Rest

ITD-OPMS uses PostgreSQL Community Edition, which does not include native transparent data encryption. Production deployments must provide encryption at the storage layer or use a managed PostgreSQL service with encryption at rest enabled.

## Supported Deployment Pattern

1. Provision an encrypted block device, encrypted filesystem, or managed persistent volume.
2. Create encrypted directories for PostgreSQL data and WAL archive.
3. Start the stack with the encrypted overlay:

```bash
export POSTGRES_ENCRYPTED_DATA_DIR=/secure/opms/postgres/data
export POSTGRES_ENCRYPTED_WAL_DIR=/secure/opms/postgres/wal_archive
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  -f docker-compose.postgres-encrypted.yml up -d
```

The overlay bind-mounts both `/var/lib/postgresql/data` and `/var/lib/postgresql/wal_archive` from encrypted storage, covering database files, indexes, temporary files inside the data directory, and archived WAL segments.

## Operational Checks

- Verify the backing volume is encrypted before first boot.
- Keep database backups encrypted separately; see `docs/backup-restore-runbook.md`.
- Keep `DB_SSLMODE=require` or stronger for encryption in transit.

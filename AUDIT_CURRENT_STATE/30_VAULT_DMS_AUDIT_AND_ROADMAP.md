# Vault DMS — Production Readiness Report

**Module:** Document Vault (DMS)
**Date:** 2026-03-05
**Status:** Ready for UAT deployment

---

## 1. Architecture Overview

### Backend Stack
- **Language:** Go 1.23+, chi router
- **Database:** PostgreSQL 15+ with pgx/v5 driver
- **Object Storage:** MinIO (S3-compatible) for document blobs
- **Background Worker:** `VaultWorker` goroutine (document expiry, retention checks)
- **Audit:** Full audit trail via `AuditService` (every mutation logged)

### Key Files
| File | Purpose |
|------|---------|
| `internal/modules/vault/types.go` | Type definitions, constants, policy maps, SQL column constants |
| `internal/modules/vault/service.go` | Business logic (~2780 lines), 30+ methods |
| `internal/modules/vault/handler.go` | HTTP handlers, routing, client IP middleware |
| `internal/modules/vault/worker.go` | Background goroutines (expiry, retention) |
| `internal/modules/vault/handler_test.go` | Handler-level tests (auth guards, routing, input parsing) |
| `internal/modules/vault/service_test.go` | Service-level type/constant/policy tests |

### Frontend (Next.js)
| File | Purpose |
|------|---------|
| `hooks/use-vault.ts` | React Query hooks (queries + mutations), type definitions (single source of truth) |
| `app/(dashboard)/vault/page.tsx` | Main vault page |
| `components/vault/*` | 25 UI components |

---

## 2. Migrations (ordered)

| # | File | Description |
|---|------|-------------|
| 028 | `028_document_vault.sql` | Base schema: `documents`, `document_folders`, `document_shares`, `document_access_log`, `document_lifecycle_log`, `document_comments` |
| 049 | `049_vault_dms_enhancements.sql` | Extended DMS columns: `owner_id`, `document_code`, `source_module`, `source_entity_id`, `effective_date`, `expiry_date`, `confidential`, `legal_hold`, `archived_at/by`, `deleted_at/by` |
| 050 | `050_vault_security_hardening.sql` | Granular RBAC permissions (`documents.share/approve/delete/admin`), unique partial indexes on `document_shares`, `idx_document_shares_user`, `idx_documents_expiry_active` |
| 051 | `051_vault_data_integrity.sql` | **NEW:** `is_latest` chain integrity fixes, `ip_address` default normalization, 6 operational indexes |

**Migration order matters** — apply in numerical order. All are idempotent (`IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).

**Rollback notes:** Migrations 050-051 are additive (new permissions, indexes, data fixes). Rolling back requires explicit `DROP INDEX` statements. The `is_latest` fixes in 051 are data-only corrections — they correct pre-existing inconsistencies and are safe to re-run.

---

## 3. API Endpoints

### Documents
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/vault/documents` | `documents.view` | List documents (paginated, filtered) |
| POST | `/vault/documents` | `documents.manage` | Upload document |
| GET | `/vault/documents/{id}` | `documents.view` | Get document detail |
| PUT | `/vault/documents/{id}` | `documents.manage` | Update document metadata |
| DELETE | `/vault/documents/{id}` | `documents.delete` | Soft-delete document |
| GET | `/vault/documents/{id}/download` | `documents.view` | Get presigned download URL |
| GET | `/vault/documents/{id}/preview` | `documents.view` | Get presigned preview URL |
| POST | `/vault/documents/{id}/version` | `documents.manage` | Upload new version |
| GET | `/vault/documents/{id}/versions` | `documents.view` | List version history |
| POST | `/vault/documents/{id}/lock` | `documents.manage` | Acquire exclusive lock |
| POST | `/vault/documents/{id}/unlock` | `documents.manage` | Release lock |
| POST | `/vault/documents/{id}/move` | `documents.manage` | Move to folder |
| POST | `/vault/documents/{id}/share` | `documents.share` | Share document |
| GET | `/vault/documents/{id}/shares` | `documents.view` | List active shares |
| DELETE | `/vault/documents/{id}/shares/{shareId}` | `documents.share` | Revoke share |
| GET | `/vault/documents/{id}/access-log` | `documents.view` | Paginated access log |
| POST | `/vault/documents/{id}/restore` | `documents.manage` | Restore deleted/archived |
| POST | `/vault/documents/{id}/archive` | `documents.delete` | Archive document |
| POST | `/vault/documents/{id}/transition` | `documents.manage` | Lifecycle state transition |
| GET | `/vault/documents/{id}/lifecycle` | `documents.view` | Lifecycle transition history |
| POST | `/vault/documents/{id}/comments` | `documents.manage` | Add comment |
| GET | `/vault/documents/{id}/comments` | `documents.view` | List comments |
| GET | `/vault/documents/shared-with-me` | `documents.view` | List documents shared with me |

### Folders
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/vault/folders` | `documents.view` | List all folders |
| POST | `/vault/folders` | `documents.manage` | Create folder |
| PUT | `/vault/folders/{id}` | `documents.manage` | Update folder |
| DELETE | `/vault/folders/{id}` | `documents.manage` | Delete folder |

### Search, Recent, Stats
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/vault/search` | `documents.view` | Full-text search (title, description, tags) |
| GET | `/vault/recent` | `documents.view` | User's recent uploads |
| GET | `/vault/stats` | `documents.view` | Aggregate vault statistics |

### Compliance (admin-only)
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/vault/compliance/expiring-soon` | `documents.admin` | Documents expiring within N days |
| GET | `/vault/compliance/expired` | `documents.admin` | Already-expired documents |
| GET | `/vault/compliance/retention-report` | `documents.admin` | Retention aggregates |

---

## 4. Security Model

### RBAC Permissions (6 granular)
| Permission | Purpose |
|------------|---------|
| `documents.view` | Read documents, list, search, download (subject to access-level) |
| `documents.manage` | Upload, update metadata, upload versions, lock/unlock, move, transition, comment |
| `documents.share` | Create and revoke document shares |
| `documents.approve` | Approve/reject documents in review workflow |
| `documents.delete` | Soft-delete and archive documents |
| `documents.admin` | See all docs regardless of access level, override locks, manage confidential, compliance reports |

### Access-Level Enforcement (4 tiers)
| Level | Visible in List? | Requires Explicit Access? | Allows Role Sharing? | Requires Share Expiry? |
|-------|:-:|:-:|:-:|:-:|
| `public` | Yes | No | Yes | No |
| `internal` | Yes | No | Yes | No |
| `restricted` | No | Yes | Yes | Yes |
| `confidential` | No | Yes | No | Yes |

**Enforcement points:** `ListDocuments`, `SearchDocuments`, `GetDocument`, `GetDownloadURL`, `GetPreviewURL`. Restricted/confidential documents are invisible unless the user is the owner, uploader, has an active share, or has `documents.admin`.

### Sharing Governance
- Self-sharing blocked
- Confidential: user-specific shares only (no role-based), expiry required
- Restricted: expiry required
- Duplicate active shares prevented by unique partial index
- Cross-tenant sharing prevented (validates shared user belongs to same tenant)
- Revocation: only share creator, document owner, or admin

### Workflow Authorization
| Transition | Who Can Perform |
|------------|----------------|
| → `under_review` | Owner/uploader or admin |
| → `approved`/`rejected` | `documents.approve` or admin |
| → `deleted` | `documents.delete`, owner/uploader, or admin |
| → `archived` | `documents.delete`, owner/uploader, or admin |

### Additional Security
- Legal hold blocks deletion
- Retention period blocks deletion
- Expired documents block download/preview
- Locked documents block edit/move/delete/version (by non-lock-owner)
- Admin can force-unlock documents locked by others
- Client IP logged on all access events
- Unauthorized access attempts logged to audit trail

---

## 5. Document Lifecycle

```
           ┌─────────────────────────────────────────────────┐
           │                    DRAFT                        │
           │  (upload creates as 'active' by default)        │
           └────────┬────────────────────────────────────────┘
                    │
              ┌─────▼──────┐
              │   ACTIVE   │◄─── (restored from deleted/archived/expired)
              └──┬──┬──┬───┘
                 │  │  │
    ┌────────────┘  │  └──────────────┐
    ▼               ▼                 ▼
┌────────────┐ ┌──────────┐   ┌──────────┐
│UNDER_REVIEW│ │ ARCHIVED │   │ DELETED  │
└──┬──┬──────┘ └────┬─────┘   └────┬─────┘
   │  │             │              │
   ▼  ▼             ▼              ▼
┌────────┐  ┌──────────┐   ┌──────────┐
│APPROVED│  │RESTORED  │   │RESTORED  │
└──┬─────┘  └──────────┘   └──────────┘
   │
   ▼
┌────────────┐     ┌─────────┐
│  REJECTED  │     │ EXPIRED │ ◄── (automatic via VaultWorker)
└────────────┘     └────┬────┘
                        ▼
                   ┌──────────┐
                   │RESTORED  │
                   └──────────┘
```

**9 states:** `active`, `draft`, `under_review`, `approved`, `rejected`, `archived`, `deleted`, `expired`, `restored`

---

## 6. Background Worker

### VaultWorker
- **Starts:** Automatically on server boot
- **Stops:** On graceful shutdown (`SIGTERM`/`SIGINT`)
- **Goroutines:** 2

| Task | Interval | Behavior |
|------|----------|----------|
| `expireDocuments` | Every 6 hours (+ once at startup) | Finds documents with `expiry_date < NOW()` and `status NOT IN ('deleted','expired','archived')`. Updates status to `expired`, logs lifecycle transition, logs audit event. Processes up to 500 per run. |
| `checkRetention` | Every 6 hours | Counts documents past `retention_until` that are still active. Logs warning to `slog`. Informational only — no auto-action. |

---

## 7. Performance Optimizations

### GetStats: Single CTE Query
- **Before:** 5 separate DB round-trips (total docs/size, folder count, classification breakdown, status breakdown, recent uploads)
- **After:** Single CTE query scans `documents` once, aggregates all stats, includes folder count as subquery. Classification and status breakdowns returned as JSON and unmarshaled in Go.

### Operational Indexes (migration 051)
| Index | Purpose |
|-------|---------|
| `idx_documents_tenant_latest_status` | Composite index for list/search queries (tenant_id, is_latest, status) |
| `idx_document_access_log_doc_time` | Access log pagination (document_id, created_at DESC) |
| `idx_document_comments_doc_time` | Comment listing (document_id, created_at) |
| `idx_document_lifecycle_log_doc_time` | Lifecycle listing (document_id, created_at DESC) |
| `idx_documents_version_chain` | Version chain queries (parent_document_id, version) |
| `idx_document_folders_org_unit` | Org-scope folder filtering (tenant_id, org_unit_id) |

### Search
- ILIKE on `title` and `description` — acceptable for current data volumes
- Phase-2 option: `pg_trgm` GIN index for sub-string search acceleration at scale

---

## 8. Configuration Checklist

### Environment Variables / Config
| Key | Required | Description |
|-----|:--------:|-------------|
| `minio.endpoint` | Yes | MinIO server address (e.g., `minio:9000`) |
| `minio.access_key` | Yes | MinIO access key |
| `minio.secret_key` | Yes | MinIO secret key |
| `minio.use_ssl` | Yes | Whether to use HTTPS for MinIO |
| `minio.bucket_attachments` | Yes | Bucket name for vault document storage |
| `database.url` | Yes | PostgreSQL connection string |

### MinIO Setup
1. Ensure the `bucket_attachments` bucket exists (e.g., `opms-attachments`)
2. Set appropriate bucket lifecycle policies if desired
3. Ensure the MinIO access key has `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions on the bucket
4. Presigned URLs require the MinIO endpoint to be reachable from the client browser

### File Upload Limits
- Max file size: **50 MB** (enforced in Go, not just proxy-level)
- Allowed MIME types: PDF, Word, Excel, PowerPoint, PNG, JPEG, GIF, WebP, TXT, CSV, JSON, XML, ZIP

---

## 9. Test Summary

### Tests Passing: 112
| Category | Count | Description |
|----------|:-----:|-------------|
| Auth guard tests | 60+ | Every endpoint returns 401 without auth token |
| Route registration | 1 | Verifies all routes are registered |
| Input validation (handler) | 5 | Invalid UUID, missing multipart form, etc. |
| Type/constant tests | 45+ | JSON round-trips, policy maps, valid transitions, permission constants, classification/access-level completeness |

### Test Architecture Note
Service-layer validation tests (e.g., ShareDocument business rules, TransitionStatus authorization) require a running PostgreSQL database and are covered by integration tests. The handler_test.go uses a nil pool so only tests handler-level concerns (auth guards, input parsing, routing).

---

## 10. Bugs Fixed During This Audit

| Bug | Severity | Fix |
|-----|----------|-----|
| `scanComplianceDocs` returning `total: 0` | **High** — compliance endpoints returned wrong pagination | Changed signature to `([]ComplianceDocument, error)`, callers now return their own computed total |
| `GetExpiringSoon` count query had unnecessary JOIN | Low — performance | Removed unused `LEFT JOIN users ou` from count query |
| `UnlockDocument` had no admin override | **Medium** — orphaned locks if user leaves org | Added `documents.admin` permission check |
| `is_latest` chain potential inconsistency | Medium — data integrity | Migration 051 fixes 3 scenarios |
| Duplicate vault types in `types/system.ts` | Low — maintenance burden | Removed duplicates, single source of truth in `use-vault.ts` |
| 4 unused frontend hooks | Low — dead code | Removed `useDocumentDownloadUrl`, `useDocumentPreviewUrl`, `useVaultSearch`, `useRecentDocuments` |

---

## 11. UAT Checklist

### Document Upload & Management
- [ ] Upload a PDF document with title, description, classification, tags
- [ ] Upload fails for files > 50 MB
- [ ] Upload fails for disallowed MIME types (e.g., `.exe`)
- [ ] Upload to a specific folder
- [ ] Edit document metadata (title, description, tags, classification, access level)
- [ ] Edit blocked when document is locked by another user
- [ ] Delete a document (soft delete)
- [ ] Restore a deleted document
- [ ] Archive a document
- [ ] Restore an archived document

### Version Management
- [ ] Upload a new version of an existing document
- [ ] View version history shows all versions
- [ ] Previous version marked `is_latest = false`
- [ ] New version inherits metadata from parent

### Lock/Unlock
- [ ] Lock a document — other users cannot edit/move/delete
- [ ] Unlock a document — only lock owner can unlock
- [ ] Admin can force-unlock documents locked by others
- [ ] Already-locked document returns conflict error

### Folder Management
- [ ] Create folder with name, description, color
- [ ] Create nested folder (with parentId)
- [ ] Update folder name/description/color
- [ ] Delete empty folder
- [ ] Delete folder with documents fails or handles gracefully
- [ ] Move document to different folder
- [ ] Move document to root (null folderId)

### Search & Filtering
- [ ] Search by title substring
- [ ] Search by description substring
- [ ] Filter by classification
- [ ] Filter by status
- [ ] Filter by folder
- [ ] Filter by tags
- [ ] Pagination works correctly (page, limit)
- [ ] Recent documents shows user's own uploads

### Download & Preview
- [ ] Download generates valid presigned URL
- [ ] Preview generates valid presigned URL (shorter TTL)
- [ ] Download blocked for expired documents
- [ ] Download blocked for restricted docs without share (non-owner)

### Sharing
- [ ] Share document with specific user (view permission)
- [ ] Share document with specific user (download permission)
- [ ] Share document with role
- [ ] List active shares
- [ ] Revoke a share
- [ ] Cannot share with self
- [ ] Confidential docs: role-based sharing blocked
- [ ] Restricted/confidential docs: share requires expiry date
- [ ] Duplicate share returns conflict error

### Workflow / Lifecycle
- [ ] Transition: active → under_review (by owner)
- [ ] Transition: under_review → approved (by approver)
- [ ] Transition: under_review → rejected (by approver)
- [ ] Transition: active → archived (by delete perm)
- [ ] Invalid transition returns 400 error
- [ ] Lifecycle log shows all transitions with timestamps

### Comments
- [ ] Add comment to a document
- [ ] Add reply comment (with parentId)
- [ ] List comments shows chronological order

### Access Log
- [ ] View access log shows view/download/upload/preview actions
- [ ] Access log records client IP address
- [ ] Access log is paginated

### Security / RBAC
- [ ] User with only `documents.view` cannot upload
- [ ] User with only `documents.view` cannot delete
- [ ] User without `documents.share` cannot share (unless owner)
- [ ] User without `documents.approve` cannot approve/reject
- [ ] User without `documents.admin` cannot access compliance endpoints
- [ ] Restricted document invisible in list for non-owner/non-shared user
- [ ] Confidential document invisible in search for non-owner/non-shared user
- [ ] Legal hold blocks deletion
- [ ] Retention period blocks deletion

### Compliance (admin only)
- [ ] Expiring soon: returns documents within N days of expiry
- [ ] Expired: returns expired documents
- [ ] Retention report: returns aggregate stats

### Stats Dashboard
- [ ] Stats shows total documents, total size, total folders
- [ ] Stats shows classification breakdown
- [ ] Stats shows status breakdown
- [ ] Stats shows recent uploads (last 7 days)

---

## 12. Monitoring & Alerting Recommendations

### Structured Logging (slog)
All background worker events use structured logging:
- `slog.Info("vault worker started")`
- `slog.Info("vault worker: expiring documents", "count", N)`
- `slog.Warn("vault worker: documents past retention period found", "count", N)`
- `slog.Error("vault worker: failed to ...", "error", err)`

### Recommended Alerts
| Alert | Condition | Severity |
|-------|-----------|----------|
| Vault worker expiry failures | `vault worker: failed to expire document` in logs | Warning |
| Retention violations | `documents past retention period found` with count > 0 | Info |
| Upload failures | MinIO `PutObject` errors | Critical |
| Download URL generation failures | MinIO `PresignedGetObject` errors | Critical |
| Unauthorized access attempts | `access_denied:vault_document` audit events | Warning |

### Health Check
The vault module uses the existing platform health endpoint. MinIO connectivity is checked as part of `ServiceHealth`.

---

## 13. Phase-2 Enhancement Recommendations

| Enhancement | Rationale |
|-------------|-----------|
| `pg_trgm` GIN index on `title`/`description` | Sub-string search acceleration at scale (>100K documents) |
| Document preview rendering | Server-side PDF/image thumbnail generation |
| Bulk operations | Bulk move, bulk delete, bulk tag assignment |
| Document templates | Pre-defined metadata templates for common document types |
| Automated retention actions | Auto-archive or auto-notify on retention expiry (currently informational only) |
| Share notifications | Email/in-app notification when a document is shared with a user |
| Full-text search with `tsvector` | PostgreSQL native full-text search for natural language queries |
| Document OCR | Text extraction from scanned PDFs for search indexing |
| Quota management | Per-tenant or per-org-unit storage quotas |
| Virus scanning | ClamAV integration for uploaded files |

---

## 14. Deployment Steps

1. **Run migrations** (in order):
   ```bash
   # If not already applied:
   psql -f migrations/028_document_vault.sql
   psql -f migrations/049_vault_dms_enhancements.sql
   psql -f migrations/050_vault_security_hardening.sql
   psql -f migrations/051_vault_data_integrity.sql
   ```

2. **Verify MinIO bucket** exists:
   ```bash
   mc alias set opms http://minio:9000 $ACCESS_KEY $SECRET_KEY
   mc mb opms/$BUCKET_ATTACHMENTS --ignore-existing
   ```

3. **Deploy API** — `VaultWorker` starts automatically on server boot.

4. **Verify** — `GET /api/v1/health` should show all services healthy.

5. **Run UAT** — use the checklist in Section 11 above.

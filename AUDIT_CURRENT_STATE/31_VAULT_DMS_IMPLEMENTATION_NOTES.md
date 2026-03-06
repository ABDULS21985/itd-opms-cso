# Vault DMS Enhancement — Implementation Notes

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `migrations/049_vault_dms_enhancements.sql` | **New** | Schema additions: lifecycle states, comments, lifecycle log, extended metadata |
| `internal/modules/vault/types.go` | **Rewritten** | 9 lifecycle statuses, transition matrix, 5 permissions, new DTOs, DRY SQL helpers |
| `internal/modules/vault/service.go` | **Rewritten** | Bug fixes, new methods, DRY scan helpers, lifecycle engine |
| `internal/modules/vault/handler.go` | **Rewritten** | 10 new endpoints, 29 total routes |
| `internal/modules/vault/handler_test.go` | **Rewritten** | 85 tests (29 auth guards, 24 input validations, 1 route registration covering 29 routes) |
| `internal/modules/vault/types_test.go` | **Rewritten** | Constants, transitions, JSON round-trip for all types including new ones |

---

## Bug Fixes

### 1. Lock Race Condition (Critical)
**Before:** Separate `SELECT locked_by` + `UPDATE` allowed concurrent lock acquisition.
**After:** Single atomic `UPDATE ... WHERE locked_by IS NULL` with `RowsAffected()` check. Fallback query only runs to determine the correct error message.

### 2. Folder Rename Path Cascade (Missing)
**Before:** `UpdateFolder` updated name but not child folder paths.
**After:** When `name` changes, path is recomputed and a transaction cascades `UPDATE ... SET path = new_prefix || SUBSTRING(path FROM len(old_prefix)+1)` to all descendant folders.

### 3. File Read Memory Safety
**Before:** `io.ReadAll(file)` could buffer up to 50MB+ in memory without limit.
**After:** `io.ReadAll(io.LimitReader(file, MaxFileSize+1))` with post-read size check.

### 4. Legal Hold & Retention Enforcement
**Before:** Delete ignored legal hold and retention.
**After:** `DeleteDocument` rejects if `legal_hold = true` or `retention_until > now()`.

### 5. Deleted Document Download Block
**Before:** `GetDownloadURL` filtered `status != 'deleted'` but new statuses could slip through.
**After:** Explicit `status == 'deleted'` check with early return.

---

## New Capabilities

### Document Lifecycle State Machine
- **9 states:** draft, active, under_review, approved, rejected, archived, expired, deleted, restored
- **Transition matrix** in `ValidTransitions` enforces allowed paths
- **3 convenience endpoints:** `/restore`, `/archive`, `/transition` (generic)
- **Lifecycle log:** Every transition recorded in `document_lifecycle_log` with actor, reason, timestamp

### Comments & Collaboration
- **Threaded comments** via `parent_id` self-reference
- `POST /{id}/comments` — add comment (supports reply-to)
- `GET /{id}/comments` — list all comments chronologically

### Share Management
- **Expanded permissions:** view, download, edit, share, approve
- `GET /{id}/shares` — list active (non-revoked, non-expired) shares
- `DELETE /{id}/shares/{shareId}` — soft-revoke (sets `revoked_at`, `revoked_by`)

### Document Preview
- `GET /{id}/preview` — returns presigned URL (5-min TTL) + content type for inline rendering

### Extended Metadata
- `owner_id` — distinct from `uploaded_by`, defaults to uploader
- `document_code` — human-readable reference (e.g., DOC-2024-001)
- `source_module` / `source_entity_id` — cross-module linking
- `effective_date` / `expiry_date` — document validity window
- `confidential` — boolean flag for sensitivity marking
- `legal_hold` — prevents deletion
- `archived_at/by`, `deleted_at/by` — full audit trail for lifecycle transitions

### Stats Enhancement
- `byStatus` map added to `VaultStats` for lifecycle distribution

---

## API Contract Summary

### Existing Endpoints (Enhanced)

| Method | Path | Changes |
|--------|------|---------|
| `GET /documents` | No change (extended columns returned) |
| `POST /documents` | Now sets `owner_id` = uploader |
| `GET /documents/{id}` | Extended fields in response |
| `PUT /documents/{id}` | New fields: `documentCode`, `ownerId`, `effectiveDate`, `expiryDate`, `confidential`, `retentionUntil` |
| `DELETE /documents/{id}` | Enforces legal hold & retention; records `deleted_at/by`; logs lifecycle |
| `GET /documents/{id}/download` | Blocks deleted docs |
| `POST /documents/{id}/version` | Carries forward all extended metadata |
| `GET /documents/{id}/versions` | Extended fields |
| `POST /documents/{id}/lock` | **Atomic** (race-condition fix) |
| `POST /documents/{id}/unlock` | No change |
| `POST /documents/{id}/move` | No change |
| `POST /documents/{id}/share` | Accepts `share` and `approve` permissions |
| `GET /documents/{id}/access-log` | No change |
| `GET /folders` | No change |
| `POST /folders` | No change |
| `PUT /folders/{id}` | **Cascades path on rename** |
| `DELETE /folders/{id}` | No change |
| `GET /search` | Extended fields |
| `GET /recent` | Extended fields |
| `GET /stats` | New `byStatus` field |

### New Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET /documents/{id}/preview` | `documents.view` | Presigned preview URL (5-min TTL) + content type |
| `GET /documents/{id}/shares` | `documents.view` | List active shares for a document |
| `DELETE /documents/{id}/shares/{shareId}` | `documents.manage` | Soft-revoke a share |
| `POST /documents/{id}/restore` | `documents.manage` | Restore deleted/archived/expired document |
| `POST /documents/{id}/archive` | `documents.manage` | Archive a document |
| `POST /documents/{id}/transition` | `documents.manage` | Generic lifecycle transition (body: `{toStatus, reason?}`) |
| `GET /documents/{id}/lifecycle` | `documents.view` | Lifecycle transition history |
| `POST /documents/{id}/comments` | `documents.manage` | Add comment (body: `{content, parentId?}`) |
| `GET /documents/{id}/comments` | `documents.view` | List all comments |

### New Request Types

```json
// TransitionStatusRequest
{ "toStatus": "approved", "reason": "Reviewed and approved" }

// AddCommentRequest
{ "content": "Please review section 3", "parentId": "uuid-optional" }
```

### New Response Types

```json
// DocumentComment
{
  "id": "uuid", "documentId": "uuid", "tenantId": "uuid",
  "userId": "uuid", "content": "string", "parentId": "uuid?",
  "createdAt": "timestamp", "updatedAt": "timestamp", "userName": "string"
}

// DocumentLifecycleEntry
{
  "id": "uuid", "documentId": "uuid", "tenantId": "uuid",
  "fromStatus": "string", "toStatus": "string",
  "changedBy": "uuid", "reason": "string?",
  "createdAt": "timestamp", "changedByName": "string"
}
```

---

## Migration: 049_vault_dms_enhancements.sql

### Schema Changes
1. **documents.status** CHECK expanded: `draft, active, under_review, approved, rejected, archived, expired, deleted, restored`
2. **document_shares.permission** CHECK expanded: `view, download, edit, share, approve`
3. **New columns on documents:** `owner_id, document_code, source_module, source_entity_id, effective_date, expiry_date, confidential, legal_hold, archived_at, archived_by, deleted_at, deleted_by`
4. **New table: document_comments** (threaded, with trigger)
5. **New table: document_lifecycle_log** (immutable audit)
6. **document_shares:** added `revoked_at, revoked_by`
7. **New indexes:** expiry, retention, legal hold, owner, source module, active shares

### Data Migration
- Existing rows: `owner_id` backfilled from `uploaded_by`

---

## Code Architecture Improvements

### DRY Scan Pattern
- `documentColumns` and `documentJoins` constants in `types.go` define the canonical SELECT/FROM clause
- `scanDocument()` and `scanDocumentRows()` in `service.go` eliminate all repeated 40-column scan blocks
- Adding a new column requires changes in exactly 3 places: constant, scan function, struct

### Test Coverage
- **85 tests total** (up from 46)
- 29 auth guard tests (401) covering every endpoint
- 24 input validation tests (400) covering UUID parsing, body parsing, and required params
- 1 comprehensive route registration test covering all 29 routes
- Full constant coverage including lifecycle transitions (24 transition cases)
- JSON round-trip tests for all domain types including new ones
- Request type deserialization tests for all request types

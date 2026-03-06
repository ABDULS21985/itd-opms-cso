# Document Vault Module — Complete Implementation Documentation

> **Module URL:** `http://localhost:3000/dashboard/vault`
> **API Base:** `http://localhost:8089/api/v1/vault`
> **Date:** 2026-03-04

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend — Go API](#backend--go-api)
5. [Frontend — Next.js Portal](#frontend--nextjs-portal)
6. [Data Flow Examples](#data-flow-examples)
7. [Authorization & Security](#authorization--security)
8. [File Inventory](#file-inventory)

---

## Overview

The Document Vault is a secure, multi-tenant file management system supporting:

| Capability | Detail |
|---|---|
| File Storage | MinIO (S3-compatible), presigned download URLs |
| Versioning | Parent-document-ID chain with `is_latest` flag |
| Locking | Exclusive edit lock per user |
| Folder Hierarchy | Nested folders with path-based uniqueness |
| Classification | 6 types: audit_evidence, operational, configuration, policy, report, transient |
| Access Levels | 4 levels: public, internal, restricted, confidential |
| Sharing | Per-user or per-role with view/download/edit permissions and optional expiry |
| Audit Trail | `document_access_log` table — every upload, download, view, lock, unlock, share, delete |
| Org-Unit Scoping | Hierarchical organizational unit filtering on documents and folders |
| Soft Deletes | Status field (`active` / `deleted`), never hard-deleted |
| Max File Size | 50 MB |
| Accepted Types | PDF, Word, Excel, PowerPoint, images (PNG/JPG/GIF/WebP), text, CSV, ZIP |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js Portal (localhost:3000)                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  /dashboard/vault/page.tsx  (single-page, 1651 lines)  │  │
│  │  ├── Grid / List toggle                                │  │
│  │  ├── Folder tree sidebar                               │  │
│  │  ├── Search + classification filter                    │  │
│  │  ├── Upload modal (drag-and-drop)                      │  │
│  │  ├── New folder modal                                  │  │
│  │  └── Document drawer (details / versions / access log) │  │
│  └────────────────────────────────────────────────────────┘  │
│  hooks/use-vault.ts  (11 queries, 11 mutations)              │
│  components/shared/document-upload.tsx                        │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP (Bearer JWT / OIDC cookie)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Go API (localhost:8089)                                     │
│  internal/modules/vault/                                     │
│  ├── handler.go   — 17 HTTP handlers                        │
│  ├── service.go   — 22 service methods                      │
│  └── types.go     — DTOs, constants, validation             │
└──────────┬───────────────────────────┬───────────────────────┘
           │ pgx                       │ minio-go
           ▼                           ▼
    ┌──────────┐               ┌──────────────┐
    │ PostgreSQL│               │ MinIO (S3)   │
    │ 4 tables  │               │ Object store │
    └──────────┘               └──────────────┘
```

---

## Database Schema

### Migration Files

| File | Purpose |
|---|---|
| `migrations/028_document_vault.sql` | Initial vault schema (4 tables, indexes, trigger) |
| `migrations/046_org_unit_id_remaining_modules.sql` | Adds `org_unit_id` to documents + document_folders with backfill |

### Table: `documents`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID FK tenants | Multi-tenant isolation |
| `title` | TEXT | Defaults to filename if not provided |
| `description` | TEXT NULL | |
| `file_key` | TEXT | MinIO object key: `tenants/{tid}/vault/{docId}/{filename}` |
| `content_type` | TEXT | MIME type |
| `size_bytes` | INT8 | |
| `checksum_sha256` | TEXT | Computed on upload |
| `classification` | TEXT | One of 6 allowed values |
| `retention_until` | TIMESTAMP NULL | |
| `tags` | TEXT[] | PostgreSQL array |
| `folder_id` | UUID FK document_folders NULL | |
| `version` | INT | Starts at 1, incremented per version |
| `parent_document_id` | UUID FK documents NULL | Links versions to root doc |
| `is_latest` | BOOLEAN | Only one version per chain is true |
| `locked_by` | UUID FK users NULL | Exclusive edit lock |
| `locked_at` | TIMESTAMP NULL | |
| `status` | TEXT | `active` or `deleted` |
| `access_level` | TEXT | public / internal / restricted / confidential |
| `uploaded_by` | UUID FK users | |
| `org_unit_id` | UUID FK org_units NULL | Organizational scoping |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Indexes:** `idx_documents_folder`, `idx_documents_parent`, `idx_documents_latest` (partial on is_latest=true), `idx_documents_status` (partial on status='active'), `idx_documents_org_unit` (partial on NOT NULL).

### Table: `document_folders`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID FK tenants | |
| `parent_id` | UUID FK document_folders NULL | Hierarchical nesting |
| `name` | TEXT | |
| `description` | TEXT NULL | |
| `path` | TEXT | Full path like `/Finance/Invoices`, UNIQUE(tenant_id, path) |
| `color` | TEXT NULL | UI color coding |
| `created_by` | UUID FK users | |
| `org_unit_id` | UUID FK org_units NULL | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | Auto-updated via trigger |

**Indexes:** `idx_document_folders_parent`, `idx_document_folders_path`, `idx_document_folders_org_unit`.

### Table: `document_access_log`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `document_id` | UUID FK documents | |
| `tenant_id` | UUID FK tenants | |
| `user_id` | UUID FK users | |
| `action` | TEXT | upload / download / view / lock / unlock / share / delete |
| `ip_address` | TEXT NULL | |
| `created_at` | TIMESTAMP | |

**Indexes:** `idx_document_access_log_doc`, `idx_document_access_log_user`.

### Table: `document_shares`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `document_id` | UUID FK documents | |
| `tenant_id` | UUID FK tenants | |
| `shared_with_user_id` | UUID FK users NULL | Per-user sharing |
| `shared_with_role` | TEXT NULL | Per-role sharing |
| `permission` | TEXT | view / download / edit |
| `shared_by` | UUID FK users | |
| `expires_at` | TIMESTAMP NULL | Time-limited shares |
| `created_at` | TIMESTAMP | |

**Indexes:** `idx_document_shares_doc`, `idx_document_shares_user`.

---

## Backend — Go API

### Files

| File | Purpose |
|---|---|
| `internal/modules/vault/handler.go` | 17 HTTP handlers |
| `internal/modules/vault/service.go` | 22 service methods (DB + MinIO) |
| `internal/modules/vault/types.go` | DTOs, constants, validation maps |
| `internal/modules/vault/types_test.go` | Type validation tests |
| `internal/modules/vault/handler_test.go` | Handler tests |

### Service Dependencies

```go
type Service struct {
    pool     *pgxpool.Pool       // PostgreSQL
    minio    *minio.Client       // MinIO S3
    minioCfg config.MinIOConfig  // Bucket name, etc.
    auditSvc *audit.AuditService // Audit trail logging
}
```

### Constants

```go
// Status
DocumentStatusActive  = "active"
DocumentStatusDeleted = "deleted"

// Classifications
ClassificationAuditEvidence = "audit_evidence"
ClassificationOperational   = "operational"
ClassificationConfiguration = "configuration"
ClassificationPolicy        = "policy"
ClassificationReport        = "report"
ClassificationTransient     = "transient"

// Access Levels
AccessLevelPublic       = "public"
AccessLevelInternal     = "internal"
AccessLevelRestricted   = "restricted"
AccessLevelConfidential = "confidential"

// Share Permissions
PermissionView     = "view"
PermissionDownload = "download"
PermissionEdit     = "edit"

// Constraints
MaxFileSize = 50 << 20  // 50 MB
AllowedContentTypes = 14 MIME types
```

### API Endpoints (17)

#### Document CRUD

| Method | Path | Permission | Handler | Description |
|---|---|---|---|---|
| GET | `/documents` | documents.view | ListDocuments | Paginated list with folder/classification/status/search/tags filters |
| POST | `/documents` | documents.manage | UploadDocument | Multipart upload with metadata (title, description, classification, accessLevel, folderId, tags) |
| GET | `/documents/{id}` | documents.view | GetDocument | Single document with joined uploader/folder names |
| PUT | `/documents/{id}` | documents.manage | UpdateDocument | Partial update (title, description, tags, classification, accessLevel, folderId). Lock-checked |
| DELETE | `/documents/{id}` | documents.manage | DeleteDocument | Soft-delete (status → deleted). Lock-checked |

#### Download, Versioning & Locking

| Method | Path | Permission | Handler | Description |
|---|---|---|---|---|
| GET | `/documents/{id}/download` | documents.view | GetDownloadURL | Returns presigned MinIO URL (15 min TTL) + fileName. Logs "download" |
| POST | `/documents/{id}/version` | documents.manage | UploadVersion | Upload new version; sets prior version `is_latest=false` in a transaction. Lock-checked |
| GET | `/documents/{id}/versions` | documents.view | ListVersions | All versions ordered by version DESC |
| POST | `/documents/{id}/lock` | documents.manage | LockDocument | Sets locked_by + locked_at. Fails if already locked |
| POST | `/documents/{id}/unlock` | documents.manage | UnlockDocument | Clears lock. Only lock owner can unlock |

#### Move, Share & Access Log

| Method | Path | Permission | Handler | Description |
|---|---|---|---|---|
| POST | `/documents/{id}/move` | documents.manage | MoveDocument | Move document to another folder (or root if null) |
| POST | `/documents/{id}/share` | documents.manage | ShareDocument | Create share record (user or role, view/download/edit, optional expiry) |
| GET | `/documents/{id}/access-log` | documents.view | GetAccessLog | Paginated audit entries with user names |

#### Folders

| Method | Path | Permission | Handler | Description |
|---|---|---|---|---|
| GET | `/folders` | documents.view | ListFolders | All folders with document_count. Org-scoped |
| POST | `/folders` | documents.manage | CreateFolder | Path auto-built from parent. Unique(tenant_id, path) |
| PUT | `/folders/{id}` | documents.manage | UpdateFolder | Partial update (name, description, color) |
| DELETE | `/folders/{id}` | documents.manage | DeleteFolder | Fails if contains documents or child folders |

#### Search & Stats

| Method | Path | Permission | Handler | Description |
|---|---|---|---|---|
| GET | `/search` | documents.view | SearchDocuments | ILIKE search on title, description, tags. Org-scoped |
| GET | `/recent` | documents.view | GetRecentDocuments | Current user's recent uploads (limit 1–50) |
| GET | `/stats` | documents.view | GetStats | totalDocuments, totalSizeBytes, totalFolders, byClassification, recentUploads (7 days) |

---

## Frontend — Next.js Portal

### Files

| File | Purpose |
|---|---|
| `app/dashboard/vault/page.tsx` | Main vault page (1,651 lines, single file) |
| `hooks/use-vault.ts` | 11 query hooks + 11 mutation hooks |
| `components/shared/document-upload.tsx` | Drag-and-drop file upload component |
| `types/system.ts` (lines 478–549) | TypeScript interfaces for vault entities |

### Page Layout

The vault is a **single-page application** with these UI sections:

```
┌───────────────────────────────────────────────────────────┐
│  Header: "Document Vault" + stats bar                     │
│  (total docs, total size, folders, recent uploads)        │
├───────────┬───────────────────────────────────────────────┤
│  Sidebar  │  Toolbar: Search | Classification filter |    │
│  ─────── │          View toggle (grid/list) |             │
│  Folder   │          New Folder | Upload btns             │
│  Tree     ├───────────────────────────────────────────────┤
│  (recur-  │  Document Grid/List                           │
│   sive)   │  ┌────┐ ┌────┐ ┌────┐                        │
│           │  │Doc1│ │Doc2│ │Doc3│  ...                    │
│  "All     │  └────┘ └────┘ └────┘                        │
│   Docs"   │                                               │
│  Folder A │  Pagination: < 1 2 3 ... >                    │
│    └─ B   ├───────────────────────────────────────────────┤
│  Folder C │  Document Drawer (slides in from right)       │
│           │  Tabs: Details | Versions | Access Log        │
│           │  Actions: Download, Lock/Unlock, Delete       │
└───────────┴───────────────────────────────────────────────┘
```

### Component State

```typescript
// View
viewMode: "grid" | "list"
page: number

// Navigation
selectedFolderId: string | null
searchQuery: string
classification: string         // filter dropdown

// Document Drawer
selectedDocId: string | null
drawerTab: "details" | "versions" | "access"

// Upload Modal
showUploadModal: boolean
uploadTitle: string
uploadDescription: string
uploadClassification: string   // default: "operational"
uploadAccessLevel: string      // default: "internal"
uploadTags: string             // comma-separated

// New Folder Modal
showNewFolderModal: boolean
newFolderName: string
newFolderDescription: string
newFolderColor: string         // default: "#3B82F6"
```

### Classification Colors (UI)

| Classification | Color |
|---|---|
| audit_evidence | amber-500 |
| operational | blue-500 |
| configuration | purple-500 |
| policy | red-500 |
| report | green-500 |
| transient | gray-400 |

### React Query Hooks (`hooks/use-vault.ts`)

#### Query Hooks

| Hook | Endpoint | Key | Returns |
|---|---|---|---|
| `useDocuments(filters)` | GET `/vault/documents` | `["vault-documents", ...]` | `PaginatedResponse<VaultDocument>` |
| `useDocument(id)` | GET `/vault/documents/{id}` | `["vault-document", id]` | `VaultDocument` |
| `useDocumentVersions(id)` | GET `/vault/documents/{id}/versions` | `["vault-document-versions", id]` | `VaultDocument[]` |
| `useDocumentAccessLog(id, page, limit)` | GET `/vault/documents/{id}/access-log` | `["vault-access-log", id, ...]` | `PaginatedResponse<DocumentAccessLogEntry>` |
| `useDocumentDownloadUrl(id)` | GET `/vault/documents/{id}/download` | `["vault-download-url", id]` | `{ url, fileName }` (disabled, manual refetch) |
| `useFolders()` | GET `/vault/folders` | `["vault-folders"]` | `DocumentFolder[]` |
| `useVaultSearch(query, page, limit)` | GET `/vault/search?q=...` | `["vault-search", ...]` | `PaginatedResponse<VaultDocument>` |
| `useRecentDocuments(limit)` | GET `/vault/recent` | `["vault-recent", limit]` | `VaultDocument[]` |
| `useVaultStats()` | GET `/vault/stats` | `["vault-stats"]` | `VaultStats` |

#### Mutation Hooks

| Hook | Endpoint | Invalidates |
|---|---|---|
| `useUploadDocument()` | POST `/vault/documents` (FormData) | documents, stats, recent, folders |
| `useUpdateDocument(id)` | PUT `/vault/documents/{id}` | documents, document |
| `useDeleteDocument()` | DELETE `/vault/documents/{id}` | documents, stats, folders |
| `useUploadVersion(id)` | POST `/vault/documents/{id}/version` (FormData) | documents, document, versions |
| `useLockDocument()` | POST `/vault/documents/{id}/lock` | documents, document |
| `useUnlockDocument()` | POST `/vault/documents/{id}/unlock` | documents, document |
| `useMoveDocument()` | POST `/vault/documents/{id}/move` | documents, folders |
| `useShareDocument(id)` | POST `/vault/documents/{id}/share` | document |
| `useCreateFolder()` | POST `/vault/folders` | folders, stats |
| `useUpdateFolder(id)` | PUT `/vault/folders/{id}` | folders |
| `useDeleteFolder()` | DELETE `/vault/folders/{id}` | folders, stats |

### Shared Components Used

| Component | From | Usage |
|---|---|---|
| `DocumentUpload` | `components/shared/document-upload.tsx` | Drag-and-drop file picker in upload modal |
| `EmptyState` | `components/shared/empty-state.tsx` | Shown when no documents match filters |

### Helper Functions (defined inline in page.tsx)

| Function | Purpose |
|---|---|
| `formatFileSize(bytes)` | Bytes → human-readable (KB, MB, GB) |
| `formatDate(dateStr)` | ISO → "MMM DD, YYYY" |
| `formatDateTime(dateStr)` | ISO → "MMM DD, YYYY HH:mm" |
| `getFileIcon(contentType)` | MIME type → Lucide icon component |
| `getFileIconColor(contentType)` | MIME type → color string |
| `buildFolderTree(folders)` | Flat folder list → nested tree structure |

---

## Data Flow Examples

### Upload Document

```
User drops file → DocumentUpload component validates (size, type)
  → Upload modal collects metadata (title, classification, tags, etc.)
  → useUploadDocument().mutate(FormData)
  → POST /vault/documents (multipart)
  → Handler: parse form, validate content-type
  → Service: compute SHA-256, generate UUID
  → MinIO: PutObject at tenants/{tid}/vault/{docId}/{filename}
  → PostgreSQL: INSERT into documents (version=1, is_latest=true)
  → Service: logAccess("upload"), auditSvc.Log("upload:vault_document")
  → Response: 201 + VaultDocument JSON
  → React Query invalidates: vault-documents, vault-stats, vault-recent, vault-folders
```

### Version Upload

```
User clicks "Upload New Version" on document drawer
  → useUploadVersion(docId).mutate(FormData)
  → POST /vault/documents/{id}/version
  → Service: fetch existing doc, validate lock status
  → Service: validate new file, compute checksum
  → MinIO: PutObject (new key with new docId)
  → PostgreSQL BEGIN TRANSACTION:
      UPDATE documents SET is_latest = false WHERE id = oldDocId
      INSERT new row (version = old.version + 1, is_latest = true, parent_document_id = rootId)
    COMMIT
  → On rollback: MinIO.RemoveObject (cleanup)
  → Audit log + access log
  → Response: 201 + new VaultDocument
```

### Lock → Edit → Unlock

```
Lock:   POST /vault/documents/{id}/lock
        → Sets locked_by = currentUser, locked_at = now()
        → Fails with Conflict if already locked

Edit:   PUT /vault/documents/{id}
        → Checks locked_by == currentUser (or not locked)
        → Updates metadata fields

Unlock: POST /vault/documents/{id}/unlock
        → Checks locked_by == currentUser (only owner can unlock)
        → Clears locked_by + locked_at
```

---

## Authorization & Security

### Permission Model

| Permission | Grants |
|---|---|
| `documents.view` | List, get, download, search, view versions, view access log, list folders, stats |
| `documents.manage` | Upload, update, delete, version, lock, unlock, move, share, create/update/delete folders |

### Org-Unit Hierarchical Scoping

All queries use `types.BuildOrgFilter(auth, "d.org_unit_id", argIndex)` to restrict results:

- Users see documents/folders within their org unit and all descendant org units
- Documents with `org_unit_id = NULL` are visible to all users in the tenant
- New documents inherit `org_unit_id` from the uploading user's auth context

### Lock Enforcement

- `UpdateDocument`: fails if `locked_by` is set and not the current user
- `DeleteDocument`: fails if `locked_by` is set and not the current user
- `UploadVersion`: fails if `locked_by` is set and not the current user
- `UnlockDocument`: fails if `locked_by` != current user (only owner can unlock)

### File Validation

- **Size limit:** 50 MB enforced at service layer
- **Content-type whitelist:** 14 allowed MIME types
- **MinIO object key:** Namespaced by tenant ID to prevent cross-tenant access

### Presigned URLs

- Download URLs expire after **15 minutes**
- Generated via MinIO `PresignedGetObject`
- Access logged before URL generation

---

## File Inventory

### Backend (Go)

| Path | Lines | Purpose |
|---|---|---|
| `itd-opms-api/internal/modules/vault/handler.go` | ~500 | 17 HTTP handlers |
| `itd-opms-api/internal/modules/vault/service.go` | ~900 | 22 service methods (DB + MinIO + audit) |
| `itd-opms-api/internal/modules/vault/types.go` | ~200 | DTOs, constants, validation |
| `itd-opms-api/internal/modules/vault/types_test.go` | ~50 | Validation tests |
| `itd-opms-api/internal/modules/vault/handler_test.go` | ~100 | Handler tests |
| `itd-opms-api/migrations/028_document_vault.sql` | ~100 | Initial schema |
| `itd-opms-api/migrations/046_org_unit_id_remaining_modules.sql` | ~50 | Org-unit columns |

### Frontend (Next.js / TypeScript)

| Path | Lines | Purpose |
|---|---|---|
| `itd-opms-portal/app/dashboard/vault/page.tsx` | 1,651 | Main vault page (all UI in one file) |
| `itd-opms-portal/hooks/use-vault.ts` | ~400 | 22 React Query hooks |
| `itd-opms-portal/components/shared/document-upload.tsx` | ~150 | Drag-and-drop file upload |
| `itd-opms-portal/types/system.ts` (lines 478–549) | ~70 | TypeScript interfaces |

### Route Registration

| Path | Location |
|---|---|
| `itd-opms-api/internal/platform/server/server.go` | Lines ~186, ~315 — mounts vault routes |

---

## Notes

1. **No sub-pages** — The entire vault UI is a single `page.tsx` file (1,651 lines). Future refactoring could extract the folder tree, document grid, upload modal, and drawer into separate components.
2. **Share UI not fully wired** — The `useShareDocument` mutation hook and `ShareDocumentRequest` DTO exist, but the UI does not expose a share dialog. The backend endpoint is fully functional.
3. **No raw UUID inputs** — The vault page does not require users to type UUIDs. All entity references (documents, folders, users) are resolved through the UI context.
4. **Type duplication** — `VaultDocument`, `DocumentFolder`, etc. are defined both in `hooks/use-vault.ts` and `types/system.ts` with slight differences (nullable vs optional). Consider consolidating.
5. **Retention policy** — The `retention_until` column exists but has no enforcement logic (no scheduled cleanup of expired documents).

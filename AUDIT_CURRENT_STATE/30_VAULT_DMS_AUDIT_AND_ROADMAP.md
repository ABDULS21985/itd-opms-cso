# Document Vault Module — Enterprise DMS Audit & Transformation Roadmap

> **Auditor:** Principal Enterprise Architect / Senior Go + Next.js Engineer / Database Architect / QA Lead
> **Date:** 2026-03-04
> **Codebase Snapshot:** commit `18507ab` on branch `dev`
> **Scope:** Full implementation audit across frontend, backend, database, storage, security, UX, scalability, and compliance

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Feature Inventory](#2-feature-inventory)
3. [Architecture Findings](#3-architecture-findings)
4. [Refactor Findings](#4-refactor-findings)
5. [Security and Authorization Findings](#5-security-and-authorization-findings)
6. [UX Findings](#6-ux-findings)
7. [Scalability and Performance Findings](#7-scalability-and-performance-findings)
8. [Compliance and Governance Findings](#8-compliance-and-governance-findings)
9. [Enterprise DMS Gap Analysis](#9-enterprise-dms-gap-analysis)
10. [Prioritized Implementation Roadmap](#10-prioritized-implementation-roadmap)
11. [File-by-File Change Plan](#11-file-by-file-change-plan)
12. [Recommended Target Architecture](#12-recommended-target-architecture)

---

## 1. Current State Summary

### What Exists

The Document Vault is a **functional multi-tenant file management system** with an above-average foundation for an internal tool. It provides:

- **17 HTTP endpoints** (`handler.go`, 635 lines) covering documents, folders, search, stats
- **22 service methods** (`service.go`, 1710 lines) with PostgreSQL + MinIO integration
- **22 React Query hooks** (`use-vault.ts`, 447 lines) — 11 queries, 11 mutations
- **1 monolithic frontend page** (`page.tsx`, 1651 lines) with grid/list views, folder tree, drawer, modals
- **4 database tables** across 2 migrations (028, 046) with proper indexes
- **1 shared upload component** (`document-upload.tsx`, 316 lines)

### What Works Well

| Strength | Evidence |
|---|---|
| **Multi-tenant isolation** | Every query includes `tenant_id = $N`; MinIO keys namespaced by tenant |
| **Org-unit hierarchical scoping** | `BuildOrgFilter` applied to 5 query paths (ListDocuments, ListFolders, SearchDocuments, GetStats×2) |
| **Version chain integrity** | `UploadVersion` uses a PostgreSQL transaction: `UPDATE is_latest=false` then `INSERT` new row with `parent_document_id` linking back to root; rollback cleans MinIO |
| **Lock model correctness** | Lock owner enforcement on update, delete, version, unlock; atomic check-then-set |
| **Soft delete** | `status = 'deleted'` with `WHERE status != 'deleted'` filters on all read queries |
| **Dual audit trail** | Both `document_access_log` table (operational) and `audit.AuditService.Log()` (enterprise audit) |
| **Checksum integrity** | SHA-256 computed at upload, stored per version |
| **Clean handler layer** | Handlers are thin — parse input, delegate to service, write response |
| **React Query cache invalidation** | All mutations invalidate relevant query keys correctly |
| **Handler/type test coverage** | `handler_test.go` (557 lines): 17 auth guard tests, 12 input validation tests, 1 route registration test; `types_test.go` (411 lines): constant validation + JSON round-trip tests |

### Overall Assessment

**The module is 60% of the way to enterprise-grade.** The core data model, API structure, and multi-tenant/org-scope architecture are solid. The primary gaps are: (a) frontend monolith needing decomposition, (b) share UI not wired, (c) no document preview, (d) no retention enforcement, (e) no bulk operations, (f) missing approval/workflow integration, (g) incomplete test coverage at the service layer, and (h) several compliance features that exist in schema but lack runtime enforcement.

---

## 2. Feature Inventory

### Fully Implemented

| # | Feature | Backend | Frontend | Tests |
|---|---|---|---|---|
| 1 | Document upload (multipart, metadata, MinIO) | `service.go:273-423` | Upload modal + `DocumentUpload` component | Handler auth/validation |
| 2 | Document listing (paginated, filtered) | `service.go:82-209` | Grid + List views with classification/folder/search filters | Handler auth |
| 3 | Document detail retrieval | `service.go:216-266` | Detail drawer (Details tab) | Handler auth + UUID validation |
| 4 | Metadata update (title, description, tags, classification, access level, folder) | `service.go:430-531` | Not directly exposed in UI (no edit modal) | Handler auth + body validation |
| 5 | Soft delete | `service.go:538-577` | Delete button in drawer + list view hover | Handler auth |
| 6 | Presigned download URL (15min TTL) | `service.go:584-621` | Download button (grid, list, drawer) | Handler auth |
| 7 | Version upload (transactional) | `service.go:628-755` | Not wired in UI (upload version button missing) | Handler auth |
| 8 | Version listing | `service.go:762-830` | Versions tab in drawer | Handler auth |
| 9 | Lock/Unlock (exclusive, owner-only) | `service.go:837-935` | Lock/Unlock buttons in drawer (conditional on ownership) | Handler auth |
| 10 | Move document to folder | `service.go:942-978` | Not wired in UI (no move action) | Handler auth |
| 11 | Folder CRUD | `service.go:1132-1396` | Folder tree sidebar + Create Folder modal | Handler auth |
| 12 | Search (ILIKE on title, description, tags) | `service.go:1403-1515` | Search bar in toolbar | Handler auth |
| 13 | Recent documents (per-user) | `service.go:1522-1585` | Not wired in UI | Handler auth |
| 14 | Vault stats (count, size, folders, classifications, recent) | `service.go:1592-1693` | Stats bar in header | Handler auth |
| 15 | Access log (paginated, per-document) | `service.go:1071-1125` | Access Log tab in drawer | Handler auth |
| 16 | Org-scope hierarchical filtering | 5 BuildOrgFilter calls | Transparent (applied server-side) | Covered by BuildOrgFilter tests |
| 17 | Breadcrumb navigation | N/A | `breadcrumbs` memo in page.tsx | N/A |

### Partially Implemented

| # | Feature | What Exists | What's Missing |
|---|---|---|---|
| 1 | **Share document** | Backend: `ShareDocument` endpoint + service method + `document_shares` table + `useShareDocument` hook | Frontend: Share button shows `toast.info("Share functionality coming soon")` at `page.tsx:1239`. No share dialog, no user/role picker, no share list UI |
| 2 | **Document metadata editing** | Backend: `UpdateDocument` endpoint handles partial updates | Frontend: No edit document modal. The drawer shows metadata read-only. `useUpdateDocument` hook exists but is unused in page.tsx |
| 3 | **Version upload from UI** | Backend: `UploadVersion` endpoint + `useUploadVersion` hook | Frontend: No "Upload New Version" button in the drawer. Hook is imported but not used |
| 4 | **Move document** | Backend: `MoveDocument` endpoint + `useMoveDocument` hook | Frontend: No move action in UI. Hook is defined but not imported in page.tsx |
| 5 | **Folder update** | Backend: `UpdateFolder` endpoint + `useUpdateFolder` hook | Frontend: No edit folder modal. Hook exists but is not used in page.tsx |
| 6 | **Folder delete with guard** | Backend: checks for child documents/folders before delete | Frontend: `useDeleteFolder` is imported and instantiated at page.tsx:314 but never called |
| 7 | **Recent documents display** | Backend: `GetRecentDocuments` endpoint + `useRecentDocuments` hook | Frontend: Hook is not imported or used in page.tsx |
| 8 | **Document classification at schema level** | Migration 005 defines a `document_classification` enum; Migration 028 adds `classification TEXT` column | Inconsistency: the Go code uses `TEXT` column and validates via map, not the enum. This is functional but bypasses DB-level enforcement |

### Missing (Not Implemented At All)

| # | Feature | Description |
|---|---|---|
| 1 | **Document preview** | No in-browser preview for PDFs, images, or text files. Every interaction requires download |
| 2 | **Retention enforcement** | `retention_until` column exists but nothing reads it — no expiration check, no purge job, no warnings |
| 3 | **Bulk operations** | No multi-select, bulk delete, bulk move, bulk download, bulk tag, bulk classify |
| 4 | **Document approval workflow** | No integration with the existing approval chain system for document sign-off |
| 5 | **Comments / annotations** | No table, no API, no UI for per-document comments |
| 6 | **Restore from deleted** | Soft-delete exists but no "restore" endpoint or UI. Documents in `deleted` status are permanently hidden |
| 7 | **Archival automation** | `archived` is a valid status in the CHECK constraint (migration 028) but the Go code only uses `active`/`deleted` |
| 8 | **Download restrictions for confidential** | `access_level` column exists but is not enforced — any user with `documents.view` can download even `confidential` docs |
| 9 | **Classification policy enforcement** | No rules like "policy docs require approval before delete" or "audit_evidence is immutable after upload" |
| 10 | **Expiration reminders / notifications** | No notification hooks for retention deadlines, share expiry, or lock duration |
| 11 | **Document templates** | No template system for creating documents from predefined structures |
| 12 | **OCR / full-text search indexing** | Search is ILIKE only — no content extraction, no full-text index, no tsvector |
| 13 | **Document relationship linking** | No way to link related documents (e.g., "this report references these source documents") |
| 14 | **Legal hold / compliance hold** | No mechanism to freeze a document against deletion, even by admins |
| 15 | **Richer audit reporting** | Access log is per-document only. No cross-document analytics, no export, no compliance reports |
| 16 | **Background jobs** | No job runner for retention cleanup, share expiry cleanup, or async processing |
| 17 | **File virus/malware scanning** | No integration point for ClamAV or similar scanning before storage |
| 18 | **Folder rename path cascade** | Renaming a folder via UpdateFolder changes `name` but does NOT update the `path` column or cascade to child folders |
| 19 | **Duplicate detection** | SHA-256 checksums are stored but never compared — no duplicate warning on upload |
| 20 | **Trash / recycle bin** | Deleted documents have no recovery path and no "Trash" view |
| 21 | **Access level filtering** | `access_level` is stored but ListDocuments has no filter for it — no ability to browse "only confidential" |

---

## 3. Architecture Findings

### 3.1 Frontend

#### Monolithic Page

`page.tsx` at 1,651 lines is the single largest risk factor for maintainability. It contains:

| Responsibility | Lines (approx) |
|---|---|
| Constants + helpers | 1–160 |
| Sub-components (ClassificationBadge, FolderTreeItem) | 166–255 |
| Main component state (12 `useState` calls) | 261–287 |
| Queries + mutations + derived state | 289–364 |
| Event handlers (upload, delete, download, create folder) | 366–430 |
| JSX: Header + stats bar | ~430–510 |
| JSX: Sidebar (folder tree) | ~510–560 |
| JSX: Toolbar (search, filters, buttons) | ~560–693 |
| JSX: Breadcrumbs | ~696–726 |
| JSX: Grid/List document display | ~728–955 |
| JSX: Pagination | ~957–986 |
| JSX: Document detail drawer (3 tabs) | ~990–1361 |
| JSX: Upload modal | ~1364–1515 |
| JSX: New folder modal | ~1517–1648 |

**Verdict:** This file must be decomposed. It is not code-reviewable, not unit-testable, and requires full re-render for any state change.

#### Missing Frontend Patterns

| Pattern | Current | Should Be |
|---|---|---|
| Confirmation dialogs | `handleDelete` uses `window.confirm()` at page.tsx:417 | Should use a proper modal/dialog component consistent with the rest of the portal |
| Error boundaries | None | Page crash on any render error loses the entire vault UI |
| URL state | All state is in React useState — refreshing the page loses folder selection, search query, pagination, selected document | Should sync `folderId`, `page`, `search`, `classification`, `viewMode` to URL params |
| Keyboard navigation | None | No keyboard shortcuts for common actions (upload, search focus, escape to close) |
| Responsive design | Grid view uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | Sidebar folder tree has no collapse mechanism on mobile; drawer is fixed 400px width |
| Loading states | Skeleton for document list only | No skeleton for folder tree, stats, drawer content |
| Optimistic updates | None | Lock/unlock could benefit from optimistic UI |

#### Type Safety Gaps

Two independent type definitions exist:

**`hooks/use-vault.ts` types:**
- `VaultDocument.description` → `string | null`
- `VaultDocument.fileName` → present
- `VaultDocument.lockedBy` → `string | null`
- `DocumentFolder.documentCount` → present
- `VaultStats.totalFolders` → present
- `VaultStats.recentUploads` → present

**`types/system.ts` types:**
- `VaultDocument.description` → `string | undefined` (optional)
- `VaultDocument.fileName` → **missing**
- `VaultDocument.lockedBy` → `string | undefined` (optional)
- `DocumentFolder.documentCount` → **missing**
- `VaultStats.totalFolders` → **missing**
- `VaultStats.recentUploads` → **missing**

**Impact:** The page imports types from `use-vault.ts`, so currently functional. But `types/system.ts` is stale and will cause bugs if anything references it. Must consolidate to a single source of truth.

### 3.2 Backend

#### Strengths

- Clean separation: `handler.go` (HTTP) → `service.go` (business logic + DB + MinIO)
- All errors flow through `apperrors` package with structured codes and HTTP status mapping
- `writeAppError` centralizes error response formatting with `slog` for 5xx errors
- Correlation ID logging via `types.GetCorrelationID(r.Context())`
- File cleanup on DB failure (`s.minio.RemoveObject` in rollback paths)

#### Findings

| Finding | Location | Severity | Detail |
|---|---|---|---|
| **Full file in memory** | `service.go:330` — `io.ReadAll(file)` | Medium | 50MB files are fully buffered into memory. For concurrent uploads, this can cause significant memory pressure. Should stream to MinIO using a `TeeReader` or `io.Pipe`. |
| **Search SQL injection resistance** | `service.go:133-134` | Low | Search uses parameterized queries (`$N`), so no injection. However, the ILIKE pattern `'%' \|\| $N \|\| '%'` is correct but could benefit from escaping `%` and `_` in user input. |
| **Race condition on lock** | `service.go:843-864` | Medium | `LockDocument` reads `locked_by`, checks if nil, then updates. Between the read and update, another request could lock the same document. Should use `UPDATE ... WHERE locked_by IS NULL RETURNING id` as an atomic operation. |
| **No `FileName` in DB** | `service.go:197` | Low | `FileName` is derived at read time via `filepath.Base(doc.FileKey)`. This works but means the original filename is reconstructed from the object key. If filenames contain path separators, this breaks. |
| **Scan column duplication** | Multiple locations | Low | The exact same 26-column scan pattern for VaultDocument is repeated in `ListDocuments`, `GetDocument`, `ListVersions`, `SearchDocuments`, `GetRecentDocuments`. Should extract to a `scanDocument` helper. |
| **Folder rename does not cascade path** | `service.go:1268-1335` | High | `UpdateFolder` can change `name` but does NOT update the `path` column, nor does it cascade to child folder paths. This will break the `UNIQUE(tenant_id, path)` constraint and corrupt the folder tree. |
| **No pagination on ListFolders** | `service.go:1132` | Low | `ListFolders` returns ALL folders. Fine for < 100 folders, but could be problematic at scale. |
| **DeleteFolder is hard delete** | `service.go:1372-1375` | Medium | Unlike documents (soft-delete), folders are hard-deleted. This creates an inconsistency and loses audit trail for folder structure changes. |
| **Missing access log for view** | `service.go:216-266` | Medium | `GetDocument` does not log access. Only `download` and `upload` are logged. Views should be tracked for compliance. |
| **No IP address capture** | `service.go:1700-1709` | Medium | `logAccess` inserts NULL for `ip_address`. The HTTP request's `RemoteAddr` / `X-Forwarded-For` is available in context but not passed through. |
| **`archived` status unused** | Migration 028 CHECK constraint | Low | DB allows `archived` status but the service only uses `active`/`deleted`. Constants in `types.go` only define these two. |

### 3.3 Database

#### Schema Strengths

- Partial indexes on `is_latest = true` and `status = 'active'` reduce index bloat
- `UNIQUE(tenant_id, path)` on `document_folders` prevents path collisions
- `fn_update_timestamp()` trigger on `document_folders` automates `updated_at`
- Foreign keys with cascading constraints from shares and access log to documents

#### Schema Gaps

| Gap | Detail |
|---|---|
| **No `file_name` column** | Filename is embedded in `file_key`. Should be stored separately for robust retrieval. |
| **`document_classification` enum vs TEXT** | Migration 005 creates an enum; migration 028 adds a TEXT column. The TEXT column is used. The enum is effectively dead weight. |
| **No index on `document_shares` expiry** | `expires_at` has no index, making expiration queries expensive. |
| **No composite index for version queries** | Queries filtering by `(parent_document_id, tenant_id, status)` lack a composite index. `idx_documents_parent` only covers `parent_document_id`. |
| **No `document_comments` table** | Missing entirely. |
| **No `document_relationships` table** | Missing entirely. |
| **No `legal_hold` flag** | No column to prevent deletion of held documents. |
| **`access_level` CHECK constraint order** | Values are `('public', 'internal', 'confidential', 'restricted')` — note `confidential` before `restricted`. This ordering inconsistency is cosmetic but confusing. |
| **No `file_name` column on documents** | Currently derived from `file_key` via `filepath.Base()`. |

### 3.4 Storage (MinIO)

| Aspect | Status |
|---|---|
| Object key namespacing | Correct: `tenants/{tid}/vault/{docId}/{filename}` |
| Presigned URL TTL | 15 minutes — appropriate |
| Cleanup on failure | UploadDocument and UploadVersion both clean up MinIO objects on DB failure |
| Bucket policy | Not audited — depends on MinIO configuration outside this module |
| Cross-tenant access prevention | Object keys include tenant ID; DB queries filter by tenant; no cross-tenant path manipulation possible via the API |
| Object versioning | Not used — versioning is managed in PostgreSQL, not MinIO |

---

## 4. Refactor Findings

### 4.1 Frontend Decomposition Required

The `page.tsx` monolith should be split into:

| New File | Extracted From | Responsibility |
|---|---|---|
| `components/vault/vault-stats-bar.tsx` | page.tsx:430–510 | Stats header row |
| `components/vault/folder-tree.tsx` | page.tsx:166–255, 510–560 | Sidebar with recursive folder tree |
| `components/vault/document-toolbar.tsx` | page.tsx:560–693 | Search, filter, view toggle, action buttons |
| `components/vault/document-grid.tsx` | page.tsx:760–835 | Grid view card layout |
| `components/vault/document-list.tsx` | page.tsx:838–954 | Table/list view |
| `components/vault/document-drawer.tsx` | page.tsx:990–1361 | Detail drawer with tabs |
| `components/vault/upload-modal.tsx` | page.tsx:1364–1515 | Upload modal with form fields |
| `components/vault/folder-modal.tsx` | page.tsx:1517–1648 | Create/edit folder modal |
| `components/vault/share-modal.tsx` | New | Share dialog (user picker, role picker, permission, expiry) |
| `components/vault/edit-document-modal.tsx` | New | Edit document metadata |
| `components/vault/classification-badge.tsx` | page.tsx:166–179 | Reusable badge component |
| `lib/vault-helpers.ts` | page.tsx:87–160 | formatFileSize, formatDate, getFileIcon, buildFolderTree |
| `app/dashboard/vault/page.tsx` | Reduced orchestrator | ~200–300 lines composing the above |

### 4.2 Type Consolidation

1. **Delete** all vault types from `hooks/use-vault.ts` (lines 10–85)
2. **Update** `types/system.ts` vault section to match the actual API response shape (add `fileName`, `documentCount`, `totalFolders`, `recentUploads`, use `| null` not `?`)
3. **Import** types in `use-vault.ts` from `@/types/system`

### 4.3 Backend Scan Helper

Extract the 26-column `Scan` pattern into:

```go
func scanDocument(row pgx.Row) (VaultDocument, error) { ... }
func scanDocumentRows(rows pgx.Rows) ([]VaultDocument, error) { ... }
```

This eliminates ~150 lines of duplicated scan code across 5 methods.

### 4.4 Constants Duplication

`AllowedContentTypes` and `MaxFileSize` are defined in `service.go` (lines 34–53). The same MIME list is hardcoded in `document-upload.tsx` (lines 25–41). These should be:
- Backend: as-is (authoritative)
- Frontend: fetch from a `/vault/config` endpoint or define once in a shared constants file

---

## 5. Security and Authorization Findings

### Strengths

| Control | Implementation |
|---|---|
| Authentication | Every handler checks `types.GetAuthContext(r.Context())` — returns 401 if nil |
| Permission middleware | Routes use `middleware.RequirePermission("documents.view"/"documents.manage")` |
| Tenant isolation | All DB queries include `tenant_id` filter |
| Org-scope | `BuildOrgFilter` restricts visibility to user's org unit hierarchy |
| MinIO key namespacing | `tenants/{tid}/vault/...` prevents cross-tenant object access |
| Lock enforcement | Update, delete, version operations check `locked_by` against current user |

### Vulnerabilities & Weaknesses

| # | Finding | Severity | Detail |
|---|---|---|---|
| 1 | **`access_level` is informational only** | High | A document marked `confidential` can be downloaded by any user with `documents.view` permission. The `access_level` column has no runtime enforcement in `GetDownloadURL`, `ListDocuments`, or `GetDocument`. |
| 2 | **No download URL leak protection** | Medium | Presigned URLs are returned to the client. If intercepted or shared, they're valid for 15 minutes regardless of auth. Consider: (a) shorter TTL, (b) IP-restricted presigned URLs (MinIO supports this), or (c) proxy downloads through the API. |
| 3 | **Share permission not enforced** | Medium | `document_shares` records are created but never read during access checks. The sharing model has no effect — it's write-only data. Shares should gate visibility for `restricted`/`confidential` documents. |
| 4 | **No Content-Disposition header control** | Low | Download URLs serve files with MinIO's default content-disposition. Malicious filenames could exploit browser behavior. |
| 5 | **No rate limiting on upload** | Medium | Nothing prevents a user from flooding the vault with uploads. Should enforce per-user upload rate limits. |
| 6 | **MIME type sniffing bypass** | Low | Content-Type is taken from the multipart header, which can be spoofed. Should validate actual file content (magic bytes) against claimed MIME type. |
| 7 | **No CSRF protection for upload** | Low | Depends on the JWT middleware implementation — if cookie-based OIDC is used, the multipart upload endpoint may be vulnerable to CSRF. |
| 8 | **IP address not logged** | Medium | `logAccess()` at `service.go:1700` inserts NULL for `ip_address`. The request's IP is available but not passed through the call chain. |

### Recommended Security Enhancements

1. **Enforce access_level**: Add to `ListDocuments` and `GetDownloadURL` — `confidential` requires `documents.manage` OR explicit share; `restricted` requires share or org-match.
2. **Read shares on access**: Before returning a download URL for `restricted`/`confidential` docs, check `document_shares` for the requesting user.
3. **Capture IP address**: Pass `r.RemoteAddr` or `X-Forwarded-For` through context to `logAccess()`.
4. **File content validation**: Use `http.DetectContentType()` on first 512 bytes alongside the header's Content-Type.

---

## 6. UX Findings

### Strengths

- Grid/list toggle provides flexibility
- Classification badges with color coding improve scanability
- Folder tree with color, expand/collapse, and document count is well-structured
- Breadcrumb navigation for folder depth
- Drag-and-drop upload via `DocumentUpload` component
- Skeleton loading for document list
- Lock status indicator with owner name and timestamp

### Issues

| # | Issue | Location | Severity |
|---|---|---|---|
| 1 | **Share button is dead** | `page.tsx:1237–1249` — shows toast "coming soon" | High — advertises a feature that doesn't work |
| 2 | **No document edit modal** | Drawer shows metadata read-only | High — users cannot edit title, description, tags, classification without API calls |
| 3 | **No version upload UI** | Drawer versions tab shows history but no "Upload New Version" button | High — core DMS feature is invisible |
| 4 | **No move document UI** | No drag-to-folder, no "Move to..." context menu | Medium |
| 5 | **`window.confirm()` for delete** | `page.tsx:417` | Medium — ugly, not themeable, not consistent with modal patterns |
| 6 | **No delete folder UI** | `useDeleteFolder` is imported but never called | Medium |
| 7 | **Drawer fixed at 400px** | `page.tsx:996` — `width: 400` | Medium — not responsive, overlaps content on smaller screens |
| 8 | **No empty folder indicator** | Folders with 0 documents show no count badge | Low |
| 9 | **Upload modal doesn't show folder context** | If a user is in a subfolder, the upload modal doesn't indicate where the file will be uploaded | Low |
| 10 | **No keyboard shortcut support** | No `Ctrl+U` for upload, `Escape` for close modals (modals close on backdrop click but not Escape key) | Low |
| 11 | **Stats bar layout fragile** | `page.tsx:~430–510` — stats assume data.byClassification exists; missing null checks could crash | Low |
| 12 | **No progress indicator for uploads** | The upload button shows a spinner but no percentage — large files (up to 50MB) have no progress feedback | Medium |
| 13 | **Access log tab has no pagination** | `page.tsx:1315–1357` — renders all entries in `accessLog` array without pagination or "load more" | Low |
| 14 | **`useDeleteFolder()` called without assignment** | `page.tsx:314` — `useDeleteFolder()` is called but the return value (mutation) is discarded | Bug — wasteful hook call |

---

## 7. Scalability and Performance Findings

### Current Performance Profile

| Operation | Performance | Notes |
|---|---|---|
| ListDocuments | Good — uses partial indexes, pagination | ILIKE search degrades at >100K rows |
| SearchDocuments | Poor at scale | Uses `ILIKE '%term%'` and `LOWER()` — cannot use indexes. Plus `unnest(tags)` per row. |
| ListFolders | Acceptable | No pagination, returns all folders. Breaks at >1000 folders per tenant. |
| GetStats | Medium | 4 separate queries to PostgreSQL. Could be combined or cached. |
| UploadDocument | Memory-intensive | `io.ReadAll` at `service.go:330` buffers entire file (up to 50MB) in Go heap memory |
| UploadVersion | Same as upload | Same `io.ReadAll` pattern at `service.go:655` |
| Lock/Unlock | Non-atomic race | `service.go:843-864`: separate SELECT + UPDATE. Two concurrent lock attempts could both succeed. |

### Recommendations

| Priority | Improvement | Detail |
|---|---|---|
| High | **Stream uploads** | Replace `io.ReadAll` with `io.TeeReader` that simultaneously writes to MinIO and computes SHA-256. Eliminates 50MB heap allocations. |
| High | **Full-text search index** | Add `tsvector` column to `documents` with trigger-updated index on `title \|\| description \|\| array_to_string(tags)`. Replace ILIKE with `@@ to_tsquery()`. |
| High | **Atomic lock** | Replace SELECT + UPDATE with `UPDATE documents SET locked_by=$1, locked_at=$2 WHERE id=$3 AND locked_by IS NULL RETURNING id`. |
| Medium | **Stats caching** | Cache `GetStats` result for 30–60 seconds using an in-memory cache (e.g., `sync.Map` with TTL) since stats don't need real-time accuracy. |
| Medium | **Folder pagination** | Add optional pagination to `ListFolders` or implement cursor-based loading. |
| Low | **Batch scan helper** | The 26-column scan is repeated 5 times. A `pgx.RowToStructByName` or custom scanner reduces code and improves maintainability. |
| Low | **Presigned URL caching** | For frequently downloaded documents, cache the presigned URL for a few minutes (< TTL) to reduce MinIO calls. |

---

## 8. Compliance and Governance Findings

### What Exists

| Compliance Aspect | Status |
|---|---|
| Audit logging (operational) | `document_access_log` logs upload, download, lock, unlock, share. Missing: view, update, move, delete |
| Audit logging (enterprise) | `audit.AuditService.Log()` called for upload, update, delete, version, lock, unlock, share, folder create/delete |
| Data classification | 6 categories with UI labels |
| Access levels | 4 levels stored but **not enforced** |
| Retention dates | Column exists, **not enforced** |
| Checksums | SHA-256 computed and stored per version |
| Soft delete | Documents never hard-deleted |
| Multi-tenant isolation | Full |
| Org-scope filtering | Hierarchical |

### Gaps for Enterprise Compliance

| # | Gap | Impact | Remediation |
|---|---|---|---|
| 1 | **No retention enforcement** | Documents past `retention_until` remain accessible; no auto-archive or purge | Add background job to check daily; notify admins; soft-delete or archive expired docs |
| 2 | **No legal hold** | No way to freeze documents during legal proceedings | Add `legal_hold BOOLEAN DEFAULT false` column; prevent delete/modify when true |
| 3 | **Access level not enforced** | `confidential` docs visible to anyone with `documents.view` | Implement access-level gating in query layer |
| 4 | **Share model is write-only** | Shares are recorded but never checked during read/download | Integrate share checks into access control for restricted/confidential docs |
| 5 | **Incomplete access log actions** | `view` (GetDocument), `update`, `move`, `delete` actions not logged to `document_access_log` | Add `logAccess()` calls to these service methods |
| 6 | **No audit log export** | No endpoint to export access logs as CSV/PDF for compliance reporting | Add `/vault/reports/access-log` endpoint with date range filters |
| 7 | **No immutability enforcement** | `audit_evidence` classification has no special protections | Prevent modification/deletion of `audit_evidence` docs (or require elevated permission) |
| 8 | **Missing IP address in access log** | `ip_address` column is always NULL | Capture from request context |
| 9 | **No data residency controls** | MinIO bucket may be in any region; no per-classification storage policy | Out of scope for application layer, but should be documented |

---

## 9. Enterprise DMS Gap Analysis

Comparison of current vault against enterprise DMS requirements (SharePoint/Alfresco/M-Files tier):

| Capability | Current State | Enterprise Requirement | Gap Size |
|---|---|---|---|
| **Document CRUD** | Complete | Complete | None |
| **Version Management** | Backend complete, UI partial | Full UI with diff, restore, compare | Medium |
| **Folder Hierarchy** | Complete | Complete | None |
| **Search** | Basic ILIKE | Full-text with relevance ranking, filters, saved searches | Large |
| **Classification** | 6 types, color-coded | Policy-driven auto-classification, reclassification workflows | Large |
| **Access Control** | Binary (view/manage) | Document-level ACL, access-level enforcement, share-based grants | Large |
| **Sharing** | Backend only | Full UI: user picker, role picker, permissions, expiry, link sharing | Large |
| **Audit Trail** | Partial logging | Complete action logging, exportable reports, chain of custody | Medium |
| **Retention** | Schema only | Enforced policies, retention schedules, auto-archive, purge with approval | Large |
| **Legal Hold** | Missing | Freeze documents, prevent modification/deletion | Large |
| **Preview** | Missing | In-browser PDF/image/text preview without download | Large |
| **Bulk Operations** | Missing | Multi-select, bulk classify, bulk move, bulk delete, bulk export | Large |
| **Workflow Integration** | Missing | Approval chains for publish, review cycles, sign-off | Large |
| **Comments** | Missing | Per-document discussion threads | Medium |
| **Notifications** | Missing | Email/in-app notifications for shares, approvals, expiry | Large |
| **Templates** | Missing | Document templates with pre-filled metadata | Medium |
| **Relationships** | Missing | Related documents, parent-child beyond versions | Medium |
| **Reports & Dashboards** | Basic stats | Storage analytics, compliance dashboards, user activity reports | Medium |
| **Trash/Recycle** | Missing | Recoverable trash with auto-purge schedule | Small |
| **Duplicate Detection** | Missing | Checksum matching, content similarity | Medium |
| **Mobile/Responsive** | Partial | Fully responsive, touch-friendly | Small |

---

## 10. Prioritized Implementation Roadmap

### Phase 1: Critical (Must Fix — Blocking Correctness)

| # | Item | Files Affected | Effort |
|---|---|---|---|
| 1.1 | **Fix folder rename path cascade** — UpdateFolder must update `path` on self and all descendants recursively | `service.go:1268-1335` | 1 day |
| 1.2 | **Fix lock race condition** — Replace SELECT+UPDATE with atomic `UPDATE...WHERE locked_by IS NULL RETURNING` | `service.go:837-881` | 0.5 day |
| 1.3 | **Wire Share UI** — Build share modal with user/role picker, permission select, optional expiry; connect to `useShareDocument` hook | New `share-modal.tsx`, modify drawer | 2 days |
| 1.4 | **Wire Version Upload UI** — Add "Upload New Version" button in drawer versions tab | Modify drawer section | 0.5 day |
| 1.5 | **Wire Edit Document UI** — Build edit modal for title, description, tags, classification, access level; connect to `useUpdateDocument` | New `edit-document-modal.tsx` | 1 day |
| 1.6 | **Consolidate types** — Single source of truth in `types/system.ts`, import in hooks | `types/system.ts`, `hooks/use-vault.ts` | 0.5 day |
| 1.7 | **Fix `useDeleteFolder()` being called without assignment** | `page.tsx:314` | 5 min |

### Phase 2: High Priority (Core DMS Gaps)

| # | Item | Files Affected | Effort |
|---|---|---|---|
| 2.1 | **Frontend decomposition** — Extract 10+ components from `page.tsx` | New component files, refactored `page.tsx` | 3 days |
| 2.2 | **Document preview** — In-browser preview for PDF (embed), images (img tag), text/CSV (code block) | New `document-preview.tsx`, add to drawer | 2 days |
| 2.3 | **Access level enforcement** — `confidential` requires share OR `documents.manage`; `restricted` requires share OR org-match | `service.go` (ListDocuments, GetDocument, GetDownloadURL) | 2 days |
| 2.4 | **Complete access logging** — Add `logAccess()` for view, update, move, delete actions | `service.go` | 0.5 day |
| 2.5 | **Capture IP address** — Pass `r.RemoteAddr` / `X-Forwarded-For` through to `logAccess()` | `handler.go`, `service.go` | 0.5 day |
| 2.6 | **Move document UI** — Add "Move to..." action in drawer with folder picker | New `move-document-modal.tsx`, modify drawer | 1 day |
| 2.7 | **Stream uploads** — Replace `io.ReadAll` with `io.TeeReader` for MinIO streaming + concurrent SHA-256 | `service.go:329-337, 654-661` | 1 day |
| 2.8 | **Trash / Recycle Bin** — Add a "Trash" view filtering `status = 'deleted'`; add restore endpoint `POST /documents/{id}/restore` | `handler.go`, `service.go`, new frontend view | 2 days |
| 2.9 | **Folder delete UI** — Connect `useDeleteFolder` mutation to a delete button with confirmation | Modify folder tree sidebar | 0.5 day |
| 2.10 | **Replace `window.confirm` with proper modal** | `page.tsx:417`, new `confirm-dialog.tsx` | 0.5 day |
| 2.11 | **URL state sync** — Push folder, page, search, classification, viewMode to URL search params | `page.tsx` state management | 1 day |
| 2.12 | **Folder edit UI** — Build edit folder modal for name/description/color | New `edit-folder-modal.tsx` | 0.5 day |
| 2.13 | **Recent documents widget** — Wire `useRecentDocuments` to a "Recent" section or sidebar tab | Modify page layout | 0.5 day |

### Phase 3: Medium Priority (Enterprise Capabilities)

| # | Item | Files Affected | Effort |
|---|---|---|---|
| 3.1 | **Retention enforcement** — Background job to flag/archive/delete expired documents; admin notifications | New Go background worker, new migration for `retention_policy` table | 3 days |
| 3.2 | **Full-text search** — Add `tsvector` column with GIN index; replace ILIKE search with `@@ to_tsquery` | New migration, modify `service.go` SearchDocuments | 2 days |
| 3.3 | **Bulk operations** — Multi-select checkbox, bulk delete, bulk move, bulk download (zip) | New API endpoints, new frontend components | 3 days |
| 3.4 | **Document comments** — New `document_comments` table, CRUD endpoints, comment thread in drawer | New migration, new Go module, new frontend component | 3 days |
| 3.5 | **Notification hooks** — Event system for share creation, retention approaching, lock timeout | Integration with existing notification system | 2 days |
| 3.6 | **Legal hold** — Add `legal_hold` column; prevent delete/modify when true; admin UI to set/clear | New migration, modify service.go, new admin endpoint | 2 days |
| 3.7 | **Audit log export** — CSV/PDF export endpoint for access log with date range filters | New handler endpoint, service method | 1 day |
| 3.8 | **Document relationships** — New `document_relationships` table; link related docs in UI | New migration, new API, new UI component | 2 days |
| 3.9 | **Duplicate detection** — On upload, check SHA-256 against existing active documents; warn user | Modify `service.go` UploadDocument | 1 day |
| 3.10 | **Immutability for audit_evidence** — Prevent update/delete of `audit_evidence` classification docs | Modify `service.go` UpdateDocument, DeleteDocument | 0.5 day |

### Phase 4: Low Priority (Polish & Advanced)

| # | Item | Files Affected | Effort |
|---|---|---|---|
| 4.1 | **Document templates** — Predefined metadata + folder assignments for common document types | New table, new CRUD endpoints, new UI | 3 days |
| 4.2 | **OCR/content extraction hooks** — Integration point for Tesseract/Tika to extract text from PDFs/images for full-text search | Background job, new service interface | 3 days |
| 4.3 | **Document approval workflow** — Integration with existing approval chain system for document publishing | Integration with approval module | 5 days |
| 4.4 | **Saved searches** — Allow users to save and re-run search queries | New table, API, UI | 2 days |
| 4.5 | **Storage analytics dashboard** — Per-user storage consumption, classification distribution over time, upload trends | New API endpoints, new dashboard component | 2 days |
| 4.6 | **File virus scanning hook** — Pre-upload scan integration point | New service interface, background job | 2 days |
| 4.7 | **Access level filter in list** — Add `access_level` dropdown filter alongside classification filter | Modify handler, frontend toolbar | 0.5 day |
| 4.8 | **Keyboard shortcuts** — Upload (Ctrl+U), Search focus (Ctrl+K), Close (Escape) | Frontend enhancement | 0.5 day |
| 4.9 | **Upload progress indicator** — XHR-based upload with progress events | Modify `apiClient.upload`, `DocumentUpload` component | 1 day |
| 4.10 | **Responsive drawer** — Make drawer full-screen on mobile, collapsible on tablet | CSS/layout changes | 0.5 day |
| 4.11 | **Service layer test coverage** — Integration tests for all 22 service methods using test database | New `service_test.go` | 5 days |

---

## 11. File-by-File Change Plan

### Backend Files

#### `itd-opms-api/internal/modules/vault/service.go` (~1710 lines)

| Line(s) | Change | Phase |
|---|---|---|
| 82-209 | Add access_level filtering to ListDocuments WHERE clause | 2.3 |
| 216-266 | Add `logAccess(ctx, id, auth.UserID, auth.TenantID, "view")` | 2.4 |
| 329-337 | Replace `io.ReadAll` with streaming TeeReader | 2.7 |
| 430-531 | Add `logAccess` for update; add audit_evidence immutability check | 2.4, 3.10 |
| 538-577 | Add `logAccess` for delete; add legal_hold check; add audit_evidence check | 2.4, 3.6, 3.10 |
| 584-621 | Add access_level enforcement in GetDownloadURL | 2.3 |
| 654-661 | Replace `io.ReadAll` with streaming | 2.7 |
| 837-881 | Atomic lock (single UPDATE with WHERE locked_by IS NULL RETURNING) | 1.2 |
| 942-978 | Add `logAccess` for move | 2.4 |
| 1268-1335 | Add path cascade on rename; update all child folder paths in transaction | 1.1 |
| 1403-1515 | Replace ILIKE with tsvector full-text search | 3.2 |
| 1700-1709 | Accept and insert IP address parameter | 2.5 |
| New | Add `RestoreDocument(ctx, id)` method | 2.8 |
| New | Add `BulkDeleteDocuments(ctx, ids)` method | 3.3 |
| New | Add `BulkMoveDocuments(ctx, ids, folderId)` method | 3.3 |
| New | Extract `scanDocument()` and `scanDocumentRows()` helpers | 2.1 (backend cleanup) |

#### `itd-opms-api/internal/modules/vault/handler.go` (~635 lines)

| Change | Phase |
|---|---|
| Add IP extraction helper; pass through context or direct parameter | 2.5 |
| Add `POST /documents/{id}/restore` handler | 2.8 |
| Add `POST /documents/bulk-delete` handler | 3.3 |
| Add `POST /documents/bulk-move` handler | 3.3 |
| Add `GET /vault/config` endpoint (return allowed types, max size) | 2.1 |

#### `itd-opms-api/internal/modules/vault/types.go` (~214 lines)

| Change | Phase |
|---|---|
| Add `DocumentStatusArchived = "archived"` constant | 2.8 |
| Add `FileName` field to VaultDocument struct (or keep derived) | Consider |
| Add `RestoreDocumentRequest` if needed | 2.8 |
| Add `BulkActionRequest` type | 3.3 |

### Frontend Files

#### `itd-opms-portal/app/dashboard/vault/page.tsx` (1651 → ~250 lines)

| Change | Phase |
|---|---|
| Extract all sub-components to `components/vault/` | 2.1 |
| Extract helpers to `lib/vault-helpers.ts` | 2.1 |
| Replace `window.confirm` with modal component | 2.10 |
| Add URL state sync via `useSearchParams` | 2.11 |
| Fix `useDeleteFolder()` dangling call at line 314 | 1.7 |
| Wire `useRecentDocuments` | 2.13 |

#### `itd-opms-portal/hooks/use-vault.ts` (~447 lines)

| Change | Phase |
|---|---|
| Remove all interface definitions (lines 10–85) — import from `types/system` | 1.6 |
| Add `useRestoreDocument()` mutation | 2.8 |
| Add `useBulkDeleteDocuments()` mutation | 3.3 |
| Add `useBulkMoveDocuments()` mutation | 3.3 |
| Add `useVaultConfig()` query for allowed types/max size | 2.1 |

#### `itd-opms-portal/types/system.ts` (vault section, lines 477–548)

| Change | Phase |
|---|---|
| Update `VaultDocument` to match actual API response (add `fileName`, use `\| null`) | 1.6 |
| Add `documentCount` to `DocumentFolder` | 1.6 |
| Add `totalFolders` and `recentUploads` to `VaultStats` | 1.6 |

#### New Frontend Files

| File | Purpose | Phase |
|---|---|---|
| `components/vault/vault-stats-bar.tsx` | Stats header | 2.1 |
| `components/vault/folder-tree.tsx` | Sidebar folder tree | 2.1 |
| `components/vault/document-toolbar.tsx` | Search, filter, action bar | 2.1 |
| `components/vault/document-grid.tsx` | Grid card view | 2.1 |
| `components/vault/document-list.tsx` | Table list view | 2.1 |
| `components/vault/document-drawer.tsx` | Detail drawer container | 2.1 |
| `components/vault/document-details-tab.tsx` | Details tab content | 2.1 |
| `components/vault/document-versions-tab.tsx` | Versions tab content | 2.1 |
| `components/vault/document-access-log-tab.tsx` | Access log tab content | 2.1 |
| `components/vault/document-preview.tsx` | In-browser preview | 2.2 |
| `components/vault/upload-modal.tsx` | Upload form modal | 2.1 |
| `components/vault/edit-document-modal.tsx` | Edit metadata modal | 1.5 |
| `components/vault/folder-modal.tsx` | Create/edit folder modal | 2.1 |
| `components/vault/share-modal.tsx` | Share dialog | 1.3 |
| `components/vault/move-document-modal.tsx` | Move-to-folder picker | 2.6 |
| `components/vault/classification-badge.tsx` | Reusable badge | 2.1 |
| `lib/vault-helpers.ts` | Shared helper functions | 2.1 |

### Migration Files

| Migration | Purpose | Phase |
|---|---|---|
| `xxx_vault_fulltext_search.sql` | Add `search_vector tsvector` column + GIN index + trigger | 3.2 |
| `xxx_document_comments.sql` | Create `document_comments` table | 3.4 |
| `xxx_document_relationships.sql` | Create `document_relationships` table | 3.8 |
| `xxx_vault_legal_hold.sql` | Add `legal_hold BOOLEAN DEFAULT false` to documents | 3.6 |
| `xxx_vault_file_name.sql` | Add `file_name TEXT` column to documents (optional — currently derived) | Consider |

---

## 12. Recommended Target Architecture

### Backend Target

```
itd-opms-api/internal/modules/vault/
├── handler.go              — HTTP handlers (slim, ~700 lines)
├── handler_test.go         — Handler unit tests (~600 lines)
├── service.go              — Core service methods (~1200 lines, with scan helpers)
├── service_test.go         — Service integration tests (NEW, ~800 lines)
├── types.go                — DTOs, constants, validation (~250 lines)
├── types_test.go           — Type tests (~400 lines)
├── access_control.go       — Access level enforcement, share checking (NEW, ~200 lines)
└── retention.go            — Retention enforcement logic (NEW, ~150 lines)
```

### Frontend Target

```
itd-opms-portal/
├── app/dashboard/vault/
│   └── page.tsx                        — Orchestrator (~250 lines)
├── components/vault/
│   ├── vault-stats-bar.tsx             — Stats header
│   ├── folder-tree.tsx                 — Sidebar folder tree
│   ├── document-toolbar.tsx            — Search + filters + actions
│   ├── document-grid.tsx               — Grid card view
│   ├── document-list.tsx               — Table list view
│   ├── document-drawer.tsx             — Detail drawer container
│   ├── document-details-tab.tsx        — Details tab content
│   ├── document-versions-tab.tsx       — Versions tab content
│   ├── document-access-log-tab.tsx     — Access log tab content
│   ├── document-preview.tsx            — In-browser preview
│   ├── upload-modal.tsx                — Upload form modal
│   ├── edit-document-modal.tsx         — Edit metadata modal
│   ├── folder-modal.tsx                — Create/edit folder modal
│   ├── share-modal.tsx                 — Share dialog
│   ├── move-document-modal.tsx         — Move-to-folder picker
│   ├── classification-badge.tsx        — Reusable badge
│   └── confirm-dialog.tsx              — Themed confirmation dialog
├── hooks/
│   └── use-vault.ts                    — React Query hooks (types imported from system.ts)
├── lib/
│   └── vault-helpers.ts                — Shared helper functions
└── types/
    └── system.ts                       — Single source of truth for vault types
```

### Data Flow (Target)

```
┌──────────────────────────────────────────────────────────────────┐
│  page.tsx (orchestrator)                                          │
│  ├── URL state sync (folder, page, search, classification, view) │
│  ├── Queries: useDocuments, useFolders, useVaultStats            │
│  ├── Renders: StatsBar, FolderTree, Toolbar, Grid/List, Drawer  │
│  └── Modal state: upload, edit, share, move, folder, confirm     │
└──────────────────────────────┬───────────────────────────────────┘
                               │ hooks/use-vault.ts
                               │ (React Query → apiClient → HTTP)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Go API — vault module                                           │
│  handler.go → service.go → access_control.go                     │
│            ↘ retention.go (background job)                        │
│                                                                   │
│  Access flow:                                                     │
│  1. RequirePermission middleware (documents.view/manage)          │
│  2. Tenant isolation (WHERE tenant_id = $1)                       │
│  3. Org-scope filter (BuildOrgFilter)                             │
│  4. Access-level enforcement (access_control.go)                  │
│  5. Share-based grants for restricted/confidential                │
│  6. Lock checks for mutations                                     │
│  7. Legal hold checks for delete/modify                           │
│  8. Audit logging (both operational + enterprise)                 │
└──────────────────────────────────────────────────────────────────┘
```

### Permission Model (Target)

```
documents.view      → List, search, view details, view versions, view access log, stats
                      + access_level gates:
                        public      → all with documents.view
                        internal    → all with documents.view + same tenant
                        restricted  → requires share OR same org-unit
                        confidential → requires explicit share OR documents.manage

documents.manage    → Upload, update, delete, version, lock, unlock, move, share
                      + folder CRUD

documents.admin     → Legal hold, retention policy, force-unlock, bulk purge (NEW)
```

---

## Summary of Key Metrics

| Metric | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|---|---|---|---|---|
| **Feature completeness** | 60% | 72% | 85% | 95% |
| **Frontend files** | 4 | 6 | 20 | 24 |
| **Frontend largest file** | 1,651 lines | ~500 lines | ~250 lines | ~250 lines |
| **Backend service methods** | 22 | 24 | 28 | 35 |
| **Test coverage (handlers)** | Auth + validation only | Same | + integration | + full service |
| **Security controls** | 6/10 | 7/10 | 9/10 | 10/10 |
| **Compliance readiness** | 4/10 | 5/10 | 7/10 | 9/10 |
| **UX completeness** | 55% | 75% | 90% | 95% |

---

*End of audit. This document should be used as the authoritative reference for the Document Vault transformation project.*

# Prompt: Add Hierarchical Org-Scope Filtering to Remaining 7 Modules

## Context & Objective

You are working on the **ITD-OPMS** platform — an IT Operations & Project Management System for the **Central Bank of Nigeria (CBN)**. The platform implements **hierarchical scope-based access control** based on the CBN organogram (Directorate → Department → Division → Office → Unit → Team → Section).

**Org-scope filtering** has already been successfully implemented for 6 modules (ITSM, Planning, Governance, GRC, CMDB, People). Your task is to close the gap by adding the same filtering to the **remaining 7 modules** that currently have **no org-scope filtering at all**:

1. **Knowledge** (articles, announcements, feedback)
2. **Approval** (workflow definitions, approval chains)
3. **Calendar** (maintenance windows, freeze periods)
4. **Vault** (documents, folders)
5. **Vendor** (vendors, contracts, scorecards)
6. **Automation** (automation rules, executions)
7. **Custom Fields** (field definitions)

The work has **three layers**: database migration, domain types, and service-layer query filtering.

---

## Architecture Overview

### Middleware Pipeline (already deployed, no changes needed)

All protected routes already pass through this middleware chain in `server.go` (lines 240-245):

```go
r.Use(middleware.AuthDualMode(authMiddlewareCfg))  // JWT/Entra auth → populates AuthContext
r.Use(middleware.SessionTimeout(30 * time.Minute))
r.Use(middleware.RLSTenantContext)                  // Sets RLS tenant context
r.Use(middleware.OrgScope(s.pool))                  // Resolves org visibility → enriches AuthContext
r.Use(audit.AuditMiddleware(auditService))
```

The `OrgScope` middleware (`internal/platform/middleware/orgscope.go`) calls `auth.ResolveOrgScope()` which:
1. Looks up the user's `org_unit_id` from the `users` table
2. Checks for global bypass roles (`global_admin`, `auditor`, `itd_director`, or `scope_type = 'global'`)
3. If not global, calls `fn_resolve_visible_org_units(user_id, tenant_id)` — a PostgreSQL function that traverses the `org_hierarchy` closure table to find all descendant org units the user can access
4. Enriches `AuthContext` with `OrgUnitID`, `OrgLevel`, `VisibleOrgIDs`, `IsGlobalScope`

By the time a request reaches any service method, `types.GetAuthContext(ctx)` returns a fully-enriched `AuthContext`.

### AuthContext (no changes needed)

Located at `internal/shared/types/context.go`:

```go
type AuthContext struct {
    UserID      uuid.UUID   `json:"userId"`
    TenantID    uuid.UUID   `json:"tenantId"`
    Email       string      `json:"email"`
    DisplayName string      `json:"displayName"`
    Roles       []string    `json:"roles"`
    Permissions []string    `json:"permissions"`
    IssuedAt    time.Time   `json:"issuedAt"`

    // Org scope fields — populated by OrgScope middleware, NOT stored in JWT.
    OrgUnitID     uuid.UUID   `json:"orgUnitId"`
    OrgLevel      string      `json:"orgLevel"`
    VisibleOrgIDs []uuid.UUID `json:"-"`
    IsGlobalScope bool        `json:"isGlobalScope"`
}
```

Key methods:
- `auth.OrgScopeFilter()` → returns `[]uuid.UUID` (visible org IDs), or `nil` for global users
- `auth.HasOrgAccess(orgUnitID)` → point check for single-record authorization
- `auth.IsGlobalScope` → `true` means skip all org filtering

### Query-Building Utilities (no changes needed)

Located at `internal/shared/types/scope_filter.go`:

**`BuildOrgFilter` — standalone helper (bolt onto existing queries):**

```go
func BuildOrgFilter(auth *AuthContext, columnExpr string, paramIndex int) (string, interface{}) {
    if auth.IsGlobalScope {
        return "", nil
    }
    visibleIDs := auth.OrgScopeFilter()
    if len(visibleIDs) > 0 {
        clause := fmt.Sprintf("(%s = ANY($%d) OR %s IS NULL)", columnExpr, paramIndex, columnExpr)
        return clause, uuidSlice(visibleIDs)
    }
    // No visible orgs — only show NULL org_unit records.
    return fmt.Sprintf("%s IS NULL", columnExpr), nil
}
```

**`ScopedQuery` — full builder (for queries built from scratch):**

```go
sq := types.NewScopedQuery(auth, "org_unit_id")
// sq.Where() → "tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"
// sq.AddParam(value) → returns "$3", "$4", etc.
// sq.Args() → all accumulated parameters
```

**Critical rule**: Records with `org_unit_id IS NULL` are ALWAYS visible to all users within the tenant. This ensures backward compatibility during rollout.

---

## Layer 1: Database Migration

Create a new migration file: `migrations/046_org_unit_id_remaining_modules.sql`

### Root Entity Analysis

Only **root entities** get `org_unit_id`. Child entities (that always belong to a parent root entity) inherit scope via JOINs. Here is the classification:

| Module | Table | Classification | Needs `org_unit_id`? | Backfill Source Column |
|--------|-------|---------------|---------------------|----------------------|
| **Knowledge** | `kb_articles` | Root entity | **YES** | `author_id` |
| **Knowledge** | `kb_categories` | Shared taxonomy | **NO** — categories are shared tenant-wide; articles within them are scoped |  |
| **Knowledge** | `kb_article_versions` | Child of kb_articles | **NO** — inherit from parent article via JOIN |  |
| **Knowledge** | `kb_article_feedback` | Child of kb_articles | **NO** — inherit from parent article via JOIN |  |
| **Knowledge** | `announcements` | Root entity | **YES** | `author_id` |
| **Approval** | `workflow_definitions` | Root entity | **YES** | `created_by` |
| **Approval** | `approval_chains` | Root entity | **YES** | `created_by` |
| **Approval** | `approval_steps` | Child of approval_chains | **NO** — inherit from chain via JOIN |  |
| **Approval** | `signoffs` | Child (entity-linked) | **NO** — scoped through the entity they sign off on |  |
| **Approval** | `approval_delegations` | Child of approval_steps | **NO** |  |
| **Approval** | `approval_notifications` | Child of approval_chains | **NO** |  |
| **Calendar** | `maintenance_windows` | Root entity | **YES** | `created_by` |
| **Calendar** | `change_freeze_periods` | Root entity | **YES** | `created_by` |
| **Vault** | `documents` | Root entity | **YES** | `uploaded_by` |
| **Vault** | `document_folders` | Root entity | **YES** | `created_by` |
| **Vault** | `document_access_log` | Audit trail | **NO** — scoped through document |  |
| **Vault** | `document_shares` | Child of documents | **NO** — scoped through document |  |
| **Vault** | `evidence_items` | Child (entity-linked) | **NO** — scoped through the entity |  |
| **Vendor** | `vendors` | Root entity | **YES** | `created_by` |
| **Vendor** | `contracts` | Root entity | **YES** | `created_by` |
| **Vendor** | `vendor_scorecards` | Child of vendors | **NO** — inherit via vendor JOIN |  |
| **Vendor** | `contract_renewals` | Child of contracts | **NO** — inherit via contract JOIN |  |
| **Automation** | `automation_rules` | Root entity | **YES** | `created_by` |
| **Automation** | `automation_executions` | Child of automation_rules | **NO** — inherit from rule via JOIN |  |
| **Custom Fields** | `custom_field_definitions` | Shared config | **YES** | `created_by` |

**Total: 13 root-entity tables need `org_unit_id` added.**

### Migration SQL Pattern

Follow the exact pattern from the existing `migrations/045_org_unit_id_root_entities.sql`:

```sql
-- +goose Up
-- Migration 046: Add org_unit_id to Remaining Module Root Entities
--
-- Extends org-scope filtering to Knowledge, Approval, Calendar, Vault,
-- Vendor, Automation, and Custom Fields modules.
--
-- Pattern: ALTER TABLE + partial index + backfill from creator's org_unit.
-- Records without a resolvable owner get NULL (visible to all tenant users).

-- ──────────────────────────────────────────────
-- kb_articles (Knowledge) — scoped by author's org
-- ──────────────────────────────────────────────
ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_org_unit ON kb_articles(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE kb_articles a
SET org_unit_id = u.org_unit_id
FROM users u
WHERE a.author_id = u.id
  AND a.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- announcements (Knowledge) — scoped by author's org
-- ──────────────────────────────────────────────
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_announcements_org_unit ON announcements(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE announcements a
SET org_unit_id = u.org_unit_id
FROM users u
WHERE a.author_id = u.id
  AND a.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- workflow_definitions (Approval) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org_unit ON workflow_definitions(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE workflow_definitions wd
SET org_unit_id = u.org_unit_id
FROM users u
WHERE wd.created_by = u.id
  AND wd.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- approval_chains (Approval) — scoped by initiator's org
-- ──────────────────────────────────────────────
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_approval_chains_org_unit ON approval_chains(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE approval_chains ac
SET org_unit_id = u.org_unit_id
FROM users u
WHERE ac.created_by = u.id
  AND ac.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- maintenance_windows (Calendar) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE maintenance_windows ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_org_unit ON maintenance_windows(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE maintenance_windows mw
SET org_unit_id = u.org_unit_id
FROM users u
WHERE mw.created_by = u.id
  AND mw.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- change_freeze_periods (Calendar) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE change_freeze_periods ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_change_freeze_periods_org_unit ON change_freeze_periods(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE change_freeze_periods cfp
SET org_unit_id = u.org_unit_id
FROM users u
WHERE cfp.created_by = u.id
  AND cfp.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- documents (Vault) — scoped by uploader's org
-- ──────────────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_documents_org_unit ON documents(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE documents d
SET org_unit_id = u.org_unit_id
FROM users u
WHERE d.uploaded_by = u.id
  AND d.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- document_folders (Vault) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_document_folders_org_unit ON document_folders(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE document_folders df
SET org_unit_id = u.org_unit_id
FROM users u
WHERE df.created_by = u.id
  AND df.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- vendors (Vendor) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_vendors_org_unit ON vendors(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE vendors v
SET org_unit_id = u.org_unit_id
FROM users u
WHERE v.created_by = u.id
  AND v.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- contracts (Vendor) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_unit ON contracts(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE contracts c
SET org_unit_id = u.org_unit_id
FROM users u
WHERE c.created_by = u.id
  AND c.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- automation_rules (Automation) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_org_unit ON automation_rules(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE automation_rules ar
SET org_unit_id = u.org_unit_id
FROM users u
WHERE ar.created_by = u.id
  AND ar.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- custom_field_definitions (Custom Fields) — scoped by creator's org
-- ──────────────────────────────────────────────
ALTER TABLE custom_field_definitions ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_org_unit ON custom_field_definitions(org_unit_id) WHERE org_unit_id IS NOT NULL;

UPDATE custom_field_definitions cfd
SET org_unit_id = u.org_unit_id
FROM users u
WHERE cfd.created_by = u.id
  AND cfd.org_unit_id IS NULL
  AND u.org_unit_id IS NOT NULL;

-- +goose Down
ALTER TABLE custom_field_definitions DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE automation_rules DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE contracts DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE vendors DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE document_folders DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE documents DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE change_freeze_periods DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE maintenance_windows DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE approval_chains DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE workflow_definitions DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE announcements DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE kb_articles DROP COLUMN IF EXISTS org_unit_id;
```

---

## Layer 2: Domain Types Updates

For each module, add `OrgUnitID *uuid.UUID` to the **root entity structs** and create request fields where applicable. Follow the pattern from `internal/modules/planning/types.go` (Portfolio struct).

### Knowledge Module — `internal/modules/knowledge/types.go`

**Add to `KBArticle` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

**Add to `Announcement` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

Do NOT add `OrgUnitID` to `KBCategory`, `KBArticleVersion`, `KBArticleFeedback`, or `FeedbackStats` — these inherit scope from their parent article or are shared taxonomies.

### Approval Module — `internal/modules/approval/types.go`

**Add to `WorkflowDefinition` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

**Add to `ApprovalChain` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

Do NOT add to `ApprovalStep`, `ApprovalDelegation`, `PendingApprovalItem`, or `ApprovalHistoryItem` — these are children of chains.

### Calendar Module — `internal/modules/calendar/types.go`

**Add to `MaintenanceWindow` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

**Add to `ChangeFreezePeriod` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

### Vault Module — `internal/modules/vault/types.go`

**Add to `VaultDocument` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

**Add to `DocumentFolder` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

### Vendor Module — `internal/modules/vendor/types.go`

**Add to `Vendor` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

**Add to `Contract` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

Do NOT add to `VendorScorecard` or `ContractRenewal` — these are children scoped via parent vendor/contract.

### Automation Module — `internal/modules/automation/types.go`

**Add to `AutomationRule` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

Do NOT add to `AutomationExecution` — it's a child of the rule.

### Custom Fields Module — `internal/modules/customfields/types.go`

**Add to `CustomFieldDefinition` struct:**
```go
OrgUnitID *uuid.UUID `json:"orgUnitId,omitempty"`
```

---

## Layer 3: Service-Layer Query Modifications

This is the most complex layer. You must modify every service file to:

1. **READ side**: Add `BuildOrgFilter` to all `List*` and `Search*` methods
2. **WRITE side**: Auto-set `org_unit_id` from `auth.OrgUnitID` in all `Create*` methods
3. **Scan columns**: Add `org_unit_id` to column lists and `Scan()` calls for root entities

### The Canonical Pattern (from ticket_service.go and policy_service.go)

**Pattern A: Adding org filter to List queries (READ side)**

```go
func (s *SomeService) ListSomething(ctx context.Context, ...) (...) {
    auth := types.GetAuthContext(ctx)
    if auth == nil {
        return ..., apperrors.ErrUnauthorized
    }
    tenantID := auth.TenantID

    // Build base args
    args := []interface{}{tenantID}  // $1 = tenant_id
    nextIdx := 2

    // ... add other filter params as needed ...
    // args = append(args, someFilter)  // $2
    // nextIdx++

    // Add org scope filter
    orgClause := ""
    orgFilter, orgParam := types.BuildOrgFilter(auth, "org_unit_id", nextIdx)
    if orgFilter != "" {
        orgClause = " AND " + orgFilter
        if orgParam != nil {
            args = append(args, orgParam)
            nextIdx++
        }
    }

    // Count query
    countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM some_table WHERE tenant_id = $1%s`, orgClause)
    // Use args (without limit/offset) for count

    // Data query
    limitParam := fmt.Sprintf("$%d", nextIdx)
    offsetParam := fmt.Sprintf("$%d", nextIdx+1)
    dataQuery := fmt.Sprintf(`SELECT columns FROM some_table WHERE tenant_id = $1%s ORDER BY created_at DESC LIMIT %s OFFSET %s`,
        orgClause, limitParam, offsetParam)
    dataArgs := append(append([]interface{}{}, args...), limit, offset)

    // Execute queries...
}
```

**Pattern B: Auto-setting org_unit_id on Create (WRITE side)**

```go
func (s *SomeService) CreateSomething(ctx context.Context, req CreateRequest) (...) {
    auth := types.GetAuthContext(ctx)
    // ...

    // Derive org_unit_id from auth context
    var orgUnitID *uuid.UUID
    if auth.OrgUnitID != uuid.Nil {
        id := auth.OrgUnitID
        orgUnitID = &id
    }

    query := `INSERT INTO some_table (id, tenant_id, ..., org_unit_id, ...) VALUES ($1, $2, ..., $N, ...)`
    // Include orgUnitID in the args
}
```

**Pattern C: Adding org_unit_id to scan helpers**

```go
// Column constant — add org_unit_id
const someColumns = `id, tenant_id, ..., org_unit_id, ...`

// Scan helper — add &entity.OrgUnitID to Scan()
func scanSomething(row pgx.Row) (*Something, error) {
    var s Something
    err := row.Scan(
        &s.ID, &s.TenantID, ..., &s.OrgUnitID, ...
    )
    return &s, err
}
```

---

## Module-by-Module Service Changes

### 1. Knowledge Module

#### `internal/modules/knowledge/article_service.go` (715 lines)

**Scan helper changes:**
- Update `articleColumns` constant (around line 269) to include `org_unit_id`
- Update the `scanArticle` function (around line 50) to scan `&article.OrgUnitID`
- KB categories do NOT get org_unit_id (shared taxonomy)

**Read-side changes (add org filter):**
- `ListArticles` (line 370) — Add `BuildOrgFilter(auth, "org_unit_id", nextIdx)` to the WHERE clause. This method builds a dynamic WHERE; add the org clause alongside existing status/category/type/search filters.
- `SearchArticles` (line 647) — Same pattern; add org filter to the search query.
- `GetArticle` (line 330) and `GetArticleBySlug` (line 350) — These fetch single records by ID/slug. Add `HasOrgAccess` check after fetching, OR add org filter to the WHERE clause.

**Write-side changes (auto-set org_unit_id):**
- `CreateArticle` (line 276) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.
- `PublishArticle` (line 522) — No change needed (updates existing record).
- `ArchiveArticle` (line 584) — No change needed.

**Child entity methods (NO org filter needed — they operate through article):**
- `ListCategories`, `CreateCategory`, `GetCategory`, `UpdateCategory`, `DeleteCategory` — No changes (shared taxonomy).
- `IncrementViewCount` — No change (operates on specific article).

#### `internal/modules/knowledge/feedback_service.go` (224 lines)

**No direct org filter changes.** Feedback is always accessed via an article ID. If you want to restrict feedback listing to only articles the user can see, you could add a JOIN to `kb_articles` in `ListFeedback` and filter on `kb_articles.org_unit_id`. However, this is optional — the article endpoint itself is already scoped, so users can only discover feedback for articles they can access.

**Optional enhancement:**
- `ListFeedback` (line 103) — Add a JOIN to `kb_articles` to enforce: `JOIN kb_articles ka ON ka.id = kaf.article_id AND (org filter on ka.org_unit_id)`

#### `internal/modules/knowledge/announcement_service.go` (278 lines)

**Scan helper changes:**
- Update `announcementColumns` constant (around line 47) to include `org_unit_id`
- Update `scanAnnouncement` (around line 41) to scan `&a.OrgUnitID`

**Read-side changes:**
- `ListAnnouncements` (line 136) — Add `BuildOrgFilter(auth, "org_unit_id", nextIdx)` to the WHERE clause.
- `GetAnnouncement` (line 116) — Add org filter or `HasOrgAccess` check.

**Write-side changes:**
- `CreateAnnouncement` (line 61) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.

### 2. Approval Module

#### `internal/modules/approval/service.go` (1174 lines)

**Scan helper changes:**
- Add `org_unit_id` to `WorkflowDefinition` scanning in `ListWorkflowDefinitions` and `GetWorkflowDefinition`
- Add `org_unit_id` to `ApprovalChain` scanning in `GetApprovalChain`

**Read-side changes:**
- `ListWorkflowDefinitions` (line 37) — Add `BuildOrgFilter(auth, "org_unit_id", nextIdx)` to WHERE clause.
- `GetWorkflowDefinition` (line 105) — Add org filter or `HasOrgAccess` check.
- `GetApprovalChain` (line 482) — Add org filter.
- `GetApprovalChainForEntity` (line 514) — Add org filter.
- `GetMyPendingApprovals` (line 991) — This lists approvals assigned TO the current user. The user should see their pending approvals regardless of org scope (they were explicitly assigned). **DO NOT add org filter here** — this is a personal queue.
- `CountMyPendingApprovals` (line 1078) — Same reasoning. **NO org filter.**
- `GetApprovalHistory` (line 1099) — Add org filter on `approval_chains.org_unit_id`.

**Write-side changes:**
- `CreateWorkflowDefinition` (line 137) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.
- `StartApproval` (line 318) — Derive `orgUnitID` from `auth.OrgUnitID` and include in the `approval_chains` INSERT.

**Important edge cases:**
- `ProcessDecision` (line 597) — Do NOT add org filter. Approvers may be from a different org unit than the chain creator. They were explicitly assigned and should be able to decide.
- `DelegateStep` (line 815) — Same reasoning. No org filter.
- `CancelChain` (line 928) — Only the chain creator or admin can cancel. Add `HasOrgAccess` check if the chain has `org_unit_id`.

### 3. Calendar Module

#### `internal/modules/calendar/service.go` (915 lines)

**Scan helper changes:**
- Add `org_unit_id` to `MaintenanceWindow` and `ChangeFreezePeriod` scanning.

**Read-side changes:**
- `GetCalendarEvents` (line 44) — This aggregates from 5 sources. Add org filter to each source fetcher:
  - `getMaintenanceWindowEvents` (line 121) — Add `BuildOrgFilter` on `maintenance_windows.org_unit_id`
  - `getFreezePeriodEvents` (line 188) — Add `BuildOrgFilter` on `change_freeze_periods.org_unit_id`
  - `getChangeRequestEvents` (line 244) — Change requests are in the planning module; these already have org scope if they have `org_unit_id`. If not, add filter here.
  - `getMilestoneEvents` (line 302) — Milestones are children of projects; scope via `projects.division_id` JOIN if needed.
  - `getProjectDeadlineEvents` (line 360) — Projects have `division_id`; scope via it.
- `GetMaintenanceWindow` (line 505) — Add `HasOrgAccess` check or org filter.
- `ListFreezePeriods` (line 713) — Add `BuildOrgFilter`.
- `CheckConflicts` (line 793) — Add org filter to conflict queries.

**Write-side changes:**
- `CreateMaintenanceWindow` (line 426) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.
- `CreateFreezePeriod` (line 655) — Same.

### 4. Vault Module

#### `internal/modules/vault/service.go` (1593 lines)

**Scan helper changes:**
- Add `org_unit_id` to document column lists and scan calls (around line 82 and where documents are scanned).
- Add `org_unit_id` to folder column lists and scan calls.

**Read-side changes:**
- `ListDocuments` (line 82) — Already builds dynamic WHERE. Add `BuildOrgFilter(auth, "d.org_unit_id", nextIdx)` to the WHERE builder.
- `GetDocument` (line 204) — Add org filter or `HasOrgAccess` check.
- `SearchDocuments` (line 1347) — Add org filter.
- `GetRecentDocuments` (line 1437) — This shows the current user's own recent uploads. **NO org filter needed** (already filtered by `uploaded_by = auth.UserID`).
- `GetStats` (line 1507) — Add org filter so stats reflect only visible documents.
- `ListFolders` (line 1097) — Add `BuildOrgFilter(auth, "f.org_unit_id", nextIdx)`.
- `GetDownloadURL` (line 560) — Add `HasOrgAccess` check before generating URL.
- `ListVersions` (line 732) — Versions are children of documents. Either add org filter on the document, or assume access was already checked via `GetDocument`.
- `GetAccessLog` (line 1041) — Audit trail; add org filter on the associated document.

**Write-side changes:**
- `UploadDocument` (line 256) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.
- `CreateFolder` (line 1144) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.

### 5. Vendor Module

#### `internal/modules/vendor/service.go` (1184 lines)

**Scan helper changes:**
- Update `scanVendor` (around line 47) and `vendorColumns` to include `org_unit_id`.
- Update `scanContract` (around line 98) and `contractColumns` to include `org_unit_id`.
- `scanVendorScorecard` and `scanContractRenewal` — NO changes (child entities).

**Read-side changes:**
- `ListVendors` (line 234) — Add `BuildOrgFilter(auth, "org_unit_id", nextIdx)` to WHERE clause.
- `GetVendor` (line 284) — Add `HasOrgAccess` check.
- `GetVendorSummary` (line 464) — Add org filter.
- `ListContracts` (line 505) — Add `BuildOrgFilter(auth, "org_unit_id", nextIdx)`.
- `GetContract` (line 556) — Add `HasOrgAccess` check.
- `ListVendorContracts` (line 782) — These are contracts for a specific vendor. Either add org filter on contract's `org_unit_id`, or assume vendor access was checked upstream.
- `ListExpiringContracts` (line 822) — Add org filter.
- `GetContractDashboard` (line 851) — Add org filter so dashboard reflects only visible contracts.
- `ListVendorScorecards` (line 884) — Scorecards are children. Scope via JOIN to vendor's `org_unit_id` or rely on upstream vendor check.
- `GetContractRenewals` (line 1159) — Same approach as scorecards.

**Write-side changes:**
- `CreateVendor` (line 304) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.
- `CreateContract` (line 576) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.

### 6. Automation Module

#### `internal/modules/automation/service.go` (822 lines)

**Scan helper changes:**
- Update `ruleColumns` and the scan helper for `AutomationRule` (around line 52) to include `org_unit_id`.
- `executionColumns` and execution scanning — NO changes (child entity).

**Read-side changes:**
- `ListRules` (line 121) — Add `BuildOrgFilter(auth, "org_unit_id", nextIdx)` to WHERE clause.
- `GetRule` (line 183) — Add `HasOrgAccess` check.
- `ListExecutions` (line 678) — These are per-rule. Either add org filter via JOIN to `automation_rules.org_unit_id`, or rely on upstream rule access check.
- `ListAllExecutions` (line 735) — Add org filter via JOIN: `JOIN automation_rules ar ON ar.id = ae.rule_id` and filter on `ar.org_unit_id`.
- `GetStats` (line 789) — Add org filter so stats reflect only visible rules.

**Write-side changes:**
- `CreateRule` (line 207) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.

**Special case:**
- `TestRule` (line 501) — This loads an entity via `row_to_json`. Add `HasOrgAccess` check on the rule before executing.

### 7. Custom Fields Module

#### `internal/modules/customfields/service.go` (668 lines)

**Scan helper changes:**
- Update `definitionColumns` and the scan helper (around line 49) to include `org_unit_id`.

**Read-side changes:**
- `ListDefinitions` (line 108) — Add `BuildOrgFilter(auth, "org_unit_id", nextIdx)` to WHERE clause.
- `GetDefinition` (line 139) — Add `HasOrgAccess` check.

**Write-side changes:**
- `CreateDefinition` (line 159) — Derive `orgUnitID` from `auth.OrgUnitID` and include in INSERT.

**Entity value operations (`GetValues`, `UpdateValues`):**
- These read/write the `custom_fields` JSONB column on entity tables (tickets, projects, etc.). These entity tables already have their own org-scope filtering. No additional filter needed in the custom fields service — the entity's own access control applies.

---

## Important Rules & Constraints

### 1. NULL Backward Compatibility
The SQL pattern MUST always be:
```sql
(org_unit_id = ANY($N) OR org_unit_id IS NULL)
```
Never `org_unit_id = ANY($N)` alone. Records with NULL org_unit_id must remain visible to all tenant users.

### 2. Global Scope Bypass
When `auth.IsGlobalScope == true`, `BuildOrgFilter` returns `("", nil)`. The calling code must handle this correctly — when the clause is empty, do NOT append it to the query. This means global admins see all records.

### 3. Parameter Index Tracking
Every `$N` placeholder must have exactly one corresponding parameter in the args slice. When `BuildOrgFilter` adds a parameter (`orgParam != nil`), increment `nextIdx`. When `BuildOrgFilter` returns a clause but nil param (the `IS NULL` fallback), the clause has no parameter — do NOT increment `nextIdx`.

### 4. Both Count and Data Queries
Org filters must be applied to BOTH the `COUNT(*)` query and the `SELECT ... LIMIT OFFSET` query. Otherwise, pagination metadata will be wrong.

### 5. Personal Queues Are Exempt
Methods that return records assigned to or owned by the current user (like `GetMyPendingApprovals`, `GetRecentDocuments`) should NOT have org filters — the user should always see their own items.

### 6. Cross-Org Assignments Are Allowed
In the Approval module, an approver may be from a different org unit than the chain initiator. The `ProcessDecision` and `DelegateStep` methods must NOT enforce org scope — the assignment itself is the authorization.

### 7. GENERATED ALWAYS Columns
Do NOT include GENERATED ALWAYS columns in INSERT or UPDATE statements. If any exist in these tables, they must be excluded from the INSERT columns/values but can be in RETURNING clauses. (Known issue: `risks.risk_score` was a GENERATED ALWAYS column that previously caused INSERT failures.)

### 8. tenant_id in Child Table Inserts
When inserting into child tables (like `kb_article_versions`, `approval_steps`), always include `tenant_id` if the column exists. A previous bug in `policy_versions` INSERT was caused by missing `tenant_id`.

---

## Build & Test Instructions

### Build
```bash
cd itd-opms-api
go build -o bin/itd-opms-api ./cmd/api/
```
The build MUST succeed with zero errors. Fix any compilation errors before proceeding.

### Unit Tests
```bash
cd itd-opms-api
go test -race -count=1 ./...
```
All 27 test packages must pass. The `-race` flag enables race detection.

### Run Migration
```bash
# Connect to PostgreSQL container
docker exec -i opms-postgres psql -U opms -d itd_opms < migrations/046_org_unit_id_remaining_modules.sql
```

### Restart API
```bash
cd itd-opms-api
go build -o bin/itd-opms-api ./cmd/api/ && pm2 restart opms-api
```

### Manual Verification Test

Use 3 test users to verify isolation:

| User | Email | Role | Org Unit |
|------|-------|------|----------|
| Admin (Olaniyan) | raolaniyan@cbn.gov.ng | global_admin | App Mgmt Division |
| Sabdul | sabdul@cbn.gov.ng | staff | App Mgmt Division (ce6d2f59) |
| Tsadegoke | tsadegoke@cbn.gov.ng | staff | Arch Strategy Division (9f52a1e7) |

Password for all: `Password@123`

**Login:**
```bash
curl -s http://localhost:8089/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"raolaniyan@cbn.gov.ng","password":"Password@123"}'
```

**Expected behavior:**
- Admin (global_admin) sees ALL records
- Sabdul sees records with `org_unit_id` matching App Mgmt Division + descendants + NULL
- Tsadegoke sees records with `org_unit_id` matching Arch Strategy Division + descendants + NULL
- For endpoints with no data: all three users see 0 records (expected)
- Admin count >= Sabdul count, Admin count >= Tsade count

**Test each endpoint:**
```bash
# Knowledge
GET /api/v1/knowledge/articles/
GET /api/v1/knowledge/announcements/

# Approvals
GET /api/v1/approvals/workflows/
GET /api/v1/approvals/history

# Calendar
GET /api/v1/calendar/events?start=2024-01-01T00:00:00Z&end=2026-12-31T23:59:59Z
GET /api/v1/calendar/freeze-periods/

# Vault
GET /api/v1/vault/documents/
GET /api/v1/vault/folders/

# Vendors
GET /api/v1/vendors/
GET /api/v1/vendors/contracts/

# Automation
GET /api/v1/automation/rules/

# Custom Fields
GET /api/v1/custom-fields/definitions/?entityType=ticket
```

---

## File Inventory (files to modify)

### New file:
- `migrations/046_org_unit_id_remaining_modules.sql`

### Types files to modify (add OrgUnitID field):
- `internal/modules/knowledge/types.go`
- `internal/modules/approval/types.go`
- `internal/modules/calendar/types.go`
- `internal/modules/vault/types.go`
- `internal/modules/vendor/types.go`
- `internal/modules/automation/types.go`
- `internal/modules/customfields/types.go`

### Service files to modify (add org filter + write-side stamping):
- `internal/modules/knowledge/article_service.go`
- `internal/modules/knowledge/announcement_service.go`
- `internal/modules/knowledge/feedback_service.go` (optional — child entity)
- `internal/modules/approval/service.go`
- `internal/modules/calendar/service.go`
- `internal/modules/vault/service.go`
- `internal/modules/vendor/service.go`
- `internal/modules/automation/service.go`
- `internal/modules/customfields/service.go`

**Total: 1 new file + 7 types files + 9 service files = 17 files**

---

## Execution Order

1. **Create migration** `046_org_unit_id_remaining_modules.sql` and apply it
2. **Update types** (all 7 types.go files) — add `OrgUnitID` to domain structs
3. **Update services** — module by module in this order:
   a. Knowledge (simplest — clear article/announcement pattern)
   b. Custom Fields (smallest service)
   c. Automation (small service, clear pattern)
   d. Vendor (medium complexity)
   e. Calendar (medium — aggregated events from multiple sources)
   f. Vault (large service with many operations)
   g. Approval (most complex — personal queues, cross-org assignments)
4. **Build** — `go build` must succeed
5. **Test** — `go test -race -count=1 ./...` must pass
6. **Restart & verify** — manual endpoint testing with 3 users

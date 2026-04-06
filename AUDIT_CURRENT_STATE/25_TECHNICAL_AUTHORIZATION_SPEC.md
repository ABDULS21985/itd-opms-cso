# 25. Technical Authorization Specification

## Audit Metadata

| Field | Value |
|---|---|
| **Date** | 2026-03-04 |
| **Branch** | `dev` |
| **Scope** | Complete authorization specification for ITD-OPMS hierarchical scope-based access control |
| **Key Files** | `migrations/002_users_and_rbac.sql`, `migrations/044_user_org_binding.sql`, `internal/platform/auth/scope.go`, `internal/platform/middleware/orgscope.go`, `internal/shared/types/context.go`, `internal/shared/types/scope_filter.go` |

---

## 1. Role Definitions

### 1.1 System Roles (7 Built-In)

These roles are seeded in migration 002 with `is_system = true` and cannot be deleted.

| Role ID | Name | Description | Typical Scope |
|---|---|---|---|
| `10000000-...-000001` | `global_admin` | Full system administrator with all permissions | `global` |
| `10000000-...-000002` | `itd_director` | ITD Director -- cross-division read, approve, report | `global` |
| `10000000-...-000003` | `head_of_division` | Head of Division -- division-scoped CRUD and approve | `division` |
| `10000000-...-000004` | `supervisor` | Supervisor -- unit-scoped CRUD with limited approve | `unit` / `office` |
| `10000000-...-000005` | `staff` | Staff member -- self-scoped, read own division | user's org_unit |
| `10000000-...-000006` | `auditor` | Auditor -- read-only all modules plus audit permissions | `global` |
| `10000000-...-000007` | `service_desk_agent` | Service Desk Agent -- ITSM CRUD with limited scope | `unit` / `office` |

### 1.2 Custom Roles

Custom roles can be created via the roles API (`system.roles.manage` permission required). They use the same `roles` table with `is_system = false` and support arbitrary permission arrays.

```sql
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Permission Namespaces

Permissions follow a `module.action` naming convention. The wildcard `*` grants all permissions.

### 2.1 Permission Catalog

| Namespace | Permissions | Granted To |
|---|---|---|
| `*` | All permissions (wildcard) | `global_admin` |
| **governance.*** | | |
| `governance.read` | Read governance entities (policies, OKRs, meetings, RACI) | All roles except service_desk_agent |
| `governance.write` | Create/update governance entities | head_of_division, supervisor (write subset) |
| `governance.approve` | Approve governance workflows | itd_director, head_of_division |
| **people.*** | | |
| `people.read` | Read people data (skills, rosters, leave, training) | itd_director, head_of_division, supervisor |
| `people.read_self` | Read own people data only | staff |
| `people.write` | Create/update people data | head_of_division, supervisor |
| **planning.*** | | |
| `planning.read` | Read planning entities (portfolios, projects, work items) | All roles except service_desk_agent |
| `planning.write` | Create/update planning entities | head_of_division, supervisor |
| `planning.approve` | Approve planning workflows | itd_director, head_of_division |
| **itsm.*** | | |
| `itsm.read` | Read ITSM entities (tickets, problems, queues) | All roles |
| `itsm.write` | Create/update ITSM entities | head_of_division, supervisor, service_desk_agent |
| `itsm.create_ticket` | Create tickets only | staff |
| `itsm.assign` | Assign tickets to agents | service_desk_agent |
| `itsm.resolve` | Resolve/close tickets | service_desk_agent |
| `itsm.approve` | Approve ITSM changes | itd_director, head_of_division |
| **cmdb.*** | | |
| `cmdb.read` | Read CMDB/asset data | All roles |
| `cmdb.write` | Create/update CMDB/asset data | head_of_division, supervisor |
| **knowledge.*** | | |
| `knowledge.read` | Read knowledge base articles, announcements | All roles |
| `knowledge.write` | Create/update knowledge articles | head_of_division, supervisor, service_desk_agent |
| **grc.*** | | |
| `grc.read` | Read GRC entities (risks, audits, compliance) | All roles except service_desk_agent |
| `grc.write` | Create/update GRC entities | head_of_division, auditor |
| `grc.approve` | Approve GRC workflows | itd_director, head_of_division, auditor |
| **reporting.*** | | |
| `reporting.read` | View reports and dashboards | itd_director, head_of_division, supervisor, auditor |
| `reporting.export` | Export reports | itd_director, head_of_division, auditor |
| **audit.*** | | |
| `audit.read` | View audit trail | itd_director, auditor |
| `audit.verify` | Verify audit findings | auditor |
| **system.*** | | |
| `system.view` | View system settings and configuration | itd_director, auditor |
| `system.manage` | Manage system settings | global_admin |
| `system.users.view` | View user management | global_admin |
| `system.users.manage` | Manage users (create, update, deactivate) | global_admin |
| `system.roles.view` | View role definitions | global_admin |
| `system.roles.manage` | Create/update/delete roles | global_admin |
| `system.tenants.manage` | Manage tenants | global_admin |
| `system.settings.manage` | Manage system settings | global_admin |
| `system.sessions.manage` | Manage active sessions | global_admin |
| `system.audit.view` | View audit explorer | global_admin, itd_director, auditor |
| `system.audit.export` | Export audit data | global_admin, itd_director, auditor |
| `system.audit.verify` | Verify audit entries | global_admin, auditor |

### 2.2 Permission Checking

```go
// internal/shared/types/context.go
func (a *AuthContext) HasPermission(permission string) bool {
    for _, p := range a.Permissions {
        if p == "*" || p == permission {
            return true
        }
    }
    return false
}
```

The `RequirePermission` middleware enforces permissions at the route level:

```go
// internal/platform/middleware/rbac.go
r.Use(middleware.RequirePermission("governance.write"))
```

---

## 3. Scope Type Enum

The `scope_type` PostgreSQL enum defines the granularity of scope anchors:

```sql
CREATE TYPE scope_type AS ENUM (
    'global',       -- Bypass all org filtering; see entire tenant
    'tenant',       -- Legacy/default; tenant-wide (pre-hierarchy)
    'directorate',  -- Added in migration 044
    'department',   -- Added in migration 044
    'division',     -- Original
    'office',       -- Original
    'unit',         -- Original
    'section',      -- Added in migration 044
    'team'          -- Added in migration 044
);
```

### 3.1 Scope Type Semantics

| Scope Type | Meaning | org_hierarchy Traversal |
|---|---|---|
| `global` | See all org_units in tenant | Skip closure table; return all active org_units |
| `tenant` | Legacy default; treated as user's org_unit only | Falls back to `COALESCE(scope_id, user.org_unit_id)` |
| `directorate` | Anchor at directorate-level org_unit | All descendants of directorate org_unit |
| `department` | Anchor at department-level org_unit | All descendants of department org_unit |
| `division` | Anchor at division-level org_unit | All descendants of division org_unit |
| `office` | Anchor at office-level org_unit | All descendants of office org_unit |
| `unit` | Anchor at unit-level org_unit | All descendants of unit org_unit |
| `team` | Anchor at team-level org_unit | All descendants of team org_unit |
| `section` | Anchor at section-level org_unit | Leaf node; only self-reference (depth 0) |

---

## 4. Scope Resolution Algorithm

### 4.1 SQL Function (fn_resolve_visible_org_units)

**Location:** `migrations/044_user_org_binding.sql`

```
Input:  p_user_id UUID, p_tenant_id UUID
Output: TABLE(org_unit_id UUID) -- set of visible org_unit_ids

Algorithm:
1. IF user has any active role_binding where:
     - role.name IN ('global_admin', 'auditor', 'itd_director')
     - OR scope_type = 'global'
     - AND is_active = true
     - AND (expires_at IS NULL OR expires_at > NOW())
   THEN:
     RETURN all active org_units for tenant
     EXIT

2. FOR EACH active, non-expired role_binding:
     anchor = COALESCE(role_binding.scope_id, user.org_unit_id)
     IF anchor IS NOT NULL:
       COLLECT org_hierarchy.descendant_id WHERE ancestor_id = anchor

3. ALWAYS INCLUDE user.org_unit_id (self-scope guarantee)

4. FOR EACH active delegation WHERE delegate_id = p_user_id:
     IF delegation.starts_at <= NOW() AND delegation.ends_at > NOW():
       anchor = delegator.org_unit_id
       IF anchor IS NOT NULL:
         COLLECT org_hierarchy.descendant_id WHERE ancestor_id = anchor

5. RETURN DISTINCT union of all collected org_unit_ids
```

### 4.2 Go Code (auth.ResolveOrgScope)

**Location:** `internal/platform/auth/scope.go`

```go
func ResolveOrgScope(ctx context.Context, pool *pgxpool.Pool, userID, tenantID uuid.UUID) (*OrgScope, error) {
    scope := &OrgScope{}

    // Step 1: Get user's own org_unit_id and level
    pool.QueryRow(ctx, `
        SELECT u.org_unit_id, o.level::text
        FROM users u LEFT JOIN org_units o ON o.id = u.org_unit_id
        WHERE u.id = $1`, userID)

    // Step 2: Check for global bypass
    pool.QueryRow(ctx, `
        SELECT EXISTS(
            SELECT 1 FROM role_bindings rb JOIN roles r ON r.id = rb.role_id
            WHERE rb.user_id = $1 AND rb.is_active = true
              AND (rb.expires_at IS NULL OR rb.expires_at > NOW())
              AND (r.name IN ('global_admin', 'auditor', 'itd_director')
                   OR rb.scope_type = 'global')
        )`, userID)

    if hasGlobal {
        scope.IsGlobalScope = true
        return scope, nil  // No VisibleOrgIDs needed
    }

    // Step 3: Call SQL function for scoped resolution
    rows, _ := pool.Query(ctx,
        `SELECT org_unit_id FROM fn_resolve_visible_org_units($1, $2)`,
        userID, tenantID)
    // Deduplicate and collect into scope.VisibleOrgIDs

    // Step 4: Ensure self-scope
    if scope.OrgUnitID != uuid.Nil && !seen[scope.OrgUnitID] {
        scope.VisibleOrgIDs = append(scope.VisibleOrgIDs, scope.OrgUnitID)
    }

    return scope, nil
}
```

### 4.3 Return Type

```go
type OrgScope struct {
    OrgUnitID     uuid.UUID   // User's direct org unit assignment
    OrgLevel      string      // Level of user's org unit (e.g., "division", "office")
    VisibleOrgIDs []uuid.UUID // All org_unit_ids this user can see
    IsGlobalScope bool        // True if user has global bypass
}
```

---

## 5. Backend Enforcement Points

### 5.1 Middleware: OrgScope

**File:** `internal/platform/middleware/orgscope.go`

**Position in chain:** After `AuthDualMode`, `SessionTimeout`, `RLSTenantContext`; before `AuditMiddleware` and handlers.

```go
func OrgScope(pool *pgxpool.Pool) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authCtx := types.GetAuthContext(r.Context())
            if authCtx == nil {
                next.ServeHTTP(w, r)
                return
            }

            scope, err := auth.ResolveOrgScope(r.Context(), pool, authCtx.UserID, authCtx.TenantID)
            if err != nil {
                // Fail-open: continue without org scope
                slog.Warn("org scope resolution failed", ...)
                next.ServeHTTP(w, r)
                return
            }

            // Enrich AuthContext
            authCtx.OrgUnitID = scope.OrgUnitID
            authCtx.OrgLevel = scope.OrgLevel
            authCtx.VisibleOrgIDs = scope.VisibleOrgIDs
            authCtx.IsGlobalScope = scope.IsGlobalScope

            ctx := types.SetAuthContext(r.Context(), authCtx)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

### 5.2 Service Layer: ScopedQuery

**File:** `internal/shared/types/scope_filter.go`

ScopedQuery manages parameterized SQL query building with automatic tenant and org-scope filtering.

```go
// Constructor
sq := types.NewScopedQuery(auth, "org_unit_id")
// auth.TenantID becomes $1
// auth.VisibleOrgIDs becomes $2 (if non-global)

// Where() returns the complete filter clause
whereClause := sq.Where()
// "tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"

// AddParam() manages subsequent parameters
statusPlaceholder := sq.AddParam("open")  // "$3"

// Args() returns all accumulated parameters
rows, err := pool.Query(ctx, query, sq.Args()...)
```

**Behavior Matrix:**

| IsGlobalScope | len(VisibleOrgIDs) | Generated WHERE |
|---|---|---|
| `true` | any | `tenant_id = $1` (no org filter) |
| `false` | > 0 | `tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)` |
| `false` | 0 | `tenant_id = $1 AND org_unit_id IS NULL` (default deny) |

### 5.3 Service Layer: BuildOrgFilter

**File:** `internal/shared/types/scope_filter.go`

Standalone helper for adding org-scope to existing queries without ScopedQuery:

```go
func BuildOrgFilter(auth *AuthContext, columnExpr string, paramIndex int) (string, interface{}) {
    if auth.IsGlobalScope {
        return "", nil  // Caller skips filter
    }
    visibleIDs := auth.OrgScopeFilter()
    if len(visibleIDs) > 0 {
        clause := fmt.Sprintf("(%s = ANY($%d) OR %s IS NULL)", columnExpr, paramIndex, columnExpr)
        return clause, visibleIDs
    }
    return fmt.Sprintf("%s IS NULL", columnExpr), nil
}
```

### 5.4 AuthContext Point Check: HasOrgAccess

**File:** `internal/shared/types/context.go`

For single-record access validation (e.g., GET by ID):

```go
func (a *AuthContext) HasOrgAccess(orgUnitID uuid.UUID) bool {
    if a.IsGlobalScope {
        return true
    }
    if orgUnitID == uuid.Nil {
        return true  // NULL org_unit_id = tenant-visible
    }
    for _, id := range a.VisibleOrgIDs {
        if id == orgUnitID {
            return true
        }
    }
    return false
}
```

### 5.5 RLS Policies

**Files:** `migrations/042_rls_policies.sql`, `migrations/043_enable_rls.sql`

**Current state:** Tenant-level isolation is active on all tenant-scoped tables:

```sql
CREATE POLICY tenant_isolation ON <table>
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
```

**Planned (Phase 4): Org-scope RESTRICTIVE policies:**

```sql
-- Future migration: add org-scope RLS
CREATE POLICY org_scope ON tickets
  AS RESTRICTIVE
  FOR ALL
  USING (
    current_setting('app.org_scope_bypass', true) = 'true'
    OR org_unit_id IS NULL
    OR org_unit_id = ANY(
      string_to_array(current_setting('app.visible_org_unit_ids', true), ',')::uuid[]
    )
  );
```

The RESTRICTIVE qualifier ensures this policy is ANDed with the existing tenant_isolation policy, not ORed. Both must pass for a row to be visible.

**GUC variables set per connection:**

| Variable | Source | Purpose |
|---|---|---|
| `app.current_tenant_id` | `RLSTenantContext` middleware | Tenant isolation |
| `app.visible_org_unit_ids` | Planned: set from `AuthContext.VisibleOrgIDs` | Org scope |
| `app.org_scope_bypass` | Planned: set to `'true'` when `IsGlobalScope` | Global bypass |

---

## 6. Frontend Guard Strategy (Planned -- Phase 5)

### 6.1 OrgScopeGate Component

```tsx
// Planned: frontend/src/components/guards/OrgScopeGate.tsx
interface OrgScopeGateProps {
  orgUnitId: string | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function OrgScopeGate({ orgUnitId, fallback, children }: OrgScopeGateProps) {
  const { hasOrgAccess } = useOrgScope();

  if (orgUnitId && !hasOrgAccess(orgUnitId)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
```

**Usage:**
```tsx
<OrgScopeGate orgUnitId={record.orgUnitId}>
  <EditButton />
  <DeleteButton />
</OrgScopeGate>
```

### 6.2 useOrgScope Hook

```tsx
// Planned: frontend/src/hooks/useOrgScope.ts
interface OrgScopeContext {
  orgUnitId: string | null;
  orgLevel: string | null;
  visibleOrgIds: string[];
  isGlobalScope: boolean;
  hasOrgAccess: (orgUnitId: string | null) => boolean;
}

function useOrgScope(): OrgScopeContext {
  const { user } = useAuth();
  return {
    orgUnitId: user?.orgUnitId ?? null,
    orgLevel: user?.orgLevel ?? null,
    visibleOrgIds: user?.visibleOrgIds ?? [],
    isGlobalScope: user?.isGlobalScope ?? false,
    hasOrgAccess: (id) => {
      if (!id || user?.isGlobalScope) return true;
      return user?.visibleOrgIds?.includes(id) ?? false;
    },
  };
}
```

### 6.3 API Data Source

The `/api/v1/auth/me` endpoint returns org scope fields:

```json
{
  "status": "success",
  "data": {
    "id": "...",
    "email": "...",
    "displayName": "...",
    "roles": ["head_of_division"],
    "permissions": ["governance.read", "governance.write", ...],
    "orgUnitId": "uuid-of-division",
    "orgLevel": "division",
    "isGlobalScope": false
  }
}
```

Note: `visibleOrgIds` is NOT included in the API response (marked `json:"-"` in AuthContext). The frontend uses the `orgUnitId` and `isGlobalScope` fields for UI gating. Record-level access decisions are always enforced server-side.

---

## 7. Authorization Decision Flowchart

```
Request arrives
      |
      v
Is user authenticated?
      |
  No -+-> 401 Unauthorized
      |
  Yes v
Does user have required permission?
      |
  No -+-> 403 Forbidden
      |
  Yes v
Is user global_admin / auditor / itd_director?
      |
  Yes -> Skip org filter, return all tenant data
      |
  No  v
Resolve VisibleOrgIDs from:
  - role_bindings.scope_id -> org_hierarchy descendants
  - user.org_unit_id (self-scope)
  - active delegations -> delegator's descendants
      |
      v
Are VisibleOrgIDs empty?
      |
  Yes -> Default deny: only records with org_unit_id IS NULL
      |
  No  v
Apply filter: org_unit_id = ANY(VisibleOrgIDs) OR org_unit_id IS NULL
      |
      v
Return filtered results
```

---

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| JWT does not contain org scope | Org scope is computed per-request from live DB state, not from cached JWT claims |
| Stale delegation scope | Delegations are checked with `NOW()` comparison at query time; no cache invalidation needed |
| Fail-open during rollout | OrgScope middleware logs warnings on failure; will switch to fail-closed in Phase 4 |
| RLS bypass by table owner | `FORCE ROW LEVEL SECURITY` applied to all tables; app connects as table owner |
| NULL org_unit_id records | Treated as tenant-visible for backward compatibility; records should be backfilled |
| VisibleOrgIDs not in JWT | Prevents frontend tampering; server always resolves fresh scope |
| Parameter injection | ScopedQuery uses parameterized queries ($1, $2, etc.); no string interpolation |

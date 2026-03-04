# 23. Architecture Note: Hierarchical Scope-Based Access Control

## Audit Metadata

| Field | Value |
|---|---|
| **Date** | 2026-03-04 |
| **Branch** | `dev` |
| **Scope** | Final access model for org-hierarchy-based authorization in ITD-OPMS |
| **Key Migrations** | 001, 002, 018, 044, 045 |
| **Key Source Files** | `internal/platform/auth/scope.go`, `internal/platform/middleware/orgscope.go`, `internal/shared/types/context.go`, `internal/shared/types/scope_filter.go` |

---

## 1. Access Model Overview

ITD-OPMS implements **hierarchical scope-based access control** anchored to the CBN organogram. The hierarchy is:

```
Directorate > Department > Division > Office > Unit > Team > Section
```

A user's **visibility scope** is determined by the combination of:
1. Their **org_unit_id** (FK on `users` table, added in migration 044)
2. Their **role_bindings** (scope_type + scope_id pair)
3. Any active **delegations** (time-bound scope expansion)
4. The **org_hierarchy closure table** (precomputed ancestor/descendant paths)

**Scope inheritance is downward only.** A Division Head can see all data belonging to offices, units, teams, and sections within their division, but cannot see data belonging to sibling divisions or parent departments.

---

## 2. Scope Inheritance Rules

### 2.1 Downward Cascade via Closure Table

The `org_hierarchy` closure table stores every ancestor-descendant pair with a `depth` value:

| ancestor_id | descendant_id | depth |
|---|---|---|
| Division-A | Division-A | 0 |
| Division-A | Office-A1 | 1 |
| Division-A | Unit-A1a | 2 |

When a user's scope anchor is `Division-A`, the function `fn_resolve_visible_org_units` returns `{Division-A, Office-A1, Unit-A1a}` -- all descendants at depth >= 0.

### 2.2 Self-Scope Guarantee

Every user always sees records belonging to their own `org_unit_id`, regardless of role bindings. The SQL function explicitly includes:

```sql
-- Always include the user's own org unit (self-scope)
SELECT u.org_unit_id AS oid
FROM users u
WHERE u.id = p_user_id
  AND u.org_unit_id IS NOT NULL
```

### 2.3 No Lateral or Upward Inheritance

The closure table only stores downward paths (depth >= 0). There is no mechanism for a user in `Office-A1` to see data belonging to `Office-A2` (sibling) or `Division-B` (different branch).

### 2.4 Global Bypass

Users with roles `global_admin`, `auditor`, or `itd_director` -- or any role_binding with `scope_type = 'global'` -- bypass org filtering entirely. They see all org_units within the tenant.

### 2.5 Delegation Expansion

Active delegations expand scope by including the **delegator's** org_unit descendants:

```sql
-- Active delegations: inherit the delegator's org scope
SELECT h.descendant_id AS oid
FROM delegations d
JOIN users delegator ON delegator.id = d.delegator_id
JOIN org_hierarchy h ON h.ancestor_id = delegator.org_unit_id
WHERE d.delegate_id = p_user_id
  AND d.is_active = true
  AND d.starts_at <= NOW()
  AND d.ends_at > NOW()
```

Delegations are time-bound (`starts_at` / `ends_at`) and audited.

---

## 3. Visibility Boundaries per Role Level

| Role | Scope Type | Visibility | Example |
|---|---|---|---|
| `global_admin` | `global` | All org_units in tenant | Sees everything |
| `itd_director` | `global` | All org_units in tenant | Cross-division read/approve |
| `auditor` | `global` | All org_units in tenant | Read-only all modules |
| `head_of_division` | `division` | scope_id org_unit + all descendants | Division + offices + units beneath |
| `supervisor` | `unit` / `office` | scope_id org_unit + descendants | Office/unit + teams/sections beneath |
| `staff` | user's org_unit | Own org_unit only | Single org unit (self-scope) |
| `service_desk_agent` | `unit` / `office` | scope_id org_unit + descendants | Assigned queue's org scope |

---

## 4. Enforcement Layers

The access model is enforced at four independent layers, providing defense-in-depth:

### 4.1 Database Layer: Row-Level Security (RLS)

**Current state:** RLS policies enforce `tenant_id` isolation (migrations 042/043). All tenant-scoped tables have:

```sql
CREATE POLICY tenant_isolation ON <table>
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**Planned (Phase 4):** Add RESTRICTIVE org-scope RLS policies using a second GUC variable `app.visible_org_unit_ids`:

```sql
CREATE POLICY org_scope ON <table>
  AS RESTRICTIVE
  FOR ALL
  USING (
    org_unit_id IS NULL
    OR org_unit_id = ANY(string_to_array(current_setting('app.visible_org_unit_ids', true), ',')::uuid[])
  );
```

### 4.2 Middleware Layer: OrgScope

**File:** `internal/platform/middleware/orgscope.go`

The `OrgScope` middleware runs after `AuthDualMode` and before route handlers. It:
1. Extracts the `AuthContext` from the request context
2. Calls `auth.ResolveOrgScope()` to compute visible org_unit_ids
3. Enriches `AuthContext` with `OrgUnitID`, `OrgLevel`, `VisibleOrgIDs`, `IsGlobalScope`
4. Re-sets the enriched `AuthContext` on the request context

**Middleware chain order:**
```
AuthDualMode -> SessionTimeout -> RLSTenantContext -> OrgScope -> AuditMiddleware -> Handler
```

**Fail-open during rollout:** If scope resolution fails, the middleware logs a warning and continues without org filtering (tenant-only scope).

### 4.3 Service Layer: ScopedQuery / BuildOrgFilter

**File:** `internal/shared/types/scope_filter.go`

Two utilities for applying org-scope filters in service queries:

**ScopedQuery** -- full query builder:
```go
sq := types.NewScopedQuery(auth, "org_unit_id")
query := fmt.Sprintf("SELECT * FROM tickets WHERE %s", sq.Where())
// Produces: "tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"
rows, err := pool.Query(ctx, query, sq.Args()...)
```

**BuildOrgFilter** -- standalone clause for existing queries:
```go
clause, param := types.BuildOrgFilter(auth, "t.org_unit_id", 3)
if clause != "" {
    query += " AND " + clause
    args = append(args, param)
}
```

Both utilities:
- Return no filter for `IsGlobalScope` users (skip org clause)
- Include `OR org_unit_id IS NULL` for backward compatibility (unscoped records remain visible)
- Use `= ANY($N)` with the `[]uuid.UUID` array for efficient IN-clause filtering

### 4.4 Frontend Layer: OrgScopeGate (Planned)

**Status:** PENDING (Phase 5)

The planned frontend enforcement includes:
- **`OrgScopeGate`** component: wraps UI sections and conditionally renders based on the user's org scope
- **`useOrgScope`** hook: provides `visibleOrgIds`, `isGlobalScope`, `orgLevel`, and `hasOrgAccess(orgUnitId)` to components
- **API response filtering:** The `/auth/me` endpoint returns `orgUnitId`, `orgLevel`, and `isGlobalScope` for frontend consumption

---

## 5. Key Database Tables

### 5.1 org_units

```sql
CREATE TABLE org_units (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    level           org_level_type NOT NULL,  -- directorate|department|division|office|unit|team|section
    parent_id       UUID REFERENCES org_units(id),
    manager_user_id UUID REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    metadata        JSONB NOT NULL DEFAULT '{}'
);
```

### 5.2 org_hierarchy (Closure Table)

```sql
CREATE TABLE org_hierarchy (
    ancestor_id     UUID NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    descendant_id   UUID NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    depth           INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ancestor_id, descendant_id)
);
```

Auto-populated by trigger `trg_org_units_hierarchy` on INSERT into `org_units`. Updated manually via `MoveOrgUnit` service (delete old paths, insert new paths in transaction).

### 5.3 role_bindings (Scope Anchors)

```sql
CREATE TABLE role_bindings (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id),
    role_id     UUID NOT NULL REFERENCES roles(id),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    scope_type  scope_type NOT NULL DEFAULT 'tenant',  -- global|tenant|directorate|department|division|office|unit|section|team
    scope_id    UUID,                                   -- References the org_unit_id that anchors this scope
    granted_by  UUID REFERENCES users(id),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT true
);
```

### 5.4 users.org_unit_id

```sql
ALTER TABLE users ADD COLUMN org_unit_id UUID REFERENCES org_units(id);
```

Added in migration 044. Backfilled from legacy TEXT fields (`office`, `department`).

### 5.5 Root Entity Tables (org_unit_id FK)

Migration 045 adds `org_unit_id UUID REFERENCES org_units(id)` to:

| Table | Backfill Source |
|---|---|
| tickets | `reporter_id` -> user's org_unit_id |
| portfolios | `owner_id` -> user's org_unit_id |
| policies | `created_by` -> user's org_unit_id |
| okrs | `owner_id` -> user's org_unit_id |
| risks | `owner_id` -> user's org_unit_id |
| meetings | `organizer_id` -> user's org_unit_id |
| assets | `owner_id` -> user's org_unit_id |
| audits | `created_by` -> user's org_unit_id |
| leave_records | `user_id` -> user's org_unit_id |
| checklists | `user_id` -> user's org_unit_id |
| action_items | `owner_id` -> user's org_unit_id |

---

## 6. SQL Function: fn_resolve_visible_org_units

**Location:** Migration 044

**Signature:**
```sql
CREATE OR REPLACE FUNCTION fn_resolve_visible_org_units(
    p_user_id UUID,
    p_tenant_id UUID
) RETURNS TABLE(org_unit_id UUID)
```

**Algorithm:**
1. **Global bypass check:** If user has `global_admin`, `auditor`, `itd_director`, or any binding with `scope_type = 'global'`, return ALL active org_units for the tenant
2. **Scoped resolution:** For each active, non-expired role_binding:
   - Use `COALESCE(rb.scope_id, user.org_unit_id)` as the scope anchor
   - Query `org_hierarchy` for all descendants of the anchor
3. **Self-scope:** Always include the user's own `org_unit_id`
4. **Delegations:** For each active, time-valid delegation, resolve descendants of the delegator's `org_unit_id`
5. **UNION + DISTINCT:** Combine all three sources and deduplicate

**Performance:** The function is marked `STABLE` for query planner optimization. The closure table has indexes on `ancestor_id` (PK) and `descendant_id` (btree index), enabling efficient joins.

---

## 7. Data Flow Diagram

```
                                    Request
                                       |
                                       v
                            +---------------------+
                            |  AuthDualMode MW    |  Validates JWT / OIDC
                            |  -> AuthContext     |  Sets UserID, TenantID, Roles, Permissions
                            +---------------------+
                                       |
                                       v
                            +---------------------+
                            |  SessionTimeout MW  |  Checks session validity
                            +---------------------+
                                       |
                                       v
                            +---------------------+
                            |  RLSTenantContext   |  Extracts tenant_id for RLS GUC
                            +---------------------+
                                       |
                                       v
                            +---------------------+
                            |  OrgScope MW        |  Calls auth.ResolveOrgScope()
                            |  -> Enriches        |  Sets OrgUnitID, OrgLevel,
                            |     AuthContext     |  VisibleOrgIDs, IsGlobalScope
                            +---------------------+
                                       |
                                       v
                            +---------------------+
                            |  AuditMiddleware    |  Logs request to audit_events
                            +---------------------+
                                       |
                                       v
                            +---------------------+
                            |  Handler / Service  |  Uses ScopedQuery or BuildOrgFilter
                            |                     |  to filter queries by org scope
                            +---------------------+
                                       |
                                       v
                            +---------------------+
                            |  PostgreSQL + RLS   |  tenant_isolation policy active
                            |                     |  (org_scope policy: Phase 4)
                            +---------------------+
```

---

## 8. Design Decisions and Rationale

| Decision | Rationale |
|---|---|
| Closure table over recursive CTE | O(1) descendant lookups vs O(depth) recursion. Pre-computed paths are faster for read-heavy access checks. |
| Scope computed per-request, not cached | Ensures delegations and role changes take effect immediately. Caching would require invalidation logic. |
| `org_unit_id IS NULL` = tenant-visible | Backward compatibility during migration. Records created before migration 045 have NULL org_unit_id and remain visible to all tenant users. |
| Fail-open during rollout | Prevents lockouts during incremental adoption. Will switch to fail-closed in Phase 4 when RLS org-scope policies are active. |
| Separate OrgScope middleware (not in JWT) | Org scope depends on live DB state (delegations, role changes). JWT claims are static for the token lifetime. |
| ScopedQuery as library, not middleware | Service methods need flexibility in column naming (`t.org_unit_id` vs `org_unit_id`) and parameter ordering. |

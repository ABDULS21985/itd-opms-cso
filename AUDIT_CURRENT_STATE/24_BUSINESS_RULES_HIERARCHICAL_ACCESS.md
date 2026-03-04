# 24. Business Rules: Hierarchical Scope-Based Access Control

## Audit Metadata

| Field | Value |
|---|---|
| **Date** | 2026-03-04 |
| **Branch** | `dev` |
| **Scope** | Business rules BR-001 through BR-015 governing org-hierarchy-based visibility |
| **Hierarchy** | Directorate > Department > Division > Office > Unit > Team > Section |
| **Key Tables** | `org_units`, `org_hierarchy`, `role_bindings`, `users`, `delegations` |

---

## Business Rules Summary

| Rule | Title | Status |
|---|---|---|
| BR-001 | Directorate Scope | Implemented |
| BR-002 | Department Scope | Implemented |
| BR-003 | Division Scope | Implemented |
| BR-004 | Office Scope | Implemented |
| BR-005 | Downward-Only Inheritance | Implemented |
| BR-006 | No Lateral Visibility | Implemented |
| BR-007 | No Cross-Directorate Access | Implemented |
| BR-008 | Staff Minimum Access | Implemented |
| BR-009 | Record Ownership via org_unit_id | Implemented |
| BR-010 | Server-Side Enforcement | Implemented |
| BR-011 | Reporting/Dashboard Scope | Pending |
| BR-012 | Delegation | Implemented |
| BR-013 | Multi-Role Scope Union | Implemented |
| BR-014 | Auditability | Implemented |
| BR-015 | Default Deny | Implemented |

---

## BR-001: Directorate Scope

**Rule:** A user with a role bound at the directorate level sees all data belonging to any org_unit within that directorate's subtree (all departments, divisions, offices, units, teams, and sections beneath it).

**Database Enforcement:**

```sql
-- role_bindings row:
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id)
VALUES ($user, $role, $tenant, 'directorate', $directorate_org_unit_id);
```

**Scope Resolution (fn_resolve_visible_org_units):**

The function uses the scope_id from role_bindings as the anchor, then traverses org_hierarchy:

```sql
SELECT h.descendant_id AS oid
FROM role_bindings rb
JOIN org_hierarchy h ON h.ancestor_id = COALESCE(rb.scope_id, user.org_unit_id)
WHERE rb.user_id = p_user_id
  AND rb.is_active = true
  AND (rb.expires_at IS NULL OR rb.expires_at > NOW())
```

If `scope_id` points to a directorate-level org_unit, `org_hierarchy` returns all descendants at every depth below it.

**Go Enforcement:**

```go
// auth.ResolveOrgScope() populates VisibleOrgIDs with all descendants
// ScopedQuery uses: WHERE org_unit_id = ANY($visible_ids) OR org_unit_id IS NULL
```

**Enforcement Points:**
- `internal/platform/auth/scope.go` -- `ResolveOrgScope()` queries `fn_resolve_visible_org_units`
- `internal/shared/types/scope_filter.go` -- `ScopedQuery.Where()` adds org filter to queries
- `internal/platform/middleware/orgscope.go` -- enriches AuthContext per request

---

## BR-002: Department Scope

**Rule:** A user with a role bound at the department level sees all data belonging to org_units within that department's subtree (all divisions, offices, units, teams, and sections beneath it).

**Database Enforcement:**

```sql
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id)
VALUES ($user, $role, $tenant, 'department', $department_org_unit_id);
```

**Scope Resolution:**

Identical mechanism to BR-001. The `scope_id` references a department-level org_unit. The closure table returns all descendants at depth >= 0 from that anchor.

**Enforcement Points:** Same as BR-001 -- the scope resolution is level-agnostic. The hierarchy depth determines visibility, not the scope_type label.

---

## BR-003: Division Scope

**Rule:** A user with a role bound at the division level sees all data belonging to org_units within that division's subtree (offices, units, teams, and sections beneath it).

**Database Enforcement:**

```sql
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id)
VALUES ($user, $role, $tenant, 'division', $division_org_unit_id);
```

**Scope Resolution:**

The `head_of_division` role is assigned with `scope_type = 'division'` and `scope_id` pointing to their division's org_unit. Migration 044 auto-assigns this during backfill:

```sql
UPDATE role_bindings rb
SET scope_id = u.org_unit_id
FROM roles r, users u, org_units o
WHERE rb.role_id = r.id
  AND rb.user_id = u.id
  AND u.org_unit_id = o.id
  AND r.name IN ('head_of_division', 'supervisor', 'staff', 'service_desk_agent')
  AND rb.scope_type = 'tenant'
  AND rb.is_active = true
  AND u.org_unit_id IS NOT NULL;
```

**Enforcement Points:** Same closure table traversal as BR-001/BR-002.

---

## BR-004: Office Scope

**Rule:** A user with a role bound at the office level sees all data belonging to org_units within that office's subtree (units, teams, and sections beneath it).

**Database Enforcement:**

```sql
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id)
VALUES ($user, $role, $tenant, 'office', $office_org_unit_id);
```

**Scope Resolution:** Same closure table mechanism. Office-level anchors yield a smaller descendant set than division-level anchors.

**Enforcement Points:** Same as BR-001 through BR-003.

---

## BR-005: Downward-Only Inheritance

**Rule:** Scope inheritance flows exclusively downward through the org hierarchy. A user anchored at Division-A can see Office-A1 and Unit-A1a, but NOT Department-X (parent) or Directorate-Y (grandparent).

**Database Enforcement:**

The closure table stores only downward paths (ancestor -> descendant with depth >= 0). The `fn_org_hierarchy_insert` trigger populates paths on INSERT:

```sql
CREATE OR REPLACE FUNCTION fn_org_hierarchy_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Self-reference (depth 0)
    INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
    VALUES (NEW.id, NEW.id, 0);

    -- Copy ancestor paths from parent
    IF NEW.parent_id IS NOT NULL THEN
        INSERT INTO org_hierarchy (ancestor_id, descendant_id, depth)
        SELECT h.ancestor_id, NEW.id, h.depth + 1
        FROM org_hierarchy h
        WHERE h.descendant_id = NEW.parent_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Scope Resolution:** The query `SELECT descendant_id FROM org_hierarchy WHERE ancestor_id = $anchor` only returns nodes below the anchor. There is no reverse query (descendants looking up to ancestors).

**Go Enforcement:** `ResolveOrgScope()` never queries upward. The VisibleOrgIDs list only ever expands downward from each scope anchor.

---

## BR-006: No Lateral Visibility

**Rule:** Users cannot see data belonging to sibling org_units. A Head of Division-A cannot see Division-B's data, even if both divisions belong to the same department.

**Database Enforcement:**

Each role_binding has a distinct `scope_id` pointing to a single anchor. The closure table query for Division-A only returns Division-A's descendants. Division-B is never included because it is not a descendant of Division-A.

**Scope Resolution:** No sibling resolution exists in `fn_resolve_visible_org_units`. The UNION of scope anchors from role_bindings only includes explicitly granted anchors and their descendants.

**Enforcement Points:**
- `fn_resolve_visible_org_units` -- distinct scope anchors per role_binding
- `ScopedQuery` -- filters by `org_unit_id = ANY($visible_ids)`, which only contains resolved descendants

---

## BR-007: No Cross-Directorate Access

**Rule:** Scoped users cannot access data across directorate boundaries. Each scope is confined to a single branch of the org tree.

**Database Enforcement:**

The closure table structure inherently prevents cross-branch access. If a user's scope_id is within Directorate-A's subtree, the descendant query will never return nodes from Directorate-B's subtree, because they share no ancestor-descendant relationship (beyond the tenant root, which is not used as a scope anchor for scoped users).

**Scope Resolution:** The only way to get cross-directorate access is through:
1. Multiple role_bindings with different scope_ids (BR-013 handles this via union)
2. Active delegations from a user in another branch (BR-012)
3. Global bypass roles (BR-001 global scope)

None of these violate the rule -- they are explicitly granted scopes.

---

## BR-008: Staff Minimum Access

**Rule:** A staff member sees only data belonging to their own org_unit. This is the minimum possible scope.

**Database Enforcement:**

Staff role_bindings have `scope_id = user.org_unit_id`. The closure table query for a leaf node (e.g., a Section) returns only that node itself (depth = 0, self-reference).

**Scope Resolution (fn_resolve_visible_org_units):**

```sql
-- Always include the user's own org unit (self-scope)
SELECT u.org_unit_id AS oid
FROM users u
WHERE u.id = p_user_id
  AND u.org_unit_id IS NOT NULL
```

Even if a staff member has no role_bindings with a scope_id, their own org_unit is always included.

**Go Enforcement:**

```go
// auth/scope.go line 94-97:
if scope.OrgUnitID != uuid.Nil && !seen[scope.OrgUnitID] {
    scope.VisibleOrgIDs = append(scope.VisibleOrgIDs, scope.OrgUnitID)
}
```

---

## BR-009: Record Ownership via org_unit_id

**Rule:** Root business entities are tagged with an `org_unit_id` FK that determines which org scope they belong to. Records inherit visibility from their owning org_unit.

**Database Enforcement (Migration 045):**

The following root entity tables have `org_unit_id UUID REFERENCES org_units(id)`:

| Table | Ownership Source | Module |
|---|---|---|
| `tickets` | `reporter_id` -> user's org_unit | ITSM |
| `portfolios` | `owner_id` -> user's org_unit | Planning |
| `policies` | `created_by` -> user's org_unit | Governance |
| `okrs` | `owner_id` -> user's org_unit | Governance |
| `risks` | `owner_id` -> user's org_unit | GRC |
| `meetings` | `organizer_id` -> user's org_unit | Governance |
| `assets` | `owner_id` -> user's org_unit | CMDB |
| `audits` | `created_by` -> user's org_unit | GRC |
| `leave_records` | `user_id` -> user's org_unit | People |
| `checklists` | `user_id` -> user's org_unit | People |
| `action_items` | `owner_id` -> user's org_unit | Governance |

**Child Entity Inheritance:** Child entities (work_items, ticket_comments, key_results, etc.) inherit scope from their parent via JOINs. They do not have their own `org_unit_id` column.

**NULL org_unit_id:** Records with `org_unit_id IS NULL` are treated as tenant-visible (visible to all users within the tenant). This provides backward compatibility for records created before migration 045.

---

## BR-010: Server-Side Enforcement

**Rule:** All authorization decisions are enforced server-side. The frontend may hide or show UI elements, but the backend is the single source of truth.

**Enforcement Points:**

| Layer | Component | File | Purpose |
|---|---|---|---|
| Middleware | `OrgScope` | `internal/platform/middleware/orgscope.go` | Enriches AuthContext with VisibleOrgIDs per request |
| Service | `ScopedQuery` | `internal/shared/types/scope_filter.go` | Adds `org_unit_id = ANY($visible)` to SQL WHERE clauses |
| Service | `BuildOrgFilter` | `internal/shared/types/scope_filter.go` | Standalone clause builder for existing queries |
| Service | `AuthContext.HasOrgAccess()` | `internal/shared/types/context.go` | Point check for single record access validation |
| Database | RLS `tenant_isolation` | `migrations/042_rls_policies.sql` | Tenant-level row filtering (active) |
| Database | RLS `org_scope` | Planned (Phase 4) | Org-level row filtering (pending) |

**Request Flow:**
1. `AuthDualMode` middleware validates JWT/OIDC and populates `AuthContext`
2. `OrgScope` middleware calls `auth.ResolveOrgScope()` and enriches `AuthContext`
3. Handler extracts `AuthContext` from context
4. Service method uses `ScopedQuery` or `BuildOrgFilter` to apply org scope to queries
5. Database RLS provides an additional layer of enforcement

---

## BR-011: Reporting/Dashboard Scope

**Rule:** Reports and dashboards apply the same org-scope filtering as regular data queries. A Division Head's dashboard shows metrics only for their division's subtree.

**Enforcement Points:**
- `internal/modules/reporting/dashboard_service.go` -- dashboard queries
- `internal/modules/reporting/report_service.go` -- report generation
- `internal/modules/reporting/search_service.go` -- global search

**Status:** PENDING (Phase 3). Dashboard and report services currently filter only by `tenant_id`. The `ScopedQuery` builder is available but not yet integrated into reporting queries.

---

## BR-012: Delegation

**Rule:** A user can temporarily inherit another user's org scope through a delegation. Delegations are time-bound, require approval, and are fully audited.

**Database Enforcement:**

```sql
CREATE TABLE delegations (
    id              UUID PRIMARY KEY,
    delegator_id    UUID NOT NULL REFERENCES users(id),
    delegate_id     UUID NOT NULL REFERENCES users(id),
    role_id         UUID NOT NULL REFERENCES roles(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    reason          TEXT NOT NULL,
    approved_by     UUID REFERENCES users(id),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true
);
```

**Scope Resolution (fn_resolve_visible_org_units):**

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
  AND delegator.org_unit_id IS NOT NULL
```

The delegate temporarily sees all org_units that the delegator's org_unit_id resolves to (downward cascade from delegator's position in the hierarchy).

**Automatic Expiry:** Delegations are time-bound. Once `ends_at` passes, the scope resolution function no longer includes the delegation's org_units. No background job is needed -- the `NOW()` comparison handles expiry at query time.

---

## BR-013: Multi-Role Scope Union

**Rule:** If a user holds multiple roles with different scope anchors, their effective visibility is the UNION of all resolved scopes.

**Scope Resolution (fn_resolve_visible_org_units):**

```sql
SELECT DISTINCT sub.oid FROM (
    -- From direct role bindings (each with its own scope anchor)
    SELECT h.descendant_id AS oid
    FROM role_bindings rb
    JOIN org_hierarchy h ON h.ancestor_id = COALESCE(rb.scope_id, user.org_unit_id)
    WHERE rb.user_id = p_user_id AND rb.is_active = true ...

    UNION

    -- Self-scope (always included)
    SELECT u.org_unit_id AS oid FROM users u WHERE u.id = p_user_id ...

    UNION

    -- Delegations (each with delegator's scope anchor)
    SELECT h.descendant_id AS oid FROM delegations d ...
) sub;
```

The `UNION` and `DISTINCT` ensure that overlapping scopes are deduplicated. If a user has:
- `head_of_division` for Division-A
- `supervisor` for Office-B1 (in a different division)

Their VisibleOrgIDs will include all descendants of Division-A AND all descendants of Office-B1.

**Go Enforcement:**

```go
// auth/scope.go uses a seen map for deduplication:
seen := make(map[uuid.UUID]bool)
for rows.Next() {
    var id uuid.UUID
    rows.Scan(&id)
    if !seen[id] {
        scope.VisibleOrgIDs = append(scope.VisibleOrgIDs, id)
        seen[id] = true
    }
}
```

---

## BR-014: Auditability

**Rule:** All authorization-relevant actions are logged to the `audit_events` table with full actor, entity, and change details.

**Database Enforcement:**

```sql
CREATE TABLE audit_events (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    actor_id        UUID NOT NULL,
    actor_role      TEXT,
    action          TEXT NOT NULL,        -- e.g., "org_unit.created", "delegation.granted"
    entity_type     TEXT NOT NULL,        -- e.g., "org_unit", "role_binding"
    entity_id       UUID,
    changes         JSONB,               -- new state
    previous_state  JSONB,               -- old state
    correlation_id  TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Go Enforcement:**

The `audit.AuditMiddleware` logs every authenticated request. Additionally, service methods explicitly log:
- `org_unit.created`, `org_unit.updated`, `org_unit.moved`, `org_unit.deleted`
- Role binding changes
- Delegation creation/revocation

**Enforcement Points:**
- `internal/platform/audit/middleware.go` -- request-level audit logging
- `internal/platform/audit/handler.go` -- audit query API
- Each service method calls `auditSvc.Log()` for entity-level changes

---

## BR-015: Default Deny

**Rule:** If a user has no resolvable scope (NULL VisibleOrgIDs and empty scope), they see no org-scoped data. The system defaults to denial.

**Database Enforcement:**

RLS policies use `current_setting('app.current_tenant_id', true)` with `missing_ok = true`. If the GUC is not set, it returns NULL, and `tenant_id = NULL` matches no rows (fail-closed).

**Go Enforcement (ScopedQuery):**

```go
// scope_filter.go -- NewScopedQuery:
if orgColumn != "" && !auth.IsGlobalScope {
    visibleIDs := auth.OrgScopeFilter()
    if len(visibleIDs) > 0 {
        // Normal: filter by visible IDs
        sq.orgClause = fmt.Sprintf("(%s = ANY($%d) OR %s IS NULL)", ...)
    } else {
        // DEFAULT DENY: no visible orgs = only NULL org_unit_id records
        sq.orgClause = fmt.Sprintf("%s IS NULL", orgColumn)
    }
}
```

When `VisibleOrgIDs` is empty and `IsGlobalScope` is false:
- `OrgScopeFilter()` returns an empty slice
- `ScopedQuery` generates `org_unit_id IS NULL` (only shows unscoped records)
- `HasOrgAccess(orgUnitID)` returns false for any non-nil orgUnitID

This ensures that a user with no role_bindings, no scope_id, and no delegations sees only tenant-wide unscoped records (backward compatibility) and no org-scoped records.

---

## Enforcement Matrix

| Business Rule | DB (RLS) | DB (fn_resolve) | Middleware (OrgScope) | Service (ScopedQuery) | Frontend (Planned) |
|---|---|---|---|---|---|
| BR-001 Directorate | Phase 4 | Yes | Yes | Yes | Phase 5 |
| BR-002 Department | Phase 4 | Yes | Yes | Yes | Phase 5 |
| BR-003 Division | Phase 4 | Yes | Yes | Yes | Phase 5 |
| BR-004 Office | Phase 4 | Yes | Yes | Yes | Phase 5 |
| BR-005 Downward Only | Phase 4 | Yes | Yes | Yes | N/A |
| BR-006 No Lateral | Phase 4 | Yes | Yes | Yes | N/A |
| BR-007 No Cross-Dir | Phase 4 | Yes | Yes | Yes | N/A |
| BR-008 Staff Minimum | Phase 4 | Yes | Yes | Yes | Phase 5 |
| BR-009 Record Ownership | Mig 045 | N/A | N/A | Yes | N/A |
| BR-010 Server-Side | Yes | Yes | Yes | Yes | N/A |
| BR-011 Reporting | Phase 4 | N/A | N/A | Pending | Phase 5 |
| BR-012 Delegation | Phase 4 | Yes | Yes | Yes | Phase 5 |
| BR-013 Multi-Role | Phase 4 | Yes | Yes | Yes | N/A |
| BR-014 Auditability | Yes | N/A | Yes | Yes | N/A |
| BR-015 Default Deny | Yes | Yes | Yes | Yes | Phase 5 |

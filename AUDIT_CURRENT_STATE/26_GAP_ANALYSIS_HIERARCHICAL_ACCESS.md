# 26. Gap Analysis: Hierarchical Scope-Based Access Control

## Audit Metadata

| Field | Value |
|---|---|
| **Date** | 2026-03-04 |
| **Branch** | `dev` |
| **Scope** | Current state vs expected behavior for org-hierarchy-based authorization |
| **Methodology** | Code review of migrations 001-045, Go source files, and middleware chain |

---

## Severity Legend

| Severity | Definition |
|---|---|
| **CRITICAL** | Authorization bypass; data visible to unauthorized users |
| **HIGH** | Missing enforcement layer; partial data leakage risk |
| **MEDIUM** | Enforcement exists but incomplete; functional gap |
| **LOW** | Cosmetic or minor inconsistency; no data leakage risk |

## Remediation Status Legend

| Status | Definition |
|---|---|
| **FIXED** | Code implemented and merged on `dev` branch |
| **IN PROGRESS** | Implementation started but not complete |
| **PENDING** | Not yet started; scheduled for a future phase |

---

## Gap Analysis Table

| # | Area | Current Behavior | Expected Behavior | Severity | Status | Phase | Key File(s) |
|---|---|---|---|---|---|---|---|
| 1 | **User-Org binding** | Users were linked to org units via TEXT fields (`department`, `office`, `unit`) with no FK relationship. Joins were fragile and name-based. | Users linked to `org_units` via `org_unit_id UUID REFERENCES org_units(id)` FK. Backfilled from TEXT fields. | CRITICAL | **FIXED** | 1 | `migrations/044_user_org_binding.sql`, `users.org_unit_id` column |
| 2 | **role_bindings scope resolution** | `role_bindings.scope_type` and `scope_id` columns existed but were ignored during authorization. All users had tenant-wide access regardless of scope assignment. | `fn_resolve_visible_org_units()` uses `scope_type`/`scope_id` to compute visible org_unit_ids via the closure table. Scoped roles see only their subtree. | CRITICAL | **FIXED** | 1 | `migrations/044_user_org_binding.sql` (SQL function), `internal/platform/auth/scope.go` |
| 3 | **AuthContext org scope fields** | `AuthContext` contained only `UserID`, `TenantID`, `Email`, `Roles`, `Permissions`. No org-scope awareness. | `AuthContext` extended with `OrgUnitID`, `OrgLevel`, `VisibleOrgIDs`, `IsGlobalScope`. Helper methods `HasOrgAccess()` and `OrgScopeFilter()` added. | CRITICAL | **FIXED** | 1 | `internal/shared/types/context.go` |
| 4 | **OrgScope middleware** | No middleware to resolve org scope per request. All handlers operated with tenant-only context. | `OrgScope` middleware calls `auth.ResolveOrgScope()`, enriches `AuthContext`, and re-sets on request context. Positioned after `AuthDualMode` in the middleware chain. | CRITICAL | **FIXED** | 1 | `internal/platform/middleware/orgscope.go` |
| 5 | **Service query org filtering** | All service layer queries filter only by `tenant_id = $1`. No org-scope WHERE clause applied. Users see all records within their tenant. | Service queries use `ScopedQuery` or `BuildOrgFilter` to add `AND (org_unit_id = ANY($N) OR org_unit_id IS NULL)` to all list/search queries. | HIGH | **IN PROGRESS** | 2-3 | `internal/shared/types/scope_filter.go` (utility ready; adoption in progress) |
| 6 | **Projects: division_id filter** | `projects` table has `division_id` column (migration 022) but list queries do not filter by it. All users see all projects in their tenant. | List project queries should use `ScopedQuery` with `org_unit_id` or `division_id` to filter by the requesting user's org scope. | HIGH | **PENDING** | 2 | `internal/modules/planning/portfolio_service.go`, `migrations/022_add_division_to_projects.sql` |
| 7 | **Tickets: org_unit_id column** | `tickets` table had no `org_unit_id` column. Tickets were visible to all tenant users regardless of org membership. | `org_unit_id UUID REFERENCES org_units(id)` added. Backfilled from `reporter_id` -> user's org_unit_id. Indexed. | HIGH | **FIXED** | 1 | `migrations/045_org_unit_id_root_entities.sql` |
| 8 | **Policies/OKRs/meetings/risks: org_unit_id** | `policies`, `okrs`, `meetings`, `risks` tables had no `org_unit_id` column. All records tenant-visible. | `org_unit_id` FK added to all four tables. Backfilled from creator/owner's org_unit. Indexed. | HIGH | **FIXED** | 1 | `migrations/045_org_unit_id_root_entities.sql` |
| 9 | **Assets/audits: org_unit_id** | `assets` and `audits` tables had no `org_unit_id` column. All asset and audit records tenant-visible. | `org_unit_id` FK added. Assets backfilled from `owner_id`; audits from `created_by`. NULL org_unit_id treated as tenant-visible (cross-cutting resources). | MEDIUM | **FIXED** | 1 | `migrations/045_org_unit_id_root_entities.sql` |
| 10 | **Frontend: org scope gate** | Frontend has no concept of org scope. All data returned by API is rendered regardless of the user's org membership. No UI gating. | `OrgScopeGate` component conditionally renders based on `hasOrgAccess(orgUnitId)`. `useOrgScope` hook provides scope state to components. Server-side remains the enforcement authority. | MEDIUM | **PENDING** | 5 | Planned: `frontend/src/components/guards/OrgScopeGate.tsx`, `frontend/src/hooks/useOrgScope.ts` |
| 11 | **Dashboard/reports: org scope filtering** | Dashboard and report services query by `tenant_id` only. Aggregations include data from all org_units. A supervisor's dashboard shows department-wide metrics. | Dashboard and report queries use `ScopedQuery` to filter aggregations by the user's `VisibleOrgIDs`. Division heads see division-only metrics. | HIGH | **PENDING** | 3 | `internal/modules/reporting/dashboard_service.go`, `internal/modules/reporting/report_service.go` |
| 12 | **Global search: org scope filtering** | Search service queries all records within tenant. No org-scope filter applied. Users can find records outside their scope via search. | Search service uses `BuildOrgFilter` to add org scope to search queries. Results are filtered by `VisibleOrgIDs`. | HIGH | **PENDING** | 3 | `internal/modules/reporting/search_service.go` |
| 13 | **RLS: org-scope policies** | RLS policies enforce `tenant_id` isolation only (`tenant_isolation` policy). No org-scope row filtering at the database level. | RESTRICTIVE org-scope RLS policies added using `app.visible_org_unit_ids` GUC variable. Both tenant and org policies must pass for row access. | MEDIUM | **PENDING** | 4 | Planned: future migration for org-scope RLS policies |
| 14 | **Delegation: scope inheritance** | `delegations` table existed but was not used in scope resolution. Delegates had no expanded visibility. | `fn_resolve_visible_org_units` includes active delegations in scope computation. Delegate inherits delegator's org_unit descendants for the delegation duration. | MEDIUM | **FIXED** | 1 | `migrations/044_user_org_binding.sql` (SQL function, delegation UNION block) |
| 15 | **UserProfile/GetMe: org scope info** | `/auth/me` endpoint returned only basic user info (id, email, roles, permissions). No org scope metadata. | `/auth/me` returns `orgUnitId`, `orgLevel`, `isGlobalScope` from the enriched `AuthContext`. Frontend can use these for UI decisions. | LOW | **FIXED** | 1 | `internal/shared/types/context.go` (AuthContext JSON tags) |

---

## Detailed Remediation Notes

### Gap 1: User-Org Binding (FIXED)

**Migration 044** adds `org_unit_id UUID REFERENCES org_units(id)` to the `users` table and backfills it using a three-pass strategy:
1. Match by `users.office` = `org_units.name` (most specific)
2. Match by `users.department` = `org_units.code`
3. Match by `users.department` = `org_units.name`

Users that cannot be matched retain `org_unit_id = NULL` and are treated as tenant-scoped until manually resolved.

### Gap 2: Scope Resolution Function (FIXED)

**Migration 044** creates `fn_resolve_visible_org_units(p_user_id, p_tenant_id)` which:
- Checks for global bypass roles first
- Resolves descendants from each role_binding's scope anchor via closure table
- Includes self-scope and active delegations
- Returns DISTINCT set of org_unit_ids

### Gap 5: Service Query Adoption (IN PROGRESS)

The `ScopedQuery` and `BuildOrgFilter` utilities are implemented in `internal/shared/types/scope_filter.go`. Adoption across service layers is staged:

| Module | Service File | Status |
|---|---|---|
| Governance | `okr_service.go`, `policy_service.go`, `meeting_service.go`, `raci_service.go` | Adoption started |
| Planning | `portfolio_service.go`, `workitem_service.go`, `budget_service.go` | Pending |
| ITSM | `ticket_service.go`, `queue_service.go` | Pending |
| CMDB | `asset_service.go`, `cmdb_service.go` | Pending |
| People | `skill_service.go`, `checklist_service.go`, `roster_service.go` | Pending |
| Knowledge | `article_service.go`, `announcement_service.go` | Pending |
| GRC | `risk_service.go`, `grc_audit_service.go`, `compliance_service.go` | Pending |
| Reporting | `dashboard_service.go`, `report_service.go`, `search_service.go` | Pending |

### Gap 6: Projects Division Filter (PENDING)

The `projects` table has a `division_id UUID` column (migration 022) that stores which division owns the project. However, list queries in `portfolio_service.go` do not filter by this column. The fix requires:
1. Add `org_unit_id` to the `projects` table (or use existing `division_id`)
2. Update `ListProjects` to use `ScopedQuery` with the org column
3. Update `ListPortfolios` similarly

### Gap 10: Frontend Org Scope Gate (PENDING)

The frontend currently has no org-scope awareness. Implementation requires:
1. Parse `orgUnitId`, `orgLevel`, `isGlobalScope` from `/auth/me` response
2. Store in auth context provider
3. Create `OrgScopeGate` component for conditional rendering
4. Create `useOrgScope` hook for programmatic access
5. Wrap sensitive UI elements (edit/delete buttons, admin panels) with `OrgScopeGate`

### Gap 13: Org-Scope RLS Policies (PENDING)

Phase 4 will add RESTRICTIVE RLS policies that AND with existing tenant_isolation policies:
1. Create new migration with `AS RESTRICTIVE` policies on all root entity tables
2. Modify the `RLSTenantContext` middleware (or create a new middleware) to set `app.visible_org_unit_ids` and `app.org_scope_bypass` GUC variables per connection
3. Test with comprehensive scenarios to ensure no data leakage

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Service queries not adopting ScopedQuery | High (many files) | HIGH -- data visible beyond scope | Systematic module-by-module adoption; track in table above |
| Backfill leaves NULL org_unit_id records | Medium | LOW -- NULLs treated as tenant-visible | Acceptable during rollout; admin tool to assign missing org_units |
| OrgScope middleware fail-open | Low (DB is stable) | MEDIUM -- temporary tenant-wide access | Monitoring/alerting on scope resolution failures; switch to fail-closed in Phase 4 |
| Frontend shows data before API filters | Medium | LOW -- cosmetic only; API is source of truth | API always filters; frontend gating is for UX, not security |
| Stale closure table after MoveOrgUnit | Low (rare operation) | HIGH -- wrong scope resolution | MoveOrgUnit rebuilds closure table in a transaction |

---

## Phase Mapping

| Phase | Gaps Addressed | Target |
|---|---|---|
| **Phase 1** (Complete) | #1, #2, #3, #4, #7, #8, #9, #14, #15 | Foundation: schema, middleware, scope resolution |
| **Phase 2** (In Progress) | #5, #6 | Service layer adoption of ScopedQuery |
| **Phase 3** (Pending) | #11, #12 | Reporting, dashboards, and global search |
| **Phase 4** (Pending) | #13 | RLS org-scope policies |
| **Phase 5** (Pending) | #10 | Frontend org scope gate and hook |

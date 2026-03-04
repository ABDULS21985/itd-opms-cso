# 27. Test Plan: Hierarchical Scope-Based Access Control

## Audit Metadata

| Field | Value |
|---|---|
| **Date** | 2026-03-04 |
| **Branch** | `dev` |
| **Scope** | Test strategy for org-hierarchy-based authorization across all enforcement layers |
| **Test Framework** | Go standard `testing` package + `testutil` helpers |
| **Key Test Files** | `internal/shared/types/context_test.go`, `internal/platform/middleware/middleware_test.go` |

---

## Test Categories Overview

| Category | Count | Priority | Status |
|---|---|---|---|
| Unit Tests: Scope Resolution | 12 | P0 | Ready |
| Unit Tests: AuthContext Helpers | 8 | P0 | Ready |
| Unit Tests: ScopedQuery Builder | 10 | P0 | Ready |
| Integration Tests: OrgScope Middleware | 6 | P0 | Ready |
| Integration Tests: Service Layer | 14 | P1 | Phase 2-3 |
| Authorization Scenario Tests | 10 | P0 | Ready |
| Negative/Boundary Tests | 8 | P0 | Ready |
| UI Visibility Tests | 6 | P2 | Phase 5 |
| Regression Tests | 6 | P0 | Ready |
| Delegation Tests | 8 | P1 | Ready |

---

## 1. Unit Tests: Scope Resolution Function

**File:** `internal/platform/auth/scope_test.go`

These tests validate the `fn_resolve_visible_org_units` SQL function and its Go wrapper `auth.ResolveOrgScope()`.

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| SR-001 | `TestResolveOrgScope_GlobalAdmin` | User with `global_admin` role and `scope_type = 'global'` | `IsGlobalScope = true`, `VisibleOrgIDs` empty (bypass) |
| SR-002 | `TestResolveOrgScope_ITDDirector` | User with `itd_director` role | `IsGlobalScope = true` |
| SR-003 | `TestResolveOrgScope_Auditor` | User with `auditor` role | `IsGlobalScope = true` |
| SR-004 | `TestResolveOrgScope_DivisionHead` | User with `head_of_division` role, `scope_id` = Division-A org_unit | `VisibleOrgIDs` contains Division-A + all descendants (offices, units beneath) |
| SR-005 | `TestResolveOrgScope_Supervisor` | User with `supervisor` role, `scope_id` = Office-A1 org_unit | `VisibleOrgIDs` contains Office-A1 + descendants (units, teams) |
| SR-006 | `TestResolveOrgScope_Staff` | User with `staff` role, `scope_id` = user's own org_unit | `VisibleOrgIDs` contains only user's own org_unit |
| SR-007 | `TestResolveOrgScope_NoOrgUnit` | User with `org_unit_id = NULL` | `VisibleOrgIDs` empty; `OrgUnitID = uuid.Nil` |
| SR-008 | `TestResolveOrgScope_ExpiredBinding` | User with role_binding where `expires_at < NOW()` | Expired binding excluded from scope resolution |
| SR-009 | `TestResolveOrgScope_InactiveBinding` | User with role_binding where `is_active = false` | Inactive binding excluded from scope resolution |
| SR-010 | `TestResolveOrgScope_MultipleBindings` | User with two role_bindings: Division-A + Office-B1 | `VisibleOrgIDs` = union of Division-A descendants + Office-B1 descendants |
| SR-011 | `TestResolveOrgScope_DeepHierarchy` | User anchored at Directorate level with 5 levels of descendants | All descendants at all depths returned |
| SR-012 | `TestResolveOrgScope_SelfScopeGuarantee` | User with no scope_id on role_binding but has `org_unit_id` | `VisibleOrgIDs` includes user's own org_unit via self-scope |

### Test Data Setup

```go
// Org hierarchy for testing:
//
// ITD-Directorate
//   +-- Dept-A
//   |     +-- Division-A
//   |     |     +-- Office-A1
//   |     |     |     +-- Unit-A1a
//   |     |     |     +-- Unit-A1b
//   |     |     +-- Office-A2
//   |     +-- Division-B
//   |           +-- Office-B1
//   +-- Dept-B
//         +-- Division-C
//               +-- Office-C1

func setupTestOrgHierarchy(t *testing.T, pool *pgxpool.Pool) TestOrgData {
    // Insert org_units (trigger auto-populates org_hierarchy)
    // Insert test users with org_unit_id assignments
    // Insert role_bindings with scope_type and scope_id
}
```

---

## 2. Unit Tests: AuthContext Helpers

**File:** `internal/shared/types/context_test.go`

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| AC-001 | `TestHasOrgAccess_GlobalScope` | `IsGlobalScope = true`, any orgUnitID | Returns `true` |
| AC-002 | `TestHasOrgAccess_NilOrgUnit` | `orgUnitID = uuid.Nil` | Returns `true` (tenant-visible) |
| AC-003 | `TestHasOrgAccess_InVisibleList` | `orgUnitID` present in `VisibleOrgIDs` | Returns `true` |
| AC-004 | `TestHasOrgAccess_NotInVisibleList` | `orgUnitID` NOT in `VisibleOrgIDs` | Returns `false` |
| AC-005 | `TestHasOrgAccess_EmptyVisibleList` | `VisibleOrgIDs` empty, non-nil orgUnitID | Returns `false` |
| AC-006 | `TestOrgScopeFilter_GlobalScope` | `IsGlobalScope = true` | Returns `nil` (no filter needed) |
| AC-007 | `TestOrgScopeFilter_ScopedUser` | `IsGlobalScope = false`, has `VisibleOrgIDs` | Returns `VisibleOrgIDs` slice |
| AC-008 | `TestOrgScopeFilter_EmptyScope` | `IsGlobalScope = false`, empty `VisibleOrgIDs` | Returns empty slice |

### Sample Test Implementation

```go
func TestHasOrgAccess_NotInVisibleList(t *testing.T) {
    auth := &types.AuthContext{
        IsGlobalScope: false,
        VisibleOrgIDs: []uuid.UUID{
            uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001"),
            uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000002"),
        },
    }

    outsideOrgID := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000099")
    if auth.HasOrgAccess(outsideOrgID) {
        t.Error("expected HasOrgAccess to return false for org unit outside visible list")
    }
}
```

---

## 3. Unit Tests: ScopedQuery Builder

**File:** `internal/shared/types/scope_filter_test.go`

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| SQ-001 | `TestScopedQuery_GlobalScope` | Global user, org column specified | `Where()` = `"tenant_id = $1"` (no org clause) |
| SQ-002 | `TestScopedQuery_ScopedUser` | Non-global user with VisibleOrgIDs | `Where()` = `"tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"` |
| SQ-003 | `TestScopedQuery_EmptyScope` | Non-global user, empty VisibleOrgIDs | `Where()` = `"tenant_id = $1 AND org_unit_id IS NULL"` |
| SQ-004 | `TestScopedQuery_NoOrgColumn` | Empty orgColumn parameter | `Where()` = `"tenant_id = $1"` (skip org filter) |
| SQ-005 | `TestScopedQuery_AddParam` | Add custom parameters after scope | Parameter indices increment correctly ($3, $4, etc.) |
| SQ-006 | `TestScopedQuery_Args` | Verify Args() returns all accumulated params | TenantID at [0], VisibleOrgIDs at [1], custom params at [2+] |
| SQ-007 | `TestBuildOrgFilter_GlobalScope` | Global user | Returns `("", nil)` |
| SQ-008 | `TestBuildOrgFilter_ScopedUser` | Non-global user with VisibleOrgIDs | Returns `("(col = ANY($N) OR col IS NULL)", visibleIDs)` |
| SQ-009 | `TestBuildOrgFilter_EmptyScope` | Non-global, empty scope | Returns `("col IS NULL", nil)` |
| SQ-010 | `TestBuildOrgFilter_CustomColumn` | Column expression like `"t.org_unit_id"` | Column expression used verbatim in clause |

### Sample Test Implementation

```go
func TestScopedQuery_ScopedUser(t *testing.T) {
    auth := &types.AuthContext{
        TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
        IsGlobalScope: false,
        VisibleOrgIDs: []uuid.UUID{
            uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001"),
            uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000002"),
        },
    }

    sq := types.NewScopedQuery(auth, "org_unit_id")
    where := sq.Where()

    expected := "tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"
    if where != expected {
        t.Errorf("expected Where() = %q, got %q", expected, where)
    }

    args := sq.Args()
    if len(args) != 2 {
        t.Fatalf("expected 2 args, got %d", len(args))
    }
    if args[0] != auth.TenantID {
        t.Error("first arg should be TenantID")
    }
}
```

---

## 4. Integration Tests: OrgScope Middleware

**File:** `internal/platform/middleware/orgscope_test.go`

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| MW-001 | `TestOrgScopeMiddleware_EnrichesAuthContext` | Authenticated user with org_unit_id and role_bindings | AuthContext in downstream handler contains populated `OrgUnitID`, `OrgLevel`, `VisibleOrgIDs` |
| MW-002 | `TestOrgScopeMiddleware_GlobalBypass` | User with `global_admin` role | `authCtx.IsGlobalScope = true` in downstream handler |
| MW-003 | `TestOrgScopeMiddleware_NoAuthContext` | Request without authentication (no AuthContext) | Middleware passes through; no enrichment; no error |
| MW-004 | `TestOrgScopeMiddleware_FailOpen` | Database unavailable during scope resolution | Warning logged; request continues with unenriched AuthContext (tenant-only) |
| MW-005 | `TestOrgScopeMiddleware_NullOrgUnit` | User with `org_unit_id = NULL` | `OrgUnitID = uuid.Nil`, `VisibleOrgIDs` may be empty or contain only delegation scopes |
| MW-006 | `TestOrgScopeMiddleware_ChainOrder` | Verify middleware runs after AuthDualMode | OrgScope finds existing AuthContext set by auth middleware |

### Test Setup

```go
func TestOrgScopeMiddleware_EnrichesAuthContext(t *testing.T) {
    pool := testutil.SetupTestDB(t)
    orgData := setupTestOrgHierarchy(t, pool)

    // Create test user with known org_unit_id and role_binding
    // ...

    handler := middleware.OrgScope(pool)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        authCtx := types.GetAuthContext(r.Context())
        if authCtx == nil {
            t.Fatal("expected AuthContext to be present")
        }
        if authCtx.OrgUnitID == uuid.Nil {
            t.Error("expected OrgUnitID to be populated")
        }
        if len(authCtx.VisibleOrgIDs) == 0 {
            t.Error("expected VisibleOrgIDs to be non-empty")
        }
        w.WriteHeader(http.StatusOK)
    }))

    req := httptest.NewRequest("GET", "/test", nil)
    preAuth := &types.AuthContext{
        UserID:   orgData.DivisionHeadUserID,
        TenantID: orgData.TenantID,
    }
    req = req.WithContext(types.SetAuthContext(req.Context(), preAuth))

    rr := httptest.NewRecorder()
    handler.ServeHTTP(rr, req)

    if rr.Code != http.StatusOK {
        t.Errorf("expected 200, got %d", rr.Code)
    }
}
```

---

## 5. Integration Tests: Service Layer Scoped Queries

**File:** Per-module test files (e.g., `internal/modules/itsm/ticket_service_test.go`)

### Test Cases

| ID | Test Name | Module | Description | Expected Result |
|---|---|---|---|---|
| SL-001 | `TestListTickets_DivisionScope` | ITSM | Division head lists tickets | Only tickets with `org_unit_id` in their division's subtree returned |
| SL-002 | `TestListTickets_StaffScope` | ITSM | Staff member lists tickets | Only tickets in their own org_unit (or NULL org_unit_id) returned |
| SL-003 | `TestListTickets_GlobalScope` | ITSM | Global admin lists tickets | All tenant tickets returned |
| SL-004 | `TestListPolicies_DivisionScope` | Governance | Division head lists policies | Only policies within division scope |
| SL-005 | `TestListOKRs_OfficeScope` | Governance | Office supervisor lists OKRs | Only OKRs within office subtree |
| SL-006 | `TestListRisks_DivisionScope` | GRC | Division head lists risks | Only risks within division scope |
| SL-007 | `TestListAssets_NullOrgUnit` | CMDB | List assets with some having NULL `org_unit_id` | NULL org_unit records visible to all scoped users |
| SL-008 | `TestListMeetings_ScopedUser` | Governance | Supervisor lists meetings | Only meetings within their org scope |
| SL-009 | `TestListPortfolios_ScopedUser` | Planning | Division head lists portfolios | Only portfolios within division scope |
| SL-010 | `TestGetTicketByID_OutOfScope` | ITSM | Staff requests ticket outside their org scope | Returns 404 or 403 |
| SL-011 | `TestGetPolicyByID_InScope` | Governance | Division head requests policy within scope | Returns policy data |
| SL-012 | `TestListLeaveRecords_SupervisorScope` | People | Supervisor lists leave records | Only leave records for users in their org subtree |
| SL-013 | `TestListChecklists_ScopedUser` | People | Division head lists checklists | Only checklists within division scope |
| SL-014 | `TestListActionItems_ScopedUser` | Governance | Supervisor lists action items | Only action items within their org scope |

---

## 6. Authorization Scenario Tests

**File:** `internal/platform/auth/authorization_test.go`

End-to-end scenarios testing the complete authorization chain.

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| AZ-001 | `TestDivisionHead_SeesOwnDivision` | Division-A head queries tickets | Returns tickets from Division-A, Office-A1, Office-A2, Unit-A1a, Unit-A1b |
| AZ-002 | `TestDivisionHead_CannotSeeSiblingDivision` | Division-A head queries Division-B tickets | Returns 0 tickets (Division-B records excluded) |
| AZ-003 | `TestOfficeHead_SeesOwnOffice` | Office-A1 head queries tickets | Returns tickets from Office-A1, Unit-A1a, Unit-A1b only |
| AZ-004 | `TestOfficeHead_CannotSeeParentDivision` | Office-A1 head queries Division-A-level records | Division-A-level records NOT returned (no upward visibility) |
| AZ-005 | `TestStaff_SeesOwnOrgUnitOnly` | Staff in Unit-A1a queries tickets | Returns only Unit-A1a tickets + NULL org_unit records |
| AZ-006 | `TestGlobalAdmin_SeesEverything` | Global admin queries tickets | All tenant tickets returned regardless of org_unit |
| AZ-007 | `TestAuditor_SeesEverything` | Auditor queries risks | All tenant risks returned (global scope) |
| AZ-008 | `TestStaff_CannotCrossBranch` | Staff in Dept-A queries Dept-B records | Returns 0 records from Dept-B |
| AZ-009 | `TestNoRoleBindings_DefaultDeny` | User with no active role_bindings and no org_unit_id | Returns only NULL org_unit records (default deny) |
| AZ-010 | `TestMultiRole_UnionScope` | User with Division-A + Office-C1 bindings | Returns records from both Division-A subtree AND Office-C1 subtree |

### Sample Test Implementation

```go
func TestDivisionHead_CannotSeeSiblingDivision(t *testing.T) {
    pool := testutil.SetupTestDB(t)
    orgData := setupTestOrgHierarchy(t, pool)

    // Create tickets: 3 in Division-A, 2 in Division-B
    createTestTickets(t, pool, orgData)

    // Resolve scope for Division-A head
    scope, err := auth.ResolveOrgScope(ctx, pool, orgData.DivisionAHeadID, orgData.TenantID)
    require.NoError(t, err)

    // Verify Division-B org_units are NOT in VisibleOrgIDs
    for _, id := range scope.VisibleOrgIDs {
        if id == orgData.DivisionBID || id == orgData.OfficeB1ID {
            t.Errorf("Division-A head should not see Division-B org units, but found %s", id)
        }
    }
}
```

---

## 7. Negative / Boundary Tests

**File:** `internal/platform/auth/scope_negative_test.go`

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| NEG-001 | `TestCrossBranch_AccessDenied` | User in Division-A requests record in Division-B by ID | `HasOrgAccess()` returns `false` |
| NEG-002 | `TestCrossDirectorate_AccessDenied` | User in Directorate-1 requests Directorate-2 record | `HasOrgAccess()` returns `false` |
| NEG-003 | `TestExpiredDelegation_NoExpansion` | Delegation with `ends_at` in the past | Delegator's scope NOT included in VisibleOrgIDs |
| NEG-004 | `TestFutureDelegation_NotYetActive` | Delegation with `starts_at` in the future | Delegator's scope NOT included until start time |
| NEG-005 | `TestInactiveRoleBinding_Excluded` | Role binding with `is_active = false` | Binding ignored in scope resolution |
| NEG-006 | `TestInactiveOrgUnit_Excluded` | Org unit with `is_active = false` | Inactive org unit NOT returned by global scope query |
| NEG-007 | `TestNullScopeID_FallsBackToOrgUnit` | Role binding with `scope_id = NULL` | Uses `COALESCE(scope_id, user.org_unit_id)` -- falls back to user's org_unit |
| NEG-008 | `TestNoOrgUnit_NoScopeID_DefaultDeny` | User with `org_unit_id = NULL` and role_binding with `scope_id = NULL` | `VisibleOrgIDs` empty; only NULL org_unit records visible |

---

## 8. UI Visibility Tests (Phase 5)

**File:** Planned frontend test files

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| UI-001 | `OrgScopeGate_HidesUnauthorized` | Render `OrgScopeGate` with orgUnitId outside user's scope | Children not rendered; fallback shown |
| UI-002 | `OrgScopeGate_ShowsAuthorized` | Render `OrgScopeGate` with orgUnitId in user's scope | Children rendered normally |
| UI-003 | `OrgScopeGate_NullOrgUnit` | Render `OrgScopeGate` with `orgUnitId = null` | Children rendered (null = tenant-visible) |
| UI-004 | `useOrgScope_ReturnsCorrectScope` | Call `useOrgScope()` for division head | Returns `orgLevel: "division"`, `isGlobalScope: false` |
| UI-005 | `useOrgScope_GlobalAdmin` | Call `useOrgScope()` for global admin | Returns `isGlobalScope: true` |
| UI-006 | `useOrgScope_HasOrgAccess` | Call `hasOrgAccess()` with various orgUnitIds | Correct boolean for each |

---

## 9. Regression Tests

**File:** `internal/platform/auth/regression_test.go`

These tests ensure that the hierarchical scope implementation does not break existing tenant isolation or other functionality.

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| REG-001 | `TestTenantIsolation_StillWorks` | User in Tenant-A queries data | Only Tenant-A data returned (RLS tenant_isolation policy active) |
| REG-002 | `TestCrossTenant_Blocked` | User in Tenant-A attempts to access Tenant-B record | Access denied by RLS |
| REG-003 | `TestNullOrgUnit_RecordsVisible` | Records with `org_unit_id = NULL` queried by scoped user | NULL records returned (backward compatibility) |
| REG-004 | `TestNullOrgUnit_RecordsVisible_Global` | Records with `org_unit_id = NULL` queried by global user | NULL records returned |
| REG-005 | `TestRLS_TenantGUC_NotSet` | Query without `app.current_tenant_id` GUC | Returns 0 rows (fail-closed by RLS) |
| REG-006 | `TestPermission_StillEnforced` | User without `governance.write` tries to create policy | 403 Forbidden (RBAC still works alongside org scope) |

---

## 10. Delegation Tests

**File:** `internal/platform/auth/delegation_test.go`

### Test Cases

| ID | Test Name | Description | Expected Result |
|---|---|---|---|
| DEL-001 | `TestDelegation_ExpandsScope` | Staff receives delegation from Division Head | Staff's `VisibleOrgIDs` includes Division Head's subtree |
| DEL-002 | `TestDelegation_TimeBound_Active` | Delegation with `starts_at <= NOW() <= ends_at` | Delegation scope included |
| DEL-003 | `TestDelegation_TimeBound_Expired` | Delegation with `ends_at < NOW()` | Delegation scope NOT included |
| DEL-004 | `TestDelegation_TimeBound_Future` | Delegation with `starts_at > NOW()` | Delegation scope NOT included |
| DEL-005 | `TestDelegation_Inactive` | Delegation with `is_active = false` | Delegation scope NOT included |
| DEL-006 | `TestDelegation_UnionWithOwnScope` | Staff with own scope + delegation | `VisibleOrgIDs` = union of own scope + delegation scope |
| DEL-007 | `TestDelegation_MultipleDelegations` | User receives delegations from two different delegators | `VisibleOrgIDs` = union of both delegators' scopes + own scope |
| DEL-008 | `TestDelegation_DelegatorNoOrgUnit` | Delegator has `org_unit_id = NULL` | Delegation has no effect (NULL anchor ignored) |

### Sample Test Implementation

```go
func TestDelegation_ExpandsScope(t *testing.T) {
    pool := testutil.SetupTestDB(t)
    orgData := setupTestOrgHierarchy(t, pool)

    // Staff is in Unit-A1a (leaf node)
    // Division Head is in Division-A (owns Division-A subtree)
    // Create active delegation: Division Head -> Staff

    _, err := pool.Exec(ctx, `
        INSERT INTO delegations (delegator_id, delegate_id, role_id, tenant_id, reason, starts_at, ends_at, is_active)
        VALUES ($1, $2, $3, $4, 'vacation coverage', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', true)`,
        orgData.DivisionAHeadID, orgData.StaffA1aID, orgData.DivisionHeadRoleID, orgData.TenantID,
    )
    require.NoError(t, err)

    scope, err := auth.ResolveOrgScope(ctx, pool, orgData.StaffA1aID, orgData.TenantID)
    require.NoError(t, err)

    // Staff should now see Division-A + all descendants
    assert.Contains(t, scope.VisibleOrgIDs, orgData.DivisionAID)
    assert.Contains(t, scope.VisibleOrgIDs, orgData.OfficeA1ID)
    assert.Contains(t, scope.VisibleOrgIDs, orgData.OfficeA2ID)
    assert.Contains(t, scope.VisibleOrgIDs, orgData.UnitA1aID)
    assert.Contains(t, scope.VisibleOrgIDs, orgData.UnitA1bID)
}
```

---

## Test Data Requirements

### Org Hierarchy Fixture

```
ITD Tenant (00000000-0000-0000-0000-000000000001)
  |
  +-- [directorate] ITD-Directorate
        |
        +-- [department] Dept-A
        |     |
        |     +-- [division] Division-A
        |     |     |
        |     |     +-- [office] Office-A1
        |     |     |     +-- [unit] Unit-A1a
        |     |     |     +-- [unit] Unit-A1b
        |     |     |
        |     |     +-- [office] Office-A2
        |     |
        |     +-- [division] Division-B
        |           +-- [office] Office-B1
        |
        +-- [department] Dept-B
              +-- [division] Division-C
                    +-- [office] Office-C1
```

### Test Users

| User | Org Unit | Role | Scope |
|---|---|---|---|
| admin@test | N/A | global_admin | global |
| director@test | ITD-Directorate | itd_director | global |
| auditor@test | N/A | auditor | global |
| div-a-head@test | Division-A | head_of_division | division (Division-A) |
| div-b-head@test | Division-B | head_of_division | division (Division-B) |
| sup-a1@test | Office-A1 | supervisor | office (Office-A1) |
| staff-a1a@test | Unit-A1a | staff | unit (Unit-A1a) |
| staff-b1@test | Office-B1 | staff | office (Office-B1) |
| agent@test | Office-A1 | service_desk_agent | office (Office-A1) |
| no-org@test | NULL | staff | none (default deny) |

### Test Records (per root entity table)

| Record | org_unit_id | Purpose |
|---|---|---|
| Ticket-1 | Unit-A1a | Visible to Division-A scope |
| Ticket-2 | Office-A1 | Visible to Division-A scope |
| Ticket-3 | Office-B1 | Visible to Division-B scope only |
| Ticket-4 | NULL | Visible to all (tenant-wide) |
| Ticket-5 | Office-C1 | Visible to Division-C scope only |

---

## Execution Strategy

### Phase 1 (Current): Foundation Tests
- Run all unit tests: `go test ./internal/shared/types/... ./internal/platform/auth/... ./internal/platform/middleware/...`
- Focus on SR-*, AC-*, SQ-* test suites
- Gate: All foundation tests pass before Phase 2 begins

### Phase 2: Service Layer Integration
- Run module-specific tests: `go test ./internal/modules/...`
- Focus on SL-* and AZ-* test suites
- Gate: All scoped list queries return correctly filtered results

### Phase 3: Reporting and Search
- Run reporting tests: `go test ./internal/modules/reporting/...`
- Focus on SL-011 through SL-014 (dashboard/search scoping)
- Gate: Dashboards show scope-filtered metrics

### Phase 4: RLS Integration
- Run RLS regression tests
- Focus on REG-* test suite
- Gate: RLS org-scope policies active; no data leakage in any scenario

### Phase 5: Frontend Tests
- Run frontend tests: `npm test` (or equivalent)
- Focus on UI-* test suite
- Gate: OrgScopeGate correctly hides/shows content

---

## CI/CD Integration

```yaml
# Suggested GitHub Actions step for hierarchical access tests:
- name: Run Hierarchical Access Tests
  run: |
    go test -v -count=1 -tags=integration \
      ./internal/platform/auth/... \
      ./internal/platform/middleware/... \
      ./internal/shared/types/... \
      -run "TestResolveOrgScope|TestHasOrgAccess|TestScopedQuery|TestBuildOrgFilter|TestOrgScopeMiddleware|TestDelegation"
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    JWT_SECRET: test-secret-for-ci
```

---

## Success Criteria

| Criterion | Metric |
|---|---|
| All P0 tests pass | 100% pass rate for SR-*, AC-*, SQ-*, AZ-*, NEG-*, REG-* |
| No authorization bypass | Zero failures in negative tests (NEG-001 through NEG-008) |
| Delegation correctness | All DEL-* tests pass including time-bound edge cases |
| Backward compatibility | NULL org_unit_id records remain visible (REG-003, REG-004) |
| Tenant isolation preserved | RLS tests pass (REG-001, REG-002, REG-005) |
| Performance | Scope resolution completes in < 50ms for hierarchies up to 100 org_units |

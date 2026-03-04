package types_test

import (
	"fmt"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// ScopedQuery tests (SQ-001 through SQ-006)
// ──────────────────────────────────────────────

func TestScopedQuery_GlobalScope(t *testing.T) {
	// SQ-001: Global user — no org clause, just tenant filter.
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: true,
		VisibleOrgIDs: nil,
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	where := sq.Where()

	expected := "tenant_id = $1"
	if where != expected {
		t.Errorf("SQ-001: expected Where() = %q, got %q", expected, where)
	}

	args := sq.Args()
	if len(args) != 1 {
		t.Fatalf("SQ-001: expected 1 arg (tenantID), got %d", len(args))
	}
	if args[0] != auth.TenantID {
		t.Error("SQ-001: first arg should be TenantID")
	}
}

func TestScopedQuery_ScopedUser(t *testing.T) {
	// SQ-002: Non-global user with VisibleOrgIDs.
	orgA := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	orgB := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000002")
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{orgA, orgB},
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	where := sq.Where()

	expected := "tenant_id = $1 AND (org_unit_id = ANY($2) OR org_unit_id IS NULL)"
	if where != expected {
		t.Errorf("SQ-002: expected Where() = %q, got %q", expected, where)
	}

	args := sq.Args()
	if len(args) != 2 {
		t.Fatalf("SQ-002: expected 2 args, got %d", len(args))
	}
	if args[0] != auth.TenantID {
		t.Error("SQ-002: first arg should be TenantID")
	}
	visibleIDs, ok := args[1].([]uuid.UUID)
	if !ok {
		t.Fatalf("SQ-002: second arg should be []uuid.UUID, got %T", args[1])
	}
	if len(visibleIDs) != 2 {
		t.Errorf("SQ-002: expected 2 visible IDs, got %d", len(visibleIDs))
	}
}

func TestScopedQuery_EmptyScope(t *testing.T) {
	// SQ-003: Non-global user with empty VisibleOrgIDs.
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{},
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	where := sq.Where()

	expected := "tenant_id = $1 AND org_unit_id IS NULL"
	if where != expected {
		t.Errorf("SQ-003: expected Where() = %q, got %q", expected, where)
	}

	args := sq.Args()
	if len(args) != 1 {
		t.Fatalf("SQ-003: expected 1 arg (tenantID only), got %d", len(args))
	}
}

func TestScopedQuery_NoOrgColumn(t *testing.T) {
	// SQ-004: Empty orgColumn — skip org filtering entirely.
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	sq := types.NewScopedQuery(auth, "")
	where := sq.Where()

	expected := "tenant_id = $1"
	if where != expected {
		t.Errorf("SQ-004: expected Where() = %q, got %q", expected, where)
	}
}

func TestScopedQuery_AddParam(t *testing.T) {
	// SQ-005: Custom parameters increment indices correctly.
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	// After tenant ($1) and org ($2), next should be $3.
	p3 := sq.AddParam("active")
	if p3 != "$3" {
		t.Errorf("SQ-005: expected $3, got %s", p3)
	}
	p4 := sq.AddParam(42)
	if p4 != "$4" {
		t.Errorf("SQ-005: expected $4, got %s", p4)
	}
}

func TestScopedQuery_Args(t *testing.T) {
	// SQ-006: Verify Args() returns all accumulated params.
	orgA := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{orgA},
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	sq.AddParam("custom-value")

	args := sq.Args()
	if len(args) != 3 {
		t.Fatalf("SQ-006: expected 3 args, got %d", len(args))
	}
	// args[0] = TenantID
	if args[0] != auth.TenantID {
		t.Error("SQ-006: args[0] should be TenantID")
	}
	// args[1] = VisibleOrgIDs
	if _, ok := args[1].([]uuid.UUID); !ok {
		t.Errorf("SQ-006: args[1] should be []uuid.UUID, got %T", args[1])
	}
	// args[2] = custom param
	if args[2] != "custom-value" {
		t.Errorf("SQ-006: args[2] should be 'custom-value', got %v", args[2])
	}
}

func TestScopedQuery_GlobalScope_AddParam(t *testing.T) {
	// Global user: tenant=$1, then custom params start at $2.
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: true,
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	p := sq.AddParam("status")
	if p != "$2" {
		t.Errorf("expected $2 for global user's first custom param, got %s", p)
	}
}

func TestScopedQuery_NextParamIndex(t *testing.T) {
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	// After tenant ($1) and org ($2), next should be 3.
	if sq.NextParamIndex() != 3 {
		t.Errorf("expected NextParamIndex=3, got %d", sq.NextParamIndex())
	}
	sq.AddParam("x")
	if sq.NextParamIndex() != 4 {
		t.Errorf("expected NextParamIndex=4 after AddParam, got %d", sq.NextParamIndex())
	}
}

func TestScopedQuery_OrgFilterClause(t *testing.T) {
	// Scoped user should have a non-empty OrgFilterClause.
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	clause := sq.OrgFilterClause()
	if clause == "" {
		t.Error("expected non-empty OrgFilterClause for scoped user")
	}
	if !strings.Contains(clause, "org_unit_id") {
		t.Errorf("expected clause to contain 'org_unit_id', got %q", clause)
	}
}

func TestScopedQuery_OrgFilterClause_Global(t *testing.T) {
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: true,
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	clause := sq.OrgFilterClause()
	if clause != "" {
		t.Errorf("expected empty OrgFilterClause for global user, got %q", clause)
	}
}

func TestScopedQuery_TenantOnly(t *testing.T) {
	auth := &types.AuthContext{
		TenantID:      uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	sq := types.NewScopedQuery(auth, "org_unit_id")
	if sq.TenantOnly() != "tenant_id = $1" {
		t.Errorf("expected 'tenant_id = $1', got %q", sq.TenantOnly())
	}
}

// ──────────────────────────────────────────────
// BuildOrgFilter tests (SQ-007 through SQ-010)
// ──────────────────────────────────────────────

func TestBuildOrgFilter_GlobalScope(t *testing.T) {
	// SQ-007: Global user — returns empty clause and nil.
	auth := &types.AuthContext{
		IsGlobalScope: true,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	clause, param := types.BuildOrgFilter(auth, "org_unit_id", 3)
	if clause != "" {
		t.Errorf("SQ-007: expected empty clause for global scope, got %q", clause)
	}
	if param != nil {
		t.Errorf("SQ-007: expected nil param for global scope, got %v", param)
	}
}

func TestBuildOrgFilter_ScopedUser(t *testing.T) {
	// SQ-008: Non-global user with VisibleOrgIDs.
	orgA := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	orgB := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000002")
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{orgA, orgB},
	}
	clause, param := types.BuildOrgFilter(auth, "org_unit_id", 3)

	expected := "(org_unit_id = ANY($3) OR org_unit_id IS NULL)"
	if clause != expected {
		t.Errorf("SQ-008: expected clause %q, got %q", expected, clause)
	}
	ids, ok := param.([]uuid.UUID)
	if !ok {
		t.Fatalf("SQ-008: expected param type []uuid.UUID, got %T", param)
	}
	if len(ids) != 2 {
		t.Errorf("SQ-008: expected 2 IDs, got %d", len(ids))
	}
}

func TestBuildOrgFilter_EmptyScope(t *testing.T) {
	// SQ-009: Non-global, empty visible IDs.
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{},
	}
	clause, param := types.BuildOrgFilter(auth, "org_unit_id", 2)

	expected := "org_unit_id IS NULL"
	if clause != expected {
		t.Errorf("SQ-009: expected clause %q, got %q", expected, clause)
	}
	if param != nil {
		t.Errorf("SQ-009: expected nil param for empty scope, got %v", param)
	}
}

func TestBuildOrgFilter_CustomColumn(t *testing.T) {
	// SQ-010: Custom column expression used verbatim.
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	clause, _ := types.BuildOrgFilter(auth, "t.org_unit_id", 5)

	expected := "(t.org_unit_id = ANY($5) OR t.org_unit_id IS NULL)"
	if clause != expected {
		t.Errorf("SQ-010: expected clause %q, got %q", expected, clause)
	}
}

func TestBuildOrgFilter_DifferentParamIndices(t *testing.T) {
	// Verify different param indices are embedded correctly.
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}

	for _, idx := range []int{1, 2, 5, 10} {
		clause, _ := types.BuildOrgFilter(auth, "col", idx)
		expectedFragment := fmt.Sprintf("ANY($%d)", idx)
		if !strings.Contains(clause, expectedFragment) {
			t.Errorf("expected clause to contain %q for paramIndex=%d, got %q", expectedFragment, idx, clause)
		}
	}
}

func TestBuildOrgFilter_NilVisibleOrgIDs(t *testing.T) {
	// Nil VisibleOrgIDs with non-global scope — should be treated like empty.
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: nil,
	}
	clause, param := types.BuildOrgFilter(auth, "org_unit_id", 2)

	expected := "org_unit_id IS NULL"
	if clause != expected {
		t.Errorf("expected clause %q for nil VisibleOrgIDs, got %q", expected, clause)
	}
	if param != nil {
		t.Errorf("expected nil param, got %v", param)
	}
}

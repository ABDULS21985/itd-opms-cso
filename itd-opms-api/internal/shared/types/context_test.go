package types_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// SetAuthContext / GetAuthContext
// ──────────────────────────────────────────────

func TestSetAndGetAuthContext(t *testing.T) {
	userID := uuid.New()
	tenantID := uuid.New()
	auth := &types.AuthContext{
		UserID:      userID,
		TenantID:    tenantID,
		Email:       "user@example.com",
		DisplayName: "Test User",
		Roles:       []string{"admin", "viewer"},
		Permissions: []string{"users.read", "users.write"},
	}

	ctx := types.SetAuthContext(context.Background(), auth)
	got := types.GetAuthContext(ctx)

	if got == nil {
		t.Fatal("expected non-nil AuthContext")
	}
	if got.UserID != userID {
		t.Errorf("UserID: expected %s, got %s", userID, got.UserID)
	}
	if got.TenantID != tenantID {
		t.Errorf("TenantID: expected %s, got %s", tenantID, got.TenantID)
	}
	if got.Email != "user@example.com" {
		t.Errorf("Email: expected user@example.com, got %s", got.Email)
	}
	if got.DisplayName != "Test User" {
		t.Errorf("DisplayName: expected 'Test User', got %s", got.DisplayName)
	}
	if len(got.Roles) != 2 {
		t.Errorf("Roles: expected 2 roles, got %d", len(got.Roles))
	}
	if len(got.Permissions) != 2 {
		t.Errorf("Permissions: expected 2 permissions, got %d", len(got.Permissions))
	}
}

func TestGetAuthContext_Missing(t *testing.T) {
	ctx := context.Background()
	got := types.GetAuthContext(ctx)

	if got != nil {
		t.Errorf("expected nil AuthContext for empty context, got %+v", got)
	}
}

func TestGetAuthContext_WrongType(t *testing.T) {
	// Simulate a wrong type stored under a different key — GetAuthContext should
	// safely return nil since the internal contextKey is unexported.
	ctx := context.Background()
	got := types.GetAuthContext(ctx)
	if got != nil {
		t.Error("expected nil for context without auth")
	}
}

func TestAuthContext_PropagationThroughNested(t *testing.T) {
	auth := &types.AuthContext{
		UserID:   uuid.New(),
		TenantID: uuid.New(),
		Email:    "nested@test.com",
	}
	ctx := types.SetAuthContext(context.Background(), auth)
	// Wrap in another context layer
	childCtx := context.WithValue(ctx, "other-key", "other-value")

	got := types.GetAuthContext(childCtx)
	if got == nil {
		t.Fatal("expected AuthContext to propagate through nested context")
	}
	if got.Email != "nested@test.com" {
		t.Errorf("expected nested@test.com, got %s", got.Email)
	}
}

// ──────────────────────────────────────────────
// HasPermission
// ──────────────────────────────────────────────

func TestHasPermission_Found(t *testing.T) {
	auth := &types.AuthContext{
		Permissions: []string{"users.read", "users.write", "projects.read"},
	}
	if !auth.HasPermission("users.write") {
		t.Error("expected HasPermission to return true for 'users.write'")
	}
}

func TestHasPermission_NotFound(t *testing.T) {
	auth := &types.AuthContext{
		Permissions: []string{"users.read"},
	}
	if auth.HasPermission("users.delete") {
		t.Error("expected HasPermission to return false for 'users.delete'")
	}
}

func TestHasPermission_Wildcard(t *testing.T) {
	auth := &types.AuthContext{
		Permissions: []string{"*"},
	}
	if !auth.HasPermission("anything.at.all") {
		t.Error("expected wildcard '*' to match any permission")
	}
}

func TestHasPermission_EmptyPermissions(t *testing.T) {
	auth := &types.AuthContext{
		Permissions: []string{},
	}
	if auth.HasPermission("users.read") {
		t.Error("expected HasPermission to return false with empty permissions")
	}
}

func TestHasPermission_NilPermissions(t *testing.T) {
	auth := &types.AuthContext{}
	if auth.HasPermission("users.read") {
		t.Error("expected HasPermission to return false with nil permissions")
	}
}

// ──────────────────────────────────────────────
// HasRole
// ──────────────────────────────────────────────

func TestHasRole_Found(t *testing.T) {
	auth := &types.AuthContext{
		Roles: []string{"admin", "viewer"},
	}
	if !auth.HasRole("admin") {
		t.Error("expected HasRole to return true for 'admin'")
	}
}

func TestHasRole_NotFound(t *testing.T) {
	auth := &types.AuthContext{
		Roles: []string{"viewer"},
	}
	if auth.HasRole("admin") {
		t.Error("expected HasRole to return false for 'admin'")
	}
}

func TestHasRole_EmptyRoles(t *testing.T) {
	auth := &types.AuthContext{
		Roles: []string{},
	}
	if auth.HasRole("admin") {
		t.Error("expected HasRole to return false with empty roles")
	}
}

// ──────────────────────────────────────────────
// SetCorrelationID / GetCorrelationID
// ──────────────────────────────────────────────

func TestSetAndGetCorrelationID(t *testing.T) {
	ctx := types.SetCorrelationID(context.Background(), "corr-123")
	got := types.GetCorrelationID(ctx)

	if got != "corr-123" {
		t.Errorf("expected corr-123, got %s", got)
	}
}

func TestGetCorrelationID_Missing(t *testing.T) {
	ctx := context.Background()
	got := types.GetCorrelationID(ctx)

	if got != "" {
		t.Errorf("expected empty string for missing correlation ID, got %q", got)
	}
}

func TestCorrelationID_PropagationThroughNested(t *testing.T) {
	ctx := types.SetCorrelationID(context.Background(), "nested-corr")
	childCtx := context.WithValue(ctx, "other", "value")

	got := types.GetCorrelationID(childCtx)
	if got != "nested-corr" {
		t.Errorf("expected nested-corr, got %s", got)
	}
}

func TestCorrelationID_EmptyString(t *testing.T) {
	ctx := types.SetCorrelationID(context.Background(), "")
	got := types.GetCorrelationID(ctx)

	if got != "" {
		t.Errorf("expected empty string, got %q", got)
	}
}

// ──────────────────────────────────────────────
// HasOrgAccess (AC-001 through AC-005)
// ──────────────────────────────────────────────

func TestHasOrgAccess_GlobalScope(t *testing.T) {
	auth := &types.AuthContext{
		IsGlobalScope: true,
		VisibleOrgIDs: nil,
	}
	// AC-001: Global scope user can access any org unit.
	anyOrgID := uuid.New()
	if !auth.HasOrgAccess(anyOrgID) {
		t.Error("expected HasOrgAccess to return true for global scope user")
	}
}

func TestHasOrgAccess_NilOrgUnit(t *testing.T) {
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	// AC-002: uuid.Nil org unit means tenant-visible → always accessible.
	if !auth.HasOrgAccess(uuid.Nil) {
		t.Error("expected HasOrgAccess to return true for uuid.Nil (tenant-visible record)")
	}
}

func TestHasOrgAccess_InVisibleList(t *testing.T) {
	orgA := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	orgB := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000002")
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{orgA, orgB},
	}
	// AC-003: Org unit present in visible list.
	if !auth.HasOrgAccess(orgA) {
		t.Error("expected HasOrgAccess to return true for org unit in visible list")
	}
	if !auth.HasOrgAccess(orgB) {
		t.Error("expected HasOrgAccess to return true for second org unit in visible list")
	}
}

func TestHasOrgAccess_NotInVisibleList(t *testing.T) {
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{
			uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001"),
			uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000002"),
		},
	}
	// AC-004: Org unit NOT in visible list.
	outsideOrgID := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000099")
	if auth.HasOrgAccess(outsideOrgID) {
		t.Error("expected HasOrgAccess to return false for org unit outside visible list")
	}
}

func TestHasOrgAccess_EmptyVisibleList(t *testing.T) {
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{},
	}
	// AC-005: Empty visible list + non-nil orgUnitID.
	someOrgID := uuid.New()
	if auth.HasOrgAccess(someOrgID) {
		t.Error("expected HasOrgAccess to return false with empty visible list")
	}
}

func TestHasOrgAccess_NilVisibleList(t *testing.T) {
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: nil,
	}
	someOrgID := uuid.New()
	if auth.HasOrgAccess(someOrgID) {
		t.Error("expected HasOrgAccess to return false with nil visible list")
	}
}

// ──────────────────────────────────────────────
// OrgScopeFilter (AC-006 through AC-008)
// ──────────────────────────────────────────────

func TestOrgScopeFilter_GlobalScope(t *testing.T) {
	auth := &types.AuthContext{
		IsGlobalScope: true,
		VisibleOrgIDs: []uuid.UUID{uuid.New()},
	}
	// AC-006: Global scope returns nil (no filter needed).
	filter := auth.OrgScopeFilter()
	if filter != nil {
		t.Errorf("expected nil filter for global scope, got %v", filter)
	}
}

func TestOrgScopeFilter_ScopedUser(t *testing.T) {
	orgA := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	orgB := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000002")
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{orgA, orgB},
	}
	// AC-007: Scoped user returns VisibleOrgIDs.
	filter := auth.OrgScopeFilter()
	if filter == nil {
		t.Fatal("expected non-nil filter for scoped user")
	}
	if len(filter) != 2 {
		t.Errorf("expected 2 IDs in filter, got %d", len(filter))
	}
	if filter[0] != orgA || filter[1] != orgB {
		t.Errorf("expected filter to match VisibleOrgIDs, got %v", filter)
	}
}

func TestOrgScopeFilter_EmptyScope(t *testing.T) {
	auth := &types.AuthContext{
		IsGlobalScope: false,
		VisibleOrgIDs: []uuid.UUID{},
	}
	// AC-008: Empty visible list returns empty (not nil) slice.
	filter := auth.OrgScopeFilter()
	if filter == nil {
		t.Error("expected non-nil (empty) slice for scoped user with no visible orgs")
	}
	if len(filter) != 0 {
		t.Errorf("expected 0 IDs in filter, got %d", len(filter))
	}
}

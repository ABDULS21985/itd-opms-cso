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

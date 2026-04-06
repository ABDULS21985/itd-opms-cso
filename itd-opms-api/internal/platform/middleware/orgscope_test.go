package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// These tests exercise the OrgScope middleware's in-process behavior using a
// nil pool (which will cause ResolveOrgScope to fail). Because OrgScope is
// fail-open, these tests verify the middleware's error-handling and passthrough
// logic without requiring a real database.

// MW-003: No AuthContext — middleware passes through without enrichment.
func TestOrgScopeMiddleware_NoAuthContext(t *testing.T) {
	innerCalled := false
	handler := middleware.OrgScope(nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		innerCalled = true
		authCtx := types.GetAuthContext(r.Context())
		if authCtx != nil {
			t.Error("expected no AuthContext when none was set upstream")
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if !innerCalled {
		t.Error("expected inner handler to be called")
	}
}

// MW-004: Nil pool (database unavailable) — middleware passes through safely.
func TestOrgScopeMiddleware_NilPool(t *testing.T) {
	// Pre-populate AuthContext as if AuthDualMode ran.
	authCtx := &types.AuthContext{
		UserID:   uuid.New(),
		TenantID: uuid.New(),
		Email:    "test@test.com",
		Roles:    []string{"staff"},
	}

	innerCalled := false
	handler := middleware.OrgScope(nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		innerCalled = true
		// AuthContext should still be present (unenriched — no org scope set).
		got := types.GetAuthContext(r.Context())
		if got == nil {
			t.Error("expected AuthContext to be preserved when pool is nil")
		}
		// Org fields should remain zero-valued since middleware skipped resolution.
		if got.IsGlobalScope {
			t.Error("expected IsGlobalScope to be false (unenriched)")
		}
		if got.OrgUnitID != uuid.Nil {
			t.Errorf("expected OrgUnitID to be Nil (unenriched), got %s", got.OrgUnitID)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := types.SetAuthContext(req.Context(), authCtx)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if !innerCalled {
		t.Error("expected inner handler to be called")
	}
}

// MW-006: Verify middleware runs correctly when chained after Auth middleware.
func TestOrgScopeMiddleware_ChainOrder(t *testing.T) {
	authCtx := &types.AuthContext{
		UserID:   uuid.New(),
		TenantID: uuid.New(),
		Email:    "chain@test.com",
		Roles:    []string{"head_of_division"},
	}

	var capturedAuth *types.AuthContext
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = types.GetAuthContext(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	// Simulate auth middleware setting context, then OrgScope running after.
	fakeAuth := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := types.SetAuthContext(r.Context(), authCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}

	handler := fakeAuth(middleware.OrgScope(nil)(inner))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if capturedAuth == nil {
		t.Fatal("expected AuthContext to be present in downstream handler")
	}
	if capturedAuth.Email != "chain@test.com" {
		t.Errorf("expected email chain@test.com, got %s", capturedAuth.Email)
	}
}

// Test that OrgScope middleware preserves existing AuthContext fields on failure.
func TestOrgScopeMiddleware_PreservesAuthFields(t *testing.T) {
	authCtx := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "preserve@test.com",
		DisplayName: "Preserved User",
		Roles:       []string{"supervisor"},
		Permissions: []string{"itsm.read"},
	}

	handler := middleware.OrgScope(nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := types.GetAuthContext(r.Context())
		if got == nil {
			t.Fatal("expected AuthContext")
		}
		if got.Email != "preserve@test.com" {
			t.Errorf("expected email preserved, got %s", got.Email)
		}
		if got.DisplayName != "Preserved User" {
			t.Errorf("expected display name preserved, got %s", got.DisplayName)
		}
		if len(got.Roles) != 1 || got.Roles[0] != "supervisor" {
			t.Errorf("expected roles preserved, got %v", got.Roles)
		}
		if len(got.Permissions) != 1 || got.Permissions[0] != "itsm.read" {
			t.Errorf("expected permissions preserved, got %v", got.Permissions)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx := types.SetAuthContext(req.Context(), authCtx)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

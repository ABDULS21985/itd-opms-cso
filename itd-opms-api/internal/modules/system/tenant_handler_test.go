package system

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestTenantHandler() *TenantHandler {
	svc := NewTenantService(nil, nil)
	return NewTenantHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestTenantHandler_ListTenants_NoAuth(t *testing.T) {
	h := newTestTenantHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListTenants(w, req)
	assertUnauthorized(t, w)
}

func TestTenantHandler_GetTenant_NoAuth(t *testing.T) {
	h := newTestTenantHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.GetTenant(w, req)
	assertUnauthorized(t, w)
}

func TestTenantHandler_CreateTenant_NoAuth(t *testing.T) {
	h := newTestTenantHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"test","code":"TST","type":"org"}`))
	w := httptest.NewRecorder()
	h.CreateTenant(w, req)
	assertUnauthorized(t, w)
}

func TestTenantHandler_UpdateTenant_NoAuth(t *testing.T) {
	h := newTestTenantHandler()
	req := httptest.NewRequest(http.MethodPatch, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.UpdateTenant(w, req)
	assertUnauthorized(t, w)
}

func TestTenantHandler_DeactivateTenant_NoAuth(t *testing.T) {
	h := newTestTenantHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/deactivate", nil)
	w := httptest.NewRecorder()
	h.DeactivateTenant(w, req)
	assertUnauthorized(t, w)
}

func TestTenantHandler_GetTenantHierarchy_NoAuth(t *testing.T) {
	h := newTestTenantHandler()
	req := httptest.NewRequest(http.MethodGet, "/tree", nil)
	w := httptest.NewRecorder()
	h.GetTenantHierarchy(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests
// ──────────────────────────────────────────────

func TestTenantHandler_GetTenant_InvalidID(t *testing.T) {
	h := newTestTenantHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.GetTenant)

	req := requestWithAuthCtx(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTenantHandler_CreateTenant_InvalidBody(t *testing.T) {
	h := newTestTenantHandler()

	req := requestWithAuthCtx(http.MethodPost, "/", `{invalid json}`)
	w := httptest.NewRecorder()
	h.CreateTenant(w, req)
	assertBadRequest(t, w)
}

func TestTenantHandler_UpdateTenant_InvalidID(t *testing.T) {
	h := newTestTenantHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateTenant)

	req := requestWithAuthCtx(http.MethodPatch, "/bad-id", `{"name":"test"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTenantHandler_UpdateTenant_InvalidBody(t *testing.T) {
	h := newTestTenantHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateTenant)

	req := requestWithAuthCtx(http.MethodPatch, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTenantHandler_DeactivateTenant_InvalidID(t *testing.T) {
	h := newTestTenantHandler()

	r := chi.NewRouter()
	r.Post("/{id}/deactivate", h.DeactivateTenant)

	req := requestWithAuthCtx(http.MethodPost, "/bad-id/deactivate", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestTenantHandler_RouteRegistration(t *testing.T) {
	h := newTestTenantHandler()

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					w.WriteHeader(http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, req)
		})
	})
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			auth := &types.AuthContext{
				UserID:      uuid.New(),
				TenantID:    uuid.New(),
				Permissions: []string{"*"},
			}
			ctx := types.SetAuthContext(req.Context(), auth)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Route("/tenants", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListTenants", http.MethodGet, "/tenants/", ""},
		{"GetTenantHierarchy", http.MethodGet, "/tenants/tree", ""},
		{"GetTenant", http.MethodGet, "/tenants/" + validUUID, ""},
		{"CreateTenant", http.MethodPost, "/tenants/", `{"name":"t","code":"T","type":"org"}`},
		{"UpdateTenant", http.MethodPatch, "/tenants/" + validUUID, `{"name":"t"}`},
		{"DeactivateTenant", http.MethodPost, "/tenants/" + validUUID + "/deactivate", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != "" {
				req = httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound {
				t.Errorf("route %s %s returned 404 — route not registered", tt.method, tt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 — method not allowed", tt.method, tt.path)
			}
		})
	}
}

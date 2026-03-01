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

func newTestRoleHandler() *RoleHandler {
	svc := NewRoleService(nil, nil)
	return NewRoleHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestRoleHandler_ListRoles_NoAuth(t *testing.T) {
	h := newTestRoleHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListRoles(w, req)
	assertUnauthorized(t, w)
}

func TestRoleHandler_GetRole_NoAuth(t *testing.T) {
	h := newTestRoleHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.GetRole(w, req)
	assertUnauthorized(t, w)
}

func TestRoleHandler_CreateRole_NoAuth(t *testing.T) {
	h := newTestRoleHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"test","permissions":["a"]}`))
	w := httptest.NewRecorder()
	h.CreateRole(w, req)
	assertUnauthorized(t, w)
}

func TestRoleHandler_UpdateRole_NoAuth(t *testing.T) {
	h := newTestRoleHandler()
	req := httptest.NewRequest(http.MethodPatch, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.UpdateRole(w, req)
	assertUnauthorized(t, w)
}

func TestRoleHandler_DeleteRole_NoAuth(t *testing.T) {
	h := newTestRoleHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.DeleteRole(w, req)
	assertUnauthorized(t, w)
}

func TestRoleHandler_GetPermissionCatalog_NoAuth(t *testing.T) {
	h := newTestRoleHandler()
	req := httptest.NewRequest(http.MethodGet, "/permissions", nil)
	w := httptest.NewRecorder()
	h.GetPermissionCatalog(w, req)
	assertUnauthorized(t, w)
}

func TestRoleHandler_GetRoleStats_NoAuth(t *testing.T) {
	h := newTestRoleHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()
	h.GetRoleStats(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests
// ──────────────────────────────────────────────

func TestRoleHandler_GetRole_InvalidID(t *testing.T) {
	h := newTestRoleHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.GetRole)

	req := requestWithAuthCtx(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestRoleHandler_CreateRole_InvalidBody(t *testing.T) {
	h := newTestRoleHandler()

	req := requestWithAuthCtx(http.MethodPost, "/", `{invalid json}`)
	w := httptest.NewRecorder()
	h.CreateRole(w, req)
	assertBadRequest(t, w)
}

func TestRoleHandler_UpdateRole_InvalidID(t *testing.T) {
	h := newTestRoleHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateRole)

	req := requestWithAuthCtx(http.MethodPatch, "/bad-id", `{"permissions":["a"]}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestRoleHandler_UpdateRole_InvalidBody(t *testing.T) {
	h := newTestRoleHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateRole)

	req := requestWithAuthCtx(http.MethodPatch, "/"+uuid.New().String(), `{bad}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestRoleHandler_DeleteRole_InvalidID(t *testing.T) {
	h := newTestRoleHandler()

	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteRole)

	req := requestWithAuthCtx(http.MethodDelete, "/not-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestRoleHandler_RouteRegistration(t *testing.T) {
	h := newTestRoleHandler()

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
	r.Route("/roles", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListRoles", http.MethodGet, "/roles/", ""},
		{"GetRoleStats", http.MethodGet, "/roles/stats", ""},
		{"GetRole", http.MethodGet, "/roles/" + validUUID, ""},
		{"CreateRole", http.MethodPost, "/roles/", `{"name":"test","permissions":["a"]}`},
		{"UpdateRole", http.MethodPatch, "/roles/" + validUUID, `{"permissions":["a"]}`},
		{"DeleteRole", http.MethodDelete, "/roles/" + validUUID, ""},
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

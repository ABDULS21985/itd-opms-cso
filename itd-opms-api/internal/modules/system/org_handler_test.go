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

func newTestOrgHandler() *OrgHandler {
	svc := NewOrgService(nil, nil)
	return NewOrgHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestOrgHandler_ListOrgUnits_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListOrgUnits(w, req)
	assertUnauthorized(t, w)
}

func TestOrgHandler_GetOrgUnit_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.GetOrgUnit(w, req)
	assertUnauthorized(t, w)
}

func TestOrgHandler_GetOrgTree_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodGet, "/tree", nil)
	w := httptest.NewRecorder()
	h.GetOrgTree(w, req)
	assertUnauthorized(t, w)
}

func TestOrgHandler_CreateOrgUnit_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"test","code":"TST","level":"department"}`))
	w := httptest.NewRecorder()
	h.CreateOrgUnit(w, req)
	assertUnauthorized(t, w)
}

func TestOrgHandler_UpdateOrgUnit_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodPatch, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.UpdateOrgUnit(w, req)
	assertUnauthorized(t, w)
}

func TestOrgHandler_MoveOrgUnit_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/move", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.MoveOrgUnit(w, req)
	assertUnauthorized(t, w)
}

func TestOrgHandler_DeleteOrgUnit_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.DeleteOrgUnit(w, req)
	assertUnauthorized(t, w)
}

func TestOrgHandler_GetOrgUnitUsers_NoAuth(t *testing.T) {
	h := newTestOrgHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/users", nil)
	w := httptest.NewRecorder()
	h.GetOrgUnitUsers(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests
// ──────────────────────────────────────────────

func TestOrgHandler_GetOrgUnit_InvalidID(t *testing.T) {
	h := newTestOrgHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.GetOrgUnit)

	req := requestWithAuthCtx(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestOrgHandler_CreateOrgUnit_InvalidBody(t *testing.T) {
	h := newTestOrgHandler()

	req := requestWithAuthCtx(http.MethodPost, "/", `{invalid json}`)
	w := httptest.NewRecorder()
	h.CreateOrgUnit(w, req)
	assertBadRequest(t, w)
}

func TestOrgHandler_UpdateOrgUnit_InvalidID(t *testing.T) {
	h := newTestOrgHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateOrgUnit)

	req := requestWithAuthCtx(http.MethodPatch, "/bad-id", `{"name":"test"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestOrgHandler_UpdateOrgUnit_InvalidBody(t *testing.T) {
	h := newTestOrgHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateOrgUnit)

	req := requestWithAuthCtx(http.MethodPatch, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestOrgHandler_MoveOrgUnit_InvalidID(t *testing.T) {
	h := newTestOrgHandler()

	r := chi.NewRouter()
	r.Post("/{id}/move", h.MoveOrgUnit)

	req := requestWithAuthCtx(http.MethodPost, "/bad-id/move", `{"newParentId":"`+uuid.New().String()+`"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestOrgHandler_MoveOrgUnit_InvalidBody(t *testing.T) {
	h := newTestOrgHandler()

	r := chi.NewRouter()
	r.Post("/{id}/move", h.MoveOrgUnit)

	req := requestWithAuthCtx(http.MethodPost, "/"+uuid.New().String()+"/move", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestOrgHandler_DeleteOrgUnit_InvalidID(t *testing.T) {
	h := newTestOrgHandler()

	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteOrgUnit)

	req := requestWithAuthCtx(http.MethodDelete, "/bad-id", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestOrgHandler_GetOrgUnitUsers_InvalidID(t *testing.T) {
	h := newTestOrgHandler()

	r := chi.NewRouter()
	r.Get("/{id}/users", h.GetOrgUnitUsers)

	req := requestWithAuthCtx(http.MethodGet, "/bad-id/users", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestOrgHandler_RouteRegistration(t *testing.T) {
	h := newTestOrgHandler()

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
	r.Route("/org-units", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListOrgUnits", http.MethodGet, "/org-units/", ""},
		{"GetOrgTree", http.MethodGet, "/org-units/tree", ""},
		{"GetOrgUnit", http.MethodGet, "/org-units/" + validUUID, ""},
		{"CreateOrgUnit", http.MethodPost, "/org-units/", `{"name":"t","code":"T","level":"dept"}`},
		{"UpdateOrgUnit", http.MethodPatch, "/org-units/" + validUUID, `{"name":"t"}`},
		{"MoveOrgUnit", http.MethodPost, "/org-units/" + validUUID + "/move", `{"newParentId":"` + uuid.New().String() + `"}`},
		{"DeleteOrgUnit", http.MethodDelete, "/org-units/" + validUUID, ""},
		{"GetOrgUnitUsers", http.MethodGet, "/org-units/" + validUUID + "/users", ""},
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

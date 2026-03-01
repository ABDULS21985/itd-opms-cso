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

func newTestSettingsHandler() *SettingsHandler {
	svc := NewSettingsService(nil, nil)
	return NewSettingsHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestSettingsHandler_ListSettings_NoAuth(t *testing.T) {
	h := newTestSettingsHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListSettings(w, req)
	assertUnauthorized(t, w)
}

func TestSettingsHandler_GetCategories_NoAuth(t *testing.T) {
	h := newTestSettingsHandler()
	req := httptest.NewRequest(http.MethodGet, "/categories", nil)
	w := httptest.NewRecorder()
	h.GetCategories(w, req)
	assertUnauthorized(t, w)
}

func TestSettingsHandler_GetSetting_NoAuth(t *testing.T) {
	h := newTestSettingsHandler()
	req := httptest.NewRequest(http.MethodGet, "/general/timezone", nil)
	w := httptest.NewRecorder()
	h.GetSetting(w, req)
	assertUnauthorized(t, w)
}

func TestSettingsHandler_UpdateSetting_NoAuth(t *testing.T) {
	h := newTestSettingsHandler()
	req := httptest.NewRequest(http.MethodPut, "/general/timezone", strings.NewReader(`{"value":"UTC"}`))
	w := httptest.NewRecorder()
	h.UpdateSetting(w, req)
	assertUnauthorized(t, w)
}

func TestSettingsHandler_ResetSetting_NoAuth(t *testing.T) {
	h := newTestSettingsHandler()
	req := httptest.NewRequest(http.MethodDelete, "/general/timezone", nil)
	w := httptest.NewRecorder()
	h.ResetSetting(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests
// ──────────────────────────────────────────────

func TestSettingsHandler_UpdateSetting_InvalidBody(t *testing.T) {
	h := newTestSettingsHandler()

	r := chi.NewRouter()
	r.Put("/{category}/{key}", h.UpdateSetting)

	req := requestWithAuthCtx(http.MethodPut, "/general/timezone", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestSettingsHandler_RouteRegistration(t *testing.T) {
	h := newTestSettingsHandler()

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
	r.Route("/settings", func(r chi.Router) { h.Routes(r) })

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListSettings", http.MethodGet, "/settings/", ""},
		{"GetCategories", http.MethodGet, "/settings/categories", ""},
		{"GetSetting", http.MethodGet, "/settings/general/timezone", ""},
		{"UpdateSetting", http.MethodPut, "/settings/general/timezone", `{"value":"UTC"}`},
		{"ResetSetting", http.MethodDelete, "/settings/general/timezone", ""},
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

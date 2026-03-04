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

func newTestHealthHandler() *SystemHealthHandler {
	svc := NewHealthService(nil, nil, nil, nil)
	return NewSystemHealthHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — TriggerDirectorySync checks auth itself
// Note: GetPlatformHealth, GetSystemStats, GetDirectorySyncStatus
// do NOT check auth in the handler (they rely on middleware), so
// we only test TriggerDirectorySync for the 401 guard.
// ──────────────────────────────────────────────

func TestHealthHandler_TriggerDirectorySync_NoAuth(t *testing.T) {
	h := newTestHealthHandler()
	req := httptest.NewRequest(http.MethodPost, "/directory-sync/trigger", nil)
	w := httptest.NewRecorder()
	h.TriggerDirectorySync(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// GetPlatformHealth returns a response (nil pool is handled by service)
// ──────────────────────────────────────────────

func TestHealthHandler_GetPlatformHealth_ReturnsResponse(t *testing.T) {
	h := newTestHealthHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.GetPlatformHealth(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	resp := parseErrorResponse(t, w)
	if resp.Status != "success" {
		t.Errorf("expected status 'success', got %q", resp.Status)
	}
}

// ──────────────────────────────────────────────
// TriggerDirectorySync with auth + no NATS returns success
// ──────────────────────────────────────────────

func TestHealthHandler_TriggerDirectorySync_WithAuth_NoNats(t *testing.T) {
	h := newTestHealthHandler()
	req := requestWithAuthCtx(http.MethodPost, "/directory-sync/trigger", "")
	w := httptest.NewRecorder()
	h.TriggerDirectorySync(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (NATS not available is non-fatal), got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestHealthHandler_RouteRegistration(t *testing.T) {
	h := newTestHealthHandler()

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
	r.Route("/health", func(r chi.Router) { h.Routes(r) })

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"GetPlatformHealth", http.MethodGet, "/health/", ""},
		{"GetSystemStats", http.MethodGet, "/health/stats", ""},
		{"GetDirectorySyncStatus", http.MethodGet, "/health/directory-sync", ""},
		{"TriggerDirectorySync", http.MethodPost, "/health/directory-sync/trigger", ""},
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

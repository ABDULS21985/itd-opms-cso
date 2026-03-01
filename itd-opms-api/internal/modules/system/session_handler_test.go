package system

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestSessionHandler() *SessionHandler {
	svc := NewSessionService(nil, nil)
	return NewSessionHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestSessionHandler_ListSessions_NoAuth(t *testing.T) {
	h := newTestSessionHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListSessions(w, req)
	assertUnauthorized(t, w)
}

func TestSessionHandler_GetSessionStats_NoAuth(t *testing.T) {
	h := newTestSessionHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()
	h.GetSessionStats(w, req)
	assertUnauthorized(t, w)
}

func TestSessionHandler_RevokeSession_NoAuth(t *testing.T) {
	h := newTestSessionHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.RevokeSession(w, req)
	assertUnauthorized(t, w)
}

func TestSessionHandler_RevokeUserSessions_NoAuth(t *testing.T) {
	h := newTestSessionHandler()
	req := httptest.NewRequest(http.MethodDelete, "/user/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.RevokeUserSessions(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests
// ──────────────────────────────────────────────

func TestSessionHandler_RevokeSession_InvalidID(t *testing.T) {
	h := newTestSessionHandler()

	r := chi.NewRouter()
	r.Delete("/{id}", h.RevokeSession)

	req := requestWithAuthCtx(http.MethodDelete, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestSessionHandler_RevokeUserSessions_InvalidUserID(t *testing.T) {
	h := newTestSessionHandler()

	r := chi.NewRouter()
	r.Delete("/user/{userId}", h.RevokeUserSessions)

	req := requestWithAuthCtx(http.MethodDelete, "/user/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestSessionHandler_RouteRegistration(t *testing.T) {
	h := newTestSessionHandler()

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
	r.Route("/sessions", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
	}{
		{"ListSessions", http.MethodGet, "/sessions/"},
		{"GetSessionStats", http.MethodGet, "/sessions/stats"},
		{"RevokeSession", http.MethodDelete, "/sessions/" + validUUID},
		{"RevokeUserSessions", http.MethodDelete, "/sessions/user/" + validUUID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
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

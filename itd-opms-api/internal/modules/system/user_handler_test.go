package system

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestUserHandler() *UserHandler {
	svc := NewUserService(nil, nil, nil, config.MinIOConfig{})
	return NewUserHandler(svc)
}

// requestWithAuthCtx returns a request with a valid AuthContext set.
func requestWithAuthCtx(method, target string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, target, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "admin@test.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(req.Context(), auth)
	return req.WithContext(ctx)
}

// parseErrorResponse parses the standard error envelope.
func parseErrorResponse(t *testing.T, w *httptest.ResponseRecorder) types.Response {
	t.Helper()
	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return resp
}

// assertUnauthorized validates a 401 response with the standard error envelope.
func assertUnauthorized(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
	resp := parseErrorResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected error code 'UNAUTHORIZED', got %q", resp.Errors[0].Code)
	}
}

// assertBadRequest validates a 400 response with the standard error envelope.
func assertBadRequest(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
	resp := parseErrorResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
	if resp.Errors[0].Code != "BAD_REQUEST" {
		t.Errorf("expected error code 'BAD_REQUEST', got %q", resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestUserHandler_ListUsers_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListUsers(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_GetUser_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.GetUser(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_UpdateUser_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodPatch, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.UpdateUser(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_DeactivateUser_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/deactivate", nil)
	w := httptest.NewRecorder()
	h.DeactivateUser(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_ReactivateUser_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/reactivate", nil)
	w := httptest.NewRecorder()
	h.ReactivateUser(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_AssignRole_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/roles", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.AssignRole(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_RevokeRole_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String()+"/roles/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.RevokeRole(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_GetDelegations_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/delegations", nil)
	w := httptest.NewRecorder()
	h.GetDelegations(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_CreateDelegation_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/delegations", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.CreateDelegation(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_RevokeDelegation_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String()+"/delegations/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.RevokeDelegation(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_SearchUsers_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodGet, "/search?q=test", nil)
	w := httptest.NewRecorder()
	h.SearchUsers(w, req)
	assertUnauthorized(t, w)
}

func TestUserHandler_GetUserStats_NoAuth(t *testing.T) {
	h := newTestUserHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()
	h.GetUserStats(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests — invalid UUIDs yield 400
// ──────────────────────────────────────────────

func TestUserHandler_GetUser_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.GetUser)

	req := requestWithAuthCtx(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_UpdateUser_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateUser)

	req := requestWithAuthCtx(http.MethodPatch, "/not-a-uuid", `{"displayName":"test"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_UpdateUser_InvalidBody(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateUser)

	req := requestWithAuthCtx(http.MethodPatch, "/"+uuid.New().String(), `{invalid json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_DeactivateUser_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Post("/{id}/deactivate", h.DeactivateUser)

	req := requestWithAuthCtx(http.MethodPost, "/bad-id/deactivate", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_ReactivateUser_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Post("/{id}/reactivate", h.ReactivateUser)

	req := requestWithAuthCtx(http.MethodPost, "/bad-id/reactivate", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_AssignRole_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Post("/{id}/roles", h.AssignRole)

	req := requestWithAuthCtx(http.MethodPost, "/bad-id/roles", `{"roleId":"` + uuid.New().String() + `"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_AssignRole_InvalidBody(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Post("/{id}/roles", h.AssignRole)

	req := requestWithAuthCtx(http.MethodPost, "/"+uuid.New().String()+"/roles", `{not valid}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_RevokeRole_InvalidUserID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Delete("/{id}/roles/{bindingId}", h.RevokeRole)

	req := requestWithAuthCtx(http.MethodDelete, "/bad-id/roles/"+uuid.New().String(), "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_RevokeRole_InvalidBindingID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Delete("/{id}/roles/{bindingId}", h.RevokeRole)

	req := requestWithAuthCtx(http.MethodDelete, "/"+uuid.New().String()+"/roles/bad-binding", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_GetDelegations_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Get("/{id}/delegations", h.GetDelegations)

	req := requestWithAuthCtx(http.MethodGet, "/bad-id/delegations", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_CreateDelegation_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Post("/{id}/delegations", h.CreateDelegation)

	req := requestWithAuthCtx(http.MethodPost, "/bad-id/delegations", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_CreateDelegation_InvalidBody(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Post("/{id}/delegations", h.CreateDelegation)

	req := requestWithAuthCtx(http.MethodPost, "/"+uuid.New().String()+"/delegations", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestUserHandler_RevokeDelegation_InvalidUUID(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	r.Delete("/{id}/delegations/{delegationId}", h.RevokeDelegation)

	req := requestWithAuthCtx(http.MethodDelete, "/"+uuid.New().String()+"/delegations/bad-delegation", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// SearchUsers with auth + empty query returns 200
// ──────────────────────────────────────────────

func TestUserHandler_SearchUsers_EmptyQuery(t *testing.T) {
	h := newTestUserHandler()
	req := requestWithAuthCtx(http.MethodGet, "/search", "")
	w := httptest.NewRecorder()
	h.SearchUsers(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for empty search query, got %d", w.Code)
	}
	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != "success" {
		t.Errorf("expected status 'success', got %q", resp.Status)
	}
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestUserHandler_RouteRegistration(t *testing.T) {
	h := newTestUserHandler()

	r := chi.NewRouter()
	// Recovery middleware to catch panics from nil pool in service calls.
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					// Panic means the route was found and handler executed — write 500.
					w.WriteHeader(http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, req)
		})
	})
	// Inject a permissive auth context for all requests so permission middleware passes.
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
	r.Route("/users", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name           string
		method         string
		path           string
		body           string
		wantNotStatus  int // must NOT be this status (404 or 405 means route not registered)
	}{
		{"ListUsers", http.MethodGet, "/users/", "", http.StatusNotFound},
		{"SearchUsers", http.MethodGet, "/users/search", "", http.StatusNotFound},
		{"GetUserStats", http.MethodGet, "/users/stats", "", http.StatusNotFound},
		{"GetUser", http.MethodGet, "/users/" + validUUID, "", http.StatusNotFound},
		{"UpdateUser", http.MethodPatch, "/users/" + validUUID, `{}`, http.StatusNotFound},
		{"DeactivateUser", http.MethodPost, "/users/" + validUUID + "/deactivate", "", http.StatusNotFound},
		{"ReactivateUser", http.MethodPost, "/users/" + validUUID + "/reactivate", "", http.StatusNotFound},
		{"AssignRole", http.MethodPost, "/users/" + validUUID + "/roles", `{"roleId":"` + uuid.New().String() + `"}`, http.StatusNotFound},
		{"RevokeRole", http.MethodDelete, "/users/" + validUUID + "/roles/" + uuid.New().String(), "", http.StatusNotFound},
		{"GetDelegations", http.MethodGet, "/users/" + validUUID + "/delegations", "", http.StatusNotFound},
		{"CreateDelegation", http.MethodPost, "/users/" + validUUID + "/delegations", `{}`, http.StatusNotFound},
		{"RevokeDelegation", http.MethodDelete, "/users/" + validUUID + "/delegations/" + uuid.New().String(), "", http.StatusNotFound},
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

			if w.Code == tt.wantNotStatus {
				t.Errorf("route %s %s returned %d — route not registered", tt.method, tt.path, w.Code)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 — method not allowed", tt.method, tt.path)
			}
		})
	}
}

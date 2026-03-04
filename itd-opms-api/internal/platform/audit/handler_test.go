package audit

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// withAuth returns a new request whose context carries the given AuthContext.
func withAuth(r *http.Request, auth *types.AuthContext) *http.Request {
	ctx := types.SetAuthContext(r.Context(), auth)
	return r.WithContext(ctx)
}

// testAuth returns a simple AuthContext for use in tests.
func testAuth() *types.AuthContext {
	return &types.AuthContext{
		UserID:      uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
		TenantID:    uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
		Email:       "user@example.com",
		DisplayName: "Test User",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
}

// setupRouter creates a chi router with the audit handler mounted.
// The service pointer is nil; tests that hit service methods will error,
// but that is expected and tested via 500 status codes.
func setupRouter(h *AuditHandler) *chi.Mux {
	r := chi.NewRouter()
	h.Routes(r)
	return r
}

// decodeResponse parses the standard API response envelope from a recorder.
func decodeResponse(t *testing.T, w *httptest.ResponseRecorder) types.Response {
	t.Helper()
	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return resp
}

// ──────────────────────────────────────────────
// listEvents — GET /events
// ──────────────────────────────────────────────

func TestListEvents_Unauthorized(t *testing.T) {
	h := NewAuditHandler(nil) // nil service — auth check happens first
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}

	resp := decodeResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status field 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected error code UNAUTHORIZED, got %q", resp.Errors[0].Code)
	}
}

func TestListEvents_UnauthorizedResponseBody(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	resp := decodeResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status field 'error', got %q", resp.Status)
	}
	if len(resp.Errors) != 1 {
		t.Fatalf("expected exactly 1 error detail, got %d", len(resp.Errors))
	}
	if resp.Errors[0].Message != "authentication required" {
		t.Errorf("expected message 'authentication required', got %q", resp.Errors[0].Message)
	}
}

func TestListEvents_ContentType(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
}

// ──────────────────────────────────────────────
// getEvent — GET /events/{eventID}
// ──────────────────────────────────────────────

func TestGetEvent_Unauthorized(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	eventID := uuid.New().String()
	req := httptest.NewRequest(http.MethodGet, "/events/"+eventID, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestGetEvent_InvalidID(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/events/not-a-uuid", nil)
	req = withAuth(req, testAuth())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for invalid UUID, got %d", w.Code)
	}

	resp := decodeResponse(t, w)
	if len(resp.Errors) == 0 {
		t.Fatal("expected error details for bad request")
	}
	if resp.Errors[0].Code != "BAD_REQUEST" {
		t.Errorf("expected error code BAD_REQUEST, got %q", resp.Errors[0].Code)
	}
}

func TestGetEvent_InvalidID_EmptyString(t *testing.T) {
	// An empty eventID in the URL path is a route mismatch in chi,
	// but "abc" is a deterministic invalid UUID.
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	invalidIDs := []struct {
		name string
		id   string
	}{
		{"short string", "abc"},
		{"too long", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-extra"},
		{"wrong format", "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"},
		{"numeric", "12345"},
	}

	for _, tt := range invalidIDs {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/events/"+tt.id, nil)
			req = withAuth(req, testAuth())
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for invalid UUID %q, got %d", tt.id, w.Code)
			}
		})
	}
}

func TestGetEvent_Unauthorized_ResponseBody(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	eventID := uuid.New().String()
	req := httptest.NewRequest(http.MethodGet, "/events/"+eventID, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	resp := decodeResponse(t, w)
	if len(resp.Errors) == 0 {
		t.Fatal("expected error details")
	}
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected UNAUTHORIZED, got %q", resp.Errors[0].Code)
	}
	if resp.Errors[0].Message != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", resp.Errors[0].Message)
	}
}

// ──────────────────────────────────────────────
// verifyIntegrity — GET /verify
// ──────────────────────────────────────────────

func TestVerifyIntegrity_Unauthorized(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/verify", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestVerifyIntegrity_Unauthorized_ResponseBody(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/verify", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	resp := decodeResponse(t, w)
	if len(resp.Errors) == 0 {
		t.Fatal("expected error details")
	}
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected UNAUTHORIZED, got %q", resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// Routes registration
// ──────────────────────────────────────────────

func TestRoutes_MethodNotAllowed(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	// POST /events should not match any route — chi returns 405.
	req := httptest.NewRequest(http.MethodPost, "/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 for POST /events, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Auth context helpers (sanity checks)
// ──────────────────────────────────────────────

func TestWithAuthSetsContext(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	auth := testAuth()
	req = withAuth(req, auth)

	got := types.GetAuthContext(req.Context())
	if got == nil {
		t.Fatal("expected auth context to be set")
	}
	if got.UserID != auth.UserID {
		t.Errorf("expected UserID %s, got %s", auth.UserID, got.UserID)
	}
	if got.TenantID != auth.TenantID {
		t.Errorf("expected TenantID %s, got %s", auth.TenantID, got.TenantID)
	}
}

func TestNoAuthContext_ReturnsNil(t *testing.T) {
	ctx := context.Background()
	if got := types.GetAuthContext(ctx); got != nil {
		t.Errorf("expected nil auth context from bare context, got %+v", got)
	}
}

// ──────────────────────────────────────────────
// Table-driven: all unauthenticated endpoints
// ──────────────────────────────────────────────

func TestAllEndpoints_Unauthenticated(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	tests := []struct {
		name   string
		method string
		path   string
	}{
		{"listEvents", http.MethodGet, "/events"},
		{"getEvent", http.MethodGet, "/events/" + uuid.New().String()},
		{"verifyIntegrity", http.MethodGet, "/verify"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s %s: expected 401, got %d", tt.method, tt.path, w.Code)
			}

			resp := decodeResponse(t, w)
			if resp.Status != "error" {
				t.Errorf("expected status 'error', got %q", resp.Status)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Table-driven: JSON content type for all error responses
// ──────────────────────────────────────────────

func TestAllEndpoints_ResponseIsJSON(t *testing.T) {
	h := NewAuditHandler(nil)
	router := setupRouter(h)

	tests := []struct {
		name string
		path string
	}{
		{"listEvents", "/events"},
		{"getEvent", "/events/" + uuid.New().String()},
		{"verifyIntegrity", "/verify"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			ct := w.Header().Get("Content-Type")
			if ct != "application/json" {
				t.Errorf("expected Content-Type application/json, got %q", ct)
			}
		})
	}
}

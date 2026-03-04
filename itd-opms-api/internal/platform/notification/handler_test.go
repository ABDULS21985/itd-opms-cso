package notification

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Helper: create a handler with nil service (for auth-guard tests only)
// ──────────────────────────────────────────────

func newTestHandler() *Handler {
	// Service is nil; only auth-guard paths are safe to exercise.
	return NewHandler(nil)
}

// setAuthCtx returns a new request whose context carries the given AuthContext.
func setAuthCtx(r *http.Request, auth *types.AuthContext) *http.Request {
	ctx := types.SetAuthContext(r.Context(), auth)
	return r.WithContext(ctx)
}

// decodeResponse is a small helper to unmarshal the standard API envelope.
func decodeResponse(t *testing.T, w *httptest.ResponseRecorder) types.Response {
	t.Helper()
	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return resp
}

// ──────────────────────────────────────────────
// ListNotifications
// ──────────────────────────────────────────────

func TestListNotifications_Unauthorized(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListNotifications(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}

	resp := decodeResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected error code UNAUTHORIZED, got %q", resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// GetUnreadCount
// ──────────────────────────────────────────────

func TestGetUnreadCount_Unauthorized(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/unread-count", nil)
	w := httptest.NewRecorder()

	h.GetUnreadCount(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}

	resp := decodeResponse(t, w)
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected UNAUTHORIZED, got %q", resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// MarkAsRead
// ──────────────────────────────────────────────

func TestMarkAsRead_Unauthorized(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/read", nil)
	w := httptest.NewRecorder()

	h.MarkAsRead(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestMarkAsRead_InvalidID(t *testing.T) {
	h := newTestHandler()

	// Use a chi router to set URL params correctly.
	r := chi.NewRouter()
	r.Post("/{id}/read", h.MarkAsRead)

	req := httptest.NewRequest(http.MethodPost, "/not-a-uuid/read", nil)
	req = setAuthCtx(req, &types.AuthContext{
		UserID:   uuid.New(),
		TenantID: uuid.New(),
		Email:    "test@example.com",
	})
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	resp := decodeResponse(t, w)
	if resp.Errors[0].Code != "BAD_REQUEST" {
		t.Errorf("expected BAD_REQUEST, got %q", resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// MarkAllAsRead
// ──────────────────────────────────────────────

func TestMarkAllAsRead_Unauthorized(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/read-all", nil)
	w := httptest.NewRecorder()

	h.MarkAllAsRead(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// GetPreferences
// ──────────────────────────────────────────────

func TestGetPreferences_Unauthorized(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/preferences", nil)
	w := httptest.NewRecorder()

	h.GetPreferences(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// UpdatePreferences
// ──────────────────────────────────────────────

func TestUpdatePreferences_Unauthorized(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/preferences", nil)
	w := httptest.NewRecorder()

	h.UpdatePreferences(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestUpdatePreferences_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/preferences", strings.NewReader("not-json"))
	req = setAuthCtx(req, &types.AuthContext{
		UserID:   uuid.New(),
		TenantID: uuid.New(),
		Email:    "test@example.com",
	})
	w := httptest.NewRecorder()

	h.UpdatePreferences(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	resp := decodeResponse(t, w)
	if resp.Errors[0].Code != "BAD_REQUEST" {
		t.Errorf("expected BAD_REQUEST, got %q", resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// Routes registration
// ──────────────────────────────────────────────

func TestRoutes_AllEndpointsRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Route("/notifications", func(r chi.Router) {
		h.Routes(r)
	})

	// All endpoints should return 401 (no auth context) rather than 404/405.
	tests := []struct {
		name   string
		method string
		path   string
		want   int
	}{
		{"list notifications", http.MethodGet, "/notifications/", http.StatusUnauthorized},
		{"unread count", http.MethodGet, "/notifications/unread-count", http.StatusUnauthorized},
		{"mark as read", http.MethodPost, "/notifications/" + uuid.New().String() + "/read", http.StatusUnauthorized},
		{"mark all as read", http.MethodPost, "/notifications/read-all", http.StatusUnauthorized},
		{"get preferences", http.MethodGet, "/notifications/preferences", http.StatusUnauthorized},
		{"update preferences", http.MethodPut, "/notifications/preferences", http.StatusUnauthorized},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tc.want {
				t.Errorf("expected status %d for %s %s, got %d", tc.want, tc.method, tc.path, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// writeAppError
// ──────────────────────────────────────────────

func TestWriteAppError_GenericError(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	writeAppError(w, req, &testError{msg: "something went wrong"})

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500 for generic error, got %d", w.Code)
	}

	resp := decodeResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
	if resp.Errors[0].Code != "INTERNAL_ERROR" {
		t.Errorf("expected INTERNAL_ERROR, got %q", resp.Errors[0].Code)
	}
}

// testError is a minimal error for testing writeAppError.
type testError struct {
	msg string
}

func (e *testError) Error() string { return e.msg }

// ──────────────────────────────────────────────
// NewHandler constructor
// ──────────────────────────────────────────────

func TestNewHandler_ReturnsNonNil(t *testing.T) {
	h := NewHandler(nil)
	if h == nil {
		t.Fatal("expected non-nil Handler")
	}
}

// ──────────────────────────────────────────────
// Response content-type
// ──────────────────────────────────────────────

func TestHandler_ResponseContentType(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListNotifications(w, req)

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
}

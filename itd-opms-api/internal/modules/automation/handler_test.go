package automation

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

func newTestHandler() *Handler {
	return NewHandler(nil, nil)
}

func requestWithAuth(method, target string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, target, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	authCtx := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@test.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(req.Context(), authCtx)
	return req.WithContext(ctx)
}

// ══════════════════════════════════════════════
// Rule handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestListRules_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/rules", nil)
	w := httptest.NewRecorder()

	h.ListRules(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetRule_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/rules/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetRule(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCreateRule_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"name":"rule","triggerType":"event"}`
	req := httptest.NewRequest(http.MethodPost, "/rules", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateRule(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUpdateRule_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/rules/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateRule(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDeleteRule_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/rules/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteRule(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestToggleRule_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/rules/"+uuid.New().String()+"/toggle", nil)
	w := httptest.NewRecorder()

	h.ToggleRule(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTestRule_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"entityType":"ticket","entityId":"11111111-1111-1111-1111-111111111111"}`
	req := httptest.NewRequest(http.MethodPost, "/rules/"+uuid.New().String()+"/test", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.TestRule(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestListRuleExecutions_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/rules/"+uuid.New().String()+"/executions", nil)
	w := httptest.NewRecorder()

	h.ListRuleExecutions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestListAllExecutions_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/executions", nil)
	w := httptest.NewRecorder()

	h.ListAllExecutions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetStats_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()

	h.GetStats(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Input validation (400)
// ══════════════════════════════════════════════

func TestGetRule_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetRule)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestUpdateRule_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateRule)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDeleteRule_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteRule)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestToggleRule_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/toggle", h.ToggleRule)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/toggle", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestCreateRule_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/rules", "not-json")
	w := httptest.NewRecorder()

	h.CreateRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestCreateRule_MissingName(t *testing.T) {
	h := newTestHandler()
	body := `{"triggerType":"event"}`
	req := requestWithAuth(http.MethodPost, "/rules", body)
	w := httptest.NewRecorder()

	h.CreateRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestCreateRule_MissingTriggerType(t *testing.T) {
	h := newTestHandler()
	body := `{"name":"rule"}`
	req := requestWithAuth(http.MethodPost, "/rules", body)
	w := httptest.NewRecorder()

	h.CreateRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing triggerType, got %d", w.Code)
	}
}

func TestTestRule_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/test", h.TestRule)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/test", `{"entityType":"ticket","entityId":"11111111-1111-1111-1111-111111111111"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestTestRule_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/test", h.TestRule)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/test", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestTestRule_MissingEntityType(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/test", h.TestRule)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/test", `{"entityId":"11111111-1111-1111-1111-111111111111"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing entityType, got %d", w.Code)
	}
}

func TestTestRule_MissingEntityID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/test", h.TestRule)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/test", `{"entityType":"ticket"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing entityId, got %d", w.Code)
	}
}

func TestListRuleExecutions_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}/executions", h.ListRuleExecutions)

	req := requestWithAuth(http.MethodGet, "/bad-uuid/executions", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Route registration
// ══════════════════════════════════════════════

func TestHandler_RoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/rules/"},
		{http.MethodPost, "/rules/"},
		{http.MethodGet, "/rules/" + uuid.New().String()},
		{http.MethodPut, "/rules/" + uuid.New().String()},
		{http.MethodDelete, "/rules/" + uuid.New().String()},
		{http.MethodPost, "/rules/" + uuid.New().String() + "/toggle"},
		{http.MethodPost, "/rules/" + uuid.New().String() + "/test"},
		{http.MethodGet, "/rules/" + uuid.New().String() + "/executions"},
		{http.MethodGet, "/executions"},
		{http.MethodGet, "/stats"},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned %d, expected route to be registered", tt.method, tt.path, w.Code)
			}
		})
	}
}

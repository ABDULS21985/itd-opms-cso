package customfields

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
// Definition handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestListDefinitions_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/definitions?entityType=ticket", nil)
	w := httptest.NewRecorder()

	h.ListDefinitions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/definitions/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCreateDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"entityType":"ticket","fieldLabel":"Dept","fieldType":"text"}`
	req := httptest.NewRequest(http.MethodPost, "/definitions", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUpdateDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/definitions/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDeleteDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/definitions/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestReorderDefinitions_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"items":[{"id":"11111111-1111-1111-1111-111111111111","displayOrder":1}]}`
	req := httptest.NewRequest(http.MethodPost, "/definitions/reorder?entityType=ticket", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ReorderDefinitions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Entity value handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestGetValues_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/entity/ticket/"+uuid.New().String()+"/values", nil)
	w := httptest.NewRecorder()

	h.GetValues(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUpdateValues_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"cf_region":"APAC"}`
	req := httptest.NewRequest(http.MethodPut, "/entity/ticket/"+uuid.New().String()+"/values", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.UpdateValues(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Input validation (400)
// ══════════════════════════════════════════════

func TestListDefinitions_MissingEntityType(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/definitions", "")
	w := httptest.NewRecorder()

	h.ListDefinitions(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing entityType, got %d", w.Code)
	}
}

func TestGetDefinition_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetDefinition)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestUpdateDefinition_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateDefinition)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDeleteDefinition_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteDefinition)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestCreateDefinition_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/definitions", "not-json")
	w := httptest.NewRecorder()

	h.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestCreateDefinition_MissingFieldLabel(t *testing.T) {
	h := newTestHandler()
	body := `{"entityType":"ticket","fieldType":"text"}`
	req := requestWithAuth(http.MethodPost, "/definitions", body)
	w := httptest.NewRecorder()

	h.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing fieldLabel, got %d", w.Code)
	}
}

func TestCreateDefinition_MissingEntityType(t *testing.T) {
	h := newTestHandler()
	body := `{"fieldLabel":"Region","fieldType":"text"}`
	req := requestWithAuth(http.MethodPost, "/definitions", body)
	w := httptest.NewRecorder()

	h.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing entityType, got %d", w.Code)
	}
}

func TestCreateDefinition_MissingFieldType(t *testing.T) {
	h := newTestHandler()
	body := `{"entityType":"ticket","fieldLabel":"Region"}`
	req := requestWithAuth(http.MethodPost, "/definitions", body)
	w := httptest.NewRecorder()

	h.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing fieldType, got %d", w.Code)
	}
}

func TestReorderDefinitions_MissingEntityType(t *testing.T) {
	h := newTestHandler()
	body := `{"items":[{"id":"11111111-1111-1111-1111-111111111111","displayOrder":1}]}`
	req := requestWithAuth(http.MethodPost, "/definitions/reorder", body)
	w := httptest.NewRecorder()

	h.ReorderDefinitions(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing entityType, got %d", w.Code)
	}
}

func TestReorderDefinitions_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/definitions/reorder?entityType=ticket", "not-json")
	w := httptest.NewRecorder()

	h.ReorderDefinitions(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestReorderDefinitions_EmptyItems(t *testing.T) {
	h := newTestHandler()
	body := `{"items":[]}`
	req := requestWithAuth(http.MethodPost, "/definitions/reorder?entityType=ticket", body)
	w := httptest.NewRecorder()

	h.ReorderDefinitions(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty items, got %d", w.Code)
	}
}

func TestGetValues_InvalidEntityID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{entityType}/{entityId}/values", h.GetValues)

	req := requestWithAuth(http.MethodGet, "/ticket/not-a-uuid/values", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid entity ID, got %d", w.Code)
	}
}

func TestUpdateValues_InvalidEntityID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{entityType}/{entityId}/values", h.UpdateValues)

	req := requestWithAuth(http.MethodPut, "/ticket/not-a-uuid/values", `{"cf_x":"val"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid entity ID, got %d", w.Code)
	}
}

func TestUpdateValues_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{entityType}/{entityId}/values", h.UpdateValues)

	req := requestWithAuth(http.MethodPut, "/ticket/"+uuid.New().String()+"/values", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
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
		// Definitions
		{http.MethodGet, "/definitions/"},
		{http.MethodPost, "/definitions/"},
		{http.MethodPost, "/definitions/reorder"},
		{http.MethodGet, "/definitions/" + uuid.New().String()},
		{http.MethodPut, "/definitions/" + uuid.New().String()},
		{http.MethodDelete, "/definitions/" + uuid.New().String()},
		// Entity values
		{http.MethodGet, "/entity/ticket/" + uuid.New().String() + "/values"},
		{http.MethodPut, "/entity/ticket/" + uuid.New().String() + "/values"},
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

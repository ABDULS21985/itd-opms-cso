package planning

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestPIRHandler() *PIRHandler {
	return NewPIRHandler(nil)
}

// ──────────────────────────────────────────────
// PIRHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestPIRHandler_List_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.List(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_Create_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	w := httptest.NewRecorder()

	h.Create(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_Get_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodGet, "/00000000-0000-0000-0000-000000000001", nil)
	w := httptest.NewRecorder()

	h.Get(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_Update_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodPut, "/00000000-0000-0000-0000-000000000001", nil)
	w := httptest.NewRecorder()

	h.Update(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_Complete_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodPost, "/00000000-0000-0000-0000-000000000001/complete", nil)
	w := httptest.NewRecorder()

	h.Complete(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_Delete_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodDelete, "/00000000-0000-0000-0000-000000000001", nil)
	w := httptest.NewRecorder()

	h.Delete(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_Stats_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()

	h.Stats(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_ListTemplates_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodGet, "/templates", nil)
	w := httptest.NewRecorder()

	h.ListTemplates(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPIRHandler_CreateTemplate_NoAuth(t *testing.T) {
	h := newTestPIRHandler()
	req := httptest.NewRequest(http.MethodPost, "/templates", nil)
	w := httptest.NewRecorder()

	h.CreateTemplate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// PIRHandler — invalid ID (400)
// ──────────────────────────────────────────────

func TestPIRHandler_Get_InvalidID(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.Get)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPIRHandler_Update_InvalidID(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.Update)

	req := requestWithAuth(http.MethodPut, "/not-a-uuid", `{"title":"Updated"}`)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPIRHandler_Complete_InvalidID(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	r.Post("/{id}/complete", h.Complete)

	req := requestWithAuth(http.MethodPost, "/not-a-uuid/complete", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPIRHandler_Delete_InvalidID(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	r.Delete("/{id}", h.Delete)

	req := requestWithAuth(http.MethodDelete, "/not-a-uuid", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// PIRHandler — invalid body (400)
// ──────────────────────────────────────────────

func TestPIRHandler_Create_InvalidBody(t *testing.T) {
	h := newTestPIRHandler()

	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.Create(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPIRHandler_Create_MissingTitle(t *testing.T) {
	h := newTestPIRHandler()

	req := requestWithAuth(http.MethodPost, "/", `{"projectId":"00000000-0000-0000-0000-000000000001"}`)
	w := httptest.NewRecorder()

	h.Create(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPIRHandler_Update_InvalidBody(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.Update)

	req := requestWithAuth(http.MethodPut, "/00000000-0000-0000-0000-000000000001", "not-json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPIRHandler_CreateTemplate_InvalidBody(t *testing.T) {
	h := newTestPIRHandler()

	req := requestWithAuth(http.MethodPost, "/templates", "not-json")
	w := httptest.NewRecorder()

	h.CreateTemplate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPIRHandler_CreateTemplate_MissingName(t *testing.T) {
	h := newTestPIRHandler()

	req := requestWithAuth(http.MethodPost, "/templates", `{"reviewType":"project"}`)
	w := httptest.NewRecorder()

	h.CreateTemplate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// PIRHandler — route registration
// ──────────────────────────────────────────────

func TestPIRHandler_Routes_List(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	// Use unauthenticated request: middleware returns 401, proving the route is registered.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route GET / not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_Create(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route POST / not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_Get(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodGet, "/00000000-0000-0000-0000-000000000001", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route GET /{id} not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_Update(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodPut, "/00000000-0000-0000-0000-000000000001", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route PUT /{id} not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_Complete(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodPost, "/00000000-0000-0000-0000-000000000001/complete", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route POST /{id}/complete not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_Delete(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodDelete, "/00000000-0000-0000-0000-000000000001", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route DELETE /{id} not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_Stats(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route GET /stats not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_ListTemplates(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodGet, "/templates", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route GET /templates not registered: got %d", w.Code)
	}
}

func TestPIRHandler_Routes_CreateTemplate(t *testing.T) {
	h := newTestPIRHandler()

	r := chi.NewRouter()
	h.Routes(r)

	req := httptest.NewRequest(http.MethodPost, "/templates", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route POST /templates not registered: got %d", w.Code)
	}
}

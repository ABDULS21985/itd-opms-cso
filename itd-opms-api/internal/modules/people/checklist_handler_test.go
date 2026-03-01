package people

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// ChecklistHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestChecklistHandler_ListChecklistTemplates_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/templates", nil)
	w := httptest.NewRecorder()

	h.checklist.ListChecklistTemplates(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_GetChecklistTemplate_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/templates/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.checklist.GetChecklistTemplate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklistTemplate_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"type":"onboarding","name":"Dev Onboarding"}`
	req := httptest.NewRequest(http.MethodPost, "/templates", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.checklist.CreateChecklistTemplate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistTemplate_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/templates/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.checklist.UpdateChecklistTemplate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_DeleteChecklistTemplate_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/templates/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.checklist.DeleteChecklistTemplate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_ListChecklists_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.checklist.ListChecklists(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_GetChecklist_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.checklist.GetChecklist(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklist_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","type":"onboarding"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.checklist.CreateChecklist(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistStatus_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"status":"completed"}`
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String()+"/status", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.checklist.UpdateChecklistStatus(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_DeleteChecklist_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.checklist.DeleteChecklist(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_ListChecklistTasks_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/tasks/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.checklist.ListChecklistTasks(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklistTask_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"checklistId":"11111111-1111-1111-1111-111111111111","title":"Setup IDE"}`
	req := httptest.NewRequest(http.MethodPost, "/tasks", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.checklist.CreateChecklistTask(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_GetChecklistTask_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/tasks/item/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.checklist.GetChecklistTask(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistTask_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/tasks/item/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.checklist.UpdateChecklistTask(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_CompleteChecklistTask_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/tasks/item/"+uuid.New().String()+"/complete", strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.checklist.CompleteChecklistTask(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestChecklistHandler_DeleteChecklistTask_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/tasks/item/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.checklist.DeleteChecklistTask(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// ChecklistHandler — input validation (400)
// ──────────────────────────────────────────────

func TestChecklistHandler_GetChecklistTemplate_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.checklist.GetChecklistTemplate)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistTemplate_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.checklist.UpdateChecklistTemplate)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"name":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_DeleteChecklistTemplate_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.checklist.DeleteChecklistTemplate)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklistTemplate_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/templates", "not-json")
	w := httptest.NewRecorder()

	h.checklist.CreateChecklistTemplate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklistTemplate_MissingNameAndType(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/templates", `{"roleType":"developer"}`)
	w := httptest.NewRecorder()

	h.checklist.CreateChecklistTemplate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name and type, got %d", w.Code)
	}
}

func TestChecklistHandler_GetChecklist_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.checklist.GetChecklist)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklist_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.checklist.CreateChecklist(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklist_MissingType(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.checklist.CreateChecklist(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing type, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistStatus_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.checklist.UpdateChecklistStatus)

	req := requestWithAuth(http.MethodPut, "/bad-uuid/status", `{"status":"completed"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistStatus_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.checklist.UpdateChecklistStatus)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/status", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistStatus_MissingStatus(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.checklist.UpdateChecklistStatus)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/status", `{"completionPct":50}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing status, got %d", w.Code)
	}
}

func TestChecklistHandler_DeleteChecklist_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.checklist.DeleteChecklist)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_ListChecklistTasks_InvalidChecklistID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{checklistId}", h.checklist.ListChecklistTasks)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid checklist ID, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklistTask_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/tasks", "not-json")
	w := httptest.NewRecorder()

	h.checklist.CreateChecklistTask(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestChecklistHandler_CreateChecklistTask_MissingTitle(t *testing.T) {
	h := newTestHandler()
	body := `{"checklistId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPost, "/tasks", body)
	w := httptest.NewRecorder()

	h.checklist.CreateChecklistTask(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestChecklistHandler_GetChecklistTask_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.checklist.GetChecklistTask)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_UpdateChecklistTask_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.checklist.UpdateChecklistTask)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_CompleteChecklistTask_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/complete", h.checklist.CompleteChecklistTask)

	req := requestWithAuth(http.MethodPut, "/bad-uuid/complete", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_DeleteChecklistTask_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.checklist.DeleteChecklistTask)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestChecklistHandler_ListChecklists_InvalidUserID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/?user_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.checklist.ListChecklists(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid user_id, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// ChecklistHandler — route registration
// ──────────────────────────────────────────────

func TestChecklistHandler_RoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.checklist.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		// Templates
		{http.MethodGet, "/templates"},
		{http.MethodGet, "/templates/" + uuid.New().String()},
		{http.MethodPost, "/templates"},
		{http.MethodPut, "/templates/" + uuid.New().String()},
		{http.MethodDelete, "/templates/" + uuid.New().String()},
		// Checklists
		{http.MethodGet, "/"},
		{http.MethodGet, "/" + uuid.New().String()},
		{http.MethodPost, "/"},
		{http.MethodPut, "/" + uuid.New().String() + "/status"},
		{http.MethodDelete, "/" + uuid.New().String()},
		// Tasks
		{http.MethodGet, "/tasks/" + uuid.New().String()},
		{http.MethodPost, "/tasks"},
		{http.MethodGet, "/tasks/item/" + uuid.New().String()},
		{http.MethodPut, "/tasks/item/" + uuid.New().String()},
		{http.MethodPut, "/tasks/item/" + uuid.New().String() + "/complete"},
		{http.MethodDelete, "/tasks/item/" + uuid.New().String()},
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

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
// TrainingHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestTrainingHandler_ListTrainingRecords_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/training", nil)
	w := httptest.NewRecorder()

	h.training.ListTrainingRecords(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTrainingHandler_GetExpiringCertifications_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/training/expiring", nil)
	w := httptest.NewRecorder()

	h.training.GetExpiringCertifications(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTrainingHandler_GetTrainingRecord_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/training/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.training.GetTrainingRecord(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTrainingHandler_CreateTrainingRecord_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","title":"K8s Admin","type":"certification"}`
	req := httptest.NewRequest(http.MethodPost, "/training", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.training.CreateTrainingRecord(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTrainingHandler_UpdateTrainingRecord_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/training/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.training.UpdateTrainingRecord(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTrainingHandler_DeleteTrainingRecord_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/training/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.training.DeleteTrainingRecord(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// TrainingHandler — input validation (400)
// ──────────────────────────────────────────────

func TestTrainingHandler_GetTrainingRecord_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.training.GetTrainingRecord)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestTrainingHandler_UpdateTrainingRecord_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.training.UpdateTrainingRecord)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"title":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestTrainingHandler_DeleteTrainingRecord_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.training.DeleteTrainingRecord)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestTrainingHandler_CreateTrainingRecord_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/training", "not-json")
	w := httptest.NewRecorder()

	h.training.CreateTrainingRecord(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestTrainingHandler_CreateTrainingRecord_MissingTitleAndType(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPost, "/training", body)
	w := httptest.NewRecorder()

	h.training.CreateTrainingRecord(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title and type, got %d", w.Code)
	}
}

func TestTrainingHandler_CreateTrainingRecord_MissingTitle(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","type":"course"}`
	req := requestWithAuth(http.MethodPost, "/training", body)
	w := httptest.NewRecorder()

	h.training.CreateTrainingRecord(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestTrainingHandler_CreateTrainingRecord_MissingType(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","title":"Go Basics"}`
	req := requestWithAuth(http.MethodPost, "/training", body)
	w := httptest.NewRecorder()

	h.training.CreateTrainingRecord(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing type, got %d", w.Code)
	}
}

func TestTrainingHandler_ListTrainingRecords_InvalidUserID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/training?user_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.training.ListTrainingRecords(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid user_id, got %d", w.Code)
	}
}

func TestTrainingHandler_UpdateTrainingRecord_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.training.UpdateTrainingRecord)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String(), "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// TrainingHandler — route registration
// ──────────────────────────────────────────────

func TestTrainingHandler_RoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.training.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/"},
		{http.MethodGet, "/expiring"},
		{http.MethodGet, "/" + uuid.New().String()},
		{http.MethodPost, "/"},
		{http.MethodPut, "/" + uuid.New().String()},
		{http.MethodDelete, "/" + uuid.New().String()},
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

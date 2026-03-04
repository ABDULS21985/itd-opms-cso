package planning

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestRiskHandler() *RiskHandler {
	return NewRiskHandler(nil)
}

// ──────────────────────────────────────────────
// Risk endpoints — auth guard (401)
// ──────────────────────────────────────────────

func TestRiskHandler_ListRisks_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListRisks(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_CreateRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"title":"Risk","likelihood":"high","impact":"high"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateRisk(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_GetRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetRisk(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_UpdateRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateRisk(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_DeleteRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteRisk(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Issue endpoints — auth guard (401)
// ──────────────────────────────────────────────

func TestRiskHandler_ListIssues_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListIssues(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_CreateIssue_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"title":"Issue","severity":"high"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateIssue(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_GetIssue_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetIssue(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_UpdateIssue_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateIssue(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_EscalateIssue_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"escalatedToId":"11111111-1111-1111-1111-111111111111"}`
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String()+"/escalate", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.EscalateIssue(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_DeleteIssue_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteIssue(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Change request endpoints — auth guard (401)
// ──────────────────────────────────────────────

func TestRiskHandler_ListChangeRequests_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListChangeRequests(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_CreateChangeRequest_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"title":"Change"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateChangeRequest(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_GetChangeRequest_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetChangeRequest(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_UpdateChangeRequest_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateChangeRequest(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_UpdateChangeRequestStatus_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"status":"approved"}`
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String()+"/status", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.UpdateChangeRequestStatus(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRiskHandler_DeleteChangeRequest_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteChangeRequest(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Risk endpoints — input validation
// ──────────────────────────────────────────────

func TestRiskHandler_GetRisk_InvalidID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetRisk)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRiskHandler_UpdateRisk_InvalidID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateRisk)

	req := requestWithAuth(http.MethodPut, "/bad-id", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRiskHandler_DeleteRisk_InvalidID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteRisk)

	req := requestWithAuth(http.MethodDelete, "/bad-id", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRiskHandler_CreateRisk_InvalidBody(t *testing.T) {
	h := newTestRiskHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.CreateRisk(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestRiskHandler_CreateRisk_MissingTitle(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"likelihood":"high","impact":"high"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateRisk(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Issue endpoints — input validation
// ──────────────────────────────────────────────

func TestRiskHandler_GetIssue_InvalidID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetIssue)

	req := requestWithAuth(http.MethodGet, "/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRiskHandler_CreateIssue_InvalidBody(t *testing.T) {
	h := newTestRiskHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.CreateIssue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestRiskHandler_CreateIssue_MissingTitle(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"severity":"high"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateIssue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestRiskHandler_EscalateIssue_InvalidID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Put("/{id}/escalate", h.EscalateIssue)

	body := `{"escalatedToId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPut, "/bad-id/escalate", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRiskHandler_EscalateIssue_InvalidBody(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Put("/{id}/escalate", h.EscalateIssue)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/escalate", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRiskHandler_EscalateIssue_MissingEscalatedToID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Put("/{id}/escalate", h.EscalateIssue)

	body := `{}`
	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/escalate", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing escalatedToId, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Change request endpoints — input validation
// ──────────────────────────────────────────────

func TestRiskHandler_GetChangeRequest_InvalidID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetChangeRequest)

	req := requestWithAuth(http.MethodGet, "/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRiskHandler_CreateChangeRequest_InvalidBody(t *testing.T) {
	h := newTestRiskHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.CreateChangeRequest(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestRiskHandler_CreateChangeRequest_MissingTitle(t *testing.T) {
	h := newTestRiskHandler()
	body := `{"description":"test"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateChangeRequest(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestRiskHandler_UpdateChangeRequestStatus_InvalidID(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.UpdateChangeRequestStatus)

	body := `{"status":"approved"}`
	req := requestWithAuth(http.MethodPut, "/bad/status", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRiskHandler_UpdateChangeRequestStatus_EmptyStatus(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.UpdateChangeRequestStatus)

	body := `{"status":""}`
	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/status", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty status, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────

func TestRiskHandler_RoutesRegistered(t *testing.T) {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	h.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		// Risks
		{http.MethodGet, "/risks"},
		{http.MethodPost, "/risks"},
		{http.MethodGet, "/risks/" + uuid.New().String()},
		{http.MethodPut, "/risks/" + uuid.New().String()},
		{http.MethodDelete, "/risks/" + uuid.New().String()},
		// Issues
		{http.MethodGet, "/issues"},
		{http.MethodPost, "/issues"},
		{http.MethodGet, "/issues/" + uuid.New().String()},
		{http.MethodPut, "/issues/" + uuid.New().String()},
		{http.MethodPut, "/issues/" + uuid.New().String() + "/escalate"},
		{http.MethodDelete, "/issues/" + uuid.New().String()},
		// Change Requests
		{http.MethodGet, "/change-requests"},
		{http.MethodPost, "/change-requests"},
		{http.MethodGet, "/change-requests/" + uuid.New().String()},
		{http.MethodPut, "/change-requests/" + uuid.New().String()},
		{http.MethodPut, "/change-requests/" + uuid.New().String() + "/status"},
		{http.MethodDelete, "/change-requests/" + uuid.New().String()},
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

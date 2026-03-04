package approval

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
// Workflow definition handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestListWorkflowDefinitions_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/workflows", nil)
	w := httptest.NewRecorder()

	h.ListWorkflowDefinitions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCreateWorkflowDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"name":"WF","entityType":"ticket","steps":[]}`
	req := httptest.NewRequest(http.MethodPost, "/workflows", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateWorkflowDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetWorkflowDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/workflows/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetWorkflowDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUpdateWorkflowDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/workflows/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateWorkflowDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDeleteWorkflowDefinition_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/workflows/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteWorkflowDefinition(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Approval chain handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestStartApproval_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"entityType":"ticket","entityId":"11111111-1111-1111-1111-111111111111"}`
	req := httptest.NewRequest(http.MethodPost, "/chains", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.StartApproval(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetApprovalChain_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/chains/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetApprovalChain(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCancelChain_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/chains/"+uuid.New().String()+"/cancel", nil)
	w := httptest.NewRecorder()

	h.CancelChain(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Step action handlers — auth guard (401)
// ══════════════════════════════════════════════

func TestProcessDecision_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"decision":"approved"}`
	req := httptest.NewRequest(http.MethodPost, "/steps/"+uuid.New().String()+"/decide", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ProcessDecision(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDelegateStep_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"toUserId":"11111111-1111-1111-1111-111111111111"}`
	req := httptest.NewRequest(http.MethodPost, "/steps/"+uuid.New().String()+"/delegate", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.DelegateStep(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// My pending / entity lookup / history — auth guard (401)
// ══════════════════════════════════════════════

func TestGetMyPendingApprovals_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/my-pending", nil)
	w := httptest.NewRecorder()

	h.GetMyPendingApprovals(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCountMyPendingApprovals_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/my-pending/count", nil)
	w := httptest.NewRecorder()

	h.CountMyPendingApprovals(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetApprovalChainForEntity_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/entity/ticket/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetApprovalChainForEntity(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetApprovalHistory_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/history", nil)
	w := httptest.NewRecorder()

	h.GetApprovalHistory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Input validation (400)
// ══════════════════════════════════════════════

func TestGetWorkflowDefinition_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetWorkflowDefinition)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestUpdateWorkflowDefinition_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateWorkflowDefinition)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDeleteWorkflowDefinition_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteWorkflowDefinition)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestGetApprovalChain_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetApprovalChain)

	req := requestWithAuth(http.MethodGet, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestCancelChain_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/cancel", h.CancelChain)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/cancel", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestProcessDecision_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/decide", h.ProcessDecision)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/decide", `{"decision":"approved"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDelegateStep_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/delegate", h.DelegateStep)

	req := requestWithAuth(http.MethodPost, "/bad-uuid/delegate", `{"toUserId":"11111111-1111-1111-1111-111111111111"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestGetApprovalChainForEntity_InvalidEntityID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{entityType}/{entityId}", h.GetApprovalChainForEntity)

	req := requestWithAuth(http.MethodGet, "/ticket/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid entity ID, got %d", w.Code)
	}
}

func TestCreateWorkflowDefinition_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/workflows", "not-json")
	w := httptest.NewRecorder()

	h.CreateWorkflowDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestStartApproval_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/chains", "not-json")
	w := httptest.NewRecorder()

	h.StartApproval(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestProcessDecision_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/decide", h.ProcessDecision)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/decide", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestDelegateStep_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Post("/{id}/delegate", h.DelegateStep)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/delegate", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestUpdateWorkflowDefinition_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateWorkflowDefinition)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String(), "not-json")
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
		// Workflow definitions
		{http.MethodGet, "/workflows/"},
		{http.MethodPost, "/workflows/"},
		{http.MethodGet, "/workflows/" + uuid.New().String()},
		{http.MethodPut, "/workflows/" + uuid.New().String()},
		{http.MethodDelete, "/workflows/" + uuid.New().String()},
		// Chains
		{http.MethodPost, "/chains/"},
		{http.MethodGet, "/chains/" + uuid.New().String()},
		{http.MethodPost, "/chains/" + uuid.New().String() + "/cancel"},
		// My pending
		{http.MethodGet, "/my-pending"},
		{http.MethodGet, "/my-pending/count"},
		// Steps
		{http.MethodPost, "/steps/" + uuid.New().String() + "/decide"},
		{http.MethodPost, "/steps/" + uuid.New().String() + "/delegate"},
		// Entity lookup
		{http.MethodGet, "/entity/ticket/" + uuid.New().String()},
		// History
		{http.MethodGet, "/history"},
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

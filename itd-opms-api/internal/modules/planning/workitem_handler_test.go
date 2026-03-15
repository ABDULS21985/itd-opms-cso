package planning

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

func newTestWorkItemHandler() *WorkItemHandler {
	return NewWorkItemHandler(nil)
}

func newTestMilestoneHandler() *MilestoneHandler {
	return NewMilestoneHandler(nil)
}

// requestWithAuth creates an HTTP request with an AuthContext set.
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

// ──────────────────────────────────────────────
// WorkItemHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestWorkItemHandler_ListWorkItems_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListWorkItems(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_GetWBS_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodGet, "/wbs?project_id="+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetWBS(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_ListOverdue_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodGet, "/overdue", nil)
	w := httptest.NewRecorder()

	h.ListOverdue(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_GetStatusCounts_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodGet, "/status-counts?project_id="+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetStatusCounts(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_CreateWorkItem_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"title":"test","projectId":"11111111-1111-1111-1111-111111111111"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateWorkItem(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_GetWorkItem_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetWorkItem(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_UpdateWorkItem_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateWorkItem(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_TransitionWorkItem_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String()+"/transition", strings.NewReader(`{"status":"done"}`))
	w := httptest.NewRecorder()

	h.TransitionWorkItem(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_DeleteWorkItem_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteWorkItem(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_LogTimeEntry_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"hours":2}`
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/time-entries", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.LogTimeEntry(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_ListTimeEntries_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/time-entries", nil)
	w := httptest.NewRecorder()

	h.ListTimeEntries(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWorkItemHandler_BulkUpdate_NoAuth(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"ids":["` + uuid.New().String() + `"],"fields":{"status":"done"}}`
	req := httptest.NewRequest(http.MethodPost, "/bulk/update", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.BulkUpdate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// WorkItemHandler — input validation
// ──────────────────────────────────────────────

func TestWorkItemHandler_GetWorkItem_InvalidID(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetWorkItem)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestWorkItemHandler_UpdateWorkItem_InvalidID(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateWorkItem)

	req := requestWithAuth(http.MethodPut, "/invalid-id", `{"title":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestWorkItemHandler_DeleteWorkItem_InvalidID(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteWorkItem)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestWorkItemHandler_TransitionWorkItem_InvalidID(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Put("/{id}/transition", h.TransitionWorkItem)

	req := requestWithAuth(http.MethodPut, "/bad-uuid/transition", `{"status":"done"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestWorkItemHandler_CreateWorkItem_InvalidBody(t *testing.T) {
	h := newTestWorkItemHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.CreateWorkItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestWorkItemHandler_CreateWorkItem_MissingTitle(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"projectId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateWorkItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestWorkItemHandler_CreateWorkItem_MissingProjectID(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"title":"test"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateWorkItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing project_id, got %d", w.Code)
	}
}

func TestWorkItemHandler_TransitionWorkItem_EmptyStatus(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Put("/{id}/transition", h.TransitionWorkItem)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/transition", `{"status":""}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty status, got %d", w.Code)
	}
}

func TestWorkItemHandler_LogTimeEntry_InvalidBody(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Post("/{id}/time-entries", h.LogTimeEntry)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/time-entries", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestWorkItemHandler_LogTimeEntry_ZeroHours(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Post("/{id}/time-entries", h.LogTimeEntry)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/time-entries", `{"hours":0}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero hours, got %d", w.Code)
	}
}

func TestWorkItemHandler_LogTimeEntry_NegativeHours(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	r.Post("/{id}/time-entries", h.LogTimeEntry)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/time-entries", `{"hours":-1}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for negative hours, got %d", w.Code)
	}
}

func TestWorkItemHandler_BulkUpdate_InvalidBody(t *testing.T) {
	h := newTestWorkItemHandler()
	req := requestWithAuth(http.MethodPost, "/bulk/update", "not-json")
	w := httptest.NewRecorder()

	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestWorkItemHandler_BulkUpdate_EmptyIDs(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"ids":[],"fields":{"status":"done"}}`
	req := requestWithAuth(http.MethodPost, "/bulk/update", body)
	w := httptest.NewRecorder()

	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty ids, got %d", w.Code)
	}
}

func TestWorkItemHandler_BulkUpdate_EmptyFields(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"ids":["` + uuid.New().String() + `"],"fields":{}}`
	req := requestWithAuth(http.MethodPost, "/bulk/update", body)
	w := httptest.NewRecorder()

	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty fields, got %d", w.Code)
	}
}

func TestWorkItemHandler_BulkUpdate_DisallowedField(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"ids":["` + uuid.New().String() + `"],"fields":{"title":"new"}}`
	req := requestWithAuth(http.MethodPost, "/bulk/update", body)
	w := httptest.NewRecorder()

	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for disallowed field, got %d", w.Code)
	}
}

func TestWorkItemHandler_BulkUpdate_InvalidUUID(t *testing.T) {
	h := newTestWorkItemHandler()
	body := `{"ids":["not-a-uuid"],"fields":{"status":"done"}}`
	req := requestWithAuth(http.MethodPost, "/bulk/update", body)
	w := httptest.NewRecorder()

	h.BulkUpdate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID in ids, got %d", w.Code)
	}
}

func TestWorkItemHandler_GetWBS_MissingProjectID(t *testing.T) {
	h := newTestWorkItemHandler()
	req := requestWithAuth(http.MethodGet, "/wbs", "")
	w := httptest.NewRecorder()

	h.GetWBS(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing project_id, got %d", w.Code)
	}
}

func TestWorkItemHandler_GetWBS_InvalidProjectID(t *testing.T) {
	h := newTestWorkItemHandler()
	req := requestWithAuth(http.MethodGet, "/wbs?project_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.GetWBS(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid project_id, got %d", w.Code)
	}
}

func TestWorkItemHandler_GetStatusCounts_MissingProjectID(t *testing.T) {
	h := newTestWorkItemHandler()
	req := requestWithAuth(http.MethodGet, "/status-counts", "")
	w := httptest.NewRecorder()

	h.GetStatusCounts(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing project_id, got %d", w.Code)
	}
}

func TestWorkItemHandler_GetStatusCounts_InvalidProjectID(t *testing.T) {
	h := newTestWorkItemHandler()
	req := requestWithAuth(http.MethodGet, "/status-counts?project_id=invalid", "")
	w := httptest.NewRecorder()

	h.GetStatusCounts(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid project_id, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// MilestoneHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestMilestoneHandler_ListMilestones_NoAuth(t *testing.T) {
	h := newTestMilestoneHandler()
	req := httptest.NewRequest(http.MethodGet, "/?project_id="+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.ListMilestones(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMilestoneHandler_CreateMilestone_NoAuth(t *testing.T) {
	h := newTestMilestoneHandler()
	body := `{"title":"Phase 1","projectId":"11111111-1111-1111-1111-111111111111","targetDate":"2026-06-01T00:00:00Z"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateMilestone(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMilestoneHandler_GetMilestone_NoAuth(t *testing.T) {
	h := newTestMilestoneHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetMilestone(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMilestoneHandler_UpdateMilestone_NoAuth(t *testing.T) {
	h := newTestMilestoneHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateMilestone(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMilestoneHandler_DeleteMilestone_NoAuth(t *testing.T) {
	h := newTestMilestoneHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteMilestone(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// MilestoneHandler — input validation
// ──────────────────────────────────────────────

func TestMilestoneHandler_GetMilestone_InvalidID(t *testing.T) {
	h := newTestMilestoneHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetMilestone)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestMilestoneHandler_CreateMilestone_InvalidBody(t *testing.T) {
	h := newTestMilestoneHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.CreateMilestone(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestMilestoneHandler_CreateMilestone_MissingTitle(t *testing.T) {
	h := newTestMilestoneHandler()
	body := `{"projectId":"11111111-1111-1111-1111-111111111111","targetDate":"2026-06-01T00:00:00Z"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateMilestone(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestMilestoneHandler_CreateMilestone_MissingProjectID(t *testing.T) {
	h := newTestMilestoneHandler()
	body := `{"title":"Phase 1","targetDate":"2026-06-01T00:00:00Z"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateMilestone(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing project_id, got %d", w.Code)
	}
}

func TestMilestoneHandler_CreateMilestone_MissingTargetDate(t *testing.T) {
	h := newTestMilestoneHandler()
	body := `{"title":"Phase 1","projectId":"11111111-1111-1111-1111-111111111111"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateMilestone(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing target_date, got %d", w.Code)
	}
}

func TestMilestoneHandler_ListMilestones_NoProjectID_ReturnsTenantWide(t *testing.T) {
	// Omitting project_id is now valid — the endpoint returns all tenant milestones
	// for use by analytics dashboards.
	h := newTestMilestoneHandler()
	req := requestWithAuth(http.MethodGet, "/", "")
	w := httptest.NewRecorder()

	h.ListMilestones(w, req)

	// The handler will attempt the DB query; without a real DB it may return 500
	// in test context, but it must NOT return 400 anymore.
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected non-400 when project_id is omitted (tenant-wide listing), got 400")
	}
}

func TestMilestoneHandler_ListMilestones_InvalidProjectID(t *testing.T) {
	h := newTestMilestoneHandler()
	req := requestWithAuth(http.MethodGet, "/?project_id=invalid", "")
	w := httptest.NewRecorder()

	h.ListMilestones(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid project_id, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────

func TestWorkItemHandler_RoutesRegistered(t *testing.T) {
	h := newTestWorkItemHandler()
	r := chi.NewRouter()
	h.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/"},
		{http.MethodGet, "/wbs"},
		{http.MethodGet, "/overdue"},
		{http.MethodGet, "/status-counts"},
		{http.MethodPost, "/"},
		{http.MethodGet, "/" + uuid.New().String()},
		{http.MethodPut, "/" + uuid.New().String()},
		{http.MethodPut, "/" + uuid.New().String() + "/transition"},
		{http.MethodDelete, "/" + uuid.New().String()},
		{http.MethodPost, "/" + uuid.New().String() + "/time-entries"},
		{http.MethodGet, "/" + uuid.New().String() + "/time-entries"},
		{http.MethodPost, "/bulk/update"},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			// We expect either 401 (no auth) or 403 (no permission), NOT 404/405.
			if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned %d, expected route to be registered", tt.method, tt.path, w.Code)
			}
		})
	}
}

func TestMilestoneHandler_RoutesRegistered(t *testing.T) {
	h := newTestMilestoneHandler()
	r := chi.NewRouter()
	h.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/"},
		{http.MethodPost, "/"},
		{http.MethodGet, "/" + uuid.New().String()},
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

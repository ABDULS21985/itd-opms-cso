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
// HeatmapHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestHeatmapHandler_GetHeatmap_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/capacity/heatmap?start=2026-03-01&end=2026-06-30", nil)
	w := httptest.NewRecorder()

	h.heatmap.GetHeatmap(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestHeatmapHandler_ListAllocations_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/capacity/allocations", nil)
	w := httptest.NewRecorder()

	h.heatmap.ListAllocations(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestHeatmapHandler_CreateAllocation_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"projectId":"22222222-2222-2222-2222-222222222222",
		"allocationPct":80,
		"periodStart":"2026-03-01T00:00:00Z",
		"periodEnd":"2026-06-30T00:00:00Z"
	}`
	req := httptest.NewRequest(http.MethodPost, "/capacity/allocations", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.heatmap.CreateAllocation(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestHeatmapHandler_UpdateAllocation_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/capacity/allocations/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.heatmap.UpdateAllocation(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestHeatmapHandler_DeleteAllocation_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/capacity/allocations/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.heatmap.DeleteAllocation(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// HeatmapHandler — input validation (400)
// ──────────────────────────────────────────────

func TestHeatmapHandler_GetHeatmap_MissingDates(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/heatmap", "")
	w := httptest.NewRecorder()

	h.heatmap.GetHeatmap(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing start/end, got %d", w.Code)
	}
}

func TestHeatmapHandler_GetHeatmap_MissingEnd(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/heatmap?start=2026-03-01", "")
	w := httptest.NewRecorder()

	h.heatmap.GetHeatmap(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing end, got %d", w.Code)
	}
}

func TestHeatmapHandler_GetHeatmap_InvalidStartDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/heatmap?start=not-a-date&end=2026-06-30", "")
	w := httptest.NewRecorder()

	h.heatmap.GetHeatmap(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid start date, got %d", w.Code)
	}
}

func TestHeatmapHandler_GetHeatmap_InvalidEndDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/heatmap?start=2026-03-01&end=not-a-date", "")
	w := httptest.NewRecorder()

	h.heatmap.GetHeatmap(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid end date, got %d", w.Code)
	}
}

func TestHeatmapHandler_GetHeatmap_EndBeforeStart(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/heatmap?start=2026-06-30&end=2026-03-01", "")
	w := httptest.NewRecorder()

	h.heatmap.GetHeatmap(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for end before start, got %d", w.Code)
	}
}

func TestHeatmapHandler_UpdateAllocation_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.heatmap.UpdateAllocation)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"allocationPct":50}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestHeatmapHandler_DeleteAllocation_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.heatmap.DeleteAllocation)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestHeatmapHandler_CreateAllocation_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/capacity/allocations", "not-json")
	w := httptest.NewRecorder()

	h.heatmap.CreateAllocation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestHeatmapHandler_CreateAllocation_MissingUserID(t *testing.T) {
	h := newTestHandler()
	body := `{
		"projectId":"22222222-2222-2222-2222-222222222222",
		"allocationPct":80,
		"periodStart":"2026-03-01T00:00:00Z",
		"periodEnd":"2026-06-30T00:00:00Z"
	}`
	req := requestWithAuth(http.MethodPost, "/capacity/allocations", body)
	w := httptest.NewRecorder()

	h.heatmap.CreateAllocation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing userId, got %d", w.Code)
	}
}

func TestHeatmapHandler_CreateAllocation_MissingProjectID(t *testing.T) {
	h := newTestHandler()
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"allocationPct":80,
		"periodStart":"2026-03-01T00:00:00Z",
		"periodEnd":"2026-06-30T00:00:00Z"
	}`
	req := requestWithAuth(http.MethodPost, "/capacity/allocations", body)
	w := httptest.NewRecorder()

	h.heatmap.CreateAllocation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing projectId, got %d", w.Code)
	}
}

func TestHeatmapHandler_CreateAllocation_ZeroAllocationPct(t *testing.T) {
	h := newTestHandler()
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"projectId":"22222222-2222-2222-2222-222222222222",
		"allocationPct":0,
		"periodStart":"2026-03-01T00:00:00Z",
		"periodEnd":"2026-06-30T00:00:00Z"
	}`
	req := requestWithAuth(http.MethodPost, "/capacity/allocations", body)
	w := httptest.NewRecorder()

	h.heatmap.CreateAllocation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero allocationPct, got %d", w.Code)
	}
}

func TestHeatmapHandler_CreateAllocation_NegativeAllocationPct(t *testing.T) {
	h := newTestHandler()
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"projectId":"22222222-2222-2222-2222-222222222222",
		"allocationPct":-10,
		"periodStart":"2026-03-01T00:00:00Z",
		"periodEnd":"2026-06-30T00:00:00Z"
	}`
	req := requestWithAuth(http.MethodPost, "/capacity/allocations", body)
	w := httptest.NewRecorder()

	h.heatmap.CreateAllocation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for negative allocationPct, got %d", w.Code)
	}
}

func TestHeatmapHandler_CreateAllocation_MissingPeriods(t *testing.T) {
	h := newTestHandler()
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"projectId":"22222222-2222-2222-2222-222222222222",
		"allocationPct":80
	}`
	req := requestWithAuth(http.MethodPost, "/capacity/allocations", body)
	w := httptest.NewRecorder()

	h.heatmap.CreateAllocation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing periods, got %d", w.Code)
	}
}

func TestHeatmapHandler_ListAllocations_InvalidUserID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/allocations?user_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.heatmap.ListAllocations(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid user_id, got %d", w.Code)
	}
}

func TestHeatmapHandler_ListAllocations_InvalidProjectID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/allocations?project_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.heatmap.ListAllocations(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid project_id, got %d", w.Code)
	}
}

func TestHeatmapHandler_ListAllocations_InvalidStartDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/allocations?start=not-a-date", "")
	w := httptest.NewRecorder()

	h.heatmap.ListAllocations(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid start date, got %d", w.Code)
	}
}

func TestHeatmapHandler_ListAllocations_InvalidEndDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity/allocations?end=not-a-date", "")
	w := httptest.NewRecorder()

	h.heatmap.ListAllocations(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid end date, got %d", w.Code)
	}
}

func TestHeatmapHandler_UpdateAllocation_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.heatmap.UpdateAllocation)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String(), "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// HeatmapHandler — route registration
// ──────────────────────────────────────────────

func TestHeatmapHandler_RoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.heatmap.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/heatmap"},
		{http.MethodGet, "/allocations"},
		{http.MethodPost, "/allocations"},
		{http.MethodPut, "/allocations/" + uuid.New().String()},
		{http.MethodDelete, "/allocations/" + uuid.New().String()},
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

func TestHeatmapHandler_MountRoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.heatmap.MountRoutes(r)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/capacity/heatmap"},
		{http.MethodGet, "/capacity/allocations"},
		{http.MethodPost, "/capacity/allocations"},
		{http.MethodPut, "/capacity/allocations/" + uuid.New().String()},
		{http.MethodDelete, "/capacity/allocations/" + uuid.New().String()},
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

// ──────────────────────────────────────────────
// Top-level Handler — route registration
// ──────────────────────────────────────────────

func TestHandler_AllRoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		// Skills
		{http.MethodGet, "/skills"},
		{http.MethodGet, "/skills/categories"},
		{http.MethodPost, "/skills"},
		{http.MethodGet, "/skills/user-skills/" + uuid.New().String()},
		{http.MethodPost, "/skills/requirements"},
		// Checklists
		{http.MethodGet, "/checklists"},
		{http.MethodGet, "/checklists/templates"},
		{http.MethodPost, "/checklists"},
		{http.MethodGet, "/checklists/tasks/" + uuid.New().String()},
		// Rosters
		{http.MethodGet, "/rosters"},
		{http.MethodPost, "/rosters"},
		// Leave
		{http.MethodGet, "/leave"},
		{http.MethodPost, "/leave"},
		// Capacity
		{http.MethodGet, "/capacity"},
		{http.MethodPost, "/capacity"},
		// Heatmap (via MountRoutes)
		{http.MethodGet, "/capacity/heatmap"},
		{http.MethodGet, "/capacity/allocations"},
		{http.MethodPost, "/capacity/allocations"},
		// Training
		{http.MethodGet, "/training"},
		{http.MethodGet, "/training/expiring"},
		{http.MethodPost, "/training"},
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

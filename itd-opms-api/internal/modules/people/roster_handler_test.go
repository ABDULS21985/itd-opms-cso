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
// RosterHandler — auth guard (401) — Rosters
// ──────────────────────────────────────────────

func TestRosterHandler_ListRosters_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/rosters", nil)
	w := httptest.NewRecorder()

	h.roster.ListRosters(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_GetRoster_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/rosters/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.roster.GetRoster(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_CreateRoster_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"name":"March Roster","periodStart":"2026-03-01T00:00:00Z","periodEnd":"2026-03-31T00:00:00Z"}`
	req := httptest.NewRequest(http.MethodPost, "/rosters", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.roster.CreateRoster(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_UpdateRoster_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/rosters/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.roster.UpdateRoster(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// RosterHandler — auth guard (401) — Leave Records
// ──────────────────────────────────────────────

func TestRosterHandler_ListLeaveRecords_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/leave", nil)
	w := httptest.NewRecorder()

	h.roster.ListLeaveRecords(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_GetLeaveRecord_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/leave/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.roster.GetLeaveRecord(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_CreateLeaveRecord_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","leaveType":"annual","startDate":"2026-03-01T00:00:00Z","endDate":"2026-03-05T00:00:00Z"}`
	req := httptest.NewRequest(http.MethodPost, "/leave", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.roster.CreateLeaveRecord(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_UpdateLeaveRecordStatus_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"status":"approved"}`
	req := httptest.NewRequest(http.MethodPut, "/leave/"+uuid.New().String()+"/status", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.roster.UpdateLeaveRecordStatus(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_DeleteLeaveRecord_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/leave/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.roster.DeleteLeaveRecord(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// RosterHandler — auth guard (401) — Capacity Allocations
// ──────────────────────────────────────────────

func TestRosterHandler_ListCapacityAllocations_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/capacity", nil)
	w := httptest.NewRecorder()

	h.roster.ListCapacityAllocations(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_CreateCapacityAllocation_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","allocationPct":80,"periodStart":"2026-03-01T00:00:00Z","periodEnd":"2026-06-30T00:00:00Z"}`
	req := httptest.NewRequest(http.MethodPost, "/capacity", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.roster.CreateCapacityAllocation(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_UpdateCapacityAllocation_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/capacity/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.roster.UpdateCapacityAllocation(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRosterHandler_DeleteCapacityAllocation_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/capacity/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.roster.DeleteCapacityAllocation(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// RosterHandler — input validation (400) — Rosters
// ──────────────────────────────────────────────

func TestRosterHandler_GetRoster_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.roster.GetRoster)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRosterHandler_UpdateRoster_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.roster.UpdateRoster)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{"name":"x"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRosterHandler_CreateRoster_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/rosters", "not-json")
	w := httptest.NewRecorder()

	h.roster.CreateRoster(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestRosterHandler_CreateRoster_MissingName(t *testing.T) {
	h := newTestHandler()
	body := `{"periodStart":"2026-03-01T00:00:00Z","periodEnd":"2026-03-31T00:00:00Z"}`
	req := requestWithAuth(http.MethodPost, "/rosters", body)
	w := httptest.NewRecorder()

	h.roster.CreateRoster(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestRosterHandler_ListRosters_InvalidTeamID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/rosters?team_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.roster.ListRosters(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid team_id, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// RosterHandler — input validation (400) — Leave Records
// ──────────────────────────────────────────────

func TestRosterHandler_GetLeaveRecord_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.roster.GetLeaveRecord)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRosterHandler_CreateLeaveRecord_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/leave", "not-json")
	w := httptest.NewRecorder()

	h.roster.CreateLeaveRecord(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestRosterHandler_CreateLeaveRecord_MissingLeaveType(t *testing.T) {
	h := newTestHandler()
	body := `{"userId":"11111111-1111-1111-1111-111111111111","startDate":"2026-03-01T00:00:00Z","endDate":"2026-03-05T00:00:00Z"}`
	req := requestWithAuth(http.MethodPost, "/leave", body)
	w := httptest.NewRecorder()

	h.roster.CreateLeaveRecord(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing leave type, got %d", w.Code)
	}
}

func TestRosterHandler_UpdateLeaveRecordStatus_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.roster.UpdateLeaveRecordStatus)

	req := requestWithAuth(http.MethodPut, "/bad-uuid/status", `{"status":"approved"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRosterHandler_UpdateLeaveRecordStatus_InvalidBody(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.roster.UpdateLeaveRecordStatus)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/status", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestRosterHandler_UpdateLeaveRecordStatus_MissingStatus(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}/status", h.roster.UpdateLeaveRecordStatus)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/status", `{"approvedBy":"11111111-1111-1111-1111-111111111111"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing status, got %d", w.Code)
	}
}

func TestRosterHandler_DeleteLeaveRecord_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.roster.DeleteLeaveRecord)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRosterHandler_ListLeaveRecords_InvalidUserID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/leave?user_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.roster.ListLeaveRecords(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid user_id, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// RosterHandler — input validation (400) — Capacity Allocations
// ──────────────────────────────────────────────

func TestRosterHandler_UpdateCapacityAllocation_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.roster.UpdateCapacityAllocation)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRosterHandler_DeleteCapacityAllocation_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.roster.DeleteCapacityAllocation)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestRosterHandler_CreateCapacityAllocation_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/capacity", "not-json")
	w := httptest.NewRecorder()

	h.roster.CreateCapacityAllocation(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestRosterHandler_ListCapacityAllocations_InvalidUserID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity?user_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.roster.ListCapacityAllocations(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid user_id, got %d", w.Code)
	}
}

func TestRosterHandler_ListCapacityAllocations_InvalidProjectID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/capacity?project_id=not-uuid", "")
	w := httptest.NewRecorder()

	h.roster.ListCapacityAllocations(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid project_id, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// RosterHandler — route registration
// ──────────────────────────────────────────────

func TestRosterHandler_RoutesRegistered(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	h.roster.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		// Rosters
		{http.MethodGet, "/rosters"},
		{http.MethodGet, "/rosters/" + uuid.New().String()},
		{http.MethodPost, "/rosters"},
		{http.MethodPut, "/rosters/" + uuid.New().String()},
		// Leave
		{http.MethodGet, "/leave"},
		{http.MethodGet, "/leave/" + uuid.New().String()},
		{http.MethodPost, "/leave"},
		{http.MethodPut, "/leave/" + uuid.New().String() + "/status"},
		{http.MethodDelete, "/leave/" + uuid.New().String()},
		// Capacity
		{http.MethodGet, "/capacity"},
		{http.MethodPost, "/capacity"},
		{http.MethodPut, "/capacity/" + uuid.New().String()},
		{http.MethodDelete, "/capacity/" + uuid.New().String()},
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

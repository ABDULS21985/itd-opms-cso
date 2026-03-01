package calendar

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
// Auth guard (401)
// ══════════════════════════════════════════════

func TestGetCalendarEvents_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/events?start=2026-01-01&end=2026-12-31", nil)
	w := httptest.NewRecorder()

	h.GetCalendarEvents(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCreateMaintenanceWindow_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"title":"MW","windowType":"maintenance","startTime":"2026-03-01T00:00:00Z","endTime":"2026-03-01T04:00:00Z"}`
	req := httptest.NewRequest(http.MethodPost, "/maintenance-windows", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateMaintenanceWindow(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGetMaintenanceWindow_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/maintenance-windows/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetMaintenanceWindow(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestUpdateMaintenanceWindow_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/maintenance-windows/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateMaintenanceWindow(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDeleteMaintenanceWindow_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/maintenance-windows/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteMaintenanceWindow(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCreateFreezePeriod_NoAuth(t *testing.T) {
	h := newTestHandler()
	body := `{"name":"Freeze","startTime":"2026-12-20T00:00:00Z","endTime":"2027-01-03T00:00:00Z"}`
	req := httptest.NewRequest(http.MethodPost, "/freeze-periods", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateFreezePeriod(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestListFreezePeriods_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/freeze-periods", nil)
	w := httptest.NewRecorder()

	h.ListFreezePeriods(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestDeleteFreezePeriod_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/freeze-periods/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteFreezePeriod(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCheckConflicts_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/conflicts?start=2026-01-01&end=2026-12-31", nil)
	w := httptest.NewRecorder()

	h.CheckConflicts(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ══════════════════════════════════════════════
// Input validation (400)
// ══════════════════════════════════════════════

func TestGetCalendarEvents_MissingStartEnd(t *testing.T) {
	h := newTestHandler()

	// Missing both
	req := requestWithAuth(http.MethodGet, "/events", "")
	w := httptest.NewRecorder()
	h.GetCalendarEvents(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing start/end, got %d", w.Code)
	}

	// Missing end
	req = requestWithAuth(http.MethodGet, "/events?start=2026-01-01", "")
	w = httptest.NewRecorder()
	h.GetCalendarEvents(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing end, got %d", w.Code)
	}
}

func TestGetCalendarEvents_InvalidStartDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/events?start=bad-date&end=2026-12-31", "")
	w := httptest.NewRecorder()

	h.GetCalendarEvents(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid start date, got %d", w.Code)
	}
}

func TestGetCalendarEvents_InvalidEndDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/events?start=2026-01-01&end=not-a-date", "")
	w := httptest.NewRecorder()

	h.GetCalendarEvents(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid end date, got %d", w.Code)
	}
}

func TestGetMaintenanceWindow_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetMaintenanceWindow)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestUpdateMaintenanceWindow_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateMaintenanceWindow)

	req := requestWithAuth(http.MethodPut, "/bad-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDeleteMaintenanceWindow_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteMaintenanceWindow)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestDeleteFreezePeriod_InvalidID(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteFreezePeriod)

	req := requestWithAuth(http.MethodDelete, "/bad-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestCreateMaintenanceWindow_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/maintenance-windows", "not-json")
	w := httptest.NewRecorder()

	h.CreateMaintenanceWindow(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestCreateMaintenanceWindow_MissingTitle(t *testing.T) {
	h := newTestHandler()
	body := `{"windowType":"maintenance","startTime":"2026-03-01T00:00:00Z","endTime":"2026-03-01T04:00:00Z"}`
	req := requestWithAuth(http.MethodPost, "/maintenance-windows", body)
	w := httptest.NewRecorder()

	h.CreateMaintenanceWindow(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestCreateMaintenanceWindow_EndBeforeStart(t *testing.T) {
	h := newTestHandler()
	body := `{
		"title":"MW",
		"windowType":"maintenance",
		"startTime":"2026-03-15T06:00:00Z",
		"endTime":"2026-03-15T02:00:00Z"
	}`
	req := requestWithAuth(http.MethodPost, "/maintenance-windows", body)
	w := httptest.NewRecorder()

	h.CreateMaintenanceWindow(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for end before start, got %d", w.Code)
	}
}

func TestCreateFreezePeriod_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodPost, "/freeze-periods", "not-json")
	w := httptest.NewRecorder()

	h.CreateFreezePeriod(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid body, got %d", w.Code)
	}
}

func TestCreateFreezePeriod_MissingName(t *testing.T) {
	h := newTestHandler()
	body := `{"startTime":"2026-12-20T00:00:00Z","endTime":"2027-01-03T00:00:00Z"}`
	req := requestWithAuth(http.MethodPost, "/freeze-periods", body)
	w := httptest.NewRecorder()

	h.CreateFreezePeriod(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestCreateFreezePeriod_EndBeforeStart(t *testing.T) {
	h := newTestHandler()
	body := `{
		"name":"Freeze",
		"startTime":"2027-01-03T00:00:00Z",
		"endTime":"2026-12-20T00:00:00Z"
	}`
	req := requestWithAuth(http.MethodPost, "/freeze-periods", body)
	w := httptest.NewRecorder()

	h.CreateFreezePeriod(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for end before start, got %d", w.Code)
	}
}

func TestCheckConflicts_MissingStartEnd(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/conflicts", "")
	w := httptest.NewRecorder()

	h.CheckConflicts(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing start/end, got %d", w.Code)
	}
}

func TestCheckConflicts_InvalidStartDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/conflicts?start=bad&end=2026-12-31", "")
	w := httptest.NewRecorder()

	h.CheckConflicts(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid start date, got %d", w.Code)
	}
}

func TestCheckConflicts_InvalidEndDate(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuth(http.MethodGet, "/conflicts?start=2026-01-01&end=bad", "")
	w := httptest.NewRecorder()

	h.CheckConflicts(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid end date, got %d", w.Code)
	}
}

func TestUpdateMaintenanceWindow_EndBeforeStart(t *testing.T) {
	h := newTestHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateMaintenanceWindow)

	body := `{
		"startTime":"2026-03-15T06:00:00Z",
		"endTime":"2026-03-15T02:00:00Z"
	}`
	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String(), body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for end before start, got %d", w.Code)
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
		{http.MethodGet, "/events"},
		{http.MethodPost, "/maintenance-windows/"},
		{http.MethodGet, "/maintenance-windows/" + uuid.New().String()},
		{http.MethodPut, "/maintenance-windows/" + uuid.New().String()},
		{http.MethodDelete, "/maintenance-windows/" + uuid.New().String()},
		{http.MethodPost, "/freeze-periods/"},
		{http.MethodGet, "/freeze-periods/"},
		{http.MethodDelete, "/freeze-periods/" + uuid.New().String()},
		{http.MethodGet, "/conflicts"},
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

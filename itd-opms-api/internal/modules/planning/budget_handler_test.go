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

func newTestBudgetHandler() *BudgetHandler {
	return NewBudgetHandler(nil)
}

func newTestCostCategoryHandler() *CostCategoryHandler {
	return NewCostCategoryHandler(nil)
}

// ──────────────────────────────────────────────
// BudgetHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestBudgetHandler_GetBudgetSummary_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodGet, "/summary", nil)
	w := httptest.NewRecorder()

	h.GetBudgetSummary(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_ListCostEntries_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodGet, "/entries", nil)
	w := httptest.NewRecorder()

	h.ListCostEntries(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_CreateCostEntry_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	body := `{"description":"test","amount":100,"entryType":"actual"}`
	req := httptest.NewRequest(http.MethodPost, "/entries", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateCostEntry(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_UpdateCostEntry_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodPut, "/entries/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateCostEntry(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_DeleteCostEntry_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodDelete, "/entries/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteCostEntry(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_GetBurnRate_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodGet, "/burn-rate", nil)
	w := httptest.NewRecorder()

	h.GetBurnRate(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_GetForecast_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodGet, "/forecast", nil)
	w := httptest.NewRecorder()

	h.GetForecast(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_CreateBudgetSnapshot_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodPost, "/snapshots", strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.CreateBudgetSnapshot(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestBudgetHandler_ListBudgetSnapshots_NoAuth(t *testing.T) {
	h := newTestBudgetHandler()
	req := httptest.NewRequest(http.MethodGet, "/snapshots", nil)
	w := httptest.NewRecorder()

	h.ListBudgetSnapshots(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// BudgetHandler — invalid project ID (400)
// ──────────────────────────────────────────────

func TestBudgetHandler_GetBudgetSummary_InvalidProjectID(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Get("/{id}/budget/summary", h.GetBudgetSummary)

	req := requestWithAuth(http.MethodGet, "/invalid/budget/summary", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_ListCostEntries_InvalidProjectID(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Get("/{id}/budget/entries", h.ListCostEntries)

	req := requestWithAuth(http.MethodGet, "/invalid/budget/entries", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_CreateCostEntry_InvalidProjectID(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Post("/{id}/budget/entries", h.CreateCostEntry)

	body := `{"description":"test","amount":100,"entryType":"actual"}`
	req := requestWithAuth(http.MethodPost, "/invalid/budget/entries", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_UpdateCostEntry_InvalidProjectID(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Put("/{id}/budget/entries/{entryId}", h.UpdateCostEntry)

	req := requestWithAuth(http.MethodPut, "/invalid/budget/entries/"+uuid.New().String(), `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_UpdateCostEntry_InvalidEntryID(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Put("/{id}/budget/entries/{entryId}", h.UpdateCostEntry)

	req := requestWithAuth(http.MethodPut, "/"+uuid.New().String()+"/budget/entries/invalid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_DeleteCostEntry_InvalidProjectID(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Delete("/{id}/budget/entries/{entryId}", h.DeleteCostEntry)

	req := requestWithAuth(http.MethodDelete, "/invalid/budget/entries/"+uuid.New().String(), "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_DeleteCostEntry_InvalidEntryID(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Delete("/{id}/budget/entries/{entryId}", h.DeleteCostEntry)

	req := requestWithAuth(http.MethodDelete, "/"+uuid.New().String()+"/budget/entries/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// BudgetHandler — input validation
// ──────────────────────────────────────────────

func TestBudgetHandler_CreateCostEntry_InvalidBody(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Post("/{id}/budget/entries", h.CreateCostEntry)

	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/budget/entries", "not-json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_CreateCostEntry_MissingDescription(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Post("/{id}/budget/entries", h.CreateCostEntry)

	body := `{"amount":100,"entryType":"actual"}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/budget/entries", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBudgetHandler_CreateCostEntry_ZeroAmount(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Post("/{id}/budget/entries", h.CreateCostEntry)

	body := `{"description":"test","amount":0,"entryType":"actual"}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/budget/entries", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero amount, got %d", w.Code)
	}
}

func TestBudgetHandler_CreateCostEntry_MissingEntryType(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	r.Post("/{id}/budget/entries", h.CreateCostEntry)

	body := `{"description":"test","amount":100}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/budget/entries", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// CostCategoryHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestCostCategoryHandler_ListCostCategories_NoAuth(t *testing.T) {
	h := newTestCostCategoryHandler()
	req := httptest.NewRequest(http.MethodGet, "/cost-categories", nil)
	w := httptest.NewRecorder()

	h.ListCostCategories(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCostCategoryHandler_CreateCostCategory_NoAuth(t *testing.T) {
	h := newTestCostCategoryHandler()
	body := `{"name":"Hardware"}`
	req := httptest.NewRequest(http.MethodPost, "/cost-categories", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateCostCategory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCostCategoryHandler_UpdateCostCategory_NoAuth(t *testing.T) {
	h := newTestCostCategoryHandler()
	req := httptest.NewRequest(http.MethodPut, "/cost-categories/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateCostCategory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCostCategoryHandler_DeleteCostCategory_NoAuth(t *testing.T) {
	h := newTestCostCategoryHandler()
	req := httptest.NewRequest(http.MethodDelete, "/cost-categories/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteCostCategory(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCostCategoryHandler_GetPortfolioBudgetSummary_NoAuth(t *testing.T) {
	h := newTestCostCategoryHandler()
	req := httptest.NewRequest(http.MethodGet, "/portfolio-summary", nil)
	w := httptest.NewRecorder()

	h.GetPortfolioBudgetSummary(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// CostCategoryHandler — input validation
// ──────────────────────────────────────────────

func TestCostCategoryHandler_UpdateCostCategory_InvalidID(t *testing.T) {
	h := newTestCostCategoryHandler()
	r := chi.NewRouter()
	r.Put("/cost-categories/{id}", h.UpdateCostCategory)

	req := requestWithAuth(http.MethodPut, "/cost-categories/invalid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCostCategoryHandler_DeleteCostCategory_InvalidID(t *testing.T) {
	h := newTestCostCategoryHandler()
	r := chi.NewRouter()
	r.Delete("/cost-categories/{id}", h.DeleteCostCategory)

	req := requestWithAuth(http.MethodDelete, "/cost-categories/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCostCategoryHandler_CreateCostCategory_InvalidBody(t *testing.T) {
	h := newTestCostCategoryHandler()
	req := requestWithAuth(http.MethodPost, "/cost-categories", "not-json")
	w := httptest.NewRecorder()

	h.CreateCostCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCostCategoryHandler_CreateCostCategory_MissingName(t *testing.T) {
	h := newTestCostCategoryHandler()
	body := `{"description":"test"}`
	req := requestWithAuth(http.MethodPost, "/cost-categories", body)
	w := httptest.NewRecorder()

	h.CreateCostCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────

func TestBudgetHandler_RoutesRegistered(t *testing.T) {
	h := newTestBudgetHandler()
	r := chi.NewRouter()
	h.Routes(r)

	projectID := uuid.New().String()
	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/summary"},
		{http.MethodGet, "/entries"},
		{http.MethodPost, "/entries"},
		{http.MethodPut, "/entries/" + projectID},
		{http.MethodDelete, "/entries/" + projectID},
		{http.MethodGet, "/burn-rate"},
		{http.MethodGet, "/forecast"},
		{http.MethodPost, "/snapshots"},
		{http.MethodGet, "/snapshots"},
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

func TestCostCategoryHandler_RoutesRegistered(t *testing.T) {
	h := newTestCostCategoryHandler()
	r := chi.NewRouter()
	h.Routes(r)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/cost-categories"},
		{http.MethodPost, "/cost-categories"},
		{http.MethodPut, "/cost-categories/" + uuid.New().String()},
		{http.MethodDelete, "/cost-categories/" + uuid.New().String()},
		{http.MethodGet, "/portfolio-summary"},
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

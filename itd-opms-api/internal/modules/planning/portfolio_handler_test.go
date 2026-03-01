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

func newTestPortfolioHandler() *PortfolioHandler {
	return NewPortfolioHandler(nil)
}

func newTestProjectHandler() *ProjectHandler {
	return NewProjectHandler(nil)
}

// ──────────────────────────────────────────────
// PortfolioHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestPortfolioHandler_ListPortfolios_NoAuth(t *testing.T) {
	h := newTestPortfolioHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListPortfolios(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPortfolioHandler_GetPortfolio_NoAuth(t *testing.T) {
	h := newTestPortfolioHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetPortfolio(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPortfolioHandler_CreatePortfolio_NoAuth(t *testing.T) {
	h := newTestPortfolioHandler()
	body := `{"name":"FY2026","fiscalYear":2026}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreatePortfolio(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPortfolioHandler_UpdatePortfolio_NoAuth(t *testing.T) {
	h := newTestPortfolioHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdatePortfolio(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPortfolioHandler_DeletePortfolio_NoAuth(t *testing.T) {
	h := newTestPortfolioHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeletePortfolio(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPortfolioHandler_GetRoadmap_NoAuth(t *testing.T) {
	h := newTestPortfolioHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/roadmap", nil)
	w := httptest.NewRecorder()

	h.GetRoadmap(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestPortfolioHandler_GetAnalytics_NoAuth(t *testing.T) {
	h := newTestPortfolioHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/analytics", nil)
	w := httptest.NewRecorder()

	h.GetAnalytics(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// PortfolioHandler — input validation
// ──────────────────────────────────────────────

func TestPortfolioHandler_GetPortfolio_InvalidID(t *testing.T) {
	h := newTestPortfolioHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetPortfolio)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPortfolioHandler_UpdatePortfolio_InvalidID(t *testing.T) {
	h := newTestPortfolioHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdatePortfolio)

	req := requestWithAuth(http.MethodPut, "/invalid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPortfolioHandler_DeletePortfolio_InvalidID(t *testing.T) {
	h := newTestPortfolioHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeletePortfolio)

	req := requestWithAuth(http.MethodDelete, "/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPortfolioHandler_CreatePortfolio_InvalidBody(t *testing.T) {
	h := newTestPortfolioHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.CreatePortfolio(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPortfolioHandler_CreatePortfolio_MissingName(t *testing.T) {
	h := newTestPortfolioHandler()
	body := `{"fiscalYear":2026}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreatePortfolio(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPortfolioHandler_CreatePortfolio_MissingFiscalYear(t *testing.T) {
	h := newTestPortfolioHandler()
	body := `{"name":"FY2026"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreatePortfolio(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPortfolioHandler_GetRoadmap_InvalidID(t *testing.T) {
	h := newTestPortfolioHandler()
	r := chi.NewRouter()
	r.Get("/{id}/roadmap", h.GetRoadmap)

	req := requestWithAuth(http.MethodGet, "/invalid/roadmap", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPortfolioHandler_GetAnalytics_InvalidID(t *testing.T) {
	h := newTestPortfolioHandler()
	r := chi.NewRouter()
	r.Get("/{id}/analytics", h.GetAnalytics)

	req := requestWithAuth(http.MethodGet, "/invalid/analytics", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// ProjectHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestProjectHandler_ListProjects_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.ListProjects(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_CreateProject_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	body := `{"title":"Project","code":"P001"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CreateProject(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_GetProject_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.GetProject(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_UpdateProject_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	h.UpdateProject(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_DeleteProject_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()

	h.DeleteProject(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_ApproveProject_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	body := `{"status":"approved"}`
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/approve", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ApproveProject(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_GetProjectDependencies_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/dependencies", nil)
	w := httptest.NewRecorder()

	h.GetProjectDependencies(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_AddProjectDependency_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	body := `{"dependsOnProjectId":"` + uuid.New().String() + `"}`
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/dependencies", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.AddProjectDependency(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_GetProjectStakeholders_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/stakeholders", nil)
	w := httptest.NewRecorder()

	h.GetProjectStakeholders(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestProjectHandler_ListProjectDivisions_NoAuth(t *testing.T) {
	h := newTestProjectHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/divisions", nil)
	w := httptest.NewRecorder()

	h.ListProjectDivisions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// ProjectHandler — input validation
// ──────────────────────────────────────────────

func TestProjectHandler_GetProject_InvalidID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Get("/{id}", h.GetProject)

	req := requestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_UpdateProject_InvalidID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Put("/{id}", h.UpdateProject)

	req := requestWithAuth(http.MethodPut, "/invalid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_DeleteProject_InvalidID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteProject)

	req := requestWithAuth(http.MethodDelete, "/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_CreateProject_InvalidBody(t *testing.T) {
	h := newTestProjectHandler()
	req := requestWithAuth(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()

	h.CreateProject(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_CreateProject_MissingTitle(t *testing.T) {
	h := newTestProjectHandler()
	body := `{"code":"P001"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateProject(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_CreateProject_MissingCode(t *testing.T) {
	h := newTestProjectHandler()
	body := `{"title":"Project"}`
	req := requestWithAuth(http.MethodPost, "/", body)
	w := httptest.NewRecorder()

	h.CreateProject(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_ApproveProject_InvalidID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Post("/{id}/approve", h.ApproveProject)

	body := `{"status":"approved"}`
	req := requestWithAuth(http.MethodPost, "/invalid/approve", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_ApproveProject_EmptyStatus(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Post("/{id}/approve", h.ApproveProject)

	body := `{"status":""}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/approve", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_RemoveProjectDependency_InvalidDependencyID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Delete("/{id}/dependencies/{dependencyId}", h.RemoveProjectDependency)

	req := requestWithAuth(http.MethodDelete, "/"+uuid.New().String()+"/dependencies/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_RemoveProjectStakeholder_InvalidStakeholderID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Delete("/{id}/stakeholders/{stakeholderId}", h.RemoveProjectStakeholder)

	req := requestWithAuth(http.MethodDelete, "/"+uuid.New().String()+"/stakeholders/invalid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_AddProjectDependency_MissingDependsOn(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Post("/{id}/dependencies", h.AddProjectDependency)

	body := `{}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/dependencies", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_AddProjectStakeholder_MissingUserID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Post("/{id}/stakeholders", h.AddProjectStakeholder)

	body := `{"role":"sponsor"}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/stakeholders", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_AddProjectStakeholder_MissingRole(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Post("/{id}/stakeholders", h.AddProjectStakeholder)

	body := `{"userId":"` + uuid.New().String() + `"}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/stakeholders", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_AssignProjectDivision_MissingDivisionID(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Post("/{id}/divisions", h.AssignProjectDivision)

	body := `{}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/divisions", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_ReassignProjectDivision_MissingIDs(t *testing.T) {
	h := newTestProjectHandler()
	r := chi.NewRouter()
	r.Post("/{id}/divisions/reassign", h.ReassignProjectDivision)

	body := `{}`
	req := requestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/divisions/reassign", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// PortfolioHandler — route registration
// ──────────────────────────────────────────────

func TestPortfolioHandler_RoutesRegistered(t *testing.T) {
	h := newTestPortfolioHandler()
	r := chi.NewRouter()
	h.Routes(r)

	id := uuid.New().String()
	tests := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/"},
		{http.MethodPost, "/"},
		{http.MethodGet, "/" + id},
		{http.MethodPut, "/" + id},
		{http.MethodDelete, "/" + id},
		{http.MethodGet, "/" + id + "/roadmap"},
		{http.MethodGet, "/" + id + "/analytics"},
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

package reporting

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestReportingHandler() *Handler {
	return NewHandler(nil, nil, nil)
}

func reportingRouter() chi.Router {
	h := newTestReportingHandler()
	r := chi.NewRouter()
	h.Routes(r)
	return r
}

func withReportingAuth(r *http.Request) *http.Request {
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@example.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(r.Context(), auth)
	return r.WithContext(ctx)
}

// ──────────────────────────────────────────────
// Auth guard tests — every dashboard endpoint must return 401 without auth
// ──────────────────────────────────────────────

func TestDashboardHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestReportingHandler()

	validUUID := uuid.New().String()

	endpoints := []struct {
		name    string
		method  string
		path    string
		handler func(http.ResponseWriter, *http.Request)
		params  map[string]string
	}{
		{
			"GetExecutiveSummary", http.MethodGet,
			"/dashboards/executive", h.dashboard.GetExecutiveSummary, nil,
		},
		{
			"GetTenantExecutiveSummary", http.MethodGet,
			"/dashboards/tenant/" + validUUID,
			h.dashboard.GetTenantExecutiveSummary,
			map[string]string{"tenantId": validUUID},
		},
		{
			"RefreshExecutiveSummary", http.MethodPost,
			"/dashboards/executive/refresh",
			h.dashboard.RefreshExecutiveSummary, nil,
		},
		{
			"GetMyDashboard", http.MethodGet,
			"/dashboards/my", h.dashboard.GetMyDashboard, nil,
		},
		{
			"GetTicketsByPriority", http.MethodGet,
			"/dashboards/charts/tickets-by-priority",
			h.dashboard.GetTicketsByPriority, nil,
		},
		{
			"GetTicketsByStatus", http.MethodGet,
			"/dashboards/charts/tickets-by-status",
			h.dashboard.GetTicketsByStatus, nil,
		},
		{
			"GetProjectsByStatus", http.MethodGet,
			"/dashboards/charts/projects-by-status",
			h.dashboard.GetProjectsByStatus, nil,
		},
		{
			"GetAssetsByType", http.MethodGet,
			"/dashboards/charts/assets-by-type",
			h.dashboard.GetAssetsByType, nil,
		},
		{
			"GetAssetsByStatus", http.MethodGet,
			"/dashboards/charts/assets-by-status",
			h.dashboard.GetAssetsByStatus, nil,
		},
		{
			"GetSLAComplianceRate", http.MethodGet,
			"/dashboards/charts/sla-compliance",
			h.dashboard.GetSLAComplianceRate, nil,
		},
		{
			"GetProjectsByRAG", http.MethodGet,
			"/dashboards/charts/projects-by-rag",
			h.dashboard.GetProjectsByRAG, nil,
		},
		{
			"GetProjectsByPriority", http.MethodGet,
			"/dashboards/charts/projects-by-priority",
			h.dashboard.GetProjectsByPriority, nil,
		},
		{
			"GetRisksByCategory", http.MethodGet,
			"/dashboards/charts/risks-by-category",
			h.dashboard.GetRisksByCategory, nil,
		},
		{
			"GetWorkItemsByStatus", http.MethodGet,
			"/dashboards/charts/work-items-by-status",
			h.dashboard.GetWorkItemsByStatus, nil,
		},
		{
			"GetOfficeAnalytics", http.MethodGet,
			"/dashboards/charts/office-analytics",
			h.dashboard.GetOfficeAnalytics, nil,
		},
		{
			"GetProjectsByOffice", http.MethodGet,
			"/dashboards/charts/projects-by-office",
			h.dashboard.GetProjectsByOffice, nil,
		},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			req := httptest.NewRequest(ep.method, ep.path, nil)
			req.Header.Set("Content-Type", "application/json")

			rctx := chi.NewRouteContext()
			for k, v := range ep.params {
				rctx.URLParams.Add(k, v)
			}
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			w := httptest.NewRecorder()
			ep.handler(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s: expected 401, got %d", ep.name, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Invalid UUID path parameter tests
// ──────────────────────────────────────────────

func TestDashboardHandler_GetTenantExecutiveSummary_InvalidUUID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/dashboards/tenant/not-a-uuid", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("tenantId", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.dashboard.GetTenantExecutiveSummary(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid tenant ID, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Query parameter validation
// ──────────────────────────────────────────────

func TestDashboardHandler_GetSLAComplianceRate_InvalidSince(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/dashboards/charts/sla-compliance?since=not-a-date", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.dashboard.GetSLAComplianceRate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid since parameter, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestDashboardRoutes_Registration(t *testing.T) {
	r := reportingRouter()

	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"GetExecutiveSummary", http.MethodGet, "/dashboards/executive"},
		{"GetTenantExecutiveSummary", http.MethodGet, "/dashboards/tenant/" + validUUID},
		{"RefreshExecutiveSummary", http.MethodPost, "/dashboards/executive/refresh"},
		{"GetMyDashboard", http.MethodGet, "/dashboards/my"},
		{"GetTicketsByPriority", http.MethodGet, "/dashboards/charts/tickets-by-priority"},
		{"GetTicketsByStatus", http.MethodGet, "/dashboards/charts/tickets-by-status"},
		{"GetProjectsByStatus", http.MethodGet, "/dashboards/charts/projects-by-status"},
		{"GetAssetsByType", http.MethodGet, "/dashboards/charts/assets-by-type"},
		{"GetAssetsByStatus", http.MethodGet, "/dashboards/charts/assets-by-status"},
		{"GetSLAComplianceRate", http.MethodGet, "/dashboards/charts/sla-compliance"},
		{"GetProjectsByRAG", http.MethodGet, "/dashboards/charts/projects-by-rag"},
		{"GetProjectsByPriority", http.MethodGet, "/dashboards/charts/projects-by-priority"},
		{"GetRisksByCategory", http.MethodGet, "/dashboards/charts/risks-by-category"},
		{"GetWorkItemsByStatus", http.MethodGet, "/dashboards/charts/work-items-by-status"},
		{"GetOfficeAnalytics", http.MethodGet, "/dashboards/charts/office-analytics"},
		{"GetProjectsByOffice", http.MethodGet, "/dashboards/charts/projects-by-office"},
	}

	for _, rt := range routes {
		t.Run(rt.name, func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound {
				t.Errorf("route %s %s returned 404 -- route not registered", rt.method, rt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 -- method not allowed", rt.method, rt.path)
			}
		})
	}
}

func TestDashboardRoutes_PermissionEnforced(t *testing.T) {
	r := reportingRouter()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"GetExecutiveSummary", http.MethodGet, "/dashboards/executive"},
		{"GetMyDashboard", http.MethodGet, "/dashboards/my"},
		{"RefreshExecutiveSummary", http.MethodPost, "/dashboards/executive/refresh"},
		{"GetTicketsByPriority", http.MethodGet, "/dashboards/charts/tickets-by-priority"},
	}

	for _, rt := range routes {
		t.Run(fmt.Sprintf("NoAuth_%s", rt.name), func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected 401 for unauthenticated %s %s, got %d", rt.method, rt.path, w.Code)
			}
		})
	}
}

func TestDashboardRoutes_ForbiddenWithoutPermission(t *testing.T) {
	r := reportingRouter()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@example.com",
		Roles:       []string{"viewer"},
		Permissions: []string{},
	}

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"GetExecutiveSummary", http.MethodGet, "/dashboards/executive"},
		{"GetMyDashboard", http.MethodGet, "/dashboards/my"},
		{"RefreshExecutiveSummary", http.MethodPost, "/dashboards/executive/refresh"},
		{"GetTicketsByStatus", http.MethodGet, "/dashboards/charts/tickets-by-status"},
		{"GetProjectsByStatus", http.MethodGet, "/dashboards/charts/projects-by-status"},
	}

	for _, rt := range routes {
		t.Run(fmt.Sprintf("Forbidden_%s", rt.name), func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			ctx := types.SetAuthContext(req.Context(), auth)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusForbidden {
				t.Errorf("expected 403 for %s %s without permission, got %d", rt.method, rt.path, w.Code)
			}
		})
	}
}

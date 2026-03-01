package reporting

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Auth guard tests — every report endpoint must return 401 without auth
// ──────────────────────────────────────────────

func TestReportHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestReportingHandler()

	validUUID := uuid.New().String()
	validRunID := uuid.New().String()

	endpoints := []struct {
		name    string
		method  string
		path    string
		body    string
		handler func(http.ResponseWriter, *http.Request)
		params  map[string]string
	}{
		{
			"ListDefinitions", http.MethodGet,
			"/reports/", "",
			h.report.ListDefinitions, nil,
		},
		{
			"GetDefinition", http.MethodGet,
			"/reports/" + validUUID, "",
			h.report.GetDefinition,
			map[string]string{"id": validUUID},
		},
		{
			"CreateDefinition", http.MethodPost,
			"/reports/",
			`{"name":"Test Report","type":"custom"}`,
			h.report.CreateDefinition, nil,
		},
		{
			"UpdateDefinition", http.MethodPut,
			"/reports/" + validUUID,
			`{"name":"Updated"}`,
			h.report.UpdateDefinition,
			map[string]string{"id": validUUID},
		},
		{
			"DeleteDefinition", http.MethodDelete,
			"/reports/" + validUUID, "",
			h.report.DeleteDefinition,
			map[string]string{"id": validUUID},
		},
		{
			"GetExecutivePackDefinition", http.MethodGet,
			"/reports/executive-pack/definition", "",
			h.report.GetExecutivePackDefinition, nil,
		},
		{
			"EnsureExecutivePackDefinition", http.MethodPost,
			"/reports/executive-pack/ensure", "",
			h.report.EnsureExecutivePackDefinition, nil,
		},
		{
			"GenerateExecutivePack", http.MethodPost,
			"/reports/executive-pack/generate", "",
			h.report.GenerateExecutivePack, nil,
		},
		{
			"TriggerReportRun", http.MethodPost,
			"/reports/" + validUUID + "/run", "",
			h.report.TriggerReportRun,
			map[string]string{"id": validUUID},
		},
		{
			"ListReportRuns", http.MethodGet,
			"/reports/" + validUUID + "/runs/", "",
			h.report.ListReportRuns,
			map[string]string{"definitionId": validUUID},
		},
		{
			"GetReportRun", http.MethodGet,
			"/reports/" + validUUID + "/runs/" + validRunID, "",
			h.report.GetReportRun,
			map[string]string{"definitionId": validUUID, "runId": validRunID},
		},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(ep.method, ep.path, body)
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

func TestReportHandler_GetDefinition_InvalidUUID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/reports/not-a-uuid", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.GetDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestReportHandler_UpdateDefinition_InvalidUUID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPut, "/reports/bad", strings.NewReader(`{"name":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.UpdateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestReportHandler_DeleteDefinition_InvalidUUID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodDelete, "/reports/bad", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.DeleteDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestReportHandler_TriggerReportRun_InvalidUUID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/reports/bad/run", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.TriggerReportRun(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestReportHandler_ListReportRuns_InvalidDefinitionID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/reports/bad/runs/", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("definitionId", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.ListReportRuns(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid definition ID, got %d", w.Code)
	}
}

func TestReportHandler_GetReportRun_InvalidRunID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/reports/"+uuid.New().String()+"/runs/bad", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("definitionId", uuid.New().String())
	rctx.URLParams.Add("runId", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.GetReportRun(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid run ID, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestReportHandler_CreateDefinition_MalformedJSON(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/reports/", strings.NewReader("{invalid"))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.report.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

func TestReportHandler_CreateDefinition_MissingName(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/reports/", strings.NewReader(`{"type":"custom"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.report.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestReportHandler_CreateDefinition_MissingType(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/reports/", strings.NewReader(`{"name":"Test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.report.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing type, got %d", w.Code)
	}
}

func TestReportHandler_CreateDefinition_EmptyFields(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/reports/", strings.NewReader(`{"name":"","type":""}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.report.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty fields, got %d", w.Code)
	}
}

func TestReportHandler_UpdateDefinition_MalformedJSON(t *testing.T) {
	h := newTestReportingHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/reports/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.UpdateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestReportRoutes_Registration(t *testing.T) {
	r := reportingRouter()

	validUUID := uuid.New().String()
	validRunID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListDefinitions", http.MethodGet, "/reports/"},
		{"GetExecutivePackDefinition", http.MethodGet, "/reports/executive-pack/definition"},
		{"EnsureExecutivePackDefinition", http.MethodPost, "/reports/executive-pack/ensure"},
		{"GenerateExecutivePack", http.MethodPost, "/reports/executive-pack/generate"},
		{"GetDefinition", http.MethodGet, "/reports/" + validUUID},
		{"CreateDefinition", http.MethodPost, "/reports/"},
		{"UpdateDefinition", http.MethodPut, "/reports/" + validUUID},
		{"DeleteDefinition", http.MethodDelete, "/reports/" + validUUID},
		{"TriggerReportRun", http.MethodPost, "/reports/" + validUUID + "/run"},
		{"ListReportRuns", http.MethodGet, "/reports/" + validUUID + "/runs/"},
		{"GetReportRun", http.MethodGet, "/reports/" + validUUID + "/runs/" + validRunID},
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

func TestReportRoutes_PermissionEnforced(t *testing.T) {
	r := reportingRouter()
	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListDefinitions", http.MethodGet, "/reports/"},
		{"GetDefinition", http.MethodGet, "/reports/" + validUUID},
		{"CreateDefinition", http.MethodPost, "/reports/"},
		{"DeleteDefinition", http.MethodDelete, "/reports/" + validUUID},
		{"TriggerReportRun", http.MethodPost, "/reports/" + validUUID + "/run"},
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

func TestReportRoutes_ForbiddenWithoutPermission(t *testing.T) {
	r := reportingRouter()
	validUUID := uuid.New().String()

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
		{"ListDefinitions", http.MethodGet, "/reports/"},
		{"GetDefinition", http.MethodGet, "/reports/" + validUUID},
		{"CreateDefinition", http.MethodPost, "/reports/"},
		{"DeleteDefinition", http.MethodDelete, "/reports/" + validUUID},
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

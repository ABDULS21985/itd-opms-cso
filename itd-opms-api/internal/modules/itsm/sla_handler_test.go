package itsm

import (
	"context"
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

func newTestSLAHandler() *SLAHandler {
	svc := NewSLAService(nil, nil)
	return NewSLAHandler(svc)
}

func slaRouter() chi.Router {
	h := newTestSLAHandler()
	r := chi.NewRouter()
	h.Routes(r)
	return r
}

func slaWithAuth(r *http.Request) *http.Request {
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
// Auth guard tests — all endpoints must return 401 without auth
// ──────────────────────────────────────────────

func TestSLAHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestSLAHandler()
	validUUID := uuid.New().String()

	endpoints := []struct {
		name     string
		method   string
		body     string
		urlParam string
		urlKey   string
		handler  func(http.ResponseWriter, *http.Request)
	}{
		{"ListPolicies", http.MethodGet, "", "", "", h.ListPolicies},
		{"GetDefaultPolicy", http.MethodGet, "", "", "", h.GetDefaultPolicy},
		{"GetPolicy", http.MethodGet, "", validUUID, "id", h.GetPolicy},
		{"CreatePolicy", http.MethodPost, `{"name":"Test","priorityTargets":{}}`, "", "", h.CreatePolicy},
		{"UpdatePolicy", http.MethodPut, `{"name":"Updated"}`, validUUID, "id", h.UpdatePolicy},
		{"DeletePolicy", http.MethodDelete, "", validUUID, "id", h.DeletePolicy},
		{"ListCalendars", http.MethodGet, "", "", "", h.ListCalendars},
		{"GetCalendar", http.MethodGet, "", validUUID, "id", h.GetCalendar},
		{"CreateCalendar", http.MethodPost, `{"name":"Standard","timezone":"UTC","schedule":{}}`, "", "", h.CreateCalendar},
		{"UpdateCalendar", http.MethodPut, `{"name":"Updated"}`, validUUID, "id", h.UpdateCalendar},
		{"DeleteCalendar", http.MethodDelete, "", validUUID, "id", h.DeleteCalendar},
		{"ListEscalationRules", http.MethodGet, "", "", "", h.ListEscalationRules},
		{"GetEscalationRule", http.MethodGet, "", validUUID, "id", h.GetEscalationRule},
		{"CreateEscalationRule", http.MethodPost, `{"name":"Test","triggerType":"sla_breach"}`, "", "", h.CreateEscalationRule},
		{"UpdateEscalationRule", http.MethodPut, `{"name":"Updated"}`, validUUID, "id", h.UpdateEscalationRule},
		{"DeleteEscalationRule", http.MethodDelete, "", validUUID, "id", h.DeleteEscalationRule},
		{"GetComplianceStats", http.MethodGet, "", "", "", h.GetComplianceStats},
		{"ListBreaches", http.MethodGet, "", validUUID, "ticketId", h.ListBreaches},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(ep.method, "/sla/test", body)
			req.Header.Set("Content-Type", "application/json")

			if ep.urlParam != "" {
				rctx := chi.NewRouteContext()
				rctx.URLParams.Add(ep.urlKey, ep.urlParam)
				req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			}

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

func TestSLAHandler_GetPolicy_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodGet, "/sla-policies/bad", nil)
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetPolicy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_UpdatePolicy_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPut, "/sla-policies/bad", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdatePolicy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_DeletePolicy_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodDelete, "/sla-policies/bad", nil)
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeletePolicy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_GetCalendar_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodGet, "/business-hours/bad", nil)
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_UpdateCalendar_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPut, "/business-hours/bad", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_DeleteCalendar_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodDelete, "/business-hours/bad", nil)
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeleteCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_GetEscalationRule_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodGet, "/escalation-rules/bad", nil)
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetEscalationRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_UpdateEscalationRule_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPut, "/escalation-rules/bad", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateEscalationRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_DeleteEscalationRule_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodDelete, "/escalation-rules/bad", nil)
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeleteEscalationRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_ListBreaches_InvalidUUID(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodGet, "/sla-breaches/bad", nil)
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("ticketId", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.ListBreaches(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestSLAHandler_CreatePolicy_MalformedJSON(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/sla-policies", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreatePolicy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_CreatePolicy_MissingName(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/sla-policies", strings.NewReader(`{"priorityTargets":{}}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreatePolicy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestSLAHandler_CreatePolicy_MissingPriorityTargets(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/sla-policies", strings.NewReader(`{"name":"Test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreatePolicy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing priority targets, got %d", w.Code)
	}
}

func TestSLAHandler_UpdatePolicy_MalformedJSON(t *testing.T) {
	h := newTestSLAHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/sla-policies/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdatePolicy(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_CreateCalendar_MalformedJSON(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/business-hours", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_CreateCalendar_MissingName(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/business-hours", strings.NewReader(`{"timezone":"UTC","schedule":{}}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestSLAHandler_CreateCalendar_MissingTimezone(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/business-hours", strings.NewReader(`{"name":"Standard","schedule":{}}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing timezone, got %d", w.Code)
	}
}

func TestSLAHandler_CreateCalendar_MissingSchedule(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/business-hours", strings.NewReader(`{"name":"Standard","timezone":"UTC"}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing schedule, got %d", w.Code)
	}
}

func TestSLAHandler_UpdateCalendar_MalformedJSON(t *testing.T) {
	h := newTestSLAHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/business-hours/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateCalendar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_CreateEscalationRule_MalformedJSON(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/escalation-rules", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateEscalationRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSLAHandler_CreateEscalationRule_MissingName(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/escalation-rules", strings.NewReader(`{"triggerType":"sla_breach"}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateEscalationRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestSLAHandler_CreateEscalationRule_MissingTriggerType(t *testing.T) {
	h := newTestSLAHandler()
	req := httptest.NewRequest(http.MethodPost, "/escalation-rules", strings.NewReader(`{"name":"Test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateEscalationRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing trigger type, got %d", w.Code)
	}
}

func TestSLAHandler_UpdateEscalationRule_MalformedJSON(t *testing.T) {
	h := newTestSLAHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/escalation-rules/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = slaWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateEscalationRule(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestSLARoutes_Registration(t *testing.T) {
	r := slaRouter()
	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		// SLA Policies
		{"ListPolicies", http.MethodGet, "/sla-policies/"},
		{"GetDefaultPolicy", http.MethodGet, "/sla-policies/default"},
		{"GetPolicy", http.MethodGet, "/sla-policies/" + validUUID},
		{"CreatePolicy", http.MethodPost, "/sla-policies/"},
		{"UpdatePolicy", http.MethodPut, "/sla-policies/" + validUUID},
		{"DeletePolicy", http.MethodDelete, "/sla-policies/" + validUUID},
		// Business Hours
		{"ListCalendars", http.MethodGet, "/business-hours/"},
		{"GetCalendar", http.MethodGet, "/business-hours/" + validUUID},
		{"CreateCalendar", http.MethodPost, "/business-hours/"},
		{"UpdateCalendar", http.MethodPut, "/business-hours/" + validUUID},
		{"DeleteCalendar", http.MethodDelete, "/business-hours/" + validUUID},
		// Escalation Rules
		{"ListEscalationRules", http.MethodGet, "/escalation-rules/"},
		{"GetEscalationRule", http.MethodGet, "/escalation-rules/" + validUUID},
		{"CreateEscalationRule", http.MethodPost, "/escalation-rules/"},
		{"UpdateEscalationRule", http.MethodPut, "/escalation-rules/" + validUUID},
		{"DeleteEscalationRule", http.MethodDelete, "/escalation-rules/" + validUUID},
		// Compliance / Breaches
		{"GetComplianceStats", http.MethodGet, "/sla-compliance"},
		{"ListBreaches", http.MethodGet, "/sla-breaches/" + validUUID},
	}

	for _, rt := range routes {
		t.Run(rt.name, func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound {
				t.Errorf("route %s %s returned 404 — not registered", rt.method, rt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 — method not allowed", rt.method, rt.path)
			}
		})
	}
}

package reporting

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

// ──────────────────────────────────────────────
// cronMatches tests — internal cron scheduler logic
// ──────────────────────────────────────────────

func TestCronMatches_AllWildcards(t *testing.T) {
	// "* * * * *" should match any time
	match, err := cronMatches("* * * * *", time.Date(2026, 3, 1, 14, 30, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected * * * * * to match any time")
	}
}

func TestCronMatches_SpecificMinute(t *testing.T) {
	// "30 * * * *" should match at minute 30
	match, err := cronMatches("30 * * * *", time.Date(2026, 3, 1, 14, 30, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected match at minute 30")
	}

	// Should not match at minute 15
	match, err = cronMatches("30 * * * *", time.Date(2026, 3, 1, 14, 15, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no match at minute 15")
	}
}

func TestCronMatches_SpecificHour(t *testing.T) {
	// "0 9 * * *" should match at 09:00
	match, err := cronMatches("0 9 * * *", time.Date(2026, 3, 1, 9, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected match at 09:00")
	}

	// Should not match at 10:00
	match, err = cronMatches("0 9 * * *", time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no match at 10:00")
	}
}

func TestCronMatches_SpecificDayOfMonth(t *testing.T) {
	// "0 0 1 * *" should match first day of month at midnight
	match, err := cronMatches("0 0 1 * *", time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected match on first of month at midnight")
	}

	// Should not match on 15th
	match, err = cronMatches("0 0 1 * *", time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no match on 15th of month")
	}
}

func TestCronMatches_SpecificMonth(t *testing.T) {
	// "0 0 1 1 *" should match Jan 1 at midnight
	match, err := cronMatches("0 0 1 1 *", time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected match on Jan 1 at midnight")
	}

	// Should not match in March
	match, err = cronMatches("0 0 1 1 *", time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no match in March")
	}
}

func TestCronMatches_SpecificDayOfWeek(t *testing.T) {
	// "0 0 * * 1" should match Monday (weekday 1)
	// 2026-03-02 is Monday
	match, err := cronMatches("0 0 * * 1", time.Date(2026, 3, 2, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected match on Monday")
	}

	// 2026-03-01 is Sunday
	match, err = cronMatches("0 0 * * 1", time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no match on Sunday")
	}
}

func TestCronMatches_DayOfWeek7MeansAlsoSunday(t *testing.T) {
	// "0 0 * * 7" should match Sunday (weekday 7 == 0)
	// 2026-03-01 is Sunday
	match, err := cronMatches("0 0 * * 7", time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected weekday 7 to match Sunday")
	}
}

func TestCronMatches_StepExpressions(t *testing.T) {
	// "*/15 * * * *" should match every 15 minutes
	tests := []struct {
		minute int
		want   bool
	}{
		{0, true},
		{15, true},
		{30, true},
		{45, true},
		{10, false},
		{25, false},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("minute_%d", tt.minute), func(t *testing.T) {
			at := time.Date(2026, 3, 1, 12, tt.minute, 0, 0, time.UTC)
			match, err := cronMatches("*/15 * * * *", at)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if match != tt.want {
				t.Errorf("*/15 at minute %d: got %v, want %v", tt.minute, match, tt.want)
			}
		})
	}
}

func TestCronMatches_CommaList(t *testing.T) {
	// "0,30 * * * *" should match at minute 0 and 30
	at0 := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	match, err := cronMatches("0,30 * * * *", at0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected match at minute 0")
	}

	at30 := time.Date(2026, 3, 1, 12, 30, 0, 0, time.UTC)
	match, err = cronMatches("0,30 * * * *", at30)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected match at minute 30")
	}

	at15 := time.Date(2026, 3, 1, 12, 15, 0, 0, time.UTC)
	match, err = cronMatches("0,30 * * * *", at15)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no match at minute 15")
	}
}

func TestCronMatches_InvalidFormat(t *testing.T) {
	tests := []struct {
		name     string
		schedule string
	}{
		{"too few fields", "* * *"},
		{"too many fields", "* * * * * *"},
		{"empty", ""},
		{"single field", "*"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := cronMatches(tt.schedule, time.Now())
			if err == nil {
				t.Errorf("expected error for invalid cron format %q", tt.schedule)
			}
		})
	}
}

func TestCronMatches_InvalidTokens(t *testing.T) {
	_, err := cronMatches("abc * * * *", time.Now())
	if err == nil {
		t.Error("expected error for invalid cron token 'abc'")
	}
}

func TestCronMatches_InvalidStep(t *testing.T) {
	_, err := cronMatches("*/0 * * * *", time.Now())
	if err == nil {
		t.Error("expected error for zero step in cron expression")
	}

	_, err = cronMatches("*/abc * * * *", time.Now())
	if err == nil {
		t.Error("expected error for non-numeric step")
	}
}

func TestCronMatches_OutOfRange(t *testing.T) {
	_, err := cronMatches("60 * * * *", time.Now())
	if err == nil {
		t.Error("expected error for minute 60 (out of range)")
	}

	_, err = cronMatches("* 24 * * *", time.Now())
	if err == nil {
		t.Error("expected error for hour 24 (out of range)")
	}

	_, err = cronMatches("* * 32 * *", time.Now())
	if err == nil {
		t.Error("expected error for day 32 (out of range)")
	}

	_, err = cronMatches("* * * 13 *", time.Now())
	if err == nil {
		t.Error("expected error for month 13 (out of range)")
	}
}

// ──────────────────────────────────────────────
// defaultExecutivePackTemplate validation
// ──────────────────────────────────────────────

func TestDefaultExecutivePackTemplate_ValidJSON(t *testing.T) {
	tmpl := defaultExecutivePackTemplate()
	if tmpl == nil {
		t.Fatal("expected non-nil template")
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(tmpl, &parsed); err != nil {
		t.Fatalf("template is not valid JSON: %v", err)
	}

	name, ok := parsed["name"]
	if !ok {
		t.Error("expected 'name' field in template")
	}
	if name != "monthly_executive_pack" {
		t.Errorf("expected template name 'monthly_executive_pack', got %v", name)
	}

	sections, ok := parsed["sections"]
	if !ok {
		t.Error("expected 'sections' field in template")
	}
	sectionList, ok := sections.([]interface{})
	if !ok {
		t.Fatal("expected sections to be an array")
	}
	if len(sectionList) != 6 {
		t.Errorf("expected 6 sections, got %d", len(sectionList))
	}

	branding, ok := parsed["branding"]
	if !ok {
		t.Error("expected 'branding' field in template")
	}
	brandingMap, ok := branding.(map[string]interface{})
	if !ok {
		t.Fatal("expected branding to be an object")
	}
	if brandingMap["org"] != "CBN ITD" {
		t.Errorf("expected branding org 'CBN ITD', got %v", brandingMap["org"])
	}
	if brandingMap["format"] != "pdf" {
		t.Errorf("expected branding format 'pdf', got %v", brandingMap["format"])
	}
}

// ──────────────────────────────────────────────
// DashboardRefresher construction tests
// ──────────────────────────────────────────────

func TestNewDashboardRefresher_DefaultInterval(t *testing.T) {
	svc := NewDashboardService(nil, nil, nil)
	refresher := NewDashboardRefresher(svc, 0)
	if refresher == nil {
		t.Fatal("expected non-nil refresher")
	}
	if refresher.interval != defaultDashboardRefreshInterval {
		t.Errorf("expected default interval %v, got %v", defaultDashboardRefreshInterval, refresher.interval)
	}
}

func TestNewDashboardRefresher_NegativeInterval(t *testing.T) {
	svc := NewDashboardService(nil, nil, nil)
	refresher := NewDashboardRefresher(svc, -1*time.Minute)
	if refresher == nil {
		t.Fatal("expected non-nil refresher")
	}
	if refresher.interval != defaultDashboardRefreshInterval {
		t.Errorf("expected default interval for negative, got %v", refresher.interval)
	}
}

func TestNewDashboardRefresher_CustomInterval(t *testing.T) {
	svc := NewDashboardService(nil, nil, nil)
	customInterval := 10 * time.Minute
	refresher := NewDashboardRefresher(svc, customInterval)
	if refresher == nil {
		t.Fatal("expected non-nil refresher")
	}
	if refresher.interval != customInterval {
		t.Errorf("expected custom interval %v, got %v", customInterval, refresher.interval)
	}
}

func TestDashboardRefresher_Start_NilReceiver(t *testing.T) {
	// Should not panic on nil receiver
	var refresher *DashboardRefresher
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	refresher.Start(ctx)
}

func TestDashboardRefresher_Start_NilService(t *testing.T) {
	// Should not panic when service is nil
	refresher := &DashboardRefresher{svc: nil, interval: time.Minute}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	refresher.Start(ctx)
}

// ──────────────────────────────────────────────
// ReportScheduler construction tests
// ──────────────────────────────────────────────

func TestNewReportScheduler_DefaultInterval(t *testing.T) {
	svc := NewReportService(nil, nil)
	scheduler := NewReportScheduler(svc, 0)
	if scheduler == nil {
		t.Fatal("expected non-nil scheduler")
	}
	if scheduler.interval != defaultReportScheduleInterval {
		t.Errorf("expected default interval %v, got %v", defaultReportScheduleInterval, scheduler.interval)
	}
}

func TestNewReportScheduler_NegativeInterval(t *testing.T) {
	svc := NewReportService(nil, nil)
	scheduler := NewReportScheduler(svc, -1*time.Minute)
	if scheduler == nil {
		t.Fatal("expected non-nil scheduler")
	}
	if scheduler.interval != defaultReportScheduleInterval {
		t.Errorf("expected default interval for negative, got %v", scheduler.interval)
	}
}

func TestNewReportScheduler_CustomInterval(t *testing.T) {
	svc := NewReportService(nil, nil)
	customInterval := 5 * time.Minute
	scheduler := NewReportScheduler(svc, customInterval)
	if scheduler == nil {
		t.Fatal("expected non-nil scheduler")
	}
	if scheduler.interval != customInterval {
		t.Errorf("expected custom interval %v, got %v", customInterval, scheduler.interval)
	}
}

func TestReportScheduler_Start_NilReceiver(t *testing.T) {
	var scheduler *ReportScheduler
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	scheduler.Start(ctx)
}

func TestReportScheduler_Start_NilService(t *testing.T) {
	scheduler := &ReportScheduler{svc: nil, interval: time.Minute}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	scheduler.Start(ctx)
}

// ──────────────────────────────────────────────
// Handler construction and wiring tests
// ──────────────────────────────────────────────

func TestNewHandler_NilDeps(t *testing.T) {
	h := NewHandler(nil, nil, nil)
	if h == nil {
		t.Fatal("expected non-nil Handler")
	}
	if h.dashboard == nil {
		t.Error("expected non-nil dashboard handler")
	}
	if h.report == nil {
		t.Error("expected non-nil report handler")
	}
	if h.search == nil {
		t.Error("expected non-nil search handler")
	}
	if h.dashboardSvc == nil {
		t.Error("expected non-nil dashboardSvc")
	}
	if h.reportSvc == nil {
		t.Error("expected non-nil reportSvc")
	}
	if h.searchSvc == nil {
		t.Error("expected non-nil searchSvc")
	}
}

func TestHandler_DashboardRefresher(t *testing.T) {
	h := NewHandler(nil, nil, nil)
	refresher := h.DashboardRefresher(3 * time.Minute)
	if refresher == nil {
		t.Fatal("expected non-nil DashboardRefresher")
	}
	if refresher.interval != 3*time.Minute {
		t.Errorf("expected 3m interval, got %v", refresher.interval)
	}
}

func TestHandler_ReportScheduler(t *testing.T) {
	h := NewHandler(nil, nil, nil)
	scheduler := h.ReportScheduler(2 * time.Minute)
	if scheduler == nil {
		t.Fatal("expected non-nil ReportScheduler")
	}
	if scheduler.interval != 2*time.Minute {
		t.Errorf("expected 2m interval, got %v", scheduler.interval)
	}
}

// ──────────────────────────────────────────────
// Service construction tests
// ──────────────────────────────────────────────

func TestNewReportService_NilDeps(t *testing.T) {
	svc := NewReportService(nil, nil)
	if svc == nil {
		t.Fatal("expected non-nil ReportService")
	}
}

func TestNewDashboardService_NilDeps(t *testing.T) {
	svc := NewDashboardService(nil, nil, nil)
	if svc == nil {
		t.Fatal("expected non-nil DashboardService")
	}
}

func TestNewSearchService_NilDeps(t *testing.T) {
	svc := NewSearchService(nil, nil)
	if svc == nil {
		t.Fatal("expected non-nil SearchService")
	}
}

func TestNewReportHandler_NilSvc(t *testing.T) {
	h := NewReportHandler(nil)
	if h == nil {
		t.Fatal("expected non-nil ReportHandler")
	}
}

func TestNewDashboardHandler_NilSvc(t *testing.T) {
	h := NewDashboardHandler(nil)
	if h == nil {
		t.Fatal("expected non-nil DashboardHandler")
	}
}

func TestNewSearchHandler_NilSvc(t *testing.T) {
	h := NewSearchHandler(nil)
	if h == nil {
		t.Fatal("expected non-nil SearchHandler")
	}
}

// ──────────────────────────────────────────────
// Response body validation for error responses
// ──────────────────────────────────────────────

func TestReportHandler_NoAuth_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/reports/", nil)
	w := httptest.NewRecorder()
	h.report.ListDefinitions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error")
	}
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected error code 'UNAUTHORIZED', got %q", resp.Errors[0].Code)
	}
}

func TestReportHandler_InvalidUUID_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/reports/bad-id", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad-id")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.report.GetDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}

	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error")
	}
	if resp.Errors[0].Code != "BAD_REQUEST" {
		t.Errorf("expected error code 'BAD_REQUEST', got %q", resp.Errors[0].Code)
	}
}

func TestReportHandler_CreateDefinition_ValidationErrorBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/reports/", strings.NewReader(`{"name":"","type":"custom"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.report.CreateDefinition(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}

	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error")
	}
	if resp.Errors[0].Code != "VALIDATION_ERROR" {
		t.Errorf("expected error code 'VALIDATION_ERROR', got %q", resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// Route registration: manage vs view permissions
// ──────────────────────────────────────────────

func TestReportRoutes_ViewPermissionAllowed(t *testing.T) {
	h := newTestReportingHandler()
	r := chi.NewRouter()
	// Recovery middleware to catch panics from nil pool in service calls.
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					w.WriteHeader(http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, req)
		})
	})
	h.Routes(r)

	validUUID := uuid.New().String()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "user@example.com",
		Roles:       []string{"user"},
		Permissions: []string{"reporting.view"},
	}

	viewRoutes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListDefinitions", http.MethodGet, "/reports/"},
		{"GetDefinition", http.MethodGet, "/reports/" + validUUID},
		{"GetExecutivePackDef", http.MethodGet, "/reports/executive-pack/definition"},
		{"ListReportRuns", http.MethodGet, "/reports/" + validUUID + "/runs/"},
		{"GetReportRun", http.MethodGet, "/reports/" + validUUID + "/runs/" + uuid.New().String()},
	}

	for _, rt := range viewRoutes {
		t.Run(rt.name, func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			ctx := types.SetAuthContext(req.Context(), auth)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			// Should NOT be 403 (permission passes); 500 is acceptable (nil pool panic recovered)
			if w.Code == http.StatusForbidden {
				t.Errorf("expected reporting.view to allow access to %s %s, but got 403", rt.method, rt.path)
			}
		})
	}
}

func TestReportRoutes_ManageRoutesForbiddenForViewOnly(t *testing.T) {
	r := reportingRouter()
	validUUID := uuid.New().String()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "user@example.com",
		Roles:       []string{"user"},
		Permissions: []string{"reporting.view"},
	}

	manageRoutes := []struct {
		name   string
		method string
		path   string
	}{
		{"CreateDefinition", http.MethodPost, "/reports/"},
		{"UpdateDefinition", http.MethodPut, "/reports/" + validUUID},
		{"DeleteDefinition", http.MethodDelete, "/reports/" + validUUID},
		{"EnsureExecutivePack", http.MethodPost, "/reports/executive-pack/ensure"},
		{"GenerateExecutivePack", http.MethodPost, "/reports/executive-pack/generate"},
		{"TriggerReportRun", http.MethodPost, "/reports/" + validUUID + "/run"},
	}

	for _, rt := range manageRoutes {
		t.Run(rt.name, func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			ctx := types.SetAuthContext(req.Context(), auth)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusForbidden {
				t.Errorf("expected 403 for %s %s with only reporting.view, got %d", rt.method, rt.path, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// cronFieldMatches edge cases
// ──────────────────────────────────────────────

func TestCronFieldMatches_Wildcard(t *testing.T) {
	match, err := cronFieldMatches("*", 42, 0, 59, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected wildcard to match")
	}
}

func TestCronFieldMatches_ExactMatch(t *testing.T) {
	match, err := cronFieldMatches("42", 42, 0, 59, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected exact match")
	}
}

func TestCronFieldMatches_NoMatch(t *testing.T) {
	match, err := cronFieldMatches("30", 42, 0, 59, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no match")
	}
}

func TestCronFieldMatches_CommaList(t *testing.T) {
	match, err := cronFieldMatches("10,20,30", 20, 0, 59, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected comma list to match 20")
	}

	match, err = cronFieldMatches("10,20,30", 25, 0, 59, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected comma list not to match 25")
	}
}

func TestCronFieldMatches_Step(t *testing.T) {
	// */5 with min=0, value=10 means (10-0)%5 == 0
	match, err := cronFieldMatches("*/5", 10, 0, 59, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected step match for */5 at 10")
	}

	match, err = cronFieldMatches("*/5", 11, 0, 59, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match {
		t.Error("expected no step match for */5 at 11")
	}
}

func TestCronFieldMatches_Weekday7IsSunday(t *testing.T) {
	// weekday=true, value=0 (Sunday), expr="7" should match
	match, err := cronFieldMatches("7", 0, 0, 7, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !match {
		t.Error("expected weekday 7 to match Sunday (0)")
	}
}

// ──────────────────────────────────────────────
// executiveSummaryCacheKey tests
// ──────────────────────────────────────────────

func TestExecutiveSummaryCacheKey(t *testing.T) {
	tenantID := uuid.New()
	key := executiveSummaryCacheKey(tenantID)
	expected := executiveSummaryCacheKeyPrefix + tenantID.String()
	if key != expected {
		t.Errorf("cache key mismatch: got %q, want %q", key, expected)
	}
}

func TestExecutiveSummaryCacheKey_DifferentTenants(t *testing.T) {
	t1 := uuid.New()
	t2 := uuid.New()
	k1 := executiveSummaryCacheKey(t1)
	k2 := executiveSummaryCacheKey(t2)
	if k1 == k2 {
		t.Error("expected different cache keys for different tenants")
	}
}

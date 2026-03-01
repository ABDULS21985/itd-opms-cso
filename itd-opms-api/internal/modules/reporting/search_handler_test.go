package reporting

import (
	"context"
	"encoding/json"
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
// Auth guard tests — every search endpoint must return 401 without auth
// ──────────────────────────────────────────────

func TestSearchHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestReportingHandler()

	validUUID := uuid.New().String()

	endpoints := []struct {
		name    string
		method  string
		path    string
		body    string
		handler func(http.ResponseWriter, *http.Request)
		params  map[string]string
	}{
		{
			"GlobalSearch", http.MethodGet,
			"/search/?q=test", "",
			h.search.GlobalSearch, nil,
		},
		{
			"ListSavedSearches", http.MethodGet,
			"/search/saved/", "",
			h.search.ListSavedSearches, nil,
		},
		{
			"ListRecentSearches", http.MethodGet,
			"/search/saved/recent", "",
			h.search.ListRecentSearches, nil,
		},
		{
			"SaveSearch", http.MethodPost,
			"/search/saved/",
			`{"query":"test","isSaved":true}`,
			h.search.SaveSearch, nil,
		},
		{
			"DeleteSavedSearch", http.MethodDelete,
			"/search/saved/" + validUUID, "",
			h.search.DeleteSavedSearch,
			map[string]string{"id": validUUID},
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

func TestSearchHandler_DeleteSavedSearch_InvalidUUID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodDelete, "/search/saved/not-a-uuid", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.search.DeleteSavedSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Query parameter validation
// ──────────────────────────────────────────────

func TestSearchHandler_GlobalSearch_MissingQuery(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/search/", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.search.GlobalSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing query parameter, got %d", w.Code)
	}
}

func TestSearchHandler_GlobalSearch_InvalidTenantID(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&tenant_id=bad-uuid", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.search.GlobalSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid tenant_id, got %d", w.Code)
	}
}

func TestSearchHandler_GlobalSearch_CrossTenantDenied(t *testing.T) {
	h := newTestReportingHandler()
	otherTenantID := uuid.New()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(), // Different tenant
		Email:       "test@example.com",
		Roles:       []string{"user"},
		Permissions: []string{"reporting.view"},
	}

	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&tenant_id="+otherTenantID.String(), nil)
	ctx := types.SetAuthContext(req.Context(), auth)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.search.GlobalSearch(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for cross-tenant search, got %d", w.Code)
	}
}

func TestSearchHandler_GlobalSearch_CrossTenantAllowed_GlobalAdmin(t *testing.T) {
	h := newTestReportingHandler()
	otherTenantID := uuid.New()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "admin@example.com",
		Roles:       []string{"global_admin"},
		Permissions: []string{"reporting.view"},
	}

	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&tenant_id="+otherTenantID.String(), nil)
	ctx := types.SetAuthContext(req.Context(), auth)
	req = req.WithContext(ctx)

	// The handler will pass the cross-tenant check for global_admin, then panic
	// on the nil pool when it tries to execute the search query. We recover from
	// the panic to verify the auth guard was passed (not 403).
	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.GlobalSearch(w, req)
	}()

	if w.Code == http.StatusForbidden {
		t.Errorf("expected global_admin to pass cross-tenant check, but got 403")
	}
}

func TestSearchHandler_GlobalSearch_CrossTenantAllowed_Wildcard(t *testing.T) {
	h := newTestReportingHandler()
	otherTenantID := uuid.New()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "super@example.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}

	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&tenant_id="+otherTenantID.String(), nil)
	ctx := types.SetAuthContext(req.Context(), auth)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.GlobalSearch(w, req)
	}()

	if w.Code == http.StatusForbidden {
		t.Errorf("expected wildcard permission to pass cross-tenant check, but got 403")
	}
}

func TestSearchHandler_GlobalSearch_SameTenantAllowed(t *testing.T) {
	h := newTestReportingHandler()
	tenantID := uuid.New()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    tenantID,
		Email:       "user@example.com",
		Roles:       []string{"user"},
		Permissions: []string{"reporting.view"},
	}

	// Same tenant ID in query, should pass the tenant check.
	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&tenant_id="+tenantID.String(), nil)
	ctx := types.SetAuthContext(req.Context(), auth)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.GlobalSearch(w, req)
	}()

	if w.Code == http.StatusForbidden {
		t.Errorf("expected same-tenant search to pass, but got 403")
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestSearchHandler_SaveSearch_MalformedJSON(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/search/saved/", strings.NewReader("{invalid"))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.search.SaveSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

func TestSearchHandler_SaveSearch_EmptyQuery(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/search/saved/", strings.NewReader(`{"query":"","isSaved":true}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.search.SaveSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty query, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// normalizeCSVQueryParam tests
// ──────────────────────────────────────────────

func TestNormalizeCSVQueryParam(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{"single value", "ticket", []string{"ticket"}},
		{"two values", "ticket,project", []string{"ticket", "project"}},
		{"with spaces", " ticket , project , article ", []string{"ticket", "project", "article"}},
		{"empty parts filtered", "ticket,,project,", []string{"ticket", "project"}},
		{"all empty", ",,", nil},
		{"single empty", "", nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizeCSVQueryParam(tt.input)

			if tt.expected == nil {
				if len(result) != 0 {
					t.Errorf("expected empty result, got %v", result)
				}
				return
			}

			if len(result) != len(tt.expected) {
				t.Errorf("length mismatch: got %d, want %d", len(result), len(tt.expected))
				return
			}

			for i, v := range result {
				if v != tt.expected[i] {
					t.Errorf("index %d: got %q, want %q", i, v, tt.expected[i])
				}
			}
		})
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestSearchRoutes_Registration(t *testing.T) {
	r := reportingRouter()

	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"GlobalSearch", http.MethodGet, "/search/"},
		{"ListSavedSearches", http.MethodGet, "/search/saved/"},
		{"ListRecentSearches", http.MethodGet, "/search/saved/recent"},
		{"SaveSearch", http.MethodPost, "/search/saved/"},
		{"DeleteSavedSearch", http.MethodDelete, "/search/saved/" + validUUID},
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

func TestSearchRoutes_PermissionEnforced(t *testing.T) {
	r := reportingRouter()
	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"GlobalSearch", http.MethodGet, "/search/?q=test"},
		{"ListSavedSearches", http.MethodGet, "/search/saved/"},
		{"ListRecentSearches", http.MethodGet, "/search/saved/recent"},
		{"SaveSearch", http.MethodPost, "/search/saved/"},
		{"DeleteSavedSearch", http.MethodDelete, "/search/saved/" + validUUID},
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

func TestSearchRoutes_ForbiddenWithoutPermission(t *testing.T) {
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
		{"GlobalSearch", http.MethodGet, "/search/?q=test"},
		{"ListSavedSearches", http.MethodGet, "/search/saved/"},
		{"ListRecentSearches", http.MethodGet, "/search/saved/recent"},
		{"SaveSearch", http.MethodPost, "/search/saved/"},
		{"DeleteSavedSearch", http.MethodDelete, "/search/saved/" + validUUID},
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
// Entity types parsing via query parameter
// ──────────────────────────────────────────────

func TestSearchHandler_GlobalSearch_EntityTypesParam(t *testing.T) {
	h := newTestReportingHandler()

	// Using entity_types parameter with specific types should pass validation
	// and then panic on nil pool (meaning validation passed)
	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&entity_types=tickets,projects", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.GlobalSearch(w, req)
	}()

	// Should NOT return 400 -- query param 'q' is present
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected entity_types param to pass validation, got 400")
	}
}

func TestSearchHandler_GlobalSearch_TypesAlternateParam(t *testing.T) {
	h := newTestReportingHandler()

	// Using "types" alternate parameter
	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&types=tickets,articles", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.GlobalSearch(w, req)
	}()

	// Should NOT return 400
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected 'types' alternate param to pass validation, got 400")
	}
}

func TestSearchHandler_GlobalSearch_EntityTypesPriorityOverTypes(t *testing.T) {
	h := newTestReportingHandler()

	// When both entity_types and types are provided, entity_types takes precedence
	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&entity_types=tickets&types=projects", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.GlobalSearch(w, req)
	}()

	// Should NOT return 400
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected params to pass validation, got 400")
	}
}

// ──────────────────────────────────────────────
// Response body validation for error responses
// ──────────────────────────────────────────────

func TestSearchHandler_NoAuth_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/search/?q=test", nil)
	w := httptest.NewRecorder()
	h.search.GlobalSearch(w, req)

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

func TestSearchHandler_MissingQuery_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/search/", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.search.GlobalSearch(w, req)

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

func TestSearchHandler_CrossTenantDenied_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	otherTenantID := uuid.New()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@example.com",
		Roles:       []string{"user"},
		Permissions: []string{"reporting.view"},
	}

	req := httptest.NewRequest(http.MethodGet, "/search/?q=test&tenant_id="+otherTenantID.String(), nil)
	ctx := types.SetAuthContext(req.Context(), auth)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.search.GlobalSearch(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
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
	if resp.Errors[0].Code != "FORBIDDEN" {
		t.Errorf("expected error code 'FORBIDDEN', got %q", resp.Errors[0].Code)
	}
}

func TestSearchHandler_SaveSearch_EmptyQuery_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/search/saved/", strings.NewReader(`{"query":"","isSaved":true}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.search.SaveSearch(w, req)

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

func TestSearchHandler_DeleteSavedSearch_InvalidUUID_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodDelete, "/search/saved/bad-id", nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad-id")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.search.DeleteSavedSearch(w, req)

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

func TestSearchHandler_SaveSearch_MalformedJSON_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/search/saved/", strings.NewReader("{not valid json"))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	h.search.SaveSearch(w, req)

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

// ──────────────────────────────────────────────
// normalizeCSVQueryParam additional edge cases
// ──────────────────────────────────────────────

func TestNormalizeCSVQueryParam_WhitespaceOnly(t *testing.T) {
	result := normalizeCSVQueryParam("  ,  ,  ")
	if len(result) != 0 {
		t.Errorf("expected empty result for whitespace-only parts, got %v", result)
	}
}

func TestNormalizeCSVQueryParam_MixedValid(t *testing.T) {
	result := normalizeCSVQueryParam("ticket,,project, ,article")
	expected := []string{"ticket", "project", "article"}
	if len(result) != len(expected) {
		t.Fatalf("length mismatch: got %d, want %d", len(result), len(expected))
	}
	for i, v := range result {
		if v != expected[i] {
			t.Errorf("index %d: got %q, want %q", i, v, expected[i])
		}
	}
}

func TestNormalizeCSVQueryParam_PreservesOrder(t *testing.T) {
	result := normalizeCSVQueryParam("c,b,a")
	if len(result) != 3 {
		t.Fatalf("expected 3 items, got %d", len(result))
	}
	if result[0] != "c" || result[1] != "b" || result[2] != "a" {
		t.Errorf("expected order c,b,a but got %v", result)
	}
}

// ──────────────────────────────────────────────
// ViewPermission allows search routes
// ──────────────────────────────────────────────

func TestSearchRoutes_ViewPermissionAllowed(t *testing.T) {
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
		{"GlobalSearch", http.MethodGet, "/search/?q=test"},
		{"ListSavedSearches", http.MethodGet, "/search/saved/"},
		{"ListRecentSearches", http.MethodGet, "/search/saved/recent"},
		{"SaveSearch", http.MethodPost, "/search/saved/"},
		{"DeleteSavedSearch", http.MethodDelete, "/search/saved/" + validUUID},
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

// ──────────────────────────────────────────────
// SaveSearch valid body passes validation
// ──────────────────────────────────────────────

func TestSearchHandler_SaveSearch_ValidBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/search/saved/", strings.NewReader(`{"query":"test search","entityTypes":["tickets"],"isSaved":true}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.SaveSearch(w, req)
	}()

	// Should NOT be 400 -- body is valid
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected valid body to pass validation, got 400")
	}
}

func TestSearchHandler_SaveSearch_MinimalBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodPost, "/search/saved/", strings.NewReader(`{"query":"hello"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.SaveSearch(w, req)
	}()

	// Should NOT be 400 -- query is present, isSaved defaults to false
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected minimal valid body to pass validation, got 400")
	}
}

// ──────────────────────────────────────────────
// GlobalSearch query-only validation passes
// ──────────────────────────────────────────────

func TestSearchHandler_GlobalSearch_ValidQuery(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/search/?q=server+outage", nil)
	req = withReportingAuth(req)

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.GlobalSearch(w, req)
	}()

	// Should NOT return 400 -- query is present
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected valid query to pass validation, got 400")
	}
}

// ──────────────────────────────────────────────
// DeleteSavedSearch valid UUID passes validation
// ──────────────────────────────────────────────

func TestSearchHandler_DeleteSavedSearch_ValidUUID(t *testing.T) {
	h := newTestReportingHandler()
	validID := uuid.New().String()
	req := httptest.NewRequest(http.MethodDelete, "/search/saved/"+validID, nil)
	req = withReportingAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	func() {
		defer func() { recover() }()
		h.search.DeleteSavedSearch(w, req)
	}()

	// Should NOT be 400 -- UUID is valid
	if w.Code == http.StatusBadRequest {
		t.Errorf("expected valid UUID to pass validation, got 400")
	}
}

// ──────────────────────────────────────────────
// Handler methods with all auth endpoints
// ──────────────────────────────────────────────

func TestSearchHandler_ListSavedSearches_NoAuth_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/search/saved/", nil)
	w := httptest.NewRecorder()
	h.search.ListSavedSearches(w, req)

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
}

func TestSearchHandler_ListRecentSearches_NoAuth_ResponseBody(t *testing.T) {
	h := newTestReportingHandler()
	req := httptest.NewRequest(http.MethodGet, "/search/saved/recent", nil)
	w := httptest.NewRecorder()
	h.search.ListRecentSearches(w, req)

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
}

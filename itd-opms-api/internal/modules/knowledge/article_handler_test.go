package knowledge

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
// Test helpers
// ──────────────────────────────────────────────

func newTestKnowledgeHandler() *Handler {
	return NewHandler(nil, nil)
}

func knowledgeRouter() chi.Router {
	h := newTestKnowledgeHandler()
	r := chi.NewRouter()
	h.Routes(r)
	return r
}

func withKnowledgeAuth(r *http.Request) *http.Request {
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
// Auth guard tests — every article/category endpoint must return 401 without auth
// ──────────────────────────────────────────────

func TestArticleHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestKnowledgeHandler()

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
			"ListCategories", http.MethodGet, "/categories/", "",
			h.article.ListCategories, nil,
		},
		{
			"GetCategory", http.MethodGet, "/categories/" + validUUID, "",
			h.article.GetCategory, map[string]string{"id": validUUID},
		},
		{
			"CreateCategory", http.MethodPost, "/categories/", `{"name":"Test Category"}`,
			h.article.CreateCategory, nil,
		},
		{
			"UpdateCategory", http.MethodPut, "/categories/" + validUUID, `{"name":"Updated"}`,
			h.article.UpdateCategory, map[string]string{"id": validUUID},
		},
		{
			"DeleteCategory", http.MethodDelete, "/categories/" + validUUID, "",
			h.article.DeleteCategory, map[string]string{"id": validUUID},
		},
		{
			"ListArticles", http.MethodGet, "/articles/", "",
			h.article.ListArticles, nil,
		},
		{
			"SearchArticles", http.MethodGet, "/articles/search?q=test", "",
			h.article.SearchArticles, nil,
		},
		{
			"GetArticleBySlug", http.MethodGet, "/articles/slug/my-article", "",
			h.article.GetArticleBySlug, map[string]string{"slug": "my-article"},
		},
		{
			"GetArticle", http.MethodGet, "/articles/" + validUUID, "",
			h.article.GetArticle, map[string]string{"id": validUUID},
		},
		{
			"CreateArticle", http.MethodPost, "/articles/",
			`{"title":"Test","slug":"test","content":"body","type":"faq"}`,
			h.article.CreateArticle, nil,
		},
		{
			"UpdateArticle", http.MethodPut, "/articles/" + validUUID, `{"title":"Updated"}`,
			h.article.UpdateArticle, map[string]string{"id": validUUID},
		},
		{
			"DeleteArticle", http.MethodDelete, "/articles/" + validUUID, "",
			h.article.DeleteArticle, map[string]string{"id": validUUID},
		},
		{
			"PublishArticle", http.MethodPost, "/articles/" + validUUID + "/publish", "",
			h.article.PublishArticle, map[string]string{"id": validUUID},
		},
		{
			"ArchiveArticle", http.MethodPost, "/articles/" + validUUID + "/archive", "",
			h.article.ArchiveArticle, map[string]string{"id": validUUID},
		},
		{
			"IncrementViewCount", http.MethodPost, "/articles/" + validUUID + "/view", "",
			h.article.IncrementViewCount, map[string]string{"id": validUUID},
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

			// Set chi URL params for routes that need them.
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

func TestArticleHandler_GetCategory_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/categories/not-a-uuid", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.GetCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestArticleHandler_UpdateCategory_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPut, "/categories/bad", strings.NewReader(`{"name":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.UpdateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestArticleHandler_DeleteCategory_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodDelete, "/categories/bad", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.DeleteCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestArticleHandler_GetArticle_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/articles/not-a-uuid", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.GetArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestArticleHandler_UpdateArticle_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPut, "/articles/xyz", strings.NewReader(`{"title":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.UpdateArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestArticleHandler_DeleteArticle_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodDelete, "/articles/xyz", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.DeleteArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestArticleHandler_PublishArticle_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/articles/xyz/publish", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.PublishArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestArticleHandler_ArchiveArticle_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/articles/xyz/archive", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.ArchiveArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestArticleHandler_IncrementViewCount_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/articles/xyz/view", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "xyz")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.IncrementViewCount(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestArticleHandler_CreateCategory_MalformedJSON(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/categories/", strings.NewReader("{invalid json"))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.CreateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

func TestArticleHandler_CreateCategory_EmptyName(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/categories/", strings.NewReader(`{"name":""}`))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.CreateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty name, got %d", w.Code)
	}
}

func TestArticleHandler_UpdateCategory_MalformedJSON(t *testing.T) {
	h := newTestKnowledgeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/categories/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.UpdateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

func TestArticleHandler_CreateArticle_MalformedJSON(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/articles/", strings.NewReader("{invalid"))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.CreateArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

func TestArticleHandler_CreateArticle_MissingRequiredFields(t *testing.T) {
	h := newTestKnowledgeHandler()

	tests := []struct {
		name string
		body string
	}{
		{"missing title", `{"slug":"test","content":"body","type":"faq"}`},
		{"missing slug", `{"title":"test","content":"body","type":"faq"}`},
		{"missing content", `{"title":"test","slug":"test","type":"faq"}`},
		{"missing type", `{"title":"test","slug":"test","content":"body"}`},
		{"all empty", `{"title":"","slug":"","content":"","type":""}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/articles/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = withKnowledgeAuth(req)

			w := httptest.NewRecorder()
			h.article.CreateArticle(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %s, got %d", tt.name, w.Code)
			}
		})
	}
}

func TestArticleHandler_UpdateArticle_MalformedJSON(t *testing.T) {
	h := newTestKnowledgeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/articles/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.article.UpdateArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Query parameter validation
// ──────────────────────────────────────────────

func TestArticleHandler_ListCategories_InvalidParentID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/categories/?parent_id=not-a-uuid", nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.ListCategories(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid parent_id, got %d", w.Code)
	}
}

func TestArticleHandler_ListArticles_InvalidCategoryID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/articles/?category_id=bad", nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.ListArticles(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid category_id, got %d", w.Code)
	}
}

func TestArticleHandler_SearchArticles_MissingQuery(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/articles/search", nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.SearchArticles(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing q parameter, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestArticleRoutes_Registration(t *testing.T) {
	r := knowledgeRouter()

	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListCategories", http.MethodGet, "/categories/"},
		{"GetCategory", http.MethodGet, "/categories/" + validUUID},
		{"CreateCategory", http.MethodPost, "/categories/"},
		{"UpdateCategory", http.MethodPut, "/categories/" + validUUID},
		{"DeleteCategory", http.MethodDelete, "/categories/" + validUUID},
		{"ListArticles", http.MethodGet, "/articles/"},
		{"SearchArticles", http.MethodGet, "/articles/search"},
		{"GetArticleBySlug", http.MethodGet, "/articles/slug/my-slug"},
		{"GetArticle", http.MethodGet, "/articles/" + validUUID},
		{"CreateArticle", http.MethodPost, "/articles/"},
		{"UpdateArticle", http.MethodPut, "/articles/" + validUUID},
		{"DeleteArticle", http.MethodDelete, "/articles/" + validUUID},
		{"PublishArticle", http.MethodPost, "/articles/" + validUUID + "/publish"},
		{"ArchiveArticle", http.MethodPost, "/articles/" + validUUID + "/archive"},
		{"IncrementViewCount", http.MethodPost, "/articles/" + validUUID + "/view"},
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

func TestArticleRoutes_PermissionEnforced(t *testing.T) {
	r := knowledgeRouter()
	validUUID := uuid.New().String()

	// Request with no auth context should get 401 from middleware.
	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListCategories", http.MethodGet, "/categories/"},
		{"CreateCategory", http.MethodPost, "/categories/"},
		{"ListArticles", http.MethodGet, "/articles/"},
		{"CreateArticle", http.MethodPost, "/articles/"},
		{"PublishArticle", http.MethodPost, "/articles/" + validUUID + "/publish"},
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

func TestArticleRoutes_ForbiddenWithoutPermission(t *testing.T) {
	r := knowledgeRouter()
	validUUID := uuid.New().String()

	// Auth with no permissions should get 403 from RequirePermission middleware.
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
		{"ListCategories", http.MethodGet, "/categories/"},
		{"CreateCategory", http.MethodPost, "/categories/"},
		{"ListArticles", http.MethodGet, "/articles/"},
		{"DeleteArticle", http.MethodDelete, "/articles/" + validUUID},
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
// View-only permission should be forbidden on manage routes
// ──────────────────────────────────────────────

func TestArticleRoutes_ViewPermissionCannotManage(t *testing.T) {
	r := knowledgeRouter()
	validUUID := uuid.New().String()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "viewer@example.com",
		Roles:       []string{"viewer"},
		Permissions: []string{"knowledge.view"},
	}

	manageRoutes := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"CreateCategory", http.MethodPost, "/categories/", `{"name":"test"}`},
		{"UpdateCategory", http.MethodPut, "/categories/" + validUUID, `{"name":"x"}`},
		{"DeleteCategory", http.MethodDelete, "/categories/" + validUUID, ""},
		{"CreateArticle", http.MethodPost, "/articles/", `{"title":"t","slug":"s","content":"c","type":"faq"}`},
		{"UpdateArticle", http.MethodPut, "/articles/" + validUUID, `{"title":"x"}`},
		{"DeleteArticle", http.MethodDelete, "/articles/" + validUUID, ""},
		{"PublishArticle", http.MethodPost, "/articles/" + validUUID + "/publish", ""},
		{"ArchiveArticle", http.MethodPost, "/articles/" + validUUID + "/archive", ""},
	}

	for _, rt := range manageRoutes {
		t.Run(fmt.Sprintf("ViewOnly_%s", rt.name), func(t *testing.T) {
			var req *http.Request
			if rt.body != "" {
				req = httptest.NewRequest(rt.method, rt.path, strings.NewReader(rt.body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(rt.method, rt.path, nil)
			}
			ctx := types.SetAuthContext(req.Context(), auth)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusForbidden {
				t.Errorf("expected 403 for view-only user on %s %s, got %d", rt.method, rt.path, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Verify view-only permission allows read endpoints
// ──────────────────────────────────────────────

func TestArticleRoutes_ViewPermissionAllowsRead(t *testing.T) {
	r := knowledgeRouter()
	validUUID := uuid.New().String()

	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "viewer@example.com",
		Roles:       []string{"viewer"},
		Permissions: []string{"knowledge.view"},
	}

	// These should NOT return 401 or 403 (they will panic or return 500
	// because of nil pool, but that is expected and proves routing works).
	readRoutes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListCategories", http.MethodGet, "/categories/"},
		{"GetCategory", http.MethodGet, "/categories/" + validUUID},
		{"ListArticles", http.MethodGet, "/articles/"},
		{"GetArticle", http.MethodGet, "/articles/" + validUUID},
		{"SearchArticles", http.MethodGet, "/articles/search?q=test"},
		{"GetArticleBySlug", http.MethodGet, "/articles/slug/my-slug"},
	}

	for _, rt := range readRoutes {
		t.Run(fmt.Sprintf("ViewAllowed_%s", rt.name), func(t *testing.T) {
			req := httptest.NewRequest(rt.method, rt.path, nil)
			ctx := types.SetAuthContext(req.Context(), auth)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()

			// Use a recovery wrapper since nil pool will panic in service layer.
			func() {
				defer func() { recover() }()
				r.ServeHTTP(w, req)
			}()

			if w.Code == http.StatusUnauthorized {
				t.Errorf("unexpected 401 for view-permitted user on %s %s", rt.method, rt.path)
			}
			if w.Code == http.StatusForbidden {
				t.Errorf("unexpected 403 for view-permitted user on %s %s", rt.method, rt.path)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Additional edge case tests
// ──────────────────────────────────────────────

func TestArticleHandler_CreateArticle_EmptyBody(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/articles/", strings.NewReader(""))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.CreateArticle(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty body, got %d", w.Code)
	}
}

func TestArticleHandler_CreateCategory_EmptyBody(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/categories/", strings.NewReader(""))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.article.CreateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty body, got %d", w.Code)
	}
}

func TestArticleHandler_SearchArticles_WithQuery(t *testing.T) {
	h := newTestKnowledgeHandler()
	// This will have auth but nil pool, so the handler should pass validation
	// but then fail on service layer. The point is to ensure the handler
	// does NOT reject a request with a valid query string.
	req := httptest.NewRequest(http.MethodGet, "/articles/search?q=password", nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()

	// Will panic because service uses nil pool -- that is expected.
	func() {
		defer func() { recover() }()
		h.article.SearchArticles(w, req)
	}()

	// If it returned 400, that means validation rejected it wrongly.
	if w.Code == http.StatusBadRequest {
		t.Errorf("unexpected 400 for valid search query")
	}
}

func TestArticleHandler_ListArticles_ValidFilters(t *testing.T) {
	h := newTestKnowledgeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodGet, "/articles/?category_id="+validUUID+"&status=published&type=faq&author_id="+validUUID, nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()

	// Will panic because service uses nil pool -- that is expected.
	func() {
		defer func() { recover() }()
		h.article.ListArticles(w, req)
	}()

	// If it returned 400, that means validation rejected the valid params wrongly.
	if w.Code == http.StatusBadRequest {
		t.Errorf("unexpected 400 for valid query filters")
	}
}

func TestArticleHandler_ListCategories_ValidParentID(t *testing.T) {
	h := newTestKnowledgeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodGet, "/categories/?parent_id="+validUUID, nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()

	func() {
		defer func() { recover() }()
		h.article.ListCategories(w, req)
	}()

	if w.Code == http.StatusBadRequest {
		t.Errorf("unexpected 400 for valid parent_id")
	}
}

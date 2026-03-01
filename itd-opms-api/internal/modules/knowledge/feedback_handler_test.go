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
// Auth guard tests — every feedback endpoint must return 401 without auth
// ──────────────────────────────────────────────

func TestFeedbackHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestKnowledgeHandler()

	validArticleID := uuid.New().String()
	validFeedbackID := uuid.New().String()

	endpoints := []struct {
		name    string
		method  string
		path    string
		body    string
		handler func(http.ResponseWriter, *http.Request)
		params  map[string]string
	}{
		{
			"ListFeedback", http.MethodGet,
			"/articles/" + validArticleID + "/feedback/", "",
			h.feedback.ListFeedback,
			map[string]string{"articleId": validArticleID},
		},
		{
			"GetFeedbackStats", http.MethodGet,
			"/articles/" + validArticleID + "/feedback/stats", "",
			h.feedback.GetFeedbackStats,
			map[string]string{"articleId": validArticleID},
		},
		{
			"CreateFeedback", http.MethodPost,
			"/articles/" + validArticleID + "/feedback/",
			`{"isHelpful":true}`,
			h.feedback.CreateFeedback,
			map[string]string{"articleId": validArticleID},
		},
		{
			"DeleteFeedback", http.MethodDelete,
			"/articles/" + validArticleID + "/feedback/" + validFeedbackID, "",
			h.feedback.DeleteFeedback,
			map[string]string{"articleId": validArticleID, "id": validFeedbackID},
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

func TestFeedbackHandler_ListFeedback_InvalidArticleID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/articles/bad-uuid/feedback/", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("articleId", "bad-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.feedback.ListFeedback(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid article ID, got %d", w.Code)
	}
}

func TestFeedbackHandler_GetFeedbackStats_InvalidArticleID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/articles/bad/feedback/stats", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("articleId", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.feedback.GetFeedbackStats(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid article ID, got %d", w.Code)
	}
}

func TestFeedbackHandler_CreateFeedback_InvalidArticleID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/articles/bad/feedback/", strings.NewReader(`{"isHelpful":true}`))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("articleId", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.feedback.CreateFeedback(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid article ID, got %d", w.Code)
	}
}

func TestFeedbackHandler_DeleteFeedback_InvalidFeedbackID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodDelete, "/articles/"+uuid.New().String()+"/feedback/bad", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("articleId", uuid.New().String())
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.feedback.DeleteFeedback(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid feedback ID, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestFeedbackHandler_CreateFeedback_MalformedJSON(t *testing.T) {
	h := newTestKnowledgeHandler()
	validArticleID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/articles/"+validArticleID+"/feedback/", strings.NewReader("{invalid"))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("articleId", validArticleID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.feedback.CreateFeedback(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestFeedbackRoutes_Registration(t *testing.T) {
	r := knowledgeRouter()

	validArticleID := uuid.New().String()
	validFeedbackID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListFeedback", http.MethodGet, "/articles/" + validArticleID + "/feedback/"},
		{"GetFeedbackStats", http.MethodGet, "/articles/" + validArticleID + "/feedback/stats"},
		{"CreateFeedback", http.MethodPost, "/articles/" + validArticleID + "/feedback/"},
		{"DeleteFeedback", http.MethodDelete, "/articles/" + validArticleID + "/feedback/" + validFeedbackID},
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

func TestFeedbackRoutes_PermissionEnforced(t *testing.T) {
	r := knowledgeRouter()
	validArticleID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListFeedback", http.MethodGet, "/articles/" + validArticleID + "/feedback/"},
		{"GetFeedbackStats", http.MethodGet, "/articles/" + validArticleID + "/feedback/stats"},
		{"CreateFeedback", http.MethodPost, "/articles/" + validArticleID + "/feedback/"},
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

func TestFeedbackRoutes_ForbiddenWithoutPermission(t *testing.T) {
	r := knowledgeRouter()
	validArticleID := uuid.New().String()
	validFeedbackID := uuid.New().String()

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
		{"ListFeedback", http.MethodGet, "/articles/" + validArticleID + "/feedback/"},
		{"GetFeedbackStats", http.MethodGet, "/articles/" + validArticleID + "/feedback/stats"},
		{"CreateFeedback", http.MethodPost, "/articles/" + validArticleID + "/feedback/"},
		{"DeleteFeedback", http.MethodDelete, "/articles/" + validArticleID + "/feedback/" + validFeedbackID},
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

func TestFeedbackRoutes_ViewPermissionCannotDelete(t *testing.T) {
	r := knowledgeRouter()
	validArticleID := uuid.New().String()
	validFeedbackID := uuid.New().String()

	// User with knowledge.view should not be able to delete feedback (requires knowledge.manage).
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "viewer@example.com",
		Roles:       []string{"viewer"},
		Permissions: []string{"knowledge.view"},
	}

	req := httptest.NewRequest(http.MethodDelete, "/articles/"+validArticleID+"/feedback/"+validFeedbackID, nil)
	ctx := types.SetAuthContext(req.Context(), auth)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for view-only user deleting feedback, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Additional edge case tests
// ──────────────────────────────────────────────

func TestFeedbackHandler_CreateFeedback_EmptyBody(t *testing.T) {
	h := newTestKnowledgeHandler()
	validArticleID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/articles/"+validArticleID+"/feedback/", strings.NewReader(""))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("articleId", validArticleID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.feedback.CreateFeedback(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty body, got %d", w.Code)
	}
}

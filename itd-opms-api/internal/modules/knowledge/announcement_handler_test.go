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
// Auth guard tests — every announcement endpoint must return 401 without auth
// ──────────────────────────────────────────────

func TestAnnouncementHandler_NoAuth_Returns401(t *testing.T) {
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
			"ListAnnouncements", http.MethodGet,
			"/announcements/", "",
			h.announcement.ListAnnouncements, nil,
		},
		{
			"GetAnnouncement", http.MethodGet,
			"/announcements/" + validUUID, "",
			h.announcement.GetAnnouncement,
			map[string]string{"id": validUUID},
		},
		{
			"CreateAnnouncement", http.MethodPost,
			"/announcements/",
			`{"title":"Test","content":"Body","priority":"high","targetAudience":"all"}`,
			h.announcement.CreateAnnouncement, nil,
		},
		{
			"UpdateAnnouncement", http.MethodPut,
			"/announcements/" + validUUID,
			`{"title":"Updated"}`,
			h.announcement.UpdateAnnouncement,
			map[string]string{"id": validUUID},
		},
		{
			"DeleteAnnouncement", http.MethodDelete,
			"/announcements/" + validUUID, "",
			h.announcement.DeleteAnnouncement,
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

func TestAnnouncementHandler_GetAnnouncement_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/announcements/not-a-uuid", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-a-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.announcement.GetAnnouncement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestAnnouncementHandler_UpdateAnnouncement_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPut, "/announcements/bad", strings.NewReader(`{"title":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.announcement.UpdateAnnouncement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestAnnouncementHandler_DeleteAnnouncement_InvalidUUID(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodDelete, "/announcements/bad", nil)
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.announcement.DeleteAnnouncement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestAnnouncementHandler_CreateAnnouncement_MalformedJSON(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/announcements/", strings.NewReader("{invalid"))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.announcement.CreateAnnouncement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

func TestAnnouncementHandler_CreateAnnouncement_MissingRequiredFields(t *testing.T) {
	h := newTestKnowledgeHandler()

	tests := []struct {
		name string
		body string
	}{
		{"missing title", `{"content":"body","priority":"high","targetAudience":"all"}`},
		{"missing content", `{"title":"test","priority":"high","targetAudience":"all"}`},
		{"missing priority", `{"title":"test","content":"body","targetAudience":"all"}`},
		{"missing targetAudience", `{"title":"test","content":"body","priority":"high"}`},
		{"all empty", `{"title":"","content":"","priority":"","targetAudience":""}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/announcements/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = withKnowledgeAuth(req)

			w := httptest.NewRecorder()
			h.announcement.CreateAnnouncement(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %s, got %d", tt.name, w.Code)
			}
		})
	}
}

func TestAnnouncementHandler_UpdateAnnouncement_MalformedJSON(t *testing.T) {
	h := newTestKnowledgeHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/announcements/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.announcement.UpdateAnnouncement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed JSON, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Query parameter validation
// ──────────────────────────────────────────────

func TestAnnouncementHandler_ListAnnouncements_InvalidIsActive(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/announcements/?is_active=not-bool", nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.announcement.ListAnnouncements(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid is_active, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestAnnouncementRoutes_Registration(t *testing.T) {
	r := knowledgeRouter()

	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListAnnouncements", http.MethodGet, "/announcements/"},
		{"GetAnnouncement", http.MethodGet, "/announcements/" + validUUID},
		{"CreateAnnouncement", http.MethodPost, "/announcements/"},
		{"UpdateAnnouncement", http.MethodPut, "/announcements/" + validUUID},
		{"DeleteAnnouncement", http.MethodDelete, "/announcements/" + validUUID},
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

func TestAnnouncementRoutes_PermissionEnforced(t *testing.T) {
	r := knowledgeRouter()
	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListAnnouncements", http.MethodGet, "/announcements/"},
		{"GetAnnouncement", http.MethodGet, "/announcements/" + validUUID},
		{"CreateAnnouncement", http.MethodPost, "/announcements/"},
		{"UpdateAnnouncement", http.MethodPut, "/announcements/" + validUUID},
		{"DeleteAnnouncement", http.MethodDelete, "/announcements/" + validUUID},
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

func TestAnnouncementRoutes_ForbiddenWithoutPermission(t *testing.T) {
	r := knowledgeRouter()
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
		{"ListAnnouncements", http.MethodGet, "/announcements/"},
		{"GetAnnouncement", http.MethodGet, "/announcements/" + validUUID},
		{"CreateAnnouncement", http.MethodPost, "/announcements/"},
		{"DeleteAnnouncement", http.MethodDelete, "/announcements/" + validUUID},
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

func TestAnnouncementRoutes_ViewPermissionCannotManage(t *testing.T) {
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
		{"CreateAnnouncement", http.MethodPost, "/announcements/", `{"title":"t","content":"c","priority":"high","targetAudience":"all"}`},
		{"UpdateAnnouncement", http.MethodPut, "/announcements/" + validUUID, `{"title":"x"}`},
		{"DeleteAnnouncement", http.MethodDelete, "/announcements/" + validUUID, ""},
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
// Additional edge case tests
// ──────────────────────────────────────────────

func TestAnnouncementHandler_CreateAnnouncement_EmptyBody(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodPost, "/announcements/", strings.NewReader(""))
	req.Header.Set("Content-Type", "application/json")
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()
	h.announcement.CreateAnnouncement(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty body, got %d", w.Code)
	}
}

func TestAnnouncementHandler_ListAnnouncements_ValidBoolFilter(t *testing.T) {
	h := newTestKnowledgeHandler()

	// Valid boolean values should not cause 400.
	for _, val := range []string{"true", "false", "1", "0"} {
		t.Run("is_active="+val, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/announcements/?is_active="+val, nil)
			req = withKnowledgeAuth(req)

			w := httptest.NewRecorder()

			func() {
				defer func() { recover() }()
				h.announcement.ListAnnouncements(w, req)
			}()

			if w.Code == http.StatusBadRequest {
				t.Errorf("unexpected 400 for valid is_active=%s", val)
			}
		})
	}
}

func TestAnnouncementHandler_ListAnnouncements_NoFilter(t *testing.T) {
	h := newTestKnowledgeHandler()
	req := httptest.NewRequest(http.MethodGet, "/announcements/", nil)
	req = withKnowledgeAuth(req)

	w := httptest.NewRecorder()

	func() {
		defer func() { recover() }()
		h.announcement.ListAnnouncements(w, req)
	}()

	// Should not return 400 -- it should pass validation and hit the service layer.
	if w.Code == http.StatusBadRequest {
		t.Errorf("unexpected 400 for list without filter")
	}
}

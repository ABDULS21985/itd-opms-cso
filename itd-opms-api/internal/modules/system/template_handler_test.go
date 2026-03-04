package system

import (
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

func newTestTemplateHandler() *EmailTemplateHandler {
	svc := NewEmailTemplateService(nil, nil)
	return NewEmailTemplateHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestTemplateHandler_ListTemplates_NoAuth(t *testing.T) {
	h := newTestTemplateHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListTemplates(w, req)
	assertUnauthorized(t, w)
}

func TestTemplateHandler_GetTemplate_NoAuth(t *testing.T) {
	h := newTestTemplateHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.GetTemplate(w, req)
	assertUnauthorized(t, w)
}

func TestTemplateHandler_CreateTemplate_NoAuth(t *testing.T) {
	h := newTestTemplateHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"test","subject":"s","bodyHtml":"b","category":"c"}`))
	w := httptest.NewRecorder()
	h.CreateTemplate(w, req)
	assertUnauthorized(t, w)
}

func TestTemplateHandler_UpdateTemplate_NoAuth(t *testing.T) {
	h := newTestTemplateHandler()
	req := httptest.NewRequest(http.MethodPatch, "/"+uuid.New().String(), strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.UpdateTemplate(w, req)
	assertUnauthorized(t, w)
}

func TestTemplateHandler_DeleteTemplate_NoAuth(t *testing.T) {
	h := newTestTemplateHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.DeleteTemplate(w, req)
	assertUnauthorized(t, w)
}

func TestTemplateHandler_PreviewTemplate_NoAuth(t *testing.T) {
	h := newTestTemplateHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/preview", strings.NewReader(`{"variables":{}}`))
	w := httptest.NewRecorder()
	h.PreviewTemplate(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests
// ──────────────────────────────────────────────

func TestTemplateHandler_GetTemplate_InvalidID(t *testing.T) {
	h := newTestTemplateHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.GetTemplate)

	req := requestWithAuthCtx(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTemplateHandler_CreateTemplate_InvalidBody(t *testing.T) {
	h := newTestTemplateHandler()

	req := requestWithAuthCtx(http.MethodPost, "/", `{invalid json}`)
	w := httptest.NewRecorder()
	h.CreateTemplate(w, req)
	assertBadRequest(t, w)
}

func TestTemplateHandler_UpdateTemplate_InvalidID(t *testing.T) {
	h := newTestTemplateHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateTemplate)

	req := requestWithAuthCtx(http.MethodPatch, "/bad-id", `{"subject":"test"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTemplateHandler_UpdateTemplate_InvalidBody(t *testing.T) {
	h := newTestTemplateHandler()

	r := chi.NewRouter()
	r.Patch("/{id}", h.UpdateTemplate)

	req := requestWithAuthCtx(http.MethodPatch, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTemplateHandler_DeleteTemplate_InvalidID(t *testing.T) {
	h := newTestTemplateHandler()

	r := chi.NewRouter()
	r.Delete("/{id}", h.DeleteTemplate)

	req := requestWithAuthCtx(http.MethodDelete, "/bad-id", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTemplateHandler_PreviewTemplate_InvalidID(t *testing.T) {
	h := newTestTemplateHandler()

	r := chi.NewRouter()
	r.Post("/{id}/preview", h.PreviewTemplate)

	req := requestWithAuthCtx(http.MethodPost, "/bad-id/preview", `{"variables":{}}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestTemplateHandler_PreviewTemplate_InvalidBody(t *testing.T) {
	h := newTestTemplateHandler()

	r := chi.NewRouter()
	r.Post("/{id}/preview", h.PreviewTemplate)

	req := requestWithAuthCtx(http.MethodPost, "/"+uuid.New().String()+"/preview", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestTemplateHandler_RouteRegistration(t *testing.T) {
	h := newTestTemplateHandler()

	r := chi.NewRouter()
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
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			auth := &types.AuthContext{
				UserID:      uuid.New(),
				TenantID:    uuid.New(),
				Permissions: []string{"*"},
			}
			ctx := types.SetAuthContext(req.Context(), auth)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Route("/email-templates", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListTemplates", http.MethodGet, "/email-templates/", ""},
		{"GetTemplate", http.MethodGet, "/email-templates/" + validUUID, ""},
		{"CreateTemplate", http.MethodPost, "/email-templates/", `{"name":"t","subject":"s","bodyHtml":"b","category":"c"}`},
		{"UpdateTemplate", http.MethodPatch, "/email-templates/" + validUUID, `{"subject":"s"}`},
		{"DeleteTemplate", http.MethodDelete, "/email-templates/" + validUUID, ""},
		{"PreviewTemplate", http.MethodPost, "/email-templates/" + validUUID + "/preview", `{"variables":{}}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != "" {
				req = httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound {
				t.Errorf("route %s %s returned 404 — route not registered", tt.method, tt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 — method not allowed", tt.method, tt.path)
			}
		})
	}
}

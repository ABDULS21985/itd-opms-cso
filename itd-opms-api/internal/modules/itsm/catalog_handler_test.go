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

func newTestCatalogHandler() *CatalogHandler {
	svc := NewCatalogService(nil, nil)
	return NewCatalogHandler(svc)
}

func catalogRouter() chi.Router {
	h := newTestCatalogHandler()
	r := chi.NewRouter()
	r.Route("/catalog", func(r chi.Router) {
		h.Routes(r)
	})
	return r
}

func catalogWithAuth(r *http.Request) *http.Request {
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

func TestCatalogHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestCatalogHandler()

	validUUID := uuid.New().String()

	endpoints := []struct {
		name   string
		method string
		body   string
		urlParam string
		urlKey   string
	}{
		{"ListCategories", http.MethodGet, "", "", ""},
		{"GetCategory", http.MethodGet, "", validUUID, "id"},
		{"CreateCategory", http.MethodPost, `{"name":"Hardware"}`, "", ""},
		{"UpdateCategory", http.MethodPut, `{"name":"Updated"}`, validUUID, "id"},
		{"DeleteCategory", http.MethodDelete, "", validUUID, "id"},
		{"ListItems", http.MethodGet, "", "", ""},
		{"ListEntitledItems", http.MethodGet, "", "", ""},
		{"GetItem", http.MethodGet, "", validUUID, "id"},
		{"CreateItem", http.MethodPost, `{"name":"New Laptop"}`, "", ""},
		{"UpdateItem", http.MethodPut, `{"name":"Updated Laptop"}`, validUUID, "id"},
		{"DeleteItem", http.MethodDelete, "", validUUID, "id"},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(ep.method, "/catalog/test", body)
			req.Header.Set("Content-Type", "application/json")

			if ep.urlParam != "" {
				rctx := chi.NewRouteContext()
				rctx.URLParams.Add(ep.urlKey, ep.urlParam)
				req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
			}

			w := httptest.NewRecorder()

			switch ep.name {
			case "ListCategories":
				h.ListCategories(w, req)
			case "GetCategory":
				h.GetCategory(w, req)
			case "CreateCategory":
				h.CreateCategory(w, req)
			case "UpdateCategory":
				h.UpdateCategory(w, req)
			case "DeleteCategory":
				h.DeleteCategory(w, req)
			case "ListItems":
				h.ListItems(w, req)
			case "ListEntitledItems":
				h.ListEntitledItems(w, req)
			case "GetItem":
				h.GetItem(w, req)
			case "CreateItem":
				h.CreateItem(w, req)
			case "UpdateItem":
				h.UpdateItem(w, req)
			case "DeleteItem":
				h.DeleteItem(w, req)
			}

			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s: expected 401, got %d", ep.name, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Invalid UUID path parameter tests
// ──────────────────────────────────────────────

func TestCatalogHandler_GetCategory_InvalidUUID(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodGet, "/catalog/categories/not-uuid", nil)
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "not-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_UpdateCategory_InvalidUUID(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodPut, "/catalog/categories/bad", strings.NewReader(`{"name":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_DeleteCategory_InvalidUUID(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodDelete, "/catalog/categories/bad", nil)
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeleteCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_GetItem_InvalidUUID(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodGet, "/catalog/items/bad", nil)
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_UpdateItem_InvalidUUID(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodPut, "/catalog/items/bad", strings.NewReader(`{"name":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_DeleteItem_InvalidUUID(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodDelete, "/catalog/items/bad", nil)
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeleteItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestCatalogHandler_CreateCategory_MalformedJSON(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodPost, "/catalog/categories", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_CreateCategory_MissingName(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodPost, "/catalog/categories", strings.NewReader(`{"description":"some desc"}`))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestCatalogHandler_UpdateCategory_MalformedJSON(t *testing.T) {
	h := newTestCatalogHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/catalog/categories/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateCategory(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_CreateItem_MalformedJSON(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodPost, "/catalog/items", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCatalogHandler_CreateItem_MissingName(t *testing.T) {
	h := newTestCatalogHandler()
	req := httptest.NewRequest(http.MethodPost, "/catalog/items", strings.NewReader(`{"description":"some desc"}`))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestCatalogHandler_UpdateItem_MalformedJSON(t *testing.T) {
	h := newTestCatalogHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/catalog/items/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = catalogWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateItem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestCatalogRoutes_Registration(t *testing.T) {
	r := catalogRouter()

	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListCategories", http.MethodGet, "/catalog/categories/"},
		{"GetCategory", http.MethodGet, "/catalog/categories/" + validUUID},
		{"CreateCategory", http.MethodPost, "/catalog/categories/"},
		{"UpdateCategory", http.MethodPut, "/catalog/categories/" + validUUID},
		{"DeleteCategory", http.MethodDelete, "/catalog/categories/" + validUUID},
		{"ListItems", http.MethodGet, "/catalog/items/"},
		{"ListEntitledItems", http.MethodGet, "/catalog/items/entitled"},
		{"GetItem", http.MethodGet, "/catalog/items/" + validUUID},
		{"CreateItem", http.MethodPost, "/catalog/items/"},
		{"UpdateItem", http.MethodPut, "/catalog/items/" + validUUID},
		{"DeleteItem", http.MethodDelete, "/catalog/items/" + validUUID},
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

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

func newTestQueueHandler() *QueueHandler {
	svc := NewQueueService(nil, nil)
	return NewQueueHandler(svc)
}

func queueRouter() chi.Router {
	h := newTestQueueHandler()
	r := chi.NewRouter()
	r.Route("/queues", func(r chi.Router) {
		h.Routes(r)
	})
	return r
}

func queueWithAuth(r *http.Request) *http.Request {
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

func TestQueueHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestQueueHandler()
	validUUID := uuid.New().String()

	endpoints := []struct {
		name     string
		body     string
		urlParam string
		urlKey   string
		handler  func(http.ResponseWriter, *http.Request)
	}{
		{"ListQueues", "", "", "", h.ListQueues},
		{"GetQueue", "", validUUID, "id", h.GetQueue},
		{"CreateQueue", `{"name":"Level 1"}`, "", "", h.CreateQueue},
		{"UpdateQueue", `{"name":"Updated"}`, validUUID, "id", h.UpdateQueue},
		{"DeleteQueue", "", validUUID, "id", h.DeleteQueue},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(http.MethodGet, "/queues/test", body)
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

func TestQueueHandler_GetQueue_InvalidUUID(t *testing.T) {
	h := newTestQueueHandler()
	req := httptest.NewRequest(http.MethodGet, "/queues/bad", nil)
	req = queueWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetQueue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestQueueHandler_UpdateQueue_InvalidUUID(t *testing.T) {
	h := newTestQueueHandler()
	req := httptest.NewRequest(http.MethodPut, "/queues/bad", strings.NewReader(`{"name":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req = queueWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateQueue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestQueueHandler_DeleteQueue_InvalidUUID(t *testing.T) {
	h := newTestQueueHandler()
	req := httptest.NewRequest(http.MethodDelete, "/queues/bad", nil)
	req = queueWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeleteQueue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestQueueHandler_CreateQueue_MalformedJSON(t *testing.T) {
	h := newTestQueueHandler()
	req := httptest.NewRequest(http.MethodPost, "/queues", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = queueWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateQueue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestQueueHandler_CreateQueue_MissingName(t *testing.T) {
	h := newTestQueueHandler()
	req := httptest.NewRequest(http.MethodPost, "/queues", strings.NewReader(`{"autoAssignRule":"round_robin"}`))
	req.Header.Set("Content-Type", "application/json")
	req = queueWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateQueue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing name, got %d", w.Code)
	}
}

func TestQueueHandler_UpdateQueue_MalformedJSON(t *testing.T) {
	h := newTestQueueHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/queues/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = queueWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateQueue(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestQueueRoutes_Registration(t *testing.T) {
	r := queueRouter()
	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListQueues", http.MethodGet, "/queues/"},
		{"GetQueue", http.MethodGet, "/queues/" + validUUID},
		{"CreateQueue", http.MethodPost, "/queues/"},
		{"UpdateQueue", http.MethodPut, "/queues/" + validUUID},
		{"DeleteQueue", http.MethodDelete, "/queues/" + validUUID},
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

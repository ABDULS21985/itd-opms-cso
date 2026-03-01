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

func newTestProblemHandler() *ProblemHandler {
	svc := NewProblemService(nil, nil)
	return NewProblemHandler(svc)
}

func problemRouter() chi.Router {
	h := newTestProblemHandler()
	r := chi.NewRouter()
	r.Route("/problems", func(r chi.Router) {
		h.Routes(r)
	})
	return r
}

func problemWithAuth(r *http.Request) *http.Request {
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

func TestProblemHandler_NoAuth_Returns401(t *testing.T) {
	h := newTestProblemHandler()
	validUUID := uuid.New().String()

	endpoints := []struct {
		name     string
		body     string
		urlParam string
		urlKey   string
		handler  func(http.ResponseWriter, *http.Request)
	}{
		{"ListProblems", "", "", "", h.ListProblems},
		{"GetProblem", "", validUUID, "id", h.GetProblem},
		{"CreateProblem", `{"title":"Test Problem"}`, "", "", h.CreateProblem},
		{"UpdateProblem", `{"title":"Updated"}`, validUUID, "id", h.UpdateProblem},
		{"DeleteProblem", "", validUUID, "id", h.DeleteProblem},
		{"LinkIncident", `{"incidentId":"` + uuid.New().String() + `"}`, validUUID, "id", h.LinkIncident},
		{"ListKnownErrorsByProblem", "", "", "", h.ListKnownErrorsByProblem},
		{"GetKnownError", "", validUUID, "id", h.GetKnownError},
		{"CreateKnownError", `{"problemId":"` + uuid.New().String() + `","title":"Test KE"}`, "", "", h.CreateKnownError},
		{"UpdateKnownError", `{"title":"Updated KE"}`, validUUID, "id", h.UpdateKnownError},
		{"DeleteKnownError", "", validUUID, "id", h.DeleteKnownError},
	}

	for _, ep := range endpoints {
		t.Run(ep.name, func(t *testing.T) {
			var body *strings.Reader
			if ep.body != "" {
				body = strings.NewReader(ep.body)
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(http.MethodGet, "/problems/test", body)
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

func TestProblemHandler_GetProblem_InvalidUUID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodGet, "/problems/bad", nil)
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetProblem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_UpdateProblem_InvalidUUID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPut, "/problems/bad", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateProblem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_DeleteProblem_InvalidUUID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodDelete, "/problems/bad", nil)
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeleteProblem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_LinkIncident_InvalidUUID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPost, "/problems/bad/link-incident", strings.NewReader(`{"incidentId":"`+uuid.New().String()+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.LinkIncident(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_GetKnownError_InvalidUUID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodGet, "/problems/known-errors/bad", nil)
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.GetKnownError(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_UpdateKnownError_InvalidUUID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPut, "/problems/known-errors/bad", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateKnownError(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_DeleteKnownError_InvalidUUID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodDelete, "/problems/known-errors/bad", nil)
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "bad")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.DeleteKnownError(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Malformed body tests
// ──────────────────────────────────────────────

func TestProblemHandler_CreateProblem_MalformedJSON(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPost, "/problems", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateProblem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_CreateProblem_MissingTitle(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPost, "/problems", strings.NewReader(`{"description":"some desc"}`))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateProblem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestProblemHandler_UpdateProblem_MalformedJSON(t *testing.T) {
	h := newTestProblemHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/problems/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateProblem(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_LinkIncident_MalformedJSON(t *testing.T) {
	h := newTestProblemHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/problems/"+validUUID+"/link-incident", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.LinkIncident(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_LinkIncident_NilIncidentID(t *testing.T) {
	h := newTestProblemHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/problems/"+validUUID+"/link-incident",
		strings.NewReader(`{"incidentId":"00000000-0000-0000-0000-000000000000"}`))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.LinkIncident(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for nil incident ID, got %d", w.Code)
	}
}

func TestProblemHandler_CreateKnownError_MalformedJSON(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPost, "/problems/known-errors", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateKnownError(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProblemHandler_CreateKnownError_NilProblemID(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPost, "/problems/known-errors",
		strings.NewReader(`{"problemId":"00000000-0000-0000-0000-000000000000","title":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateKnownError(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for nil problem ID, got %d", w.Code)
	}
}

func TestProblemHandler_CreateKnownError_MissingTitle(t *testing.T) {
	h := newTestProblemHandler()
	req := httptest.NewRequest(http.MethodPost, "/problems/known-errors",
		strings.NewReader(`{"problemId":"`+uuid.New().String()+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	w := httptest.NewRecorder()
	h.CreateKnownError(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing title, got %d", w.Code)
	}
}

func TestProblemHandler_UpdateKnownError_MalformedJSON(t *testing.T) {
	h := newTestProblemHandler()
	validUUID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPut, "/problems/known-errors/"+validUUID, strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	req = problemWithAuth(req)

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", validUUID)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.UpdateKnownError(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestProblemRoutes_Registration(t *testing.T) {
	r := problemRouter()
	validUUID := uuid.New().String()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"ListProblems", http.MethodGet, "/problems/"},
		{"GetProblem", http.MethodGet, "/problems/" + validUUID},
		{"CreateProblem", http.MethodPost, "/problems/"},
		{"UpdateProblem", http.MethodPut, "/problems/" + validUUID},
		{"DeleteProblem", http.MethodDelete, "/problems/" + validUUID},
		{"LinkIncident", http.MethodPost, "/problems/" + validUUID + "/link-incident"},
		{"ListKnownErrors", http.MethodGet, "/problems/known-errors/"},
		{"GetKnownError", http.MethodGet, "/problems/known-errors/" + validUUID},
		{"CreateKnownError", http.MethodPost, "/problems/known-errors/"},
		{"UpdateKnownError", http.MethodPut, "/problems/known-errors/" + validUUID},
		{"DeleteKnownError", http.MethodDelete, "/problems/known-errors/" + validUUID},
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

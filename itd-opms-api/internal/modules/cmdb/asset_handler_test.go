package cmdb

import (
	"context"
	"encoding/json"
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

func newTestHandler() *Handler {
	return NewHandler(nil, nil)
}

// requestWithAuthCtx returns a request with a valid AuthContext set.
func requestWithAuthCtx(method, target string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, target, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "admin@test.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(req.Context(), auth)
	return req.WithContext(ctx)
}

// parseResponse parses the standard response envelope.
func parseResponse(t *testing.T, w *httptest.ResponseRecorder) types.Response {
	t.Helper()
	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return resp
}

// assertUnauthorized validates a 401 response with the standard error envelope.
func assertUnauthorized(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
	if resp.Errors[0].Code != "UNAUTHORIZED" {
		t.Errorf("expected error code 'UNAUTHORIZED', got %q", resp.Errors[0].Code)
	}
}

// assertBadRequest validates a 400 response with a specific error code.
func assertBadRequest(t *testing.T, w *httptest.ResponseRecorder, expectedCode string) {
	t.Helper()
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
	if resp.Errors[0].Code != expectedCode {
		t.Errorf("expected error code %q, got %q", expectedCode, resp.Errors[0].Code)
	}
}

// chiContext builds a request with chi URL param context.
func chiContext(req *http.Request, key, value string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, value)
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	return req.WithContext(ctx)
}

// recoveryMiddleware catches panics from nil pool access so route registration
// tests can verify that the route exists (not 404/405) without requiring a real DB.
func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				w.WriteHeader(http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// authMiddleware injects a wildcard AuthContext for route registration tests.
func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		auth := &types.AuthContext{
			UserID:      uuid.New(),
			TenantID:    uuid.New(),
			Permissions: []string{"*"},
		}
		ctx := types.SetAuthContext(req.Context(), auth)
		next.ServeHTTP(w, req.WithContext(ctx))
	})
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestAssetHandler_ListAssets_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.asset.ListAssets(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_GetAssetStats_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()
	h.asset.GetAssetStats(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_SearchAssets_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/search?q=test", nil)
	w := httptest.NewRecorder()
	h.asset.SearchAssets(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_GetAsset_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.asset.GetAsset(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_CreateAsset_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.asset.CreateAsset(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_UpdateAsset_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.asset.UpdateAsset(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_DeleteAsset_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.asset.DeleteAsset(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_TransitionStatus_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/transition", strings.NewReader(`{"status":"active"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.asset.TransitionStatus(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_ListLifecycleEvents_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/lifecycle", nil)
	w := httptest.NewRecorder()
	h.asset.ListLifecycleEvents(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_CreateLifecycleEvent_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/lifecycle", strings.NewReader(`{"eventType":"deployed"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.asset.CreateLifecycleEvent(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_ListDisposals_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/disposals", nil)
	w := httptest.NewRecorder()
	h.asset.ListDisposals(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_GetDisposal_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/disposals/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.asset.GetDisposal(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_CreateDisposal_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/disposals", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.asset.CreateDisposal(w, req)
	assertUnauthorized(t, w)
}

func TestAssetHandler_UpdateDisposalStatus_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/disposals/"+uuid.New().String()+"/status", strings.NewReader(`{"status":"approved"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.asset.UpdateDisposalStatus(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Invalid UUID tests — 400 BAD_REQUEST
// ──────────────────────────────────────────────

func TestAssetHandler_GetAsset_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/not-a-uuid", "")
	req = chiContext(req, "id", "not-a-uuid")
	w := httptest.NewRecorder()
	h.asset.GetAsset(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_UpdateAsset_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPut, "/not-a-uuid", `{"name":"test"}`)
	req = chiContext(req, "id", "not-a-uuid")
	w := httptest.NewRecorder()
	h.asset.UpdateAsset(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_DeleteAsset_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodDelete, "/not-a-uuid", "")
	req = chiContext(req, "id", "not-a-uuid")
	w := httptest.NewRecorder()
	h.asset.DeleteAsset(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_TransitionStatus_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/not-a-uuid/transition", `{"status":"active"}`)
	req = chiContext(req, "id", "not-a-uuid")
	w := httptest.NewRecorder()
	h.asset.TransitionStatus(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_ListLifecycleEvents_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/bad-id/lifecycle", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.asset.ListLifecycleEvents(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_CreateLifecycleEvent_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/bad-id/lifecycle", `{"eventType":"deployed"}`)
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.asset.CreateLifecycleEvent(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_GetDisposal_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/disposals/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.asset.GetDisposal(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_UpdateDisposalStatus_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPut, "/disposals/bad-id/status", `{"status":"approved"}`)
	req = chiContext(req, "disposalId", "bad-id")
	w := httptest.NewRecorder()
	h.asset.UpdateDisposalStatus(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Invalid body tests — 400
// ──────────────────────────────────────────────

func TestAssetHandler_CreateAsset_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/", "not-json")
	w := httptest.NewRecorder()
	h.asset.CreateAsset(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_CreateAsset_MissingName(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/", `{"assetTag":"AST-001","type":"hardware"}`)
	w := httptest.NewRecorder()
	h.asset.CreateAsset(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_CreateAsset_MissingType(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/", `{"name":"Server","assetTag":"AST-001"}`)
	w := httptest.NewRecorder()
	h.asset.CreateAsset(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_CreateAsset_MissingAssetTag(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/", `{"name":"Server","type":"hardware"}`)
	w := httptest.NewRecorder()
	h.asset.CreateAsset(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_UpdateAsset_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPut, "/"+id, "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.asset.UpdateAsset(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_TransitionStatus_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/"+id+"/transition", "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.asset.TransitionStatus(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_TransitionStatus_EmptyStatus(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/"+id+"/transition", `{"status":""}`)
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.asset.TransitionStatus(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_CreateLifecycleEvent_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/"+id+"/lifecycle", "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.asset.CreateLifecycleEvent(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_CreateLifecycleEvent_EmptyEventType(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/"+id+"/lifecycle", `{"eventType":""}`)
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.asset.CreateLifecycleEvent(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_CreateDisposal_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/disposals", "not-json")
	w := httptest.NewRecorder()
	h.asset.CreateDisposal(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_CreateDisposal_MissingAssetID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/disposals", `{"disposalMethod":"recycling"}`)
	w := httptest.NewRecorder()
	h.asset.CreateDisposal(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_CreateDisposal_MissingDisposalMethod(t *testing.T) {
	h := newTestHandler()
	assetID := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/disposals", `{"assetId":"`+assetID+`"}`)
	w := httptest.NewRecorder()
	h.asset.CreateDisposal(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_UpdateDisposalStatus_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPut, "/disposals/"+id+"/status", "not-json")
	req = chiContext(req, "disposalId", id)
	w := httptest.NewRecorder()
	h.asset.UpdateDisposalStatus(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestAssetHandler_UpdateDisposalStatus_EmptyStatus(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPut, "/disposals/"+id+"/status", `{"status":""}`)
	req = chiContext(req, "disposalId", id)
	w := httptest.NewRecorder()
	h.asset.UpdateDisposalStatus(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestAssetHandler_SearchAssets_MissingQuery(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/search", "")
	w := httptest.NewRecorder()
	h.asset.SearchAssets(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestAssetHandler_RouteRegistration(t *testing.T) {
	h := newTestHandler()

	r := chi.NewRouter()
	r.Use(recoveryMiddleware)
	r.Use(authMiddleware)
	r.Route("/assets", func(r chi.Router) { h.asset.Routes(r) })

	validID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListAssets", http.MethodGet, "/assets/", ""},
		{"GetAssetStats", http.MethodGet, "/assets/stats", ""},
		{"SearchAssets", http.MethodGet, "/assets/search?q=test", ""},
		{"GetAsset", http.MethodGet, "/assets/" + validID, ""},
		{"CreateAsset", http.MethodPost, "/assets/", `{"name":"s","assetTag":"a","type":"hardware"}`},
		{"UpdateAsset", http.MethodPut, "/assets/" + validID, `{"name":"updated"}`},
		{"DeleteAsset", http.MethodDelete, "/assets/" + validID, ""},
		{"TransitionStatus", http.MethodPost, "/assets/" + validID + "/transition", `{"status":"active"}`},
		{"ListLifecycleEvents", http.MethodGet, "/assets/" + validID + "/lifecycle", ""},
		{"CreateLifecycleEvent", http.MethodPost, "/assets/" + validID + "/lifecycle", `{"eventType":"deployed"}`},
		{"ListDisposals", http.MethodGet, "/assets/disposals/", ""},
		{"GetDisposal", http.MethodGet, "/assets/disposals/" + validID, ""},
		{"CreateDisposal", http.MethodPost, "/assets/disposals/", `{"assetId":"` + validID + `","disposalMethod":"recycling"}`},
		{"UpdateDisposalStatus", http.MethodPut, "/assets/disposals/" + validID + "/status", `{"status":"approved"}`},
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
				t.Errorf("route %s %s returned 404 -- route not registered", tt.method, tt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 -- method not allowed", tt.method, tt.path)
			}
		})
	}
}

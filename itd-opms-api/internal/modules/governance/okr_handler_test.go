package governance

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
// Auth guard tests — OKR endpoints without AuthContext yield 401
// ──────────────────────────────────────────────

func TestOKRHandler_ListOKRs_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/okrs", nil)
	w := httptest.NewRecorder()
	h.okr.ListOKRs(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_CreateOKR_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/okrs", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.okr.CreateOKR(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_GetOKR_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/okrs/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.okr.GetOKR(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_UpdateOKR_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/okrs/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.okr.UpdateOKR(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_GetOKRTree_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/okrs/"+uuid.New().String()+"/tree", nil)
	w := httptest.NewRecorder()
	h.okr.GetOKRTree(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_CreateKeyResult_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/okrs/"+uuid.New().String()+"/key-results", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.okr.CreateKeyResult(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_UpdateKeyResult_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/key-results/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.okr.UpdateKeyResult(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_DeleteKeyResult_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodDelete, "/key-results/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.okr.DeleteKeyResult(w, req)
	govAssertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Auth guard tests — KPI endpoints without AuthContext yield 401
// ──────────────────────────────────────────────

func TestOKRHandler_ListKPIs_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/kpis", nil)
	w := httptest.NewRecorder()
	h.okr.ListKPIs(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_CreateKPI_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/kpis", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.okr.CreateKPI(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_GetKPI_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/kpis/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.okr.GetKPI(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_UpdateKPI_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/kpis/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.okr.UpdateKPI(w, req)
	govAssertUnauthorized(t, w)
}

func TestOKRHandler_DeleteKPI_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodDelete, "/kpis/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.okr.DeleteKPI(w, req)
	govAssertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests — invalid UUIDs yield 400
// ──────────────────────────────────────────────

func TestOKRHandler_GetOKR_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.okr.GetOKR)

	req := govRequestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_UpdateOKR_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.okr.UpdateOKR)

	req := govRequestWithAuth(http.MethodPut, "/not-a-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_UpdateOKR_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.okr.UpdateOKR)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_GetOKRTree_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/tree", h.okr.GetOKRTree)

	req := govRequestWithAuth(http.MethodGet, "/bad-id/tree", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_CreateKeyResult_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/key-results", h.okr.CreateKeyResult)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/key-results", `{"title":"test"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_CreateKeyResult_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/key-results", h.okr.CreateKeyResult)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/key-results", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_CreateKeyResult_MissingTitle(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/key-results", h.okr.CreateKeyResult)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/key-results", `{"targetValue":100}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestOKRHandler_UpdateKeyResult_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{krId}", h.okr.UpdateKeyResult)

	req := govRequestWithAuth(http.MethodPut, "/bad-id", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_UpdateKeyResult_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{krId}", h.okr.UpdateKeyResult)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_DeleteKeyResult_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Delete("/{krId}", h.okr.DeleteKeyResult)

	req := govRequestWithAuth(http.MethodDelete, "/bad-id", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_GetKPI_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.okr.GetKPI)

	req := govRequestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_UpdateKPI_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.okr.UpdateKPI)

	req := govRequestWithAuth(http.MethodPut, "/not-a-uuid", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_UpdateKPI_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.okr.UpdateKPI)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_DeleteKPI_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Delete("/{id}", h.okr.DeleteKPI)

	req := govRequestWithAuth(http.MethodDelete, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Input validation — CreateOKR body
// ──────────────────────────────────────────────

func TestOKRHandler_CreateOKR_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/okrs", `{bad json}`)
	w := httptest.NewRecorder()
	h.okr.CreateOKR(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_CreateOKR_MissingRequiredFields(t *testing.T) {
	h := newTestGovernanceHandler()
	// Missing objective, level, period
	req := govRequestWithAuth(http.MethodPost, "/okrs", `{"ownerId":"`+uuid.New().String()+`"}`)
	w := httptest.NewRecorder()
	h.okr.CreateOKR(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestOKRHandler_CreateOKR_MissingOwnerID(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/okrs", `{"objective":"Test","level":"org","period":"Q1"}`)
	w := httptest.NewRecorder()
	h.okr.CreateOKR(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Input validation — CreateKPI body
// ──────────────────────────────────────────────

func TestOKRHandler_CreateKPI_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/kpis", `{bad json}`)
	w := httptest.NewRecorder()
	h.okr.CreateKPI(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestOKRHandler_CreateKPI_MissingName(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/kpis", `{"description":"test"}`)
	w := httptest.NewRecorder()
	h.okr.CreateKPI(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestOKRHandler_RouteRegistration(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
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
	r.Route("/governance", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name          string
		method        string
		path          string
		body          string
		wantNotStatus int
	}{
		// OKR routes
		{"ListOKRs", http.MethodGet, "/governance/okrs/", "", http.StatusNotFound},
		{"CreateOKR", http.MethodPost, "/governance/okrs/", `{"objective":"t","level":"org","period":"Q1","ownerId":"` + validUUID + `"}`, http.StatusNotFound},
		{"GetOKR", http.MethodGet, "/governance/okrs/" + validUUID, "", http.StatusNotFound},
		{"UpdateOKR", http.MethodPut, "/governance/okrs/" + validUUID, `{}`, http.StatusNotFound},
		{"GetOKRTree", http.MethodGet, "/governance/okrs/" + validUUID + "/tree", "", http.StatusNotFound},
		{"CreateKeyResult", http.MethodPost, "/governance/okrs/" + validUUID + "/key-results", `{"title":"kr1"}`, http.StatusNotFound},
		// Key Result routes
		{"UpdateKeyResult", http.MethodPut, "/governance/key-results/" + validUUID, `{}`, http.StatusNotFound},
		{"DeleteKeyResult", http.MethodDelete, "/governance/key-results/" + validUUID, "", http.StatusNotFound},
		// KPI routes
		{"ListKPIs", http.MethodGet, "/governance/kpis/", "", http.StatusNotFound},
		{"CreateKPI", http.MethodPost, "/governance/kpis/", `{"name":"test-kpi"}`, http.StatusNotFound},
		{"GetKPI", http.MethodGet, "/governance/kpis/" + validUUID, "", http.StatusNotFound},
		{"UpdateKPI", http.MethodPut, "/governance/kpis/" + validUUID, `{}`, http.StatusNotFound},
		{"DeleteKPI", http.MethodDelete, "/governance/kpis/" + validUUID, "", http.StatusNotFound},
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

			// The handler may panic due to nil pool when the service layer
			// is reached. A panic means the route was found and the handler
			// was invoked, which is exactly what we want to verify.
			panicked := false
			func() {
				defer func() {
					if rec := recover(); rec != nil {
						panicked = true
					}
				}()
				r.ServeHTTP(w, req)
			}()

			if !panicked {
				if w.Code == tt.wantNotStatus {
					t.Errorf("route %s %s returned %d -- route not registered", tt.method, tt.path, w.Code)
				}
				if w.Code == http.StatusMethodNotAllowed {
					t.Errorf("route %s %s returned 405 -- method not allowed", tt.method, tt.path)
				}
			}
			// If panicked, the route was found (handler was invoked) — test passes.
		})
	}
}

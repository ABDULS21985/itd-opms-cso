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
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestRACIHandler_List_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.raci.List(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_Create_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.raci.Create(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_Get_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.raci.Get(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_Update_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.raci.Update(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_Delete_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodDelete, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.raci.Delete(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_CoverageReport_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/coverage", nil)
	w := httptest.NewRecorder()
	h.raci.CoverageReport(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_CoverageSummary_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/coverage-summary", nil)
	w := httptest.NewRecorder()
	h.raci.CoverageSummary(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_AddEntry_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/entries", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.raci.AddEntry(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_UpdateEntry_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/entries/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.raci.UpdateEntry(w, req)
	govAssertUnauthorized(t, w)
}

func TestRACIHandler_DeleteEntry_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodDelete, "/entries/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.raci.DeleteEntry(w, req)
	govAssertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests — invalid UUIDs yield 400
// ──────────────────────────────────────────────

func TestRACIHandler_Get_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.raci.Get)

	req := govRequestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_Update_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.raci.Update)

	req := govRequestWithAuth(http.MethodPut, "/not-a-uuid", `{"title":"t","entityType":"project"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_Update_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.raci.Update)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_Delete_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Delete("/{id}", h.raci.Delete)

	req := govRequestWithAuth(http.MethodDelete, "/bad-id", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_CoverageReport_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/coverage", h.raci.CoverageReport)

	req := govRequestWithAuth(http.MethodGet, "/bad-id/coverage", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_AddEntry_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/entries", h.raci.AddEntry)

	accountableID := uuid.New().String()
	req := govRequestWithAuth(http.MethodPost, "/bad-id/entries", `{"activity":"test","accountableId":"`+accountableID+`"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_AddEntry_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/entries", h.raci.AddEntry)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/entries", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_AddEntry_MissingActivity(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/entries", h.raci.AddEntry)

	accountableID := uuid.New().String()
	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/entries", `{"accountableId":"`+accountableID+`"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestRACIHandler_AddEntry_MissingAccountableID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/entries", h.raci.AddEntry)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/entries", `{"activity":"Code Review"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestRACIHandler_UpdateEntry_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{entryId}", h.raci.UpdateEntry)

	req := govRequestWithAuth(http.MethodPut, "/bad-id", `{}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_UpdateEntry_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{entryId}", h.raci.UpdateEntry)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_DeleteEntry_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Delete("/{entryId}", h.raci.DeleteEntry)

	req := govRequestWithAuth(http.MethodDelete, "/bad-id", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Input validation — Create body
// ──────────────────────────────────────────────

func TestRACIHandler_Create_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{bad json}`)
	w := httptest.NewRecorder()
	h.raci.Create(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestRACIHandler_Create_MissingTitle(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{"entityType":"project"}`)
	w := httptest.NewRecorder()
	h.raci.Create(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestRACIHandler_Create_MissingEntityType(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{"title":"Test RACI"}`)
	w := httptest.NewRecorder()
	h.raci.Create(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestRACIHandler_RouteRegistration(t *testing.T) {
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
		{"ListRACIMatrices", http.MethodGet, "/governance/raci/", "", http.StatusNotFound},
		{"CoverageSummary", http.MethodGet, "/governance/raci/coverage-summary", "", http.StatusNotFound},
		{"CreateRACIMatrix", http.MethodPost, "/governance/raci/", `{"title":"t","entityType":"project"}`, http.StatusNotFound},
		{"GetRACIMatrix", http.MethodGet, "/governance/raci/" + validUUID, "", http.StatusNotFound},
		{"UpdateRACIMatrix", http.MethodPut, "/governance/raci/" + validUUID, `{"title":"t","entityType":"project"}`, http.StatusNotFound},
		{"DeleteRACIMatrix", http.MethodDelete, "/governance/raci/" + validUUID, "", http.StatusNotFound},
		{"CoverageReport", http.MethodGet, "/governance/raci/" + validUUID + "/coverage", "", http.StatusNotFound},
		{"AddEntry", http.MethodPost, "/governance/raci/" + validUUID + "/entries", `{"activity":"test","accountableId":"` + validUUID + `"}`, http.StatusNotFound},
		{"UpdateEntry", http.MethodPut, "/governance/raci/entries/" + validUUID, `{}`, http.StatusNotFound},
		{"DeleteEntry", http.MethodDelete, "/governance/raci/entries/" + validUUID, "", http.StatusNotFound},
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

package governance

import (
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
// Test helpers (shared across handler test files)
// ──────────────────────────────────────────────

func newTestGovernanceHandler() *Handler {
	return NewHandler(nil, nil)
}

// govRequestWithAuth returns a request with a valid AuthContext and wildcard permissions.
func govRequestWithAuth(method, target string, body string) *http.Request {
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

// govParseErrorResponse parses the standard error envelope.
func govParseErrorResponse(t *testing.T, w *httptest.ResponseRecorder) types.Response {
	t.Helper()
	var resp types.Response
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return resp
}

// govAssertUnauthorized validates a 401 response with the standard error envelope.
func govAssertUnauthorized(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
	resp := govParseErrorResponse(t, w)
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

// govAssertBadRequest validates a 400 response with the standard error envelope.
func govAssertBadRequest(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
	resp := govParseErrorResponse(t, w)
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if len(resp.Errors) == 0 {
		t.Fatal("expected at least one error detail")
	}
}

// govAssertBadRequestWithCode validates a 400 response with a specific error code.
func govAssertBadRequestWithCode(t *testing.T, w *httptest.ResponseRecorder, expectedCode string) {
	t.Helper()
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
	resp := govParseErrorResponse(t, w)
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

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestPolicyHandler_List_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.policy.List(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Create_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.policy.Create(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Get_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.policy.Get(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Update_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPut, "/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.policy.Update(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Submit_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/submit", nil)
	w := httptest.NewRecorder()
	h.policy.Submit(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Approve_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/approve", nil)
	w := httptest.NewRecorder()
	h.policy.Approve(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Publish_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/publish", nil)
	w := httptest.NewRecorder()
	h.policy.Publish(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Retire_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/retire", nil)
	w := httptest.NewRecorder()
	h.policy.Retire(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_ListVersions_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/versions", nil)
	w := httptest.NewRecorder()
	h.policy.ListVersions(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_DiffVersions_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/diff?v1=1&v2=2", nil)
	w := httptest.NewRecorder()
	h.policy.DiffVersions(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_LaunchCampaign_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/"+uuid.New().String()+"/attestation-campaigns", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.policy.LaunchCampaign(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_GetAttestationStatus_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String()+"/attestation-status", nil)
	w := httptest.NewRecorder()
	h.policy.GetAttestationStatus(w, req)
	govAssertUnauthorized(t, w)
}

func TestPolicyHandler_Attest_NoAuth(t *testing.T) {
	h := newTestGovernanceHandler()
	req := httptest.NewRequest(http.MethodPost, "/attestations/"+uuid.New().String()+"/attest", nil)
	w := httptest.NewRecorder()
	h.policy.Attest(w, req)
	govAssertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests — invalid UUIDs yield 400
// ──────────────────────────────────────────────

func TestPolicyHandler_Get_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.policy.Get)

	req := govRequestWithAuth(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Update_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.policy.Update)

	req := govRequestWithAuth(http.MethodPut, "/not-a-uuid", `{"title":"test"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Update_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Put("/{id}", h.policy.Update)

	req := govRequestWithAuth(http.MethodPut, "/"+uuid.New().String(), `{invalid json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Submit_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/submit", h.policy.Submit)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/submit", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Approve_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/approve", h.policy.Approve)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/approve", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Publish_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/publish", h.policy.Publish)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/publish", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Retire_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/retire", h.policy.Retire)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/retire", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_ListVersions_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/versions", h.policy.ListVersions)

	req := govRequestWithAuth(http.MethodGet, "/bad-id/versions", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_DiffVersions_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/diff", h.policy.DiffVersions)

	req := govRequestWithAuth(http.MethodGet, "/bad-id/diff?v1=1&v2=2", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_DiffVersions_MissingV1V2(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/diff", h.policy.DiffVersions)

	req := govRequestWithAuth(http.MethodGet, "/"+uuid.New().String()+"/diff", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestPolicyHandler_DiffVersions_InvalidV1(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/diff", h.policy.DiffVersions)

	req := govRequestWithAuth(http.MethodGet, "/"+uuid.New().String()+"/diff?v1=abc&v2=2", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_DiffVersions_InvalidV2(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/diff", h.policy.DiffVersions)

	req := govRequestWithAuth(http.MethodGet, "/"+uuid.New().String()+"/diff?v1=1&v2=abc", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_LaunchCampaign_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/attestation-campaigns", h.policy.LaunchCampaign)

	req := govRequestWithAuth(http.MethodPost, "/bad-id/attestation-campaigns", `{"targetScope":"all","dueDate":"2026-12-31T00:00:00Z"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_LaunchCampaign_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/attestation-campaigns", h.policy.LaunchCampaign)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/attestation-campaigns", `{bad json}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_LaunchCampaign_MissingTargetScope(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/attestation-campaigns", h.policy.LaunchCampaign)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/attestation-campaigns", `{"dueDate":"2026-12-31T00:00:00Z"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestPolicyHandler_LaunchCampaign_MissingDueDate(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/{id}/attestation-campaigns", h.policy.LaunchCampaign)

	req := govRequestWithAuth(http.MethodPost, "/"+uuid.New().String()+"/attestation-campaigns", `{"targetScope":"all"}`)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestPolicyHandler_GetAttestationStatus_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Get("/{id}/attestation-status", h.policy.GetAttestationStatus)

	req := govRequestWithAuth(http.MethodGet, "/bad-id/attestation-status", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Attest_InvalidUUID(t *testing.T) {
	h := newTestGovernanceHandler()

	r := chi.NewRouter()
	r.Post("/attestations/{attestationId}/attest", h.policy.Attest)

	req := govRequestWithAuth(http.MethodPost, "/attestations/bad-id/attest", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Create_InvalidBody(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{bad json}`)
	w := httptest.NewRecorder()
	h.policy.Create(w, req)
	govAssertBadRequestWithCode(t, w, "BAD_REQUEST")
}

func TestPolicyHandler_Create_MissingRequiredFields(t *testing.T) {
	h := newTestGovernanceHandler()
	// Missing title, category, and content
	req := govRequestWithAuth(http.MethodPost, "/", `{"description":"test"}`)
	w := httptest.NewRecorder()
	h.policy.Create(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestPolicyHandler_Create_MissingTitle(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{"category":"security","content":"test content"}`)
	w := httptest.NewRecorder()
	h.policy.Create(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestPolicyHandler_Create_MissingCategory(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{"title":"Test","content":"test content"}`)
	w := httptest.NewRecorder()
	h.policy.Create(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

func TestPolicyHandler_Create_MissingContent(t *testing.T) {
	h := newTestGovernanceHandler()
	req := govRequestWithAuth(http.MethodPost, "/", `{"title":"Test","category":"security"}`)
	w := httptest.NewRecorder()
	h.policy.Create(w, req)
	govAssertBadRequestWithCode(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestPolicyHandler_RouteRegistration(t *testing.T) {
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
		{"ListPolicies", http.MethodGet, "/governance/policies/", "", http.StatusNotFound},
		{"CreatePolicy", http.MethodPost, "/governance/policies/", `{"title":"t","category":"c","content":"x"}`, http.StatusNotFound},
		{"GetPolicy", http.MethodGet, "/governance/policies/" + validUUID, "", http.StatusNotFound},
		{"UpdatePolicy", http.MethodPut, "/governance/policies/" + validUUID, `{}`, http.StatusNotFound},
		{"SubmitPolicy", http.MethodPost, "/governance/policies/" + validUUID + "/submit", "", http.StatusNotFound},
		{"ApprovePolicy", http.MethodPost, "/governance/policies/" + validUUID + "/approve", "", http.StatusNotFound},
		{"PublishPolicy", http.MethodPost, "/governance/policies/" + validUUID + "/publish", "", http.StatusNotFound},
		{"RetirePolicy", http.MethodPost, "/governance/policies/" + validUUID + "/retire", "", http.StatusNotFound},
		{"ListVersions", http.MethodGet, "/governance/policies/" + validUUID + "/versions", "", http.StatusNotFound},
		{"DiffVersions", http.MethodGet, "/governance/policies/" + validUUID + "/diff?v1=1&v2=2", "", http.StatusNotFound},
		{"LaunchCampaign", http.MethodPost, "/governance/policies/" + validUUID + "/attestation-campaigns", `{"targetScope":"all","dueDate":"2026-12-31T00:00:00Z"}`, http.StatusNotFound},
		{"GetAttestationStatus", http.MethodGet, "/governance/policies/" + validUUID + "/attestation-status", "", http.StatusNotFound},
		{"Attest", http.MethodPost, "/governance/policies/attestations/" + validUUID + "/attest", "", http.StatusNotFound},
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

package grc

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

// newTestRiskHandler creates a RiskHandler backed by a nil-pool service
// (suitable for testing auth guards and input validation only).
func newTestRiskHandler() *RiskHandler {
	svc := NewRiskService(nil, nil)
	return NewRiskHandler(svc)
}

// newRiskRouter builds a chi router with risk routes mounted under /risks.
func newRiskRouter() chi.Router {
	h := newTestRiskHandler()
	r := chi.NewRouter()
	r.Route("/risks", func(r chi.Router) {
		h.Routes(r)
	})
	return r
}

// ──────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────

func TestRiskRoutes_Registered(t *testing.T) {
	router := newRiskRouter()

	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/risks/"},
		{"GET", "/risks/heat-map"},
		{"GET", "/risks/review-needed"},
		{"GET", "/risks/" + uuid.New().String()},
		{"POST", "/risks/"},
		{"PUT", "/risks/" + uuid.New().String()},
		{"DELETE", "/risks/" + uuid.New().String()},
		{"POST", "/risks/" + uuid.New().String() + "/assess"},
		{"GET", "/risks/" + uuid.New().String() + "/assessments"},
		{"POST", "/risks/" + uuid.New().String() + "/escalate"},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			var body *strings.Reader
			if tt.method == "POST" || tt.method == "PUT" {
				body = strings.NewReader("{}")
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(tt.method, tt.path, body)
			if tt.method == "POST" || tt.method == "PUT" {
				req.Header.Set("Content-Type", "application/json")
			}
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// A 404/405 means the route is not registered
			if rr.Code == http.StatusNotFound || rr.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s not registered, got status %d", tt.method, tt.path, rr.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Auth guards — all risk endpoints require auth
// ──────────────────────────────────────────────

func TestRiskHandler_ListRisks_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/risks", nil)
	rr := httptest.NewRecorder()

	h.ListRisks(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_GetRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/risks/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.GetRisk(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_CreateRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodPost, "/risks", strings.NewReader(`{"title":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateRisk(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_UpdateRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodPut, "/risks/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.UpdateRisk(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_DeleteRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodDelete, "/risks/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.DeleteRisk(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_GetRiskHeatMap_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/risks/heat-map", nil)
	rr := httptest.NewRecorder()

	h.GetRiskHeatMap(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_GetRisksNeedingReview_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/risks/review-needed", nil)
	rr := httptest.NewRecorder()

	h.GetRisksNeedingReview(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_CreateRiskAssessment_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodPost, "/risks/"+uuid.New().String()+"/assess",
		strings.NewReader(`{"newLikelihood":"high","newImpact":"high"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateRiskAssessment(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_ListRiskAssessments_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodGet, "/risks/"+uuid.New().String()+"/assessments", nil)
	rr := httptest.NewRecorder()

	h.ListRiskAssessments(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestRiskHandler_EscalateRisk_NoAuth(t *testing.T) {
	h := newTestRiskHandler()
	req := httptest.NewRequest(http.MethodPost, "/risks/"+uuid.New().String()+"/escalate", nil)
	rr := httptest.NewRecorder()

	h.EscalateRisk(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

// ──────────────────────────────────────────────
// Input validation — invalid UUIDs
// ──────────────────────────────────────────────

func TestRiskHandler_GetRisk_InvalidID(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodGet, "/risks/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_UpdateRisk_InvalidID(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodPut, "/risks/not-a-uuid", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_DeleteRisk_InvalidID(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodDelete, "/risks/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_CreateRiskAssessment_InvalidID(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodPost, "/risks/not-a-uuid/assess",
		strings.NewReader(`{"newLikelihood":"high","newImpact":"high"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_ListRiskAssessments_InvalidID(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodGet, "/risks/not-a-uuid/assessments", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_EscalateRisk_InvalidID(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodPost, "/risks/not-a-uuid/escalate", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Input validation — invalid request bodies
// ──────────────────────────────────────────────

func TestRiskHandler_CreateRisk_InvalidBody(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodPost, "/risks/", strings.NewReader(`{invalid json`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_CreateRisk_MissingRequiredFields(t *testing.T) {
	router := newRiskRouter()

	// Missing title, category, likelihood, impact, status
	req := httptest.NewRequest(http.MethodPost, "/risks/", strings.NewReader(`{"description":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestRiskHandler_UpdateRisk_InvalidBody(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodPut, "/risks/"+uuid.New().String(),
		strings.NewReader(`{bad json`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_CreateRiskAssessment_InvalidBody(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodPost, "/risks/"+uuid.New().String()+"/assess",
		strings.NewReader(`{not valid json`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestRiskHandler_CreateRiskAssessment_MissingRequiredFields(t *testing.T) {
	router := newRiskRouter()

	// Missing newLikelihood and newImpact
	req := httptest.NewRequest(http.MethodPost, "/risks/"+uuid.New().String()+"/assess",
		strings.NewReader(`{"rationale":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestRiskHandler_ListRisks_InvalidOwnerID(t *testing.T) {
	router := newRiskRouter()

	req := httptest.NewRequest(http.MethodGet, "/risks/?owner_id=not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// reqWithAuth returns a new request with a valid AuthContext injected.
func reqWithAuth(req *http.Request) *http.Request {
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@example.com",
		DisplayName: "Test User",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(req.Context(), auth)
	return req.WithContext(ctx)
}

// assertErrorCode checks that the response body contains the expected error code.
func assertErrorCode(t *testing.T, rr *httptest.ResponseRecorder, expectedCode string) {
	t.Helper()

	var resp types.Response
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if len(resp.Errors) == 0 {
		t.Fatalf("expected errors in response, got none")
	}
	if resp.Errors[0].Code != expectedCode {
		t.Errorf("expected error code %q, got %q", expectedCode, resp.Errors[0].Code)
	}
}

// ──────────────────────────────────────────────
// Additional edge case tests
// ──────────────────────────────────────────────

func TestRiskHandler_CreateRisk_PartialRequiredFields(t *testing.T) {
	router := newRiskRouter()

	tests := []struct {
		name string
		body string
	}{
		{"MissingCategory", `{"title":"risk","likelihood":"low","impact":"low","status":"identified"}`},
		{"MissingLikelihood", `{"title":"risk","category":"operational","impact":"low","status":"identified"}`},
		{"MissingImpact", `{"title":"risk","category":"operational","likelihood":"low","status":"identified"}`},
		{"MissingStatus", `{"title":"risk","category":"operational","likelihood":"low","impact":"low"}`},
		{"MissingTitle", `{"category":"operational","likelihood":"low","impact":"low","status":"identified"}`},
		{"AllEmpty", `{}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/risks/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = reqWithAuth(req)
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			if rr.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", rr.Code)
			}
			assertErrorCode(t, rr, "VALIDATION_ERROR")
		})
	}
}

func TestRiskHandler_CreateRiskAssessment_PartialRequiredFields(t *testing.T) {
	router := newRiskRouter()

	tests := []struct {
		name string
		body string
	}{
		{"MissingNewImpact", `{"newLikelihood":"high"}`},
		{"MissingNewLikelihood", `{"newImpact":"high"}`},
		{"BothEmpty", `{}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/risks/"+uuid.New().String()+"/assess",
				strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = reqWithAuth(req)
			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			if rr.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", rr.Code)
			}
			assertErrorCode(t, rr, "VALIDATION_ERROR")
		})
	}
}

func TestRiskHandler_ListRisks_ValidQueryParams(t *testing.T) {
	// Verify that valid query params with status and category don't return 400
	// (they will panic due to nil pool, but should not return 400)
	h := newTestRiskHandler()

	req := httptest.NewRequest(http.MethodGet, "/risks?status=identified&category=operational", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	// This will panic/error due to nil pool, but the point is
	// it should not return 400 (it should pass validation)
	defer func() { recover() }()
	h.ListRisks(rr, req)
	// If it returned 400, that's a validation bug
	if rr.Code == http.StatusBadRequest {
		t.Errorf("valid query params should not return 400, got %d", rr.Code)
	}
}

func TestNewRiskHandler_NotNil(t *testing.T) {
	svc := NewRiskService(nil, nil)
	h := NewRiskHandler(svc)
	if h == nil {
		t.Fatal("expected non-nil RiskHandler")
	}
	if h.svc == nil {
		t.Fatal("expected non-nil service in handler")
	}
}

func TestNewRiskService_NotNil(t *testing.T) {
	svc := NewRiskService(nil, nil)
	if svc == nil {
		t.Fatal("expected non-nil RiskService")
	}
}

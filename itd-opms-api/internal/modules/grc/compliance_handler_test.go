package grc

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// newTestComplianceHandler creates a ComplianceHandler backed by a nil-pool service.
func newTestComplianceHandler() *ComplianceHandler {
	svc := NewComplianceService(nil, nil)
	return NewComplianceHandler(svc)
}

// newComplianceRouter builds a chi router with compliance routes
// mounted under /compliance.
func newComplianceRouter() chi.Router {
	h := newTestComplianceHandler()
	r := chi.NewRouter()
	r.Route("/compliance", func(r chi.Router) {
		h.Routes(r)
	})
	return r
}

// ──────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────

func TestComplianceRoutes_Registered(t *testing.T) {
	router := newComplianceRouter()

	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/compliance/"},
		{"GET", "/compliance/stats"},
		{"GET", "/compliance/" + uuid.New().String()},
		{"POST", "/compliance/"},
		{"PUT", "/compliance/" + uuid.New().String()},
		{"DELETE", "/compliance/" + uuid.New().String()},
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

			if rr.Code == http.StatusNotFound || rr.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s not registered, got status %d", tt.method, tt.path, rr.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Auth guards — all compliance endpoints require auth
// ──────────────────────────────────────────────

func TestComplianceHandler_ListControls_NoAuth(t *testing.T) {
	h := newTestComplianceHandler()
	req := httptest.NewRequest(http.MethodGet, "/compliance", nil)
	rr := httptest.NewRecorder()

	h.ListControls(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestComplianceHandler_GetComplianceStats_NoAuth(t *testing.T) {
	h := newTestComplianceHandler()
	req := httptest.NewRequest(http.MethodGet, "/compliance/stats", nil)
	rr := httptest.NewRecorder()

	h.GetComplianceStats(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestComplianceHandler_GetControl_NoAuth(t *testing.T) {
	h := newTestComplianceHandler()
	req := httptest.NewRequest(http.MethodGet, "/compliance/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.GetControl(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestComplianceHandler_CreateControl_NoAuth(t *testing.T) {
	h := newTestComplianceHandler()
	req := httptest.NewRequest(http.MethodPost, "/compliance",
		strings.NewReader(`{"framework":"ISO_27001","controlId":"A.1","controlName":"Test"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateControl(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestComplianceHandler_UpdateControl_NoAuth(t *testing.T) {
	h := newTestComplianceHandler()
	req := httptest.NewRequest(http.MethodPut, "/compliance/"+uuid.New().String(),
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.UpdateControl(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestComplianceHandler_DeleteControl_NoAuth(t *testing.T) {
	h := newTestComplianceHandler()
	req := httptest.NewRequest(http.MethodDelete, "/compliance/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.DeleteControl(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

// ──────────────────────────────────────────────
// Input validation — invalid UUIDs
// ──────────────────────────────────────────────

func TestComplianceHandler_GetControl_InvalidID(t *testing.T) {
	router := newComplianceRouter()

	req := httptest.NewRequest(http.MethodGet, "/compliance/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestComplianceHandler_UpdateControl_InvalidID(t *testing.T) {
	router := newComplianceRouter()

	req := httptest.NewRequest(http.MethodPut, "/compliance/not-a-uuid",
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestComplianceHandler_DeleteControl_InvalidID(t *testing.T) {
	router := newComplianceRouter()

	req := httptest.NewRequest(http.MethodDelete, "/compliance/not-a-uuid", nil)
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

func TestComplianceHandler_CreateControl_InvalidBody(t *testing.T) {
	router := newComplianceRouter()

	req := httptest.NewRequest(http.MethodPost, "/compliance/",
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

func TestComplianceHandler_CreateControl_MissingRequiredFields(t *testing.T) {
	router := newComplianceRouter()

	// Missing framework, controlId, controlName
	req := httptest.NewRequest(http.MethodPost, "/compliance/",
		strings.NewReader(`{"description":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestComplianceHandler_CreateControl_PartialRequiredFields(t *testing.T) {
	router := newComplianceRouter()

	// Has framework but missing controlId and controlName
	req := httptest.NewRequest(http.MethodPost, "/compliance/",
		strings.NewReader(`{"framework":"ISO_27001"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestComplianceHandler_UpdateControl_InvalidBody(t *testing.T) {
	router := newComplianceRouter()

	req := httptest.NewRequest(http.MethodPut,
		"/compliance/"+uuid.New().String(),
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

// ──────────────────────────────────────────────
// Full GRC handler routes registration
// ──────────────────────────────────────────────

func TestGRCHandler_AllSubRoutes_Registered(t *testing.T) {
	h := NewHandler(nil, nil)
	r := chi.NewRouter()
	r.Route("/grc", func(r chi.Router) {
		h.Routes(r)
	})

	tests := []struct {
		method string
		path   string
	}{
		// Risk routes
		{"GET", "/grc/risks/"},
		{"POST", "/grc/risks/"},
		{"GET", "/grc/risks/" + uuid.New().String()},
		// Audit routes
		{"GET", "/grc/audits/"},
		{"POST", "/grc/audits/"},
		{"GET", "/grc/audits/" + uuid.New().String()},
		// Access review routes
		{"GET", "/grc/access-reviews/"},
		{"POST", "/grc/access-reviews/"},
		{"GET", "/grc/access-reviews/" + uuid.New().String()},
		// Compliance routes
		{"GET", "/grc/compliance/"},
		{"POST", "/grc/compliance/"},
		{"GET", "/grc/compliance/" + uuid.New().String()},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			var body *strings.Reader
			if tt.method == "POST" {
				body = strings.NewReader("{}")
			} else {
				body = strings.NewReader("")
			}

			req := httptest.NewRequest(tt.method, tt.path, body)
			if tt.method == "POST" {
				req.Header.Set("Content-Type", "application/json")
			}
			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			if rr.Code == http.StatusNotFound || rr.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s not registered, got status %d", tt.method, tt.path, rr.Code)
			}
		})
	}
}

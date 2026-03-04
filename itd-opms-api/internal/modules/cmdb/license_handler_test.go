package cmdb

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Auth guard tests — License handlers
// ──────────────────────────────────────────────

func TestLicenseHandler_ListLicenses_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/licenses", nil)
	w := httptest.NewRecorder()
	h.license.ListLicenses(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_GetComplianceStats_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/licenses/compliance-stats", nil)
	w := httptest.NewRecorder()
	h.license.GetComplianceStats(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_GetLicense_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/licenses/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.license.GetLicense(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_CreateLicense_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/licenses", strings.NewReader(`{"softwareName":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.license.CreateLicense(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_UpdateLicense_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/licenses/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.license.UpdateLicense(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_DeleteLicense_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/licenses/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.license.DeleteLicense(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_ListAssignmentsByLicense_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/licenses/"+uuid.New().String()+"/assignments", nil)
	w := httptest.NewRecorder()
	h.license.ListAssignmentsByLicense(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_CreateLicenseAssignment_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/licenses/"+uuid.New().String()+"/assignments", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.license.CreateLicenseAssignment(w, req)
	assertUnauthorized(t, w)
}

func TestLicenseHandler_DeleteLicenseAssignment_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/licenses/assignments/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.license.DeleteLicenseAssignment(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Invalid UUID tests
// ──────────────────────────────────────────────

func TestLicenseHandler_GetLicense_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/licenses/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.license.GetLicense(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_UpdateLicense_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPut, "/licenses/bad-id", `{}`)
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.license.UpdateLicense(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_DeleteLicense_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodDelete, "/licenses/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.license.DeleteLicense(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_ListAssignmentsByLicense_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/licenses/bad-id/assignments", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.license.ListAssignmentsByLicense(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_CreateLicenseAssignment_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	userID := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/licenses/bad-id/assignments", `{"userId":"`+userID+`"}`)
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.license.CreateLicenseAssignment(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_DeleteLicenseAssignment_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodDelete, "/licenses/assignments/bad-id", "")
	req = chiContext(req, "assignmentId", "bad-id")
	w := httptest.NewRecorder()
	h.license.DeleteLicenseAssignment(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Invalid body tests
// ──────────────────────────────────────────────

func TestLicenseHandler_CreateLicense_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/licenses", "not-json")
	w := httptest.NewRecorder()
	h.license.CreateLicense(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_CreateLicense_MissingSoftwareName(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/licenses", `{"vendor":"Microsoft","licenseType":"perpetual","totalEntitlements":100}`)
	w := httptest.NewRecorder()
	h.license.CreateLicense(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestLicenseHandler_UpdateLicense_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPut, "/licenses/"+id, "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.license.UpdateLicense(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_CreateLicenseAssignment_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/licenses/"+id+"/assignments", "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.license.CreateLicenseAssignment(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestLicenseHandler_CreateLicenseAssignment_MissingUserIDAndAssetID(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/licenses/"+id+"/assignments", `{}`)
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.license.CreateLicenseAssignment(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestLicenseHandler_RouteRegistration(t *testing.T) {
	h := newTestHandler()

	r := chi.NewRouter()
	r.Use(recoveryMiddleware)
	r.Use(authMiddleware)
	r.Route("/licenses", func(r chi.Router) { h.license.Routes(r) })

	validID := uuid.New().String()
	userID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListLicenses", http.MethodGet, "/licenses/", ""},
		{"GetComplianceStats", http.MethodGet, "/licenses/compliance-stats", ""},
		{"GetLicense", http.MethodGet, "/licenses/" + validID, ""},
		{"CreateLicense", http.MethodPost, "/licenses/", `{"softwareName":"VS Code","vendor":"MS","licenseType":"perpetual","totalEntitlements":10}`},
		{"UpdateLicense", http.MethodPut, "/licenses/" + validID, `{"softwareName":"updated"}`},
		{"DeleteLicense", http.MethodDelete, "/licenses/" + validID, ""},
		{"ListAssignments", http.MethodGet, "/licenses/" + validID + "/assignments", ""},
		{"CreateAssignment", http.MethodPost, "/licenses/" + validID + "/assignments", `{"userId":"` + userID + `"}`},
		{"DeleteAssignment", http.MethodDelete, "/licenses/assignments/" + validID, ""},
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

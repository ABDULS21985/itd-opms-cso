package grc

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// newTestAuditMgmtHandler creates an AuditMgmtHandler backed by a nil-pool service.
func newTestAuditMgmtHandler() *AuditMgmtHandler {
	svc := NewAuditMgmtService(nil, nil)
	return NewAuditMgmtHandler(svc)
}

// newAuditRouter builds a chi router with audit routes mounted under /audits.
func newAuditRouter() chi.Router {
	h := newTestAuditMgmtHandler()
	r := chi.NewRouter()
	r.Route("/audits", func(r chi.Router) {
		h.Routes(r)
	})
	return r
}

// ──────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────

func TestAuditRoutes_Registered(t *testing.T) {
	router := newAuditRouter()
	auditID := uuid.New().String()
	findingID := uuid.New().String()
	evidenceID := uuid.New().String()

	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/audits/"},
		{"GET", "/audits/" + auditID},
		{"POST", "/audits/"},
		{"PUT", "/audits/" + auditID},
		{"DELETE", "/audits/" + auditID},
		{"GET", "/audits/" + auditID + "/findings/"},
		{"GET", "/audits/" + auditID + "/findings/" + findingID},
		{"POST", "/audits/" + auditID + "/findings/"},
		{"PUT", "/audits/" + auditID + "/findings/" + findingID},
		{"POST", "/audits/" + auditID + "/findings/" + findingID + "/close"},
		{"GET", "/audits/" + auditID + "/evidence/"},
		{"GET", "/audits/" + auditID + "/evidence/" + evidenceID},
		{"POST", "/audits/" + auditID + "/evidence/"},
		{"PUT", "/audits/" + auditID + "/evidence/" + evidenceID},
		{"POST", "/audits/" + auditID + "/evidence/" + evidenceID + "/approve"},
		{"GET", "/audits/" + auditID + "/readiness"},
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
// Auth guards — Audit endpoints
// ──────────────────────────────────────────────

func TestAuditMgmtHandler_ListAudits_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodGet, "/audits", nil)
	rr := httptest.NewRecorder()

	h.ListAudits(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_GetAudit_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodGet, "/audits/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.GetAudit(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_CreateAudit_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPost, "/audits",
		strings.NewReader(`{"title":"test","auditType":"internal"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateAudit(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_UpdateAudit_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPut, "/audits/"+uuid.New().String(),
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.UpdateAudit(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_DeleteAudit_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodDelete, "/audits/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.DeleteAudit(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_GetReadinessScore_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodGet, "/audits/"+uuid.New().String()+"/readiness", nil)
	rr := httptest.NewRecorder()

	h.GetReadinessScore(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

// ──────────────────────────────────────────────
// Auth guards — Finding endpoints
// ──────────────────────────────────────────────

func TestAuditMgmtHandler_ListFindings_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodGet, "/audits/"+uuid.New().String()+"/findings", nil)
	rr := httptest.NewRecorder()

	h.ListFindings(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_GetFinding_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodGet,
		"/audits/"+uuid.New().String()+"/findings/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.GetFinding(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_CreateFinding_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/findings",
		strings.NewReader(`{"title":"test","severity":"high"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateFinding(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_UpdateFinding_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPut,
		"/audits/"+uuid.New().String()+"/findings/"+uuid.New().String(),
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.UpdateFinding(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_CloseFinding_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/findings/"+uuid.New().String()+"/close", nil)
	rr := httptest.NewRecorder()

	h.CloseFinding(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

// ──────────────────────────────────────────────
// Auth guards — Evidence Collection endpoints
// ──────────────────────────────────────────────

func TestAuditMgmtHandler_ListEvidenceCollections_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodGet,
		"/audits/"+uuid.New().String()+"/evidence", nil)
	rr := httptest.NewRecorder()

	h.ListEvidenceCollections(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_GetEvidenceCollection_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodGet,
		"/audits/"+uuid.New().String()+"/evidence/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.GetEvidenceCollection(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_CreateEvidenceCollection_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/evidence",
		strings.NewReader(`{"title":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateEvidenceCollection(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_UpdateEvidenceCollection_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPut,
		"/audits/"+uuid.New().String()+"/evidence/"+uuid.New().String(),
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.UpdateEvidenceCollection(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAuditMgmtHandler_ApproveEvidenceCollection_NoAuth(t *testing.T) {
	h := newTestAuditMgmtHandler()
	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/evidence/"+uuid.New().String()+"/approve", nil)
	rr := httptest.NewRecorder()

	h.ApproveEvidenceCollection(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

// ──────────────────────────────────────────────
// Input validation — invalid UUIDs (audit)
// ──────────────────────────────────────────────

func TestAuditMgmtHandler_GetAudit_InvalidID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodGet, "/audits/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_UpdateAudit_InvalidID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPut, "/audits/not-a-uuid",
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

func TestAuditMgmtHandler_DeleteAudit_InvalidID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodDelete, "/audits/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_GetReadinessScore_InvalidID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodGet, "/audits/not-a-uuid/readiness", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Input validation — invalid UUIDs (findings)
// ──────────────────────────────────────────────

func TestAuditMgmtHandler_ListFindings_InvalidAuditID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodGet, "/audits/not-a-uuid/findings/", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_GetFinding_InvalidFindingID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodGet,
		"/audits/"+uuid.New().String()+"/findings/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_CreateFinding_InvalidAuditID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost, "/audits/not-a-uuid/findings/",
		strings.NewReader(`{"title":"test","severity":"high"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_UpdateFinding_InvalidFindingID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPut,
		"/audits/"+uuid.New().String()+"/findings/not-a-uuid",
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

func TestAuditMgmtHandler_CloseFinding_InvalidFindingID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/findings/not-a-uuid/close", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Input validation — invalid UUIDs (evidence)
// ──────────────────────────────────────────────

func TestAuditMgmtHandler_ListEvidenceCollections_InvalidAuditID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodGet, "/audits/not-a-uuid/evidence/", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_GetEvidenceCollection_InvalidEvidenceID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodGet,
		"/audits/"+uuid.New().String()+"/evidence/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_UpdateEvidenceCollection_InvalidEvidenceID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPut,
		"/audits/"+uuid.New().String()+"/evidence/not-a-uuid",
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

func TestAuditMgmtHandler_ApproveEvidenceCollection_InvalidEvidenceID(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/evidence/not-a-uuid/approve", nil)
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

func TestAuditMgmtHandler_CreateAudit_InvalidBody(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost, "/audits/",
		strings.NewReader(`{invalid json`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_CreateAudit_MissingRequiredFields(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost, "/audits/",
		strings.NewReader(`{"scope":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestAuditMgmtHandler_UpdateAudit_InvalidBody(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPut, "/audits/"+uuid.New().String(),
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

func TestAuditMgmtHandler_CreateFinding_InvalidBody(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/findings/",
		strings.NewReader(`{invalid`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_CreateFinding_MissingRequiredFields(t *testing.T) {
	router := newAuditRouter()

	// Missing title and severity
	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/findings/",
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

func TestAuditMgmtHandler_UpdateFinding_InvalidBody(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPut,
		"/audits/"+uuid.New().String()+"/findings/"+uuid.New().String(),
		strings.NewReader(`{not valid`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_CreateEvidenceCollection_InvalidBody(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/evidence/",
		strings.NewReader(`{invalid`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAuditMgmtHandler_CreateEvidenceCollection_MissingTitle(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/audits/"+uuid.New().String()+"/evidence/",
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

func TestAuditMgmtHandler_UpdateEvidenceCollection_InvalidBody(t *testing.T) {
	router := newAuditRouter()

	req := httptest.NewRequest(http.MethodPut,
		"/audits/"+uuid.New().String()+"/evidence/"+uuid.New().String(),
		strings.NewReader(`{not valid`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

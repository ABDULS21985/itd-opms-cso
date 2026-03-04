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
// Auth guard tests — CI handlers
// ──────────────────────────────────────────────

func TestCMDBCIHandler_ListCMDBItems_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/items", nil)
	w := httptest.NewRecorder()
	h.cmdb.ListCMDBItems(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_SearchCMDBItems_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/items/search?q=test", nil)
	w := httptest.NewRecorder()
	h.cmdb.SearchCMDBItems(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_GetCMDBItem_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/items/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.cmdb.GetCMDBItem(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_CreateCMDBItem_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/items", strings.NewReader(`{"name":"test","ciType":"server"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.cmdb.CreateCMDBItem(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_UpdateCMDBItem_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/items/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.cmdb.UpdateCMDBItem(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_DeleteCMDBItem_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/items/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.cmdb.DeleteCMDBItem(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_ListRelationshipsByCI_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/items/"+uuid.New().String()+"/relationships", nil)
	w := httptest.NewRecorder()
	h.cmdb.ListRelationshipsByCI(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Auth guard tests — Relationship handlers
// ──────────────────────────────────────────────

func TestCMDBCIHandler_CreateRelationship_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/relationships", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.cmdb.CreateRelationship(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_DeleteRelationship_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/relationships/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.cmdb.DeleteRelationship(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Auth guard tests — Reconciliation handlers
// ──────────────────────────────────────────────

func TestCMDBCIHandler_ListReconciliationRuns_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/reconciliation", nil)
	w := httptest.NewRecorder()
	h.cmdb.ListReconciliationRuns(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_GetReconciliationRun_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/reconciliation/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.cmdb.GetReconciliationRun(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_CreateReconciliationRun_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/reconciliation", strings.NewReader(`{"source":"scanner"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.cmdb.CreateReconciliationRun(w, req)
	assertUnauthorized(t, w)
}

func TestCMDBCIHandler_CompleteReconciliationRun_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/reconciliation/"+uuid.New().String()+"/complete", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.cmdb.CompleteReconciliationRun(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Invalid UUID tests — CI handlers
// ──────────────────────────────────────────────

func TestCMDBCIHandler_GetCMDBItem_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/items/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.cmdb.GetCMDBItem(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_UpdateCMDBItem_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPut, "/items/bad-id", `{"name":"updated"}`)
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.cmdb.UpdateCMDBItem(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_DeleteCMDBItem_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodDelete, "/items/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.cmdb.DeleteCMDBItem(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_ListRelationshipsByCI_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/items/bad-id/relationships", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.cmdb.ListRelationshipsByCI(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_DeleteRelationship_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodDelete, "/relationships/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.cmdb.DeleteRelationship(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_GetReconciliationRun_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/reconciliation/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.cmdb.GetReconciliationRun(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_CompleteReconciliationRun_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPut, "/reconciliation/bad-id/complete", `{}`)
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.cmdb.CompleteReconciliationRun(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Invalid body tests — CI handlers
// ──────────────────────────────────────────────

func TestCMDBCIHandler_CreateCMDBItem_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/items", "not-json")
	w := httptest.NewRecorder()
	h.cmdb.CreateCMDBItem(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_CreateCMDBItem_MissingName(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/items", `{"ciType":"server"}`)
	w := httptest.NewRecorder()
	h.cmdb.CreateCMDBItem(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestCMDBCIHandler_CreateCMDBItem_MissingCIType(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/items", `{"name":"Server-01"}`)
	w := httptest.NewRecorder()
	h.cmdb.CreateCMDBItem(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestCMDBCIHandler_UpdateCMDBItem_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPut, "/items/"+id, "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.cmdb.UpdateCMDBItem(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_CreateRelationship_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/relationships", "not-json")
	w := httptest.NewRecorder()
	h.cmdb.CreateRelationship(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_CreateRelationship_MissingSourceCIID(t *testing.T) {
	h := newTestHandler()
	tgt := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/relationships", `{"targetCiId":"`+tgt+`","relationshipType":"depends_on"}`)
	w := httptest.NewRecorder()
	h.cmdb.CreateRelationship(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestCMDBCIHandler_CreateRelationship_MissingTargetCIID(t *testing.T) {
	h := newTestHandler()
	src := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/relationships", `{"sourceCiId":"`+src+`","relationshipType":"depends_on"}`)
	w := httptest.NewRecorder()
	h.cmdb.CreateRelationship(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestCMDBCIHandler_CreateRelationship_MissingRelationshipType(t *testing.T) {
	h := newTestHandler()
	src := uuid.New().String()
	tgt := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/relationships", `{"sourceCiId":"`+src+`","targetCiId":"`+tgt+`"}`)
	w := httptest.NewRecorder()
	h.cmdb.CreateRelationship(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestCMDBCIHandler_CreateReconciliationRun_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/reconciliation", "not-json")
	w := httptest.NewRecorder()
	h.cmdb.CreateReconciliationRun(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_CreateReconciliationRun_MissingSource(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/reconciliation", `{}`)
	w := httptest.NewRecorder()
	h.cmdb.CreateReconciliationRun(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestCMDBCIHandler_CompleteReconciliationRun_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPut, "/reconciliation/"+id+"/complete", "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.cmdb.CompleteReconciliationRun(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestCMDBCIHandler_SearchCMDBItems_MissingQuery(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/items/search", "")
	w := httptest.NewRecorder()
	h.cmdb.SearchCMDBItems(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration tests
// ──────────────────────────────────────────────

func TestCMDBCIHandler_RouteRegistration(t *testing.T) {
	h := newTestHandler()

	r := chi.NewRouter()
	r.Use(recoveryMiddleware)
	r.Use(authMiddleware)
	h.cmdb.Routes(r)

	validID := uuid.New().String()
	src := uuid.New().String()
	tgt := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListCMDBItems", http.MethodGet, "/items/", ""},
		{"SearchCMDBItems", http.MethodGet, "/items/search?q=test", ""},
		{"GetCMDBItem", http.MethodGet, "/items/" + validID, ""},
		{"CreateCMDBItem", http.MethodPost, "/items/", `{"name":"CI","ciType":"server"}`},
		{"UpdateCMDBItem", http.MethodPut, "/items/" + validID, `{"name":"updated"}`},
		{"DeleteCMDBItem", http.MethodDelete, "/items/" + validID, ""},
		{"ListRelationshipsByCI", http.MethodGet, "/items/" + validID + "/relationships", ""},
		{"CreateRelationship", http.MethodPost, "/relationships/", `{"sourceCiId":"` + src + `","targetCiId":"` + tgt + `","relationshipType":"depends_on"}`},
		{"DeleteRelationship", http.MethodDelete, "/relationships/" + validID, ""},
		{"ListReconciliationRuns", http.MethodGet, "/reconciliation/", ""},
		{"GetReconciliationRun", http.MethodGet, "/reconciliation/" + validID, ""},
		{"CreateReconciliationRun", http.MethodPost, "/reconciliation/", `{"source":"scanner"}`},
		{"CompleteReconciliationRun", http.MethodPut, "/reconciliation/" + validID + "/complete", `{}`},
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

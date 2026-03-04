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
// Auth guard tests — Warranty handlers
// ──────────────────────────────────────────────

func TestWarrantyHandler_ListWarranties_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/warranties", nil)
	w := httptest.NewRecorder()
	h.warranty.ListWarranties(w, req)
	assertUnauthorized(t, w)
}

func TestWarrantyHandler_GetExpiringWarranties_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/warranties/expiring", nil)
	w := httptest.NewRecorder()
	h.warranty.GetExpiringWarranties(w, req)
	assertUnauthorized(t, w)
}

func TestWarrantyHandler_GetWarranty_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/warranties/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.warranty.GetWarranty(w, req)
	assertUnauthorized(t, w)
}

func TestWarrantyHandler_CreateWarranty_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/warranties", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.warranty.CreateWarranty(w, req)
	assertUnauthorized(t, w)
}

func TestWarrantyHandler_UpdateWarranty_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/warranties/"+uuid.New().String(), strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.warranty.UpdateWarranty(w, req)
	assertUnauthorized(t, w)
}

func TestWarrantyHandler_DeleteWarranty_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodDelete, "/warranties/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.warranty.DeleteWarranty(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Auth guard tests — Renewal alert handlers
// ──────────────────────────────────────────────

func TestWarrantyHandler_ListPendingAlerts_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/renewal-alerts", nil)
	w := httptest.NewRecorder()
	h.warranty.ListPendingAlerts(w, req)
	assertUnauthorized(t, w)
}

func TestWarrantyHandler_CreateRenewalAlert_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/renewal-alerts", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.warranty.CreateRenewalAlert(w, req)
	assertUnauthorized(t, w)
}

func TestWarrantyHandler_MarkAlertSent_NoAuth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPut, "/renewal-alerts/"+uuid.New().String()+"/sent", nil)
	w := httptest.NewRecorder()
	h.warranty.MarkAlertSent(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Invalid UUID tests — Warranty handlers
// ──────────────────────────────────────────────

func TestWarrantyHandler_GetWarranty_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodGet, "/warranties/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.warranty.GetWarranty(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestWarrantyHandler_UpdateWarranty_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPut, "/warranties/bad-id", `{}`)
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.warranty.UpdateWarranty(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestWarrantyHandler_DeleteWarranty_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodDelete, "/warranties/bad-id", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.warranty.DeleteWarranty(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestWarrantyHandler_MarkAlertSent_InvalidUUID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPut, "/renewal-alerts/bad-id/sent", "")
	req = chiContext(req, "id", "bad-id")
	w := httptest.NewRecorder()
	h.warranty.MarkAlertSent(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

// ──────────────────────────────────────────────
// Invalid body tests — Warranty handlers
// ──────────────────────────────────────────────

func TestWarrantyHandler_CreateWarranty_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/warranties", "not-json")
	w := httptest.NewRecorder()
	h.warranty.CreateWarranty(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestWarrantyHandler_CreateWarranty_MissingAssetID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/warranties", `{"startDate":"2025-01-01T00:00:00Z","endDate":"2026-01-01T00:00:00Z"}`)
	w := httptest.NewRecorder()
	h.warranty.CreateWarranty(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestWarrantyHandler_UpdateWarranty_InvalidBody(t *testing.T) {
	h := newTestHandler()
	id := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPut, "/warranties/"+id, "not-json")
	req = chiContext(req, "id", id)
	w := httptest.NewRecorder()
	h.warranty.UpdateWarranty(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestWarrantyHandler_CreateRenewalAlert_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/renewal-alerts", "not-json")
	w := httptest.NewRecorder()
	h.warranty.CreateRenewalAlert(w, req)
	assertBadRequest(t, w, "BAD_REQUEST")
}

func TestWarrantyHandler_CreateRenewalAlert_MissingEntityID(t *testing.T) {
	h := newTestHandler()
	req := requestWithAuthCtx(http.MethodPost, "/renewal-alerts", `{"entityType":"warranty","alertDate":"2025-06-01T00:00:00Z"}`)
	w := httptest.NewRecorder()
	h.warranty.CreateRenewalAlert(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

func TestWarrantyHandler_CreateRenewalAlert_MissingEntityType(t *testing.T) {
	h := newTestHandler()
	entityID := uuid.New().String()
	req := requestWithAuthCtx(http.MethodPost, "/renewal-alerts", `{"entityId":"`+entityID+`","alertDate":"2025-06-01T00:00:00Z"}`)
	w := httptest.NewRecorder()
	h.warranty.CreateRenewalAlert(w, req)
	assertBadRequest(t, w, "VALIDATION_ERROR")
}

// ──────────────────────────────────────────────
// Route registration tests — Warranty routes
// ──────────────────────────────────────────────

func TestWarrantyHandler_WarrantyRouteRegistration(t *testing.T) {
	h := newTestHandler()

	r := chi.NewRouter()
	r.Use(recoveryMiddleware)
	r.Use(authMiddleware)
	r.Route("/warranties", func(r chi.Router) { h.warranty.WarrantyRoutes(r) })

	validID := uuid.New().String()
	assetID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListWarranties", http.MethodGet, "/warranties/", ""},
		{"GetExpiringWarranties", http.MethodGet, "/warranties/expiring", ""},
		{"GetWarranty", http.MethodGet, "/warranties/" + validID, ""},
		{"CreateWarranty", http.MethodPost, "/warranties/", `{"assetId":"` + assetID + `","startDate":"2025-01-01T00:00:00Z","endDate":"2026-01-01T00:00:00Z"}`},
		{"UpdateWarranty", http.MethodPut, "/warranties/" + validID, `{"vendor":"HP"}`},
		{"DeleteWarranty", http.MethodDelete, "/warranties/" + validID, ""},
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

// ──────────────────────────────────────────────
// Route registration tests — Alert routes
// ──────────────────────────────────────────────

func TestWarrantyHandler_AlertRouteRegistration(t *testing.T) {
	h := newTestHandler()

	r := chi.NewRouter()
	r.Use(recoveryMiddleware)
	r.Use(authMiddleware)
	r.Route("/renewal-alerts", func(r chi.Router) { h.warranty.AlertRoutes(r) })

	validID := uuid.New().String()
	entityID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListPendingAlerts", http.MethodGet, "/renewal-alerts/", ""},
		{"CreateRenewalAlert", http.MethodPost, "/renewal-alerts/", `{"entityType":"warranty","entityId":"` + entityID + `","alertDate":"2025-06-01T00:00:00Z"}`},
		{"MarkAlertSent", http.MethodPut, "/renewal-alerts/" + validID + "/sent", ""},
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

// ──────────────────────────────────────────────
// Full CMDB module routes (handler.go Routes)
// ──────────────────────────────────────────────

func TestHandler_FullRouteRegistration(t *testing.T) {
	h := newTestHandler()

	r := chi.NewRouter()
	r.Use(recoveryMiddleware)
	r.Use(authMiddleware)
	h.Routes(r)

	validID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		// Asset routes
		{"Assets_List", http.MethodGet, "/assets/", ""},
		{"Assets_Stats", http.MethodGet, "/assets/stats", ""},
		{"Assets_Search", http.MethodGet, "/assets/search?q=test", ""},
		{"Assets_Get", http.MethodGet, "/assets/" + validID, ""},
		// CI routes
		{"Items_List", http.MethodGet, "/items/", ""},
		{"Items_Search", http.MethodGet, "/items/search?q=test", ""},
		{"Items_Get", http.MethodGet, "/items/" + validID, ""},
		// Relationship routes
		{"Relationships_Create", http.MethodPost, "/relationships/", `{"sourceCiId":"` + validID + `","targetCiId":"` + uuid.New().String() + `","relationshipType":"depends_on"}`},
		// Reconciliation routes
		{"Reconciliation_List", http.MethodGet, "/reconciliation/", ""},
		{"Reconciliation_Get", http.MethodGet, "/reconciliation/" + validID, ""},
		// License routes
		{"Licenses_List", http.MethodGet, "/licenses/", ""},
		{"Licenses_ComplianceStats", http.MethodGet, "/licenses/compliance-stats", ""},
		{"Licenses_Get", http.MethodGet, "/licenses/" + validID, ""},
		// Warranty routes
		{"Warranties_List", http.MethodGet, "/warranties/", ""},
		{"Warranties_Expiring", http.MethodGet, "/warranties/expiring", ""},
		{"Warranties_Get", http.MethodGet, "/warranties/" + validID, ""},
		// Renewal alert routes
		{"RenewalAlerts_List", http.MethodGet, "/renewal-alerts/", ""},
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

package system

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
// Test helpers
// ──────────────────────────────────────────────

func newTestAuditExplorerHandler() *AuditExplorerHandler {
	svc := NewAuditExplorerService(nil, nil)
	return NewAuditExplorerHandler(svc)
}

// ──────────────────────────────────────────────
// Auth guard tests — no AuthContext yields 401
// ──────────────────────────────────────────────

func TestAuditExplorerHandler_ListEvents_NoAuth(t *testing.T) {
	h := newTestAuditExplorerHandler()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	h.ListEvents(w, req)
	assertUnauthorized(t, w)
}

func TestAuditExplorerHandler_GetEvent_NoAuth(t *testing.T) {
	h := newTestAuditExplorerHandler()
	req := httptest.NewRequest(http.MethodGet, "/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.GetEvent(w, req)
	assertUnauthorized(t, w)
}

func TestAuditExplorerHandler_GetEntityTimeline_NoAuth(t *testing.T) {
	h := newTestAuditExplorerHandler()
	req := httptest.NewRequest(http.MethodGet, "/entity/user/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	h.GetEntityTimeline(w, req)
	assertUnauthorized(t, w)
}

func TestAuditExplorerHandler_GetStats_NoAuth(t *testing.T) {
	h := newTestAuditExplorerHandler()
	req := httptest.NewRequest(http.MethodGet, "/stats", nil)
	w := httptest.NewRecorder()
	h.GetStats(w, req)
	assertUnauthorized(t, w)
}

func TestAuditExplorerHandler_ExportEvents_NoAuth(t *testing.T) {
	h := newTestAuditExplorerHandler()
	req := httptest.NewRequest(http.MethodGet, "/export", nil)
	w := httptest.NewRecorder()
	h.ExportEvents(w, req)
	assertUnauthorized(t, w)
}

func TestAuditExplorerHandler_VerifyIntegrity_NoAuth(t *testing.T) {
	h := newTestAuditExplorerHandler()
	req := httptest.NewRequest(http.MethodPost, "/verify", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.VerifyIntegrity(w, req)
	assertUnauthorized(t, w)
}

// ──────────────────────────────────────────────
// Input validation tests
// ──────────────────────────────────────────────

func TestAuditExplorerHandler_GetEvent_InvalidID(t *testing.T) {
	h := newTestAuditExplorerHandler()

	r := chi.NewRouter()
	r.Get("/{id}", h.GetEvent)

	req := requestWithAuthCtx(http.MethodGet, "/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestAuditExplorerHandler_GetEntityTimeline_InvalidID(t *testing.T) {
	h := newTestAuditExplorerHandler()

	r := chi.NewRouter()
	r.Get("/entity/{type}/{id}", h.GetEntityTimeline)

	req := requestWithAuthCtx(http.MethodGet, "/entity/user/not-a-uuid", "")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assertBadRequest(t, w)
}

func TestAuditExplorerHandler_VerifyIntegrity_InvalidBody(t *testing.T) {
	h := newTestAuditExplorerHandler()

	req := requestWithAuthCtx(http.MethodPost, "/verify", `{invalid json}`)
	w := httptest.NewRecorder()
	h.VerifyIntegrity(w, req)
	assertBadRequest(t, w)
}

// ──────────────────────────────────────────────
// parseAuditExplorerParams tests
// ──────────────────────────────────────────────

func TestParseAuditExplorerParams_Defaults(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	params := parseAuditExplorerParams(req)

	if params.Page != 1 {
		t.Errorf("expected default page 1, got %d", params.Page)
	}
	if params.PageSize != 20 {
		t.Errorf("expected default pageSize 20, got %d", params.PageSize)
	}
	if params.DateFrom != nil {
		t.Errorf("expected nil dateFrom, got %v", params.DateFrom)
	}
	if params.DateTo != nil {
		t.Errorf("expected nil dateTo, got %v", params.DateTo)
	}
}

func TestParseAuditExplorerParams_CustomValues(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet,
		"/?page=3&limit=50&actorId=abc&entityType=user&action=create&search=test&sortBy=created_at&sortOrder=asc"+
			"&dateFrom=2025-01-01T00:00:00Z&dateTo=2025-12-31T23:59:59Z",
		nil)
	params := parseAuditExplorerParams(req)

	if params.Page != 3 {
		t.Errorf("expected page 3, got %d", params.Page)
	}
	if params.PageSize != 50 {
		t.Errorf("expected pageSize 50, got %d", params.PageSize)
	}
	if params.ActorID != "abc" {
		t.Errorf("expected actorId 'abc', got %q", params.ActorID)
	}
	if params.EntityType != "user" {
		t.Errorf("expected entityType 'user', got %q", params.EntityType)
	}
	if params.Action != "create" {
		t.Errorf("expected action 'create', got %q", params.Action)
	}
	if params.Search != "test" {
		t.Errorf("expected search 'test', got %q", params.Search)
	}
	if params.SortBy != "created_at" {
		t.Errorf("expected sortBy 'created_at', got %q", params.SortBy)
	}
	if params.SortOrder != "asc" {
		t.Errorf("expected sortOrder 'asc', got %q", params.SortOrder)
	}
	if params.DateFrom == nil {
		t.Fatal("expected dateFrom to be parsed")
	}
	if params.DateTo == nil {
		t.Fatal("expected dateTo to be parsed")
	}
}

func TestParseAuditExplorerParams_InvalidPageDefaultsTo1(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/?page=-5&limit=200", nil)
	params := parseAuditExplorerParams(req)

	if params.Page != 1 {
		t.Errorf("expected page 1 for negative input, got %d", params.Page)
	}
	// limit > 100 should be ignored, keeping default
	if params.PageSize != 20 {
		t.Errorf("expected pageSize 20 for out-of-range, got %d", params.PageSize)
	}
}

// ──────────────────────────────────────────────
// Route registration test
// ──────────────────────────────────────────────

func TestAuditExplorerHandler_RouteRegistration(t *testing.T) {
	h := newTestAuditExplorerHandler()

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					w.WriteHeader(http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, req)
		})
	})
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
	r.Route("/audit-logs", func(r chi.Router) { h.Routes(r) })

	validUUID := uuid.New().String()

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{"ListEvents", http.MethodGet, "/audit-logs/", ""},
		{"GetStats", http.MethodGet, "/audit-logs/stats", ""},
		{"ExportEvents", http.MethodGet, "/audit-logs/export", ""},
		{"VerifyIntegrity", http.MethodPost, "/audit-logs/verify", `{}`},
		{"GetEntityTimeline", http.MethodGet, "/audit-logs/entity/user/" + validUUID, ""},
		{"GetEvent", http.MethodGet, "/audit-logs/" + validUUID, ""},
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
				t.Errorf("route %s %s returned 404 — route not registered", tt.method, tt.path)
			}
			if w.Code == http.StatusMethodNotAllowed {
				t.Errorf("route %s %s returned 405 — method not allowed", tt.method, tt.path)
			}
		})
	}
}

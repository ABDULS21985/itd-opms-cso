package grc

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// newTestAccessReviewHandler creates an AccessReviewHandler backed by a nil-pool service.
func newTestAccessReviewHandler() *AccessReviewHandler {
	svc := NewAccessReviewService(nil, nil)
	return NewAccessReviewHandler(svc)
}

// newAccessReviewRouter builds a chi router with access review routes
// mounted under /access-reviews.
func newAccessReviewRouter() chi.Router {
	h := newTestAccessReviewHandler()
	r := chi.NewRouter()
	r.Route("/access-reviews", func(r chi.Router) {
		h.Routes(r)
	})
	return r
}

// ──────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────

func TestAccessReviewRoutes_Registered(t *testing.T) {
	router := newAccessReviewRouter()
	campaignID := uuid.New().String()
	entryID := uuid.New().String()

	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/access-reviews/"},
		{"GET", "/access-reviews/" + campaignID},
		{"POST", "/access-reviews/"},
		{"PUT", "/access-reviews/" + campaignID},
		{"GET", "/access-reviews/" + campaignID + "/entries/"},
		{"POST", "/access-reviews/" + campaignID + "/entries/"},
		{"POST", "/access-reviews/" + campaignID + "/entries/" + entryID + "/decide"},
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
// Auth guards — Campaign endpoints
// ──────────────────────────────────────────────

func TestAccessReviewHandler_ListCampaigns_NoAuth(t *testing.T) {
	h := newTestAccessReviewHandler()
	req := httptest.NewRequest(http.MethodGet, "/access-reviews", nil)
	rr := httptest.NewRecorder()

	h.ListCampaigns(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAccessReviewHandler_GetCampaign_NoAuth(t *testing.T) {
	h := newTestAccessReviewHandler()
	req := httptest.NewRequest(http.MethodGet, "/access-reviews/"+uuid.New().String(), nil)
	rr := httptest.NewRecorder()

	h.GetCampaign(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAccessReviewHandler_CreateCampaign_NoAuth(t *testing.T) {
	h := newTestAccessReviewHandler()
	req := httptest.NewRequest(http.MethodPost, "/access-reviews",
		strings.NewReader(`{"title":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateCampaign(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAccessReviewHandler_UpdateCampaign_NoAuth(t *testing.T) {
	h := newTestAccessReviewHandler()
	req := httptest.NewRequest(http.MethodPut, "/access-reviews/"+uuid.New().String(),
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.UpdateCampaign(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

// ──────────────────────────────────────────────
// Auth guards — Entry endpoints
// ──────────────────────────────────────────────

func TestAccessReviewHandler_ListEntries_NoAuth(t *testing.T) {
	h := newTestAccessReviewHandler()
	req := httptest.NewRequest(http.MethodGet,
		"/access-reviews/"+uuid.New().String()+"/entries", nil)
	rr := httptest.NewRecorder()

	h.ListEntries(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAccessReviewHandler_CreateEntry_NoAuth(t *testing.T) {
	h := newTestAccessReviewHandler()
	req := httptest.NewRequest(http.MethodPost,
		"/access-reviews/"+uuid.New().String()+"/entries",
		strings.NewReader(`{"userId":"`+uuid.New().String()+`"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.CreateEntry(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

func TestAccessReviewHandler_RecordDecision_NoAuth(t *testing.T) {
	h := newTestAccessReviewHandler()
	req := httptest.NewRequest(http.MethodPost,
		"/access-reviews/"+uuid.New().String()+"/entries/"+uuid.New().String()+"/decide",
		strings.NewReader(`{"decision":"approved"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.RecordDecision(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "UNAUTHORIZED")
}

// ──────────────────────────────────────────────
// Input validation — invalid UUIDs (campaigns)
// ──────────────────────────────────────────────

func TestAccessReviewHandler_GetCampaign_InvalidID(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodGet, "/access-reviews/not-a-uuid", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAccessReviewHandler_UpdateCampaign_InvalidID(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPut, "/access-reviews/not-a-uuid",
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

// ──────────────────────────────────────────────
// Input validation — invalid UUIDs (entries)
// ──────────────────────────────────────────────

func TestAccessReviewHandler_ListEntries_InvalidCampaignID(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodGet, "/access-reviews/not-a-uuid/entries/", nil)
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAccessReviewHandler_CreateEntry_InvalidCampaignID(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPost, "/access-reviews/not-a-uuid/entries/",
		strings.NewReader(`{"userId":"`+uuid.New().String()+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "BAD_REQUEST")
}

func TestAccessReviewHandler_RecordDecision_InvalidEntryID(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/access-reviews/"+uuid.New().String()+"/entries/not-a-uuid/decide",
		strings.NewReader(`{"decision":"approved"}`))
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
// Input validation — invalid request bodies
// ──────────────────────────────────────────────

func TestAccessReviewHandler_CreateCampaign_InvalidBody(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPost, "/access-reviews/",
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

func TestAccessReviewHandler_CreateCampaign_MissingTitle(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPost, "/access-reviews/",
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

func TestAccessReviewHandler_UpdateCampaign_InvalidBody(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPut,
		"/access-reviews/"+uuid.New().String(),
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

func TestAccessReviewHandler_CreateEntry_InvalidBody(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/access-reviews/"+uuid.New().String()+"/entries/",
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

func TestAccessReviewHandler_CreateEntry_MissingUserID(t *testing.T) {
	router := newAccessReviewRouter()

	// userId is zero-value UUID which is uuid.Nil
	req := httptest.NewRequest(http.MethodPost,
		"/access-reviews/"+uuid.New().String()+"/entries/",
		strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestAccessReviewHandler_RecordDecision_InvalidBody(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/access-reviews/"+uuid.New().String()+"/entries/"+uuid.New().String()+"/decide",
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

func TestAccessReviewHandler_RecordDecision_MissingDecision(t *testing.T) {
	router := newAccessReviewRouter()

	req := httptest.NewRequest(http.MethodPost,
		"/access-reviews/"+uuid.New().String()+"/entries/"+uuid.New().String()+"/decide",
		strings.NewReader(`{"justification":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	req = reqWithAuth(req)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

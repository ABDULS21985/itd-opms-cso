package planning

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func newTestTimelineHandler() *TimelineHandler {
	return NewTimelineHandler(nil)
}

// ──────────────────────────────────────────────
// TimelineHandler — auth guard (401)
// ──────────────────────────────────────────────

func TestTimelineHandler_ProjectTimeline_NoAuth(t *testing.T) {
	h := newTestTimelineHandler()
	req := httptest.NewRequest(http.MethodGet, "/projects/123/timeline", nil)
	w := httptest.NewRecorder()

	h.ProjectTimeline(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestTimelineHandler_PortfolioTimeline_NoAuth(t *testing.T) {
	h := newTestTimelineHandler()
	req := httptest.NewRequest(http.MethodGet, "/portfolios/123/timeline", nil)
	w := httptest.NewRecorder()

	h.PortfolioTimeline(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// TimelineHandler — invalid ID (400)
// ──────────────────────────────────────────────

func TestTimelineHandler_ProjectTimeline_InvalidID(t *testing.T) {
	h := newTestTimelineHandler()

	r := chi.NewRouter()
	r.Get("/projects/{id}/timeline", h.ProjectTimeline)

	req := requestWithAuth(http.MethodGet, "/projects/not-a-uuid/timeline", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestTimelineHandler_PortfolioTimeline_InvalidID(t *testing.T) {
	h := newTestTimelineHandler()

	r := chi.NewRouter()
	r.Get("/portfolios/{id}/timeline", h.PortfolioTimeline)

	req := requestWithAuth(http.MethodGet, "/portfolios/not-a-uuid/timeline", "")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// TimelineHandler — route registration
// ──────────────────────────────────────────────

func TestTimelineHandler_Routes_ProjectTimeline(t *testing.T) {
	h := newTestTimelineHandler()

	r := chi.NewRouter()
	h.Routes(r)

	// Use unauthenticated request: middleware returns 401, proving the route is registered.
	req := httptest.NewRequest(http.MethodGet, "/projects/00000000-0000-0000-0000-000000000001/timeline", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Should not be 404 or 405 — route is registered.
	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route not registered: got %d", w.Code)
	}
}

func TestTimelineHandler_PortfolioTimeline_Routes(t *testing.T) {
	h := newTestTimelineHandler()

	r := chi.NewRouter()
	h.Routes(r)

	// Use unauthenticated request: middleware returns 401, proving the route is registered.
	req := httptest.NewRequest(http.MethodGet, "/portfolios/00000000-0000-0000-0000-000000000001/timeline", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Should not be 404 or 405 — route is registered.
	if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
		t.Errorf("route not registered: got %d", w.Code)
	}
}

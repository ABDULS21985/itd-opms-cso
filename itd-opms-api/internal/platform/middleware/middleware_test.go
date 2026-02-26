package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
)

// ──────────────────────────────────────────────
// Correlation middleware
// ──────────────────────────────────────────────

func TestCorrelationGeneratesID(t *testing.T) {
	handler := middleware.Correlation(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	corrID := w.Header().Get("X-Correlation-ID")
	if corrID == "" {
		t.Error("expected X-Correlation-ID header to be set when none provided")
	}
}

func TestCorrelationPassthrough(t *testing.T) {
	handler := middleware.Correlation(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Correlation-ID", "test-corr-123")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	corrID := w.Header().Get("X-Correlation-ID")
	if corrID != "test-corr-123" {
		t.Errorf("expected test-corr-123, got %s", corrID)
	}
}

func TestCorrelationUniquePerRequest(t *testing.T) {
	handler := middleware.Correlation(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, httptest.NewRequest(http.MethodGet, "/a", nil))

	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, httptest.NewRequest(http.MethodGet, "/b", nil))

	id1 := w1.Header().Get("X-Correlation-ID")
	id2 := w2.Header().Get("X-Correlation-ID")

	if id1 == id2 {
		t.Errorf("expected different correlation IDs, both got %s", id1)
	}
}

// ──────────────────────────────────────────────
// Recovery middleware
// ──────────────────────────────────────────────

func TestRecoveryHandlesPanic(t *testing.T) {
	handler := middleware.Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("test panic")
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	// Should not panic — the middleware recovers.
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500 after panic, got %d", w.Code)
	}
}

func TestRecoveryNoPanic(t *testing.T) {
	handler := middleware.Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 when no panic, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// SecurityHeaders middleware
// ──────────────────────────────────────────────

func TestSecurityHeaders(t *testing.T) {
	handler := middleware.SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	expectedHeaders := map[string]string{
		"X-Frame-Options":           "DENY",
		"X-Content-Type-Options":    "nosniff",
		"Referrer-Policy":           "strict-origin-when-cross-origin",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
		"X-XSS-Protection":         "1; mode=block",
		"Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
		"Content-Security-Policy":   "default-src 'none'; frame-ancestors 'none'",
	}

	for header, expected := range expectedHeaders {
		got := w.Header().Get(header)
		if got != expected {
			t.Errorf("header %s: expected %q, got %q", header, expected, got)
		}
	}
}

// ──────────────────────────────────────────────
// CSRFProtection middleware
// ──────────────────────────────────────────────

func TestCSRFAllowsGET(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET should pass without origin check, got %d", w.Code)
	}
}

func TestCSRFAllowsHEAD(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodHead, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("HEAD should pass without origin check, got %d", w.Code)
	}
}

func TestCSRFAllowsOPTIONS(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("OPTIONS should pass without origin check, got %d", w.Code)
	}
}

func TestCSRFAllowsValidOrigin(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("POST with valid origin should pass, got %d", w.Code)
	}
}

func TestCSRFBlocksInvalidOrigin(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Origin", "http://evil.com")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("POST with invalid origin should be blocked, got %d", w.Code)
	}
}

func TestCSRFAllowsNoOriginForAPIClients(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// API clients (curl, Postman) don't send Origin or Referer.
	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("POST without origin should be allowed for API clients, got %d", w.Code)
	}
}

func TestCSRFBlocksInvalidReferer(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodDelete, "/test", nil)
	req.Header.Set("Referer", "http://evil.com/some/path")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("DELETE with invalid referer should be blocked, got %d", w.Code)
	}
}

func TestCSRFOriginTrailingSlash(t *testing.T) {
	csrf := middleware.CSRFProtection([]string{"http://localhost:3000"})
	handler := csrf(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000/")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("POST with trailing slash on origin should pass, got %d", w.Code)
	}
}

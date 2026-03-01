package middleware_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/platform/auth"
	"github.com/itd-cbn/itd-opms-api/internal/platform/config"
	"github.com/itd-cbn/itd-opms-api/internal/platform/middleware"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
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

func TestCorrelationSetsContextValue(t *testing.T) {
	var ctxCorrID string
	handler := middleware.Correlation(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxCorrID = types.GetCorrelationID(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Correlation-ID", "ctx-test-id")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if ctxCorrID != "ctx-test-id" {
		t.Errorf("expected context correlation ID 'ctx-test-id', got %q", ctxCorrID)
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

func TestRecoveryPanicWithNonStringValue(t *testing.T) {
	handler := middleware.Recovery(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(42) // non-string panic value
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500 after non-string panic, got %d", w.Code)
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

func TestSecurityHeaders_PassesThroughHandler(t *testing.T) {
	handler := middleware.SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201 from inner handler, got %d", w.Code)
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

// ──────────────────────────────────────────────
// Auth middleware (dev JWT mode)
// ──────────────────────────────────────────────

const testSecret = "test-middleware-jwt-secret"

func generateTestToken(t *testing.T, userID, tenantID uuid.UUID, email string, roles, permissions []string) string {
	t.Helper()
	cfg := config.JWTConfig{
		Secret: testSecret,
		Expiry: 15 * time.Minute,
	}
	token, err := auth.GenerateAccessToken(cfg, userID, tenantID, email, roles, permissions)
	if err != nil {
		t.Fatalf("failed to generate test token: %v", err)
	}
	return token
}

func TestAuth_ValidBearerToken(t *testing.T) {
	userID := uuid.New()
	tenantID := uuid.New()
	token := generateTestToken(t, userID, tenantID, "user@test.com", []string{"admin"}, []string{"users.read"})

	var capturedAuth *types.AuthContext
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = types.GetAuthContext(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.Auth(testSecret)(inner)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with valid token, got %d", w.Code)
	}
	if capturedAuth == nil {
		t.Fatal("expected AuthContext to be set in context")
	}
	if capturedAuth.UserID != userID {
		t.Errorf("expected UserID %s, got %s", userID, capturedAuth.UserID)
	}
	if capturedAuth.TenantID != tenantID {
		t.Errorf("expected TenantID %s, got %s", tenantID, capturedAuth.TenantID)
	}
	if capturedAuth.Email != "user@test.com" {
		t.Errorf("expected email user@test.com, got %s", capturedAuth.Email)
	}
	if len(capturedAuth.Roles) != 1 || capturedAuth.Roles[0] != "admin" {
		t.Errorf("expected roles [admin], got %v", capturedAuth.Roles)
	}
	if len(capturedAuth.Permissions) != 1 || capturedAuth.Permissions[0] != "users.read" {
		t.Errorf("expected permissions [users.read], got %v", capturedAuth.Permissions)
	}
}

func TestAuth_MissingAuthorizationHeader(t *testing.T) {
	handler := middleware.Auth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without Authorization header, got %d", w.Code)
	}
}

func TestAuth_InvalidToken(t *testing.T) {
	handler := middleware.Auth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token-string")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with invalid token, got %d", w.Code)
	}
}

func TestAuth_ExpiredToken(t *testing.T) {
	cfg := config.JWTConfig{
		Secret: testSecret,
		Expiry: -1 * time.Hour, // Already expired
	}
	token, _ := auth.GenerateAccessToken(cfg, uuid.New(), uuid.New(), "test@test.com", nil, nil)

	handler := middleware.Auth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with expired token, got %d", w.Code)
	}
}

func TestAuth_WrongSecret(t *testing.T) {
	token := generateTestToken(t, uuid.New(), uuid.New(), "test@test.com", nil, nil)

	handler := middleware.Auth("different-secret")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with wrong secret, got %d", w.Code)
	}
}

func TestAuth_BearerCaseInsensitive(t *testing.T) {
	token := generateTestToken(t, uuid.New(), uuid.New(), "test@test.com", nil, nil)

	handler := middleware.Auth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with lowercase 'bearer', got %d", w.Code)
	}
}

func TestAuth_TokenInQueryParam(t *testing.T) {
	token := generateTestToken(t, uuid.New(), uuid.New(), "test@test.com", nil, nil)

	handler := middleware.Auth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test?token="+token, nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with token in query param, got %d", w.Code)
	}
}

func TestAuth_MalformedAuthorizationHeader(t *testing.T) {
	handler := middleware.Auth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	tests := []struct {
		name   string
		header string
	}{
		{"no bearer prefix", "just-a-token"},
		{"basic auth", "Basic dXNlcjpwYXNz"},
		{"empty bearer", "Bearer "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("Authorization", tt.header)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected 401 for %q, got %d", tt.header, w.Code)
			}
		})
	}
}

// ──────────────────────────────────────────────
// PublicRoute middleware
// ──────────────────────────────────────────────

func TestPublicRoute_SkipsAuth(t *testing.T) {
	innerCalled := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		innerCalled = true
		w.WriteHeader(http.StatusOK)
	})

	// Chain: PublicRoute → Auth → inner
	handler := middleware.PublicRoute(middleware.Auth(testSecret)(inner))

	req := httptest.NewRequest(http.MethodGet, "/public", nil)
	// No Authorization header — should still pass because route is public
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for public route, got %d", w.Code)
	}
	if !innerCalled {
		t.Error("expected inner handler to be called for public route")
	}
}

// ──────────────────────────────────────────────
// RBAC: RequirePermission
// ──────────────────────────────────────────────

func requestWithAuth(userID, tenantID uuid.UUID, roles, permissions []string) *http.Request {
	authCtx := &types.AuthContext{
		UserID:      userID,
		TenantID:    tenantID,
		Roles:       roles,
		Permissions: permissions,
	}
	ctx := types.SetAuthContext(httptest.NewRequest(http.MethodGet, "/test", nil).Context(), authCtx)
	return httptest.NewRequest(http.MethodGet, "/test", nil).WithContext(ctx)
}

func TestRequirePermission_Allowed(t *testing.T) {
	handler := middleware.RequirePermission("users.read")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := requestWithAuth(uuid.New(), uuid.New(), nil, []string{"users.read", "users.write"})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with matching permission, got %d", w.Code)
	}
}

func TestRequirePermission_Denied(t *testing.T) {
	handler := middleware.RequirePermission("users.delete")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := requestWithAuth(uuid.New(), uuid.New(), nil, []string{"users.read"})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 without required permission, got %d", w.Code)
	}

	var resp map[string]any
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "error" {
		t.Errorf("expected error status in response, got %v", resp["status"])
	}
}

func TestRequirePermission_WildcardBypass(t *testing.T) {
	handler := middleware.RequirePermission("anything.at.all")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := requestWithAuth(uuid.New(), uuid.New(), nil, []string{"*"})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with wildcard permission, got %d", w.Code)
	}
}

func TestRequirePermission_NoAuthContext(t *testing.T) {
	handler := middleware.RequirePermission("users.read")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth context, got %d", w.Code)
	}
}

func TestRequirePermission_EmptyPermissions(t *testing.T) {
	handler := middleware.RequirePermission("users.read")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := requestWithAuth(uuid.New(), uuid.New(), nil, []string{})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 with empty permissions, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// RBAC: RequireRole
// ──────────────────────────────────────────────

func TestRequireRole_Allowed(t *testing.T) {
	handler := middleware.RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := requestWithAuth(uuid.New(), uuid.New(), []string{"admin", "viewer"}, nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with matching role, got %d", w.Code)
	}
}

func TestRequireRole_Denied(t *testing.T) {
	handler := middleware.RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := requestWithAuth(uuid.New(), uuid.New(), []string{"viewer"}, nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 without required role, got %d", w.Code)
	}
}

func TestRequireRole_NoAuthContext(t *testing.T) {
	handler := middleware.RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth context, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Logging middleware
// ──────────────────────────────────────────────

func TestLogging_PassesThroughResponse(t *testing.T) {
	handler := middleware.Logging(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"ok": true}`))
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201 pass-through, got %d", w.Code)
	}
	if w.Body.String() != `{"ok": true}` {
		t.Errorf("expected body pass-through, got %q", w.Body.String())
	}
}

func TestLogging_DefaultsTo200(t *testing.T) {
	handler := middleware.Logging(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("hello"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected default 200, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// SessionTimeout middleware
// ──────────────────────────────────────────────

func TestSessionTimeout_PassesThrough(t *testing.T) {
	// Currently SessionTimeout is a pass-through (TODO in code).
	handler := middleware.SessionTimeout(30 * time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 pass-through, got %d", w.Code)
	}
}

func TestSessionTimeout_ZeroDefaultsTo30Min(t *testing.T) {
	// Just ensures no panic with zero timeout
	handler := middleware.SessionTimeout(0)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// Middleware chaining integration
// ──────────────────────────────────────────────

func TestMiddlewareChain_CorrelationThenAuth(t *testing.T) {
	token := generateTestToken(t, uuid.New(), uuid.New(), "chain@test.com", nil, nil)

	var capturedCorrID string
	var capturedAuth *types.AuthContext
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCorrID = types.GetCorrelationID(r.Context())
		capturedAuth = types.GetAuthContext(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.Correlation(middleware.Auth(testSecret)(inner))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if capturedCorrID == "" {
		t.Error("expected correlation ID to be set")
	}
	if capturedAuth == nil {
		t.Error("expected auth context to be set")
	}
}

func TestMiddlewareChain_AuthThenRBAC(t *testing.T) {
	token := generateTestToken(t, uuid.New(), uuid.New(), "rbac@test.com", nil, []string{"projects.read"})

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.Auth(testSecret)(
		middleware.RequirePermission("projects.read")(inner),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with matching permission, got %d", w.Code)
	}
}

func TestMiddlewareChain_AuthThenRBAC_Denied(t *testing.T) {
	token := generateTestToken(t, uuid.New(), uuid.New(), "rbac@test.com", nil, []string{"projects.read"})

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.Auth(testSecret)(
		middleware.RequirePermission("projects.delete")(inner),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 without required permission, got %d", w.Code)
	}
}

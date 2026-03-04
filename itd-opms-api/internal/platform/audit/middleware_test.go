package audit

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// isMutatingMethod
// ──────────────────────────────────────────────

func TestIsMutatingMethod(t *testing.T) {
	tests := []struct {
		method string
		want   bool
	}{
		{http.MethodGet, false},
		{http.MethodHead, false},
		{http.MethodOptions, false},
		{http.MethodPost, true},
		{http.MethodPut, true},
		{http.MethodPatch, true},
		{http.MethodDelete, true},
	}

	for _, tt := range tests {
		t.Run(tt.method, func(t *testing.T) {
			got := isMutatingMethod(tt.method)
			if got != tt.want {
				t.Errorf("isMutatingMethod(%q) = %v, want %v", tt.method, got, tt.want)
			}
		})
	}
}

// ──────────────────────────────────────────────
// methodVerb
// ──────────────────────────────────────────────

func TestMethodVerb(t *testing.T) {
	tests := []struct {
		method string
		want   string
	}{
		{http.MethodPost, "create"},
		{http.MethodPut, "update"},
		{http.MethodPatch, "update"},
		{http.MethodDelete, "delete"},
		{http.MethodGet, "unknown"},
		{http.MethodHead, "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.method, func(t *testing.T) {
			got := methodVerb(tt.method)
			if got != tt.want {
				t.Errorf("methodVerb(%q) = %q, want %q", tt.method, got, tt.want)
			}
		})
	}
}

// ──────────────────────────────────────────────
// buildAction
// ──────────────────────────────────────────────

func TestBuildAction(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
		want   string
	}{
		{
			name:   "POST to resource collection",
			method: http.MethodPost,
			path:   "/api/v1/governance/policies",
			want:   "create:policies",
		},
		{
			name:   "PUT to specific resource",
			method: http.MethodPut,
			path:   "/api/v1/governance/policies/" + uuid.New().String(),
			want:   "update:policies",
		},
		{
			name:   "DELETE specific resource",
			method: http.MethodDelete,
			path:   "/api/v1/projects/" + uuid.New().String(),
			want:   "delete:projects",
		},
		{
			name:   "PATCH specific resource",
			method: http.MethodPatch,
			path:   "/api/v1/users/" + uuid.New().String(),
			want:   "update:users",
		},
		{
			name:   "POST nested resource",
			method: http.MethodPost,
			path:   "/api/v1/projects/" + uuid.New().String() + "/tasks",
			want:   "create:tasks",
		},
		{
			name:   "single segment path",
			method: http.MethodPost,
			path:   "/items",
			want:   "create:items",
		},
		{
			name:   "root path",
			method: http.MethodPost,
			path:   "/",
			want:   "create:",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildAction(tt.method, tt.path)
			if got != tt.want {
				t.Errorf("buildAction(%q, %q) = %q, want %q", tt.method, tt.path, got, tt.want)
			}
		})
	}
}

// ──────────────────────────────────────────────
// extractEntityInfo
// ──────────────────────────────────────────────

func TestExtractEntityInfo(t *testing.T) {
	id := uuid.MustParse("cccccccc-cccc-cccc-cccc-cccccccccccc")

	tests := []struct {
		name       string
		path       string
		wantType   string
		wantID     uuid.UUID
	}{
		{
			name:     "resource with UUID",
			path:     "/api/v1/governance/policies/" + id.String(),
			wantType: "policies",
			wantID:   id,
		},
		{
			name:     "nested resource with UUID",
			path:     "/api/v1/projects/" + id.String() + "/tasks",
			wantType: "projects",
			wantID:   id,
		},
		{
			name:     "no UUID in path",
			path:     "/api/v1/governance/policies",
			wantType: "policies",
			wantID:   uuid.Nil,
		},
		{
			name:     "root path only",
			path:     "/",
			wantType: "",
			wantID:   uuid.Nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tt.path, nil)
			gotType, gotID := extractEntityInfo(req)

			if gotType != tt.wantType {
				t.Errorf("entityType = %q, want %q", gotType, tt.wantType)
			}
			if gotID != tt.wantID {
				t.Errorf("entityID = %s, want %s", gotID, tt.wantID)
			}
		})
	}
}

// ──────────────────────────────────────────────
// clientIP
// ──────────────────────────────────────────────

func TestClientIP(t *testing.T) {
	tests := []struct {
		name     string
		xff      string
		xrip     string
		remote   string
		wantIP   string
	}{
		{
			name:   "X-Forwarded-For with single IP",
			xff:    "10.0.0.1",
			wantIP: "10.0.0.1",
		},
		{
			name:   "X-Forwarded-For with chain",
			xff:    "10.0.0.1, 10.0.0.2, 10.0.0.3",
			wantIP: "10.0.0.1",
		},
		{
			name:   "X-Real-IP",
			xrip:   "192.168.1.100",
			wantIP: "192.168.1.100",
		},
		{
			name:   "X-Forwarded-For takes precedence over X-Real-IP",
			xff:    "10.0.0.1",
			xrip:   "192.168.1.100",
			wantIP: "10.0.0.1",
		},
		{
			name:   "fallback to RemoteAddr with port",
			remote: "192.168.1.50:12345",
			wantIP: "192.168.1.50",
		},
		{
			name:   "fallback to RemoteAddr without port",
			remote: "192.168.1.50",
			wantIP: "192.168.1.50",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			// Clear default remote addr set by httptest.
			req.RemoteAddr = tt.remote
			if tt.xff != "" {
				req.Header.Set("X-Forwarded-For", tt.xff)
			}
			if tt.xrip != "" {
				req.Header.Set("X-Real-IP", tt.xrip)
			}

			got := clientIP(req)
			if got != tt.wantIP {
				t.Errorf("clientIP() = %q, want %q", got, tt.wantIP)
			}
		})
	}
}

// ──────────────────────────────────────────────
// AuditMiddleware — passthrough for non-mutating
// ──────────────────────────────────────────────

func TestAuditMiddleware_PassthroughGET(t *testing.T) {
	// The middleware should pass through non-mutating requests without
	// attempting to log anything (even with a nil service pool).
	mw := AuditMiddleware(NewAuditService(nil))

	called := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	handler := mw(inner)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if !called {
		t.Error("inner handler should have been called for GET")
	}
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestAuditMiddleware_PassthroughHEAD(t *testing.T) {
	mw := AuditMiddleware(NewAuditService(nil))

	called := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	handler := mw(inner)
	req := httptest.NewRequest(http.MethodHead, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if !called {
		t.Error("inner handler should have been called for HEAD")
	}
}

func TestAuditMiddleware_PassthroughOPTIONS(t *testing.T) {
	mw := AuditMiddleware(NewAuditService(nil))

	called := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	})

	handler := mw(inner)
	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if !called {
		t.Error("inner handler should have been called for OPTIONS")
	}
}

// ──────────────────────────────────────────────
// AuditMiddleware — mutating without auth skips logging
// ──────────────────────────────────────────────

func TestAuditMiddleware_MutatingNoAuth_NoError(t *testing.T) {
	// A POST without auth context should still serve the inner handler
	// and silently skip audit logging (no panic).
	mw := AuditMiddleware(NewAuditService(nil))

	called := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusCreated)
	})

	handler := mw(inner)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/items", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if !called {
		t.Error("inner handler should have been called even without auth")
	}
	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
}

// ──────────────────────────────────────────────
// AuditMiddleware — calls inner handler for mutating methods
// ──────────────────────────────────────────────

func TestAuditMiddleware_InnerHandlerCalledForMutating(t *testing.T) {
	methods := []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete}

	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			mw := AuditMiddleware(NewAuditService(nil))

			called := false
			inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				w.WriteHeader(http.StatusOK)
			})

			handler := mw(inner)
			req := httptest.NewRequest(method, "/api/v1/items", nil)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if !called {
				t.Errorf("inner handler should have been called for %s", method)
			}
		})
	}
}

// ──────────────────────────────────────────────
// AuditMiddleware — correlation ID propagation
// ──────────────────────────────────────────────

func TestAuditMiddleware_CorrelationIDRead(t *testing.T) {
	// The middleware should be able to read the correlation ID from context.
	// We test that the context helper works correctly within the middleware path.
	mw := AuditMiddleware(NewAuditService(nil))

	var capturedCorrID string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCorrID = types.GetCorrelationID(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	handler := mw(inner)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/items", nil)
	ctx := types.SetCorrelationID(req.Context(), "test-correlation-456")
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if capturedCorrID != "test-correlation-456" {
		t.Errorf("expected correlation ID 'test-correlation-456', got %q", capturedCorrID)
	}
}

// ──────────────────────────────────────────────
// extractEntityInfo — edge cases
// ──────────────────────────────────────────────

func TestExtractEntityInfo_MultipleUUIDs(t *testing.T) {
	// When multiple UUIDs exist in the path, extractEntityInfo walks
	// backwards and returns the last UUID found.
	parentID := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	childID := uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

	path := "/api/v1/projects/" + parentID.String() + "/tasks/" + childID.String()
	req := httptest.NewRequest(http.MethodDelete, path, nil)
	entityType, entityID := extractEntityInfo(req)

	// Should find the last UUID (childID) and its preceding segment ("tasks").
	if entityID != childID {
		t.Errorf("expected entityID = %s, got %s", childID, entityID)
	}
	if entityType != "tasks" {
		t.Errorf("expected entityType = 'tasks', got %q", entityType)
	}
}

func TestExtractEntityInfo_UUIDAtStart(t *testing.T) {
	// Edge case: UUID is the first segment.
	id := uuid.MustParse("cccccccc-cccc-cccc-cccc-cccccccccccc")
	req := httptest.NewRequest(http.MethodPost, "/"+id.String(), nil)
	entityType, entityID := extractEntityInfo(req)

	if entityID != id {
		t.Errorf("expected entityID = %s, got %s", id, entityID)
	}
	// No preceding segment, so entityType should be empty.
	if entityType != "" {
		t.Errorf("expected empty entityType, got %q", entityType)
	}
}

// ──────────────────────────────────────────────
// buildAction — edge cases
// ──────────────────────────────────────────────

func TestBuildAction_EmptyPath(t *testing.T) {
	got := buildAction(http.MethodPost, "")
	// Empty path => segments = [""] => resource = "" which is not UUID => resource = ""
	// Actually, strings.Split("", "/") returns [""], and uuid.Parse("") fails,
	// so resource = "".
	if got != "create:" {
		t.Errorf("buildAction(POST, \"\") = %q, want %q", got, "create:")
	}
}

func TestBuildAction_TrailingSlash(t *testing.T) {
	got := buildAction(http.MethodDelete, "/api/v1/items/")
	if got != "delete:items" {
		t.Errorf("buildAction(DELETE, /api/v1/items/) = %q, want %q", got, "delete:items")
	}
}

// Package testutil provides reusable test helpers for the ITD-OPMS API.
package testutil

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// NewTestContext returns a context pre-loaded with an AuthContext matching the
// middleware's context keys.
func NewTestContext(tenantID, userID string) context.Context {
	auth := &types.AuthContext{
		UserID:      uuid.MustParse(userID),
		TenantID:    uuid.MustParse(tenantID),
		Email:       fmt.Sprintf("user-%s@test.com", userID[:8]),
		DisplayName: "Test User",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	ctx := types.SetAuthContext(context.Background(), auth)
	ctx = types.SetCorrelationID(ctx, uuid.New().String())
	return ctx
}

// NewTestContextWithRoles returns a context with specific roles and permissions.
func NewTestContextWithRoles(tenantID, userID string, roles, permissions []string) context.Context {
	auth := &types.AuthContext{
		UserID:      uuid.MustParse(userID),
		TenantID:    uuid.MustParse(tenantID),
		Email:       fmt.Sprintf("user-%s@test.com", userID[:8]),
		DisplayName: "Test User",
		Roles:       roles,
		Permissions: permissions,
	}
	ctx := types.SetAuthContext(context.Background(), auth)
	ctx = types.SetCorrelationID(ctx, uuid.New().String())
	return ctx
}

// NewTestRequest creates an HTTP request with a JSON body and test context.
// If body is nil, no body is set.
func NewTestRequest(method, path string, body interface{}) *http.Request {
	var req *http.Request
	if body != nil {
		b, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	tenantID := RandomUUID()
	userID := RandomUUID()
	req = req.WithContext(NewTestContext(tenantID, userID))
	return req
}

// NewTestRequestWithContext creates an HTTP request with the given context.
func NewTestRequestWithContext(ctx context.Context, method, path string, body interface{}) *http.Request {
	var req *http.Request
	if body != nil {
		b, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	return req.WithContext(ctx)
}

// NewTestResponseRecorder creates a new httptest.ResponseRecorder.
func NewTestResponseRecorder() *httptest.ResponseRecorder {
	return httptest.NewRecorder()
}

// AssertJSON asserts the status code and unmarshals the response body into target.
func AssertJSON(t *testing.T, rec *httptest.ResponseRecorder, expectedStatus int, target interface{}) {
	t.Helper()
	if rec.Code != expectedStatus {
		t.Errorf("expected status %d, got %d (body: %s)", expectedStatus, rec.Code, rec.Body.String())
	}
	if target != nil {
		if err := json.NewDecoder(rec.Body).Decode(target); err != nil {
			t.Fatalf("failed to decode response body: %v", err)
		}
	}
}

// AssertErrorResponse asserts that the response is an error with the given status and message.
func AssertErrorResponse(t *testing.T, rec *httptest.ResponseRecorder, expectedStatus int, expectedMessage string) {
	t.Helper()
	if rec.Code != expectedStatus {
		t.Errorf("expected status %d, got %d", expectedStatus, rec.Code)
	}
	var resp types.Response
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != "error" {
		t.Errorf("expected status 'error', got %q", resp.Status)
	}
	if expectedMessage != "" && len(resp.Errors) > 0 {
		found := false
		for _, e := range resp.Errors {
			if e.Message == expectedMessage {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected error message %q not found in errors: %+v", expectedMessage, resp.Errors)
		}
	}
}

// RandomUUID generates a random UUID string.
func RandomUUID() string {
	return uuid.New().String()
}

// RandomEmail generates a random email address.
func RandomEmail() string {
	return fmt.Sprintf("test-%s@example.com", uuid.New().String()[:8])
}

// RandomString generates a random alphanumeric string of length n.
func RandomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

package server_test

import (
	"testing"
)

// TestHealthEndpoint verifies the health check returns 200.
func TestHealthEndpoint(t *testing.T) {
	// Skip: requires running PostgreSQL, Redis, NATS, MinIO instances and a
	// fully wired Server. This test is scaffolding that documents the expected
	// behaviour; remove the skip once a test harness is in place.
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: implement with test containers or a mock server
	//
	// srv := setupTestServer(t)
	// ts := httptest.NewServer(srv.router) // router is unexported; consider adding a Router() accessor
	// defer ts.Close()
	//
	// resp, err := http.Get(ts.URL + "/api/v1/health")
	// if err != nil {
	//     t.Fatalf("failed to GET /api/v1/health: %v", err)
	// }
	// defer resp.Body.Close()
	//
	// if resp.StatusCode != http.StatusOK {
	//     t.Errorf("expected 200, got %d", resp.StatusCode)
	// }
	//
	// var body map[string]any
	// if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
	//     t.Fatalf("failed to decode response: %v", err)
	// }
	//
	// if body["status"] != "healthy" {
	//     t.Errorf("expected status healthy, got %v", body["status"])
	// }
}

// TestPublicRoutesNoAuth verifies public routes don't require authentication.
// Expected public routes: GET /api/v1/health, POST /api/v1/auth/login,
// POST /api/v1/auth/refresh, GET /api/v1/auth/oidc/config.
func TestPublicRoutesNoAuth(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: implement — send requests without Authorization header and expect
	// non-401 responses for public routes.
}

// TestProtectedRoutesRequireAuth verifies protected routes return 401 without auth.
// Pick any protected endpoint, e.g. GET /api/v1/audit/events.
func TestProtectedRoutesRequireAuth(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: implement — send requests without Authorization header to protected
	// routes and expect HTTP 401 with {"status":"error","errors":[...]}.
}

// TestGovernanceRoutesMounted verifies governance module routes are registered.
func TestGovernanceRoutesMounted(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: verify GET /api/v1/governance/policies returns 401 (not 404),
	// confirming the route is registered.
}

// TestPlanningRoutesMounted verifies planning module routes are registered.
func TestPlanningRoutesMounted(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: verify GET /api/v1/planning/portfolios returns 401 (not 404).
}

// TestITSMRoutesMounted verifies ITSM module routes are registered.
func TestITSMRoutesMounted(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: verify GET /api/v1/itsm/tickets returns 401 (not 404).
}

// TestCMDBRoutesMounted verifies CMDB module routes are registered.
func TestCMDBRoutesMounted(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: verify GET /api/v1/cmdb/assets returns 401 (not 404).
}

// TestPeopleRoutesMounted verifies People module routes are registered.
func TestPeopleRoutesMounted(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: verify GET /api/v1/people/skills returns 401 (not 404).
}

// TestKnowledgeRoutesMounted verifies Knowledge module routes are registered.
func TestKnowledgeRoutesMounted(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: verify GET /api/v1/knowledge/categories returns 401 (not 404).
}

// TestGRCRoutesMounted verifies GRC module routes are registered.
func TestGRCRoutesMounted(t *testing.T) {
	t.Skip("requires running infrastructure (PostgreSQL, Redis, NATS, MinIO)")

	// TODO: verify GET /api/v1/grc/risks returns 401 (not 404).
}

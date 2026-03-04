import { http, HttpResponse } from "msw";

const API_BASE_URL = "http://localhost:8089/api/v1";

/**
 * Default MSW request handlers for common API endpoints.
 * These provide sensible defaults for tests; individual tests can
 * override them via `server.use(...)`.
 */
export const handlers = [
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  http.get(`${API_BASE_URL}/auth/me`, () => {
    return HttpResponse.json({
      status: "success",
      data: {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        roles: ["admin"],
        permissions: ["read", "write"],
        tenantId: "tenant-1",
        department: "IT",
        jobTitle: "Developer",
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    return HttpResponse.json({
      status: "success",
      data: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: "user-1",
          email: body.email,
          displayName: "Test User",
          roles: ["admin"],
          permissions: ["read", "write"],
          tenantId: "tenant-1",
        },
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ status: "success" });
  }),

  // -------------------------------------------------------------------------
  // OIDC config (disabled by default in tests)
  // -------------------------------------------------------------------------
  http.get(`${API_BASE_URL}/auth/oidc/config`, () => {
    return HttpResponse.json(
      { message: "OIDC not configured" },
      { status: 404 },
    );
  }),
];

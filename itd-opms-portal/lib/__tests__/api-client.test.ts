import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import { apiClient, ApiError } from "../api-client";

const API_BASE = "http://localhost:8089/api/v1";

// =============================================================================
// Helper: clear localStorage items used by the API client
// =============================================================================
function clearAuthStorage() {
  localStorage.removeItem("opms-token");
  localStorage.removeItem("opms-refresh-token");
  localStorage.removeItem("opms-auth-mode");
}

// =============================================================================
// Setup / Teardown
// =============================================================================
beforeEach(() => {
  clearAuthStorage();
  // Default to dev mode for most tests
  localStorage.setItem("opms-auth-mode", "dev");
});

afterEach(() => {
  clearAuthStorage();
});

// =============================================================================
// ApiError
// =============================================================================
describe("ApiError", () => {
  it("creates an error with status, message, and data", () => {
    const err = new ApiError(404, "Not found", { detail: "missing" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.data).toEqual({ detail: "missing" });
  });

  it("defaults data to undefined when not provided", () => {
    const err = new ApiError(500, "Server error");
    expect(err.data).toBeUndefined();
  });
});

// =============================================================================
// GET requests
// =============================================================================
describe("apiClient.get", () => {
  it("sends a GET request and returns unwrapped data", async () => {
    server.use(
      http.get(`${API_BASE}/test-endpoint`, () => {
        return HttpResponse.json({
          status: "success",
          data: { id: 1, name: "Test" },
        });
      }),
    );

    const result = await apiClient.get<{ id: number; name: string }>(
      "/test-endpoint",
    );
    expect(result).toEqual({ id: 1, name: "Test" });
  });

  it("appends query parameters to the URL", async () => {
    server.use(
      http.get(`${API_BASE}/items`, ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get("page");
        const limit = url.searchParams.get("limit");
        return HttpResponse.json({
          status: "success",
          data: { page, limit },
        });
      }),
    );

    const result = await apiClient.get<{ page: string; limit: string }>(
      "/items",
      { page: 2, limit: 10 },
    );
    expect(result).toEqual({ page: "2", limit: "10" });
  });

  it("omits undefined and empty string query parameters", async () => {
    server.use(
      http.get(`${API_BASE}/items`, ({ request }) => {
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams.entries());
        return HttpResponse.json({
          status: "success",
          data: params,
        });
      }),
    );

    const result = await apiClient.get<Record<string, string>>("/items", {
      status: "active",
      filter: undefined,
      search: "",
    });
    // Only "status" should be present
    expect(result).toEqual({ status: "active" });
  });

  it("returns paginated data with normalized meta", async () => {
    server.use(
      http.get(`${API_BASE}/paginated`, () => {
        return HttpResponse.json({
          status: "success",
          data: [{ id: 1 }, { id: 2 }],
          meta: { page: 1, limit: 10, total: 50, totalPages: 5 },
        });
      }),
    );

    const result = await apiClient.get<{
      data: Array<{ id: number }>;
      meta: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
      };
    }>("/paginated");

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 50,
      totalPages: 5,
    });
  });
});

// =============================================================================
// POST requests
// =============================================================================
describe("apiClient.post", () => {
  it("sends a POST request with JSON body", async () => {
    server.use(
      http.post(`${API_BASE}/items`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({
          status: "success",
          data: { id: 99, name: body.name },
        });
      }),
    );

    const result = await apiClient.post<{ id: number; name: string }>(
      "/items",
      { name: "New Item" },
    );
    expect(result).toEqual({ id: 99, name: "New Item" });
  });

  it("sends a POST request without body", async () => {
    server.use(
      http.post(`${API_BASE}/trigger`, () => {
        return HttpResponse.json({
          status: "success",
          data: { triggered: true },
        });
      }),
    );

    const result = await apiClient.post<{ triggered: boolean }>("/trigger");
    expect(result).toEqual({ triggered: true });
  });
});

// =============================================================================
// PUT requests
// =============================================================================
describe("apiClient.put", () => {
  it("sends a PUT request with JSON body", async () => {
    server.use(
      http.put(`${API_BASE}/items/1`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({
          status: "success",
          data: { id: 1, name: body.name },
        });
      }),
    );

    const result = await apiClient.put<{ id: number; name: string }>(
      "/items/1",
      { name: "Updated" },
    );
    expect(result).toEqual({ id: 1, name: "Updated" });
  });
});

// =============================================================================
// PATCH requests
// =============================================================================
describe("apiClient.patch", () => {
  it("sends a PATCH request with JSON body", async () => {
    server.use(
      http.patch(`${API_BASE}/items/1`, async ({ request }) => {
        const body = (await request.json()) as { status: string };
        return HttpResponse.json({
          status: "success",
          data: { id: 1, status: body.status },
        });
      }),
    );

    const result = await apiClient.patch<{ id: number; status: string }>(
      "/items/1",
      { status: "done" },
    );
    expect(result).toEqual({ id: 1, status: "done" });
  });
});

// =============================================================================
// DELETE requests
// =============================================================================
describe("apiClient.delete", () => {
  it("sends a DELETE request", async () => {
    server.use(
      http.delete(`${API_BASE}/items/1`, () => {
        return HttpResponse.json({
          status: "success",
          data: { deleted: true },
        });
      }),
    );

    const result = await apiClient.delete<{ deleted: boolean }>("/items/1");
    expect(result).toEqual({ deleted: true });
  });

  it("handles 204 No Content responses", async () => {
    server.use(
      http.delete(`${API_BASE}/items/2`, () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await apiClient.delete<void>("/items/2");
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Auth token handling
// =============================================================================
describe("authentication header", () => {
  it("attaches Bearer token from localStorage in dev mode", async () => {
    localStorage.setItem("opms-token", "test-jwt-token");
    localStorage.setItem("opms-auth-mode", "dev");

    server.use(
      http.get(`${API_BASE}/secure`, ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        return HttpResponse.json({
          status: "success",
          data: { authHeader },
        });
      }),
    );

    const result = await apiClient.get<{ authHeader: string }>("/secure");
    expect(result.authHeader).toBe("Bearer test-jwt-token");
  });

  it("does not attach Authorization header in OIDC mode", async () => {
    localStorage.setItem("opms-token", "should-not-be-sent");
    localStorage.setItem("opms-auth-mode", "oidc");

    server.use(
      http.get(`${API_BASE}/secure`, ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        return HttpResponse.json({
          status: "success",
          data: { authHeader },
        });
      }),
    );

    const result = await apiClient.get<{ authHeader: string | null }>(
      "/secure",
    );
    expect(result.authHeader).toBeNull();
  });

  it("does not attach Authorization header when no token is present", async () => {
    localStorage.removeItem("opms-token");
    localStorage.setItem("opms-auth-mode", "dev");

    server.use(
      http.get(`${API_BASE}/secure`, ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        return HttpResponse.json({
          status: "success",
          data: { authHeader },
        });
      }),
    );

    const result = await apiClient.get<{ authHeader: string | null }>(
      "/secure",
    );
    expect(result.authHeader).toBeNull();
  });
});

// =============================================================================
// Error handling
// =============================================================================
describe("error handling", () => {
  it("throws ApiError on non-OK responses", async () => {
    server.use(
      http.get(`${API_BASE}/bad`, () => {
        return HttpResponse.json(
          { message: "Bad request" },
          { status: 400 },
        );
      }),
    );

    await expect(apiClient.get("/bad")).rejects.toThrow(ApiError);
    try {
      await apiClient.get("/bad");
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(400);
      expect(err.message).toBe("Bad request");
    }
  });

  it("uses default error message when response body has no message", async () => {
    server.use(
      http.get(`${API_BASE}/error-no-msg`, () => {
        return HttpResponse.json({}, { status: 500 });
      }),
    );

    try {
      await apiClient.get("/error-no-msg");
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(500);
      expect(err.message).toBe("An error occurred");
    }
  });

  it("handles 401 by clearing auth data and redirecting", async () => {
    localStorage.setItem("opms-token", "expired-token");
    localStorage.setItem("opms-auth-mode", "dev");

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });

    server.use(
      http.get(`${API_BASE}/unauthorized`, () => {
        return HttpResponse.json(
          { message: "Unauthorized" },
          { status: 401 },
        );
      }),
    );

    await expect(apiClient.get("/unauthorized")).rejects.toThrow(ApiError);

    // Verify cleanup occurred
    expect(localStorage.getItem("opms-token")).toBeNull();
    expect(localStorage.getItem("opms-auth-mode")).toBeNull();
    expect(window.location.href).toBe("/auth/login");

    // Restore
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("handles non-JSON error responses gracefully", async () => {
    server.use(
      http.get(`${API_BASE}/html-error`, () => {
        return new HttpResponse("Internal Server Error", {
          status: 500,
          headers: { "Content-Type": "text/html" },
        });
      }),
    );

    try {
      await apiClient.get("/html-error");
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(500);
      expect(err.message).toBe("An error occurred");
    }
  });
});

// =============================================================================
// Response unwrapping
// =============================================================================
describe("response unwrapping", () => {
  it("unwraps { status, data } envelope", async () => {
    server.use(
      http.get(`${API_BASE}/wrapped`, () => {
        return HttpResponse.json({
          status: "success",
          data: { key: "value" },
        });
      }),
    );

    const result = await apiClient.get<{ key: string }>("/wrapped");
    expect(result).toEqual({ key: "value" });
  });

  it("handles double-wrapped data { data: { data: X } }", async () => {
    server.use(
      http.get(`${API_BASE}/double-wrapped`, () => {
        return HttpResponse.json({
          status: "success",
          data: { data: { inner: "value" } },
        });
      }),
    );

    const result = await apiClient.get<{ inner: string }>("/double-wrapped");
    expect(result).toEqual({ inner: "value" });
  });

  it("returns raw response when no envelope exists", async () => {
    server.use(
      http.get(`${API_BASE}/raw`, () => {
        return HttpResponse.json({ key: "value" });
      }),
    );

    const result = await apiClient.get<{ key: string }>("/raw");
    expect(result).toEqual({ key: "value" });
  });
});

// =============================================================================
// Upload
// =============================================================================
describe("apiClient.upload", () => {
  it("sends a POST request with FormData", async () => {
    localStorage.setItem("opms-token", "upload-token");
    localStorage.setItem("opms-auth-mode", "dev");

    server.use(
      http.post(`${API_BASE}/upload`, ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        return HttpResponse.json({
          status: "success",
          data: { uploaded: true, authHeader },
        });
      }),
    );

    const formData = new FormData();
    formData.append("file", new Blob(["test content"]), "test.txt");

    const result = await apiClient.upload<{
      uploaded: boolean;
      authHeader: string;
    }>("/upload", formData);
    expect(result.uploaded).toBe(true);
    expect(result.authHeader).toBe("Bearer upload-token");
  });

  it("does not send Authorization header in OIDC mode", async () => {
    localStorage.setItem("opms-auth-mode", "oidc");

    server.use(
      http.post(`${API_BASE}/upload`, ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        return HttpResponse.json({
          status: "success",
          data: { authHeader },
        });
      }),
    );

    const formData = new FormData();
    formData.append("file", new Blob(["test"]), "f.txt");

    const result = await apiClient.upload<{ authHeader: string | null }>(
      "/upload",
      formData,
    );
    expect(result.authHeader).toBeNull();
  });

  it("throws ApiError on upload failure", async () => {
    server.use(
      http.post(`${API_BASE}/upload-fail`, () => {
        return HttpResponse.json(
          { message: "File too large" },
          { status: 413 },
        );
      }),
    );

    const formData = new FormData();
    formData.append("file", new Blob(["big"]), "big.bin");

    await expect(
      apiClient.upload("/upload-fail", formData),
    ).rejects.toThrow(ApiError);
  });
});

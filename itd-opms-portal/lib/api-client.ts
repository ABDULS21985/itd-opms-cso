/* =============================================================================
   API Client — ITD-OPMS Portal

   Dual authentication mode support:

   1. OIDC / Cookie mode (production with Microsoft Entra ID):
      - httpOnly cookies are sent automatically via `credentials: "include"`
      - No explicit Authorization header needed
      - Detected by checking for 'opms-auth-mode' === 'oidc' in localStorage

   2. Dev-mode JWT (localStorage token):
      - Bearer token read from localStorage ('opms-token')
      - Sent as Authorization header on every request
      - Used when Entra ID OIDC is not configured

   The client auto-detects which mode is active and handles both transparently.
   ============================================================================= */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Detect the current authentication mode.
 * Returns "oidc" if using httpOnly cookie auth, "dev" if using localStorage JWT.
 */
function getAuthMode(): "oidc" | "dev" | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("opms-auth-mode") as "oidc" | "dev" | null;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the JWT token from localStorage (dev-mode only).
   * In OIDC mode, returns null — cookies are sent automatically.
   */
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("opms-token");
  }

  /**
   * Check if we're using cookie-based auth (OIDC mode).
   * When true, no explicit Authorization header is needed.
   */
  private isUsingCookieAuth(): boolean {
    return getAuthMode() === "oidc";
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(path, params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // In dev mode, attach the Bearer token from localStorage.
    // In OIDC mode, the httpOnly cookie is sent automatically via credentials.
    if (!this.isUsingCookieAuth()) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: "include", // Always include cookies for OIDC mode
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      // Redirect to login on 401 Unauthorized
      if (response.status === 401 && typeof window !== "undefined") {
        // Clean up both auth modes
        localStorage.removeItem("opms-token");
        localStorage.removeItem("opms-auth-mode");
        // Clear the auth flag cookie
        document.cookie =
          "opms-authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        window.location.href = "/auth/login";
      }

      // Extract message from { status, errors: [{ code, message }] } envelope.
      const errorMessage =
        error?.errors?.[0]?.message ||
        error?.message ||
        "An error occurred";
      throw new ApiError(response.status, errorMessage, error);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();
    // Unwrap { status, data, meta } envelope from response interceptor
    let result = data.data !== undefined ? data.data : data;
    // Handle double-wrapping: controllers return { data: X } and interceptor
    // wraps again. If result is { data: X } with no other keys, unwrap it.
    if (result && typeof result === "object" && !Array.isArray(result)) {
      const keys = Object.keys(result);
      if (keys.length === 1 && keys[0] === "data") {
        result = result.data;
      }
    }
    // Preserve pagination meta from the response envelope.
    // The Go backend sends meta as { page, limit, total, totalPages }.
    // Normalize to the frontend convention { page, pageSize, totalItems, totalPages }.
    if (data.meta) {
      return {
        data: result,
        meta: {
          page: data.meta.page,
          pageSize: data.meta.limit ?? data.meta.pageSize,
          totalItems: data.meta.total ?? data.meta.totalItems,
          totalPages: data.meta.totalPages,
        },
      } as T;
    }
    return result;
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>(path, { method: "GET", params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};

    // Only attach Bearer token in dev mode; OIDC uses cookies
    if (!this.isUsingCookieAuth()) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include", // Always include cookies for OIDC mode
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      if (response.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("opms-token");
        localStorage.removeItem("opms-auth-mode");
        document.cookie =
          "opms-authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        window.location.href = "/auth/login";
      }

      const errorMessage =
        error?.errors?.[0]?.message ||
        error?.message ||
        "Upload failed";
      throw new ApiError(response.status, errorMessage, error);
    }

    const data = await response.json();
    let result = data.data !== undefined ? data.data : data;
    if (result && typeof result === "object" && !Array.isArray(result)) {
      const keys = Object.keys(result);
      if (keys.length === 1 && keys[0] === "data") {
        result = result.data;
      }
    }
    if (data.meta) {
      return {
        data: result,
        meta: {
          page: data.meta.page,
          pageSize: data.meta.limit ?? data.meta.pageSize,
          totalItems: data.meta.total ?? data.meta.totalItems,
          totalPages: data.meta.totalPages,
        },
      } as T;
    }
    return result;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

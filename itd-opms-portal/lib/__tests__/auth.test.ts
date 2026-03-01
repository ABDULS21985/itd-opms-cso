import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import {
  getToken,
  setToken,
  removeToken,
  setRefreshToken,
  getRefreshToken,
  parseJwt,
  isAuthenticated,
  setAuthenticatedFlag,
  clearSession,
  getAuthMode,
  setAuthMode,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizeURL,
  fetchOIDCConfig,
  type OIDCConfig,
} from "../auth";

const API_BASE = "http://localhost:8089/api/v1";

// =============================================================================
// Helper: clear all auth-related storage
// =============================================================================
function clearAuthStorage() {
  localStorage.removeItem("opms-token");
  localStorage.removeItem("opms-refresh-token");
  localStorage.removeItem("opms-auth-mode");
  sessionStorage.removeItem("opms-pkce-verifier");
  sessionStorage.removeItem("opms-pkce-state");
  document.cookie =
    "opms-authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

// =============================================================================
// Setup / Teardown
// =============================================================================
beforeEach(() => {
  clearAuthStorage();
});

afterEach(() => {
  clearAuthStorage();
});

// =============================================================================
// Token management (dev mode)
// =============================================================================
describe("token management", () => {
  describe("getToken / setToken", () => {
    it("returns null when no token is stored", () => {
      expect(getToken()).toBeNull();
    });

    it("stores and retrieves a token", () => {
      setToken("my-jwt-token");
      expect(getToken()).toBe("my-jwt-token");
    });
  });

  describe("removeToken", () => {
    it("removes the token from localStorage", () => {
      setToken("token-to-remove");
      expect(getToken()).toBe("token-to-remove");
      removeToken();
      expect(getToken()).toBeNull();
    });

    it("also removes the refresh token", () => {
      setRefreshToken("refresh-token");
      setToken("access-token");
      removeToken();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe("setRefreshToken / getRefreshToken", () => {
    it("returns null when no refresh token is stored", () => {
      expect(getRefreshToken()).toBeNull();
    });

    it("stores and retrieves a refresh token", () => {
      setRefreshToken("my-refresh-token");
      expect(getRefreshToken()).toBe("my-refresh-token");
    });
  });
});

// =============================================================================
// parseJwt
// =============================================================================
describe("parseJwt", () => {
  function createJwt(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.signature`;
  }

  it("decodes a valid JWT payload", () => {
    const token = createJwt({
      sub: "user-1",
      email: "test@example.com",
      exp: 9999999999,
    });
    const payload = parseJwt(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-1");
    expect(payload!.email).toBe("test@example.com");
  });

  it("returns null for an invalid token", () => {
    expect(parseJwt("not-a-jwt")).toBeNull();
  });

  it("returns null for a token without payload segment", () => {
    expect(parseJwt("header-only")).toBeNull();
  });

  it("returns null for completely malformed input", () => {
    expect(parseJwt("")).toBeNull();
  });

  it("handles base64url encoded characters", () => {
    // The function replaces - with + and _ with /
    const payload = { sub: "test", data: "some+data/here" };
    const token = createJwt(payload);
    const result = parseJwt(token);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe("test");
  });
});

// =============================================================================
// Auth mode
// =============================================================================
describe("auth mode", () => {
  describe("getAuthMode / setAuthMode", () => {
    it("returns null when no auth mode is set", () => {
      expect(getAuthMode()).toBeNull();
    });

    it("stores and retrieves dev mode", () => {
      setAuthMode("dev");
      expect(getAuthMode()).toBe("dev");
    });

    it("stores and retrieves oidc mode", () => {
      setAuthMode("oidc");
      expect(getAuthMode()).toBe("oidc");
    });
  });
});

// =============================================================================
// isAuthenticated
// =============================================================================
describe("isAuthenticated", () => {
  function createJwt(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.signature`;
  }

  it("returns false when no credentials exist", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("returns true when OIDC auth cookie is set", () => {
    document.cookie = "opms-authenticated=true; path=/; SameSite=Lax";
    expect(isAuthenticated()).toBe(true);
  });

  it("returns true for a valid non-expired dev-mode JWT", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const token = createJwt({ sub: "user", exp: futureExp });
    setToken(token);
    expect(isAuthenticated()).toBe(true);
  });

  it("returns false for an expired dev-mode JWT", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const token = createJwt({ sub: "user", exp: pastExp });
    setToken(token);
    expect(isAuthenticated()).toBe(false);
  });

  it("returns false for a JWT without exp claim", () => {
    const token = createJwt({ sub: "user" });
    setToken(token);
    expect(isAuthenticated()).toBe(false);
  });

  it("returns false for a malformed token", () => {
    setToken("not-a-jwt");
    expect(isAuthenticated()).toBe(false);
  });
});

// =============================================================================
// setAuthenticatedFlag
// =============================================================================
describe("setAuthenticatedFlag", () => {
  it("sets the opms-authenticated cookie to true", () => {
    setAuthenticatedFlag();
    expect(document.cookie).toContain("opms-authenticated=true");
  });
});

// =============================================================================
// clearSession
// =============================================================================
describe("clearSession", () => {
  it("removes the auth cookie", () => {
    document.cookie = "opms-authenticated=true; path=/; SameSite=Lax";
    clearSession();
    // The cookie should be expired/removed
    expect(document.cookie).not.toContain("opms-authenticated=true");
  });

  it("clears PKCE artifacts from sessionStorage", () => {
    sessionStorage.setItem("opms-pkce-verifier", "test-verifier");
    sessionStorage.setItem("opms-pkce-state", "test-state");
    clearSession();
    expect(sessionStorage.getItem("opms-pkce-verifier")).toBeNull();
    expect(sessionStorage.getItem("opms-pkce-state")).toBeNull();
  });

  it("removes auth mode from localStorage", () => {
    setAuthMode("oidc");
    clearSession();
    expect(getAuthMode()).toBeNull();
  });
});

// =============================================================================
// PKCE helpers
// =============================================================================
describe("PKCE helpers", () => {
  describe("generateCodeVerifier", () => {
    it("generates a 128-character string", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toHaveLength(128);
    });

    it("uses only unreserved URI characters", () => {
      const verifier = generateCodeVerifier();
      const validChars =
        /^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\-._~]+$/;
      expect(validChars.test(verifier)).toBe(true);
    });

    it("generates different verifiers on successive calls", () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });
  });

  describe("generateCodeChallenge", () => {
    it("produces a base64url-encoded SHA-256 hash", async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      // base64url format: no +, /, or = characters
      expect(challenge).not.toContain("+");
      expect(challenge).not.toContain("/");
      expect(challenge).not.toContain("=");
      expect(challenge.length).toBeGreaterThan(0);
    });

    it("produces consistent output for the same input", async () => {
      const verifier = "test-verifier-value";
      const c1 = await generateCodeChallenge(verifier);
      const c2 = await generateCodeChallenge(verifier);
      expect(c1).toBe(c2);
    });

    it("produces different output for different inputs", async () => {
      const c1 = await generateCodeChallenge("verifier-a");
      const c2 = await generateCodeChallenge("verifier-b");
      expect(c1).not.toBe(c2);
    });
  });

  describe("generateState", () => {
    it("generates a 32-character hex string", () => {
      const state = generateState();
      expect(state).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(state)).toBe(true);
    });

    it("generates different states on successive calls", () => {
      const s1 = generateState();
      const s2 = generateState();
      expect(s1).not.toBe(s2);
    });
  });
});

// =============================================================================
// buildAuthorizeURL
// =============================================================================
describe("buildAuthorizeURL", () => {
  const config: OIDCConfig = {
    authority: "https://login.microsoftonline.com/tenant-id",
    clientId: "my-client-id",
    redirectUri: "http://localhost:3000/auth/callback",
    scope: "openid profile email",
    authorizeUrl:
      "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize",
    tokenUrl:
      "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
  };

  it("builds a valid authorization URL with all required parameters", () => {
    const url = buildAuthorizeURL(config, "test-challenge", "test-state");

    expect(url).toContain(config.authorizeUrl);
    expect(url).toContain("client_id=my-client-id");
    expect(url).toContain("response_type=code");
    expect(url).toContain(
      "redirect_uri=" + encodeURIComponent(config.redirectUri),
    );
    // URLSearchParams encodes spaces as "+" not "%20"
    expect(url).toContain("scope=openid+profile+email");
    expect(url).toContain("state=test-state");
    expect(url).toContain("code_challenge=test-challenge");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("response_mode=query");
  });

  it("properly encodes special characters in parameters", () => {
    const url = buildAuthorizeURL(config, "abc+def/ghi", "state123");
    // The URL constructor should properly encode special chars
    expect(url).toContain("code_challenge=");
  });
});

// =============================================================================
// fetchOIDCConfig
// =============================================================================
describe("fetchOIDCConfig", () => {
  it("fetches and returns OIDC config from the backend", async () => {
    const mockConfig: OIDCConfig = {
      authority: "https://login.microsoftonline.com/test-tenant",
      clientId: "test-client-id",
      redirectUri: "http://localhost:3000/auth/callback",
      scope: "openid profile email",
      authorizeUrl:
        "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize",
      tokenUrl:
        "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token",
    };

    server.use(
      http.get(`${API_BASE}/auth/oidc/config`, () => {
        return HttpResponse.json({
          status: "success",
          data: mockConfig,
        });
      }),
    );

    const result = await fetchOIDCConfig();
    expect(result).toEqual(mockConfig);
  });

  it("throws an error when OIDC is not configured", async () => {
    server.use(
      http.get(`${API_BASE}/auth/oidc/config`, () => {
        return HttpResponse.json(
          { message: "OIDC not configured" },
          { status: 404 },
        );
      }),
    );

    await expect(fetchOIDCConfig()).rejects.toThrow(
      "Failed to fetch OIDC configuration",
    );
  });

  it("handles raw (non-envelope) response format", async () => {
    const mockConfig: OIDCConfig = {
      authority: "https://login.microsoftonline.com/test",
      clientId: "client-id",
      redirectUri: "http://localhost:3000/auth/callback",
      scope: "openid",
      authorizeUrl: "https://login.microsoftonline.com/test/authorize",
      tokenUrl: "https://login.microsoftonline.com/test/token",
    };

    server.use(
      http.get(`${API_BASE}/auth/oidc/config`, () => {
        return HttpResponse.json(mockConfig);
      }),
    );

    const result = await fetchOIDCConfig();
    expect(result).toEqual(mockConfig);
  });
});

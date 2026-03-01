import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import React from "react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";

// =============================================================================
// Mock dependencies
// =============================================================================

// Mock lib/auth — provide controllable implementations
const mockIsAuthenticated = vi.fn().mockReturnValue(false);
const mockGetToken = vi.fn().mockReturnValue(null);
const mockSetToken = vi.fn();
const mockRemoveToken = vi.fn();
const mockSetRefreshToken = vi.fn();
const mockClearSession = vi.fn();
const mockSetAuthenticatedFlag = vi.fn();
const mockFetchOIDCConfig = vi.fn().mockRejectedValue(new Error("OIDC not configured"));
const mockGenerateCodeVerifier = vi.fn().mockReturnValue("mock-verifier");
const mockGenerateCodeChallenge = vi.fn().mockResolvedValue("mock-challenge");
const mockGenerateState = vi.fn().mockReturnValue("mock-state");
const mockBuildAuthorizeURL = vi.fn().mockReturnValue("https://login.example.com/authorize");
const mockGetAuthMode = vi.fn().mockReturnValue("dev");
const mockSetAuthMode = vi.fn();

vi.mock("@/lib/auth", () => ({
  isAuthenticated: (...args: unknown[]) => mockIsAuthenticated(...args),
  getToken: (...args: unknown[]) => mockGetToken(...args),
  setToken: (...args: unknown[]) => mockSetToken(...args),
  removeToken: (...args: unknown[]) => mockRemoveToken(...args),
  setRefreshToken: (...args: unknown[]) => mockSetRefreshToken(...args),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
  setAuthenticatedFlag: (...args: unknown[]) => mockSetAuthenticatedFlag(...args),
  fetchOIDCConfig: (...args: unknown[]) => mockFetchOIDCConfig(...args),
  generateCodeVerifier: (...args: unknown[]) => mockGenerateCodeVerifier(...args),
  generateCodeChallenge: (...args: unknown[]) => mockGenerateCodeChallenge(...args),
  generateState: (...args: unknown[]) => mockGenerateState(...args),
  buildAuthorizeURL: (...args: unknown[]) => mockBuildAuthorizeURL(...args),
  getAuthMode: (...args: unknown[]) => mockGetAuthMode(...args),
  setAuthMode: (...args: unknown[]) => mockSetAuthMode(...args),
}));

// Mock lib/api-client
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

// Import after mocks are set up
import { AuthProvider, useAuth } from "../auth-provider";

// =============================================================================
// Test data
// =============================================================================
const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  roles: ["admin"],
  permissions: ["read", "write"],
  tenantId: "tenant-1",
  department: "IT",
  jobTitle: "Developer",
};

const mockLoginResponse = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  user: mockUser,
};

// =============================================================================
// Setup / Teardown
// =============================================================================
beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated.mockReturnValue(false);
  mockGetToken.mockReturnValue(null);
  mockGetAuthMode.mockReturnValue("dev");
  mockFetchOIDCConfig.mockRejectedValue(new Error("OIDC not configured"));
  mockApiGet.mockRejectedValue(new Error("Not authenticated"));
  mockApiPost.mockRejectedValue(new Error("Not called"));

  // Reset window.location
  Object.defineProperty(window, "location", {
    value: { href: "", origin: "http://localhost:3000" },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// AuthProvider rendering
// =============================================================================
describe("AuthProvider", () => {
  it("renders children", async () => {
    render(
      <AuthProvider>
        <div data-testid="child">Hello Auth</div>
      </AuthProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello Auth")).toBeInTheDocument();

    // Wait for async initialization to settle
    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  it("renders multiple children", async () => {
    render(
      <AuthProvider>
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </AuthProvider>,
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();

    // Wait for async initialization to settle
    await waitFor(() => {
      expect(screen.getByTestId("child-1")).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Loading state
// =============================================================================
describe("loading state", () => {
  it("starts in loading state during initialization", () => {
    // Make fetchOIDCConfig hang to keep loading state active
    mockFetchOIDCConfig.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("finishes loading after initialization when not authenticated", async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("finishes loading after initialization when authenticated", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

// =============================================================================
// Initial authentication check
// =============================================================================
describe("initial authentication check", () => {
  it("sets user when already authenticated", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoggedIn).toBe(true);
    });

    expect(mockApiGet).toHaveBeenCalledWith("/auth/me");
  });

  it("sets user to null when not authenticated", async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("clears session when /auth/me fails", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(mockRemoveToken).toHaveBeenCalled();
    expect(mockClearSession).toHaveBeenCalled();
  });
});

// =============================================================================
// OIDC / Entra ID availability
// =============================================================================
describe("Entra ID availability", () => {
  it("sets isEntraIDEnabled to true when OIDC config is available", async () => {
    mockFetchOIDCConfig.mockResolvedValue({
      authority: "https://login.example.com",
      clientId: "client-id",
      redirectUri: "http://localhost:3000/auth/callback",
      scope: "openid profile",
      authorizeUrl: "https://login.example.com/authorize",
      tokenUrl: "https://login.example.com/token",
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isEntraIDEnabled).toBe(true);
    });
  });

  it("sets isEntraIDEnabled to false when OIDC config fails", async () => {
    mockFetchOIDCConfig.mockRejectedValue(new Error("OIDC not configured"));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEntraIDEnabled).toBe(false);
  });
});

// =============================================================================
// Login (dev-mode)
// =============================================================================
describe("login", () => {
  it("calls apiClient.post with email and password", async () => {
    mockApiPost.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(mockApiPost).toHaveBeenCalledWith("/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
  });

  it("stores tokens and sets user on successful login", async () => {
    mockApiPost.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(mockSetToken).toHaveBeenCalledWith("mock-access-token");
    expect(mockSetRefreshToken).toHaveBeenCalledWith("mock-refresh-token");
    expect(mockSetAuthMode).toHaveBeenCalledWith("dev");
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoggedIn).toBe(true);
  });

  it("propagates login errors", async () => {
    mockApiPost.mockRejectedValue(new Error("Invalid credentials"));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.login("bad@example.com", "wrong");
      }),
    ).rejects.toThrow("Invalid credentials");

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
  });
});

// =============================================================================
// Logout
// =============================================================================
describe("logout", () => {
  it("clears tokens, session, and user on logout", async () => {
    // Start authenticated
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    // Mock fetch for logout endpoint
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "success" }), { status: 200 }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(mockRemoveToken).toHaveBeenCalled();
    expect(mockClearSession).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("redirects to login page on dev-mode logout", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);
    mockGetAuthMode.mockReturnValue("dev");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "success" }), { status: 200 }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(window.location.href).toBe("/auth/login");

    fetchSpy.mockRestore();
  });

  it("fires a backend logout request (fire-and-forget)", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "success" }), { status: 200 }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );

    fetchSpy.mockRestore();
  });
});

// =============================================================================
// refreshUser
// =============================================================================
describe("refreshUser", () => {
  it("fetches user data when authenticated", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Reset mock to track refreshUser-specific calls
    mockApiGet.mockClear();
    mockApiGet.mockResolvedValue({ ...mockUser, displayName: "Updated User" });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/auth/me");
    expect(result.current.user?.displayName).toBe("Updated User");
  });

  it("clears user when not authenticated during refresh", async () => {
    // Start authenticated
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    // Now simulate unauthenticated state
    mockIsAuthenticated.mockReturnValue(false);

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("clears tokens when refresh API call fails", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    // Make the next API call fail
    mockApiGet.mockRejectedValue(new Error("Session expired"));

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toBeNull();
    expect(mockRemoveToken).toHaveBeenCalled();
    expect(mockClearSession).toHaveBeenCalled();
  });
});

// =============================================================================
// useAuth hook
// =============================================================================
describe("useAuth hook", () => {
  it("returns all expected context values", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("isLoggedIn");
    expect(result.current).toHaveProperty("login");
    expect(result.current).toHaveProperty("loginWithEntraID");
    expect(result.current).toHaveProperty("logout");
    expect(result.current).toHaveProperty("refreshUser");
    expect(result.current).toHaveProperty("isEntraIDEnabled");
  });

  it("returns default values without provider", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.isEntraIDEnabled).toBe(false);
    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.loginWithEntraID).toBe("function");
    expect(typeof result.current.logout).toBe("function");
    expect(typeof result.current.refreshUser).toBe("function");
  });

  it("isLoggedIn reflects user presence", async () => {
    mockApiPost.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoggedIn).toBe(false);

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.isLoggedIn).toBe(true);
  });
});

// =============================================================================
// Session timeout
// =============================================================================
describe("session timeout", () => {
  it("sets up inactivity event listeners when user is logged in", async () => {
    const addEventSpy = vi.spyOn(document, "addEventListener");

    mockIsAuthenticated.mockReturnValue(true);
    mockApiGet.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });

    // Verify event listeners were added for activity events
    const eventTypes = addEventSpy.mock.calls.map((call) => call[0]);
    expect(eventTypes).toContain("mousedown");
    expect(eventTypes).toContain("keydown");
    expect(eventTypes).toContain("scroll");
    expect(eventTypes).toContain("touchstart");
    expect(eventTypes).toContain("mousemove");

    addEventSpy.mockRestore();
  });
});

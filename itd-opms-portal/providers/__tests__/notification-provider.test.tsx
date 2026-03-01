import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React from "react";
import { NotificationProvider, useNotificationStream } from "../notification-provider";

// =============================================================================
// Mock dependencies
// =============================================================================

// Mock auth-provider since NotificationProvider depends on useAuth
vi.mock("@/providers/auth-provider", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    isLoggedIn: false,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

// Mock auth lib
vi.mock("@/lib/auth", () => ({
  getToken: vi.fn().mockReturnValue(null),
}));

// Import the mock to control it in tests
import { useAuth } from "@/providers/auth-provider";

// =============================================================================
// Helper wrapper with QueryClient
// =============================================================================
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// Setup / Teardown
// =============================================================================
beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isLoggedIn: false,
    isLoading: false,
    login: vi.fn(),
    loginWithEntraID: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isEntraIDEnabled: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// NotificationProvider rendering
// =============================================================================
describe("NotificationProvider", () => {
  it("renders children", () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <div data-testid="child">Hello Notification</div>
      </Wrapper>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello Notification")).toBeInTheDocument();
  });

  it("provides default context values when user is not logged in", () => {
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useNotificationStream(), {
      wrapper: Wrapper,
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.lastNotification).toBeNull();
    expect(result.current.unreadCount).toBe(0);
  });
});

// =============================================================================
// useNotificationStream
// =============================================================================
describe("useNotificationStream", () => {
  it("returns default values without provider", () => {
    // useNotificationStream has a default context value, so it won't throw
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useNotificationStream(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.lastNotification).toBeNull();
    expect(result.current.unreadCount).toBe(0);
  });

  it("exposes isConnected, lastNotification, and unreadCount", () => {
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useNotificationStream(), {
      wrapper: Wrapper,
    });

    expect(result.current).toHaveProperty("isConnected");
    expect(result.current).toHaveProperty("lastNotification");
    expect(result.current).toHaveProperty("unreadCount");
  });
});

// =============================================================================
// Connection behavior
// =============================================================================
describe("connection behavior", () => {
  it("does not connect when user is not logged in", () => {
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useNotificationStream(), {
      wrapper: Wrapper,
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("context provides numeric unreadCount", () => {
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useNotificationStream(), {
      wrapper: Wrapper,
    });

    expect(typeof result.current.unreadCount).toBe("number");
  });
});

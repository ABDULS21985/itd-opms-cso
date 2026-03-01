import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { QueryProvider } from "../query-provider";

// =============================================================================
// Mock ReactQueryDevtools so it does not interfere with tests
// =============================================================================
vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

// =============================================================================
// QueryProvider rendering
// =============================================================================
describe("QueryProvider", () => {
  it("renders children", () => {
    render(
      <QueryProvider>
        <div data-testid="child">Hello</div>
      </QueryProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("provides a QueryClient to child components", () => {
    const { result } = renderHook(() => useQueryClient(), {
      wrapper: QueryProvider,
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.getQueryCache).toBe("function");
    expect(typeof result.current.getMutationCache).toBe("function");
  });

  it("configures default query options", () => {
    const { result } = renderHook(() => useQueryClient(), {
      wrapper: QueryProvider,
    });

    const defaults = result.current.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60 * 1000);
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it("renders multiple children", () => {
    render(
      <QueryProvider>
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </QueryProvider>,
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });

  it("uses the same QueryClient across re-renders", () => {
    const clients: ReturnType<typeof useQueryClient>[] = [];

    function Capture() {
      const qc = useQueryClient();
      clients.push(qc);
      return <div>captured</div>;
    }

    const { rerender } = render(
      <QueryProvider>
        <Capture />
      </QueryProvider>,
    );

    rerender(
      <QueryProvider>
        <Capture />
      </QueryProvider>,
    );

    // Both renders should receive the same QueryClient instance
    expect(clients.length).toBe(2);
    expect(clients[0]).toBe(clients[1]);
  });
});

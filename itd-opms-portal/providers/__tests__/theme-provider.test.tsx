import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ThemeProvider, useTheme } from "../theme-provider";

// =============================================================================
// Setup / Teardown
// =============================================================================
beforeEach(() => {
  localStorage.removeItem("opms-theme");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("theme-transitioning");
});

afterEach(() => {
  localStorage.removeItem("opms-theme");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("theme-transitioning");
});

// =============================================================================
// ThemeProvider rendering
// =============================================================================
describe("ThemeProvider", () => {
  it("renders children", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello</div>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("defaults to system theme when no stored preference", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // Before mount effect runs, theme is "system"
    expect(result.current.theme).toBe("system");
  });

  it("reads stored theme from localStorage on mount", async () => {
    localStorage.setItem("opms-theme", "dark");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // After useEffect runs, theme should be "dark"
    await vi.waitFor(() => {
      expect(result.current.theme).toBe("dark");
      expect(result.current.resolvedTheme).toBe("dark");
    });
  });

  it("reads stored light theme from localStorage on mount", async () => {
    localStorage.setItem("opms-theme", "light");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    await vi.waitFor(() => {
      expect(result.current.theme).toBe("light");
      expect(result.current.resolvedTheme).toBe("light");
    });
  });

  it("ignores invalid stored theme values and defaults to system", async () => {
    localStorage.setItem("opms-theme", "invalid-value");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    await vi.waitFor(() => {
      expect(result.current.theme).toBe("system");
    });
  });
});

// =============================================================================
// Theme switching
// =============================================================================
describe("theme switching", () => {
  it("updates theme when setTheme is called with dark", async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(localStorage.getItem("opms-theme")).toBe("dark");
  });

  it("updates theme when setTheme is called with light", async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(localStorage.getItem("opms-theme")).toBe("light");
  });

  it("applies data-theme attribute to document element for dark theme", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("removes data-theme attribute for light theme", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("dark");
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      result.current.setTheme("light");
    });
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("adds theme-transitioning class briefly when switching", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(true);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);

    vi.useRealTimers();
  });

  it("persists theme preference to localStorage", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("dark");
    });
    expect(localStorage.getItem("opms-theme")).toBe("dark");

    act(() => {
      result.current.setTheme("light");
    });
    expect(localStorage.getItem("opms-theme")).toBe("light");

    act(() => {
      result.current.setTheme("system");
    });
    expect(localStorage.getItem("opms-theme")).toBe("system");
  });
});

// =============================================================================
// useTheme outside provider
// =============================================================================
describe("useTheme outside provider", () => {
  it("throws an error when used outside ThemeProvider", () => {
    // Suppress console.error from React for expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within ThemeProvider");

    spy.mockRestore();
  });
});

// =============================================================================
// System theme resolution
// =============================================================================
describe("system theme resolution", () => {
  it("resolves system theme based on matchMedia", async () => {
    // matchMedia is mocked in setup.ts to return matches: false (light)
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("system");
    });

    // With matchMedia mocked to return matches: false, system = light
    expect(result.current.resolvedTheme).toBe("light");
  });
});

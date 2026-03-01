import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

describe("usePrefersReducedMotion", () => {
  let changeHandler: ((e: { matches: boolean }) => void) | null = null;

  beforeEach(() => {
    changeHandler = null;

    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: any) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("returns false when prefers-reduced-motion is not set", () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion matches", () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when media query change event fires", async () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });
});

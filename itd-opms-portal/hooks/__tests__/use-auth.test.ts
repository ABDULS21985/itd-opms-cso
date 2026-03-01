import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

/**
 * useAuth is a re-export of useContext(AuthContext) from providers/auth-provider.
 * Without a wrapping AuthProvider, it returns the context defaults.
 */
describe("useAuth", () => {
  it("returns default context values when no AuthProvider wraps the hook", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoggedIn).toBe(false);
    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.loginWithEntraID).toBe("function");
    expect(typeof result.current.logout).toBe("function");
    expect(typeof result.current.refreshUser).toBe("function");
    expect(result.current.isEntraIDEnabled).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { screen, waitFor, render } from "./test-utils";
import { useEffect, useState } from "react";

// =============================================================================
// Smoke test: React rendering via custom render utility
// =============================================================================
describe("Smoke test: React rendering", () => {
  it("should render a simple component", () => {
    function Hello() {
      return <h1>Hello, Vitest!</h1>;
    }

    render(<Hello />);
    expect(screen.getByText("Hello, Vitest!")).toBeInTheDocument();
  });

  it("should have jest-dom matchers available", () => {
    function Badge() {
      return <span data-testid="badge" className="active">Active</span>;
    }

    render(<Badge />);
    const badge = screen.getByTestId("badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Active");
    expect(badge).toHaveClass("active");
  });
});

// =============================================================================
// Smoke test: MSW intercepts requests
// =============================================================================
describe("Smoke test: MSW request interception", () => {
  it("should intercept GET /auth/me and return mock user", async () => {
    function UserDisplay() {
      const [user, setUser] = useState<{ displayName: string } | null>(null);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        fetch("http://localhost:8089/api/v1/auth/me")
          .then((res) => res.json())
          .then((json) => setUser(json.data))
          .catch((err) => setError(err.message));
      }, []);

      if (error) return <div>Error: {error}</div>;
      if (!user) return <div>Loading...</div>;
      return <div data-testid="user-name">{user.displayName}</div>;
    }

    render(<UserDisplay />);

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Test User");
    });
  });
});

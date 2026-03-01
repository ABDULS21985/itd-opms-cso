import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";

// =============================================================================
// Mocks
// =============================================================================

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/auth/callback",
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
}));

const mockSetAuthenticatedFlag = vi.fn();
const mockSetAuthMode = vi.fn();

vi.mock("@/lib/auth", () => ({
  setAuthenticatedFlag: (...args: unknown[]) => mockSetAuthenticatedFlag(...args),
  setAuthMode: (...args: unknown[]) => mockSetAuthMode(...args),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: React.PropsWithChildren<Record<string, unknown>>) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Import after mocks
import OIDCCallbackPage from "../callback/page";

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  sessionStorage.clear();
});

// =============================================================================
// Tests
// =============================================================================

describe("OIDCCallbackPage", () => {
  it("shows error when URL contains an error parameter", { timeout: 15000 }, async () => {
    mockSearchParams = new URLSearchParams({
      error: "access_denied",
      error_description: "User cancelled the login flow",
    });

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    expect(
      screen.getByText("User cancelled the login flow"),
    ).toBeInTheDocument();
  });

  it("shows error with default message when error has no description", async () => {
    mockSearchParams = new URLSearchParams({
      error: "server_error",
    });

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Authentication error: server_error"),
    ).toBeInTheDocument();
  });

  it("shows error when code is missing from URL", async () => {
    // Only state but no code
    mockSearchParams = new URLSearchParams({
      state: "some-state",
    });

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Missing authorization code or state parameter/,
      ),
    ).toBeInTheDocument();
  });

  it("shows error when state is missing from URL", async () => {
    mockSearchParams = new URLSearchParams({
      code: "auth-code-123",
    });

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Missing authorization code or state parameter/,
      ),
    ).toBeInTheDocument();
  });

  it("shows error when state does not match stored state", async () => {
    mockSearchParams = new URLSearchParams({
      code: "auth-code-123",
      state: "state-from-url",
    });
    sessionStorage.setItem("opms-pkce-state", "different-stored-state");

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/State mismatch/),
    ).toBeInTheDocument();
  });

  it("shows error when PKCE code verifier is missing", async () => {
    const state = "matching-state-123";
    mockSearchParams = new URLSearchParams({
      code: "auth-code-123",
      state,
    });
    sessionStorage.setItem("opms-pkce-state", state);
    // No code verifier in sessionStorage

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Missing PKCE code verifier/),
    ).toBeInTheDocument();
  });

  it("renders 'Try Again' link pointing to /auth/login on error", async () => {
    mockSearchParams = new URLSearchParams({
      error: "access_denied",
    });

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    const tryAgainLink = screen.getByRole("link", { name: /try again/i });
    expect(tryAgainLink).toHaveAttribute("href", "/auth/login");
  });

  it("renders 'Return to sign in page' link on error", async () => {
    mockSearchParams = new URLSearchParams({
      error: "access_denied",
    });

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    const returnLink = screen.getByRole("link", { name: /return to sign in page/i });
    expect(returnLink).toHaveAttribute("href", "/auth/login");
  });

  it("cleans up PKCE artifacts from sessionStorage on error", async () => {
    mockSearchParams = new URLSearchParams({
      error: "access_denied",
      error_description: "Something went wrong",
    });
    sessionStorage.setItem("opms-pkce-verifier", "some-verifier");
    sessionStorage.setItem("opms-pkce-state", "some-state");

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
    });

    expect(sessionStorage.getItem("opms-pkce-verifier")).toBeNull();
    expect(sessionStorage.getItem("opms-pkce-state")).toBeNull();
  });
});

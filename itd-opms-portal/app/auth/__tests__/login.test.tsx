import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@/test/test-utils";

// =============================================================================
// Mocks
// =============================================================================

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/auth/login",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockLogin = vi.fn();
const mockLoginWithEntraID = vi.fn();

const authState = {
  isEntraIDEnabled: false,
  isLoading: false,
};

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithEntraID: mockLoginWithEntraID,
    isEntraIDEnabled: authState.isEntraIDEnabled,
    isLoading: authState.isLoading,
    user: null,
    isLoggedIn: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      whileHover: _wh,
      whileTap: _wt,
      ...rest
    }: React.PropsWithChildren<Record<string, unknown>>) => <div {...rest}>{children}</div>,
    a: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      whileHover: _wh,
      whileTap: _wt,
      ...rest
    }: React.PropsWithChildren<Record<string, unknown>>) => <a {...rest}>{children}</a>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Import component after mocks
import LoginPage from "../login/page";

// =============================================================================
// Helpers
// =============================================================================

function fillAndSubmitForm(email: string, password: string) {
  const emailInput = screen.getByPlaceholderText("you@cbn.gov.ng");
  const passwordInput = screen.getByPlaceholderText("Enter your password");

  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.change(passwordInput, { target: { value: password } });

  const submitBtn = screen.getByRole("button", { name: /sign in with credentials/i });
  fireEvent.click(submitBtn);
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  authState.isEntraIDEnabled = false;
  authState.isLoading = false;
  mockLogin.mockResolvedValue(undefined);
  mockLoginWithEntraID.mockResolvedValue(undefined);
});

// =============================================================================
// Tests
// =============================================================================

describe("LoginPage", () => {
  it("renders the login form heading and input fields", { timeout: 15000 }, () => {
    render(<LoginPage />);

    expect(screen.getByText("Sign in to OPMS")).toBeInTheDocument();
    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@cbn.gov.ng")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with credentials/i }),
    ).toBeInTheDocument();
  });

  it("renders the CBN branding text", () => {
    render(<LoginPage />);

    expect(screen.getByText("Central Bank of Nigeria")).toBeInTheDocument();
    expect(screen.getByText("IT Department — OPMS")).toBeInTheDocument();
  });

  it("shows 'Enter your credentials' subtitle when Entra ID is disabled", () => {
    authState.isEntraIDEnabled = false;
    render(<LoginPage />);

    expect(
      screen.getByText("Enter your credentials to access the portal"),
    ).toBeInTheDocument();
  });

  it("shows organizational account subtitle when Entra ID is enabled", () => {
    authState.isEntraIDEnabled = true;
    render(<LoginPage />);

    expect(
      screen.getByText("Sign in with your organizational account"),
    ).toBeInTheDocument();
  });

  it("shows the Microsoft SSO button when Entra ID is enabled", { timeout: 10000 }, () => {
    authState.isEntraIDEnabled = true;
    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /sign in with microsoft/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("or sign in with credentials")).toBeInTheDocument();
  });

  it("does not show the Microsoft SSO button when Entra ID is disabled", () => {
    authState.isEntraIDEnabled = false;
    render(<LoginPage />);

    expect(
      screen.queryByRole("button", { name: /sign in with microsoft/i }),
    ).not.toBeInTheDocument();
  });

  it("renders email input as required with type email", () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("you@cbn.gov.ng");
    expect(emailInput).toBeRequired();
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("renders password input as required", () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText("Enter your password");
    expect(passwordInput).toBeRequired();
  });

  it("toggles password visibility when the eye icon button is clicked", () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText("Enter your password");
    expect(passwordInput).toHaveAttribute("type", "password");

    // The toggle button is a type="button" element inside the password wrapper
    const allTypeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.getAttribute("type") === "button",
    );
    const toggleButton = allTypeButtons[0];

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("calls login with email and password on form submission", async () => {
    render(<LoginPage />);

    fillAndSubmitForm("admin@cbn.gov.ng", "password123");

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin@cbn.gov.ng", "password123");
    });
  });

  it("redirects to /dashboard on successful login", async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginPage />);

    fillAndSubmitForm("admin@cbn.gov.ng", "password123");

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays error message on failed login", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    render(<LoginPage />);

    fillAndSubmitForm("bad@cbn.gov.ng", "wrong");

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("displays a generic error when login fails with a non-Error", async () => {
    mockLogin.mockRejectedValue("some string error");
    render(<LoginPage />);

    fillAndSubmitForm("bad@cbn.gov.ng", "wrong");

    await waitFor(() => {
      expect(
        screen.getByText("Invalid credentials. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("disables submit button during loading state", async () => {
    mockLogin.mockReturnValue(new Promise(() => {}));
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: /sign in with credentials/i });
    fillAndSubmitForm("admin@cbn.gov.ng", "password123");

    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });
  });

  it("clears error when user types in email field", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    render(<LoginPage />);

    fillAndSubmitForm("bad@cbn.gov.ng", "wrong");

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    // Type in email field -- onChange handler clears the error
    const emailInput = screen.getByPlaceholderText("you@cbn.gov.ng");
    fireEvent.change(emailInput, { target: { value: "new@cbn.gov.ng" } });

    await waitFor(() => {
      expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
    });
  });

  it("calls loginWithEntraID when SSO button is clicked", () => {
    authState.isEntraIDEnabled = true;
    render(<LoginPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /sign in with microsoft/i }),
    );

    expect(mockLoginWithEntraID).toHaveBeenCalled();
  });

  it("shows security badge text", () => {
    render(<LoginPage />);

    expect(
      screen.getByText("Secured with 256-bit encryption"),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";

// =============================================================================
// Mocks
// =============================================================================

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockUser = {
  id: "user-1",
  email: "test@cbn.gov.ng",
  displayName: "Aisha Bello",
  roles: ["admin"],
  permissions: ["*"],
  tenantId: "tenant-1",
  department: "IT",
  jobTitle: "Director",
};

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    isLoggedIn: true,
    login: vi.fn(),
    loginWithEntraID: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isEntraIDEnabled: false,
  }),
}));

let mockSummary: Record<string, unknown> | undefined = undefined;
let mockSummaryLoading = false;

vi.mock("@/hooks/use-reporting", () => ({
  useExecutiveSummary: () => ({
    data: mockSummary,
    isLoading: mockSummaryLoading,
    error: null,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(
          ([key]) =>
            !["initial", "animate", "exit", "transition", "whileHover", "whileTap"].includes(key),
        ),
      );
      return <div {...filteredProps}>{children}</div>;
    },
    a: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(
          ([key]) =>
            !["initial", "animate", "exit", "transition", "whileHover", "whileTap"].includes(key),
        ),
      );
      return <a {...filteredProps}>{children}</a>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Import after mocks
import DashboardPage from "../page";

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockSummary = {
    openTickets: 42,
    activeProjects: 15,
    activeAssets: 230,
    highRisks: 5,
  };
  mockSummaryLoading = false;
});

// =============================================================================
// Tests
// =============================================================================

describe("DashboardPage", () => {
  it("renders the dashboard with a greeting and user name", { timeout: 15000 }, () => {
    render(<DashboardPage />);

    // Greeting varies by time of day — check for the user's display name
    expect(screen.getByText(/Aisha Bello/)).toBeInTheDocument();
  });

  it("shows the welcome subtitle text", () => {
    render(<DashboardPage />);

    expect(
      screen.getByText(
        /Welcome to the IT Operations & Project Management System/,
      ),
    ).toBeInTheDocument();
  });

  it("renders KPI stat cards with loaded values", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Open Tickets")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Active Projects")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Active Assets")).toBeInTheDocument();
    expect(screen.getByText("230")).toBeInTheDocument();
    expect(screen.getByText("High Risks")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows '--' placeholder when summary data is missing", () => {
    mockSummary = {};
    render(<DashboardPage />);

    // When values are undefined, the component renders "--"
    const placeholders = screen.getAllByText("--");
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });

  it("renders loading pulses when summary is loading", () => {
    mockSummaryLoading = true;
    render(<DashboardPage />);

    // When loading, it should show pulse animation divs instead of values
    expect(screen.getByText("Open Tickets")).toBeInTheDocument();
    // The value "42" should not be visible while loading
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("renders all module cards", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Governance")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getByText("ITSM")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("renders module card descriptions", () => {
    render(<DashboardPage />);

    expect(
      screen.getByText(/Policies, RACI matrices, meeting governance, and OKRs/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Service catalog, incidents, requests, and problem management/),
    ).toBeInTheDocument();
  });

  it("renders module card links with correct hrefs", () => {
    render(<DashboardPage />);

    const governanceLink = screen.getByText("Governance").closest("a");
    expect(governanceLink).toHaveAttribute("href", "/dashboard/governance");

    const planningLink = screen.getByText("Planning").closest("a");
    expect(planningLink).toHaveAttribute("href", "/dashboard/planning");

    const itsmLink = screen.getByText("ITSM").closest("a");
    expect(itsmLink).toHaveAttribute("href", "/dashboard/itsm");
  });

  it("shows 'Open module' text on module cards (visible on hover)", () => {
    render(<DashboardPage />);

    const openModuleTexts = screen.getAllByText("Open module");
    expect(openModuleTexts.length).toBe(7); // 7 modules
  });

  it("shows time-appropriate greeting", () => {
    render(<DashboardPage />);

    // The greeting depends on time of day
    const greetingEl = screen.getByText(/Aisha Bello/).closest("h1");
    expect(greetingEl).toBeTruthy();
    const greetingText = greetingEl!.textContent || "";

    // Should contain one of the valid greetings
    expect(
      greetingText.includes("Good morning") ||
      greetingText.includes("Good afternoon") ||
      greetingText.includes("Good evening"),
    ).toBe(true);
  });
});

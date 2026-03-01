import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import PlanningHubPage from "../page";

// ---------------------------------------------------------------------------
// Mock: framer-motion (render synchronously)
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
    p: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: any) => <p {...rest}>{children}</p>,
  },
}));

// ---------------------------------------------------------------------------
// Mock: hooks/use-auth
// ---------------------------------------------------------------------------
const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  roles: ["admin"],
  permissions: ["*"],
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mockUser, isLoading: false, isLoggedIn: true }),
}));

// ---------------------------------------------------------------------------
// Mock: hooks/use-planning
// ---------------------------------------------------------------------------
const mockUseProjects = vi.fn();
const mockUseOverdueWorkItems = vi.fn();
const mockUseRisks = vi.fn();
const mockUseIssues = vi.fn();

vi.mock("@/hooks/use-planning", () => ({
  useProjects: (...args: any[]) => mockUseProjects(...args),
  useOverdueWorkItems: (...args: any[]) => mockUseOverdueWorkItems(...args),
  useRisks: (...args: any[]) => mockUseRisks(...args),
  useIssues: (...args: any[]) => mockUseIssues(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setLoadingState() {
  mockUseProjects.mockReturnValue({ data: undefined, isLoading: true });
  mockUseOverdueWorkItems.mockReturnValue({ data: undefined, isLoading: true });
  mockUseRisks.mockReturnValue({ data: undefined, isLoading: true });
  mockUseIssues.mockReturnValue({ data: undefined, isLoading: true });
}

function setDataState() {
  mockUseProjects.mockReturnValue({
    data: { data: [], meta: { totalItems: 5 } },
    isLoading: false,
  });
  mockUseOverdueWorkItems.mockReturnValue({
    data: [{ id: "1" }, { id: "2" }, { id: "3" }],
    isLoading: false,
  });
  mockUseRisks.mockReturnValue({
    data: { data: [], meta: { totalItems: 8 } },
    isLoading: false,
  });
  mockUseIssues.mockReturnValue({
    data: { data: [], meta: { totalItems: 2 } },
    isLoading: false,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PlanningHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page heading and description", () => {
    setDataState();
    render(<PlanningHubPage />);

    expect(screen.getByText("Planning & PMO")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage portfolios, projects, work items, risks, and issues/),
    ).toBeInTheDocument();
  });

  it("greets the user by display name", () => {
    setDataState();
    render(<PlanningHubPage />);

    // The greeting includes the user name
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
  });

  it("renders all four summary cards", () => {
    setDataState();
    render(<PlanningHubPage />);

    expect(screen.getByText("Active Projects")).toBeInTheDocument();
    expect(screen.getByText("Overdue Tasks")).toBeInTheDocument();
    expect(screen.getByText("Open Risks")).toBeInTheDocument();
    expect(screen.getByText("Open Issues")).toBeInTheDocument();
  });

  it("renders summary card counts when data is loaded", () => {
    setDataState();
    render(<PlanningHubPage />);

    expect(screen.getByText("5")).toBeInTheDocument(); // Active Projects
    expect(screen.getByText("3")).toBeInTheDocument(); // Overdue Tasks
    expect(screen.getByText("8")).toBeInTheDocument(); // Open Risks
    expect(screen.getByText("2")).toBeInTheDocument(); // Open Issues
  });

  it("shows loading pulses when data is loading", () => {
    setLoadingState();
    const { container } = render(<PlanningHubPage />);

    // Pulse placeholders use animate-pulse class
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(4);
  });

  it("renders quick action links", () => {
    setDataState();
    render(<PlanningHubPage />);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("New Portfolio")).toBeInTheDocument();
    expect(screen.getByText("New Project")).toBeInTheDocument();
    expect(screen.getByText("New Work Item")).toBeInTheDocument();
  });

  it("renders planning module navigation cards", () => {
    setDataState();
    render(<PlanningHubPage />);

    expect(screen.getByText("Planning Modules")).toBeInTheDocument();
    expect(screen.getByText("Portfolios")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Work Items")).toBeInTheDocument();
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Change Requests")).toBeInTheDocument();
  });

  it("renders '--' when counts are undefined", () => {
    mockUseProjects.mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    });
    mockUseOverdueWorkItems.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    mockUseRisks.mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    });
    mockUseIssues.mockReturnValue({
      data: { data: [], meta: {} },
      isLoading: false,
    });

    render(<PlanningHubPage />);

    // Counts should show "--" when totalItems is not defined
    const dashes = screen.getAllByText("--");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

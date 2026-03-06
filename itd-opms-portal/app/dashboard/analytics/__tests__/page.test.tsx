import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";

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
  usePathname: () => "/dashboard/analytics",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// -- Mock data --

let mockSummary: Record<string, unknown> | undefined = undefined;
let mockSummaryLoading = false;

let mockProjectsData: unknown = undefined;
let mockProjectsLoading = false;

let mockRisksData: unknown = undefined;
let mockRisksLoading = false;

let mockMilestonesData: unknown = undefined;
let mockMilestonesLoading = false;

vi.mock("@/hooks/use-reporting", () => ({
  useExecutiveSummary: () => ({
    data: mockSummary,
    isLoading: mockSummaryLoading,
    error: null,
  }),
}));

vi.mock("@/hooks/use-planning", () => ({
  useProjects: () => ({
    data: mockProjectsData,
    isLoading: mockProjectsLoading,
    error: null,
  }),
  useRisks: () => ({
    data: mockRisksData,
    isLoading: mockRisksLoading,
    error: null,
  }),
  useMilestones: () => ({
    data: mockMilestonesData,
    isLoading: mockMilestonesLoading,
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
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock the chart components so we can test the page without Recharts
vi.mock("@/components/dashboard/charts", () => ({
  KPIStatCard: ({
    label,
    value,
    isLoading,
    suffix,
    subtitle,
  }: {
    label: string;
    value?: number | string;
    isLoading?: boolean;
    suffix?: string;
    subtitle?: string;
    index?: number;
    icon?: unknown;
    color?: string;
    bgColor?: string;
    href?: string;
  }) => (
    <div data-testid={`kpi-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <span>{label}</span>
      {isLoading ? (
        <span data-testid="kpi-loading">Loading...</span>
      ) : (
        <span data-testid="kpi-value">
          {value ?? "--"}{suffix || ""}
        </span>
      )}
      {subtitle && <span data-testid="kpi-subtitle">{subtitle}</span>}
    </div>
  ),
  ChartCard: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    delay?: number;
  }) => (
    <div data-testid={`chart-card-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      <div>{children}</div>
    </div>
  ),
  DonutChart: () => <div data-testid="donut-chart" />,
  ProgressRing: ({ value, color }: { value: number; size?: number; strokeWidth?: number; color: string; delay?: number }) => (
    <div data-testid="progress-ring" data-value={value} data-color={color} />
  ),
  StackedBarChart: () => <div data-testid="stacked-bar-chart" />,
  FunnelChart: () => <div data-testid="funnel-chart" />,
  WaterfallChart: () => <div data-testid="waterfall-chart" />,
  HeatMapGrid: () => <div data-testid="heat-map-grid" />,
  TrendLineChart: () => <div data-testid="trend-line-chart" />,
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }> & Record<string, unknown>) => {
    const filteredProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => !key.startsWith("data-") && key !== "className" && key !== "style" ? false : true),
    );
    return <a href={href} {...filteredProps}>{children}</a>;
  },
}));

// Import after mocks
import ExecutiveAnalyticsPage from "../page";

// =============================================================================
// Test data
// =============================================================================

const mockProjects = [
  {
    id: "proj-1",
    title: "Core Banking Upgrade",
    status: "active",
    priority: "high",
    ragStatus: "green",
    completionPct: 65,
    budgetApproved: 5000000,
    budgetSpent: 3200000,
    metadata: { division: "Digital Banking" },
  },
  {
    id: "proj-2",
    title: "Network Security Enhancement",
    status: "in-development",
    priority: "critical",
    ragStatus: "amber",
    completionPct: 30,
    budgetApproved: 2000000,
    budgetSpent: 800000,
    metadata: { division: "Infrastructure" },
  },
  {
    id: "proj-3",
    title: "Staff Portal v2",
    status: "completed",
    priority: "medium",
    ragStatus: "green",
    completionPct: 100,
    budgetApproved: 1000000,
    budgetSpent: 950000,
    metadata: { division: "Digital Banking" },
  },
];

const mockRisks = [
  {
    id: "risk-1",
    title: "Vendor delay",
    likelihood: "high",
    impact: "medium",
    status: "open",
    category: "schedule",
  },
  {
    id: "risk-2",
    title: "Budget overrun",
    likelihood: "medium",
    impact: "high",
    status: "open",
    category: "cost",
  },
];

const mockMilestones = [
  {
    id: "ms-1",
    title: "Phase 1 Complete",
    status: "completed",
    targetDate: "2026-01-15",
    actualDate: "2026-01-14",
  },
  {
    id: "ms-2",
    title: "Phase 2 Start",
    status: "pending",
    targetDate: "2026-02-01",
    actualDate: null,
  },
];

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
    criticalRisks: 2,
    onTimeDeliveryPct: 88,
    refreshedAt: "2026-03-01T10:00:00Z",
  };
  mockSummaryLoading = false;
  mockProjectsData = { data: mockProjects };
  mockProjectsLoading = false;
  mockRisksData = { data: mockRisks };
  mockRisksLoading = false;
  mockMilestonesData = mockMilestones;
  mockMilestonesLoading = false;
});

// =============================================================================
// Tests
// =============================================================================

describe("ExecutiveAnalyticsPage", () => {
  it("renders the page header", { timeout: 15000 }, () => {
    render(<ExecutiveAnalyticsPage />);

    expect(screen.getByText("AMD PM Executive Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Cross-module performance overview and strategic insights"),
    ).toBeInTheDocument();
  });

  it("renders the sub-navigation tabs", () => {
    render(<ExecutiveAnalyticsPage />);

    expect(screen.getByText("Executive Overview")).toBeInTheDocument();
    // Some labels appear both in tabs and quick-links, so use getAllByText
    expect(screen.getAllByText("Portfolio").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Risks & Issues").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Resources").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Governance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Office Analytics").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Collaboration").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sub-navigation tabs with correct hrefs", () => {
    render(<ExecutiveAnalyticsPage />);

    // Find all Portfolio links and check the one in the tabs
    const portfolioLinks = screen.getAllByText("Portfolio");
    const portfolioTabLink = portfolioLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/dashboard/analytics/portfolio",
    );
    expect(portfolioTabLink).toBeTruthy();

    const risksLinks = screen.getAllByText("Risks & Issues");
    const risksTabLink = risksLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/dashboard/analytics/risks",
    );
    expect(risksTabLink).toBeTruthy();
  });

  it("renders KPI cards with computed values", () => {
    render(<ExecutiveAnalyticsPage />);

    // Total Projects KPI
    expect(screen.getByText("Total Projects")).toBeInTheDocument();

    // Completed KPI
    expect(screen.getByText("Completed")).toBeInTheDocument();

    // Overall Progress KPI
    expect(screen.getByText("Overall Progress")).toBeInTheDocument();

    // Budget Utilization KPI
    expect(screen.getByText("Budget Utilization")).toBeInTheDocument();

    // On-Time Delivery KPI
    expect(screen.getByText("On-Time Delivery")).toBeInTheDocument();

    // Active Risks KPI
    expect(screen.getByText("Active Risks")).toBeInTheDocument();
  });

  it("renders KPI loading state when data is loading", () => {
    mockSummaryLoading = true;
    mockProjectsLoading = true;
    render(<ExecutiveAnalyticsPage />);

    const loadingIndicators = screen.getAllByTestId("kpi-loading");
    expect(loadingIndicators.length).toBeGreaterThan(0);
  });

  it("renders chart cards for all dashboard sections", () => {
    render(<ExecutiveAnalyticsPage />);

    expect(screen.getByText("Project Lifecycle Funnel")).toBeInTheDocument();
    expect(screen.getByText("RAG Status Distribution")).toBeInTheDocument();
    expect(screen.getByText("Divisional Progress Tracker")).toBeInTheDocument();
    expect(screen.getByText("Budget Overview")).toBeInTheDocument();
    expect(screen.getByText("Priority Distribution")).toBeInTheDocument();
    expect(screen.getByText("Milestone Progress")).toBeInTheDocument();
    expect(screen.getByText("Risk Heat Map")).toBeInTheDocument();
  });

  it("renders chart components when data is loaded", () => {
    render(<ExecutiveAnalyticsPage />);

    expect(screen.getByTestId("funnel-chart")).toBeInTheDocument();
    expect(screen.getByTestId("stacked-bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("waterfall-chart")).toBeInTheDocument();
    expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
    expect(screen.getByTestId("trend-line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("heat-map-grid")).toBeInTheDocument();
  });

  it("renders chart subtitles", () => {
    render(<ExecutiveAnalyticsPage />);

    expect(screen.getByText("Project flow through stages")).toBeInTheDocument();
    expect(screen.getByText("Project health indicators")).toBeInTheDocument();
    expect(screen.getByText("Status by division")).toBeInTheDocument();
  });

  it("shows refreshedAt timestamp when available", () => {
    render(<ExecutiveAnalyticsPage />);

    // The component formats the date with toLocaleString
    // We just check that "Updated" text is rendered
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it("does not show refreshedAt when summary has no refreshedAt", () => {
    mockSummary = { openTickets: 10 };
    render(<ExecutiveAnalyticsPage />);

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });

  it("renders quick links to other dashboards", () => {
    render(<ExecutiveAnalyticsPage />);

    // The quick links section renders analyticsPages.slice(1)
    // Check that they appear as links
    const portfolioLinks = screen.getAllByText("Portfolio");
    expect(portfolioLinks.length).toBeGreaterThanOrEqual(1);

    const projectLinks = screen.getAllByText("Projects");
    expect(projectLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty project data gracefully", () => {
    mockProjectsData = { data: [] };
    mockRisksData = { data: [] };
    mockMilestonesData = [];
    mockSummary = {};

    render(<ExecutiveAnalyticsPage />);

    // Page should still render without crashing
    expect(screen.getByText("Divisional Executive Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total Projects")).toBeInTheDocument();
  });

  it("handles null/undefined data gracefully", () => {
    mockProjectsData = undefined;
    mockRisksData = undefined;
    mockMilestonesData = undefined;
    mockSummary = undefined;

    render(<ExecutiveAnalyticsPage />);

    // Page should still render without crashing
    expect(screen.getByText("Divisional Executive Dashboard")).toBeInTheDocument();
  });

  it("renders RAG status progress rings when data is loaded", () => {
    render(<ExecutiveAnalyticsPage />);

    const progressRings = screen.getAllByTestId("progress-ring");
    expect(progressRings.length).toBe(3); // Green, Amber, Red
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";

// ---------------------------------------------------------------------------
// Mock: framer-motion
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
    section: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    }: any) => <section {...rest}>{children}</section>,
  },
}));

// ---------------------------------------------------------------------------
// Mock: next/link
// ---------------------------------------------------------------------------
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }> & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: auth
// ---------------------------------------------------------------------------
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "analyst@example.com",
      displayName: "Ada Analyst",
      roles: ["admin"],
      permissions: ["*"],
    },
    isLoading: false,
    isLoggedIn: true,
  }),
}));

// ---------------------------------------------------------------------------
// Mock: shared UI primitives
// ---------------------------------------------------------------------------
vi.mock("@/components/dashboard/charts/donut-chart", () => ({
  DonutChart: ({ centerLabel, centerValue }: { centerLabel?: string; centerValue?: string | number }) => (
    <div data-testid="donut-chart">
      {centerLabel}:{centerValue}
    </div>
  ),
}));

vi.mock("@/components/dashboard/charts/gauge-chart", () => ({
  GaugeChart: ({ value }: { value: number }) => (
    <div data-testid="gauge-chart">{value}</div>
  ),
}));

vi.mock("@/components/dashboard/charts/progress-ring", () => ({
  ProgressRing: ({ value }: { value: number }) => (
    <div data-testid="progress-ring">{value}</div>
  ),
}));

vi.mock("@/components/shared/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

// ---------------------------------------------------------------------------
// Mock: ITSM hooks
// ---------------------------------------------------------------------------
const mockUseTicketStats = vi.fn();
const mockUseCSATStats = vi.fn();
const mockUseSLAComplianceStats = vi.fn();
const mockUseProblems = vi.fn();
const mockUseSupportQueues = vi.fn();
const mockUseMyQueue = vi.fn();
const mockUseMyServiceRequests = vi.fn();
const mockUsePendingApprovals = vi.fn();

vi.mock("@/hooks/use-itsm", () => ({
  useTicketStats: (...args: any[]) => mockUseTicketStats(...args),
  useCSATStats: (...args: any[]) => mockUseCSATStats(...args),
  useSLAComplianceStats: (...args: any[]) => mockUseSLAComplianceStats(...args),
  useProblems: (...args: any[]) => mockUseProblems(...args),
  useSupportQueues: (...args: any[]) => mockUseSupportQueues(...args),
  useMyQueue: (...args: any[]) => mockUseMyQueue(...args),
  useMyServiceRequests: (...args: any[]) => mockUseMyServiceRequests(...args),
  usePendingApprovals: (...args: any[]) => mockUsePendingApprovals(...args),
}));

// Import after mocks
import ITSMHubPage from "../page";

function setLoadedState() {
  mockUseTicketStats.mockReturnValue({
    data: {
      total: 42,
      openCount: 13,
      slaBreachedCount: 3,
      majorIncidents: 1,
    },
    isLoading: false,
  });

  mockUseCSATStats.mockReturnValue({
    data: {
      total: 18,
      avgRating: 4.4,
    },
    isLoading: false,
  });

  mockUseSLAComplianceStats.mockReturnValue({
    data: {
      totalTickets: 42,
      responseMet: 35,
      resolutionMet: 31,
    },
    isLoading: false,
  });

  mockUseProblems.mockReturnValue({
    data: {
      data: [
        {
          id: "problem-1",
          problemNumber: "PRB-001",
          title: "Database failover review",
          status: "investigating",
          createdAt: "2026-03-28T10:00:00.000Z",
        },
      ],
      meta: {
        page: 1,
        pageSize: 3,
        totalItems: 4,
        totalPages: 2,
      },
    },
    isLoading: false,
  });

  mockUseSupportQueues.mockReturnValue({
    data: [
      { id: "queue-1", name: "Service Desk" },
      { id: "queue-2", name: "Infrastructure" },
    ],
    isLoading: false,
  });

  mockUseMyQueue.mockReturnValue({
    data: {
      data: [
        {
          id: "ticket-1",
          ticketNumber: "INC-1042",
          title: "Email gateway outage",
          priority: "P1_critical",
          status: "in_progress",
          type: "incident",
          updatedAt: "2026-03-28T12:30:00.000Z",
          isMajorIncident: true,
        },
      ],
      meta: {
        page: 1,
        pageSize: 4,
        totalItems: 3,
        totalPages: 1,
      },
    },
    isLoading: false,
  });

  mockUseMyServiceRequests.mockReturnValue({
    data: {
      data: [
        {
          id: "request-1",
          requestNumber: "REQ-2026-014",
          catalogItemName: "Endpoint refresh",
          status: "pending",
          priority: "high",
          updatedAt: "2026-03-28T11:15:00.000Z",
        },
      ],
      meta: {
        page: 1,
        pageSize: 4,
        totalItems: 6,
        totalPages: 2,
      },
    },
    isLoading: false,
  });

  mockUsePendingApprovals.mockReturnValue({
    data: {
      data: [{ id: "approval-1" }],
      meta: {
        page: 1,
        pageSize: 1,
        totalItems: 2,
        totalPages: 2,
      },
    },
    isLoading: false,
  });
}

function setEmptyState() {
  mockUseTicketStats.mockReturnValue({
    data: {
      total: 0,
      openCount: 0,
      slaBreachedCount: 0,
      majorIncidents: 0,
    },
    isLoading: false,
  });

  mockUseCSATStats.mockReturnValue({
    data: undefined,
    isLoading: false,
  });

  mockUseSLAComplianceStats.mockReturnValue({
    data: undefined,
    isLoading: false,
  });

  mockUseProblems.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 3,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });

  mockUseSupportQueues.mockReturnValue({
    data: [],
    isLoading: false,
  });

  mockUseMyQueue.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 4,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });

  mockUseMyServiceRequests.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 4,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });

  mockUsePendingApprovals.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 1,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });
}

describe("ITSMHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the redesigned command center with live sections", () => {
    setLoadedState();

    render(<ITSMHubPage />);

    expect(screen.getByText("IT Service Management")).toBeInTheDocument();
    expect(screen.getByText(/Live ITSM command center/)).toBeInTheDocument();
    expect(screen.getByText("Open tickets")).toBeInTheDocument();
    expect(screen.getByText("Operational lanes")).toBeInTheDocument();
    expect(screen.getByText("My workbench")).toBeInTheDocument();
    expect(screen.getByText("Module runway")).toBeInTheDocument();

    expect(screen.getByText("Email gateway outage")).toBeInTheDocument();
    expect(screen.getByText("Endpoint refresh")).toBeInTheDocument();
    expect(screen.getByText("Database failover review")).toBeInTheDocument();

    expect(screen.getAllByTestId("donut-chart")).toHaveLength(2);
    expect(screen.getByTestId("gauge-chart")).toBeInTheDocument();
    expect(screen.getByTestId("progress-ring")).toBeInTheDocument();
  });

  it("renders empty-state guidance when no personal work is present", () => {
    setEmptyState();

    render(<ITSMHubPage />);

    expect(screen.getByText("Queue clear")).toBeInTheDocument();
    expect(screen.getByText("No requests in motion")).toBeInTheDocument();
    expect(screen.getByText("Problem backlog is quiet")).toBeInTheDocument();
  });
});

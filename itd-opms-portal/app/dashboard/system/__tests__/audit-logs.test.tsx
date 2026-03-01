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
  usePathname: () => "/dashboard/system/audit-logs",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockUseAuditLogs = vi.fn();
const mockUseAuditStats = vi.fn();
const mockUseAuditTimeline = vi.fn();
const mockVerifyMutate = vi.fn();
const mockExportMutate = vi.fn();
const mockUseSearchUsers = vi.fn();

vi.mock("@/hooks/use-system", () => ({
  useAuditLogs: (...args: unknown[]) => mockUseAuditLogs(...args),
  useAuditStats: (...args: unknown[]) => mockUseAuditStats(...args),
  useAuditTimeline: (...args: unknown[]) => mockUseAuditTimeline(...args),
  useVerifyIntegrity: () => ({
    mutate: mockVerifyMutate,
    isPending: false,
  }),
  useExportAuditLogs: () => ({
    mutate: mockExportMutate,
    isPending: false,
  }),
  useSearchUsers: (...args: unknown[]) => mockUseSearchUsers(...args),
}));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "admin@example.com",
      displayName: "Admin",
      permissions: ["*"],
    },
    isLoading: false,
  }),
}));

vi.mock("@/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: React.PropsWithChildren) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

vi.mock("@/components/shared/json-diff", () => ({
  JsonDiff: () => <div data-testid="json-diff" />,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        initial: _i,
        animate: _a,
        transition: _t,
        exit: _e,
        whileHover: _wh,
        whileTap: _wt,
        ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import AuditLogExplorerPage from "../audit-logs/page";

// =============================================================================
// Test Data
// =============================================================================

const mockEvents = [
  {
    id: "evt-1",
    action: "create",
    entityType: "user",
    entityId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    actorName: "Admin User",
    actorRole: "admin",
    ipAddress: "192.168.1.1",
    createdAt: new Date().toISOString(),
    correlationId: "corr-1234",
    checksum: "abc123def456",
    userAgent: "Mozilla/5.0",
    previousState: null,
    changes: { name: "New User" },
  },
  {
    id: "evt-2",
    action: "update",
    entityType: "role",
    entityId: "11111111-2222-3333-4444-555555555555",
    actorName: "Manager",
    actorRole: "manager",
    ipAddress: "10.0.0.1",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    correlationId: "corr-5678",
    checksum: "xyz789",
    userAgent: "Chrome/120",
    previousState: { permissions: [] },
    changes: { permissions: ["read"] },
  },
];

const mockStats = {
  totalEvents: 1500,
  eventsPerDay: [
    { date: "2025-01-10", count: 50 },
    { date: "2025-01-11", count: 75 },
  ],
  topActors: [{ actorName: "Admin User", count: 200 }],
  topEntities: [{ entityType: "user", count: 300 }],
  topActions: [{ action: "create", count: 400 }],
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuditLogs.mockReturnValue({
    data: {
      data: mockEvents,
      meta: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    },
    isLoading: false,
  });
  mockUseAuditStats.mockReturnValue({
    data: mockStats,
    isLoading: false,
  });
  mockUseAuditTimeline.mockReturnValue({
    data: [],
    isLoading: false,
  });
  mockUseSearchUsers.mockReturnValue({
    data: [],
  });
});

// =============================================================================
// Tests
// =============================================================================

describe("AuditLogExplorerPage", () => {
  it("renders the page header", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Audit Log Explorer")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Browse, filter, and verify the immutable audit trail.",
      ),
    ).toBeInTheDocument();
  }, 15_000);

  it("renders the audit event list", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });

  it("displays event count", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("2 events found")).toBeInTheDocument();
    });
  });

  it("renders action badges for events", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("create")).toBeInTheDocument();
    });
    expect(screen.getByText("update")).toBeInTheDocument();
  });

  it("renders entity type column", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("User")).toBeInTheDocument();
    });
    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("renders table headers", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Timestamp")).toBeInTheDocument();
    });
    expect(screen.getByText("Actor")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Entity Type")).toBeInTheDocument();
    expect(screen.getByText("Entity ID")).toBeInTheDocument();
    expect(screen.getByText("IP Address")).toBeInTheDocument();
  });

  it("renders Verify Integrity button", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Verify Integrity")).toBeInTheDocument();
    });
  });

  it("renders Export button", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Export")).toBeInTheDocument();
    });
  });

  it("renders search input for filtering", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search audit logs..."),
      ).toBeInTheDocument();
    });
  });

  it("renders date preset filters", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("renders Apply and Clear buttons", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Apply")).toBeInTheDocument();
    });
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("renders total events in stats panel", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Events")).toBeInTheDocument();
    });
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("shows loading state for logs", async () => {
    mockUseAuditLogs.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  it("shows empty state when no events", async () => {
    mockUseAuditLogs.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } },
      isLoading: false,
    });

    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No audit events found matching your filters."),
      ).toBeInTheDocument();
    });
  });

  it("renders Advanced Filters toggle", async () => {
    render(<AuditLogExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText("Advanced Filters")).toBeInTheDocument();
    });
  });
});

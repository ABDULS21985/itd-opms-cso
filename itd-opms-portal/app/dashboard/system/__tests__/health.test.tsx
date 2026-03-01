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
  usePathname: () => "/dashboard/system/health",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockUsePlatformHealth = vi.fn();
const mockUseSystemStats = vi.fn();
const mockUseDirectorySyncStatus = vi.fn();
const mockRefetchHealth = vi.fn();
const mockRefetchSync = vi.fn();

vi.mock("@/hooks/use-system", () => ({
  usePlatformHealth: (...args: unknown[]) => mockUsePlatformHealth(...args),
  useSystemStats: (...args: unknown[]) => mockUseSystemStats(...args),
  useDirectorySyncStatus: (...args: unknown[]) =>
    mockUseDirectorySyncStatus(...args),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
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

import HealthPage from "../health/page";

// =============================================================================
// Test Data
// =============================================================================

const mockHealthData = {
  status: "healthy",
  version: "1.5.0",
  uptime: "72h 15m",
  services: [
    {
      name: "postgres",
      status: "up",
      latency: "2ms",
      details: "Primary database",
    },
    {
      name: "redis",
      status: "up",
      latency: "1ms",
      details: "Cache & pub/sub",
    },
    {
      name: "minio",
      status: "up",
      latency: "5ms",
      details: "Object storage",
    },
    {
      name: "nats",
      status: "degraded",
      latency: "15ms",
      details: "Message broker",
    },
  ],
};

const mockStatsData = {
  users: {
    totalUsers: 150,
    activeUsers: 120,
    inactiveUsers: 30,
    onlineNow: 25,
    newThisMonth: 8,
  },
  database: {
    size: "2.4 GB",
    tableCount: 48,
    activeConnections: 15,
    maxConnections: 100,
  },
  auditEvents: {
    totalEvents: 50000,
    eventsToday: 320,
  },
  storage: {
    totalObjects: 1200,
    totalSize: "450 MB",
    evidenceItems: 340,
    attachments: 860,
  },
  modules: [
    { name: "tickets", recordCount: 2500, activeItems: 180 },
    { name: "assets", recordCount: 1200, activeItems: 1100 },
  ],
};

const mockSyncData = {
  enabled: true,
  lastSync: "2025-01-15T10:00:00Z",
  nextScheduled: "2025-01-15T11:00:00Z",
  lastSyncStatus: "success",
  syncHistory: [
    {
      id: "sync-1",
      status: "completed",
      startedAt: "2025-01-15T10:00:00Z",
      completedAt: "2025-01-15T10:02:00Z",
      usersAdded: 5,
      usersUpdated: 12,
      usersRemoved: 1,
      errors: 0,
      errorDetails: "",
    },
  ],
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePlatformHealth.mockReturnValue({
    data: mockHealthData,
    isLoading: false,
    refetch: mockRefetchHealth,
  });
  mockUseSystemStats.mockReturnValue({
    data: mockStatsData,
    isLoading: false,
  });
  mockUseDirectorySyncStatus.mockReturnValue({
    data: mockSyncData,
    refetch: mockRefetchSync,
  });
});

// =============================================================================
// Tests
// =============================================================================

describe("HealthPage", () => {
  it("renders the page header", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Platform Health")).toBeInTheDocument();
    });
  }, 15_000);

  it("displays version and uptime information", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText(/v1\.5\.0/)).toBeInTheDocument();
    });
    expect(screen.getByText(/72h 15m/)).toBeInTheDocument();
  });

  it("renders health status badge as Healthy", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });
  });

  it("renders Refresh button", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });
  });

  it("renders Service Status section", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Service Status")).toBeInTheDocument();
    });
  });

  it("displays individual service cards", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("postgres")).toBeInTheDocument();
    });
    expect(screen.getByText("redis")).toBeInTheDocument();
    expect(screen.getByText("minio")).toBeInTheDocument();
    expect(screen.getByText("nats")).toBeInTheDocument();
  });

  it("shows service status text for each service", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      const upTexts = screen.getAllByText("up");
      expect(upTexts.length).toBe(3);
    });
    expect(screen.getByText("degraded")).toBeInTheDocument();
  });

  it("shows service latency", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("2ms")).toBeInTheDocument();
    });
    expect(screen.getByText("1ms")).toBeInTheDocument();
    expect(screen.getByText("5ms")).toBeInTheDocument();
    expect(screen.getByText("15ms")).toBeInTheDocument();
  });

  it("renders System Statistics section", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("System Statistics")).toBeInTheDocument();
    });
  });

  it("displays user statistics", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeInTheDocument();
    });
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("Online Now")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("displays database statistics", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Database Size")).toBeInTheDocument();
    });
    expect(screen.getByText("2.4 GB")).toBeInTheDocument();
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
  });

  it("displays DB connection gauge", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("DB Connections")).toBeInTheDocument();
    });
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
    expect(screen.getByText("15% utilization")).toBeInTheDocument();
  });

  it("displays storage statistics", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Storage Objects")).toBeInTheDocument();
    });
    // 1200 appears both in Storage Objects and in module table (assets recordCount)
    const values1200 = screen.getAllByText("1200");
    expect(values1200.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Total Size")).toBeInTheDocument();
    expect(screen.getByText("450 MB")).toBeInTheDocument();
  });

  it("displays module record counts table", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Module Record Counts")).toBeInTheDocument();
    });
    expect(screen.getByText("tickets")).toBeInTheDocument();
    expect(screen.getByText("assets")).toBeInTheDocument();
  });

  it("renders Directory Sync section", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Directory Sync")).toBeInTheDocument();
    });
  });

  it("shows sync enabled status", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Enabled")).toBeInTheDocument();
    });
  });

  it("renders Trigger Sync button", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Trigger Sync")).toBeInTheDocument();
    });
  });

  it("renders Sync History table", async () => {
    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Sync History")).toBeInTheDocument();
    });
  });

  it("shows loading skeletons for health data", async () => {
    mockUsePlatformHealth.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetchHealth,
    });

    const { container } = render(<HealthPage />);

    await waitFor(() => {
      const pulsingElements = container.querySelectorAll(".animate-pulse");
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  it("shows loading skeletons for stats data", async () => {
    mockUseSystemStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<HealthPage />);

    await waitFor(() => {
      const pulsingElements = container.querySelectorAll(".animate-pulse");
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  it("shows Unhealthy badge when status is down", async () => {
    mockUsePlatformHealth.mockReturnValue({
      data: { ...mockHealthData, status: "down" },
      isLoading: false,
      refetch: mockRefetchHealth,
    });

    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Unhealthy")).toBeInTheDocument();
    });
  });

  it("shows Degraded badge when status is degraded", async () => {
    mockUsePlatformHealth.mockReturnValue({
      data: { ...mockHealthData, status: "degraded" },
      isLoading: false,
      refetch: mockRefetchHealth,
    });

    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });
  });
});

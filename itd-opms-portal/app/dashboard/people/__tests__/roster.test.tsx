import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";

// =============================================================================
// Mock: framer-motion
// =============================================================================
vi.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get:
        (_target: unknown, prop: string) =>
        ({ children, ...rest }: Record<string, unknown>) => {
          const {
            initial,
            animate,
            exit,
            transition,
            layout,
            layoutId,
            whileHover,
            whileTap,
            whileFocus,
            variants,
            ...safeRest
          } = rest;
          return React.createElement(prop, safeRest, children);
        },
    },
  );
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// =============================================================================
// Mock: app dependencies
// =============================================================================
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", displayName: "Roster Admin" },
    isLoading: false,
    isLoggedIn: true,
  }),
}));

const mockUseRosters = vi.fn();
const mockUseLeaveRecords = vi.fn();
const mockUseCreateRoster = vi.fn();
const mockUseCreateLeaveRecord = vi.fn();
const mockUseUpdateLeaveRecordStatus = vi.fn();

vi.mock("@/hooks/use-people", () => ({
  useRosters: (...args: unknown[]) => mockUseRosters(...args),
  useLeaveRecords: (...args: unknown[]) => mockUseLeaveRecords(...args),
  useCreateRoster: (...args: unknown[]) => mockUseCreateRoster(...args),
  useCreateLeaveRecord: (...args: unknown[]) => mockUseCreateLeaveRecord(...args),
  useUpdateLeaveRecordStatus: (...args: unknown[]) =>
    mockUseUpdateLeaveRecordStatus(...args),
}));

const mockUseUsers = vi.fn();
const mockUseUserStats = vi.fn();

vi.mock("@/hooks/use-system", () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
  useUserStats: (...args: unknown[]) => mockUseUserStats(...args),
}));

vi.mock("@/components/shared/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
}));

vi.mock("@/components/shared/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/shared/form-field", () => ({
  FormField: () => <div data-testid="form-field" />,
}));

// =============================================================================
// Import after mocks
// =============================================================================
import RosterPage from "../roster/page";

// =============================================================================
// Shared setup
// =============================================================================
const mockRosters = [
  {
    id: "roster-1",
    name: "Network Operations Week 10",
    teamId: "team-abc-12345678",
    status: "published",
    periodStart: "2026-03-02T00:00:00Z",
    periodEnd: "2026-03-08T00:00:00Z",
    shifts: [
      {
        day: "Monday",
        shift: "Morning",
        staff: "John Doe",
        startTime: "08:00",
        endTime: "16:00",
      },
      {
        day: "Tuesday",
        shift: "Night",
        staff: "Jane Smith",
        startTime: "16:00",
        endTime: "00:00",
      },
    ],
    tenantId: "tenant-1",
    createdAt: "2026-02-25T00:00:00Z",
    updatedAt: "2026-02-28T00:00:00Z",
  },
  {
    id: "roster-2",
    name: "Helpdesk Coverage March",
    teamId: "team-def-87654321",
    status: "draft",
    periodStart: "2026-03-01T00:00:00Z",
    periodEnd: "2026-03-31T00:00:00Z",
    shifts: [],
    tenantId: "tenant-1",
    createdAt: "2026-02-20T00:00:00Z",
    updatedAt: "2026-02-20T00:00:00Z",
  },
];

function setSharedMocks() {
  mockUseUserStats.mockReturnValue({
    data: {
      totalUsers: 120,
      activeUsers: 111,
      inactiveUsers: 9,
      onlineNow: 34,
      newThisMonth: 6,
    },
    isLoading: false,
  });

  mockUseLeaveRecords.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 1,
        totalItems: 4,
        totalPages: 1,
      },
    },
    isLoading: false,
  });

  mockUseCreateRoster.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mockUseCreateLeaveRecord.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mockUseUpdateLeaveRecordStatus.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseUsers.mockReturnValue({
    data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
    isLoading: false,
  });
}

// =============================================================================
// Tests
// =============================================================================
describe("RosterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSharedMocks();
  });

  it("lands on the upgraded roster workspace by default", () => {
    mockUseRosters.mockReturnValue({
      data: {
        data: mockRosters,
        meta: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("Team Rosters")).toBeInTheDocument();
    expect(screen.getByText(/Coverage command/)).toBeInTheDocument();
    expect(screen.getByText("Shift roster execution")).toBeInTheDocument();
    expect(screen.getByText("Network Operations Week 10")).toBeInTheDocument();
    expect(screen.getByText("Helpdesk Coverage March")).toBeInTheDocument();
    expect(screen.getAllByText("Create Roster").length).toBeGreaterThan(0);
  });

  it("renders the stronger empty state when no rosters exist", () => {
    mockUseRosters.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("Team Rosters")).toBeInTheDocument();
    expect(screen.getByText("No rosters found")).toBeInTheDocument();
    expect(
      screen.getByText("Create a roster to start managing team schedules."),
    ).toBeInTheDocument();
  });
});

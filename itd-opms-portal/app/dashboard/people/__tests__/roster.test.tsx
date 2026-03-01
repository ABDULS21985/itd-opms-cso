import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@/test/test-utils";
import { render } from "@/test/test-utils";

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
        ({ children, ...rest }: Record<string, unknown>) =>
          React.createElement(prop, rest, children),
    },
  );
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// =============================================================================
// Mock: @/hooks/use-people
// =============================================================================
const mockUseRosters = vi.fn();

vi.mock("@/hooks/use-people", () => ({
  useRosters: (...args: unknown[]) => mockUseRosters(...args),
}));

// =============================================================================
// Import after mocks
// =============================================================================
import RosterPage from "../roster/page";

// =============================================================================
// Test data
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
        day: "Monday",
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

const mockMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 2,
  totalPages: 1,
};

// =============================================================================
// Tests
// =============================================================================
describe("RosterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header with title and description", { timeout: 15000 }, () => {
    mockUseRosters.mockReturnValue({
      data: { data: mockRosters, meta: mockMeta },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("Team Rosters")).toBeInTheDocument();
    expect(
      screen.getByText("Manage shift schedules, team rosters, and staffing"),
    ).toBeInTheDocument();
  });

  it("renders loading state while data is being fetched", () => {
    mockUseRosters.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<RosterPage />);

    // The page shows a Loader2 spinner when loading
    // We can check for the animate-spin class or just check it's not showing rosters
    expect(screen.queryByText("Network Operations Week 10")).not.toBeInTheDocument();
    expect(screen.queryByText("No rosters found")).not.toBeInTheDocument();
  });

  it("renders empty state when there are no rosters", () => {
    mockUseRosters.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("No rosters found")).toBeInTheDocument();
    expect(
      screen.getByText("Create a roster to start managing team schedules."),
    ).toBeInTheDocument();
  });

  it("renders roster cards when data is available", () => {
    mockUseRosters.mockReturnValue({
      data: { data: mockRosters, meta: mockMeta },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("Network Operations Week 10")).toBeInTheDocument();
    expect(screen.getByText("Helpdesk Coverage March")).toBeInTheDocument();
  });

  it("shows the status badges on roster cards", () => {
    mockUseRosters.mockReturnValue({
      data: { data: mockRosters, meta: mockMeta },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("published")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("shows shift count on roster cards", () => {
    mockUseRosters.mockReturnValue({
      data: { data: mockRosters, meta: mockMeta },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("2 shifts")).toBeInTheDocument();
    expect(screen.getByText("0 shifts")).toBeInTheDocument();
  });

  it("shows the 'Create Roster' and 'Filters' buttons", () => {
    mockUseRosters.mockReturnValue({
      data: { data: mockRosters, meta: mockMeta },
      isLoading: false,
    });

    render(<RosterPage />);

    expect(screen.getByText("Create Roster")).toBeInTheDocument();
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });
});

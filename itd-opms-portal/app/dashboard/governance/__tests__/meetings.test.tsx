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
// Mock: @/hooks/use-governance
// =============================================================================
const mockUseMeetings = vi.fn();
const mockUseActionItems = vi.fn();
const mockUseCompleteAction = vi.fn();

vi.mock("@/hooks/use-governance", () => ({
  useMeetings: (...args: unknown[]) => mockUseMeetings(...args),
  useActionItems: (...args: unknown[]) => mockUseActionItems(...args),
  useCompleteAction: (...args: unknown[]) => mockUseCompleteAction(...args),
}));

// =============================================================================
// Mock: @/lib/utils — formatDate
// =============================================================================
vi.mock("@/lib/utils", () => ({
  formatDate: (date: string) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-US");
  },
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// =============================================================================
// Mock: @/components/shared/data-table
// =============================================================================
vi.mock("@/components/shared/data-table", () => {
  const React = require("react");
  return {
    DataTable: ({
      data,
      loading,
      emptyTitle,
      emptyDescription,
      columns,
    }: {
      data: unknown[];
      loading: boolean;
      emptyTitle?: string;
      emptyDescription?: string;
      columns: { header: string }[];
    }) => {
      if (loading) {
        return React.createElement("div", { "data-testid": "loading-skeleton" }, "Loading...");
      }
      if (data.length === 0) {
        return React.createElement(
          "div",
          { "data-testid": "empty-state" },
          React.createElement("p", null, emptyTitle),
          React.createElement("p", null, emptyDescription),
        );
      }
      return React.createElement(
        "table",
        { "data-testid": "data-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            columns.map((col: { header: string }, i: number) =>
              React.createElement("th", { key: i }, col.header),
            ),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          (data as Record<string, unknown>[]).map((item, i: number) =>
            React.createElement(
              "tr",
              { key: (item.id as string) ?? i },
              React.createElement("td", null, item.title as string),
            ),
          ),
        ),
      );
    },
  };
});

// =============================================================================
// Mock: @/components/shared/status-badge
// =============================================================================
vi.mock("@/components/shared/status-badge", () => {
  const React = require("react");
  return {
    StatusBadge: ({ status }: { status: string }) =>
      React.createElement("span", { "data-testid": "status-badge" }, status),
  };
});

// =============================================================================
// Import after mocks
// =============================================================================
import MeetingsAndActionsPage from "../meetings/page";

// =============================================================================
// Test data
// =============================================================================
const mockMeetings = [
  {
    id: "mtg-1",
    title: "IT Steering Committee Q1",
    meetingType: "steering_committee",
    scheduledAt: "2026-03-15T10:00:00Z",
    organizerId: "user-abc-12345678",
    status: "scheduled",
    tenantId: "tenant-1",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "mtg-2",
    title: "Change Advisory Board",
    meetingType: "advisory",
    scheduledAt: "2026-03-20T14:00:00Z",
    organizerId: "user-def-87654321",
    status: "completed",
    tenantId: "tenant-1",
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-03-20T16:00:00Z",
  },
];

const mockActions = [
  {
    id: "act-1",
    title: "Update disaster recovery plan",
    sourceType: "meeting_decision",
    ownerId: "user-abc-12345678",
    dueDate: "2026-04-01T00:00:00Z",
    priority: "high",
    status: "open",
    tenantId: "tenant-1",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
];

const mockMeetingMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 2,
  totalPages: 1,
};

const mockActionMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
};

// =============================================================================
// Tests
// =============================================================================
describe("MeetingsAndActionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCompleteAction.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders the page header with title and description", { timeout: 15000 }, () => {
    mockUseMeetings.mockReturnValue({
      data: { data: mockMeetings, meta: mockMeetingMeta },
      isLoading: false,
    });
    mockUseActionItems.mockReturnValue({
      data: { data: mockActions, meta: mockActionMeta },
      isLoading: false,
    });

    render(<MeetingsAndActionsPage />);

    expect(screen.getByText("Meetings & Action Items")).toBeInTheDocument();
    expect(
      screen.getByText("Schedule meetings, track decisions, and manage action items."),
    ).toBeInTheDocument();
  });

  it("renders loading state when meetings are being fetched", () => {
    mockUseMeetings.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockUseActionItems.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<MeetingsAndActionsPage />);

    // Default tab is "meetings", so the meetings DataTable should be loading
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when there are no meetings", () => {
    mockUseMeetings.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });
    mockUseActionItems.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<MeetingsAndActionsPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No meetings found")).toBeInTheDocument();
  });

  it("renders meetings in the data table when data is available", () => {
    mockUseMeetings.mockReturnValue({
      data: { data: mockMeetings, meta: mockMeetingMeta },
      isLoading: false,
    });
    mockUseActionItems.mockReturnValue({
      data: { data: mockActions, meta: mockActionMeta },
      isLoading: false,
    });

    render(<MeetingsAndActionsPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("IT Steering Committee Q1")).toBeInTheDocument();
    expect(screen.getByText("Change Advisory Board")).toBeInTheDocument();
  });

  it("shows 'Schedule Meeting' link and 'Meetings' / 'Action Items' tabs", () => {
    mockUseMeetings.mockReturnValue({
      data: { data: mockMeetings, meta: mockMeetingMeta },
      isLoading: false,
    });
    mockUseActionItems.mockReturnValue({
      data: { data: mockActions, meta: mockActionMeta },
      isLoading: false,
    });

    render(<MeetingsAndActionsPage />);

    expect(screen.getByText("Schedule Meeting")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    expect(screen.getByText("Action Items")).toBeInTheDocument();
  });

  it("shows status filter dropdown", () => {
    mockUseMeetings.mockReturnValue({
      data: { data: mockMeetings, meta: mockMeetingMeta },
      isLoading: false,
    });
    mockUseActionItems.mockReturnValue({
      data: { data: mockActions, meta: mockActionMeta },
      isLoading: false,
    });

    render(<MeetingsAndActionsPage />);

    expect(screen.getByText("All Statuses")).toBeInTheDocument();
  });
});

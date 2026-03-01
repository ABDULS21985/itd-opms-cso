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
const mockUseOKRs = vi.fn();
const mockUseOKRTree = vi.fn();

vi.mock("@/hooks/use-governance", () => ({
  useOKRs: (...args: unknown[]) => mockUseOKRs(...args),
  useOKRTree: (...args: unknown[]) => mockUseOKRTree(...args),
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
          data.map((item: Record<string, unknown>, i: number) =>
            React.createElement(
              "tr",
              { key: (item.id as string) ?? i },
              React.createElement("td", null, item.objective as string),
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
import OKRListPage from "../okrs/page";

// =============================================================================
// Test data
// =============================================================================
const mockOKRs = [
  {
    id: "okr-1",
    objective: "Improve Infrastructure Reliability",
    level: "department",
    period: "Q1 2026",
    status: "active",
    progressPct: 65,
    ownerId: "user-abc-12345678",
    parentId: null,
    children: [],
    tenantId: "tenant-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-02-15T00:00:00Z",
  },
  {
    id: "okr-2",
    objective: "Reduce Mean Time to Recovery",
    level: "division",
    period: "Q1 2026",
    status: "active",
    progressPct: 40,
    ownerId: "user-def-87654321",
    parentId: "okr-1",
    children: [],
    tenantId: "tenant-1",
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-02-15T00:00:00Z",
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
describe("OKRListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: tree hook returns no data (disabled)
    mockUseOKRTree.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders the page header with title and description", { timeout: 15000 }, () => {
    mockUseOKRs.mockReturnValue({
      data: { data: mockOKRs, meta: mockMeta },
      isLoading: false,
    });

    render(<OKRListPage />);

    expect(screen.getByText("Objectives & Key Results")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Set and track objectives across department, division, office, and unit levels.",
      ),
    ).toBeInTheDocument();
  });

  it("renders loading state when data is being fetched", () => {
    mockUseOKRs.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<OKRListPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when there are no OKRs", () => {
    mockUseOKRs.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<OKRListPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No OKRs found")).toBeInTheDocument();
  });

  it("renders OKRs in the data table when data is available", () => {
    mockUseOKRs.mockReturnValue({
      data: { data: mockOKRs, meta: mockMeta },
      isLoading: false,
    });

    render(<OKRListPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("Improve Infrastructure Reliability")).toBeInTheDocument();
    expect(screen.getByText("Reduce Mean Time to Recovery")).toBeInTheDocument();
  });

  it("shows the 'New OKR' link", () => {
    mockUseOKRs.mockReturnValue({
      data: { data: mockOKRs, meta: mockMeta },
      isLoading: false,
    });

    render(<OKRListPage />);

    expect(screen.getByText("New OKR")).toBeInTheDocument();
  });

  it("shows List and Tree view toggle buttons", () => {
    mockUseOKRs.mockReturnValue({
      data: { data: mockOKRs, meta: mockMeta },
      isLoading: false,
    });

    render(<OKRListPage />);

    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Tree")).toBeInTheDocument();
  });

  it("shows filter controls for level, period, and status", () => {
    mockUseOKRs.mockReturnValue({
      data: { data: mockOKRs, meta: mockMeta },
      isLoading: false,
    });

    render(<OKRListPage />);

    expect(screen.getByText("All Levels")).toBeInTheDocument();
    expect(screen.getByText("All Statuses")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Filter by period...")).toBeInTheDocument();
  });
});

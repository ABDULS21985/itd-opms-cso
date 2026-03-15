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
// Mock: @/hooks/use-grc
// =============================================================================
const mockUseRisks = vi.fn();
const mockUseRiskHeatMap = vi.fn();

vi.mock("@/hooks/use-grc", () => ({
  useRisks: (...args: unknown[]) => mockUseRisks(...args),
  useRiskHeatMap: (...args: unknown[]) => mockUseRiskHeatMap(...args),
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
import GRCRisksPage from "../risks/page";

// =============================================================================
// Test data
// =============================================================================
const mockRisks = [
  {
    id: "risk-1",
    riskNumber: "RISK-001",
    title: "Ransomware Attack",
    category: "security",
    likelihood: "high",
    impact: "very_high",
    riskScore: 20,
    status: "mitigating",
    ownerId: "user-abc-12345678",
    tenantId: "tenant-1",
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "risk-2",
    riskNumber: "RISK-002",
    title: "Key Person Dependency",
    category: "operational",
    likelihood: "medium",
    impact: "high",
    riskScore: 12,
    status: "identified",
    ownerId: "user-def-87654321",
    tenantId: "tenant-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
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
describe("GRCRisksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRiskHeatMap.mockReturnValue({
      data: [],
    });
  });

  it("renders the page header with title and description", { timeout: 15000 }, () => {
    mockUseRisks.mockReturnValue({
      data: { data: mockRisks, meta: mockMeta },
      isLoading: false,
    });

    render(<GRCRisksPage />);

    expect(screen.getByText("GRC Risk Register")).toBeInTheDocument();
    expect(
      screen.getByText("Identify, assess, treat, and monitor enterprise risks"),
    ).toBeInTheDocument();
  });

  it("renders loading state while data is being fetched", () => {
    mockUseRisks.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<GRCRisksPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when no risks exist", () => {
    mockUseRisks.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<GRCRisksPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No risks found")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first GRC risk entry to begin tracking."),
    ).toBeInTheDocument();
  });

  it("renders risks in the data table when data is available", () => {
    mockUseRisks.mockReturnValue({
      data: { data: mockRisks, meta: mockMeta },
      isLoading: false,
    });

    render(<GRCRisksPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("Ransomware Attack")).toBeInTheDocument();
    expect(screen.getByText("Key Person Dependency")).toBeInTheDocument();
  });

  it("shows the Risk Heat Map section", () => {
    mockUseRisks.mockReturnValue({
      data: { data: mockRisks, meta: mockMeta },
      isLoading: false,
    });

    render(<GRCRisksPage />);

    expect(screen.getByText("Risk Heat Map")).toBeInTheDocument();
    // "Likelihood" and "Impact" may appear multiple times in the heat map grid
    // (axis label + row/column labels), so use getAllByText
    expect(screen.getAllByText("Likelihood").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Impact").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the 'Add Risk' and 'Filters' buttons", () => {
    mockUseRisks.mockReturnValue({
      data: { data: mockRisks, meta: mockMeta },
      isLoading: false,
    });

    render(<GRCRisksPage />);

    expect(screen.getByText("Add Risk")).toBeInTheDocument();
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });
});

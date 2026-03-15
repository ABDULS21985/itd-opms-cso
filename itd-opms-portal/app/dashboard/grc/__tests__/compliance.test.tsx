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
const mockUseComplianceControls = vi.fn();
const mockUseComplianceStats = vi.fn();

vi.mock("@/hooks/use-grc", () => ({
  useComplianceControls: (...args: unknown[]) => mockUseComplianceControls(...args),
  useComplianceStats: (...args: unknown[]) => mockUseComplianceStats(...args),
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
              React.createElement("td", null, item.controlName as string),
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
import ComplianceDashboardPage from "../compliance/page";

// =============================================================================
// Test data
// =============================================================================
const mockControls = [
  {
    id: "ctrl-1",
    controlId: "ISO-A.5.1",
    controlName: "Information Security Policy Set",
    framework: "ISO_27001",
    implementationStatus: "implemented",
    ownerId: "user-abc-12345678",
    lastAssessedAt: "2026-01-20T00:00:00Z",
    tenantId: "tenant-1",
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2026-01-20T00:00:00Z",
  },
  {
    id: "ctrl-2",
    controlId: "COBIT-APO01",
    controlName: "Manage the IT Management Framework",
    framework: "COBIT",
    implementationStatus: "partial",
    ownerId: "user-def-87654321",
    lastAssessedAt: "2026-02-10T00:00:00Z",
    tenantId: "tenant-1",
    createdAt: "2025-08-15T00:00:00Z",
    updatedAt: "2026-02-10T00:00:00Z",
  },
];

const mockStats = [
  {
    framework: "ISO 27001",
    compliantCount: 14,
    total: 20,
  },
  {
    framework: "COBIT",
    compliantCount: 8,
    total: 15,
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
describe("ComplianceDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header with title and description", { timeout: 15000 }, () => {
    mockUseComplianceControls.mockReturnValue({
      data: { data: mockControls, meta: mockMeta },
      isLoading: false,
    });
    mockUseComplianceStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
    });

    render(<ComplianceDashboardPage />);

    expect(screen.getByText("Compliance Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Framework mapping, control tracking, and compliance posture"),
    ).toBeInTheDocument();
  });

  it("renders loading state while controls are being fetched", () => {
    mockUseComplianceControls.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockUseComplianceStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ComplianceDashboardPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when no compliance controls exist", () => {
    mockUseComplianceControls.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });
    mockUseComplianceStats.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ComplianceDashboardPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No compliance controls found")).toBeInTheDocument();
    expect(
      screen.getByText("Add compliance controls to track your regulatory posture."),
    ).toBeInTheDocument();
  });

  it("renders controls in the data table when data is available", () => {
    mockUseComplianceControls.mockReturnValue({
      data: { data: mockControls, meta: mockMeta },
      isLoading: false,
    });
    mockUseComplianceStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
    });

    render(<ComplianceDashboardPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("Information Security Policy Set")).toBeInTheDocument();
    expect(screen.getByText("Manage the IT Management Framework")).toBeInTheDocument();
  });

  it("renders framework stats cards when stats are available", () => {
    mockUseComplianceControls.mockReturnValue({
      data: { data: mockControls, meta: mockMeta },
      isLoading: false,
    });
    mockUseComplianceStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
    });

    render(<ComplianceDashboardPage />);

    // "ISO 27001" appears in both the stats card and the framework tab
    expect(screen.getAllByText("ISO 27001").length).toBeGreaterThanOrEqual(1);
    // "COBIT" also appears in both stats card and framework tab
    expect(screen.getAllByText("COBIT").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("70%")).toBeInTheDocument(); // 14/20
    expect(screen.getByText("53%")).toBeInTheDocument(); // 8/15
  });

  it("shows the 'Add Control' and 'Filters' buttons", () => {
    mockUseComplianceControls.mockReturnValue({
      data: { data: mockControls, meta: mockMeta },
      isLoading: false,
    });
    mockUseComplianceStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
    });

    render(<ComplianceDashboardPage />);

    expect(screen.getByText("Add Control")).toBeInTheDocument();
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("shows framework tab navigation", () => {
    mockUseComplianceControls.mockReturnValue({
      data: { data: mockControls, meta: mockMeta },
      isLoading: false,
    });
    mockUseComplianceStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
    });

    render(<ComplianceDashboardPage />);

    expect(screen.getByText("All")).toBeInTheDocument();
    // "ISO 27001" appears in both stats card and framework tab, so use getAllByText
    expect(screen.getAllByText("ISO 27001").length).toBeGreaterThanOrEqual(2);
  });
});

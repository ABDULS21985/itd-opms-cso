import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import RisksPage from "../page";

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
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
  },
}));

// ---------------------------------------------------------------------------
// Mock: hooks/use-planning
// ---------------------------------------------------------------------------
const mockUseRisks = vi.fn();

vi.mock("@/hooks/use-planning", () => ({
  useRisks: (...args: any[]) => mockUseRisks(...args),
}));

// ---------------------------------------------------------------------------
// Mock: components/shared/data-table
// ---------------------------------------------------------------------------
vi.mock("@/components/shared/data-table", () => ({
  DataTable: ({
    data,
    loading,
    emptyTitle,
    emptyDescription,
    emptyAction,
    columns,
  }: any) => (
    <div data-testid="data-table">
      {loading && <div data-testid="table-loading">Loading...</div>}
      {!loading && data.length === 0 && (
        <div data-testid="table-empty">
          <p>{emptyTitle}</p>
          <p>{emptyDescription}</p>
          {emptyAction}
        </div>
      )}
      {!loading && data.length > 0 && (
        <table>
          <thead>
            <tr>
              {columns.map((col: any) => (
                <th key={col.key} data-testid={`col-header-${col.key}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item: any) => (
              <tr key={item.id} data-testid="risk-row">
                <td>{item.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: components/shared/status-badge
// ---------------------------------------------------------------------------
vi.mock("@/components/shared/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const mockRisks = [
  {
    id: "risk-1",
    title: "Vendor delivery delay",
    category: "operational",
    likelihood: "high",
    impact: "medium",
    riskScore: 12,
    status: "identified",
    ownerId: "user-1",
    projectId: "proj-1",
  },
  {
    id: "risk-2",
    title: "Budget overrun",
    category: "financial",
    likelihood: "medium",
    impact: "high",
    riskScore: 12,
    status: "mitigating",
    ownerId: "user-2",
    projectId: "proj-1",
  },
  {
    id: "risk-3",
    title: "Key staff departure",
    category: "resource",
    likelihood: "low",
    impact: "very_high",
    riskScore: 10,
    status: "assessed",
    ownerId: null,
    projectId: "proj-2",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("RisksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Rendering ----------------------------------------------------------
  describe("rendering", () => {
    it("renders the page heading and description", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.getByText("Risk Register")).toBeInTheDocument();
      expect(
        screen.getByText("Identify, assess, and manage project risks"),
      ).toBeInTheDocument();
    });

    it("renders the New Risk button", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      const btn = screen.getByText("New Risk");
      expect(btn).toBeInTheDocument();
      expect(btn.closest("button")).not.toBeNull();
    });

    it("renders the Filters button", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      const btn = screen.getByText("Filters");
      expect(btn).toBeInTheDocument();
      expect(btn.closest("button")).not.toBeNull();
    });
  });

  // -- Risk data table ----------------------------------------------------
  describe("risk data table", () => {
    it("renders the data table with risks", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      const rows = screen.getAllByTestId("risk-row");
      expect(rows).toHaveLength(3);
    });

    it("renders risk titles in the table", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.getByText("Vendor delivery delay")).toBeInTheDocument();
      expect(screen.getByText("Budget overrun")).toBeInTheDocument();
      expect(screen.getByText("Key staff departure")).toBeInTheDocument();
    });

    it("renders column headers via data-testid", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.getByTestId("col-header-title")).toHaveTextContent("Title");
      expect(screen.getByTestId("col-header-category")).toHaveTextContent("Category");
      expect(screen.getByTestId("col-header-likelihood")).toHaveTextContent("Likelihood");
      expect(screen.getByTestId("col-header-impact")).toHaveTextContent("Impact");
      expect(screen.getByTestId("col-header-riskScore")).toHaveTextContent("Score");
    });
  });

  // -- Heat map -----------------------------------------------------------
  describe("heat map", () => {
    it("renders the risk heat map when risks are present", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.getByText("Risk Heat Map")).toBeInTheDocument();
      // "Likelihood" appears both in heat map y-axis and DataTable column header
      const likelihoodElements = screen.getAllByText("Likelihood");
      expect(likelihoodElements.length).toBeGreaterThanOrEqual(1);
    });

    it("does not render the heat map when no risks", () => {
      mockUseRisks.mockReturnValue({
        data: { data: [], meta: { page: 1, totalPages: 0, totalItems: 0, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.queryByText("Risk Heat Map")).not.toBeInTheDocument();
    });

    it("renders heat map legend with score ranges", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.getByText("1-4 Low")).toBeInTheDocument();
      expect(screen.getByText("5-9 Medium")).toBeInTheDocument();
      expect(screen.getByText("10-16 High")).toBeInTheDocument();
      expect(screen.getByText("20-25 Critical")).toBeInTheDocument();
    });
  });

  // -- Empty state --------------------------------------------------------
  describe("empty state", () => {
    it("shows empty state when no risks exist", () => {
      mockUseRisks.mockReturnValue({
        data: { data: [], meta: { page: 1, totalPages: 0, totalItems: 0, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      expect(screen.getByText("No risks found")).toBeInTheDocument();
      expect(
        screen.getByText("Create your first risk entry to begin tracking."),
      ).toBeInTheDocument();
    });
  });

  // -- Loading state ------------------------------------------------------
  describe("loading state", () => {
    it("shows loading indicator in data table when loading", () => {
      mockUseRisks.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<RisksPage />);

      expect(screen.getByTestId("table-loading")).toBeInTheDocument();
    });

    it("does not show risk data while loading", () => {
      mockUseRisks.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<RisksPage />);

      expect(screen.queryByText("Vendor delivery delay")).not.toBeInTheDocument();
    });
  });

  // -- Filters ------------------------------------------------------------
  describe("filters", () => {
    it("toggles filter panel when Filters button is clicked", () => {
      mockUseRisks.mockReturnValue({
        data: { data: mockRisks, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<RisksPage />);

      // Count "Status" occurrences before (only in DataTable column header)
      const statusLabels = screen.queryAllByText("Status");
      const initialCount = statusLabels.length;

      // Click Filters
      fireEvent.click(screen.getByText("Filters").closest("button")!);

      // After opening the filter panel, there should be more "Status" elements
      const statusLabelsAfter = screen.getAllByText("Status");
      expect(statusLabelsAfter.length).toBeGreaterThan(initialCount);
    });
  });
});

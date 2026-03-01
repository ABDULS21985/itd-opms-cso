import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import ProjectsPage from "../page";

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
const mockUseProjects = vi.fn();
const mockUsePortfolios = vi.fn();

vi.mock("@/hooks/use-planning", () => ({
  useProjects: (...args: any[]) => mockUseProjects(...args),
  usePortfolios: (...args: any[]) => mockUsePortfolios(...args),
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
const mockProjects = [
  {
    id: "proj-1",
    title: "Core Banking Upgrade",
    code: "PRJ-001",
    status: "active",
    priority: "high",
    ragStatus: "green",
    completionPct: 45,
    plannedStart: "2026-01-01T00:00:00Z",
    plannedEnd: "2026-06-30T00:00:00Z",
    divisionName: "IT Operations",
  },
  {
    id: "proj-2",
    title: "Mobile App v3",
    code: "PRJ-002",
    status: "draft",
    priority: "medium",
    ragStatus: "amber",
    completionPct: 10,
    plannedStart: null,
    plannedEnd: null,
    divisionName: null,
  },
];

const mockPortfoliosData = {
  data: [
    { id: "pf-1", name: "FY2026 Strategic" },
    { id: "pf-2", name: "FY2025 Maintenance" },
  ],
  meta: { totalItems: 2, totalPages: 1 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePortfolios.mockReturnValue({ data: mockPortfoliosData });
  });

  // -- Header rendering ---------------------------------------------------
  describe("rendering", () => {
    it("renders the page heading and description", () => {
      mockUseProjects.mockReturnValue({
        data: { data: mockProjects, meta: { totalItems: 2, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(
        screen.getByText("Manage project lifecycles, timelines, and budgets"),
      ).toBeInTheDocument();
    });

    it("renders the New Project button", () => {
      mockUseProjects.mockReturnValue({
        data: { data: mockProjects, meta: { totalItems: 2, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      const btn = screen.getByText("New Project");
      expect(btn).toBeInTheDocument();
      expect(btn.closest("button")).not.toBeNull();
    });

    it("renders Filters button", () => {
      mockUseProjects.mockReturnValue({
        data: { data: mockProjects, meta: { totalItems: 2, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      const btn = screen.getByText("Filters");
      expect(btn).toBeInTheDocument();
      expect(btn.closest("button")).not.toBeNull();
    });
  });

  // -- Project list -------------------------------------------------------
  describe("project list", () => {
    it("renders project cards with titles and codes", () => {
      mockUseProjects.mockReturnValue({
        data: { data: mockProjects, meta: { totalItems: 2, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      expect(screen.getByText("Core Banking Upgrade")).toBeInTheDocument();
      expect(screen.getByText("PRJ-001")).toBeInTheDocument();
      expect(screen.getByText("Mobile App v3")).toBeInTheDocument();
      expect(screen.getByText("PRJ-002")).toBeInTheDocument();
    });

    it("renders completion percentage", () => {
      mockUseProjects.mockReturnValue({
        data: { data: mockProjects, meta: { totalItems: 2, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.getByText("10%")).toBeInTheDocument();
    });

    it("renders division name when present", () => {
      mockUseProjects.mockReturnValue({
        data: { data: mockProjects, meta: { totalItems: 2, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      expect(screen.getByText("IT Operations")).toBeInTheDocument();
    });

    it("shows TBD when dates are missing", () => {
      mockUseProjects.mockReturnValue({
        data: { data: [mockProjects[1]], meta: { totalItems: 1, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      const tbdElements = screen.getAllByText("TBD");
      expect(tbdElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -- Empty state --------------------------------------------------------
  describe("empty state", () => {
    it("shows empty state message when no projects exist", () => {
      mockUseProjects.mockReturnValue({
        data: { data: [], meta: { totalItems: 0, totalPages: 0, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      expect(screen.getByText("No projects found")).toBeInTheDocument();
      expect(
        screen.getByText("Get started by creating your first project."),
      ).toBeInTheDocument();
    });

    it("shows New Project button in empty state", () => {
      mockUseProjects.mockReturnValue({
        data: { data: [], meta: { totalItems: 0, totalPages: 0, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      // There should be two New Project buttons (header + empty state)
      const buttons = screen.getAllByText("New Project");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -- Loading state ------------------------------------------------------
  describe("loading state", () => {
    it("shows loading indicator when data is loading", () => {
      mockUseProjects.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<ProjectsPage />);

      expect(screen.getByText("Loading projects...")).toBeInTheDocument();
    });

    it("does not show project cards when loading", () => {
      mockUseProjects.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<ProjectsPage />);

      expect(screen.queryByText("Core Banking Upgrade")).not.toBeInTheDocument();
    });
  });

  // -- Filters ------------------------------------------------------------
  describe("filters", () => {
    it("toggles filter panel when Filters button is clicked", () => {
      mockUseProjects.mockReturnValue({
        data: { data: mockProjects, meta: { totalItems: 2, totalPages: 1, page: 1 } },
        isLoading: false,
      });

      render(<ProjectsPage />);

      // Filters panel should not be visible initially
      expect(screen.queryByText("Portfolio")).not.toBeInTheDocument();

      // Click Filters button
      fireEvent.click(screen.getByText("Filters").closest("button")!);

      // Now filter labels should be visible
      expect(screen.getByText("Portfolio")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("RAG Status")).toBeInTheDocument();
    });
  });

  // -- Pagination ---------------------------------------------------------
  describe("pagination", () => {
    it("renders pagination when there are multiple pages", () => {
      mockUseProjects.mockReturnValue({
        data: {
          data: mockProjects,
          meta: { totalItems: 40, totalPages: 2, page: 1 },
        },
        isLoading: false,
      });

      render(<ProjectsPage />);

      expect(screen.getByText("40 results")).toBeInTheDocument();
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("does not render pagination when there is only one page", () => {
      mockUseProjects.mockReturnValue({
        data: {
          data: mockProjects,
          meta: { totalItems: 2, totalPages: 1, page: 1 },
        },
        isLoading: false,
      });

      render(<ProjectsPage />);

      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });
  });
});

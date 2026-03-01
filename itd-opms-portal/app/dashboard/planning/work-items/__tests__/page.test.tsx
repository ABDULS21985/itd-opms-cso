import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import WorkItemsPage from "../page";

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
      layout: _l,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
  },
}));

// ---------------------------------------------------------------------------
// Mock: @dnd-kit/core
// ---------------------------------------------------------------------------
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  closestCorners: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: () => [],
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
}));

// ---------------------------------------------------------------------------
// Mock: @dnd-kit/sortable
// ---------------------------------------------------------------------------
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

// ---------------------------------------------------------------------------
// Mock: @dnd-kit/utilities
// ---------------------------------------------------------------------------
vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// ---------------------------------------------------------------------------
// Mock: sonner
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Mock: hooks/use-planning
// ---------------------------------------------------------------------------
const mockUseWorkItems = vi.fn();
const mockUseWorkItemStatusCounts = vi.fn();
const mockBulkUpdateMutateAsync = vi.fn();

vi.mock("@/hooks/use-planning", () => ({
  useWorkItems: (...args: any[]) => mockUseWorkItems(...args),
  useWorkItemStatusCounts: (...args: any[]) => mockUseWorkItemStatusCounts(...args),
  useBulkUpdateWorkItems: () => ({
    mutateAsync: mockBulkUpdateMutateAsync,
  }),
}));

// ---------------------------------------------------------------------------
// Mock: providers/auth-provider
// ---------------------------------------------------------------------------
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "test@example.com",
      displayName: "Test User",
      permissions: ["*"],
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock: lib/api-client
// ---------------------------------------------------------------------------
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    put: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));

// ---------------------------------------------------------------------------
// Mock: lib/export-utils
// ---------------------------------------------------------------------------
vi.mock("@/lib/export-utils", () => ({
  exportToCSV: vi.fn(),
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
      {!loading &&
        data.map((item: any) => (
          <div key={item.id} data-testid="table-row">
            {item.title}
          </div>
        ))}
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
// Mock: components/shared/inline-edit
// ---------------------------------------------------------------------------
vi.mock("@/components/shared/inline-edit", () => ({
  InlineText: ({ value }: any) => <span>{value}</span>,
  InlineSelect: ({ value }: any) => <span>{value}</span>,
  InlineDate: ({ value }: any) => <span>{value}</span>,
}));

// ---------------------------------------------------------------------------
// Mock: components/shared/export-dropdown
// ---------------------------------------------------------------------------
vi.mock("@/components/shared/export-dropdown", () => ({
  ExportDropdown: () => <button data-testid="export-dropdown">Export</button>,
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const mockWorkItems = [
  {
    id: "wi-1",
    title: "Implement login page",
    type: "task",
    status: "todo",
    priority: "high",
    description: "Build the login form",
    assigneeId: "user-1",
    dueDate: "2026-03-15T00:00:00Z",
    projectId: "proj-1",
  },
  {
    id: "wi-2",
    title: "Design database schema",
    type: "story",
    status: "in_progress",
    priority: "medium",
    description: null,
    assigneeId: null,
    dueDate: null,
    projectId: "proj-1",
  },
  {
    id: "wi-3",
    title: "Deploy to staging",
    type: "task",
    status: "done",
    priority: "low",
    description: null,
    assigneeId: "user-2",
    dueDate: "2026-02-28T00:00:00Z",
    projectId: "proj-1",
  },
];

const mockStatusCounts = [
  { status: "todo", count: 5 },
  { status: "in_progress", count: 3 },
  { status: "in_review", count: 1 },
  { status: "done", count: 10 },
  { status: "blocked", count: 0 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("WorkItemsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkItemStatusCounts.mockReturnValue({
      data: mockStatusCounts,
    });
  });

  // -- Rendering ----------------------------------------------------------
  describe("rendering", () => {
    it("renders the page heading and description", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      expect(screen.getByText("Work Items")).toBeInTheDocument();
      expect(
        screen.getByText("Track tasks, stories, and epics across projects"),
      ).toBeInTheDocument();
    });

    it("renders Board and List view toggle buttons", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      const boardBtn = screen.getByText("Board");
      expect(boardBtn).toBeInTheDocument();
      expect(boardBtn.closest("button")).not.toBeNull();

      const listBtn = screen.getByText("List");
      expect(listBtn).toBeInTheDocument();
      expect(listBtn.closest("button")).not.toBeNull();
    });

    it("renders New Work Item button", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      const btn = screen.getByText("New Work Item");
      expect(btn).toBeInTheDocument();
      expect(btn.closest("button")).not.toBeNull();
    });

    it("renders Filters button", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      const btn = screen.getByText("Filters");
      expect(btn).toBeInTheDocument();
      expect(btn.closest("button")).not.toBeNull();
    });

    it("renders export dropdown", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      expect(screen.getByTestId("export-dropdown")).toBeInTheDocument();
    });
  });

  // -- Kanban board (default view) ----------------------------------------
  describe("kanban board", () => {
    it("renders kanban column headers by default", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      expect(screen.getByText("Todo")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("In Review")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
      expect(screen.getByText("Blocked")).toBeInTheDocument();
    });

    it("renders work item cards in kanban view", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      expect(screen.getByText("Implement login page")).toBeInTheDocument();
      expect(screen.getByText("Design database schema")).toBeInTheDocument();
      expect(screen.getByText("Deploy to staging")).toBeInTheDocument();
    });
  });

  // -- List view ----------------------------------------------------------
  describe("list view", () => {
    it("switches to list view when List button is clicked", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      fireEvent.click(screen.getByText("List").closest("button")!);

      // DataTable should render
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
    });

    it("shows work item titles in list view", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      fireEvent.click(screen.getByText("List").closest("button")!);

      const rows = screen.getAllByTestId("table-row");
      expect(rows).toHaveLength(3);
    });

    it("shows empty state in list view when no items", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: [], meta: { page: 1, totalPages: 0, totalItems: 0, pageSize: 20 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      fireEvent.click(screen.getByText("List").closest("button")!);

      expect(screen.getByText("No work items found")).toBeInTheDocument();
    });
  });

  // -- Filters ------------------------------------------------------------
  describe("filters", () => {
    it("toggles filter panel when Filters button is clicked", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: mockWorkItems, meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      // Filter labels should not be visible initially
      expect(screen.queryByText("Priority")).not.toBeInTheDocument();

      // Click Filters
      fireEvent.click(screen.getByText("Filters").closest("button")!);

      // Now filter labels should be visible
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
    });
  });

  // -- Empty kanban -------------------------------------------------------
  describe("empty kanban", () => {
    it("shows 'No items' placeholders in empty kanban columns", () => {
      mockUseWorkItems.mockReturnValue({
        data: { data: [], meta: { page: 1, totalPages: 0, totalItems: 0, pageSize: 100 } },
        isLoading: false,
      });

      render(<WorkItemsPage />);

      const noItems = screen.getAllByText("No items");
      expect(noItems.length).toBe(5); // One per kanban column
    });
  });
});

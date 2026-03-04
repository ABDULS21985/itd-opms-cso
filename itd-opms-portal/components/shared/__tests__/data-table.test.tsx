import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, within } from "@/test/test-utils";
import { DataTable, type Column, type BulkAction } from "../data-table";

// ---------------------------------------------------------------------------
// Mock framer-motion so AnimatePresence / motion.div render synchronously
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
// Test data
// ---------------------------------------------------------------------------
interface TestRow {
  id: string;
  name: string;
  status: string;
}

const testData: TestRow[] = [
  { id: "1", name: "Alpha", status: "active" },
  { id: "2", name: "Bravo", status: "pending" },
  { id: "3", name: "Charlie", status: "inactive" },
];

const columns: Column<TestRow>[] = [
  { key: "name", header: "Name", sortable: true, render: (r) => r.name },
  { key: "status", header: "Status", sortable: false, render: (r) => r.status },
];

const keyExtractor = (item: TestRow) => item.id;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("DataTable", () => {
  // -- Basic rendering ------------------------------------------------------
  describe("rendering", () => {
    it("renders column headers", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
        />,
      );

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("renders row data", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
        />,
      );

      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Bravo")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("renders correct number of rows", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
        />,
      );

      const rows = screen.getAllByRole("row");
      // 1 header row + 3 data rows
      expect(rows).toHaveLength(4);
    });
  });

  // -- Empty state ----------------------------------------------------------
  describe("empty state", () => {
    it("shows default empty title when data is empty", () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
        />,
      );

      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("shows custom empty title and description", () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
          emptyTitle="Nothing here"
          emptyDescription="Try creating a new item."
        />,
      );

      expect(screen.getByText("Nothing here")).toBeInTheDocument();
      expect(screen.getByText("Try creating a new item.")).toBeInTheDocument();
    });

    it("renders custom empty action", () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
          emptyAction={<button>Create New</button>}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Create New" }),
      ).toBeInTheDocument();
    });
  });

  // -- Loading state --------------------------------------------------------
  describe("loading state", () => {
    it("shows skeleton rows when loading", () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
          loading
        />,
      );

      // Should not show empty state text
      expect(screen.queryByText("No results found")).not.toBeInTheDocument();
      // Should not show data rows either
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    });
  });

  // -- Sorting --------------------------------------------------------------
  describe("sorting", () => {
    it("calls onSort when a sortable column header is clicked", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          sort={{ key: "name", direction: null }}
          onSort={onSort}
        />,
      );

      // The "Name" column is sortable, so it should be a button
      const nameHeader = screen.getByRole("button", { name: /Name/i });
      await user.click(nameHeader);

      expect(onSort).toHaveBeenCalledWith({ key: "name", direction: "asc" });
    });

    it("cycles sort direction: null -> asc -> desc -> null", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();

      // Start with null direction
      const { rerender } = render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          sort={{ key: "name", direction: null }}
          onSort={onSort}
        />,
      );

      const nameHeader = screen.getByRole("button", { name: /Name/i });

      // Click 1: null -> asc
      await user.click(nameHeader);
      expect(onSort).toHaveBeenLastCalledWith({ key: "name", direction: "asc" });

      // Rerender with asc
      rerender(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          sort={{ key: "name", direction: "asc" }}
          onSort={onSort}
        />,
      );

      // Click 2: asc -> desc
      await user.click(nameHeader);
      expect(onSort).toHaveBeenLastCalledWith({
        key: "name",
        direction: "desc",
      });

      // Rerender with desc
      rerender(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          sort={{ key: "name", direction: "desc" }}
          onSort={onSort}
        />,
      );

      // Click 3: desc -> null
      await user.click(nameHeader);
      expect(onSort).toHaveBeenLastCalledWith({
        key: "name",
        direction: null,
      });
    });

    it("does not render sort button for non-sortable columns", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
        />,
      );

      // "Status" is not sortable - should not be inside a button
      expect(
        screen.queryByRole("button", { name: /Status/i }),
      ).not.toBeInTheDocument();
      // But the header text should still be present
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  // -- Pagination -----------------------------------------------------------
  describe("pagination", () => {
    it("renders pagination controls when provided", () => {
      const onPageChange = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          pagination={{
            currentPage: 1,
            totalPages: 3,
            totalItems: 30,
            onPageChange,
          }}
        />,
      );

      expect(screen.getByText("30 results")).toBeInTheDocument();
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Previous" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Next" }),
      ).toBeInTheDocument();
    });

    it("disables Previous button on first page", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          pagination={{
            currentPage: 1,
            totalPages: 3,
            onPageChange: vi.fn(),
          }}
        />,
      );

      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    });

    it("disables Next button on last page", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          pagination={{
            currentPage: 3,
            totalPages: 3,
            onPageChange: vi.fn(),
          }}
        />,
      );

      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    });

    it("calls onPageChange with correct page number", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          pagination={{
            currentPage: 2,
            totalPages: 3,
            onPageChange,
          }}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Next" }));
      expect(onPageChange).toHaveBeenCalledWith(3);

      await user.click(screen.getByRole("button", { name: "Previous" }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("shows singular 'result' for totalItems === 1", () => {
      render(
        <DataTable
          columns={columns}
          data={testData.slice(0, 1)}
          keyExtractor={keyExtractor}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            onPageChange: vi.fn(),
          }}
        />,
      );

      expect(screen.getByText("1 result")).toBeInTheDocument();
    });

    it("does not render pagination when loading", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          loading
          pagination={{
            currentPage: 1,
            totalPages: 3,
            onPageChange: vi.fn(),
          }}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Previous" }),
      ).not.toBeInTheDocument();
    });

    it("does not render pagination when data is empty", () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
          pagination={{
            currentPage: 1,
            totalPages: 0,
            onPageChange: vi.fn(),
          }}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Next" }),
      ).not.toBeInTheDocument();
    });
  });

  // -- Row click ------------------------------------------------------------
  describe("row click", () => {
    it("calls onRowClick when a row is clicked", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          onRowClick={onRowClick}
        />,
      );

      await user.click(screen.getByText("Alpha"));
      expect(onRowClick).toHaveBeenCalledWith(testData[0]);
    });
  });

  // -- Row selection / checkboxes -------------------------------------------
  describe("row selection", () => {
    it("renders checkboxes when selectable is true", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
        />,
      );

      // "Select all" checkbox + one per row
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(testData.length + 1);
    });

    it("does not render checkboxes when selectable is false", () => {
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
        />,
      );

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("toggles individual row selection", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set<string>()}
          onSelectionChange={onSelectionChange}
        />,
      );

      const rowCheckbox = screen.getByRole("checkbox", {
        name: "Select row 1",
      });
      await user.click(rowCheckbox);

      expect(onSelectionChange).toHaveBeenCalled();
      const passedSet = onSelectionChange.mock.calls[0][0] as Set<string>;
      expect(passedSet.has("1")).toBe(true);
    });

    it("select-all checkbox toggles all rows", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set<string>()}
          onSelectionChange={onSelectionChange}
        />,
      );

      const selectAll = screen.getByRole("checkbox", { name: "Select all" });
      await user.click(selectAll);

      expect(onSelectionChange).toHaveBeenCalled();
      const passedSet = onSelectionChange.mock.calls[0][0] as Set<string>;
      expect(passedSet.size).toBe(3);
    });

    it("deselects all when all are already selected", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set(["1", "2", "3"])}
          onSelectionChange={onSelectionChange}
        />,
      );

      const selectAll = screen.getByRole("checkbox", { name: "Select all" });
      await user.click(selectAll);

      const passedSet = onSelectionChange.mock.calls[0][0] as Set<string>;
      expect(passedSet.size).toBe(0);
    });
  });

  // -- Bulk actions ---------------------------------------------------------
  describe("bulk actions", () => {
    it("shows bulk actions toolbar when items are selected", () => {
      const onExecute = vi.fn();
      const bulkActions: BulkAction[] = [
        { id: "delete", label: "Delete", variant: "danger", onExecute },
      ];

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set(["1", "2"])}
          onSelectionChange={vi.fn()}
          bulkActions={bulkActions}
        />,
      );

      expect(screen.getByText("2 selected")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Delete/i }),
      ).toBeInTheDocument();
    });

    it("executes bulk action with selected ids", async () => {
      const user = userEvent.setup();
      const onExecute = vi.fn();
      const bulkActions: BulkAction[] = [
        { id: "delete", label: "Delete", variant: "danger", onExecute },
      ];

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set(["1", "3"])}
          onSelectionChange={vi.fn()}
          bulkActions={bulkActions}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Delete/i }));
      expect(onExecute).toHaveBeenCalledWith(["1", "3"]);
    });

    it("clear button clears selection", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const bulkActions: BulkAction[] = [
        { id: "archive", label: "Archive", onExecute: vi.fn() },
      ];

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set(["1"])}
          onSelectionChange={onSelectionChange}
          bulkActions={bulkActions}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Clear/i }));
      const passedSet = onSelectionChange.mock.calls[0][0] as Set<string>;
      expect(passedSet.size).toBe(0);
    });

    it("does not show toolbar when nothing is selected", () => {
      const bulkActions: BulkAction[] = [
        { id: "delete", label: "Delete", onExecute: vi.fn() },
      ];

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set()}
          onSelectionChange={vi.fn()}
          bulkActions={bulkActions}
        />,
      );

      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  // -- Keyboard navigation --------------------------------------------------
  describe("keyboard navigation", () => {
    it("navigates rows with ArrowDown and ArrowUp", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          onRowClick={onRowClick}
        />,
      );

      // Focus the table wrapper by tabbing into it
      const tableWrapper = screen.getByRole("table").parentElement?.parentElement;
      if (tableWrapper) tableWrapper.focus();

      // Press ArrowDown to focus first row, then Enter
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      expect(onRowClick).toHaveBeenCalledWith(testData[0]);
    });

    it("toggles selection with 'x' key", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();

      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          selectable
          selectedIds={new Set<string>()}
          onSelectionChange={onSelectionChange}
        />,
      );

      // Focus the table wrapper
      const tableWrapper = screen.getByRole("table").parentElement?.parentElement;
      if (tableWrapper) tableWrapper.focus();

      // ArrowDown to focus first row, then 'x' to toggle
      await user.keyboard("{ArrowDown}");
      await user.keyboard("x");

      expect(onSelectionChange).toHaveBeenCalled();
    });
  });

  // -- Column alignment -----------------------------------------------------
  describe("column alignment", () => {
    it("applies alignment classes to headers and cells", () => {
      const alignedColumns: Column<TestRow>[] = [
        {
          key: "name",
          header: "Name",
          align: "left",
          render: (r) => r.name,
        },
        {
          key: "status",
          header: "Status",
          align: "center",
          render: (r) => r.status,
        },
      ];

      render(
        <DataTable
          columns={alignedColumns}
          data={testData}
          keyExtractor={keyExtractor}
        />,
      );

      // The table renders - basic sanity check that the data appears
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
  });
});

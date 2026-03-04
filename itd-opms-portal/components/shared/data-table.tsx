"use client";

import { type ReactNode, useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TableRowSkeleton } from "@/components/shared/loading-skeleton";

/* -------------------------------------------------- */
/*  Types                                             */
/* -------------------------------------------------- */

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface Column<T> {
  /** Unique key used for sorting. */
  key: string;
  /** Header label. */
  header: string;
  /** Whether this column is sortable. */
  sortable?: boolean;
  /** Custom cell renderer. Receives the full row item. */
  render: (item: T) => ReactNode;
  /** Optional header alignment. */
  align?: "left" | "center" | "right";
  /** Optional min-width class (e.g. "min-w-[180px]"). */
  className?: string;
}

export interface BulkAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "danger";
  onExecute: (selectedIds: string[]) => Promise<void> | void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key extractor for each row. */
  keyExtractor: (item: T) => string;
  /** If true, shows the loading skeleton. */
  loading?: boolean;
  /** Current sort state. */
  sort?: SortState;
  /** Called when a sortable header is clicked. */
  onSort?: (sort: SortState) => void;
  /** Empty state title. */
  emptyTitle?: string;
  /** Empty state description. */
  emptyDescription?: string;
  /** Empty state action node. */
  emptyAction?: ReactNode;
  /** Pagination props (omit to hide pagination). */
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
    /** Per-page size options (e.g. [10,20,50,100]). Omit to hide selector. */
    pageSizeOptions?: number[];
    /** Called when user changes the page size. */
    onPageSizeChange?: (size: number) => void;
  };
  /** Optional row click handler. */
  onRowClick?: (item: T) => void;
  /** Optional class on wrapper. */
  className?: string;
  /** Enable bulk selection checkboxes. */
  selectable?: boolean;
  /** Bulk actions shown in the floating toolbar. */
  bulkActions?: BulkAction[];
  /** Controlled selected IDs. */
  selectedIds?: Set<string>;
  /** Callback when selection changes (controlled mode). */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

/* -------------------------------------------------- */
/*  Sort Icon                                         */
/* -------------------------------------------------- */

function SortIcon({
  direction,
  active,
}: {
  direction: SortDirection;
  active: boolean;
}) {
  if (!active || !direction) {
    return (
      <ArrowUpDown className="h-3.5 w-3.5 text-[var(--neutral-gray)]/50" />
    );
  }
  if (direction === "asc") {
    return <ArrowUp className="h-3.5 w-3.5 text-[var(--primary)]" />;
  }
  return <ArrowDown className="h-3.5 w-3.5 text-[var(--primary)]" />;
}

/* -------------------------------------------------- */
/*  Simple Pagination                                 */
/* -------------------------------------------------- */

function SimplePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}) {
  /* Build visible page numbers with ellipsis */
  function getPageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  const rangeStart = totalItems !== undefined && pageSize ? (currentPage - 1) * pageSize + 1 : undefined;
  const rangeEnd = totalItems !== undefined && pageSize ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
      {/* Left: results info + page size */}
      <div className="flex items-center gap-4">
        {totalItems !== undefined && (
          <p className="text-[var(--neutral-gray)] tabular-nums">
            {rangeStart !== undefined && rangeEnd !== undefined ? (
              <>
                Showing <span className="font-medium text-[var(--text-primary)]">{rangeStart}&ndash;{rangeEnd}</span> of{" "}
                <span className="font-medium text-[var(--text-primary)]">{totalItems.toLocaleString()}</span>
              </>
            ) : (
              <>
                {totalItems.toLocaleString()} result{totalItems !== 1 ? "s" : ""}
              </>
            )}
          </p>
        )}
        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--neutral-gray)]">Per page</span>
            <select
              value={pageSize ?? pageSizeOptions[0]}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ell-${i}`}
              className="inline-flex items-center justify-center h-8 w-8 text-xs text-[var(--neutral-gray)]"
            >
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                p === currentPage
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
        {/* Last page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Data Table                                        */
/* -------------------------------------------------- */

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  sort,
  onSort,
  emptyTitle = "No results found",
  emptyDescription,
  emptyAction,
  pagination,
  onRowClick,
  className = "",
  selectable = false,
  bulkActions,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  /* ---- Selection state ---- */
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(
    new Set()
  );
  const isControlled = controlledSelectedIds !== undefined;
  const effectiveSelectedIds = isControlled
    ? controlledSelectedIds
    : internalSelectedIds;

  const updateSelection = useCallback(
    (next: Set<string>) => {
      if (isControlled) {
        onSelectionChange?.(next);
      } else {
        setInternalSelectedIds(next);
      }
    },
    [isControlled, onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  /* ---- Shift-click range selection ---- */
  const lastClickedIndexRef = useRef<number | null>(null);

  const toggleRowSelection = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
      const next = new Set(effectiveSelectedIds);

      if (shiftKey && lastClickedIndexRef.current !== null) {
        const start = Math.min(lastClickedIndexRef.current, index);
        const end = Math.max(lastClickedIndexRef.current, index);
        for (let i = start; i <= end; i++) {
          next.add(keyExtractor(data[i]));
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      lastClickedIndexRef.current = index;
      updateSelection(next);
    },
    [effectiveSelectedIds, data, keyExtractor, updateSelection]
  );

  const toggleSelectAll = useCallback(() => {
    const allIds = data.map(keyExtractor);
    const allSelected = allIds.length > 0 && allIds.every((id) => effectiveSelectedIds.has(id));
    if (allSelected) {
      updateSelection(new Set());
    } else {
      updateSelection(new Set(allIds));
    }
  }, [data, keyExtractor, effectiveSelectedIds, updateSelection]);

  /* ---- Clear selection on page change ---- */
  const prevPageRef = useRef(pagination?.currentPage);
  useEffect(() => {
    if (
      pagination &&
      prevPageRef.current !== undefined &&
      prevPageRef.current !== pagination.currentPage
    ) {
      clearSelection();
    }
    prevPageRef.current = pagination?.currentPage;
  }, [pagination?.currentPage, clearSelection, pagination]);

  /* ---- Keyboard navigation ---- */
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!selectable || data.length === 0) return;

      const key = e.key;

      if (key === "j" || key === "ArrowDown") {
        e.preventDefault();
        setFocusedRowIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, data.length - 1)
        );
      } else if (key === "k" || key === "ArrowUp") {
        e.preventDefault();
        setFocusedRowIndex((prev) =>
          prev === null ? 0 : Math.max(prev - 1, 0)
        );
      } else if (key === "Enter") {
        e.preventDefault();
        if (focusedRowIndex !== null && onRowClick) {
          onRowClick(data[focusedRowIndex]);
        }
      } else if (key === "x") {
        e.preventDefault();
        if (focusedRowIndex !== null) {
          const id = keyExtractor(data[focusedRowIndex]);
          toggleRowSelection(id, focusedRowIndex, false);
        }
      }
    },
    [selectable, data, focusedRowIndex, onRowClick, keyExtractor, toggleRowSelection]
  );

  /* ---- Header checkbox ref for indeterminate ---- */
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const allIds = data.map(keyExtractor);
  const allSelected = allIds.length > 0 && allIds.every((id) => effectiveSelectedIds.has(id));
  const someSelected =
    allIds.some((id) => effectiveSelectedIds.has(id)) && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  /* ---- Helpers ---- */
  function handleSort(key: string) {
    if (!onSort) return;

    let direction: SortDirection = "asc";
    if (sort?.key === key) {
      if (sort.direction === "asc") direction = "desc";
      else if (sort.direction === "desc") direction = null;
    }
    onSort({ key, direction });
  }

  const alignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  const totalColumns = selectable ? columns.length + 1 : columns.length;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {effectiveSelectedIds.size > 0 && bulkActions && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl"
            style={{
              backgroundColor: "rgba(27,115,64,0.1)",
              border: "1px solid rgba(27,115,64,0.2)",
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: "#1B7340" }}
            >
              {effectiveSelectedIds.size} selected
            </span>
            <div
              className="h-4 w-px"
              style={{ backgroundColor: "rgba(27,115,64,0.2)" }}
            />
            {bulkActions.map((action) => (
              <button
                key={action.id}
                onClick={() =>
                  action.onExecute(Array.from(effectiveSelectedIds))
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  action.variant === "danger"
                    ? "text-[var(--error)] hover:bg-[var(--error)]/10"
                    : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                }`}
              >
                {action.icon && <action.icon size={15} />}
                {action.label}
              </button>
            ))}
            <button
              onClick={clearSelection}
              className="ml-auto flex items-center gap-1 text-sm text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div
        ref={tableWrapperRef}
        className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm`}
        {...(selectable
          ? {
              tabIndex: 0,
              onKeyDown: handleKeyDown,
              style: { outline: "none" },
            }
          : {})}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Head */}
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                {selectable && (
                  <th className="w-10 px-3 py-3">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] ${alignClass(col.align)} ${col.className ?? ""}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--foreground)]"
                      >
                        {col.header}
                        <SortIcon
                          direction={
                            sort?.key === col.key ? sort.direction : null
                          }
                          active={sort?.key === col.key}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {loading ? (
                <TableRowSkeleton rows={5} columns={totalColumns} />
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                        <Inbox className="h-6 w-6 text-[var(--neutral-gray)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {emptyTitle}
                        </p>
                        {emptyDescription && (
                          <p className="mt-1 text-sm text-[var(--neutral-gray)]">
                            {emptyDescription}
                          </p>
                        )}
                      </div>
                      {emptyAction && (
                        <div className="mt-2">{emptyAction}</div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const rowId = keyExtractor(item);
                  const isSelected = effectiveSelectedIds.has(rowId);
                  const isFocused = selectable && focusedRowIndex === index;

                  return (
                    <tr
                      key={rowId}
                      onClick={
                        onRowClick ? () => onRowClick(item) : undefined
                      }
                      className={`border-b border-[var(--border)] transition-colors last:border-b-0 ${
                        onRowClick
                          ? "cursor-pointer hover:bg-[var(--surface-1)]"
                          : ""
                      } ${isSelected ? "bg-[var(--primary)]/5" : ""} ${
                        isFocused ? "bg-[var(--primary)]/5" : ""
                      }`}
                    >
                      {selectable && (
                        <td className="w-10 px-3 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowSelection(rowId, index, e.shiftKey);
                            }}
                            aria-label={`Select row ${rowId}`}
                            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 ${alignClass(col.align)} ${col.className ?? ""}`}
                        >
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && !loading && data.length > 0 && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <SimplePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.onPageChange}
              pageSizeOptions={pagination.pageSizeOptions}
              onPageSizeChange={pagination.onPageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

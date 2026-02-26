"use client";

import { type ReactNode } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
} from "lucide-react";
import { TableRowSkeleton } from "@/components/shared/loading-skeleton";
import { Pagination } from "@/components/shared/pagination";

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
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  /** Optional row click handler. */
  onRowClick?: (item: T) => void;
  /** Optional class on wrapper. */
  className?: string;
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
    return <ArrowUpDown className="h-3.5 w-3.5 text-[var(--neutral-gray)]/50" />;
  }
  if (direction === "asc") {
    return <ArrowUp className="h-3.5 w-3.5 text-[var(--primary)]" />;
  }
  return <ArrowDown className="h-3.5 w-3.5 text-[var(--primary)]" />;
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
}: DataTableProps<T>) {
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

  return (
    <div className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Head */}
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
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
                        direction={sort?.key === col.key ? sort.direction : null}
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
              <TableRowSkeleton rows={5} columns={columns.length} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
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
                    {emptyAction && <div className="mt-2">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`border-b border-[var(--border)] transition-colors last:border-b-0 ${
                    onRowClick
                      ? "cursor-pointer hover:bg-[var(--surface-1)]"
                      : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 ${alignClass(col.align)} ${col.className ?? ""}`}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && data.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}

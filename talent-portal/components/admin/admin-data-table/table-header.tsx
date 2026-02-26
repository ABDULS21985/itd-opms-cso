"use client";

import { useCallback, useRef } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { AdminColumn, SortState, SortDirection } from "./types";
import type { ColumnPreferences } from "@/hooks/use-column-preferences";

/* ──────────────────────────────────────────────
   Props
   ────────────────────────────────────────────── */

interface TableHeaderProps<T> {
  columns: AdminColumn<T>[];
  visibleColumns: AdminColumn<T>[];
  preferences: ColumnPreferences;
  sort?: SortState;
  onSort?: (sort: SortState) => void;
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  isScrolled: boolean;
  onResizeColumn: (key: string, width: number) => void;
  hasExpansion: boolean;
}

/* ──────────────────────────────────────────────
   Sort icon
   ────────────────────────────────────────────── */

function SortIcon({ direction, active }: { direction: SortDirection; active: boolean }) {
  if (!active || !direction) {
    return <ArrowUpDown className="h-3 w-3 text-[var(--neutral-gray)]/50 transition-all duration-200" />;
  }
  if (direction === "asc") {
    return <ArrowUp className="h-3 w-3 text-[var(--primary)] transition-all duration-200 animate-[fade-slide-up_0.15s_ease-out]" />;
  }
  return <ArrowDown className="h-3 w-3 text-[var(--primary)] transition-all duration-200 animate-[fade-slide-up_0.15s_ease-out]" />;
}

/* ──────────────────────────────────────────────
   Resize handle
   ────────────────────────────────────────────── */

function ResizeHandle({
  columnKey,
  currentWidth,
  minWidth,
  onResize,
}: {
  columnKey: string;
  currentWidth: number;
  minWidth: number;
  onResize: (key: string, width: number) => void;
}) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidth;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const handleMove = (me: PointerEvent) => {
        const delta = me.clientX - startXRef.current;
        const newWidth = Math.max(minWidth, startWidthRef.current + delta);
        onResize(columnKey, newWidth);
      };

      const handleUp = () => {
        target.removeEventListener("pointermove", handleMove);
        target.removeEventListener("pointerup", handleUp);
      };

      target.addEventListener("pointermove", handleMove);
      target.addEventListener("pointerup", handleUp);
    },
    [columnKey, currentWidth, minWidth, onResize],
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute right-0 top-1 bottom-1 w-1 cursor-col-resize rounded-full opacity-0 transition-opacity hover:bg-[var(--primary)]/40 group-hover/th:opacity-100"
    />
  );
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export function TableHeader<T>({
  visibleColumns,
  preferences,
  sort,
  onSort,
  selectable,
  allSelected,
  someSelected,
  onSelectAll,
  isScrolled,
  onResizeColumn,
  hasExpansion,
}: TableHeaderProps<T>) {
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
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
  };

  return (
    <thead
      className={`sticky top-0 z-10 transition-shadow ${
        isScrolled ? "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]" : ""
      }`}
    >
      <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
        {/* Expand placeholder */}
        {hasExpansion && (
          <th className="w-8 px-1 py-3" />
        )}

        {/* Select all checkbox */}
        {selectable && (
          <th className="w-10 px-3 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={onSelectAll}
              className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/20"
            />
          </th>
        )}

        {/* Column headers */}
        {visibleColumns.map((col) => {
          const width = preferences.widths[col.key] || col.defaultWidth;

          return (
            <th
              key={col.key}
              className={`group/th relative whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)] ${alignClass(col.align)} ${col.className ?? ""}`}
              style={width ? { width, minWidth: col.minWidth ?? 60 } : { minWidth: col.minWidth ?? 60 }}
            >
              {col.sortable && onSort ? (
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

              <ResizeHandle
                columnKey={col.key}
                currentWidth={width ?? 120}
                minWidth={col.minWidth ?? 60}
                onResize={onResizeColumn}
              />
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, AlertCircle, ChevronRight } from "lucide-react";
import { TableRowSkeleton } from "@/components/shared/loading-skeleton";
import type { AdminColumn } from "./types";
import type { ColumnPreferences } from "@/hooks/use-column-preferences";

/* ──────────────────────────────────────────────
   Props
   ────────────────────────────────────────────── */

interface TableBodyProps<T> {
  visibleColumns: AdminColumn<T>[];
  preferences: ColumnPreferences;
  data: T[];
  keyExtractor: (item: T) => string;
  loading: boolean;
  error?: Error | null;
  onRetry?: () => void;

  selectable: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;

  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  renderExpandedRow?: (item: T) => ReactNode;

  onRowClick?: (item: T) => void;

  emptyIcon?: React.ComponentType<{ size?: number; className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;

  pageKey: number;
}

/* ──────────────────────────────────────────────
   Row animation variants
   ────────────────────────────────────────────── */

const rowVariant = {
  initial: { opacity: 0, x: -8 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const expandVariant = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
};

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export function TableBody<T>({
  visibleColumns,
  data,
  keyExtractor,
  loading,
  error,
  onRetry,
  selectable,
  selectedIds,
  onToggleSelect,
  expandedIds,
  onToggleExpand,
  renderExpandedRow,
  onRowClick,
  emptyIcon: EmptyIcon = Inbox,
  emptyTitle = "No results found",
  emptyDescription,
  emptyAction,
  pageKey,
}: TableBodyProps<T>) {
  const totalCols =
    visibleColumns.length + (selectable ? 1 : 0) + (renderExpandedRow ? 1 : 0);

  const alignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
  };

  // Loading
  if (loading) {
    return (
      <tbody>
        <TableRowSkeleton rows={8} columns={totalCols} />
      </tbody>
    );
  }

  // Error
  if (error) {
    return (
      <tbody>
        <tr>
          <td colSpan={totalCols} className="px-4 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--error-light)]">
                <AlertCircle className="h-6 w-6 text-[var(--error)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Something went wrong
                </p>
                <p className="mt-1 text-sm text-[var(--neutral-gray)]">
                  {error.message || "Failed to load data."}
                </p>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-1)]"
                >
                  Try again
                </button>
              )}
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  // Empty
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={totalCols} className="px-4 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                <EmptyIcon size={24} className="text-[var(--neutral-gray)]" />
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
      </tbody>
    );
  }

  // Data rows
  return (
    <tbody>
      <AnimatePresence mode="popLayout" initial={false}>
        {data.map((item, index) => {
          const id = keyExtractor(item);
          const isSelected = selectedIds.includes(id);
          const isExpanded = expandedIds.has(id);

          return (
            <motion.tr
              key={`${pageKey}-${id}`}
              variants={rowVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              custom={index}
              layout
              className={`group relative border-b border-[var(--border)] transition-colors last:border-b-0 ${
                isSelected
                  ? "bg-[var(--primary)]/[0.03]"
                  : index % 2 === 1
                    ? "bg-[var(--surface-1)]/30"
                    : ""
              } ${onRowClick || renderExpandedRow ? "cursor-pointer" : ""} hover:bg-[var(--surface-1)]`}
              onClick={(e) => {
                // Don't trigger row click on checkbox or button clicks
                const target = e.target as HTMLElement;
                if (
                  target.closest('input[type="checkbox"]') ||
                  target.closest("button") ||
                  target.closest("a")
                ) return;

                if (renderExpandedRow) {
                  onToggleExpand(id);
                } else if (onRowClick) {
                  onRowClick(item);
                }
              }}
            >
              {/* Left accent bar on hover */}
              <td
                colSpan={0}
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px] scale-y-0 bg-[var(--primary)] transition-transform duration-200 group-hover:scale-y-100"
                style={{ padding: 0, border: 0, display: "block", position: "absolute" }}
                aria-hidden
              />

              {/* Expand chevron */}
              {renderExpandedRow && (
                <td className="w-8 px-1 py-3.5">
                  <ChevronRight
                    size={14}
                    className={`text-[var(--neutral-gray)] transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </td>
              )}

              {/* Selection checkbox */}
              {selectable && (
                <td className="w-10 px-3 py-3.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(id)}
                    className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/20"
                  />
                </td>
              )}

              {/* Data cells */}
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3.5 ${alignClass(col.align)} ${col.className ?? ""}`}
                >
                  {col.render(item)}
                </td>
              ))}
            </motion.tr>
          );
        })}
      </AnimatePresence>

      {/* Expanded rows rendered outside AnimatePresence for proper layout */}
      {renderExpandedRow &&
        data.map((item) => {
          const id = keyExtractor(item);
          const isExpanded = expandedIds.has(id);
          if (!isExpanded) return null;

          return (
            <tr key={`expanded-${id}`}>
              <td colSpan={totalCols} className="p-0">
                <AnimatePresence>
                  <motion.div
                    variants={expandVariant}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="overflow-hidden border-b border-[var(--border)] bg-[var(--surface-1)]/50"
                  >
                    <div className="px-6 py-4">
                      {renderExpandedRow(item)}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </td>
            </tr>
          );
        })}
    </tbody>
  );
}

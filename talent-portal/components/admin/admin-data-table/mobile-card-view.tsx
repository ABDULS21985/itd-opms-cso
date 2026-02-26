"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Inbox, AlertCircle } from "lucide-react";
import type { AdminColumn } from "./types";

interface MobileCardViewProps<T> {
  columns: AdminColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  renderCard?: (item: T, selected?: boolean) => ReactNode;

  selectable: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;

  emptyIcon?: React.ComponentType<{ size?: number; className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

const cardVariant = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export function MobileCardView<T>({
  columns,
  data,
  keyExtractor,
  loading,
  error,
  onRetry,
  renderCard,
  selectable,
  selectedIds,
  onToggleSelect,
  emptyIcon: EmptyIcon = Inbox,
  emptyTitle = "No results found",
  emptyDescription,
  emptyAction,
}: MobileCardViewProps<T>) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <div className="h-4 w-2/3 rounded bg-[var(--surface-2)]" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-4/5 rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--error-light)]">
          <AlertCircle className="h-6 w-6 text-[var(--error)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Something went wrong
        </p>
        <p className="text-sm text-[var(--neutral-gray)]">{error.message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // Empty
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
          <EmptyIcon size={24} className="text-[var(--neutral-gray)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{emptyTitle}</p>
        {emptyDescription && (
          <p className="text-sm text-[var(--neutral-gray)]">{emptyDescription}</p>
        )}
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const id = keyExtractor(item);
        const isSelected = selectedIds.includes(id);

        if (renderCard) {
          return (
            <motion.div
              key={id}
              variants={cardVariant}
              initial="initial"
              animate="animate"
              custom={i}
            >
              {selectable && (
                <div className="mb-1 flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(id)}
                    className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/20"
                  />
                </div>
              )}
              {renderCard(item, isSelected)}
            </motion.div>
          );
        }

        // Auto-generated card from columns
        return (
          <motion.div
            key={id}
            variants={cardVariant}
            initial="initial"
            animate="animate"
            custom={i}
            className={`rounded-2xl border bg-[var(--surface-1)] p-4 shadow-sm transition-colors ${
              isSelected
                ? "border-[var(--primary)]/30 bg-[var(--primary)]/[0.02]"
                : "border-[var(--border)]"
            }`}
          >
            {selectable && (
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(id)}
                  className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/20"
                />
                <span className="text-xs text-[var(--neutral-gray)]">
                  Select
                </span>
              </div>
            )}

            {/* First column as card title */}
            {columns[0] && (
              <div className="mb-3 text-sm font-medium text-[var(--foreground)]">
                {columns[0].render(item)}
              </div>
            )}

            {/* Remaining columns as key-value rows */}
            <div className="space-y-1.5">
              {columns.slice(1).map((col) => (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="text-xs text-[var(--neutral-gray)] shrink-0">
                    {col.header}
                  </span>
                  <div className="text-xs text-[var(--foreground)] text-right">
                    {col.render(item)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

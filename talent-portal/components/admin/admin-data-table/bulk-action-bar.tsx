"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import type { BulkAction } from "./types";

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  selectedIds: string[];
  onDeselectAll: () => void;
}

const variantClass: Record<string, string> = {
  default:
    "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90",
  danger:
    "bg-[var(--error)] text-white hover:bg-[var(--error)]/90",
  success:
    "bg-[var(--success)] text-white hover:bg-[var(--success)]/90",
};

export function BulkActionBar({
  selectedCount,
  actions,
  selectedIds,
  onDeselectAll,
}: BulkActionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-2.5"
    >
      <span className="text-sm font-medium text-[var(--primary)]">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-[var(--primary)]/20" />

      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const disabled = action.disabled?.(selectedIds);
          return (
            <button
              key={action.label}
              type="button"
              disabled={disabled}
              onClick={() => action.onClick(selectedIds)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${
                variantClass[action.variant ?? "default"]
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onDeselectAll}
        className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--foreground)]"
      >
        <X size={14} />
        Deselect all
      </button>
    </motion.div>
  );
}

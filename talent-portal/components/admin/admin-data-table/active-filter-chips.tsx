"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ActiveFilter } from "./types";

interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AnimatePresence mode="popLayout">
        {filters.map((f) => (
          <motion.span
            key={f.key}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
          >
            <span className="text-[var(--neutral-gray)]">{f.label}:</span>
            <span className="capitalize">{f.displayValue}</span>
            <button
              type="button"
              onClick={() => onRemove(f.key)}
              className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/10"
            >
              <X size={12} />
            </button>
          </motion.span>
        ))}
        <motion.button
          key="clear-all"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--error)]"
        >
          Clear all
        </motion.button>
      </AnimatePresence>
    </div>
  );
}

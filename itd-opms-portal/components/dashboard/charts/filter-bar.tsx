"use client";

import { motion } from "framer-motion";
import { Filter, X } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  filters: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }>;
  onReset?: () => void;
  delay?: number;
}

export function FilterBar({ filters, onReset, delay = 0.15 }: FilterBarProps) {
  const hasActiveFilters = filters.some((f) => f.value !== "" && f.value !== "all");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-3 flex-wrap"
    >
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <Filter size={14} />
        <span className="text-xs font-medium">Filters</span>
      </div>
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="text-xs rounded-lg border px-3 py-1.5 outline-none transition-colors"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="">{filter.label}: All</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {hasActiveFilters && onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={12} />
          Reset
        </button>
      )}
    </motion.div>
  );
}

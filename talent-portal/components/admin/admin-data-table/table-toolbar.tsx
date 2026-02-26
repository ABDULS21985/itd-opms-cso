"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  Search,
  SlidersHorizontal,
  Columns3,
  Download,
  X,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AdminColumn, ColumnFilter as ColumnFilterConfig } from "./types";
import type { ColumnPreferences } from "@/hooks/use-column-preferences";
import { ColumnFilterControl } from "./column-filter";

/* ──────────────────────────────────────────────
   Props
   ────────────────────────────────────────────── */

interface TableToolbarProps<T> {
  searchValue: string;
  onSearch: (query: string) => void;
  searchPlaceholder?: string;
  columns: AdminColumn<T>[];
  filters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  preferences: ColumnPreferences;
  onVisibilityChange: (key: string, visible: boolean) => void;
  onResetColumns: () => void;
  onExport?: (format: "csv" | "xlsx" | "pdf") => void;
  toolbarExtra?: ReactNode;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export function TableToolbar<T>({
  searchValue,
  onSearch,
  searchPlaceholder = "Search...",
  columns,
  filters,
  onFilterChange,
  preferences,
  onVisibilityChange,
  onResetColumns,
  onExport,
  toolbarExtra,
}: TableToolbarProps<T>) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const filterableColumns = columns.filter((c) => c.filter);

  // Keyboard shortcut: Cmd/Ctrl+F focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            ref={searchRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] pl-9 pr-9 text-sm text-[var(--foreground)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden rounded border border-[var(--border)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--neutral-gray)] sm:inline-block">
            {typeof navigator !== "undefined" &&
            /Mac/.test(navigator.platform)
              ? "\u2318"
              : "Ctrl+"}
            F
          </kbd>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Column filters toggle */}
          {filterableColumns.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowFilters(!showFilters);
                  setShowColumns(false);
                  setShowExport(false);
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
                  showFilters || Object.keys(filters).length > 0
                    ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)] hover:text-[var(--foreground)]"
                }`}
              >
                <SlidersHorizontal size={14} />
                Filters
                {Object.keys(filters).length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                    {Object.keys(filters).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showFilters && (
                  <FilterDropdown
                    columns={filterableColumns}
                    filters={filters}
                    onFilterChange={onFilterChange}
                    onClose={() => setShowFilters(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Column visibility */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColumns(!showColumns);
                setShowFilters(false);
                setShowExport(false);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--foreground)]"
            >
              <Columns3 size={14} />
              Columns
            </button>

            <AnimatePresence>
              {showColumns && (
                <ColumnsDropdown
                  columns={columns}
                  preferences={preferences}
                  onVisibilityChange={onVisibilityChange}
                  onReset={onResetColumns}
                  onClose={() => setShowColumns(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Export */}
          {onExport && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowExport(!showExport);
                  setShowFilters(false);
                  setShowColumns(false);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--foreground)]"
              >
                <Download size={14} />
                Export
              </button>

              <AnimatePresence>
                {showExport && (
                  <ExportDropdown
                    onExport={onExport}
                    onClose={() => setShowExport(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}

          {toolbarExtra}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Filter dropdown
   ────────────────────────────────────────────── */

function FilterDropdown<T>({
  columns,
  filters,
  onFilterChange,
  onClose,
}: {
  columns: AdminColumn<T>[];
  filters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full z-50 mt-1.5 w-[320px] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-lg"
    >
      <div className="space-y-3">
        {columns.map((col) => (
          <div key={col.key}>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              {col.header}
            </label>
            <ColumnFilterControl
              config={col.filter!}
              value={filters[col.key]}
              onChange={(v) => onFilterChange(col.key, v)}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Columns dropdown
   ────────────────────────────────────────────── */

function ColumnsDropdown<T>({
  columns,
  preferences,
  onVisibilityChange,
  onReset,
  onClose,
}: {
  columns: AdminColumn<T>[];
  preferences: ColumnPreferences;
  onVisibilityChange: (key: string, visible: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full z-50 mt-1.5 w-[220px] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-lg"
    >
      <div className="space-y-0.5">
        {columns.map((col) => (
          <label
            key={col.key}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--surface-1)]"
          >
            <input
              type="checkbox"
              checked={preferences.visibility[col.key] !== false}
              onChange={(e) => onVisibilityChange(col.key, e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/20"
            />
            <span className="text-xs text-[var(--foreground)]">
              {col.header}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1.5 border-t border-[var(--border)] pt-1.5">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--foreground)]"
        >
          <RotateCcw size={12} />
          Reset to defaults
        </button>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Export dropdown
   ────────────────────────────────────────────── */

function ExportDropdown({
  onExport,
  onClose,
}: {
  onExport: (format: "csv" | "xlsx" | "pdf") => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const formats = [
    { key: "csv" as const, label: "CSV", desc: "Comma-separated values" },
    { key: "xlsx" as const, label: "Excel", desc: "XLSX spreadsheet" },
    { key: "pdf" as const, label: "PDF", desc: "Portable document" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full z-50 mt-1.5 w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 shadow-lg"
    >
      {formats.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => {
            onExport(f.key);
            onClose();
          }}
          className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-1)]"
        >
          <div>
            <p className="text-xs font-medium text-[var(--foreground)]">
              {f.label}
            </p>
            <p className="text-[10px] text-[var(--neutral-gray)]">{f.desc}</p>
          </div>
        </button>
      ))}
    </motion.div>
  );
}

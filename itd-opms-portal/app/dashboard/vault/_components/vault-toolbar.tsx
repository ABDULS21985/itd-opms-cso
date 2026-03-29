"use client";

import { motion } from "framer-motion";
import { Search, X, Grid3X3, List, FolderPlus, Upload } from "lucide-react";
import { CLASSIFICATIONS, STATUSES } from "./vault-constants";

interface VaultToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  classification: string;
  onClassificationChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onNewFolder: () => void;
  onUpload: () => void;
}

export function VaultToolbar({
  searchQuery,
  onSearchChange,
  classification,
  onClassificationChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onNewFolder,
  onUpload,
}: VaultToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[28px] border px-5 py-5"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-0)",
      }}
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Search and controls
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          Filter the vault in place
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div
          className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border px-3 py-2.5"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
        >
          <Search size={16} className="text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")}>
              <X size={14} className="text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>

        {/* Classification filter */}
        <select
          value={classification}
          onChange={(e) => onClassificationChange(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-sm"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-sm"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* View toggle */}
        <div
          className="flex items-center rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => onViewModeChange("grid")}
            className="flex h-10 w-10 items-center justify-center rounded-l-xl transition-colors"
            style={{
              backgroundColor:
                viewMode === "grid" ? "var(--surface-2)" : "transparent",
            }}
          >
            <Grid3X3
              size={16}
              style={{
                color:
                  viewMode === "grid"
                    ? "var(--primary)"
                    : "var(--text-tertiary)",
              }}
            />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className="flex h-10 w-10 items-center justify-center rounded-r-xl transition-colors"
            style={{
              backgroundColor:
                viewMode === "list" ? "var(--surface-2)" : "transparent",
            }}
          >
            <List
              size={16}
              style={{
                color:
                  viewMode === "list"
                    ? "var(--primary)"
                    : "var(--text-tertiary)",
              }}
            />
          </button>
        </div>

        {/* New Folder */}
        <button
          onClick={onNewFolder}
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          <FolderPlus size={16} />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        {/* Upload */}
        <button
          onClick={onUpload}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Upload size={16} />
          Upload
        </button>
      </div>
    </motion.div>
  );
}

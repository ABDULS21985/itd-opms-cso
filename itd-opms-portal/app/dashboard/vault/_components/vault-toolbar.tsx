"use client";

import { motion } from "framer-motion";
import {
  Search,
  X,
  Grid3X3,
  List,
  FolderPlus,
  Upload,
  Shield,
} from "lucide-react";
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
      className="border-b px-6 py-4"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
        >
          <Shield size={20} style={{ color: "#3B82F6" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Document Vault
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Secure document storage and management
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div
          className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 min-w-[200px]"
          style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
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
          className="rounded-lg border px-3 py-2 text-sm"
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
          className="rounded-lg border px-3 py-2 text-sm"
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
        <div className="flex items-center rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => onViewModeChange("grid")}
            className="flex h-9 w-9 items-center justify-center rounded-l-lg transition-colors"
            style={{
              backgroundColor: viewMode === "grid" ? "var(--surface-2)" : "transparent",
            }}
          >
            <Grid3X3
              size={16}
              style={{ color: viewMode === "grid" ? "var(--primary)" : "var(--text-tertiary)" }}
            />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className="flex h-9 w-9 items-center justify-center rounded-r-lg transition-colors"
            style={{
              backgroundColor: viewMode === "list" ? "var(--surface-2)" : "transparent",
            }}
          >
            <List
              size={16}
              style={{ color: viewMode === "list" ? "var(--primary)" : "var(--text-tertiary)" }}
            />
          </button>
        </div>

        {/* New Folder */}
        <button
          onClick={onNewFolder}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          <FolderPlus size={16} />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        {/* Upload */}
        <button
          onClick={onUpload}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Upload size={16} />
          Upload
        </button>
      </div>
    </motion.div>
  );
}

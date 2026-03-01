"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  List,
  Network,
  Sun,
  Search,
  Plus,
  ChevronsUpDown,
  ChevronsDownUp,
  Download,
  Image,
  FileJson,
  FileSpreadsheet,
  X,
  Filter,
} from "lucide-react";
import { LEVEL_OPTIONS } from "./constants";
import type { ViewMode } from "./types";

const VIEW_ICONS: Record<ViewMode, typeof List> = {
  tree: List,
  chart: Network,
  sunburst: Sun,
};

const VIEW_LABELS: Record<ViewMode, string> = {
  tree: "Tree List",
  chart: "Org Chart",
  sunburst: "Radial",
};

export function Toolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  onExpandAll,
  onCollapseAll,
  onCreateUnit,
  onExportPng,
  onExportCsv,
  onExportJson,
  nodeCount,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  levelFilter: string[];
  onLevelFilterChange: (levels: string[]) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCreateUnit: () => void;
  onExportPng: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  nodeCount: number;
}) {
  const [showLevelFilter, setShowLevelFilter] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Cmd+F shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // View mode shortcuts (only when search not focused)
      if (document.activeElement !== searchRef.current) {
        if (e.key === "1") onViewModeChange("chart");
        if (e.key === "2") onViewModeChange("sunburst");
        if (e.key === "3") onViewModeChange("tree");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onViewModeChange]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setShowLevelFilter(false);
      }
      if (
        exportRef.current &&
        !exportRef.current.contains(e.target as Node)
      ) {
        setShowExport(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleLevel = useCallback(
    (level: string) => {
      if (levelFilter.includes(level)) {
        onLevelFilterChange(levelFilter.filter((l) => l !== level));
      } else {
        onLevelFilterChange([...levelFilter, level]);
      }
    },
    [levelFilter, onLevelFilterChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* View mode toggle */}
      <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-0.5">
        {(["chart", "sunburst", "tree"] as ViewMode[]).map((mode) => {
          const Icon = VIEW_ICONS[mode];
          const isActive = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
              title={`${VIEW_LABELS[mode]} (${mode === "chart" ? "1" : mode === "sunburst" ? "2" : "3"})`}
            >
              {isActive && (
                <motion.div
                  layoutId="view-toggle"
                  className="absolute inset-0 rounded-lg bg-[var(--surface-0)] shadow-sm border border-[var(--border)]"
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={14} />
                <span className="hidden sm:inline">{VIEW_LABELS[mode]}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-[280px]">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search units... (Cmd+F)"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-8 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Level filter */}
      <div ref={filterRef} className="relative">
        <button
          type="button"
          onClick={() => setShowLevelFilter((p) => !p)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
            levelFilter.length > 0
              ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
              : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Filter size={13} />
          Level
          {levelFilter.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
              {levelFilter.length}
            </span>
          )}
        </button>

        {showLevelFilter && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-1.5 shadow-lg"
          >
            {LEVEL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-[var(--surface-1)]"
              >
                <input
                  type="checkbox"
                  checked={levelFilter.includes(opt.value)}
                  onChange={() => toggleLevel(opt.value)}
                  className="rounded border-[var(--border)] accent-[var(--primary)]"
                />
                <span className="text-[var(--text-primary)]">{opt.label}</span>
              </label>
            ))}
            {levelFilter.length > 0 && (
              <button
                type="button"
                onClick={() => onLevelFilterChange([])}
                className="mt-1 w-full rounded-lg px-2.5 py-1 text-xs text-[var(--primary)] hover:bg-[var(--surface-1)]"
              >
                Clear all
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Expand/Collapse (tree view only) */}
      {viewMode === "tree" && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onExpandAll}
            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            title="Expand all"
          >
            <ChevronsUpDown size={14} />
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            title="Collapse all"
          >
            <ChevronsDownUp size={14} />
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* Node count */}
      <span className="hidden sm:inline text-xs text-[var(--neutral-gray)] tabular-nums">
        {nodeCount} unit{nodeCount !== 1 ? "s" : ""}
      </span>

      {/* Export dropdown */}
      <div ref={exportRef} className="relative">
        <button
          type="button"
          onClick={() => setShowExport((p) => !p)}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Download size={13} />
          Export
        </button>

        {showExport && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-1 shadow-lg"
          >
            {viewMode === "chart" && (
              <button
                type="button"
                onClick={() => {
                  onExportPng();
                  setShowExport(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              >
                <Image size={14} className="text-[var(--neutral-gray)]" />
                PNG Image
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onExportCsv();
                setShowExport(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            >
              <FileSpreadsheet
                size={14}
                className="text-[var(--neutral-gray)]"
              />
              CSV
            </button>
            <button
              type="button"
              onClick={() => {
                onExportJson();
                setShowExport(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            >
              <FileJson size={14} className="text-[var(--neutral-gray)]" />
              JSON Tree
            </button>
          </motion.div>
        )}
      </div>

      {/* Create button */}
      <button
        type="button"
        onClick={onCreateUnit}
        className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Add Unit</span>
      </button>
    </div>
  );
}

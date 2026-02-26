"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  RefreshCw,
  Calendar,
  ChevronDown,
  FileText,
  Table,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange, ControlsState } from "./shared";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

interface ControlsBarProps {
  controls: ControlsState;
  onControlsChange: (controls: ControlsState) => void;
  onExport: (format: "csv" | "pdf" | "png") => void;
  isExporting?: boolean;
}

export function ControlsBar({
  controls,
  onControlsChange,
  onExport,
  isExporting,
}: ControlsBarProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [countdown, setCountdown] = useState(300);

  useEffect(() => {
    if (!controls.autoRefresh) {
      setCountdown(300);
      return;
    }
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 300;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [controls.autoRefresh]);

  const closeAll = useCallback(() => {
    setDateOpen(false);
    setExportOpen(false);
  }, []);

  const selectedRange = DATE_RANGES.find((r) => r.value === controls.dateRange);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date range picker */}
      <div className="relative">
        <button
          onClick={() => { setDateOpen(!dateOpen); setExportOpen(false); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Calendar size={14} />
          {selectedRange?.label}
          <ChevronDown size={12} className={cn("transition-transform", dateOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {dateOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-1 w-44 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] shadow-lg z-50 p-1"
              >
                {DATE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      onControlsChange({ ...controls, dateRange: range.value });
                      setDateOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      controls.dateRange === range.value
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Auto-refresh toggle */}
      <button
        onClick={() => onControlsChange({ ...controls, autoRefresh: !controls.autoRefresh })}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
          controls.autoRefresh
            ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
            : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]",
        )}
      >
        <RefreshCw size={14} className={cn(controls.autoRefresh && "animate-spin")} style={controls.autoRefresh ? { animationDuration: "3s" } : undefined} />
        {controls.autoRefresh ? (
          <span className="tabular-nums">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</span>
        ) : (
          "Auto-refresh"
        )}
      </button>

      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => { setExportOpen(!exportOpen); setDateOpen(false); }}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          Export
          <ChevronDown size={12} className={cn("transition-transform", exportOpen && "rotate-180")} />
        </button>
        <AnimatePresence>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeAll} />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-1 w-44 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] shadow-lg z-50 p-1"
              >
                {[
                  { format: "csv" as const, label: "CSV Data", icon: Table },
                  { format: "pdf" as const, label: "PDF Report", icon: FileText },
                  { format: "png" as const, label: "PNG Charts", icon: Image },
                ].map((opt) => (
                  <button
                    key={opt.format}
                    onClick={() => { onExport(opt.format); setExportOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <opt.icon size={14} />
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

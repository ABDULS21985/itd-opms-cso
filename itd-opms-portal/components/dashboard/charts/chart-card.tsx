"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Expand, X, Download, BarChart3 } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  delay?: number;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  expandable?: boolean;
  onExportCSV?: () => void;
  contentHeight?: number;
}

export function ChartCard({
  title,
  subtitle,
  delay = 0,
  children,
  className = "",
  action,
  isLoading,
  isEmpty,
  expandable,
  onExportCSV,
  contentHeight = 200,
}: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClose = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, handleClose]);

  const actionButtons = (
    <div className="flex items-center gap-2">
      {onExportCSV && (
        <button
          onClick={onExportCSV}
          className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <Download size={14} />
        </button>
      )}
      {expandable && (
        <button
          onClick={() => setExpanded(true)}
          className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <Expand size={14} />
        </button>
      )}
      {action && <div>{action}</div>}
    </div>
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <div
          className="rounded-lg bg-[var(--surface-2)] animate-pulse"
          style={{ height: contentHeight }}
        />
      );
    }
    if (isEmpty) {
      return (
        <div
          className="flex flex-col items-center justify-center text-[var(--text-muted)]"
          style={{ height: contentHeight }}
        >
          <BarChart3 size={32} strokeWidth={1.5} className="mb-2 opacity-30" />
          <span className="text-xs">No data available</span>
        </div>
      );
    }
    return children;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`rounded-xl border p-5 ${className}`}
        style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          {actionButtons}
        </div>
        {renderBody()}
      </motion.div>

      {expandable && (
        <ExpandedModal
          open={expanded}
          title={title}
          onClose={handleClose}
        >
          {children}
        </ExpandedModal>
      )}
    </>
  );
}

interface ExpandedModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ExpandedModal({ open, title, onClose, children }: ExpandedModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
        >
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex-1 mx-6 mb-6 rounded-xl border p-6 overflow-auto"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface ChartCardSkeletonProps {
  height?: number;
}

export function ChartCardSkeleton({ height = 200 }: ChartCardSkeletonProps) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <div className="h-4 w-32 rounded bg-[var(--surface-2)] animate-pulse mb-4" />
      <div
        className="rounded-lg bg-[var(--surface-2)] animate-pulse"
        style={{ height }}
      />
    </div>
  );
}

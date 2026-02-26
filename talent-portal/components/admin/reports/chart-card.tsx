"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  onExport?: () => void;
}

export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  onExport,
}: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className={cn(
        "bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 transition-shadow",
        expanded && "fixed inset-4 z-50 overflow-auto shadow-2xl",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-[var(--primary)]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] text-[15px] leading-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onExport && (
            <button
              onClick={onExport}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
              title="Export chart"
            >
              <Download size={14} />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
            title={expanded ? "Minimize" : "Maximize"}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {children}

      {expanded && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setExpanded(false)}
        />
      )}
    </motion.div>
  );
}

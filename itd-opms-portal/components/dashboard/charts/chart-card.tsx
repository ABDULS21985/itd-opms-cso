"use client";

import { motion } from "framer-motion";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  delay?: number;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartCard({ title, subtitle, delay = 0, children, className = "", action }: ChartCardProps) {
  return (
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
        {action && <div>{action}</div>}
      </div>
      {children}
    </motion.div>
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

import type { LucideIcon } from "lucide-react";

// ────────────────────────────────────────────────────────
// Palette
// ────────────────────────────────────────────────────────

export const C = {
  primary: "var(--primary)",
  primaryLight: "var(--info)",
  orange: "var(--accent-orange)",
  green: "var(--success)",
  emerald: "var(--success-dark)",
  red: "var(--error)",
  purple: "var(--badge-purple-dot)",
  pink: "#EC4899",
  indigo: "#6366F1",
  teal: "#14B8A6",
  amber: "var(--warning)",
  cyan: "#06B6D4",
  slate: "var(--neutral-gray)",
};

export const CHART_COLORS = [
  C.primary, C.orange, C.green, C.primaryLight, C.purple,
  C.pink, C.indigo, C.teal, C.amber, C.cyan,
];

export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: C.primaryLight,
  IN_DISCUSSION: C.orange,
  INTERVIEWING: C.purple,
  OFFER: C.amber,
  PLACED: C.green,
  COMPLETED: C.emerald,
  CANCELLED: C.red,
  DRAFT: C.slate,
  PUBLISHED: C.primary,
  CLOSED: C.red,
  PAUSED: C.orange,
  APPROVED: C.green,
  PENDING: C.orange,
  REJECTED: C.red,
  UNDER_REVIEW: C.purple,
};

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--surface-1)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
    padding: "10px 14px",
  },
  itemStyle: { color: "var(--text-secondary)", fontSize: "12px" },
  labelStyle: { color: "var(--text-primary)", fontWeight: 600, marginBottom: "4px" },
};

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

export function fmt(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/** Deterministic sparkline data from a seed value */
export function generateSparkline(value: number, label: string, points = 7): { v: number }[] {
  let seed = value + label.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const next = () => {
    seed = (seed * 16807 + 12345) % 2147483647;
    return (seed % 1000) / 1000;
  };
  const base = value * 0.7;
  return Array.from({ length: points }, () => ({
    v: Math.round(base + next() * value * 0.6),
  }));
}

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

export type ReportTab =
  | "executive"
  | "candidates"
  | "jobs"
  | "employers"
  | "placements"
  | "health";

export interface TabDef {
  id: ReportTab;
  label: string;
  icon: LucideIcon;
}

export type DateRange = "7d" | "30d" | "90d" | "ytd" | "all";

export interface ControlsState {
  dateRange: DateRange;
  autoRefresh: boolean;
}

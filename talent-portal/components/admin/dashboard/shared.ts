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
    color: "var(--text-primary)",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
    padding: "10px 14px",
  },
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

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

export interface MetricItem {
  label: string;
  value: number;
  sub: string;
  icon: LucideIcon;
  color: string;
  href: string;
  trendValue: number;
  trendDirection: "up" | "down";
}

export type AlertSeverity = "urgent" | "warning" | "info";

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  count: number;
}

export interface FunnelStage {
  label: string;
  status: string;
  count: number;
  color: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

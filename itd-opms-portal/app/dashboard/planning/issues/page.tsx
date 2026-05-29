"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpCircle,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock,
  Filter,
  Flame,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useIssues } from "@/hooks/use-planning";
import type { ProjectIssue } from "@/types";

/* ------------------------------------------------------------------ */
/*  Premium styling constants                                          */
/* ------------------------------------------------------------------ */

const PANEL_CLASS =
  "rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface-0)] shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";
const SOFT_PANEL_CLASS =
  "rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-[0_12px_30px_rgba(15,23,42,0.05)]";
const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5";
const PRIMARY_BUTTON_STYLE = {
  backgroundImage: "var(--gradient-primary)",
  borderColor: "var(--primary-light)",
  boxShadow: "var(--shadow-premium)",
};
const HERO_STYLE = {
  backgroundImage:
    "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%), radial-gradient(circle at bottom left, rgba(139,111,46,0.18), transparent 32%), var(--gradient-primary)",
  borderColor: "rgba(45,155,86,0.28)",
  boxShadow: "var(--shadow-premium)",
};

/* ------------------------------------------------------------------ */
/*  Filter constants                                                   */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITIES = [
  { value: "", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/* ------------------------------------------------------------------ */
/*  Metadata systems                                                   */
/* ------------------------------------------------------------------ */

const SEVERITY_META: Record<
  string,
  { label: string; icon: ElementType; bg: string; text: string; accent: string; border: string }
> = {
  critical: {
    label: "Critical",
    icon: Flame,
    bg: "var(--error-light)",
    text: "var(--error-dark)",
    accent: "var(--error)",
    border: "rgba(239,68,68,0.22)",
  },
  high: {
    label: "High",
    icon: AlertTriangle,
    bg: "var(--warning-light)",
    text: "var(--warning-dark)",
    accent: "var(--warning)",
    border: "rgba(245,158,11,0.22)",
  },
  medium: {
    label: "Medium",
    icon: ShieldAlert,
    bg: "var(--badge-amber-bg)",
    text: "var(--gold-dark)",
    accent: "var(--gold)",
    border: "rgba(217,179,16,0.22)",
  },
  low: {
    label: "Low",
    icon: CheckCircle2,
    bg: "var(--success-light)",
    text: "var(--success-dark)",
    accent: "var(--success)",
    border: "rgba(16,185,129,0.22)",
  },
};

const STATUS_META: Record<
  string,
  { label: string; icon: ElementType; bg: string; text: string; accent: string; border: string }
> = {
  open: {
    label: "Open",
    icon: CircleDot,
    bg: "var(--info-light)",
    text: "var(--info-dark)",
    accent: "var(--info)",
    border: "rgba(59,130,246,0.22)",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    bg: "var(--warning-light)",
    text: "var(--warning-dark)",
    accent: "var(--warning)",
    border: "rgba(245,158,11,0.22)",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    bg: "var(--success-light)",
    text: "var(--success-dark)",
    accent: "var(--success)",
    border: "rgba(16,185,129,0.22)",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
    border: "rgba(148,163,184,0.24)",
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatRelativeDate(value?: string): string {
  if (!value) return "--";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "Upcoming";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function daysUntilDue(dueDate?: string): number | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/*  StatTile                                                           */
/* ------------------------------------------------------------------ */

function StatTile({
  icon: Icon,
  label,
  value,
  helper,
  accent,
  inverted = false,
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper: string;
  accent: string;
  inverted?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] p-4"
      style={{
        border: inverted
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid var(--border)",
        background: inverted
          ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.07))"
          : "var(--surface-1)",
        boxShadow: inverted
          ? "0 18px 40px rgba(2, 6, 23, 0.12)"
          : "0 18px 40px rgba(15, 23, 42, 0.06)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: inverted
            ? "radial-gradient(circle at 100% 0%, rgba(255,255,255,0.18), transparent 36%)"
            : "radial-gradient(circle at 100% 0%, rgba(27,115,64,0.12), transparent 36%)",
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: inverted
                ? "rgba(255,255,255,0.12)"
                : "rgba(27,115,64,0.08)",
              border: inverted
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(255,255,255,0.7)",
            }}
          >
            <Icon size={18} style={{ color: inverted ? "#fff" : accent }} />
          </div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              inverted ? "text-white/58" : "text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </p>
        </div>
        <p
          className={`mt-5 text-lg font-semibold leading-6 ${
            inverted ? "text-white" : "text-[var(--text-primary)]"
          }`}
        >
          {value}
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            inverted ? "text-white/72" : "text-[var(--text-secondary)]"
          }`}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SeverityBadge                                                      */
/* ------------------------------------------------------------------ */

function SeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity.toLowerCase()] ?? {
    label: severity,
    icon: ShieldAlert,
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
    border: "rgba(148,163,184,0.24)",
  };
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize"
      style={{
        backgroundColor: meta.bg,
        color: meta.text,
        borderColor: meta.border,
      }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  IssueStatusBadge                                                   */
/* ------------------------------------------------------------------ */

function IssueStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status.toLowerCase()] ?? {
    label: status.replace(/_/g, " "),
    icon: CircleDot,
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
    border: "rgba(148,163,184,0.24)",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize"
      style={{
        backgroundColor: meta.bg,
        color: meta.text,
        borderColor: meta.border,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.accent }}
      />
      {meta.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading } = useIssues(
    page,
    20,
    projectId,
    status || undefined,
    severity || undefined,
  );

  const issues = data?.data ?? [];
  const meta = data?.meta;
  const filtersApplied = [status, severity, debouncedSearch].filter(Boolean).length;

  /* ---- Derived stats ---- */

  const filteredIssues = useMemo(() => {
    if (!debouncedSearch) return issues;
    const q = debouncedSearch.toLowerCase();
    return issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        issue.description?.toLowerCase().includes(q) ||
        issue.category?.toLowerCase().includes(q),
    );
  }, [issues, debouncedSearch]);

  const visibleTotal = meta?.totalItems ?? issues.length;

  const criticalCount = useMemo(
    () => issues.filter((i) => i.severity.toLowerCase() === "critical").length,
    [issues],
  );
  const openCount = useMemo(
    () => issues.filter((i) => i.status.toLowerCase() === "open").length,
    [issues],
  );
  const escalatedCount = useMemo(
    () => issues.filter((i) => i.escalationLevel > 0).length,
    [issues],
  );
  const overdueCount = useMemo(
    () =>
      issues.filter((i) => {
        const days = daysUntilDue(i.dueDate);
        return days !== null && days < 0 && i.status !== "closed" && i.status !== "resolved";
      }).length,
    [issues],
  );

  const severityMix = useMemo(
    () =>
      SEVERITIES.filter((s) => s.value)
        .map((s) => ({
          ...s,
          count: issues.filter(
            (i) => i.severity.toLowerCase() === s.value,
          ).length,
        }))
        .filter((s) => s.count > 0),
    [issues],
  );

  const recentIssues = useMemo(
    () =>
      [...issues]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 4),
    [issues],
  );

  const displayIssues = debouncedSearch ? filteredIssues : issues;

  /* ---- Columns ---- */

  const columns: Column<ProjectIssue>[] = [
    {
      key: "title",
      header: "Issue",
      sortable: true,
      className: "min-w-[260px]",
      render: (item) => {
        const sevMeta = SEVERITY_META[item.severity.toLowerCase()];
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: sevMeta?.bg ?? "rgba(249,115,22,0.08)",
              }}
            >
              <AlertOctagon
                size={18}
                style={{ color: sevMeta?.accent ?? "var(--warning)" }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {item.title}
              </p>
              {item.category && (
                <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                  {item.category}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (item) => <SeverityBadge severity={item.severity} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <IssueStatusBadge status={item.status} />,
    },
    {
      key: "escalationLevel",
      header: "Escalation",
      align: "center",
      render: (item) => {
        const isEscalated = item.escalationLevel > 0;
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: isEscalated
                ? "var(--warning-light)"
                : "var(--surface-2)",
              color: isEscalated
                ? "var(--warning-dark)"
                : "var(--text-secondary)",
            }}
          >
            <ArrowUpCircle size={12} />
            L{item.escalationLevel}
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (item) => {
        const days = daysUntilDue(item.dueDate);
        const isOverdue =
          days !== null && days < 0 && item.status !== "closed" && item.status !== "resolved";
        return (
          <div className="space-y-1">
            <span
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              style={{
                color: isOverdue
                  ? "var(--error)"
                  : "var(--text-primary)",
              }}
            >
              <Calendar size={14} />
              {item.dueDate
                ? new Date(item.dueDate).toLocaleDateString()
                : "--"}
            </span>
            {days !== null && (
              <p
                className="text-xs"
                style={{
                  color: isOverdue
                    ? "var(--error)"
                    : days <= 3
                      ? "var(--warning)"
                      : "var(--text-secondary)",
                }}
              >
                {isOverdue
                  ? `${Math.abs(days)}d overdue`
                  : days === 0
                    ? "Due today"
                    : `${days}d remaining`}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatRelativeDate(item.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ─── Hero ─── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.2rem] border px-6 py-7 text-white"
        style={HERO_STYLE}
      >
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(139,111,46,0.16)" }}
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/82 backdrop-blur-xl">
              <Sparkles size={14} />
              Issue Tracker Command
            </div>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                <AlertOctagon size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
                  Issues
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/84 sm:text-[15px]">
                  Track, prioritize, and resolve project issues across your
                  portfolio from a single command surface.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <AlertOctagon size={14} />
                    {visibleTotal} issue{visibleTotal === 1 ? "" : "s"} tracked
                  </span>
                  {criticalCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Flame size={14} />
                      {criticalCount} critical
                    </span>
                  )}
                  {overdueCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Clock size={14} />
                      {overdueCount} overdue
                    </span>
                  )}
                  {filtersApplied > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Filter size={14} />
                      {filtersApplied} filter{filtersApplied === 1 ? "" : "s"}{" "}
                      applied
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hero stat tiles */}
          <div className="grid gap-3 sm:grid-cols-2 xl:w-[480px]">
            <StatTile
              icon={AlertOctagon}
              label="Total Issues"
              value={String(visibleTotal)}
              helper="All issues in the current result set."
              accent="#ffffff"
              inverted
            />
            <StatTile
              icon={CircleDot}
              label="Open Issues"
              value={String(openCount)}
              helper="Issues awaiting triage or resolution."
              accent="#ffffff"
              inverted
            />
            <StatTile
              icon={Flame}
              label="Critical"
              value={String(criticalCount)}
              helper="Highest severity issues demanding attention."
              accent="#ffffff"
              inverted
            />
            <StatTile
              icon={ArrowUpCircle}
              label="Escalated"
              value={String(escalatedCount)}
              helper="Issues escalated beyond initial assignee."
              accent="#ffffff"
              inverted
            />
          </div>
        </div>
      </motion.section>

      {/* ─── Search & action bar ─── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`${PANEL_CLASS} p-3 sm:p-4`}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search issues by title, description, or category..."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                showFilters || filtersApplied > 0
                  ? "border-[var(--primary-light)] bg-[var(--success-light)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)]"
              }`}
            >
              <Filter size={16} />
              Filters
              {filtersApplied > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {filtersApplied}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/planning/issues/new")}
              className={PRIMARY_BUTTON_CLASS}
              style={PRIMARY_BUTTON_STYLE}
            >
              <Plus size={16} />
              New Issue
            </button>
          </div>
        </div>
      </motion.section>

      {/* ─── Filter panel ─── */}
      <AnimatePresence>
        {showFilters && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`${PANEL_CLASS} overflow-hidden`}
          >
            <div className="flex flex-wrap gap-4 p-4 sm:p-5">
              <div className="min-w-[160px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[160px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => {
                    setSeverity(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {(status || severity) && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("");
                      setSeverity("");
                      setPage(1);
                    }}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Main content grid ─── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        {/* ── Data table ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={`${PANEL_CLASS} p-5`}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Issue Registry
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                All tracked issues with severity, status, and escalation
                posture.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {displayIssues.length} of {visibleTotal} showing
            </span>
          </div>

          <DataTable
            columns={columns}
            data={displayIssues}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyTitle="No issues found"
            emptyDescription="No issues match the current filters."
            emptyAction={
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/planning/issues/new")
                }
                className={PRIMARY_BUTTON_CLASS}
                style={PRIMARY_BUTTON_STYLE}
              >
                <Plus size={16} />
                Report First Issue
              </button>
            }
            onRowClick={(item) =>
              router.push(`/dashboard/planning/issues/${item.id}`)
            }
            pagination={
              meta
                ? {
                    currentPage: meta.page,
                    totalPages: meta.totalPages,
                    totalItems: meta.totalItems,
                    pageSize: meta.pageSize,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        </motion.section>

        {/* ── Sidebar intelligence ── */}
        <div className="space-y-5">
          {/* Severity breakdown */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={`${PANEL_CLASS} p-5`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Severity Breakdown
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Distribution of issue severity levels.
                </p>
              </div>
              <ShieldAlert size={18} className="text-[var(--primary)]" />
            </div>

            <div className="mt-4 space-y-3">
              {severityMix.length > 0 ? (
                severityMix.map((entry) => {
                  const meta = SEVERITY_META[entry.value];
                  const Icon = meta?.icon ?? ShieldAlert;
                  const pct =
                    issues.length > 0
                      ? Math.round((entry.count / issues.length) * 100)
                      : 0;
                  return (
                    <div key={entry.value} className={`${SOFT_PANEL_CLASS} p-3`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: meta?.bg ?? "var(--surface-2)",
                            }}
                          >
                            <Icon
                              size={13}
                              style={{ color: meta?.accent ?? "var(--text-secondary)" }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {entry.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {entry.count}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: meta?.accent ?? "var(--text-secondary)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                  No issues in current set.
                </p>
              )}
            </div>
          </motion.section>

          {/* Recent issues */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className={`${PANEL_CLASS} p-5`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Latest Activity
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Most recently reported issues.
                </p>
              </div>
              <Clock size={18} className="text-[var(--primary)]" />
            </div>

            <div className="mt-4 space-y-2">
              {recentIssues.length > 0 ? (
                recentIssues.map((issue) => {
                  const sevMeta = SEVERITY_META[issue.severity.toLowerCase()];
                  return (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/planning/issues/${issue.id}`,
                        )
                      }
                      className={`${SOFT_PANEL_CLASS} w-full p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor:
                              sevMeta?.bg ?? "var(--surface-2)",
                          }}
                        >
                          <AlertOctagon
                            size={13}
                            style={{
                              color:
                                sevMeta?.accent ?? "var(--text-secondary)",
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {issue.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <SeverityBadge severity={issue.severity} />
                            <span className="text-xs text-[var(--text-secondary)]">
                              {formatRelativeDate(issue.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                  No recent issues.
                </p>
              )}
            </div>
          </motion.section>

          {/* Overdue alert */}
          {overdueCount > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-[1.8rem] border p-5"
              style={{
                borderColor: "rgba(239,68,68,0.22)",
                background:
                  "linear-gradient(180deg, rgba(254,242,242,0.98), rgba(254,226,226,0.9))",
                boxShadow: "0 12px 30px rgba(239,68,68,0.08)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 100% 0%, rgba(239,68,68,0.15), transparent 40%)",
                }}
              />
              <div className="relative flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.18)",
                  }}
                >
                  <Clock size={18} style={{ color: "var(--error)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--error-dark)]">
                    {overdueCount} Overdue Issue{overdueCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--error-dark)]/70">
                    These issues have passed their due date and need immediate
                    attention.
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}

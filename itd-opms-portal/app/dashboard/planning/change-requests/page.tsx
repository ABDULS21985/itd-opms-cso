"use client";

import { useState, useMemo, type ElementType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitPullRequest,
  Plus,
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  User,
  Calendar,
  ChevronRight,
  X,
  Sparkles,
  Zap,
  Radar,
  Activity,
  Search,
  ShieldCheck,
  Target,
  FolderGit2,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useChangeRequests } from "@/hooks/use-planning";
import type { ChangeRequest } from "@/types";

const PANEL_CLASS =
  "rounded-[1.8rem] border border-slate-200/70 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/82 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5";

const FILTER_PILL_CLASS =
  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200";

const BRAND_TINT = "rgba(27,115,64,0.08)";
const BRAND_BORDER = "rgba(27,115,64,0.22)";
const GOLD_BORDER = "rgba(139,111,46,0.22)";
const INFO_BORDER = "rgba(59,130,246,0.22)";
const PRIMARY_BUTTON_STYLE = {
  backgroundImage: "var(--gradient-primary)",
  borderColor: "var(--primary-light)",
  boxShadow: "var(--shadow-premium)",
};
const HERO_STYLE = {
  backgroundImage:
    "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 38%), radial-gradient(circle at bottom left, rgba(139,111,46,0.18), transparent 34%), var(--gradient-primary)",
  borderColor: "rgba(45,155,86,0.32)",
  boxShadow: "var(--shadow-premium)",
};

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "implemented", label: "Implemented" },
];

const PRIORITIES = [
  { value: "", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "scope", label: "Scope" },
  { value: "schedule", label: "Schedule" },
  { value: "budget", label: "Budget" },
  { value: "resource", label: "Resource" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
];

const STATUS_META: Record<
  string,
  {
    label: string;
    accent: string;
    tint: string;
    border: string;
    icon: ElementType;
    copy: string;
  }
> = {
  submitted: {
    label: "Submitted",
    accent: "var(--info-dark)",
    tint: "var(--info-light)",
    border: INFO_BORDER,
    icon: Inbox,
    copy: "Fresh requests waiting to enter governance review.",
  },
  under_review: {
    label: "Under Review",
    accent: "var(--gold-dark)",
    tint: "var(--badge-amber-bg)",
    border: GOLD_BORDER,
    icon: Search,
    copy: "Actively triaged by project and delivery stakeholders.",
  },
  approved: {
    label: "Approved",
    accent: "var(--success-dark)",
    tint: "var(--success-light)",
    border: "var(--success)",
    icon: ShieldCheck,
    copy: "Accepted requests that are ready to move into execution.",
  },
  implemented: {
    label: "Implemented",
    accent: "var(--primary)",
    tint: BRAND_TINT,
    border: BRAND_BORDER,
    icon: CheckCircle2,
    copy: "Changes absorbed into delivery with outcome recorded.",
  },
  rejected: {
    label: "Rejected",
    accent: "var(--error-dark)",
    tint: "var(--error-light)",
    border: "var(--error)",
    icon: XCircle,
    copy: "Requests declined due to scope, timing, or value concerns.",
  },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "var(--error-light)", text: "var(--error-dark)" },
  high: { bg: "var(--warning-light)", text: "var(--warning-dark)" },
  medium: { bg: "var(--badge-amber-bg)", text: "var(--gold-dark)" },
  low: { bg: "var(--success-light)", text: "var(--success-dark)" },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  scope: { bg: "var(--badge-amber-bg)", text: "var(--gold-dark)" },
  schedule: { bg: "var(--badge-blue-bg)", text: "var(--badge-blue-text)" },
  budget: { bg: "var(--badge-emerald-bg)", text: "var(--badge-emerald-text)" },
  resource: { bg: "var(--warning-light)", text: "var(--warning-dark)" },
  technical: { bg: "var(--error-light)", text: "var(--error-dark)" },
  other: { bg: "var(--surface-1)", text: "var(--text-muted)" },
};

const WORKFLOW_ORDER: Record<string, number> = {
  submitted: 0,
  under_review: 1,
  approved: 2,
  rejected: 2,
  implemented: 3,
};

const WORKFLOW_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Review" },
  { key: "approved", label: "Decision" },
  { key: "implemented", label: "Done" },
];

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category.toLowerCase()] ?? {
    bg: "var(--surface-2)",
    text: "var(--neutral-gray)",
  };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {category}
    </span>
  );
}

function WorkflowIndicator({ status }: { status: string }) {
  const currentStep = WORKFLOW_ORDER[status.toLowerCase()] ?? 0;
  const isRejected = status.toLowerCase() === "rejected";

  return (
    <div className="flex items-center gap-1">
      {WORKFLOW_STEPS.map((step, idx) => {
        const isActive = idx <= currentStep;
        const isCurrent = idx === currentStep;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isCurrent && isRejected
                  ? "bg-[var(--error)]"
                  : isActive
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--surface-2)]"
              }`}
              title={step.label}
            />
            {idx < WORKFLOW_STEPS.length - 1 && (
              <ArrowRight
                size={8}
                className={
                  isActive ? "text-[var(--primary)]" : "text-[var(--surface-2)]"
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function relativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function priorityWeight(priority: string): number {
  switch (priority.toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function QuickMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ElementType;
  tone: { bg: string; border: string; text: string };
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-[1.35rem] border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl"
      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {label}
        </span>
        <Icon size={16} style={{ color: tone.text }} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        {hint}
      </p>
    </motion.div>
  );
}

function WorkflowLane({
  meta,
  items,
  isActive,
  onActivate,
  onOpen,
}: {
  meta: {
    key: string;
    label: string;
    accent: string;
    tint: string;
    border: string;
    icon: ElementType;
    copy: string;
  };
  items: ChangeRequest[];
  isActive: boolean;
  onActivate: () => void;
  onOpen: (id: string) => void;
}) {
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onActivate}
      className={`group flex h-full flex-col rounded-[1.45rem] border p-4 text-left transition-all duration-200 ${
        isActive
          ? "shadow-[0_24px_50px_-34px_rgba(15,23,42,0.35)]"
          : "hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-36px_rgba(15,23,42,0.22)]"
      }`}
      style={{
        backgroundColor: meta.tint,
        borderColor: meta.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/78 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
              style={{ color: meta.accent, borderColor: meta.border }}
            >
              <Icon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {meta.label}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {items.length} request{items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            {meta.copy}
          </p>
        </div>
        {isActive && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: meta.accent,
              backgroundColor: "rgba(255,255,255,0.72)",
            }}
          >
            Focus
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {items.slice(0, 3).map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(item.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onOpen(item.id);
              }
            }}
            className="rounded-[1.1rem] border border-white/70 bg-white/80 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                  {item.projectTitle || "Unlinked request"}
                </p>
              </div>
              <PriorityBadge priority={item.priority} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>{relativeDate(item.createdAt)}</span>
              {item.category ? (
                <CategoryBadge category={item.category} />
              ) : (
                <span>Open category</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="mt-4 rounded-[1.1rem] border border-dashed border-white/70 bg-white/55 p-4 text-center text-xs text-[var(--text-secondary)]">
          No requests in this lane.
        </div>
      )}
    </button>
  );
}

export default function ChangeRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useChangeRequests(
    page,
    20,
    projectId,
    status || undefined,
    priority || undefined,
    category || undefined,
  );

  const changeRequests = data?.data ?? [];
  const meta = data?.meta;

  const stats = useMemo(() => {
    const total = meta?.totalItems ?? 0;
    const pendingReview = changeRequests.filter(
      (request) =>
        request.status === "submitted" || request.status === "under_review",
    ).length;
    const approved = changeRequests.filter(
      (request) =>
        request.status === "approved" || request.status === "implemented",
    ).length;
    const rejected = changeRequests.filter(
      (request) => request.status === "rejected",
    ).length;
    const highPriority = changeRequests.filter(
      (request) =>
        request.priority.toLowerCase() === "critical" ||
        request.priority.toLowerCase() === "high",
    ).length;
    const technical = changeRequests.filter(
      (request) => request.category?.toLowerCase() === "technical",
    ).length;

    return {
      total,
      pendingReview,
      approved,
      rejected,
      highPriority,
      technical,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }, [changeRequests, meta]);

  const hasActiveFilters = Boolean(status || priority || category);

  const spotlightRequests = useMemo(
    () =>
      [...changeRequests]
        .sort((left, right) => {
          const priorityDelta =
            priorityWeight(right.priority) - priorityWeight(left.priority);
          if (priorityDelta !== 0) return priorityDelta;
          return (
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
          );
        })
        .slice(0, 4),
    [changeRequests],
  );

  const categoryMix = useMemo(
    () =>
      CATEGORIES.filter((entry) => entry.value)
        .map((entry) => ({
          key: entry.value,
          label: entry.label,
          count: changeRequests.filter(
            (request) => request.category?.toLowerCase() === entry.value,
          ).length,
        }))
        .filter((entry) => entry.count > 0)
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
    [changeRequests],
  );

  const workflowLanes = useMemo(
    () =>
      Object.entries(STATUS_META).map(([key, metaEntry]) => ({
        key,
        ...metaEntry,
        items: changeRequests.filter(
          (request) => request.status.toLowerCase() === key,
        ),
      })),
    [changeRequests],
  );

  const filtersApplied = [status, priority, category].filter(Boolean).length;

  const columns: Column<ChangeRequest>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[260px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: BRAND_TINT }}
          >
            <GitPullRequest size={16} style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {item.title}
            </p>
            {item.description && (
              <p className="line-clamp-1 max-w-[280px] text-xs text-[var(--neutral-gray)]">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "projectId",
      header: "Project",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.projectTitle || "--"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) =>
        item.category ? (
          <CategoryBadge category={item.category} />
        ) : (
          <span className="text-sm text-[var(--neutral-gray)]">--</span>
        ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (item) => <PriorityBadge priority={item.priority} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={item.status} />
          <WorkflowIndicator status={item.status} />
        </div>
      ),
    },
    {
      key: "requestedBy",
      header: "Requested By",
      render: (item) => (
        <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <User size={14} className="text-[var(--neutral-gray)]" />
          {item.requestedByName || "Unknown"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (item) => (
        <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <Calendar size={14} className="text-[var(--neutral-gray)]" />
          {relativeDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions" as keyof ChangeRequest,
      header: "",
      align: "center" as const,
      render: () => (
        <ChevronRight size={16} className="text-[var(--neutral-gray)]" />
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border px-6 py-7 text-white"
        style={HERO_STYLE}
      >
        <div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div
          className="absolute bottom-0 left-0 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(139,111,46,0.16)" }}
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/82 backdrop-blur-xl">
              <FolderGit2 size={14} />
              Change Control Studio
            </div>
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                <GitPullRequest size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.15rem]">
                  Change Requests
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/86 sm:text-[15px]">
                  Orchestrate project change demand with live workflow lanes,
                  pressure signals, and a cleaner view of what needs review
                  next.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Clock size={14} />
                    {stats.pendingReview} pending review
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Activity size={14} />
                    {stats.highPriority} high-pressure item
                    {stats.highPriority === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Radar size={14} />
                    {hasActiveFilters
                      ? `${filtersApplied} filters applied`
                      : "Portfolio-wide queue"}
                  </span>
                  {projectId && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Target size={14} />
                      Project-scoped view
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[460px]">
            <QuickMetricCard
              label="Total Queue"
              value={String(stats.total)}
              hint="All visible requests in the current scope."
              icon={Inbox}
              tone={{
                bg: "rgba(255,255,255,0.12)",
                border: "rgba(255,255,255,0.16)",
                text: "var(--success-light)",
              }}
              delay={0.05}
            />
            <QuickMetricCard
              label="Approval Rate"
              value={`${stats.approvalRate}%`}
              hint="Approved and implemented mix from the visible queue."
              icon={ShieldCheck}
              tone={{
                bg: "rgba(255,255,255,0.12)",
                border: "rgba(255,255,255,0.16)",
                text: "var(--success-light)",
              }}
              delay={0.1}
            />
            <QuickMetricCard
              label="Technical Drift"
              value={String(stats.technical)}
              hint="Requests classified as technical change pressure."
              icon={Zap}
              tone={{
                bg: "rgba(255,255,255,0.12)",
                border: "rgba(255,255,255,0.16)",
                text: "var(--gold-light)",
              }}
              delay={0.15}
            />
            <QuickMetricCard
              label="Rejected"
              value={String(stats.rejected)}
              hint="Requests stopped before execution."
              icon={XCircle}
              tone={{
                bg: "rgba(255,255,255,0.12)",
                border: "rgba(255,255,255,0.16)",
                text: "var(--error-light)",
              }}
              delay={0.2}
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`${PANEL_CLASS} p-3 sm:p-4`}
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            className={`${SECONDARY_BUTTON_CLASS} ${
              hasActiveFilters
                ? "border-[var(--primary-light)] bg-[var(--success-light)] text-[var(--primary)]"
                : ""
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
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
            onClick={() => setStatus("under_review")}
            className={SECONDARY_BUTTON_CLASS}
          >
            <Sparkles size={16} />
            Focus Review Lane
          </button>
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/planning/change-requests/new")
            }
            className={`${PRIMARY_BUTTON_CLASS} sm:ml-auto`}
            style={PRIMARY_BUTTON_STYLE}
          >
            <Plus size={16} />
            New Change Request
          </button>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={`${PANEL_CLASS} p-5`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Live Workflow Board
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Each lane reflects the current page of requests and doubles as a
                one-click workflow filter.
              </p>
            </div>
            <span className="rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Click a lane to filter
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-5">
            {workflowLanes.map((lane) => (
              <WorkflowLane
                key={lane.key}
                meta={lane}
                items={lane.items}
                isActive={status === lane.key}
                onActivate={() => {
                  setStatus((current) =>
                    current === lane.key ? "" : lane.key,
                  );
                  setPage(1);
                }}
                onOpen={(id) =>
                  router.push(`/dashboard/planning/change-requests/${id}`)
                }
              />
            ))}
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-5"
        >
          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Signal Center
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Fast context for the current queue.
                </p>
              </div>
              <Radar size={18} style={{ color: "var(--primary)" }} />
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/85 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    Queue Health
                  </span>
                  <ShieldCheck
                    size={16}
                    style={{ color: "var(--success-dark)" }}
                  />
                </div>
                <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
                  {stats.approvalRate}%
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Approval and implementation share across the visible queue.
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${stats.approvalRate}%`,
                      backgroundImage: "var(--gradient-primary)",
                    }}
                  />
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/85 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    Category Mix
                  </span>
                  <Activity size={16} style={{ color: "var(--gold)" }} />
                </div>
                <div className="mt-4 space-y-3">
                  {categoryMix.length > 0 ? (
                    categoryMix.map((entry) => {
                      const color = CATEGORY_COLORS[entry.key];
                      const pct =
                        changeRequests.length > 0
                          ? Math.round(
                              (entry.count / changeRequests.length) * 100,
                            )
                          : 0;

                      return (
                        <div key={entry.key}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-[var(--text-primary)]">
                              {entry.label}
                            </span>
                            <span className="text-[var(--text-secondary)]">
                              {entry.count}
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  color?.text || "var(--text-muted)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">
                      No category trend is visible in the current result set.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/85 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    Pressure Points
                  </span>
                  <Zap size={16} style={{ color: "var(--warning-dark)" }} />
                </div>
                <div className="mt-4 space-y-3">
                  {spotlightRequests.length > 0 ? (
                    spotlightRequests.map((request) => (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/planning/change-requests/${request.id}`,
                          )
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {request.title}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {request.projectTitle || "Unlinked request"} ·{" "}
                            {relativeDate(request.createdAt)}
                          </p>
                        </div>
                        <PriorityBadge priority={request.priority} />
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">
                      No requests to spotlight in this view.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </motion.aside>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`${PANEL_CLASS} p-5`}>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      Filter the Queue
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Combine quick workflow chips with formal dropdown filters.
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatus("");
                        setPriority("");
                        setCategory("");
                        setPage(1);
                      }}
                      className={SECONDARY_BUTTON_CLASS}
                    >
                      <X size={14} />
                      Clear All
                    </button>
                  )}
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    Status Lenses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.filter((entry) => entry.value).map((entry) => (
                      <button
                        key={entry.value}
                        type="button"
                        onClick={() => {
                          setStatus((current) =>
                            current === entry.value ? "" : entry.value,
                          );
                          setPage(1);
                        }}
                        className={FILTER_PILL_CLASS}
                        style={{
                          color:
                            status === entry.value
                              ? STATUS_META[entry.value].accent
                              : "var(--text-secondary)",
                          backgroundColor:
                            status === entry.value
                              ? STATUS_META[entry.value].tint
                              : "rgba(248,250,252,0.88)",
                          borderColor:
                            status === entry.value
                              ? STATUS_META[entry.value].border
                              : "rgba(226,232,240,0.85)",
                        }}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-2xl border border-slate-200/80 bg-white/88 px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                    >
                      {STATUSES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(event) => {
                        setPriority(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-2xl border border-slate-200/80 bg-white/88 px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                    >
                      {PRIORITIES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(event) => {
                        setCategory(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-2xl border border-slate-200/80 bg-white/88 px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                    >
                      {CATEGORIES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2">
                    {status && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatus("");
                          setPage(1);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                        style={{
                          borderColor: "var(--primary-light)",
                          backgroundColor: "var(--success-light)",
                          color: "var(--primary)",
                        }}
                      >
                        Status:{" "}
                        {
                          STATUSES.find((entry) => entry.value === status)
                            ?.label
                        }
                        <X size={12} />
                      </button>
                    )}
                    {priority && (
                      <button
                        type="button"
                        onClick={() => {
                          setPriority("");
                          setPage(1);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                        style={{
                          borderColor: "var(--warning)",
                          backgroundColor: "var(--warning-light)",
                          color: "var(--warning-dark)",
                        }}
                      >
                        Priority:{" "}
                        {
                          PRIORITIES.find((entry) => entry.value === priority)
                            ?.label
                        }
                        <X size={12} />
                      </button>
                    )}
                    {category && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategory("");
                          setPage(1);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                        style={{
                          borderColor: GOLD_BORDER,
                          backgroundColor: "var(--badge-amber-bg)",
                          color: "var(--gold-dark)",
                        }}
                      >
                        Category:{" "}
                        {
                          CATEGORIES.find((entry) => entry.value === category)
                            ?.label
                        }
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className={PANEL_CLASS}
      >
        <div className="border-b border-slate-200/80 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Request Inventory
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Dense tabular view for sorting, pagination, and full queue
                review.
              </p>
            </div>
            <span className="rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {meta?.totalItems ?? 0} total visible
            </span>
          </div>
        </div>

        <div className="p-1 sm:p-2">
          <DataTable
            columns={columns}
            data={changeRequests}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            onRowClick={(item) =>
              router.push(`/dashboard/planning/change-requests/${item.id}`)
            }
            emptyTitle="No change requests found"
            emptyDescription="Submit a change request to modify project scope, schedule, or budget."
            emptyAction={
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/planning/change-requests/new")
                }
                className={PRIMARY_BUTTON_CLASS}
                style={PRIMARY_BUTTON_STYLE}
              >
                <Plus size={16} />
                New Change Request
              </button>
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
        </div>
      </motion.section>
    </div>
  );
}

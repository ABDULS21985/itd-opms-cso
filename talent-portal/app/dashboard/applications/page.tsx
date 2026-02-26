"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  ExternalLink,
  FileText,
  Clock,
  Eye,
  Star,
  MessageSquare,
  Award,
  XCircle,
  MinusCircle,
  AlertCircle,
  LayoutGrid,
  List,
  TrendingUp,
  Percent,
  X,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMyApplications, useWithdrawApplication } from "@/hooks/use-jobs";
import type { JobApplication } from "@/types/job";
import { SearchBar } from "@/components/shared/search-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedCard, AnimatedCardGrid } from "@/components/shared/animated-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  cn,
  formatDate,
  formatRelativeTime,
  truncate,
  getInitials,
} from "@/lib/utils";
import { toast } from "sonner";

/* ══════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════ */

const STATUSES = [
  "all",
  "submitted",
  "viewed",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    bg: string;
    text: string;
    dot: string;
    pulse?: boolean;
  }
> = {
  submitted: {
    label: "Submitted",
    icon: Clock,
    bg: "bg-[var(--info-light)]",
    text: "text-[var(--info-dark)]",
    dot: "bg-[var(--info-dark)]",
  },
  viewed: {
    label: "Viewed",
    icon: Eye,
    bg: "bg-[var(--primary)]/10",
    text: "text-[var(--primary)]",
    dot: "bg-[var(--primary)]",
    pulse: true,
  },
  shortlisted: {
    label: "Shortlisted",
    icon: Star,
    bg: "bg-[var(--primary)]/10",
    text: "text-[var(--primary)]",
    dot: "bg-[var(--primary)]",
    pulse: true,
  },
  interview: {
    label: "Interview",
    icon: MessageSquare,
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-dark)]",
    dot: "bg-[var(--warning-dark)]",
    pulse: true,
  },
  offer: {
    label: "Offer",
    icon: Award,
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-dark)]",
    dot: "bg-[var(--success-dark)]",
    pulse: true,
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error-dark)]",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: MinusCircle,
    bg: "bg-[var(--surface-2)]",
    text: "text-[var(--neutral-gray)]",
    dot: "bg-[var(--neutral-gray)]",
  },
};

const PIPELINE_HEX: Record<string, { color: string; bg: string }> = {
  submitted: { color: "#2563EB", bg: "#EFF6FF" },
  viewed: { color: "var(--primary)", bg: "var(--info-light, #E8EEFF)" },
  shortlisted: { color: "var(--primary)", bg: "var(--info-light, #DBE4FF)" },
  interview: { color: "#D97706", bg: "#FEF3C7" },
  offer: { color: "#059669", bg: "#D1FAE5" },
  rejected: { color: "#DC2626", bg: "#FEE2E2" },
  withdrawn: { color: "#6B7280", bg: "#F3F4F6" },
};

const DATE_RANGES = [
  { label: "All time", value: "all", days: 0 },
  { label: "7 days", value: "7d", days: 7 },
  { label: "30 days", value: "30d", days: 30 },
  { label: "90 days", value: "90d", days: 90 },
] as const;

type SortField = "date" | "status" | "company" | "title";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "cards";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

/* ══════════════════════════════════════════════════════════
   Stat Card
   ══════════════════════════════════════════════════════════ */

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  bg,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  bg: string;
  index?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--neutral-gray)] mb-1">
            {label}
          </p>
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
            style={{ color }}
          >
            {value}
            {suffix && (
              <span className="text-sm font-semibold ml-0.5">{suffix}</span>
            )}
          </motion.p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div
        className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Status Pipeline
   ══════════════════════════════════════════════════════════ */

function StatusPipeline({
  applications,
}: {
  applications: JobApplication[];
}) {
  const total = applications.length || 1;

  const stages = useMemo(() => {
    return STATUSES.filter((s) => s !== "all").map((key) => ({
      key,
      label: STATUS_CONFIG[key]?.label ?? key,
      count: applications.filter((a) => a.status === key).length,
      ...(PIPELINE_HEX[key] ?? { color: "#6B7280", bg: "#F3F4F6" }),
    }));
  }, [applications]);

  const nonEmpty = stages.filter((s) => s.count > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <motion.div
      variants={fadeUp}
      className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-4"
    >
      <p className="text-xs font-medium text-[var(--neutral-gray)] mb-3">
        Application Pipeline
      </p>
      <div className="flex h-9 rounded-xl overflow-hidden gap-0.5">
        {nonEmpty.map((stage) => {
          const pct = Math.max((stage.count / total) * 100, 10);
          return (
            <motion.div
              key={stage.key}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ backgroundColor: stage.bg }}
              className="flex items-center justify-center min-w-[40px] relative group cursor-default"
            >
              <span
                style={{ color: stage.color }}
                className="text-[11px] font-bold"
              >
                {stage.count}
              </span>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] font-semibold bg-[var(--foreground)] text-[var(--surface-0)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {stage.label}: {stage.count}
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {nonEmpty.map((stage) => (
          <div key={stage.key} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-[10px] text-[var(--neutral-gray)] font-medium">
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Status Badge
   ══════════════════════════════════════════════════════════ */

function AppStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
        config.bg,
        config.text,
      )}
    >
      {config.pulse ? (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              config.dot,
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              config.dot,
            )}
          />
        </span>
      ) : (
        <span className={cn("inline-flex rounded-full h-2 w-2", config.dot)} />
      )}
      {config.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   Company Avatar
   ══════════════════════════════════════════════════════════ */

function CompanyAvatar({
  name,
  logoUrl,
  size = "sm",
}: {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const px = size === "md" ? "w-14 h-14" : "w-8 h-8";
  const textSize = size === "md" ? "text-sm" : "text-[10px]";

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn(px, "rounded-xl object-cover flex-shrink-0 border border-[var(--border)]")}
      />
    );
  }

  return (
    <div
      className={cn(
        px,
        "rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/20 flex items-center justify-center flex-shrink-0",
      )}
    >
      <span className={cn(textSize, "font-bold text-[var(--primary)]")}>
        {getInitials(name)}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Application Detail Sheet
   ══════════════════════════════════════════════════════════ */

function ApplicationSheet({
  app,
  open,
  onClose,
  onWithdraw,
}: {
  app: JobApplication | null;
  open: boolean;
  onClose: () => void;
  onWithdraw: (id: string) => void;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const timeline = useMemo(() => {
    if (!app) return [];
    const steps: { label: string; date: string | null; color: string }[] = [];

    steps.push({ label: "Applied", date: app.createdAt, color: "#2563EB" });

    if (
      app.viewedAt ||
      ["viewed", "shortlisted", "interview", "offer"].includes(app.status)
    ) {
      steps.push({
        label: "Viewed by employer",
        date: app.viewedAt,
        color: "var(--primary)",
      });
    }

    if (
      app.shortlistedAt ||
      ["shortlisted", "interview", "offer"].includes(app.status)
    ) {
      steps.push({
        label: "Shortlisted",
        date: app.shortlistedAt,
        color: "var(--primary)",
      });
    }

    if (["interview", "offer"].includes(app.status)) {
      steps.push({ label: "Interview stage", date: null, color: "#D97706" });
    }

    if (app.status === "offer") {
      steps.push({
        label: "Offer received",
        date: app.updatedAt,
        color: "#059669",
      });
    }

    if (app.status === "rejected") {
      steps.push({
        label: "Rejected",
        date: app.updatedAt,
        color: "#DC2626",
      });
    }

    if (app.status === "withdrawn") {
      steps.push({
        label: "Withdrawn",
        date: app.updatedAt,
        color: "#6B7280",
      });
    }

    return steps;
  }, [app]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && app && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--surface-0)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Application Details
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Company & Job */}
              <div className="flex items-start gap-4">
                <CompanyAvatar
                  name={app.job?.employer?.companyName ?? "?"}
                  logoUrl={app.job?.employer?.logoUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    {app.job?.title ?? "Untitled Job"}
                  </h3>
                  <p className="text-sm text-[var(--neutral-gray)]">
                    {app.job?.employer?.companyName ?? "Unknown Company"}
                  </p>
                  <div className="mt-2">
                    <AppStatusBadge status={app.status} />
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                  Status Timeline
                </h4>
                <div className="space-y-0">
                  {timeline.map((step, i) => (
                    <div key={step.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                          style={{
                            borderColor: step.color,
                            backgroundColor: step.color,
                          }}
                        />
                        {i < timeline.length - 1 && (
                          <div className="w-0.5 h-8 bg-[var(--border)]" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-[var(--foreground)] -mt-0.5">
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-xs text-[var(--neutral-gray)]">
                            {formatDate(step.date)} &middot;{" "}
                            {formatRelativeTime(step.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cover Note */}
              {app.coverNote && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                    Cover Note
                  </h4>
                  <div className="bg-[var(--surface-1)] rounded-xl p-4 text-sm text-[var(--neutral-gray)] leading-relaxed whitespace-pre-wrap">
                    {app.coverNote}
                  </div>
                </div>
              )}

              {/* CV */}
              {app.cvDocumentId && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                    Submitted CV
                  </h4>
                  <div className="flex items-center gap-3 bg-[var(--surface-1)] rounded-xl p-4">
                    <FileText size={20} className="text-[var(--primary)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Resume / CV
                      </p>
                      <p className="text-xs text-[var(--neutral-gray)]">
                        Submitted with application
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection reason */}
              {app.status === "rejected" && app.rejectionReason && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                    Feedback
                  </h4>
                  <div className="bg-[var(--error-light)] rounded-xl p-4 text-sm text-[var(--error-dark)] leading-relaxed">
                    {app.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] px-6 py-4 flex items-center gap-3">
              {app.job?.slug && (
                <Link
                  href={`/jobs/${app.job.slug}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                >
                  <ExternalLink size={14} />
                  View Job Posting
                </Link>
              )}
              {app.status === "submitted" && (
                <button
                  onClick={() => onWithdraw(app.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--error)] text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
                >
                  <XCircle size={14} />
                  Withdraw
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   Sortable Header
   ══════════════════════════════════════════════════════════ */

function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider hover:text-[var(--foreground)] transition-colors"
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? (
          <ArrowUp size={12} />
        ) : (
          <ArrowDown size={12} />
        )
      ) : (
        <ArrowUpDown size={12} className="opacity-40" />
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   Loading Skeleton
   ══════════════════════════════════════════════════════════ */

function LoadingSkeleton({ view }: { view: ViewMode }) {
  if (view === "cards") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-5 animate-pulse"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--surface-2)] rounded w-3/4" />
                <div className="h-3 bg-[var(--surface-2)] rounded w-1/2" />
              </div>
            </div>
            <div className="h-3 bg-[var(--surface-2)] rounded w-1/3 mb-3" />
            <div className="h-6 bg-[var(--surface-2)] rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-6 py-3">
        <div className="flex gap-8">
          {[120, 100, 80, 90, 60].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-[var(--surface-2)] rounded animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="px-6 py-4 border-b border-[var(--border)] last:border-0"
        >
          <div className="flex items-center gap-8 animate-pulse">
            <div className="h-4 bg-[var(--surface-2)] rounded w-40" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-2)]" />
              <div className="h-3 bg-[var(--surface-2)] rounded w-24" />
            </div>
            <div className="h-5 bg-[var(--surface-2)] rounded-lg w-20" />
            <div className="h-3 bg-[var(--surface-2)] rounded w-20" />
            <div className="h-3 bg-[var(--surface-2)] rounded w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════════ */

export default function ApplicationsPage() {
  /* ── State ── */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  /* ── Data ── */
  const { data, isLoading, isError } = useMyApplications({ limit: 100 });
  const withdrawMutation = useWithdrawApplication();
  const allApplications = data?.data ?? [];

  /* ── Stats (always from full dataset, before filters) ── */
  const stats = useMemo(() => {
    const total = allApplications.length;
    const active = allApplications.filter((a) =>
      ["submitted", "viewed", "shortlisted", "interview"].includes(a.status),
    ).length;
    const offers = allApplications.filter(
      (a) => a.status === "offer",
    ).length;
    const rate = total > 0 ? Math.round((offers / total) * 100) : 0;
    return { total, active, offers, rate };
  }, [allApplications]);

  /* ── Filtering ── */
  const filteredApps = useMemo(() => {
    let apps = [...allApplications];

    if (filterStatus !== "all") {
      apps = apps.filter((a) => a.status === filterStatus);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      apps = apps.filter(
        (a) =>
          (a.job?.title ?? "").toLowerCase().includes(q) ||
          (a.job?.employer?.companyName ?? "").toLowerCase().includes(q),
      );
    }

    if (dateRange !== "all") {
      const days =
        DATE_RANGES.find((d) => d.value === dateRange)?.days ?? 0;
      if (days > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        apps = apps.filter((a) => new Date(a.createdAt) >= cutoff);
      }
    }

    return apps;
  }, [allApplications, filterStatus, search, dateRange]);

  /* ── Sorting ── */
  const sortedApps = useMemo(() => {
    const apps = [...filteredApps];
    const dir = sortDir === "asc" ? 1 : -1;
    apps.sort((a, b) => {
      switch (sortField) {
        case "date":
          return (
            dir *
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime())
          );
        case "title":
          return (
            dir *
            (a.job?.title ?? "").localeCompare(b.job?.title ?? "")
          );
        case "company":
          return (
            dir *
            (a.job?.employer?.companyName ?? "").localeCompare(
              b.job?.employer?.companyName ?? "",
            )
          );
        case "status":
          return dir * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    return apps;
  }, [filteredApps, sortField, sortDir]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(sortedApps.length / pageSize);
  const paginatedApps = sortedApps.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [filterStatus, search, dateRange, pageSize]);

  /* ── Handlers ── */
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  const handleOpenDetail = useCallback((app: JobApplication) => {
    setSelectedApp(app);
    setSheetOpen(true);
  }, []);

  const handleWithdrawConfirm = useCallback(() => {
    if (!withdrawTarget) return;
    withdrawMutation.mutate(withdrawTarget, {
      onSuccess: () => {
        toast.success("Application withdrawn successfully.");
        setWithdrawTarget(null);
        setSheetOpen(false);
      },
      onError: () => toast.error("Failed to withdraw application."),
    });
  }, [withdrawTarget, withdrawMutation]);

  const handleWithdrawFromSheet = useCallback((id: string) => {
    setWithdrawTarget(id);
  }, []);

  /* ── Error state ── */
  if (isError) {
    return (
      <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <AlertCircle
          size={48}
          className="mx-auto text-[var(--error)] mb-4"
        />
        <h3 className="font-semibold text-[var(--foreground)] mb-1">
          Failed to load applications
        </h3>
        <p className="text-sm text-[var(--neutral-gray)]">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }

  const hasActiveFilters =
    search !== "" || filterStatus !== "all" || dateRange !== "all";

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="space-y-5"
    >
      {/* ─── Header ─── */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          My Applications
        </h1>
        <p className="text-sm text-[var(--neutral-gray)] mt-1">
          Track and manage your job applications
        </p>
      </motion.div>

      {/* ─── Stats ─── */}
      {!isLoading && (
        <motion.div
          variants={stagger}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatCard
            icon={Briefcase}
            label="Total Applications"
            value={stats.total}
            color="var(--primary)"
            bg="var(--info-light, #E8EEFF)"
            index={0}
          />
          <StatCard
            icon={TrendingUp}
            label="Active"
            value={stats.active}
            color="#D97706"
            bg="#FEF3C7"
            index={1}
          />
          <StatCard
            icon={Award}
            label="Offers"
            value={stats.offers}
            color="#059669"
            bg="#D1FAE5"
            index={2}
          />
          <StatCard
            icon={Percent}
            label="Success Rate"
            value={stats.rate}
            suffix="%"
            color="#7C3AED"
            bg="#EDE9FE"
            index={3}
          />
        </motion.div>
      )}

      {/* ─── Pipeline ─── */}
      {!isLoading && allApplications.length > 0 && (
        <StatusPipeline applications={allApplications} />
      )}

      {/* ─── Filter Bar ─── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              placeholder="Search by job title or company..."
              onSearch={setSearch}
              debounceMs={400}
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-0.5">
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                view === "table"
                  ? "bg-[var(--surface-0)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--neutral-gray)] hover:text-[var(--foreground)]",
              )}
            >
              <List size={14} />
              Table
            </button>
            <button
              onClick={() => setView("cards")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                view === "cards"
                  ? "bg-[var(--surface-0)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--neutral-gray)] hover:text-[var(--foreground)]",
              )}
            >
              <LayoutGrid size={14} />
              Cards
            </button>
          </div>
        </div>

        {/* Status pills + Date pills */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((status) => {
            const isActive = filterStatus === status;
            const label =
              status === "all"
                ? "All"
                : (STATUS_CONFIG[status]?.label ?? status);
            const count =
              status === "all"
                ? allApplications.length
                : allApplications.filter((a) => a.status === status).length;

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  isActive
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--surface-0)] text-[var(--neutral-gray)] border-[var(--border)] hover:border-[var(--primary)]/30 hover:text-[var(--primary)]",
                )}
              >
                {label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="w-px h-5 bg-[var(--border)] mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-[var(--neutral-gray)]" />
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                  dateRange === range.value
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
                    : "bg-[var(--surface-0)] text-[var(--neutral-gray)] border-transparent hover:text-[var(--foreground)]",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Content ─── */}
      {isLoading ? (
        <LoadingSkeleton view={view} />
      ) : filteredApps.length === 0 ? (
        <motion.div variants={fadeUp}>
          <EmptyState
            icon={hasActiveFilters ? Search : Briefcase}
            title={
              hasActiveFilters
                ? "No matching applications"
                : "No applications yet"
            }
            description={
              hasActiveFilters
                ? "Try adjusting your filters"
                : "Start applying to jobs to track your applications here"
            }
            action={
              !hasActiveFilters ? (
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity mt-3"
                >
                  <Briefcase size={14} />
                  Browse Jobs
                </Link>
              ) : undefined
            }
          />
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {view === "table" ? (
            /* ─── Table View ─── */
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                        <th className="text-left px-6 py-3">
                          <SortableHeader
                            label="Job Title"
                            field="title"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left px-6 py-3">
                          <SortableHeader
                            label="Company"
                            field="company"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left px-6 py-3">
                          <SortableHeader
                            label="Status"
                            field="status"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-left px-6 py-3">
                          <SortableHeader
                            label="Applied"
                            field="date"
                            currentField={sortField}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="text-right px-6 py-3">
                          <span className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                            Actions
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {paginatedApps.map((app, i) => (
                        <motion.tr
                          key={app.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => handleOpenDetail(app)}
                          className="hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {app.job?.title ?? "Untitled Job"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <CompanyAvatar
                                name={
                                  app.job?.employer?.companyName ?? "?"
                                }
                                logoUrl={app.job?.employer?.logoUrl}
                              />
                              <span className="text-sm text-[var(--neutral-gray)]">
                                {app.job?.employer?.companyName ??
                                  "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <AppStatusBadge status={app.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm text-[var(--foreground)]">
                                {formatDate(app.createdAt)}
                              </p>
                              <p className="text-[11px] text-[var(--neutral-gray)]">
                                {formatRelativeTime(app.createdAt)}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {app.job?.slug && (
                                <Link
                                  href={`/jobs/${app.job.slug}`}
                                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[var(--primary)] transition-colors"
                                >
                                  <ExternalLink size={16} />
                                </Link>
                              )}
                              {app.status === "submitted" && (
                                <button
                                  onClick={() =>
                                    setWithdrawTarget(app.id)
                                  }
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--error-light)] hover:text-[var(--error)] hover:border-[var(--error)] transition-colors"
                                >
                                  Withdraw
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ─── Card View ─── */
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatedCardGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedApps.map((app, i) => (
                  <AnimatedCard
                    key={app.id}
                    index={i}
                    onClick={() => handleOpenDetail(app)}
                    className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-5 cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <CompanyAvatar
                        name={
                          app.job?.employer?.companyName ?? "?"
                        }
                        logoUrl={app.job?.employer?.logoUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
                          {app.job?.title ?? "Untitled Job"}
                        </h3>
                        <p className="text-xs text-[var(--neutral-gray)] truncate">
                          {app.job?.employer?.companyName ?? "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <AppStatusBadge status={app.status} />
                      <span className="text-[11px] text-[var(--neutral-gray)]">
                        {formatRelativeTime(app.createdAt)}
                      </span>
                    </div>

                    {app.coverNote && (
                      <p className="text-xs text-[var(--neutral-gray)] leading-relaxed mb-3">
                        {truncate(app.coverNote, 120)}
                      </p>
                    )}

                    <div
                      className="flex items-center gap-2 pt-3 border-t border-[var(--border)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {app.job?.slug && (
                        <Link
                          href={`/jobs/${app.job.slug}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:opacity-80 transition-opacity"
                        >
                          <ExternalLink size={12} />
                          View Job
                        </Link>
                      )}
                      {app.status === "submitted" && (
                        <>
                          <span className="text-[var(--border)]">|</span>
                          <button
                            onClick={() => setWithdrawTarget(app.id)}
                            className="text-xs font-medium text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
                          >
                            Withdraw
                          </button>
                        </>
                      )}
                    </div>
                  </AnimatedCard>
                ))}
              </AnimatedCardGrid>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ─── Pagination ─── */}
      {!isLoading && sortedApps.length > 0 && (
        <motion.div variants={fadeUp}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={sortedApps.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </motion.div>
      )}

      {/* ─── Application Detail Sheet ─── */}
      <ApplicationSheet
        app={selectedApp}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onWithdraw={handleWithdrawFromSheet}
      />

      {/* ─── Withdraw Confirmation ─── */}
      <ConfirmDialog
        open={!!withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={handleWithdrawConfirm}
        title="Withdraw Application?"
        message="You won't be able to reapply to this position. This action cannot be undone."
        confirmLabel="Withdraw"
        variant="danger"
        loading={withdrawMutation.isPending}
      />
    </motion.div>
  );
}

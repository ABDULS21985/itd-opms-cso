"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  PlusCircle,
  Search,
  MapPin,
  Clock,
  Users,
  Eye,
  Loader2,
  LayoutGrid,
  List,
  MoreHorizontal,
  Copy,
  Edit3,
  Trash2,
  XCircle,
  RotateCcw,
  CheckSquare,
  ChevronDown,
  FileText,
  TrendingUp,
  AlertCircle,
  Wifi,
  Building,
  Monitor,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEmployerJobs, useCloseJob } from "@/hooks/use-jobs";
import { JobStatus } from "@/types/job";
import type { JobPost } from "@/types/job";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  [JobStatus.PUBLISHED]: { label: "Active", bg: "bg-[var(--success-light)]", text: "text-[var(--success-dark)]", dot: "bg-[var(--success)]" },
  [JobStatus.CLOSED]: { label: "Closed", bg: "bg-[var(--surface-2)]", text: "text-[var(--neutral-gray)]", dot: "bg-[var(--neutral-gray)]" },
  [JobStatus.DRAFT]: { label: "Draft", bg: "bg-[var(--warning-light)]", text: "text-[var(--warning-dark)]", dot: "bg-[var(--warning)]" },
  [JobStatus.PENDING_REVIEW]: { label: "Pending", bg: "bg-[var(--info-light)]", text: "text-[var(--info-dark)]", dot: "bg-[var(--info)]" },
  [JobStatus.REJECTED]: { label: "Rejected", bg: "bg-[var(--error-light)]", text: "text-[var(--error-dark)]", dot: "bg-[var(--error)]" },
  [JobStatus.ARCHIVED]: { label: "Archived", bg: "bg-[var(--surface-2)]", text: "text-[var(--neutral-gray)]", dot: "bg-[var(--neutral-gray)]" },
};

const workModeIcons: Record<string, typeof Monitor> = {
  remote: Wifi,
  hybrid: Building,
  on_site: Monitor,
};

const workModeLabels: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, count, icon: Icon, color }: { label: string; count: number; icon: typeof Briefcase; color: string }) {
  return (
    <div className="relative overflow-hidden bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-5 hover:shadow-md transition-all group">
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.06]" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{count}</p>
          <p className="text-[11px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Application Volume Bar
// ─────────────────────────────────────────────────────────────────────────────

function AppVolumeBar({ count, maxCount }: { count: number; maxCount: number }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct > 70 ? "var(--success)" : pct > 30 ? "var(--warning)" : "var(--info)",
          }}
        />
      </div>
      <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums w-6 text-right">{count}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row Action Menu
// ─────────────────────────────────────────────────────────────────────────────

function RowActionMenu({
  job,
  onClose,
  onDuplicate,
  onDelete,
}: {
  job: JobPost;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden min-w-[180px] py-1">
            <Link
              href={`/employer/jobs/${job.id}`}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              onClick={() => setOpen(false)}
            >
              <Eye size={14} className="text-[var(--neutral-gray)]" /> View
            </Link>
            <Link
              href={`/employer/jobs/${job.id}/edit`}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
              onClick={() => setOpen(false)}
            >
              <Edit3 size={14} className="text-[var(--neutral-gray)]" /> Edit
            </Link>
            <button
              onClick={() => { onDuplicate(); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
            >
              <Copy size={14} className="text-[var(--neutral-gray)]" /> Duplicate
            </button>
            {job.status === JobStatus.PUBLISHED ? (
              <button
                onClick={() => { onClose(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
              >
                <XCircle size={14} className="text-[var(--neutral-gray)]" /> Close
              </button>
            ) : job.status === JobStatus.CLOSED ? (
              <button
                onClick={() => { toast.info("Reopen coming soon"); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
              >
                <RotateCcw size={14} className="text-[var(--neutral-gray)]" /> Reopen
              </button>
            ) : null}
            <div className="my-1 border-t border-[var(--border)]" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-[var(--error)] hover:bg-[var(--error)]/5 transition-colors text-left"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Card (for grid view)
// ─────────────────────────────────────────────────────────────────────────────

function JobCard({ job, index }: { job: JobPost; index: number }) {
  const config = statusConfig[job.status] || statusConfig[JobStatus.DRAFT];
  const WorkIcon = workModeIcons[job.workMode] || Briefcase;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Link href={`/employer/jobs/${job.id}`} className="block group">
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[#C4A35A] transition-colors line-clamp-2 leading-snug">
              {job.title}
            </h3>
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold flex-shrink-0 ${config.bg} ${config.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--neutral-gray)] mb-4">
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {job.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <WorkIcon size={11} /> {workModeLabels[job.workMode] || job.workMode}
            </span>
            {job.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {formatDateShort(job.publishedAt)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
              <Users size={12} />
              <span className="font-semibold text-[var(--text-primary)]">{job.applicationCount}</span>
              <span>apps</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-gray)]">
              <Eye size={12} />
              <span className="font-semibold text-[var(--text-primary)]">{job.viewCount}</span>
              <span>views</span>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-medium text-[#C4A35A] group-hover:underline">{"View →"}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Actions Bar
// ─────────────────────────────────────────────────────────────────────────────

function BulkActionsBar({
  count,
  onCloseSelected,
  onDeleteSelected,
  onClear,
}: {
  count: number;
  onCloseSelected: () => void;
  onDeleteSelected: () => void;
  onClear: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-3 px-5 py-3 bg-[#C4A35A]/8 border border-[#C4A35A]/20 rounded-xl"
    >
      <div className="flex items-center gap-2">
        <CheckSquare size={16} className="text-[#C4A35A]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {count} selected
        </span>
      </div>
      <div className="flex-1" />
      <button
        onClick={onCloseSelected}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
      >
        <XCircle size={12} /> Close Selected
      </button>
      <button
        onClick={onDeleteSelected}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--error)] border border-[var(--error)]/20 rounded-lg hover:bg-[var(--error)]/5 transition-colors"
      >
        <Trash2 size={12} /> Delete Selected
      </button>
      <button
        onClick={onClear}
        className="text-xs font-medium text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
      >
        Clear
      </button>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════════════

export default function EmployerJobsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "grid">("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useEmployerJobs({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const closeJob = useCloseJob();

  const jobs: JobPost[] = data?.data || [];

  const stats = useMemo(() => {
    const all = data?.data || [];
    return {
      total: all.length,
      active: all.filter((j) => j.status === JobStatus.PUBLISHED).length,
      drafts: all.filter((j) => j.status === JobStatus.DRAFT).length,
      closed: all.filter((j) => j.status === JobStatus.CLOSED).length,
    };
  }, [data]);

  const maxApplicationCount = useMemo(
    () => Math.max(1, ...jobs.map((j) => j.applicationCount)),
    [jobs],
  );

  const handleClose = useCallback(async (id: string) => {
    try {
      await closeJob.mutateAsync(id);
      toast.success("Job closed successfully.");
      setConfirmClose(null);
    } catch {
      toast.error("Failed to close job");
    }
  }, [closeJob]);

  const handleDelete = useCallback((_id: string) => {
    toast.info("Delete functionality coming soon");
    setConfirmDelete(null);
  }, []);

  const handleDuplicate = useCallback((_job: JobPost) => {
    toast.info("Duplicate functionality coming soon");
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  }, [selectedIds.size, jobs]);

  const handleBulkClose = useCallback(() => {
    toast.info(`Closing ${selectedIds.size} jobs...`);
    setSelectedIds(new Set());
  }, [selectedIds.size]);

  const handleBulkDelete = useCallback(() => {
    toast.info(`Deleting ${selectedIds.size} jobs...`);
    setSelectedIds(new Set());
  }, [selectedIds.size]);

  // ── Loading ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-[var(--surface-1)] rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Failed to load jobs</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Job Postings</h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-1">Manage and track your job postings.</p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#C4A35A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A8893D] transition-colors"
        >
          <PlusCircle size={16} /> Post New Job
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" count={stats.total} icon={Briefcase} color="var(--primary)" />
        <StatCard label="Active" count={stats.active} icon={TrendingUp} color="var(--success)" />
        <StatCard label="Drafts" count={stats.drafts} icon={FileText} color="var(--warning)" />
        <StatCard label="Closed" count={stats.closed} icon={XCircle} color="var(--neutral-gray)" />
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by title..."
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-1)]"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-[var(--surface-1)] text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value={JobStatus.PUBLISHED}>Active</option>
            <option value={JobStatus.DRAFT}>Draft</option>
            <option value={JobStatus.PENDING_REVIEW}>Pending</option>
            <option value={JobStatus.CLOSED}>Closed</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none" />
        </div>
        <div className="flex bg-[var(--surface-2)] rounded-xl p-1">
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "table" ? "bg-[var(--surface-1)] text-[#C4A35A] shadow-sm" : "text-[var(--neutral-gray)]"
            }`}
          >
            <List size={14} /> Table
          </button>
          <button
            onClick={() => setView("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "grid" ? "bg-[var(--surface-1)] text-[#C4A35A] shadow-sm" : "text-[var(--neutral-gray)]"
            }`}
          >
            <LayoutGrid size={14} /> Cards
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionsBar
            count={selectedIds.size}
            onCloseSelected={handleBulkClose}
            onDeleteSelected={handleBulkDelete}
            onClear={() => setSelectedIds(new Set())}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      {jobs.length === 0 ? (
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-14 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C4A35A]/10 flex items-center justify-center mb-5">
            <Briefcase size={28} className="text-[#C4A35A]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Post your first job</h3>
          <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">
            {search || statusFilter !== "all"
              ? "No jobs match your current filters. Try adjusting them."
              : "Create your first job posting to start attracting top talent."}
          </p>
          {!search && statusFilter === "all" && (
            <Link
              href="/employer/jobs/new"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              style={{ background: "linear-gradient(135deg, #C4A35A, #A8893D)" }}
            >
              <PlusCircle size={16} /> Post New Job
            </Link>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job, i) => (
            <JobCard key={job.id} job={job} index={i} />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)] sticky top-0 z-10 backdrop-blur-sm">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === jobs.length && jobs.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[var(--border)] text-[#C4A35A] focus:ring-[#C4A35A]/20 cursor-pointer accent-[#C4A35A]"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Job</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider min-w-[160px]">Applications</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Views</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Posted</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {jobs.map((job, i) => {
                  const config = statusConfig[job.status] || statusConfig[JobStatus.DRAFT];
                  const WorkIcon = workModeIcons[job.workMode] || Briefcase;
                  const isSelected = selectedIds.has(job.id);

                  return (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                      className={`transition-colors ${isSelected ? "bg-[#C4A35A]/5" : "hover:bg-[var(--surface-2)]/50"}`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(job.id)}
                          className="w-4 h-4 rounded border-[var(--border)] text-[#C4A35A] focus:ring-[#C4A35A]/20 cursor-pointer accent-[#C4A35A]"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/employer/jobs/${job.id}`} className="block min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] hover:text-[#C4A35A] truncate max-w-[280px] transition-colors">
                            {job.title}
                          </p>
                          <div className="flex items-center gap-2.5 mt-0.5 text-xs text-[var(--neutral-gray)]">
                            {job.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={10} /> {job.location}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <WorkIcon size={10} /> {workModeLabels[job.workMode] || job.workMode}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <AppVolumeBar count={job.applicationCount} maxCount={maxApplicationCount} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
                          <Eye size={13} className="text-[var(--neutral-gray)]" />
                          <span className="font-semibold tabular-nums">{job.viewCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-[var(--neutral-gray)]">
                          {job.publishedAt ? formatDateShort(job.publishedAt) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <RowActionMenu
                          job={job}
                          onClose={() => setConfirmClose(job.id)}
                          onDuplicate={() => handleDuplicate(job)}
                          onDelete={() => setConfirmDelete(job.id)}
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Close Dialog */}
      <ConfirmDialog
        open={!!confirmClose}
        onClose={() => setConfirmClose(null)}
        onConfirm={() => confirmClose && handleClose(confirmClose)}
        title="Close Job"
        message="Are you sure you want to close this job? It will no longer accept new applications."
        confirmLabel="Close Job"
        variant="warning"
        loading={closeJob.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

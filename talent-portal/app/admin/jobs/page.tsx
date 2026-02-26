"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import {
  Briefcase, CheckCircle2, XCircle, Eye, Loader2, Clock, MapPin, Monitor,
} from "lucide-react";
import { useAdminJobs, useApproveJob, useRejectJob } from "@/hooks/use-admin";
import { JobStatus } from "@/types/job";
import type { JobPost } from "@/types/job";
import { useAdminTable } from "@/hooks/use-admin-table";
import { AdminDataTable, type AdminColumn } from "@/components/admin/admin-data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const jobTypeLabels: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship",
};

const workModeLabels: Record<string, string> = {
  remote: "Remote", hybrid: "Hybrid", on_site: "On-site",
};

/* ──────────────────────────────────────────────
   Stat card
   ────────────────────────────────────────────── */

function StatCard({ icon, value, label, accentVar }: { icon: ReactNode; value: number | string; label: string; accentVar: string }) {
  return (
    <div className="flex items-center gap-3.5 flex-1 p-4 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] transition-all hover:shadow-md hover:-translate-y-0.5">
      <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${accentVar} 10%, transparent)`, color: accentVar }}>{icon}</span>
      <div>
        <p className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-[var(--neutral-gray)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Column definitions
   ────────────────────────────────────────────── */

function getJobColumns(
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
  isApproving: boolean,
  isRejecting: boolean,
): AdminColumn<JobPost>[] {
  return [
    {
      key: "title",
      header: "Job Title",
      sortable: true,
      render: (job) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[220px]">{job.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {job.workMode && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md">
                <Monitor size={9} />
                {workModeLabels[job.workMode] || job.workMode}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-0.5 text-xs text-[var(--neutral-gray)]">
                <MapPin size={10} />
                <span className="truncate max-w-[100px]">{job.location}</span>
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "employer",
      header: "Company",
      render: (job) => (
        <div className="flex items-center gap-3">
          {job.employer?.logoUrl ? (
            <img src={job.employer.logoUrl} alt={job.employer.companyName} className="w-9 h-9 rounded-xl object-cover border border-[var(--border)] shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/12 to-[var(--accent-red)]/6 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-[10px] font-bold text-[var(--accent-orange)]">{initials(job.employer?.companyName)}</span>
            </div>
          )}
          <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[150px]">{job.employer?.companyName || "Unknown"}</p>
        </div>
      ),
    },
    {
      key: "jobType",
      header: "Type",
      filter: {
        type: "select",
        options: [
          { value: "full_time", label: "Full-time" },
          { value: "part_time", label: "Part-time" },
          { value: "contract", label: "Contract" },
          { value: "internship", label: "Internship" },
        ],
      },
      render: (job) => (
        <span className="text-sm font-medium text-[var(--neutral-gray)]">
          {jobTypeLabels[job.jobType] || job.jobType}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      filter: {
        type: "select",
        options: [
          { value: "pending_review", label: "Pending" },
          { value: "published", label: "Published" },
          { value: "rejected", label: "Rejected" },
          { value: "closed", label: "Closed" },
        ],
      },
      render: (job) => <StatusBadge status={job.status} />,
    },
    {
      key: "publishedAt",
      header: "Published",
      sortable: true,
      render: (job) => (
        <p className="text-sm text-[var(--neutral-gray)] font-medium">
          {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
        </p>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (job) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/admin/jobs/${job.id}`} className="p-2 rounded-xl text-[var(--neutral-gray)] hover:bg-[var(--primary)]/6 hover:text-[var(--primary)] transition-colors" title="View">
            <Eye size={15} />
          </Link>
          {job.status === JobStatus.PENDING_REVIEW && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onApprove(job.id); }} disabled={isApproving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--success)] hover:bg-[var(--success)]/90 disabled:opacity-40 transition-all">
                {isApproving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                <span className="hidden lg:inline">Approve</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onReject(job.id); }} disabled={isRejecting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--error)] border border-[var(--error)]/20 bg-[var(--surface-1)] hover:bg-[var(--error-light)] disabled:opacity-40 transition-all">
                {isRejecting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                <span className="hidden lg:inline">Reject</span>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];
}

/* ──────────────────────────────────────────────
   Page content
   ────────────────────────────────────────────── */

function JobsContent() {
  const approveJob = useApproveJob();
  const rejectJob = useRejectJob();

  const handleApprove = async (id: string) => {
    try { await approveJob.mutateAsync(id); toast.success("Job approved!"); }
    catch { toast.error("Failed to approve job"); }
  };

  const handleReject = async (jobId: string) => {
    const reason = window.prompt("Reason for rejection (optional):");
    if (reason === null) return;
    try { await rejectJob.mutateAsync({ jobId, reason: reason || undefined }); toast.success("Job rejected."); }
    catch { toast.error("Failed to reject job"); }
  };

  const columns = getJobColumns(handleApprove, handleReject, approveJob.isPending, rejectJob.isPending);

  const table = useAdminTable({ tableId: "jobs", columns, defaultSort: { key: "publishedAt", direction: "desc" }, defaultPageSize: 20 });

  const { data, isLoading, error, refetch } = useAdminJobs(table.queryFilters);

  const jobs: JobPost[] = data?.data || [];
  const meta = data?.meta;

  const pendingCount = jobs.filter((j) => j.status === JobStatus.PENDING_REVIEW).length;
  const publishedCount = jobs.filter((j) => j.status === JobStatus.PUBLISHED).length;
  const rejectedCount = jobs.filter((j) => j.status === JobStatus.REJECTED).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Job Moderation Queue</h1>
            {jobs.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--primary)]/8 text-[var(--primary)]">{jobs.length}</span>
            )}
          </div>
          <p className="text-sm text-[var(--neutral-gray)] font-medium">Review and moderate employer job postings</p>
        </div>
        {pendingCount > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--warning-light)] border border-[var(--warning)]/15">
            <Clock size={16} className="text-[var(--warning-dark)]" />
            <span className="text-sm font-bold text-[var(--warning-dark)]">{pendingCount} pending review</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Briefcase size={19} />} value={jobs.length} label="Total jobs" accentVar="var(--primary)" />
        <StatCard icon={<Clock size={19} />} value={pendingCount} label="Pending review" accentVar="var(--warning)" />
        <StatCard icon={<CheckCircle2 size={19} />} value={publishedCount} label="Published" accentVar="var(--success)" />
        <StatCard icon={<XCircle size={19} />} value={rejectedCount} label="Rejected" accentVar="var(--error)" />
      </div>

      {/* Table */}
      <AdminDataTable<JobPost>
        tableId="jobs"
        columns={columns}
        data={jobs}
        keyExtractor={(j) => j.id}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        onRetry={refetch}
        sort={table.sort}
        onSort={table.setSort}
        pagination={meta ? { currentPage: meta.page, totalPages: meta.totalPages, totalItems: meta.total, pageSize: table.pageSize } : undefined}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        searchValue={table.searchValue}
        onSearch={table.setSearch}
        searchPlaceholder="Search by title or company..."
        filters={table.filters}
        onFilterChange={table.setFilterValue}
        onClearFilters={table.clearFilters}
        activeFilters={table.activeFilterChips}
        selectable
        selectedIds={table.selectedIds}
        onSelectionChange={table.setSelectedIds}
        bulkActions={[
          { label: "Approve", icon: <CheckCircle2 size={14} />, variant: "success", onClick: (ids) => ids.forEach(handleApprove) },
          { label: "Reject", icon: <XCircle size={14} />, variant: "danger", onClick: (ids) => ids.forEach(handleReject) },
        ]}
        emptyIcon={Briefcase}
        emptyTitle="No jobs found"
        emptyDescription="Jobs will appear here when employers post them."
        renderExpandedRow={(job) => (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Description</p>
              <p className="text-[var(--text-primary)] line-clamp-3">{job.description || "No description"}</p>
            </div>
            {job.salaryMin && (
              <div>
                <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Salary Range</p>
                <p className="text-[var(--text-primary)]">{job.salaryCurrency || "NGN"} {job.salaryMin?.toLocaleString()}{job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : ""}</p>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" /></div>}>
      <JobsContent />
    </Suspense>
  );
}

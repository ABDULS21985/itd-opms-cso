"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import {
  Users, CheckCircle2, XCircle, Eye, Loader2, Clock, TrendingUp, Briefcase,
} from "lucide-react";
import {
  useAdminCandidates, useApproveCandidateProfile, useRejectCandidateProfile,
} from "@/hooks/use-admin";
import { ProfileApprovalStatus } from "@/types/candidate";
import type { CandidateProfile } from "@/types/candidate";
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

function strengthColor(s: number): string {
  if (s >= 80) return "var(--success)";
  if (s >= 50) return "var(--warning)";
  return "var(--error)";
}

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

function getCandidateColumns(
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
  isApproving: boolean,
  isRejecting: boolean,
): AdminColumn<CandidateProfile>[] {
  return [
    {
      key: "fullName",
      header: "Candidate",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.photoUrl ? (
            <img src={c.photoUrl} alt={c.fullName} className="w-10 h-10 rounded-xl object-cover border border-[var(--border)] shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/12 to-[var(--primary)]/5 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-[var(--primary)]">{initials(c.fullName)}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.fullName}</p>
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5 truncate">{c.contactEmail || "No email"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "primaryTrack",
      header: "Track",
      render: (c) =>
        c.primaryTrack?.name ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--primary)]/6 text-[var(--primary)]">
            <Briefcase size={10} />
            {c.primaryTrack.name}
          </span>
        ) : (
          <span className="text-sm text-[var(--neutral-gray)]/60">—</span>
        ),
    },
    {
      key: "approvalStatus",
      header: "Status",
      filter: {
        type: "select",
        options: [
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
          { value: "needs_update", label: "Needs Update" },
          { value: "suspended", label: "Suspended" },
        ],
      },
      render: (c) => <StatusBadge status={c.approvalStatus} />,
    },
    {
      key: "profileStrength",
      header: "Profile Strength",
      sortable: true,
      render: (c) => {
        const strength = c.profileStrength ?? 0;
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-20 h-[6px] bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${strength}%`, backgroundColor: strengthColor(strength) }} />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: strengthColor(strength) }}>{strength}%</span>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Submitted",
      sortable: true,
      render: (c) => (
        <p className="text-sm text-[var(--neutral-gray)] font-medium">
          {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/admin/candidates/${c.id}`} className="p-2 rounded-xl text-[var(--neutral-gray)] hover:bg-[var(--primary)]/6 hover:text-[var(--primary)] transition-colors" title="View">
            <Eye size={15} />
          </Link>
          {c.approvalStatus === ProfileApprovalStatus.SUBMITTED && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onApprove(c.id); }} disabled={isApproving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--success)] hover:bg-[var(--success)]/90 disabled:opacity-40 transition-all">
                {isApproving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                <span className="hidden lg:inline">Approve</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onReject(c.id); }} disabled={isRejecting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--error)] border border-[var(--error)]/20 bg-[var(--surface-1)] hover:bg-[var(--error-light)] disabled:opacity-40 transition-all">
                {isRejecting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                <span className="hidden lg:inline">Update</span>
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

function CandidatesContent() {
  const approveMutation = useApproveCandidateProfile();
  const rejectMutation = useRejectCandidateProfile();

  const handleApprove = async (id: string) => {
    try { await approveMutation.mutateAsync(id); toast.success("Profile approved!"); }
    catch { toast.error("Failed to approve profile"); }
  };

  const handleReject = async (id: string) => {
    try { await rejectMutation.mutateAsync({ candidateId: id }); toast.success("Profile marked as needs update."); }
    catch { toast.error("Failed to update profile status"); }
  };

  const columns = getCandidateColumns(handleApprove, handleReject, approveMutation.isPending, rejectMutation.isPending);

  const table = useAdminTable({ tableId: "candidates", columns, defaultSort: { key: "createdAt", direction: "desc" }, defaultPageSize: 20 });

  const { data, isLoading, error, refetch } = useAdminCandidates(table.queryFilters);

  const candidates: CandidateProfile[] = data?.data || [];
  const meta = data?.meta;

  // Stats
  const submittedCount = candidates.filter((c) => c.approvalStatus === ProfileApprovalStatus.SUBMITTED).length;
  const approvedCount = candidates.filter((c) => c.approvalStatus === ProfileApprovalStatus.APPROVED).length;
  const avgStrength = candidates.length > 0 ? Math.round(candidates.reduce((s, c) => s + (c.profileStrength ?? 0), 0) / candidates.length) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Candidate Review Queue</h1>
            {candidates.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--primary)]/8 text-[var(--primary)]">{candidates.length}</span>
            )}
          </div>
          <p className="text-sm text-[var(--neutral-gray)] font-medium">Review and approve candidate profiles for the marketplace</p>
        </div>
        {submittedCount > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--warning-light)] border border-[var(--warning)]/15">
            <Clock size={16} className="text-[var(--warning-dark)]" />
            <span className="text-sm font-bold text-[var(--warning-dark)]">{submittedCount} awaiting review</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users size={19} />} value={candidates.length} label="Total candidates" accentVar="var(--primary)" />
        <StatCard icon={<Clock size={19} />} value={submittedCount} label="Awaiting review" accentVar="var(--warning)" />
        <StatCard icon={<CheckCircle2 size={19} />} value={approvedCount} label="Approved" accentVar="var(--success)" />
        <StatCard icon={<TrendingUp size={19} />} value={`${avgStrength}%`} label="Avg. strength" accentVar="var(--info)" />
      </div>

      {/* Table */}
      <AdminDataTable<CandidateProfile>
        tableId="candidates"
        columns={columns}
        data={candidates}
        keyExtractor={(c) => c.id}
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
        searchPlaceholder="Search by name or email..."
        filters={table.filters}
        onFilterChange={table.setFilterValue}
        onClearFilters={table.clearFilters}
        activeFilters={table.activeFilterChips}
        selectable
        selectedIds={table.selectedIds}
        onSelectionChange={table.setSelectedIds}
        bulkActions={[
          { label: "Approve", icon: <CheckCircle2 size={14} />, variant: "success", onClick: (ids) => ids.forEach(handleApprove) },
        ]}
        emptyIcon={Users}
        emptyTitle="No candidates found"
        emptyDescription="Candidates will appear here when they submit their profiles."
        renderExpandedRow={(c) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Bio</p>
              <p className="text-[var(--text-primary)]">{c.bio || "No bio provided"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Experience</p>
              <p className="text-[var(--text-primary)]">{c.yearsOfExperience ? `${c.yearsOfExperience} years` : "Not specified"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Primary Stacks</p>
              <div className="flex flex-wrap gap-1">
                {c.primaryStacks?.length ? c.primaryStacks.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-md text-xs bg-[var(--surface-2)] text-[var(--neutral-gray)]">{s}</span>
                )) : <span className="text-[var(--neutral-gray)]">None</span>}
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default function AdminCandidatesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" /></div>}>
      <CandidatesContent />
    </Suspense>
  );
}

"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import {
  Mail, CheckCircle2, XCircle, Eye, Loader2, Clock, HelpCircle, MapPin,
} from "lucide-react";
import {
  useAdminIntroRequests, useApproveIntroRequest, useDeclineIntroRequest, useRequestInfoIntroRequest,
} from "@/hooks/use-admin";
import { IntroRequestStatus } from "@/types/intro-request";
import type { IntroRequest } from "@/types/intro-request";
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function getIntroRequestColumns(
  onApprove: (id: string) => void,
  onDecline: (id: string) => void,
  onRequestInfo: (id: string) => void,
  isApproving: boolean,
  isDeclining: boolean,
  isRequestingInfo: boolean,
): AdminColumn<IntroRequest>[] {
  const isPendingAction = isApproving || isDeclining || isRequestingInfo;

  return [
    {
      key: "roleTitle",
      header: "Role",
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[220px]">{r.roleTitle}</p>
          <div className="flex items-center gap-2 mt-1">
            {r.workMode && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md">
                <MapPin size={9} />
                {r.workMode}
              </span>
            )}
            {r.locationExpectation && (
              <span className="flex items-center gap-0.5 text-xs text-[var(--neutral-gray)]">
                <MapPin size={10} className="text-[var(--surface-4)]" />
                <span className="truncate max-w-[100px]">{r.locationExpectation}</span>
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "employer",
      header: "Employer",
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.employer?.logoUrl ? (
            <img src={r.employer.logoUrl} alt={r.employer.companyName} className="w-9 h-9 rounded-xl object-cover border border-[var(--border)] shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/12 to-[var(--accent-red)]/6 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-[10px] font-bold text-[var(--accent-orange)]">{initials(r.employer?.companyName)}</span>
            </div>
          )}
          <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[140px]">{r.employer?.companyName || "Unknown"}</p>
        </div>
      ),
    },
    {
      key: "candidate",
      header: "Candidate",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[10px] font-bold text-[var(--primary)]">{initials(r.candidate?.fullName)}</span>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[140px]">{r.candidate?.fullName || "Unknown"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      filter: {
        type: "select",
        options: [
          { value: IntroRequestStatus.PENDING, label: "Pending" },
          { value: IntroRequestStatus.APPROVED, label: "Approved" },
          { value: IntroRequestStatus.DECLINED, label: "Declined" },
          { value: IntroRequestStatus.MORE_INFO_NEEDED, label: "More Info" },
          { value: IntroRequestStatus.SCHEDULED, label: "Scheduled" },
          { value: IntroRequestStatus.COMPLETED, label: "Completed" },
        ],
      },
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "createdAt",
      header: "Requested",
      sortable: true,
      render: (r) => (
        <p className="text-sm text-[var(--neutral-gray)] font-medium">{timeAgo(r.createdAt)}</p>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/admin/intro-requests/${r.id}`} className="p-2 rounded-xl text-[var(--neutral-gray)] hover:bg-[var(--primary)]/6 hover:text-[var(--primary)] transition-colors" title="View details">
            <Eye size={15} />
          </Link>
          {r.status === IntroRequestStatus.PENDING && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onApprove(r.id); }} disabled={isPendingAction} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--success)] hover:bg-[var(--success)]/90 disabled:opacity-40 transition-all">
                {isApproving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                <span className="hidden lg:inline">Approve</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDecline(r.id); }} disabled={isPendingAction} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--error)] border border-[var(--error)]/20 bg-[var(--surface-1)] hover:bg-[var(--error-light)] disabled:opacity-40 transition-all">
                {isDeclining ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                <span className="hidden lg:inline">Decline</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onRequestInfo(r.id); }} disabled={isPendingAction} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--warning-dark)] border border-[var(--warning)]/20 bg-[var(--surface-1)] hover:bg-[var(--warning-light)] disabled:opacity-40 transition-all">
                {isRequestingInfo ? <Loader2 size={12} className="animate-spin" /> : <HelpCircle size={12} />}
                <span className="hidden xl:inline">Info</span>
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

function IntroRequestsContent() {
  const approveMutation = useApproveIntroRequest();
  const declineMutation = useDeclineIntroRequest();
  const requestInfoMutation = useRequestInfoIntroRequest();

  const handleApprove = async (id: string) => {
    try { await approveMutation.mutateAsync(id); toast.success("Intro request approved!"); }
    catch { toast.error("Failed to approve intro request."); }
  };

  const handleDecline = async (id: string) => {
    const reason = window.prompt("Reason for declining (optional):");
    if (reason === null) return;
    try { await declineMutation.mutateAsync({ id, reason: reason || undefined }); toast.success("Intro request declined."); }
    catch { toast.error("Failed to decline intro request."); }
  };

  const handleRequestInfo = async (id: string) => {
    try { await requestInfoMutation.mutateAsync(id); toast.success("More info requested."); }
    catch { toast.error("Failed to request more info."); }
  };

  const columns = getIntroRequestColumns(
    handleApprove, handleDecline, handleRequestInfo,
    approveMutation.isPending, declineMutation.isPending, requestInfoMutation.isPending,
  );

  const table = useAdminTable({ tableId: "intro-requests", columns, defaultSort: { key: "createdAt", direction: "desc" }, defaultPageSize: 20 });

  const { data, isLoading, error, refetch } = useAdminIntroRequests(table.queryFilters);

  const requests: IntroRequest[] = data?.data || [];
  const meta = data?.meta;

  const pendingCount = requests.filter((r) => r.status === IntroRequestStatus.PENDING).length;
  const approvedCount = requests.filter((r) => r.status === IntroRequestStatus.APPROVED).length;
  const declinedCount = requests.filter((r) => r.status === IntroRequestStatus.DECLINED).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Intro Requests</h1>
            {requests.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--primary)]/8 text-[var(--primary)]">{requests.length}</span>
            )}
          </div>
          <p className="text-sm text-[var(--neutral-gray)] font-medium">Manage introduction requests between employers and candidates</p>
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
        <StatCard icon={<Mail size={19} />} value={requests.length} label="Total requests" accentVar="var(--primary)" />
        <StatCard icon={<Clock size={19} />} value={pendingCount} label="Pending review" accentVar="var(--warning)" />
        <StatCard icon={<CheckCircle2 size={19} />} value={approvedCount} label="Approved" accentVar="var(--success)" />
        <StatCard icon={<XCircle size={19} />} value={declinedCount} label="Declined" accentVar="var(--error)" />
      </div>

      {/* Table */}
      <AdminDataTable<IntroRequest>
        tableId="intro-requests"
        columns={columns}
        data={requests}
        keyExtractor={(r) => r.id}
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
        searchPlaceholder="Search by employer, candidate, or role..."
        filters={table.filters}
        onFilterChange={table.setFilterValue}
        onClearFilters={table.clearFilters}
        activeFilters={table.activeFilterChips}
        selectable
        selectedIds={table.selectedIds}
        onSelectionChange={table.setSelectedIds}
        bulkActions={[
          { label: "Approve", icon: <CheckCircle2 size={14} />, variant: "success", onClick: (ids) => ids.forEach(handleApprove) },
          { label: "Decline", icon: <XCircle size={14} />, variant: "danger", onClick: (ids) => ids.forEach(handleDecline) },
        ]}
        emptyIcon={Mail}
        emptyTitle="No intro requests found"
        emptyDescription="Introduction requests will appear here when employers submit them."
        renderExpandedRow={(r) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Role Description</p>
              <p className="text-[var(--text-primary)] line-clamp-3">{r.roleDescription || "No description"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Notes to Placement Unit</p>
              <p className="text-[var(--text-primary)]">{r.notesToPlacementUnit || "None"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Admin Notes</p>
              <p className="text-[var(--text-primary)]">{r.adminNotes || "None"}</p>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default function AdminIntroRequestsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" /></div>}>
      <IntroRequestsContent />
    </Suspense>
  );
}

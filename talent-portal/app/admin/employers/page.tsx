"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2, CheckCircle2, Clock, Eye, Globe, Loader2, Shield, Users, MapPin,
} from "lucide-react";
import { useAdminEmployers, useAdminEmployerStats, useVerifyEmployer } from "@/hooks/use-admin";
import { EmployerVerificationStatus } from "@/types/employer";
import type { EmployerOrg } from "@/types/employer";
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

function getEmployerColumns(
  onVerify: (id: string) => void,
  isVerifying: boolean,
): AdminColumn<EmployerOrg>[] {
  return [
    {
      key: "companyName",
      header: "Company",
      sortable: true,
      render: (e) => (
        <div className="flex items-center gap-3.5">
          {e.logoUrl ? (
            <img src={e.logoUrl} alt={e.companyName} className="w-10 h-10 rounded-xl object-cover border border-[var(--border)] shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/12 to-[var(--accent-red)]/6 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-[var(--accent-orange)]">{initials(e.companyName)}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[180px]">{e.companyName}</p>
            <p className="text-xs text-[var(--neutral-gray)] mt-0.5 truncate font-medium">{e.sector ?? "No sector"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (e) => {
        const contactName = e.employerUsers?.[0]?.contactName ?? "N/A";
        return (
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{contactName}</p>
            {e.country && (
              <p className="text-xs text-[var(--neutral-gray)] mt-0.5 flex items-center gap-1 font-medium">
                <MapPin size={10} className="text-[var(--surface-4)]" />
                {[e.locationHq, e.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "verificationStatus",
      header: "Status",
      filter: {
        type: "select",
        options: [
          { value: "pending", label: "Pending" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
          { value: "suspended", label: "Suspended" },
        ],
      },
      render: (e) => <StatusBadge status={e.verificationStatus} />,
    },
    {
      key: "createdAt",
      header: "Registered",
      sortable: true,
      render: (e) => (
        <p className="text-sm text-[var(--neutral-gray)] font-medium">
          {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (e) => (
        <div className="flex items-center justify-end gap-1.5">
          {e.websiteUrl && (
            <a href={e.websiteUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--primary)] transition-colors" title="Visit website">
              <Globe size={15} />
            </a>
          )}
          <Link href={`/admin/employers/${e.id}`} className="p-2 rounded-xl text-[var(--neutral-gray)] hover:bg-[var(--primary)]/6 hover:text-[var(--primary)] transition-colors" title="View details">
            <Eye size={15} />
          </Link>
          {e.verificationStatus === EmployerVerificationStatus.PENDING && (
            <button onClick={(ev) => { ev.stopPropagation(); onVerify(e.id); }} disabled={isVerifying} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--success)] hover:bg-[var(--success)]/90 disabled:opacity-40 transition-all">
              {isVerifying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              <span className="hidden lg:inline">Verify</span>
            </button>
          )}
        </div>
      ),
    },
  ];
}

/* ──────────────────────────────────────────────
   Page content
   ────────────────────────────────────────────── */

function EmployersContent() {
  const verifyMutation = useVerifyEmployer();

  const handleVerify = (id: string) => {
    verifyMutation.mutate(id, {
      onSuccess: () => toast.success("Employer verified successfully."),
      onError: () => toast.error("Failed to verify employer."),
    });
  };

  const columns = getEmployerColumns(handleVerify, verifyMutation.isPending);

  const table = useAdminTable({ tableId: "employers", columns, defaultSort: { key: "createdAt", direction: "desc" }, defaultPageSize: 20 });

  const { data, isLoading, error, refetch } = useAdminEmployers(table.queryFilters);
  const { data: stats } = useAdminEmployerStats();

  const employers: EmployerOrg[] = data?.data || [];
  const meta = data?.meta;

  const totalEmployers = (stats as any)?.total ?? meta?.total ?? "—";
  const pendingCount = (stats as any)?.pending ?? "—";
  const verifiedCount = (stats as any)?.verified ?? "—";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Employer Verification Queue</h1>
            {meta?.total != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--primary)]/8 text-[var(--primary)]">{meta.total}</span>
            )}
          </div>
          <p className="text-sm text-[var(--neutral-gray)] font-medium">Review and verify employer registrations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Building2 size={19} />} value={totalEmployers} label="Total employers" accentVar="var(--accent-orange)" />
        <StatCard icon={<Clock size={19} />} value={pendingCount} label="Pending review" accentVar="var(--warning)" />
        <StatCard icon={<Shield size={19} />} value={verifiedCount} label="Verified" accentVar="var(--success)" />
        <StatCard icon={<Users size={19} />} value={employers.length} label="On this page" accentVar="var(--primary)" />
      </div>

      {/* Table */}
      <AdminDataTable<EmployerOrg>
        tableId="employers"
        columns={columns}
        data={employers}
        keyExtractor={(e) => e.id}
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
        searchPlaceholder="Search by company, contact, or email..."
        filters={table.filters}
        onFilterChange={table.setFilterValue}
        onClearFilters={table.clearFilters}
        activeFilters={table.activeFilterChips}
        selectable
        selectedIds={table.selectedIds}
        onSelectionChange={table.setSelectedIds}
        bulkActions={[
          { label: "Verify", icon: <CheckCircle2 size={14} />, variant: "success", onClick: (ids) => ids.forEach(handleVerify) },
        ]}
        emptyIcon={Building2}
        emptyTitle="No employers found"
        emptyDescription="Employers will appear here when they register."
        renderExpandedRow={(e) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Description</p>
              <p className="text-[var(--text-primary)] line-clamp-3">{e.description || "No description"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Hiring Tracks</p>
              <div className="flex flex-wrap gap-1">
                {e.hiringTracks?.length ? e.hiringTracks.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-md text-xs bg-[var(--surface-2)] text-[var(--neutral-gray)]">{t}</span>
                )) : <span className="text-[var(--neutral-gray)]">None</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)] uppercase tracking-wider mb-1">Stats</p>
              <p className="text-[var(--text-primary)]">{e.totalRequests ?? 0} requests &middot; {e.totalPlacements ?? 0} placements</p>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default function AdminEmployersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" /></div>}>
      <EmployersContent />
    </Suspense>
  );
}

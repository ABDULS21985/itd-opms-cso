"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Server,
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  SSAHero,
  SSAHeroChip,
  SSAHeroInsight,
  SSASectionCard,
  SSAStatCard,
} from "./_components/ssa-ui";
import {
  useSSARequests,
  useSSARequestStats,
  useSearchSSARequests,
} from "@/hooks/use-ssa";
import type { SSARequest } from "@/types/ssa";
import {
  SSA_STATUS_LABELS,
  SSA_STATUS_COLORS,
  SSA_STATUSES,
} from "@/types/ssa";
import type { PaginatedResponse } from "@/types/core";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: string) {
  const label = SSA_STATUS_LABELS[status] || status;
  const colorMap: Record<string, string> = {
    neutral: "var(--text-secondary)",
    blue: "#3b82f6",
    amber: "#f59e0b",
    green: "#22c55e",
    teal: "#14b8a6",
    red: "#ef4444",
  };
  const color = colorMap[SSA_STATUS_COLORS[status]] || "var(--text-secondary)";
  return (
    <span style={{ color, fontWeight: 500, fontSize: "0.8125rem" }}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SSARequestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [division, setDivision] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* Debounced search value */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* Data sources: search vs regular listing */
  const { data: searchData, isLoading: searchLoading } = useSearchSSARequests(
    debouncedSearch,
    page,
    20,
  );
  const { data: listData, isLoading: listLoading } = useSSARequests(
    page,
    20,
    status || undefined,
    division || undefined,
  );

  const isSearching = debouncedSearch.length > 0;
  const data = isSearching ? searchData : listData;
  const isLoading = isSearching ? searchLoading : listLoading;

  const { data: stats } = useSSARequestStats();

  const requests: SSARequest[] = data?.data ?? [];
  const meta = data?.meta;

  /* Clear filters */
  const handleClearFilters = useCallback(() => {
    setStatus("");
    setDivision("");
    setPage(1);
  }, []);

  /* ---- Columns ---- */

  const columns: Column<SSARequest>[] = [
    {
      key: "referenceNo",
      header: "Reference No",
      sortable: true,
      className: "min-w-[140px]",
      render: (item) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--primary)",
          }}
        >
          {item.referenceNo}
        </span>
      ),
    },
    {
      key: "appName",
      header: "Application",
      sortable: true,
      className: "min-w-[180px]",
      render: (item) => (
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {item.appName}
        </span>
      ),
    },
    {
      key: "divisionOffice",
      header: "Division",
      sortable: true,
      render: (item) => (
        <span
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          {item.divisionOffice}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => statusBadge(item.status),
    },
    {
      key: "serverType",
      header: "Server Type",
      render: (item) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "9999px",
            backgroundColor: "var(--surface-2)",
            padding: "2px 10px",
            fontSize: "0.75rem",
            fontWeight: 500,
            textTransform: "capitalize",
            color: "var(--text-secondary)",
          }}
        >
          {item.serverType}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      sortable: true,
      render: (item) => (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {item.submittedAt
            ? new Date(item.submittedAt).toLocaleDateString()
            : "\u2014"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/ssa/${item.id}`);
          }}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          View
        </button>
      ),
    },
  ];

  const filterSummary = [
    status ? SSA_STATUS_LABELS[status] || status : "All statuses",
    division || "All divisions",
    isSearching ? `Search: ${debouncedSearch}` : "Portfolio view",
  ];

  return (
    <div className="space-y-8 pb-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <SSAHero
          icon={Server}
          eyebrow="SSA Workspace"
          title="Server and storage requests with clearer operational control."
          description="Track demand, review lifecycle state, and move quickly from intake to allocation without losing governance context."
          accent="emerald"
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push("/dashboard/ssa/new")}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0D4A29] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus size={16} />
                New Request
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/ssa/approvals")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:border-white/28 hover:bg-white/14"
              >
                Review approvals
              </button>
            </>
          }
          chips={
            <>
              <SSAHeroChip>{stats?.total ?? 0} total requests</SSAHeroChip>
              <SSAHeroChip>{requests.length} visible in current view</SSAHeroChip>
              {filterSummary.map((item) => (
                <SSAHeroChip key={item}>{item}</SSAHeroChip>
              ))}
            </>
          }
          aside={
            <>
              <SSAHeroInsight
                icon={Clock}
                eyebrow="Flow"
                accent="amber"
                title={`${stats?.inProgress ?? 0} requests in progress`}
                description="Keep intake moving while preserving division context and approval traceability."
              />
              <SSAHeroInsight
                icon={CheckCircle2}
                eyebrow="Completion"
                accent="emerald"
                title={`${stats?.completed ?? 0} fulfilled allocations`}
                description="Completed requests remain searchable so provisioning history stays easy to audit."
              />
              <SSAHeroInsight
                icon={AlertTriangle}
                eyebrow="Attention"
                accent="rose"
                title={`${stats?.rejected ?? 0} rejected or stalled items`}
                description="Surface exceptions early so resubmission and clarification happen with less delay."
              />
            </>
          }
        />
      </motion.div>

      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SSAStatCard
            label="Total Requests"
            value={stats.total}
            helper="Full SSA portfolio currently tracked in the workspace."
            icon={FileText}
            accent="indigo"
          />
          <SSAStatCard
            label="In Progress"
            value={stats.inProgress}
            helper="Requests still moving through assessment, approval, or provisioning."
            icon={Clock}
            accent="amber"
          />
          <SSAStatCard
            label="Completed"
            value={stats.completed}
            helper="Allocations that have fully cleared the workflow."
            icon={CheckCircle2}
            accent="emerald"
          />
          <SSAStatCard
            label="Rejected"
            value={stats.rejected}
            helper="Requests requiring revision, clarification, or cancellation follow-up."
            icon={XCircle}
            accent="rose"
          />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <SSASectionCard
          eyebrow="Request Portfolio"
          title="Search, filter, and review the active request book"
          description="Use quick filters to narrow the list before opening individual requests for full detail and routing context."
          actions={
            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                showFilters
                  ? "border-[var(--primary)]/20 bg-[var(--primary)]/8 text-[var(--primary)]"
                  : "border-[var(--border)] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              <Filter size={16} />
              {showFilters ? "Hide filters" : "Show filters"}
            </button>
          }
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-xl flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by reference number, application, requestor, or division..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] shadow-sm outline-none transition-all placeholder:text-[var(--text-secondary)]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/ssa/admin")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-1)]"
                >
                  Admin dashboard
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/ssa/delegations")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-1)]"
                >
                  Delegations
                </button>
              </div>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-[1.35rem] border border-[var(--border)]/80 bg-[linear-gradient(180deg,_rgba(249,250,251,0.9),_rgba(255,255,255,0.92))] p-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                    >
                      <option value="">All Statuses</option>
                      {SSA_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {SSA_STATUS_LABELS[s] || s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Division
                    </label>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => {
                        setDivision(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Filter by division or office..."
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-secondary)]/70 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--primary)]/20 hover:bg-[var(--primary)]/6 hover:text-[var(--primary)]"
                  >
                    Clear filters
                  </button>
                </div>
              </motion.div>
            )}

            <DataTable
              columns={columns}
              data={requests}
              keyExtractor={(item) => item.id}
              loading={isLoading}
              emptyTitle="No requests found"
              emptyDescription="Create your first server/storage allocation request to get started."
              emptyAction={
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/ssa/new")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/20"
                >
                  <Plus size={16} />
                  New Request
                </button>
              }
              onRowClick={(item) => router.push(`/dashboard/ssa/${item.id}`)}
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
        </SSASectionCard>
      </motion.div>
    </div>
  );
}

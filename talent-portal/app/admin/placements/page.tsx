"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Search,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  Plus,
  LayoutGrid,
  List,
  Filter,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { usePlacements, useUpdatePlacementStatus } from "@/hooks/use-placements";
import type { PlacementRecord } from "@/types/placement";
import { PlacementStatus } from "@/types/placement";
import { PlacementKanban, KANBAN_COLUMNS } from "@/components/admin/placement-kanban";
import { AdminDataTable, type AdminColumn, type SortState, type ActiveFilter } from "@/components/admin/admin-data-table";

// ─────────────────────────────────────────────────────────────────────────────
// Status config for table view
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "in_discussion", label: "In Discussion" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "placed", label: "Placed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusColor(status: string) {
  const col = KANBAN_COLUMNS.find((c) => c.status === status);
  if (col) return col.color;
  if (status === "cancelled") return "var(--error)";
  return "#6B7280";
}

function statusLabel(status: string) {
  const col = KANBAN_COLUMNS.find((c) => c.status === status);
  if (col) return col.label;
  if (status === "cancelled") return "Cancelled";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Table columns
// ─────────────────────────────────────────────────────────────────────────────

function buildColumns(
  onStatusChange: (id: string, status: PlacementStatus) => void,
): AdminColumn<PlacementRecord>[] {
  return [
    {
      key: "candidate",
      header: "Candidate",
      sortable: true,
      minWidth: 180,
      render: (p) => (
        <div className="flex items-center gap-2.5">
          {p.candidate?.photoUrl ? (
            <img
              src={p.candidate.photoUrl}
              alt={p.candidate.fullName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-[var(--primary)]">
                {(p.candidate?.fullName || "?").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {p.candidate?.fullName || "Unknown"}
            </p>
            {p.candidate?.primaryTrack && (
              <p className="text-[11px] text-[var(--neutral-gray)] truncate">
                {p.candidate.primaryTrack.name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "employer",
      header: "Company",
      sortable: true,
      minWidth: 150,
      render: (p) => (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-[var(--neutral-gray)] flex-shrink-0" />
          <span className="text-sm text-[var(--text-primary)] truncate">
            {p.employer?.companyName || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "job",
      header: "Role",
      minWidth: 150,
      render: (p) => (
        <span className="text-sm text-[var(--text-primary)] truncate">
          {p.job?.title || "General Placement"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      minWidth: 140,
      filter: {
        type: "select",
        options: STATUS_OPTIONS,
      },
      render: (p) => {
        const color = statusColor(p.status);
        const label = statusLabel(p.status);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: `${color}12`,
              color: color,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        );
      },
    },
    {
      key: "placementType",
      header: "Type",
      minWidth: 110,
      render: (p) => (
        <span className="text-sm text-[var(--neutral-gray)] capitalize">
          {p.placementType?.replace(/_/g, " ") || "N/A"}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Start Date",
      sortable: true,
      minWidth: 120,
      render: (p) =>
        p.startDate ? (
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
            <Calendar size={12} className="text-[var(--neutral-gray)]" />
            {new Date(p.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ) : (
          <span className="text-sm text-[var(--surface-4)]">Not set</span>
        ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      minWidth: 100,
      render: (p) => (
        <span className="text-sm text-[var(--neutral-gray)]">
          {new Date(p.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPlacementsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = useState<PlacementStatus | "">("");

  const { data, isLoading, isError, refetch } = usePlacements();
  const updateStatus = useUpdatePlacementStatus();

  const allPlacements = data?.data ?? [];

  const filtered = useMemo(() => {
    let result = allPlacements;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.candidate?.fullName ?? "").toLowerCase().includes(q) ||
          (p.employer?.companyName ?? "").toLowerCase().includes(q) ||
          (p.job?.title ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }
    return result;
  }, [allPlacements, search, statusFilter]);

  // ── Kanban status change handler ───────────────────────────────────

  const handleKanbanStatusChange = useCallback(
    (id: string, newStatus: PlacementStatus, notes?: string) => {
      updateStatus.mutate(
        { id, status: newStatus, notes },
        {
          onSuccess: () => toast.success(`Status updated to ${statusLabel(newStatus)}`),
          onError: (err: Error) => toast.error(err.message || "Failed to update status"),
        },
      );
    },
    [updateStatus],
  );

  // ── Table columns (memoized) ──────────────────────────────────────

  const tableColumns = useMemo(
    () =>
      buildColumns((id, status) => {
        updateStatus.mutate(
          { id, status },
          {
            onSuccess: () => toast.success("Status updated"),
            onError: (err: Error) => toast.error(err.message),
          },
        );
      }),
    [updateStatus],
  );

  // ── Table state ───────────────────────────────────────────────────

  const [sort, setSort] = useState<SortState>({ key: "updatedAt", direction: "desc" });

  const sortedFiltered = useMemo(() => {
    if (!sort.direction) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      switch (sort.key) {
        case "candidate":
          aVal = a.candidate?.fullName || "";
          bVal = b.candidate?.fullName || "";
          break;
        case "employer":
          aVal = a.employer?.companyName || "";
          bVal = b.employer?.companyName || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "startDate":
          aVal = a.startDate || "";
          bVal = b.startDate || "";
          break;
        case "updatedAt":
          aVal = a.updatedAt;
          bVal = b.updatedAt;
          break;
      }
      if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort]);

  // ── Loading / Error ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-[var(--error)] mb-4" />
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
          Failed to load placements
        </h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">
          Something went wrong. Please try again later.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--secondary)] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Placement Pipeline
          </h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-1">
            Track candidates through the placement lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/placements/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--secondary)] transition-colors shadow-sm"
          >
            <Plus size={16} />
            Create Placement
          </Link>
          <div className="flex bg-[var(--surface-2)] rounded-xl p-1">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "bg-[var(--surface-1)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--neutral-gray)]"
              }`}
            >
              <LayoutGrid size={14} />
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === "table"
                  ? "bg-[var(--surface-1)] text-[var(--primary)] shadow-sm"
                  : "text-[var(--neutral-gray)]"
              }`}
            >
              <List size={14} />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate, company, or role..."
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors bg-[var(--surface-1)]"
          />
        </div>
        <div className="relative">
          <Filter
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PlacementStatus | "")}
            className="appearance-none pl-8 pr-9 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-[var(--surface-1)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
          />
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-12 text-center">
          <TrendingUp size={48} className="mx-auto text-[var(--surface-3)] mb-4" />
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">
            No placements found
          </h3>
          <p className="text-sm text-[var(--neutral-gray)]">
            {search || statusFilter
              ? "Try adjusting your filters."
              : "Placements will appear here once created."}
          </p>
        </div>
      ) : view === "kanban" ? (
        <PlacementKanban
          placements={filtered}
          onStatusChange={handleKanbanStatusChange}
          isUpdating={updateStatus.isPending}
        />
      ) : (
        <AdminDataTable
          tableId="admin-placements"
          columns={tableColumns}
          data={sortedFiltered}
          keyExtractor={(p) => p.id}
          sort={sort}
          onSort={setSort}
          onRowClick={(p) => router.push(`/admin/placements/${p.id}`)}
          searchValue={search}
          onSearch={setSearch}
          searchPlaceholder="Search placements..."
          emptyIcon={TrendingUp}
          emptyTitle="No placements found"
          emptyDescription="Try adjusting your search or filters."
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  Filter,
  Search,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useAssets, useAssetStats, useSearchAssets } from "@/hooks/use-cmdb";
import { useSearchUsers } from "@/hooks/use-system";
import type { Asset } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ASSET_TYPES = [
  { value: "", label: "All Types" },
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "virtual", label: "Virtual" },
  { value: "cloud", label: "Cloud" },
  { value: "network", label: "Network" },
  { value: "peripheral", label: "Peripheral" },
];

const ASSET_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "procured", label: "Procured" },
  { value: "received", label: "Received" },
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
  { value: "disposed", label: "Disposed" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  maintenance: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  retired: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  disposed: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  procured: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  received: { bg: "rgba(20, 184, 166, 0.1)", text: "#14B8A6" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AssetsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* Debounced search value */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* Data sources: search vs regular listing */
  const { data: searchData, isLoading: searchLoading } = useSearchAssets(debouncedSearch, page, 20);
  const { data: listData, isLoading: listLoading } = useAssets(
    page,
    20,
    type || undefined,
    status || undefined,
  );

  const isSearching = debouncedSearch.length > 0;
  const data = isSearching ? searchData : listData;
  const isLoading = isSearching ? searchLoading : listLoading;

  const { data: stats } = useAssetStats();

  /* User lookup map for owner resolution */
  const { data: allUsers } = useSearchUsers("");
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    (allUsers ?? []).forEach((u) => map.set(u.id, u.displayName));
    return map;
  }, [allUsers]);

  const assets = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Columns ---- */

  const columns: Column<Asset>[] = [
    {
      key: "assetTag",
      header: "Asset Tag",
      sortable: true,
      className: "min-w-[120px]",
      render: (item) => (
        <span className="text-sm font-mono font-medium text-[var(--primary)]">
          {item.assetTag}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      className: "min-w-[200px]",
      render: (item) => (
        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
          {item.name}
        </p>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
          {item.type}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => {
        const color = STATUS_COLORS[item.status] ?? {
          bg: "var(--surface-2)",
          text: "var(--text-secondary)",
        };
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.status}
          </span>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.location || item.building || "--"}
        </span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.ownerId ? userMap.get(item.ownerId) ?? "Unassigned" : "Unassigned"}
        </span>
      ),
    },
    {
      key: "purchaseDate",
      header: "Purchase Date",
      sortable: true,
      render: (item) => (
        <span className="text-xs text-[var(--text-secondary)] tabular-nums">
          {item.purchaseDate
            ? new Date(item.purchaseDate).toLocaleDateString()
            : "--"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Total Assets
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Active
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#10B981" }}>
              {stats.activeCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Maintenance
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#F59E0B" }}>
              {stats.maintenanceCount}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Retired
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#6B7280" }}>
              {stats.retiredCount}
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(27,115,64,0.1)]">
            <Package size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Assets
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              View and manage hardware, software, and cloud assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search assets..."
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/cmdb/assets/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Register Asset
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {ASSET_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Search
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search assets..."
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={assets}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No assets found"
          emptyDescription="Register your first asset to get started."
          emptyAction={
            <button
              type="button"
              onClick={() => router.push("/dashboard/cmdb/assets/new")}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Register Asset
            </button>
          }
          onRowClick={(item) =>
            router.push(`/dashboard/cmdb/assets/${item.id}`)
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
      </motion.div>
    </div>
  );
}

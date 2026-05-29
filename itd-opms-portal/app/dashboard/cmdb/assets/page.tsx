"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Archive,
  ArrowUpRight,
  Boxes,
  Cpu,
  Filter,
  HardDrive,
  Layers3,
  MapPin,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useAssets, useAssetStats, useSearchAssets } from "@/hooks/use-cmdb";
import { useSearchUsers } from "@/hooks/use-system";
import type { Asset } from "@/types";

const PANEL_CLASS =
  "rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface-0)] shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";
const SOFT_PANEL_CLASS =
  "rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-[0_12px_30px_rgba(15,23,42,0.05)]";
const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5";
const PRIMARY_BUTTON_STYLE = {
  backgroundImage: "var(--gradient-primary)",
  borderColor: "var(--primary-light)",
  boxShadow: "var(--shadow-premium)",
};
const HERO_STYLE = {
  backgroundImage:
    "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%), radial-gradient(circle at bottom left, rgba(139,111,46,0.18), transparent 32%), var(--gradient-primary)",
  borderColor: "rgba(45,155,86,0.28)",
  boxShadow: "var(--shadow-premium)",
};

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

const TYPE_META: Record<
  string,
  { label: string; icon: ElementType; bg: string; text: string; accent: string }
> = {
  hardware: {
    label: "Hardware",
    icon: HardDrive,
    bg: "var(--badge-blue-bg)",
    text: "var(--badge-blue-text)",
    accent: "var(--info)",
  },
  software: {
    label: "Software",
    icon: Cpu,
    bg: "var(--badge-emerald-bg)",
    text: "var(--badge-emerald-text)",
    accent: "var(--success)",
  },
  virtual: {
    label: "Virtual",
    icon: Layers3,
    bg: "var(--badge-amber-bg)",
    text: "var(--gold-dark)",
    accent: "var(--gold)",
  },
  cloud: {
    label: "Cloud",
    icon: Boxes,
    bg: "var(--info-light)",
    text: "var(--info-dark)",
    accent: "var(--info)",
  },
  network: {
    label: "Network",
    icon: Activity,
    bg: "var(--warning-light)",
    text: "var(--warning-dark)",
    accent: "var(--warning)",
  },
  peripheral: {
    label: "Peripheral",
    icon: Package,
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
  },
};

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; accent: string; border: string }
> = {
  active: {
    label: "Active",
    bg: "var(--success-light)",
    text: "var(--success-dark)",
    accent: "var(--success)",
    border: "rgba(16,185,129,0.22)",
  },
  maintenance: {
    label: "Maintenance",
    bg: "var(--warning-light)",
    text: "var(--warning-dark)",
    accent: "var(--warning)",
    border: "rgba(245,158,11,0.22)",
  },
  retired: {
    label: "Retired",
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
    border: "rgba(148,163,184,0.24)",
  },
  disposed: {
    label: "Disposed",
    bg: "var(--error-light)",
    text: "var(--error-dark)",
    accent: "var(--error)",
    border: "rgba(239,68,68,0.22)",
  },
  procured: {
    label: "Procured",
    bg: "var(--info-light)",
    text: "var(--info-dark)",
    accent: "var(--info)",
    border: "rgba(59,130,246,0.22)",
  },
  received: {
    label: "Received",
    bg: "var(--badge-blue-bg)",
    text: "var(--badge-blue-text)",
    accent: "var(--info)",
    border: "rgba(59,130,246,0.18)",
  },
};

function toTitleCase(value?: string): string {
  if (!value) return "--";
  return value.replace(/_/g, " ");
}

function formatRelativeDate(value?: string): string {
  if (!value) return "--";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function buildLocation(asset: Asset): string {
  return (
    [asset.location, asset.building, asset.floor, asset.room]
      .filter((value): value is string => Boolean(value))
      .join(" · ") || "--"
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  helper,
  accent,
  inverted = false,
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper: string;
  accent: string;
  inverted?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] p-4"
      style={{
        border: inverted
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid var(--border)",
        background: inverted
          ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.07))"
          : "var(--surface-1)",
        boxShadow: inverted
          ? "0 18px 40px rgba(2, 6, 23, 0.12)"
          : "0 18px 40px rgba(15, 23, 42, 0.06)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: inverted
            ? "radial-gradient(circle at 100% 0%, rgba(255,255,255,0.18), transparent 36%)"
            : "radial-gradient(circle at 100% 0%, rgba(27,115,64,0.12), transparent 36%)",
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: inverted
                ? "rgba(255,255,255,0.12)"
                : "rgba(27,115,64,0.08)",
              border: inverted
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid var(--border)",
            }}
          >
            <Icon size={18} style={{ color: inverted ? "#fff" : accent }} />
          </div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              inverted ? "text-white/58" : "text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </p>
        </div>
        <p
          className={`mt-5 text-lg font-semibold leading-6 ${
            inverted ? "text-white" : "text-[var(--text-primary)]"
          }`}
        >
          {value}
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            inverted ? "text-white/72" : "text-[var(--text-secondary)]"
          }`}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type.toLowerCase()] ?? {
    label: toTitleCase(type),
    icon: Package,
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
  };
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status.toLowerCase()] ?? {
    label: toTitleCase(status),
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
    accent: "var(--text-secondary)",
    border: "rgba(148,163,184,0.24)",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: meta.bg,
        color: meta.text,
        borderColor: meta.border,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.accent }}
      />
      {meta.label}
    </span>
  );
}

export default function AssetsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchData, isLoading: searchLoading } = useSearchAssets(
    debouncedSearch,
    page,
    20,
  );
  const { data: listData, isLoading: listLoading } = useAssets(
    page,
    20,
    type || undefined,
    status || undefined,
  );
  const { data: stats } = useAssetStats();
  const { data: allUsers } = useSearchUsers("");

  const isSearching = debouncedSearch.length > 0;
  const data = isSearching ? searchData : listData;
  const isLoading = isSearching ? searchLoading : listLoading;
  const assets = data?.data ?? [];
  const meta = data?.meta;
  const filtersApplied = [type, status, debouncedSearch].filter(Boolean).length;

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    (allUsers ?? []).forEach((user) => map.set(user.id, user.displayName));
    return map;
  }, [allUsers]);

  const visibleTotal = meta?.totalItems ?? assets.length;
  const activeShare =
    stats && stats.total > 0
      ? Math.round((stats.activeCount / stats.total) * 100)
      : 0;
  const verificationPending = useMemo(
    () =>
      assets.filter(
        (asset) => asset.verificationStatus?.toLowerCase() !== "verified",
      ).length,
    [assets],
  );
  const unassignedOwners = useMemo(
    () => assets.filter((asset) => !asset.ownerId).length,
    [assets],
  );
  const recentAssets = useMemo(
    () =>
      [...assets]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, 4),
    [assets],
  );
  const watchlistAssets = useMemo(
    () =>
      assets
        .filter((asset) =>
          ["maintenance", "retired", "disposed"].includes(
            asset.status.toLowerCase(),
          ),
        )
        .slice(0, 4),
    [assets],
  );
  const typeMix = useMemo(
    () =>
      ASSET_TYPES.filter((entry) => entry.value)
        .map((entry) => ({
          ...entry,
          count: assets.filter(
            (asset) => asset.type.toLowerCase() === entry.value,
          ).length,
        }))
        .filter((entry) => entry.count > 0)
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
    [assets],
  );

  const columns: Column<Asset>[] = [
    {
      key: "assetTag",
      header: "Asset",
      sortable: true,
      className: "min-w-[240px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(27,115,64,0.08)" }}
          >
            <Package size={18} style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {item.name}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-[var(--primary)]">
              {item.assetTag}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (item) => (
        <div className="space-y-1.5">
          <TypeBadge type={item.type} />
          <p className="text-xs text-[var(--text-secondary)]">
            {[item.manufacturer, item.model].filter(Boolean).join(" · ") ||
              "--"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => (
        <div className="space-y-1.5">
          <StatusBadge status={item.status} />
          <p className="text-xs text-[var(--text-secondary)]">
            Verified {formatRelativeDate(item.lastVerifiedAt)}
          </p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <MapPin size={14} className="text-[var(--text-muted)]" />
          {buildLocation(item)}
        </span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <UserRound size={14} className="text-[var(--text-muted)]" />
          {item.ownerId
            ? (userMap.get(item.ownerId) ?? "Unassigned")
            : "Unassigned"}
        </span>
      ),
    },
    {
      key: "purchaseDate",
      header: "Lifecycle",
      sortable: true,
      render: (item) => (
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-primary)]">
            Purchased{" "}
            {item.purchaseDate
              ? new Date(item.purchaseDate).toLocaleDateString()
              : "--"}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Added {formatRelativeDate(item.createdAt)}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.2rem] border px-6 py-7 text-white"
        style={HERO_STYLE}
      >
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(139,111,46,0.16)" }}
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/82 backdrop-blur-xl">
              <Sparkles size={14} />
              CMDB Asset Command
            </div>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                <Package size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
                  Assets
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/84 sm:text-[15px]">
                  Track asset posture, ownership gaps, verification drift, and
                  the shape of your fleet from one sharper CMDB surface.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Boxes size={14} />
                    {visibleTotal} visible asset
                    {visibleTotal === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <ShieldCheck size={14} />
                    {activeShare}% active footprint
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Search size={14} />
                    {isSearching ? "Search lens active" : "Portfolio-wide view"}
                  </span>
                  {filtersApplied > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Filter size={14} />
                      {filtersApplied} filter{filtersApplied === 1 ? "" : "s"}{" "}
                      applied
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[480px]">
            <StatTile
              icon={Boxes}
              label="Total Portfolio"
              value={stats ? String(stats.total) : "--"}
              helper="Full asset inventory registered in the CMDB."
              accent="#ffffff"
              inverted
            />
            <StatTile
              icon={ShieldCheck}
              label="Active Fleet"
              value={stats ? String(stats.activeCount) : "--"}
              helper="Assets currently in productive service."
              accent="#ffffff"
              inverted
            />
            <StatTile
              icon={Wrench}
              label="Verification Drift"
              value={String(verificationPending)}
              helper="Visible assets that still need verification attention."
              accent="#ffffff"
              inverted
            />
            <StatTile
              icon={Archive}
              label="Unassigned Owners"
              value={String(unassignedOwners)}
              helper="Visible records without an owner mapped."
              accent="#ffffff"
              inverted
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by asset tag, name, location, or owner signal..."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                showFilters || filtersApplied > 0
                  ? "border-[var(--primary-light)] bg-[var(--success-light)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)]"
              }`}
            >
              <Filter size={16} />
              Filters
              {filtersApplied > 0 && (
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
              onClick={() => router.push("/dashboard/cmdb/assets/new")}
              className={PRIMARY_BUTTON_CLASS}
              style={PRIMARY_BUTTON_STYLE}
            >
              <Plus size={16} />
              Register Asset
            </button>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={`${PANEL_CLASS} p-5`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Fleet Signals
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                What the current result set says about asset composition,
                freshness, and operational focus.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Current page intelligence
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    Type Mix
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    The visible asset estate by primary type.
                  </p>
                </div>
                <Layers3 size={18} className="text-[var(--primary)]" />
              </div>

              <div className="mt-4 space-y-3">
                {typeMix.length > 0 ? (
                  typeMix.map((entry) => {
                    const metaForType = TYPE_META[entry.value];
                    const width =
                      assets.length > 0
                        ? Math.max((entry.count / assets.length) * 100, 8)
                        : 0;

                    return (
                      <div key={entry.value}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-[var(--text-primary)]">
                            {entry.label}
                          </span>
                          <span className="font-semibold tabular-nums text-[var(--text-secondary)]">
                            {entry.count}
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${width}%`,
                              backgroundColor:
                                metaForType?.accent ?? "var(--primary)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No type mix is available for the current view yet.
                  </p>
                )}
              </div>
            </div>

            <div className={`${SOFT_PANEL_CLASS} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    Recent Intake
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Recently registered assets visible in this slice.
                  </p>
                </div>
                <ArrowUpRight size={18} className="text-[var(--gold)]" />
              </div>

              <div className="mt-4 space-y-3">
                {recentAssets.length > 0 ? (
                  recentAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/cmdb/assets/${asset.id}`)
                      }
                      className="flex w-full items-start justify-between gap-3 rounded-[1.15rem] border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {asset.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {asset.assetTag} · {buildLocation(asset)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <TypeBadge type={asset.type} />
                        <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                          Added {formatRelativeDate(asset.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No recent asset activity is visible in this view.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-5"
        >
          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Attention Queue
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Assets needing operational attention.
                </p>
              </div>
              <Wrench size={18} className="text-[var(--warning-dark)]" />
            </div>

            <div className="mt-4 space-y-3">
              {watchlistAssets.length > 0 ? (
                watchlistAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/cmdb/assets/${asset.id}`)
                    }
                    className="w-full rounded-[1.2rem] border px-4 py-3 text-left transition-all hover:-translate-y-0.5"
                    style={{
                      borderColor:
                        STATUS_META[asset.status.toLowerCase()]?.border ??
                        "var(--border)",
                      background: `linear-gradient(180deg, var(--surface-1), ${
                        STATUS_META[asset.status.toLowerCase()]?.bg ??
                        "var(--surface-2)"
                      })`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {asset.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {asset.assetTag} ·{" "}
                          {asset.manufacturer || "Unknown vendor"}
                        </p>
                      </div>
                      <StatusBadge status={asset.status} />
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">
                      Last changed {formatRelativeDate(asset.updatedAt)}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No high-friction assets are visible in the current result set.
                </p>
              )}
            </div>

            <div className={`${SOFT_PANEL_CLASS} mt-4 p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    Coverage Signal
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Active footprint against the whole asset estate.
                  </p>
                </div>
                <ShieldCheck size={18} className="text-[var(--success-dark)]" />
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${activeShare}%`,
                    backgroundImage: "var(--gradient-primary)",
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                {activeShare}% of all registered assets are currently active.
              </p>
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
                      Filter the Asset Estate
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Narrow the portfolio by lifecycle status and asset class.
                    </p>
                  </div>
                  {filtersApplied > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setType("");
                        setStatus("");
                        setSearchQuery("");
                        setPage(1);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    Status Lenses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ASSET_STATUSES.filter((entry) => entry.value).map(
                      (entry) => {
                        const metaForStatus = STATUS_META[entry.value];

                        return (
                          <button
                            key={entry.value}
                            type="button"
                            onClick={() => {
                              setStatus((current) =>
                                current === entry.value ? "" : entry.value,
                              );
                              setPage(1);
                            }}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200"
                            style={{
                              color:
                                status === entry.value
                                  ? metaForStatus.text
                                  : "var(--text-secondary)",
                              backgroundColor:
                                status === entry.value
                                  ? metaForStatus.bg
                                  : "var(--surface-2)",
                              borderColor:
                                status === entry.value
                                  ? metaForStatus.border
                                  : "var(--border)",
                            }}
                          >
                            {entry.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={(event) => {
                        setType(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                    >
                      {ASSET_TYPES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                    >
                      {ASSET_STATUSES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Search
                    </label>
                    <input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search assets..."
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)]"
                    />
                  </div>
                </div>
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
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Asset Inventory
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Dense portfolio view for lifecycle, ownership, and location
                tracking.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {meta?.totalItems ?? assets.length} total visible
            </span>
          </div>
        </div>

        <div className="p-1 sm:p-2">
          <DataTable
            columns={columns}
            data={assets}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyTitle="No assets found"
            emptyDescription="Register your first asset to start tracking lifecycle, ownership, and verification."
            emptyAction={
              <button
                type="button"
                onClick={() => router.push("/dashboard/cmdb/assets/new")}
                className={PRIMARY_BUTTON_CLASS}
                style={PRIMARY_BUTTON_STYLE}
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
        </div>
      </motion.section>
    </div>
  );
}

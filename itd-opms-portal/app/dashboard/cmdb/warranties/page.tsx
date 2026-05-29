"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useWarranties, useExpiringWarranties } from "@/hooks/use-cmdb";
import type { Warranty } from "@/types";

const CARD_SURFACE =
  "rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface-0)]/95 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";
const SOFT_SURFACE =
  "rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-[0_12px_30px_rgba(15,23,42,0.05)]";

const RENEWAL_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "renewed", label: "Renewed" },
];

const STATUS_META: Record<
  string,
  { bg: string; text: string; accent: string; label: string }
> = {
  active: {
    bg: "color-mix(in srgb, var(--success) 12%, transparent)",
    text: "var(--success-dark)",
    accent: "#10B981",
    label: "Active",
  },
  expiring_soon: {
    bg: "color-mix(in srgb, var(--warning) 14%, transparent)",
    text: "var(--warning-dark)",
    accent: "#F59E0B",
    label: "Expiring Soon",
  },
  expired: {
    bg: "color-mix(in srgb, var(--error) 12%, transparent)",
    text: "var(--error-dark)",
    accent: "#EF4444",
    label: "Expired",
  },
  renewed: {
    bg: "color-mix(in srgb, var(--info) 12%, transparent)",
    text: "var(--info-dark)",
    accent: "#3B82F6",
    label: "Renewed",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function formatCountdown(days: number): string {
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day remaining";
  return `${days} days remaining`;
}

function formatCurrency(value?: number): string {
  if (value == null) return "--";
  return currencyFormatter.format(value);
}

function formatCoverage(value?: string): string {
  return value ? value.replace(/_/g, " ") : "Standard";
}

function formatAssetId(id: string): string {
  return `${id.slice(0, 8)}...`;
}

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      bg: "var(--surface-2)",
      text: "var(--text-muted)",
      accent: "#94A3B8",
      label: status.replace(/_/g, " "),
    }
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  helper,
  accent,
  inverted = false,
}: {
  icon: React.ElementType;
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
          : "1px solid rgba(148,163,184,0.18)",
        background: inverted
          ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08))"
          : "var(--surface-0)",
        boxShadow: inverted
          ? "0 16px 36px rgba(2, 6, 23, 0.12)"
          : "0 18px 40px rgba(15, 23, 42, 0.06)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `radial-gradient(circle at 100% 0%, ${accent}${inverted ? "26" : "18"}, transparent 34%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: inverted ? `${accent}22` : `${accent}16`,
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
            inverted ? "text-slate-100/72" : "text-[var(--text-secondary)]"
          }`}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

function StatusStrip({
  label,
  count,
  total,
  accent,
}: {
  label: string;
  count: number;
  total: number;
  accent: string;
}) {
  const width = total > 0 ? Math.max((count / total) * 100, count > 0 ? 8 : 0) : 0;

  return (
    <div className={`${SOFT_SURFACE} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
          {count}
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${accent}, ${accent}BB)`,
          }}
        />
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
        {total > 0 ? `${Math.round((count / total) * 100)}% of current view` : "No records loaded"}
      </p>
    </div>
  );
}

function ExpiringCard({ warranty }: { warranty: Warranty }) {
  const remainingDays = daysUntil(warranty.endDate);
  const isExpired = remainingDays < 0;
  const isUrgent = remainingDays <= 30;
  const statusMeta = isExpired
    ? getStatusMeta("expired")
    : isUrgent
      ? getStatusMeta("expiring_soon")
      : getStatusMeta("active");

  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] border p-5"
      style={{
        borderColor: `${statusMeta.accent}28`,
        background: `linear-gradient(180deg, var(--surface-0), ${statusMeta.bg})`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `radial-gradient(circle at top right, ${statusMeta.accent}18, transparent 30%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${statusMeta.accent}16` }}
            >
              <CalendarClock size={18} style={{ color: statusMeta.accent }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Warranty watch
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--text-primary)]">
                {warranty.contractNumber || formatAssetId(warranty.id)}
              </p>
            </div>
          </div>
          <span
            className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
          >
            {formatCountdown(remainingDays)}
          </span>
        </div>

        <div className="mt-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {warranty.vendor || "Unknown vendor"}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)] capitalize">
            {formatCoverage(warranty.coverageType)} coverage for asset {formatAssetId(warranty.assetId)}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={`${SOFT_SURFACE} p-3`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              End date
            </p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
              {new Date(warranty.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className={`${SOFT_SURFACE} p-3`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Protected value
            </p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
              {formatCurrency(warranty.cost)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WarrantiesPage() {
  const [page, setPage] = useState(1);
  const [renewalStatus, setRenewalStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useWarranties(
    page,
    20,
    renewalStatus || undefined,
  );
  const { data: expiringWarranties, isLoading: expiringLoading } =
    useExpiringWarranties(90);

  const warranties = data?.data ?? [];
  const meta = data?.meta;
  const expiring = expiringWarranties ?? [];

  const totalTracked = meta?.totalItems ?? warranties.length;
  const currentFilterLabel =
    RENEWAL_STATUSES.find((status) => status.value === renewalStatus)?.label ??
    "All statuses";

  const summary = useMemo(() => {
    const totalCoverageValue = warranties.reduce(
      (sum, warranty) => sum + (warranty.cost ?? 0),
      0,
    );
    const uniqueVendors = new Set(
      warranties
        .map((warranty) => warranty.vendor?.trim())
        .filter(Boolean),
    ).size;
    const urgentRenewals = expiring.filter(
      (warranty) => daysUntil(warranty.endDate) <= 30,
    ).length;
    const overdueInView = warranties.filter(
      (warranty) =>
        warranty.renewalStatus === "expired" || daysUntil(warranty.endDate) < 0,
    ).length;
    const statusCounts = {
      active: warranties.filter((warranty) => warranty.renewalStatus === "active").length,
      expiringSoon: warranties.filter((warranty) => warranty.renewalStatus === "expiring_soon").length,
      expired: warranties.filter((warranty) => warranty.renewalStatus === "expired").length,
      renewed: warranties.filter((warranty) => warranty.renewalStatus === "renewed").length,
    };
    const nearestExpiry = [...expiring].sort(
      (left, right) =>
        new Date(left.endDate).getTime() - new Date(right.endDate).getTime(),
    )[0];

    return {
      totalCoverageValue,
      uniqueVendors,
      urgentRenewals,
      overdueInView,
      statusCounts,
      nearestExpiry,
    };
  }, [expiring, warranties]);

  return (
    <div className="relative mx-auto max-w-[96rem] space-y-6 pb-10">
      <div className="pointer-events-none absolute inset-x-12 top-4 h-72 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.16),_transparent_64%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-64 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(245,158,11,0.12),_transparent_70%)] blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[2.2rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(8,25,52,0.98),rgba(12,74,110,0.95)_48%,rgba(14,116,144,0.88))] p-6 shadow-[0_32px_90px_rgba(15,23,42,0.14)] sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_22%),radial-gradient(circle_at_16%_18%,_rgba(255,255,255,0.08),_transparent_24%)]" />
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.25),_transparent_68%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(250,204,21,0.18),_transparent_68%)]" />

        <div className="relative grid items-center gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-xl">
              <Sparkles size={12} />
              Warranty Command Desk
            </div>

            <div className="mt-6 flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white/12 bg-white/10 shadow-lg shadow-cyan-950/20">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-[-0.045em] text-white sm:text-[2.7rem]">
                  Warranty Command Center
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100/80 sm:text-base">
                  Track coverage horizons, surface renewals before they become exposure, and keep vendor-backed protection visible across the CMDB.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium tracking-[0.08em] text-white/82">
                <Layers3 size={13} />
                {totalTracked} tracked warranties
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium tracking-[0.08em] text-white/82">
                <RefreshCw size={13} />
                Filter: {currentFilterLabel}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-2 text-xs font-medium tracking-[0.08em] text-white/82">
                <Clock3 size={13} />
                90-day renewal horizon
              </div>
            </div>

            <div className="mt-7 rounded-[1.45rem] border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
                Live renewal signal
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-100/78">
                {summary.nearestExpiry
                  ? `${summary.nearestExpiry.vendor || "A warranty"} reaches end of coverage on ${new Date(summary.nearestExpiry.endDate).toLocaleDateString()} with ${formatCountdown(daysUntil(summary.nearestExpiry.endDate)).toLowerCase()}.`
                  : "No warranties are approaching expiry inside the current 90-day radar."}
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:border-white/28 hover:bg-white/14"
              >
                <Filter size={16} />
                {showFilters ? "Hide Filters" : "Open Filters"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#0b3b5f] transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus size={16} />
                Add Warranty
              </button>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-medium text-white/84 backdrop-blur-xl">
                <ArrowUpRight size={16} />
                {warranties.length} records loaded in current view
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2">
            <SummaryTile
              icon={ShieldCheck}
              label="Tracked coverage"
              value={`${totalTracked}`}
              helper="Total warranties currently available in the registry."
              accent="#26A8D9"
              inverted
            />
            <SummaryTile
              icon={AlertTriangle}
              label="Renewals due"
              value={expiringLoading ? "Loading..." : `${expiring.length}`}
              helper={
                expiringLoading
                  ? "Calculating expiring coverage across the 90-day radar."
                  : `${summary.urgentRenewals} of them need attention in the next 30 days.`
              }
              accent="#FBBF24"
              inverted
            />
            <SummaryTile
              icon={Building2}
              label="Vendors in view"
              value={`${summary.uniqueVendors}`}
              helper="Distinct vendor relationships visible in the current page scope."
              accent="#34D399"
              inverted
            />
            <SummaryTile
              icon={CalendarClock}
              label="Nearest expiry"
              value={
                summary.nearestExpiry
                  ? formatCountdown(daysUntil(summary.nearestExpiry.endDate))
                  : "Clear horizon"
              }
              helper={
                summary.nearestExpiry
                  ? `${summary.nearestExpiry.vendor || "Unknown vendor"} · ${new Date(summary.nearestExpiry.endDate).toLocaleDateString()}`
                  : "No expiry signal detected in the next 90 days."
              }
              accent="#F472B6"
              inverted
            />
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className={`${CARD_SURFACE} p-5`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]/70">
                Coverage posture
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                Renewal mix in the current view
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              <Layers3 size={12} />
              {warranties.length} records loaded
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusStrip
              label="Active"
              count={summary.statusCounts.active}
              total={warranties.length}
              accent={STATUS_META.active.accent}
            />
            <StatusStrip
              label="Expiring Soon"
              count={summary.statusCounts.expiringSoon}
              total={warranties.length}
              accent={STATUS_META.expiring_soon.accent}
            />
            <StatusStrip
              label="Expired"
              count={summary.statusCounts.expired}
              total={warranties.length}
              accent={STATUS_META.expired.accent}
            />
            <StatusStrip
              label="Renewed"
              count={summary.statusCounts.renewed}
              total={warranties.length}
              accent={STATUS_META.renewed.accent}
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`${CARD_SURFACE} p-5`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]/70">
                Working scope
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                Filter and review posture
              </h2>
            </div>
            {renewalStatus && (
              <span className="inline-flex rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {currentFilterLabel}
              </span>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showFilters ? (
              <motion.div
                key="filters-open"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-5 grid gap-4 md:grid-cols-[minmax(0,260px)_1fr]"
              >
                <div className={`${SOFT_SURFACE} p-4`}>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Renewal status
                  </label>
                  <select
                    value={renewalStatus}
                    onChange={(event) => {
                      setRenewalStatus(event.target.value);
                      setPage(1);
                    }}
                    className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
                  >
                    {RENEWAL_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={`${SOFT_SURFACE} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Protected value
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(summary.totalCoverageValue)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Cost visible in the current page scope.
                    </p>
                  </div>
                  <div className={`${SOFT_SURFACE} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Overdue exposure
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                      {summary.overdueInView}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Warranties already past coverage in the current view.
                    </p>
                  </div>
                  <div className={`${SOFT_SURFACE} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Renewal urgency
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                      {summary.urgentRenewals}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Items requiring action inside the next 30 days.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="filters-closed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-5 grid gap-3 sm:grid-cols-3"
              >
                <div className={`${SOFT_SURFACE} p-4`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Active scope
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                    {currentFilterLabel}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Toggle filters to narrow the registry by renewal state.
                  </p>
                </div>
                <div className={`${SOFT_SURFACE} p-4`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Total tracked
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                    {totalTracked}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Registry size across all warranty records.
                  </p>
                </div>
                <div className={`${SOFT_SURFACE} p-4`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Vendor footprint
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                    {summary.uniqueVendors}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Distinct vendors represented on this page.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14 }}
        className={`${CARD_SURFACE} overflow-hidden`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]/70">
              Renewal radar
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              Warranties expiring within 90 days
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <AlertTriangle size={12} />
            {expiringLoading ? "Scanning coverage..." : `${expiring.length} renewals in watchlist`}
          </div>
        </div>

        {expiringLoading ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : expiring.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ShieldCheck size={24} />
            </div>
            <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              No immediate warranty risk
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Nothing is set to expire within the next 90 days.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {expiring.map((warranty) => (
              <ExpiringCard key={warranty.id} warranty={warranty} />
            ))}
          </div>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className={`${CARD_SURFACE} overflow-hidden`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]/70">
              Registry
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              Warranty portfolio
            </h2>
          </div>
          {meta && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              <RefreshCw size={12} />
              Page {meta.page} of {meta.totalPages} · {meta.totalItems} total
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : warranties.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
              <Shield size={24} />
            </div>
            <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              No warranties found
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Add a warranty to start tracking asset coverage, contract exposure, and renewal timing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Asset
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Vendor
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Contract
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Coverage
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Start
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    End
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Cost
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {warranties.map((warranty) => {
                  const statusMeta = getStatusMeta(warranty.renewalStatus);
                  const remainingDays = daysUntil(warranty.endDate);
                  const rowTint =
                    remainingDays < 0
                      ? "rgba(239,68,68,0.03)"
                      : remainingDays <= 30
                        ? "rgba(245,158,11,0.03)"
                        : "transparent";

                  return (
                    <tr
                      key={warranty.id}
                      className="transition-colors hover:bg-[var(--surface-1)]"
                      style={{ backgroundColor: rowTint }}
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-mono text-xs text-[var(--primary)]">
                            {formatAssetId(warranty.assetId)}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                            Updated {new Date(warranty.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)]">
                            <Building2 size={14} />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {warranty.vendor || "--"}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                              Tenant-backed coverage
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[var(--text-secondary)]">
                        {warranty.contractNumber || "--"}
                      </td>
                      <td className="px-5 py-4">
                        <p className="capitalize text-[var(--text-primary)]">
                          {formatCoverage(warranty.coverageType)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs tabular-nums text-[var(--text-secondary)]">
                        {new Date(warranty.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs tabular-nums text-[var(--text-secondary)]">
                          {new Date(warranty.endDate).toLocaleDateString()}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-[var(--text-primary)]">
                          {formatCountdown(remainingDays)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right text-xs font-medium tabular-nums text-[var(--text-primary)]">
                        {formatCurrency(warranty.cost)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize"
                          style={{
                            backgroundColor: statusMeta.bg,
                            color: statusMeta.text,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              Showing page {meta.page} of {meta.totalPages} with {warranties.length} records loaded in this view.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}

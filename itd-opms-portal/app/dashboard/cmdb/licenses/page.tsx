"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  FileKey,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Building2,
  Mail,
  ChevronDown,
  X,
  Trash2,
  Sparkles,
  Server,
  ShieldCheck,
  Clock,
  Package,
} from "lucide-react";
import {
  useLicenses,
  useLicenseComplianceStats,
  useLicenseAssignments,
  useDeleteLicenseAssignment,
} from "@/hooks/use-cmdb";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { License } from "@/types/cmdb";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LICENSE_TYPES = [
  { value: "", label: "All", icon: Package },
  { value: "perpetual", label: "Perpetual", icon: ShieldCheck },
  { value: "subscription", label: "Subscription", icon: TrendingUp },
  { value: "per_user", label: "Per User", icon: Users },
  { value: "per_device", label: "Per Device", icon: Server },
  { value: "site", label: "Site", icon: Building2 },
];

const COMPLIANCE_FILTERS = [
  { value: "", label: "All", color: "var(--text-muted)", icon: Sparkles },
  { value: "compliant", label: "Compliant", color: "#10B981", icon: CheckCircle },
  { value: "over_deployed", label: "Over Deployed", color: "#EF4444", icon: XCircle },
  { value: "under_utilized", label: "Under Utilized", color: "#F59E0B", icon: AlertTriangle },
];

const COMPLIANCE_META: Record<
  string,
  { bg: string; text: string; ring: string; label: string; icon: typeof CheckCircle }
> = {
  compliant: {
    bg: "rgba(16,185,129,0.10)",
    text: "#10B981",
    ring: "rgba(16,185,129,0.25)",
    label: "Compliant",
    icon: CheckCircle,
  },
  over_deployed: {
    bg: "rgba(239,68,68,0.10)",
    text: "#EF4444",
    ring: "rgba(239,68,68,0.25)",
    label: "Over Deployed",
    icon: XCircle,
  },
  under_utilized: {
    bg: "rgba(245,158,11,0.10)",
    text: "#F59E0B",
    ring: "rgba(245,158,11,0.25)",
    label: "Under Utilized",
    icon: AlertTriangle,
  },
};

const TYPE_COLOR: Record<string, string> = {
  perpetual: "#6366F1",
  subscription: "#8B5CF6",
  per_user: "#0EA5E9",
  per_device: "#14B8A6",
  site: "#F97316",
};

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(n?: number): string {
  if (n == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d?: string): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function expiryInfo(d?: string): { label: string; color: string; bg: string; days: number | null } {
  if (!d) {
    return { label: "No expiry", color: "var(--text-muted)", bg: "var(--surface-2)", days: null };
  }
  const diff = Math.floor((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    return { label: "Expired", color: "#EF4444", bg: "rgba(239,68,68,0.10)", days: diff };
  }
  if (diff <= 30) {
    return { label: `Expires in ${diff}d`, color: "#EF4444", bg: "rgba(239,68,68,0.10)", days: diff };
  }
  if (diff <= 90) {
    return { label: `Expires in ${diff}d`, color: "#F59E0B", bg: "rgba(245,158,11,0.10)", days: diff };
  }
  return { label: formatDate(d), color: "var(--text-muted)", bg: "var(--surface-2)", days: diff };
}

function softwareInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function utilizationPct(assigned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(999, Math.round((assigned / total) * 100));
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LicensesPage() {
  const [page, setPage] = useState(1);
  const [licenseType, setLicenseType] = useState("");
  const [complianceStatus, setComplianceStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useLicenses(
    page,
    20,
    licenseType || undefined,
    complianceStatus || undefined,
  );
  const { data: stats } = useLicenseComplianceStats();

  const licenses = data?.data ?? [];
  const meta = data?.meta;

  // Client-side search across the current page (server pagination is preserved).
  const filteredLicenses = useMemo(() => {
    if (!search.trim()) return licenses;
    const q = search.trim().toLowerCase();
    return licenses.filter(
      (l) =>
        l.softwareName.toLowerCase().includes(q) ||
        (l.vendor ?? "").toLowerCase().includes(q),
    );
  }, [licenses, search]);

  // Derived KPIs
  const totalSpend = useMemo(
    () => licenses.reduce((sum, l) => sum + (l.cost ?? 0), 0),
    [licenses],
  );
  const compliancePct = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.compliant / stats.total) * 100);
  }, [stats]);
  const expiringSoon = useMemo(
    () =>
      licenses.filter((l) => {
        const info = expiryInfo(l.expiryDate);
        return info.days !== null && info.days <= 30;
      }).length,
    [licenses],
  );
  const totalAssigned = useMemo(
    () => licenses.reduce((s, l) => s + l.assignedCount, 0),
    [licenses],
  );
  const totalEntitlements = useMemo(
    () => licenses.reduce((s, l) => s + l.totalEntitlements, 0),
    [licenses],
  );
  const seatUtilization = totalEntitlements > 0
    ? Math.round((totalAssigned / totalEntitlements) * 100)
    : 0;

  const hasActiveFilters = !!(licenseType || complianceStatus || search);

  function clearFilters() {
    setLicenseType("");
    setComplianceStatus("");
    setSearch("");
    setPage(1);
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HEADER                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm"
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
            }}
          >
            <FileKey size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
              License Compliance
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Track software licenses, entitlements & compliance posture
            </p>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
        >
          <Plus size={16} />
          Add License
        </button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  COMPLIANCE HEALTH HERO                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {stats && (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 lg:grid-cols-4"
        >
          {/* Big Health Card (spans 2) */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 lg:col-span-2">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-[0.06]" style={{
              background: "radial-gradient(circle, #10B981, transparent 70%)",
            }} />
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Overall Compliance
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tabular-nums text-[var(--text-primary)]">
                    {compliancePct}
                  </span>
                  <span className="text-2xl font-semibold text-[var(--text-muted)]">%</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {stats.compliant} of {stats.total} licenses healthy
                </p>

                {/* Progress bar */}
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${compliancePct}%` }}
                    transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="h-full rounded-full"
                    style={{
                      background: compliancePct >= 80
                        ? "linear-gradient(90deg, #10B981, #34D399)"
                        : compliancePct >= 50
                          ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                          : "linear-gradient(90deg, #EF4444, #F87171)",
                    }}
                  />
                </div>
              </div>

              <div className="hidden sm:flex sm:flex-col sm:gap-3 sm:border-l sm:border-[var(--border)] sm:pl-6">
                <SmallStat
                  icon={TrendingUp}
                  iconColor="#0EA5E9"
                  label="Seat utilization"
                  value={`${seatUtilization}%`}
                  hint={`${totalAssigned} / ${totalEntitlements} on this page`}
                />
                <SmallStat
                  icon={DollarSign}
                  iconColor="#10B981"
                  label="Total spend"
                  value={formatCurrency(totalSpend)}
                  hint="Sum on this page"
                />
              </div>
            </div>
          </div>

          {/* Status cards */}
          <StatCard
            icon={CheckCircle}
            label="Compliant"
            value={stats.compliant}
            total={stats.total}
            color="#10B981"
          />
          <StatCard
            icon={XCircle}
            label="Over Deployed"
            value={stats.overDeployed}
            total={stats.total}
            color="#EF4444"
            urgent={stats.overDeployed > 0}
          />
        </motion.div>
      )}

      {/* Mobile small stats fallback */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:hidden">
          <SmallStat
            icon={TrendingUp}
            iconColor="#0EA5E9"
            label="Utilization"
            value={`${seatUtilization}%`}
          />
          <SmallStat
            icon={DollarSign}
            iconColor="#10B981"
            label="Spend (page)"
            value={formatCurrency(totalSpend)}
          />
        </motion.div>
      )}

      {stats && stats.underUtilized > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-3">
            <AlertTriangle size={16} style={{ color: "#F59E0B" }} className="shrink-0" />
            <p className="text-xs text-[var(--text-primary)]">
              <span className="font-semibold">{stats.underUtilized}</span>{" "}
              license{stats.underUtilized !== 1 ? "s" : ""} under-utilized — consider reclaiming or downsizing seats.
            </p>
            <button
              type="button"
              onClick={() => {
                setComplianceStatus("under_utilized");
                setPage(1);
              }}
              className="ml-auto rounded-lg border border-[#F59E0B]/30 bg-[var(--surface-0)] px-3 py-1 text-[11px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10"
            >
              Review
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SMART FILTER BAR                                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by software name or vendor…"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] py-2.5 pl-10 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Compliance pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
            {COMPLIANCE_FILTERS.map((f) => {
              const active = complianceStatus === f.value;
              const Icon = f.icon;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setComplianceStatus(f.value);
                    setPage(1);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-[var(--surface-0)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                  style={active ? { color: f.color } : undefined}
                >
                  <Icon size={12} />
                  <span className="hidden sm:inline">{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Type chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Type:
          </span>
          {LICENSE_TYPES.map((t) => {
            const active = licenseType === t.value;
            const Icon = t.icon;
            const color = TYPE_COLOR[t.value] ?? "var(--text-muted)";
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setLicenseType(t.value);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "border-transparent text-white shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                style={active ? { backgroundColor: color } : undefined}
              >
                <Icon size={11} />
                {t.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-[11px] font-medium text-[var(--error)] transition-all hover:bg-[var(--error)]/5"
            >
              <X size={11} />
              Clear filters
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  LICENSE TABLE                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <SkeletonTable />
        ) : filteredLicenses.length === 0 ? (
          <EmptyState search={search} hasFilters={hasActiveFilters} onClear={clearFilters} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    <Th>Software</Th>
                    <Th>Type</Th>
                    <Th>Utilization</Th>
                    <Th align="center">Compliance</Th>
                    <Th>Expiry</Th>
                    <Th align="right">Cost</Th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map((license, idx) => (
                    <LicenseRow
                      key={license.id}
                      license={license}
                      index={idx}
                      isExpanded={expandedId === license.id}
                      onToggle={() =>
                        setExpandedId((cur) => (cur === license.id ? null : license.id))
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer / pagination */}
            {meta && (
              <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-1)] px-5 py-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {filteredLicenses.length}
                  </span>{" "}
                  of <span className="font-semibold text-[var(--text-primary)]">{meta.totalItems}</span>{" "}
                  licenses
                  {search && <span className="ml-1 italic">(filtered on this page)</span>}
                </p>

                {meta.totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="px-2 text-xs tabular-nums text-[var(--text-muted)]">
                      Page <span className="font-semibold text-[var(--text-primary)]">{meta.page}</span> of {meta.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick reference for expiring soon under the table */}
        {!isLoading && filteredLicenses.length > 0 && expiringSoon > 0 && !expandedId && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#F59E0B]">
            <Clock size={12} />
            <span className="font-semibold">{expiringSoon}</span> license{expiringSoon !== 1 ? "s" : ""} expire within 30 days
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-4 py-3 ${alignClass} text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]`}
    >
      {children}
    </th>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  total,
  color,
  urgent,
}: {
  icon: typeof CheckCircle;
  label: string;
  value: number;
  total: number;
  color: string;
  urgent?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-[var(--surface-0)] p-5 transition-all ${
        urgent ? "ring-1" : ""
      }`}
      style={{
        borderColor: urgent ? color : "var(--border)",
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        {urgent && (
          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: color }} />
            Action
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SmallStat({
  icon: Icon,
  iconColor,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingUp;
  iconColor: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 sm:border-0 sm:bg-transparent sm:p-0">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}
      >
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-sm font-bold text-[var(--text-primary)]">{value}</p>
        {hint && <p className="truncate text-[10px] text-[var(--text-muted)]">{hint}</p>}
      </div>
    </div>
  );
}

function LicenseRow({
  license,
  index,
  isExpanded,
  onToggle,
}: {
  license: License;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const compliance = COMPLIANCE_META[license.complianceStatus] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-muted)",
    ring: "var(--border)",
    label: license.complianceStatus,
    icon: CheckCircle,
  };
  const ComplianceIcon = compliance.icon;
  const expiry = expiryInfo(license.expiryDate);
  const utilPct = utilizationPct(license.assignedCount, license.totalEntitlements);
  const typeColor = TYPE_COLOR[license.licenseType] ?? "var(--text-muted)";

  // Utilization bar color: green ≤95%, amber 95–100, red >100
  const utilColor =
    utilPct > 100 ? "#EF4444" : utilPct >= 95 ? "#F59E0B" : "#10B981";

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(index * 0.02, 0.2) }}
        onClick={onToggle}
        className={`group cursor-pointer border-b border-[var(--border)] transition-colors ${
          isExpanded ? "bg-[var(--surface-1)]" : "hover:bg-[var(--surface-1)]"
        }`}
      >
        {/* Software */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${typeColor} 0%, color-mix(in srgb, ${typeColor} 70%, black) 100%)`,
              }}
            >
              {softwareInitials(license.softwareName)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--text-primary)]">
                {license.softwareName}
              </p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                {license.vendor || "No vendor"}
              </p>
            </div>
          </div>
        </td>

        {/* Type */}
        <td className="px-4 py-3">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize"
            style={{
              backgroundColor: `color-mix(in srgb, ${typeColor} 10%, transparent)`,
              color: typeColor,
            }}
          >
            {license.licenseType.replace(/_/g, " ")}
          </span>
        </td>

        {/* Utilization */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  {license.assignedCount} / {license.totalEntitlements}
                </span>
                <span className="tabular-nums" style={{ color: utilColor }}>
                  {utilPct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, utilPct)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: utilColor }}
                />
              </div>
            </div>
          </div>
        </td>

        {/* Compliance */}
        <td className="px-4 py-3 text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: compliance.bg,
              color: compliance.text,
            }}
          >
            <ComplianceIcon size={11} />
            {compliance.label}
          </span>
        </td>

        {/* Expiry */}
        <td className="px-4 py-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums"
            style={{ backgroundColor: expiry.bg, color: expiry.color }}
          >
            <Calendar size={10} />
            {expiry.label}
          </span>
        </td>

        {/* Cost */}
        <td className="px-4 py-3 text-right tabular-nums">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(license.cost)}
          </span>
        </td>

        {/* Chevron */}
        <td className="px-4 py-3">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[var(--text-muted)]"
          >
            <ChevronDown size={16} />
          </motion.div>
        </td>
      </motion.tr>

      {/* Expanded Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[var(--surface-1)]"
          >
            <td colSpan={7} className="p-0">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <ExpandedLicensePanel license={license} />
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

function ExpandedLicensePanel({ license }: { license: License }) {
  return (
    <div className="border-t border-[var(--border)] p-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {/* License meta card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            License Details
          </h3>
          <div className="space-y-2.5">
            <MetaRow icon={Building2} label="Vendor" value={license.vendor || "--"} />
            <MetaRow
              icon={Mail}
              label="Renewal Contact"
              value={license.renewalContact || "--"}
              copyable={!!license.renewalContact}
            />
            <MetaRow
              icon={Calendar}
              label="Expiry Date"
              value={license.expiryDate ? formatDate(license.expiryDate) : "No expiry"}
            />
            <MetaRow
              icon={DollarSign}
              label="Cost"
              value={formatCurrency(license.cost)}
            />
            <MetaRow
              icon={Clock}
              label="Last Updated"
              value={formatDate(license.updatedAt)}
            />
          </div>
        </div>

        {/* Assignments (spans 2) */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Assignments
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {license.assignedCount} of {license.totalEntitlements} seats allocated
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-2)]"
            >
              <Plus size={11} />
              Assign Seat
            </button>
          </div>
          <AssignmentsList licenseId={license.id} />
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  copyable,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={12} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        {copyable ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard?.writeText(value).catch(() => undefined);
              }
            }}
            className="truncate text-xs font-medium text-[var(--primary)] hover:underline"
            title="Click to copy"
          >
            {value}
          </button>
        ) : (
          <p className="truncate text-xs font-medium text-[var(--text-primary)]">{value}</p>
        )}
      </div>
    </div>
  );
}

function AssignmentsList({ licenseId }: { licenseId: string }) {
  const { data: assignments, isLoading } = useLicenseAssignments(licenseId);
  const deleteAssignment = useDeleteLicenseAssignment();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const items = assignments ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-8">
        <Users size={20} className="mb-2 text-[var(--text-muted)]" />
        <p className="text-xs font-medium text-[var(--text-primary)]">No seats allocated yet</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          Assign this license to a user or asset to start tracking usage.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((a) => {
          const isUser = !!a.userId;
          const id = a.userId || a.assetId || "";
          return (
            <div
              key={a.id}
              className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 transition-all hover:border-[var(--primary)]/30"
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: isUser
                    ? "rgba(14,165,233,0.10)"
                    : "rgba(20,184,166,0.10)",
                }}
              >
                {isUser ? (
                  <Users size={12} style={{ color: "#0EA5E9" }} />
                ) : (
                  <Server size={12} style={{ color: "#14B8A6" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                  {isUser ? "User" : a.assetId ? "Asset" : "Unassigned"}{" "}
                  <span className="text-[var(--text-muted)]">
                    {id ? `· ${id.slice(0, 8)}` : ""}
                  </span>
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Assigned {formatDate(a.assignedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(a.id);
                }}
                className="rounded-md p-1 text-[var(--text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--error)]/10 hover:text-[var(--error)]"
                aria-label="Remove assignment"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteAssignment.mutate(
            { licenseId, assignmentId: pendingDelete },
            { onSuccess: () => setPendingDelete(null) },
          );
        }}
        title="Remove Assignment"
        message="This will free up the license seat. Are you sure?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteAssignment.isPending}
      />
    </>
  );
}

function SkeletonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-[var(--surface-2)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-2 w-1/4 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
            <div className="h-2 w-32 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--surface-2)]" />
            <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  search,
  hasFilters,
  onClear,
}: {
  search: string;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
      >
        <FileKey size={24} style={{ color: "#8B5CF6" }} />
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {search ? `No results for "${search}"` : hasFilters ? "No licenses match these filters" : "No licenses yet"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--text-muted)]">
        {hasFilters
          ? "Try adjusting your filters or clearing them to see all licenses."
          : "Add your first license to start tracking entitlements and compliance."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <X size={12} />
          Clear filters
        </button>
      )}
    </div>
  );
}

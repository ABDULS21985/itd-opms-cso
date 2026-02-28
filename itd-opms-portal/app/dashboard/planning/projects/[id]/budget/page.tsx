"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Camera,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useBudgetSummary,
  useCostEntries,
  useCreateCostEntry,
  useDeleteCostEntry,
  useBurnRate,
  useBudgetSnapshots,
  useCreateBudgetSnapshot,
  useCostCategories,
} from "@/hooks/use-budget";
import { useProject } from "@/hooks/use-planning";
import type { CostEntry, BudgetSnapshot } from "@/hooks/use-budget";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NGN_FULL = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function varianceColor(pct: number): string {
  if (pct > 20) return "#22C55E";
  if (pct > 0) return "#F59E0B";
  return "#EF4444";
}

function varianceBg(pct: number): string {
  if (pct > 20) return "bg-green-50 text-green-700 border-green-200";
  if (pct > 0) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function cpiColor(cpi: number): string {
  if (cpi >= 1) return "#22C55E";
  if (cpi >= 0.8) return "#F59E0B";
  return "#EF4444";
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  actual: "Actual",
  committed: "Committed",
  forecast: "Forecast",
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  actual: "bg-blue-100 text-blue-700",
  committed: "bg-amber-100 text-amber-700",
  forecast: "bg-purple-100 text-purple-700",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  /* ---- State ---- */
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [entryTypeFilter, setEntryTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  /* ---- Data ---- */
  const { data: project } = useProject(projectId);
  const { data: summary, isLoading: summaryLoading } =
    useBudgetSummary(projectId);
  const { data: entriesData, isLoading: entriesLoading } = useCostEntries(
    projectId,
    {
      entryType: entryTypeFilter || undefined,
      page,
      limit: 10,
    },
  );
  const { data: burnRateData } = useBurnRate(projectId);
  const { data: snapshotsData } = useBudgetSnapshots(projectId);
  const { data: categories } = useCostCategories();

  const createEntry = useCreateCostEntry(projectId);
  const deleteEntry = useDeleteCostEntry(projectId);
  const createSnapshot = useCreateBudgetSnapshot(projectId);

  /* ---- Derived ---- */
  const entries: CostEntry[] = useMemo(() => {
    if (!entriesData) return [];
    if (Array.isArray(entriesData)) return entriesData;
    return (entriesData as any).data ?? [];
  }, [entriesData]);

  const totalPages = useMemo(() => {
    if (!entriesData) return 1;
    return (entriesData as any)?.meta?.totalPages ?? 1;
  }, [entriesData]);

  const snapshots: BudgetSnapshot[] = useMemo(() => {
    if (!snapshotsData) return [];
    if (Array.isArray(snapshotsData)) return snapshotsData;
    return (snapshotsData as any).data ?? [];
  }, [snapshotsData]);

  const burnRate: any[] = useMemo(() => {
    if (!burnRateData) return [];
    if (Array.isArray(burnRateData)) return burnRateData;
    return [];
  }, [burnRateData]);

  const categoryOptions = useMemo(() => {
    if (!categories) return [];
    const cats = Array.isArray(categories) ? categories : [];
    return cats.map((c) => ({ value: c.id, label: c.name }));
  }, [categories]);

  /* ---- Loading ---- */
  if (summaryLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/planning/projects/${projectId}`)}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Budget & Cost Tracking
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {project?.title ?? "Project"} - Financial Overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSnapshot(true)}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            <Camera className="h-4 w-4" />
            Take Snapshot
          </button>
          <button
            onClick={() => setShowAddEntry(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--secondary)]"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <SummaryCard
            label="Approved Budget"
            value={NGN.format(summary.approvedBudget)}
            icon={<DollarSign className="h-5 w-5" />}
            color="var(--primary)"
          />
          <SummaryCard
            label="Actual Spend"
            value={NGN.format(summary.actualSpend)}
            icon={<TrendingDown className="h-5 w-5" />}
            color="#3B82F6"
          />
          <SummaryCard
            label="Committed"
            value={NGN.format(summary.committedSpend)}
            icon={<Clock className="h-5 w-5" />}
            color="#F59E0B"
          />
          <SummaryCard
            label="Remaining"
            value={NGN.format(summary.remainingBudget)}
            icon={
              summary.remainingBudget >= 0 ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )
            }
            color={varianceColor(summary.variancePct)}
          />
          <SummaryCard
            label="Variance"
            value={`${summary.variancePct > 0 ? "+" : ""}${summary.variancePct.toFixed(1)}%`}
            icon={<BarChart3 className="h-5 w-5" />}
            color={varianceColor(summary.variancePct)}
          />
          <SummaryCard
            label="CPI"
            value={summary.costPerformanceIndex.toFixed(2)}
            icon={<TrendingUp className="h-5 w-5" />}
            color={cpiColor(summary.costPerformanceIndex)}
            subtitle={
              summary.costPerformanceIndex >= 1
                ? "Under budget"
                : "Over budget"
            }
          />
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Burn Rate Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Burn Rate
          </h2>
          {burnRate.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={burnRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-0)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number) => NGN_FULL.format(value)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumulativeActual"
                  name="Cumulative Actual"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="budgetLine"
                  name="Budget Line"
                  stroke="#22C55E"
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
                <Bar
                  dataKey="actual"
                  name="Monthly Actual"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  radius={[4, 4, 0, 0]}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-[var(--text-secondary)]">
              No burn rate data available yet
            </div>
          )}
        </motion.div>

        {/* Category Breakdown Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Spending by Category
          </h2>
          {summary && summary.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={summary.byCategory}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-0)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number) => NGN_FULL.format(value)}
                />
                <Legend />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="#3B82F6"
                  radius={[0, 4, 4, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="committed"
                  name="Committed"
                  fill="#F59E0B"
                  radius={[0, 4, 4, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="forecast"
                  name="Forecast"
                  fill="#A855F7"
                  radius={[0, 4, 4, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-[var(--text-secondary)]">
              No category data available
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Cost Entries Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Cost Entries
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={entryTypeFilter}
              onChange={(e) => {
                setEntryTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
            >
              <option value="">All Types</option>
              <option value="actual">Actual</option>
              <option value="committed">Committed</option>
              <option value="forecast">Forecast</option>
            </select>
          </div>
        </div>

        {entriesLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-[var(--text-secondary)]">
            No cost entries found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-primary)]">
                        {new Date(entry.entryDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-[var(--text-primary)]">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {entry.categoryName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ENTRY_TYPE_COLORS[entry.entryType] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {ENTRY_TYPE_LABELS[entry.entryType] ??
                            entry.entryType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {NGN_FULL.format(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {entry.vendorName || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteEntryId(entry.id)}
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Budget Snapshots ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Budget Snapshots
        </h2>
        {snapshots.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No snapshots taken yet. Take a snapshot to record the current budget
            state.
          </p>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-start gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                  <Camera className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {new Date(snap.snapshotDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      by {snap.creatorName || "Unknown"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
                    <span>Budget: {NGN.format(snap.approvedBudget)}</span>
                    <span>Actual: {NGN.format(snap.actualSpend)}</span>
                    <span>Committed: {NGN.format(snap.committedSpend)}</span>
                    <span>Completion: {snap.completionPct.toFixed(0)}%</span>
                  </div>
                  {snap.notes && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)] italic">
                      {snap.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Add Entry Modal ── */}
      <AddEntryModal
        open={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        onSubmit={(data) => {
          createEntry.mutate(data, {
            onSuccess: () => setShowAddEntry(false),
          });
        }}
        loading={createEntry.isPending}
        categoryOptions={categoryOptions}
      />

      {/* ── Snapshot Modal ── */}
      <SnapshotModal
        open={showSnapshot}
        onClose={() => setShowSnapshot(false)}
        onSubmit={(notes) => {
          createSnapshot.mutate(
            { notes: notes || undefined },
            { onSuccess: () => setShowSnapshot(false) },
          );
        }}
        loading={createSnapshot.isPending}
      />

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteEntryId}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={() => {
          if (deleteEntryId) {
            deleteEntry.mutate(deleteEntryId, {
              onSuccess: () => setDeleteEntryId(null),
            });
          }
        }}
        title="Delete Cost Entry"
        message="Are you sure you want to delete this cost entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteEntry.isPending}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      </div>
      <p
        className="mt-2 text-xl font-bold"
        style={{ color }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Entry Modal                                                    */
/* ------------------------------------------------------------------ */

function AddEntryModal({
  open,
  onClose,
  onSubmit,
  loading,
  categoryOptions,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    amount: number;
    entryType: string;
    categoryId?: string;
    entryDate?: string;
    vendorName?: string;
    invoiceRef?: string;
  }) => void;
  loading: boolean;
  categoryOptions: { value: string; label: string }[];
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [entryType, setEntryType] = useState("actual");
  const [categoryId, setCategoryId] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [vendorName, setVendorName] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    onSubmit({
      description: description.trim(),
      amount: parsedAmount,
      entryType,
      categoryId: categoryId || undefined,
      entryDate: entryDate || undefined,
      vendorName: vendorName.trim() || undefined,
      invoiceRef: invoiceRef.trim() || undefined,
    });
  };

  const handleClose = () => {
    if (!loading) {
      setDescription("");
      setAmount("");
      setEntryType("actual");
      setCategoryId("");
      setEntryDate(new Date().toISOString().slice(0, 10));
      setVendorName("");
      setInvoiceRef("");
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Add Cost Entry
        </h2>

        <div className="space-y-4">
          <FormField
            label="Description"
            name="description"
            value={description}
            onChange={setDescription}
            placeholder="Enter cost description"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Amount (NGN)"
              name="amount"
              type="number"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              required
            />
            <FormField
              label="Entry Type"
              name="entryType"
              type="select"
              value={entryType}
              onChange={setEntryType}
              required
              options={[
                { value: "actual", label: "Actual" },
                { value: "committed", label: "Committed" },
                { value: "forecast", label: "Forecast" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Category"
              name="categoryId"
              type="select"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select category"
              options={categoryOptions}
            />
            <FormField
              label="Entry Date"
              name="entryDate"
              type="date"
              value={entryDate}
              onChange={setEntryDate}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Vendor Name"
              name="vendorName"
              value={vendorName}
              onChange={setVendorName}
              placeholder="Optional"
            />
            <FormField
              label="Invoice Reference"
              name="invoiceRef"
              value={invoiceRef}
              onChange={setInvoiceRef}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--secondary)] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Entry
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Snapshot Modal                                                     */
/* ------------------------------------------------------------------ */

function SnapshotModal({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");

  const handleClose = () => {
    if (!loading) {
      setNotes("");
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
          <Camera className="h-6 w-6 text-[var(--primary)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Take Budget Snapshot
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          This will capture the current budget state including approved budget,
          actual spend, committed spend, and completion percentage.
        </p>

        <div className="mt-4">
          <FormField
            label="Notes (optional)"
            name="notes"
            type="textarea"
            value={notes}
            onChange={setNotes}
            placeholder="Add any notes about this snapshot..."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(notes)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--secondary)] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Take Snapshot
          </button>
        </div>
      </motion.div>
    </div>
  );
}

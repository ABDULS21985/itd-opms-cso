"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Filter,
  Search,
  AlertTriangle,
  DollarSign,
  Calendar,
  Clock,
  X,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  useContracts,
  useContractDashboard,
  useExpiringContracts,
  useVendors,
  useCreateContract,
  type Contract,
  type Vendor,
} from "@/hooks/use-vendors";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CONTRACT_TYPES = [
  { value: "", label: "All Types" },
  { value: "license", label: "License" },
  { value: "support", label: "Support" },
  { value: "maintenance", label: "Maintenance" },
  { value: "consulting", label: "Consulting" },
  { value: "cloud_service", label: "Cloud Service" },
  { value: "hardware", label: "Hardware" },
  { value: "sla", label: "SLA" },
  { value: "nda", label: "NDA" },
  { value: "msa", label: "MSA" },
  { value: "other", label: "Other" },
];

const CONTRACT_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "renewed", label: "Renewed" },
  { value: "terminated", label: "Terminated" },
  { value: "under_review", label: "Under Review" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  expiring_soon: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  expired: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  renewed: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  terminated: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  under_review: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  license: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  support: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  maintenance: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  consulting: { bg: "rgba(236, 72, 153, 0.1)", text: "#EC4899" },
  cloud_service: { bg: "rgba(6, 182, 212, 0.1)", text: "#06B6D4" },
  hardware: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  sla: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  nda: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  msa: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  other: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

/* ------------------------------------------------------------------ */
/*  Create Contract Modal                                              */
/* ------------------------------------------------------------------ */

function CreateContractModal({
  onClose,
  vendors,
}: {
  onClose: () => void;
  vendors: Vendor[];
}) {
  const createContract = useCreateContract();
  const [form, setForm] = useState({
    vendorId: "",
    contractNumber: "",
    title: "",
    description: "",
    contractType: "license",
    startDate: "",
    endDate: "",
    autoRenew: false,
    totalValue: "",
    annualValue: "",
    currency: "NGN",
    paymentSchedule: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContract.mutate(
      {
        vendorId: form.vendorId,
        contractNumber: form.contractNumber,
        title: form.title,
        description: form.description || null,
        contractType: form.contractType,
        startDate: form.startDate,
        endDate: form.endDate,
        autoRenew: form.autoRenew,
        totalValue: form.totalValue ? parseFloat(form.totalValue) : null,
        annualValue: form.annualValue ? parseFloat(form.annualValue) : null,
        currency: form.currency,
        paymentSchedule: form.paymentSchedule || null,
      } as unknown as Partial<Contract>,
      {
        onSuccess: () => onClose(),
      },
    );
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";
  const labelClass =
    "mb-1 block text-xs font-medium text-[var(--text-secondary)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Create Contract
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Vendor *</label>
            <select
              required
              value={form.vendorId}
              onChange={(e) =>
                setForm({ ...form, vendorId: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Select vendor...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contract Number *</label>
              <input
                required
                value={form.contractNumber}
                onChange={(e) =>
                  setForm({ ...form, contractNumber: e.target.value })
                }
                placeholder="CTR-2026-001"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Type *</label>
              <select
                value={form.contractType}
                onChange={(e) =>
                  setForm({ ...form, contractType: e.target.value })
                }
                className={inputClass}
              >
                {CONTRACT_TYPES.filter((t) => t.value !== "").map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contract title"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              placeholder="Contract description..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date *</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>End Date *</label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Total Value</label>
              <input
                type="number"
                step="0.01"
                value={form.totalValue}
                onChange={(e) =>
                  setForm({ ...form, totalValue: e.target.value })
                }
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Annual Value</label>
              <input
                type="number"
                step="0.01"
                value={form.annualValue}
                onChange={(e) =>
                  setForm({ ...form, annualValue: e.target.value })
                }
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value })
                }
                className={inputClass}
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Payment Schedule</label>
              <input
                value={form.paymentSchedule}
                onChange={(e) =>
                  setForm({ ...form, paymentSchedule: e.target.value })
                }
                placeholder="Monthly, Quarterly, etc."
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRenew"
              checked={form.autoRenew}
              onChange={(e) =>
                setForm({ ...form, autoRenew: e.target.checked })
              }
              className="rounded border-[var(--border)]"
            />
            <label
              htmlFor="autoRenew"
              className="text-sm text-[var(--text-primary)]"
            >
              Auto-renew
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createContract.isPending}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {createContract.isPending ? "Creating..." : "Create Contract"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ContractsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [contractType, setContractType] = useState("");
  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useContracts(
    page,
    20,
    contractType || undefined,
    status || undefined,
    vendorId || undefined,
    search || undefined,
  );
  const { data: dashboard } = useContractDashboard();
  const { data: expiringContracts } = useExpiringContracts(30);
  const { data: vendorsData } = useVendors(1, 100);

  const contracts = data?.data ?? [];
  const meta = data?.meta;
  const vendors = vendorsData?.data ?? [];

  /* ---- Columns ---- */

  const columns: Column<Contract>[] = [
    {
      key: "contractNumber",
      header: "Number",
      sortable: true,
      className: "min-w-[130px]",
      render: (item) => (
        <span className="text-sm font-mono font-medium text-[var(--primary)]">
          {item.contractNumber}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[200px]",
      render: (item) => (
        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
          {item.title}
        </p>
      ),
    },
    {
      key: "vendorName",
      header: "Vendor",
      sortable: true,
      render: (item) => (
        <span className="text-sm text-[var(--text-primary)]">
          {item.vendorName || "--"}
        </span>
      ),
    },
    {
      key: "contractType",
      header: "Type",
      sortable: true,
      render: (item) => {
        const color = TYPE_COLORS[item.contractType] ?? {
          bg: "var(--surface-2)",
          text: "var(--text-secondary)",
        };
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.contractType.replace("_", " ")}
          </span>
        );
      },
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
            {item.status.replace("_", " ")}
          </span>
        );
      },
    },
    {
      key: "annualValue",
      header: "Annual Value",
      sortable: true,
      align: "right",
      render: (item) => (
        <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
          {item.annualValue != null
            ? new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: item.currency || "NGN",
                maximumFractionDigits: 0,
              }).format(item.annualValue)
            : "--"}
        </span>
      ),
    },
    {
      key: "endDate",
      header: "End Date",
      sortable: true,
      render: (item) => {
        const endDate = new Date(item.endDate);
        const now = new Date();
        const daysUntil = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isExpiring = daysUntil >= 0 && daysUntil <= 30;
        const isExpired = daysUntil < 0;

        return (
          <span
            className="text-xs tabular-nums"
            style={{
              color: isExpired
                ? "#EF4444"
                : isExpiring
                  ? "#F59E0B"
                  : "var(--text-secondary)",
            }}
          >
            {endDate.toLocaleDateString()}
            {isExpiring && !isExpired && (
              <span className="ml-1">({daysUntil}d)</span>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Expiring Contracts Alert */}
      {expiringContracts && expiringContracts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)] p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              style={{ color: "#F59E0B" }}
              className="shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {expiringContracts.length} contract
                {expiringContracts.length !== 1 ? "s" : ""} expiring within
                30 days
              </p>
              <div className="mt-2 space-y-1">
                {expiringContracts.slice(0, 3).map((c) => (
                  <p
                    key={c.id}
                    className="text-xs text-[var(--text-secondary)]"
                  >
                    <span className="font-mono font-medium">
                      {c.contractNumber}
                    </span>{" "}
                    - {c.title} (
                    {c.vendorName || "Unknown Vendor"}) expires{" "}
                    {new Date(c.endDate).toLocaleDateString()}
                  </p>
                ))}
                {expiringContracts.length > 3 && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    and {expiringContracts.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dashboard Stats */}
      {dashboard && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-4"
        >
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Total
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {dashboard.totalContracts}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Active Value
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: "#10B981" }}
            >
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(dashboard.activeValue)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                30 Days
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{
                color: dashboard.expiringIn30 > 0 ? "#EF4444" : "#10B981",
              }}
            >
              {dashboard.expiringIn30}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                60 Days
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{
                color: dashboard.expiringIn60 > 0 ? "#F59E0B" : "#10B981",
              }}
            >
              {dashboard.expiringIn60}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                90 Days
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{
                color: dashboard.expiringIn90 > 0 ? "#F59E0B" : "#10B981",
              }}
            >
              {dashboard.expiringIn90}
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
            <FileText size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Contract Management
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Track and manage vendor contracts, renewals, and SLAs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Contract
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
              value={contractType}
              onChange={(e) => {
                setContractType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {CONTRACT_TYPES.map((t) => (
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
              {CONTRACT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Vendor
            </label>
            <select
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
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
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search contracts..."
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
          data={contracts}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No contracts found"
          emptyDescription="Create your first contract to get started."
          emptyAction={
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Contract
            </button>
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

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateContractModal
            onClose={() => setShowCreateModal(false)}
            vendors={vendors}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

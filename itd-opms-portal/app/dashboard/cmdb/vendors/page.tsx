"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Filter,
  Search,
  FileText,
  DollarSign,
  AlertTriangle,
  X,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  useVendors,
  useCreateVendor,
  useContractDashboard,
  type Vendor,
} from "@/hooks/use-vendors";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const VENDOR_TYPES = [
  { value: "", label: "All Types" },
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "services", label: "Services" },
  { value: "cloud", label: "Cloud" },
  { value: "telecom", label: "Telecom" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const VENDOR_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "under_review", label: "Under Review" },
  { value: "blacklisted", label: "Blacklisted" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  inactive: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  under_review: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  blacklisted: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  hardware: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  software: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  services: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  cloud: { bg: "rgba(6, 182, 212, 0.1)", text: "#06B6D4" },
  telecom: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  consulting: { bg: "rgba(236, 72, 153, 0.1)", text: "#EC4899" },
  other: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

/* ------------------------------------------------------------------ */
/*  Create Vendor Modal                                                */
/* ------------------------------------------------------------------ */

function CreateVendorModal({ onClose }: { onClose: () => void }) {
  const createVendor = useCreateVendor();
  const [form, setForm] = useState({
    name: "",
    code: "",
    vendorType: "software",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    address: "",
    paymentTerms: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVendor.mutate(
      {
        name: form.name,
        code: form.code,
        vendorType: form.vendorType,
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        website: form.website || null,
        address: form.address || null,
        paymentTerms: form.paymentTerms || null,
      },
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
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Register Vendor
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Vendor name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Code *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="VND-001"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Type *</label>
            <select
              value={form.vendorType}
              onChange={(e) =>
                setForm({ ...form, vendorType: e.target.value })
              }
              className={inputClass}
            >
              {VENDOR_TYPES.filter((t) => t.value !== "").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
                placeholder="John Doe"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
                placeholder="john@vendor.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                value={form.contactPhone}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
                placeholder="+234 800 000 0000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://vendor.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main Street, Lagos"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Payment Terms</label>
            <input
              value={form.paymentTerms}
              onChange={(e) =>
                setForm({ ...form, paymentTerms: e.target.value })
              }
              placeholder="Net 30"
              className={inputClass}
            />
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
              disabled={createVendor.isPending}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {createVendor.isPending ? "Creating..." : "Create Vendor"}
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

export default function VendorsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [vendorType, setVendorType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useVendors(
    page,
    20,
    vendorType || undefined,
    status || undefined,
    search || undefined,
  );
  const { data: dashboard } = useContractDashboard();

  const vendors = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Columns ---- */

  const columns: Column<Vendor>[] = [
    {
      key: "name",
      header: "Vendor",
      sortable: true,
      className: "min-w-[200px]",
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
            {item.name}
          </p>
          <p className="text-xs text-[var(--text-secondary)] font-mono">
            {item.code}
          </p>
        </div>
      ),
    },
    {
      key: "vendorType",
      header: "Type",
      sortable: true,
      render: (item) => {
        const color = TYPE_COLORS[item.vendorType] ?? {
          bg: "var(--surface-2)",
          text: "var(--text-secondary)",
        };
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.vendorType.replace("_", " ")}
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
      key: "contactName",
      header: "Contact",
      render: (item) => (
        <div>
          <p className="text-sm text-[var(--text-primary)]">
            {item.contactName || "--"}
          </p>
          {item.contactEmail && (
            <p className="text-xs text-[var(--text-secondary)]">
              {item.contactEmail}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "paymentTerms",
      header: "Payment Terms",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.paymentTerms || "--"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Registered",
      sortable: true,
      render: (item) => (
        <span className="text-xs text-[var(--text-secondary)] tabular-nums">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {dashboard && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <Building2
                size={16}
                className="text-[var(--text-secondary)]"
              />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Total Vendors
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {vendors.length > 0
                ? meta?.totalItems ?? vendors.length
                : 0}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--text-secondary)]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Active Contracts
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: "#10B981" }}
            >
              {dashboard.totalContracts}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={16}
                className="text-[var(--text-secondary)]"
              />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Expiring Soon
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: "#F59E0B" }}
            >
              {dashboard.expiringIn30}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-2">
              <DollarSign
                size={16}
                className="text-[var(--text-secondary)]"
              />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Annual Value
              </p>
            </div>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: "#3B82F6" }}
            >
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(dashboard.activeValue)}
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
            <Building2 size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Vendor Registry
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage vendors, contracts, and performance scorecards
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
            Add Vendor
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
              value={vendorType}
              onChange={(e) => {
                setVendorType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {VENDOR_TYPES.map((t) => (
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
              {VENDOR_STATUSES.map((s) => (
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
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search vendors..."
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
          data={vendors}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No vendors found"
          emptyDescription="Register your first vendor to get started."
          emptyAction={
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Add Vendor
            </button>
          }
          onRowClick={(item) =>
            router.push(`/dashboard/cmdb/vendors/${item.id}`)
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
          <CreateVendorModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

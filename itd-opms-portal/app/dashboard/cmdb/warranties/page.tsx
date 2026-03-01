"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Filter,
  Plus,
  AlertTriangle,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { useWarranties, useExpiringWarranties } from "@/hooks/use-cmdb";
import type { Warranty } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RENEWAL_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "renewed", label: "Renewed" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  expiring_soon: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  expired: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  renewed: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Expiring Card Component                                            */
/* ------------------------------------------------------------------ */

function ExpiringCard({ warranty }: { warranty: Warranty }) {
  const days = daysUntil(warranty.endDate);
  const isOverdue = days < 0;
  const isUrgent = days <= 30;

  const cardColor = isOverdue
    ? "#EF4444"
    : isUrgent
      ? "#F59E0B"
      : "#3B82F6";

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: `${cardColor}40`,
        backgroundColor: `${cardColor}08`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} style={{ color: cardColor }} />
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            {warranty.contractNumber || warranty.id.slice(0, 8)}
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: `${cardColor}20`, color: cardColor }}
        >
          {formatCountdown(days)}
        </span>
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {warranty.vendor || "Unknown Vendor"}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
        {warranty.coverageType || "Standard"} coverage
      </p>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>Asset: {warranty.assetId.slice(0, 8)}...</span>
        <span className="tabular-nums">
          Ends: {new Date(warranty.endDate).toLocaleDateString()}
        </span>
      </div>
      {warranty.cost != null && (
        <p className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
          Cost: ${warranty.cost.toLocaleString()}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WarrantiesPage() {
  const [page, setPage] = useState(1);
  const [renewalStatus, setRenewalStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useWarranties(
    page,
    20,
    renewalStatus || undefined,
  );
  const { data: expiringWarranties, isLoading: _expiringLoading } =
    useExpiringWarranties(90);

  const warranties = data?.data ?? [];
  const meta = data?.meta;
  const expiring = expiringWarranties ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
          >
            <Shield size={20} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Warranty Tracker
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Monitor warranty coverage, renewals, and expiry dates
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
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Add Warranty
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
              Renewal Status
            </label>
            <select
              value={renewalStatus}
              onChange={(e) => {
                setRenewalStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {RENEWAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Expiring Soon Section */}
      {expiring.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: "#F59E0B" }} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Expiring Within 90 Days ({expiring.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiring.map((w) => (
              <ExpiringCard key={w.id} warranty={w} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Warranty Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : warranties.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <Shield size={24} className="mx-auto text-[var(--text-secondary)] mb-2" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No warranties found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Add a warranty to start tracking coverage and renewals.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Asset
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Contract #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Coverage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      End Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {warranties.map((w) => {
                    const statusColor = STATUS_COLORS[w.renewalStatus] ?? {
                      bg: "var(--surface-2)",
                      text: "var(--text-secondary)",
                    };
                    return (
                      <tr
                        key={w.id}
                        className="transition-colors hover:bg-[var(--surface-1)]"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-[var(--primary)]">
                            {w.assetId.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">
                          {w.vendor || "--"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                          {w.contractNumber || "--"}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">
                          {w.coverageType || "--"}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-[var(--text-secondary)]">
                          {new Date(w.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-[var(--text-secondary)]">
                          {new Date(w.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums text-[var(--text-primary)]">
                          {w.cost != null ? `$${w.cost.toLocaleString()}` : "--"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
                            style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                          >
                            {w.renewalStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Showing page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

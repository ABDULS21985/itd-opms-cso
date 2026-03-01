"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileKey,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
} from "lucide-react";
import {
  useLicenses,
  useLicenseComplianceStats,
  useLicenseAssignments,
} from "@/hooks/use-cmdb";
import type { License } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LICENSE_TYPES = [
  { value: "", label: "All Types" },
  { value: "perpetual", label: "Perpetual" },
  { value: "subscription", label: "Subscription" },
  { value: "open_source", label: "Open Source" },
  { value: "oem", label: "OEM" },
  { value: "volume", label: "Volume" },
  { value: "enterprise", label: "Enterprise" },
];

const COMPLIANCE_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "compliant", label: "Compliant" },
  { value: "over_deployed", label: "Over Deployed" },
  { value: "under_utilized", label: "Under Utilized" },
];

const COMPLIANCE_COLORS: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  compliant: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", icon: CheckCircle },
  over_deployed: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", icon: XCircle },
  under_utilized: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", icon: AlertTriangle },
};

/* ------------------------------------------------------------------ */
/*  Assignment Drawer Component                                        */
/* ------------------------------------------------------------------ */

function AssignmentDrawer({ licenseId }: { licenseId: string }) {
  const { data: assignments, isLoading } = useLicenseAssignments(licenseId);
  const items = assignments ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
        No assignments found for this license.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded-lg bg-[var(--surface-1)] p-2.5"
        >
          <div className="flex items-center gap-2">
            <Users size={12} className="text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-primary)]">
              {a.userId
                ? `User: ${a.userId.slice(0, 8)}...`
                : a.assetId
                  ? `Asset: ${a.assetId.slice(0, 8)}...`
                  : "Unassigned"}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
            {new Date(a.assignedAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LicensesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [licenseType, setLicenseType] = useState("");
  const [complianceStatus, setComplianceStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLicenseId, setExpandedLicenseId] = useState<string | null>(null);

  const { data, isLoading } = useLicenses(
    page,
    20,
    licenseType || undefined,
    complianceStatus || undefined,
  );
  const { data: complianceStats } = useLicenseComplianceStats();

  const licenses = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Compliance Stats Bar */}
      {complianceStats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Total Licenses
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {complianceStats.total}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} style={{ color: "#10B981" }} />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Compliant
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#10B981" }}>
              {complianceStats.compliant}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-1.5">
              <XCircle size={12} style={{ color: "#EF4444" }} />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Over Deployed
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#EF4444" }}>
              {complianceStats.overDeployed}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={12} style={{ color: "#F59E0B" }} />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Under Utilized
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#F59E0B" }}>
              {complianceStats.underUtilized}
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
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
          >
            <FileKey size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              License Compliance
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Track software licenses, entitlements, and compliance status
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
            Add License
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
              License Type
            </label>
            <select
              value={licenseType}
              onChange={(e) => {
                setLicenseType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {LICENSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Compliance Status
            </label>
            <select
              value={complianceStatus}
              onChange={(e) => {
                setComplianceStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {COMPLIANCE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* License Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : licenses.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <FileKey size={24} className="mx-auto text-[var(--text-secondary)] mb-2" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No licenses found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Add your first license to start tracking compliance.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Software
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Entitlements
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Assigned
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Compliance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Expiry
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {licenses.map((license) => {
                    const compliance = COMPLIANCE_COLORS[license.complianceStatus] ?? {
                      bg: "var(--surface-2)",
                      text: "var(--text-secondary)",
                      icon: CheckCircle,
                    };
                    const ComplianceIcon = compliance.icon;
                    const isExpanded = expandedLicenseId === license.id;

                    return (
                      <motion.tr
                        key={license.id}
                        className="group cursor-pointer transition-colors hover:bg-[var(--surface-1)]"
                        onClick={() =>
                          setExpandedLicenseId(isExpanded ? null : license.id)
                        }
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--text-primary)]">
                            {license.softwareName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {license.vendor || "--"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                            {license.licenseType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-[var(--text-primary)]">
                          {license.totalEntitlements}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-[var(--text-primary)]">
                          {license.assignedCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
                            style={{ backgroundColor: compliance.bg, color: compliance.text }}
                          >
                            <ComplianceIcon size={12} />
                            {license.complianceStatus.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-[var(--text-secondary)]">
                          {license.expiryDate
                            ? new Date(license.expiryDate).toLocaleDateString()
                            : "No expiry"}
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-[var(--text-secondary)]" />
                          ) : (
                            <ChevronDown size={16} className="text-[var(--text-secondary)]" />
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded Assignments */}
            {expandedLicenseId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider">
                  License Assignments
                </h3>
                <AssignmentDrawer licenseId={expandedLicenseId} />
              </motion.div>
            )}
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

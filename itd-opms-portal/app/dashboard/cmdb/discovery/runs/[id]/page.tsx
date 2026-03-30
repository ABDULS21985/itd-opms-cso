"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Monitor,
  Plus,
  RefreshCw,
  AlertTriangle,
  Minus,
  Check,
} from "lucide-react";
import {
  useDiscoveryRun,
  useDiscoveryRunDevices,
  useReconcileDiscoveryRun,
} from "@/hooks/use-cmdb";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  scanning: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  reconciling: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  completed: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  failed: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  network: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  ad_import: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  sccm: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  csv_import: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
};

const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6", label: "New" },
  update: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", label: "Update" },
  no_change: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280", label: "No Change" },
  conflict: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", label: "Conflict" },
};

function confidenceColor(conf: number): string {
  if (conf >= 0.9) return "#10B981";
  if (conf >= 0.7) return "#F59E0B";
  return "#EF4444";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DiscoveryRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: runData, isLoading: runLoading } = useDiscoveryRun(id);
  const { data: devicesData, isLoading: devicesLoading } =
    useDiscoveryRunDevices(id, page, 50, actionFilter || undefined);
  const reconcile = useReconcileDiscoveryRun();

  const run = runData;
  const devices = devicesData?.data ?? [];
  const meta = devicesData?.meta;

  const statusColor = STATUS_COLORS[run?.status ?? "pending"] ?? STATUS_COLORS.pending;

  // Counts by action.
  const actionCounts = useMemo(() => {
    const counts = { new: 0, update: 0, no_change: 0, conflict: 0, total: 0 };
    if (run) {
      counts.total = run.devicesFound;
      counts.new = run.newCis;
      counts.update = run.updatedCis;
      // Approximate from total.
      counts.no_change = Math.max(0, counts.total - counts.new - counts.update);
    }
    return counts;
  }, [run]);

  const toggleSelect = useCallback(
    (deviceId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(deviceId)) {
          next.delete(deviceId);
        } else {
          next.add(deviceId);
        }
        return next;
      });
    },
    [],
  );

  const selectAll = useCallback(() => {
    if (selectedIds.size === devices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(devices.map((d) => d.id)));
    }
  }, [devices, selectedIds.size]);

  const handleReconcile = useCallback(() => {
    if (selectedIds.size === 0 || !id) return;
    reconcile.mutate({
      runId: id,
      deviceIds: Array.from(selectedIds),
    });
  }, [id, selectedIds, reconcile]);

  if (runLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-[var(--text-secondary)]">Run not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/cmdb/discovery")}
          className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-3"
        >
          <ArrowLeft size={14} />
          Back to Discovery
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: statusColor.bg }}
            >
              {run.status === "completed" ? (
                <CheckCircle size={20} style={{ color: statusColor.text }} />
              ) : run.status === "failed" ? (
                <AlertCircle size={20} style={{ color: statusColor.text }} />
              ) : (
                <Clock size={20} style={{ color: statusColor.text }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {run.profileName ?? "Discovery Run"}
                </h1>
                {run.scanType && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor:
                        (SOURCE_COLORS[run.scanType] ?? SOURCE_COLORS.network).bg,
                      color:
                        (SOURCE_COLORS[run.scanType] ?? SOURCE_COLORS.network).text,
                    }}
                  >
                    {run.scanType.replace(/_/g, " ")}
                  </span>
                )}
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: statusColor.bg,
                    color: statusColor.text,
                  }}
                >
                  {run.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
                Started{" "}
                {run.startedAt
                  ? new Date(run.startedAt).toLocaleString()
                  : new Date(run.createdAt).toLocaleString()}
                {run.completedAt &&
                  ` — Completed ${new Date(run.completedAt).toLocaleString()}`}
              </p>
            </div>
          </div>

          {run.status === "reconciling" && selectedIds.size > 0 && (
            <button
              type="button"
              disabled={reconcile.isPending}
              onClick={handleReconcile}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {reconcile.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Reconcile {selectedIds.size} Device
              {selectedIds.size !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Devices Found",
            value: actionCounts.total,
            icon: Monitor,
            color: "#3B82F6",
          },
          {
            label: "New CIs",
            value: actionCounts.new,
            icon: Plus,
            color: "#10B981",
          },
          {
            label: "Updates",
            value: actionCounts.update,
            icon: RefreshCw,
            color: "#F59E0B",
          },
          {
            label: "No Change",
            value: actionCounts.no_change,
            icon: Minus,
            color: "#6B7280",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <card.icon size={14} style={{ color: card.color }} />
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                {card.label}
              </p>
            </div>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Filter:
        </span>
        {["", "new", "update", "no_change", "conflict"].map((action) => {
          const isActive = actionFilter === action;
          const a = action || "all";
          const color = action ? ACTION_COLORS[action] : null;
          return (
            <button
              key={a}
              type="button"
              onClick={() => {
                setActionFilter(action);
                setPage(1);
              }}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: isActive
                  ? color?.bg ?? "rgba(59, 130, 246, 0.1)"
                  : "transparent",
                color: isActive
                  ? color?.text ?? "#3B82F6"
                  : "var(--text-secondary)",
                border: `1px solid ${isActive ? "transparent" : "var(--border)"}`,
              }}
            >
              {action ? ACTION_COLORS[action]?.label ?? action : "All"}
            </button>
          );
        })}
      </motion.div>

      {/* Devices Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {devicesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <Monitor
              size={24}
              className="mx-auto text-[var(--text-secondary)] mb-2"
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No devices found
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                  {run.status === "reconciling" && (
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          devices.length > 0 &&
                          selectedIds.size === devices.length
                        }
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Hostname
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell">
                    MAC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden lg:table-cell">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider hidden lg:table-cell">
                    OS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => {
                  const conf = device.matchConfidence ?? 0;
                  const confColor = confidenceColor(conf);
                  const action = device.action ?? "new";
                  const actionStyle =
                    ACTION_COLORS[action] ?? ACTION_COLORS.new;

                  return (
                    <tr
                      key={device.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)] transition-colors"
                    >
                      {run.status === "reconciling" && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(device.id)}
                            onChange={() => toggleSelect(device.id)}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {device.hostname ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] tabular-nums">
                        {device.ipAddress ?? "-"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor:
                              (SOURCE_COLORS[device.source ?? run.scanType ?? "network"] ??
                                SOURCE_COLORS.network).bg,
                            color:
                              (SOURCE_COLORS[device.source ?? run.scanType ?? "network"] ??
                                SOURCE_COLORS.network).text,
                          }}
                        >
                          {(device.source ?? run.scanType ?? "network").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] tabular-nums hidden md:table-cell text-xs">
                        {device.macAddress ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] hidden lg:table-cell text-xs">
                        {device.deviceType ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] hidden lg:table-cell text-xs">
                        {[device.osName, device.osVersion]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${conf * 100}%`,
                                backgroundColor: confColor,
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: confColor }}
                          >
                            {(conf * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: actionStyle.bg,
                            color: actionStyle.text,
                          }}
                        >
                          {action === "conflict" && (
                            <AlertTriangle size={10} />
                          )}
                          {actionStyle.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Page {meta.page} of {meta.totalPages} ({meta.totalItems} devices)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
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

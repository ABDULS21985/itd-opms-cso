"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Filter,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useCapacityAllocations } from "@/hooks/use-people";
import type { CapacityAllocation } from "@/types";

/* ------------------------------------------------------------------ */
/*  Allocation Bar Component                                            */
/* ------------------------------------------------------------------ */

function AllocationBar({
  userId,
  allocations,
}: {
  userId: string;
  allocations: CapacityAllocation[];
}) {
  const totalPct = allocations.reduce((sum, a) => sum + a.allocationPct, 0);
  const isOver = totalPct > 100;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {userId.slice(0, 8)}...
        </p>
        <div className="flex items-center gap-2">
          {isOver && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "#EF4444",
              }}
            >
              <AlertTriangle size={10} />
              Over-allocated
            </span>
          )}
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: isOver ? "#EF4444" : "#10B981" }}
          >
            {totalPct}%
          </span>
        </div>
      </div>

      {/* Stacked Bar */}
      <div className="h-4 rounded-full bg-[var(--surface-2)] overflow-hidden flex">
        {allocations.map((alloc, i) => {
          const colors = [
            "#3B82F6",
            "#8B5CF6",
            "#10B981",
            "#F59E0B",
            "#EF4444",
            "#06B6D4",
            "#F97316",
          ];
          const color = colors[i % colors.length];
          return (
            <div
              key={alloc.id}
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(alloc.allocationPct, 100)}%`,
                backgroundColor: color,
                opacity: 0.8,
              }}
              title={`${alloc.projectId ? alloc.projectId.slice(0, 8) + "..." : "No project"}: ${alloc.allocationPct}%`}
            />
          );
        })}
      </div>

      {/* Allocation Breakdown */}
      <div className="mt-3 space-y-1">
        {allocations.map((alloc, i) => {
          const colors = [
            "#3B82F6",
            "#8B5CF6",
            "#10B981",
            "#F59E0B",
            "#EF4444",
            "#06B6D4",
            "#F97316",
          ];
          const color = colors[i % colors.length];
          return (
            <div key={alloc.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-[var(--text-secondary)]">
                  {alloc.projectId
                    ? alloc.projectId.slice(0, 8) + "..."
                    : "General"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {new Date(alloc.periodStart).toLocaleDateString()} -{" "}
                  {new Date(alloc.periodEnd).toLocaleDateString()}
                </span>
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color }}
                >
                  {alloc.allocationPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CapacityPage() {
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useCapacityAllocations(
    page,
    100,
    userFilter || undefined,
    projectFilter || undefined,
  );

  const allocations = data?.data ?? [];
  const meta = data?.meta;

  // Group allocations by userId
  const grouped = useMemo(() => {
    const map = new Map<string, CapacityAllocation[]>();
    for (const alloc of allocations) {
      const existing = map.get(alloc.userId) ?? [];
      existing.push(alloc);
      map.set(alloc.userId, existing);
    }
    return Array.from(map.entries());
  }, [allocations]);

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
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
          >
            <Users size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Capacity Planning
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage resource allocations and track utilization
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
            Add Allocation
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                User ID
              </label>
              <input
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by user..."
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Project ID
              </label>
              <input
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by project..."
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capacity Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : allocations.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-12 text-center">
            <Users
              size={24}
              className="mx-auto text-[var(--text-secondary)] mb-2"
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No capacity allocations found
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Add allocations to start planning team capacity.
            </p>
          </div>
        ) : (
          <>
            {/* Table View */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Project
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Allocation %
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Period
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {allocations.map((alloc) => (
                      <tr
                        key={alloc.id}
                        className="hover:bg-[var(--surface-1)] transition-colors"
                      >
                        <td className="px-4 py-3 text-[var(--text-primary)]">
                          {alloc.userId.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {alloc.projectId
                            ? alloc.projectId.slice(0, 8) + "..."
                            : "General"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums"
                            style={{
                              backgroundColor:
                                alloc.allocationPct > 80
                                  ? "rgba(239, 68, 68, 0.1)"
                                  : alloc.allocationPct > 50
                                    ? "rgba(245, 158, 11, 0.1)"
                                    : "rgba(16, 185, 129, 0.1)",
                              color:
                                alloc.allocationPct > 80
                                  ? "#EF4444"
                                  : alloc.allocationPct > 50
                                    ? "#F59E0B"
                                    : "#10B981",
                            }}
                          >
                            {alloc.allocationPct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] tabular-nums">
                          {new Date(alloc.periodStart).toLocaleDateString()} -{" "}
                          {new Date(alloc.periodEnd).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Summary Bars */}
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
              User Allocation Summary
            </h2>
            <div className="space-y-4">
              {grouped.map(([userId, userAllocations]) => (
                <AllocationBar
                  key={userId}
                  userId={userId}
                  allocations={userAllocations}
                />
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Showing page {meta.page} of {meta.totalPages} ({meta.totalItems}{" "}
              total)
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

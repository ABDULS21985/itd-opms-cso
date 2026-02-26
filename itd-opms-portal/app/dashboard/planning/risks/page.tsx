"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Plus,
  Filter,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useRisks } from "@/hooks/use-planning";
import type { Risk } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "identified", label: "Identified" },
  { value: "assessed", label: "Assessed" },
  { value: "mitigating", label: "Mitigating" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "technical", label: "Technical" },
  { value: "operational", label: "Operational" },
  { value: "financial", label: "Financial" },
  { value: "security", label: "Security" },
  { value: "compliance", label: "Compliance" },
  { value: "resource", label: "Resource" },
  { value: "schedule", label: "Schedule" },
];

const LIKELIHOOD_LEVELS = ["very_low", "low", "medium", "high", "very_high"];
const IMPACT_LEVELS = ["very_low", "low", "medium", "high", "very_high"];

const LEVEL_INDEX: Record<string, number> = {
  very_low: 0,
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
};

const LEVEL_VALUE: Record<string, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

function getHeatMapColor(score: number): string {
  if (score <= 4) return "#10B981"; // green
  if (score <= 9) return "#F59E0B"; // yellow
  if (score <= 16) return "#F97316"; // orange
  return "#EF4444"; // red
}

function getScoreColor(score: number): { bg: string; text: string } {
  if (score <= 4) return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
  if (score <= 9) return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
  if (score <= 16) return { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" };
  return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
}

/* ------------------------------------------------------------------ */
/*  Heat Map                                                           */
/* ------------------------------------------------------------------ */

function RiskHeatMap({ risks }: { risks: Risk[] }) {
  // Build a 5x5 grid: [likelihood_index][impact_index] = count
  const grid: number[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => 0),
  );

  for (const risk of risks) {
    const li = LEVEL_INDEX[risk.likelihood.toLowerCase()];
    const ii = LEVEL_INDEX[risk.impact.toLowerCase()];
    if (li !== undefined && ii !== undefined) {
      grid[li][ii]++;
    }
  }

  const labelStyle = "text-xs font-medium text-[var(--neutral-gray)] capitalize";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
      <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        Risk Heat Map
      </h2>
      <div className="flex gap-4">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center">
          <span
            className="text-xs font-medium text-[var(--neutral-gray)]"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            Likelihood
          </span>
        </div>

        <div className="flex-1">
          {/* Grid rows — from top (very_high) to bottom (very_low) */}
          <div className="flex flex-col gap-1">
            {[...LIKELIHOOD_LEVELS].reverse().map((likelihood, rowIdx) => {
              const li = 4 - rowIdx; // actual index in grid
              return (
                <div key={likelihood} className="flex items-center gap-1">
                  <span className={`w-16 text-right pr-2 ${labelStyle}`}>
                    {likelihood.replace("_", " ")}
                  </span>
                  {IMPACT_LEVELS.map((impact, colIdx) => {
                    const count = grid[li][colIdx];
                    const score =
                      LEVEL_VALUE[likelihood] * LEVEL_VALUE[impact];
                    const bgColor = getHeatMapColor(score);

                    return (
                      <div
                        key={impact}
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-110 sm:h-14 sm:w-14"
                        style={{
                          backgroundColor: bgColor,
                          opacity: count > 0 ? 1 : 0.25,
                          color: "#fff",
                        }}
                        title={`${likelihood.replace("_", " ")} x ${impact.replace("_", " ")} = ${score} (${count} risk${count !== 1 ? "s" : ""})`}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* X-axis labels */}
            <div className="flex items-center gap-1">
              <span className="w-16" />
              {IMPACT_LEVELS.map((impact) => (
                <span
                  key={impact}
                  className={`w-12 text-center sm:w-14 ${labelStyle}`}
                >
                  {impact.replace("_", " ")}
                </span>
              ))}
            </div>
            <div className="flex justify-center">
              <span className="text-xs font-medium text-[var(--neutral-gray)]">
                Impact
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-3">
        <span className="text-xs text-[var(--neutral-gray)]">Score:</span>
        {[
          { label: "1-4 Low", color: "#10B981" },
          { label: "5-9 Medium", color: "#F59E0B" },
          { label: "10-16 High", color: "#F97316" },
          { label: "20-25 Critical", color: "#EF4444" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {item.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RisksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") ?? undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useRisks(
    page,
    20,
    projectId,
    status || undefined,
    category || undefined,
  );

  const risks = data?.data ?? [];
  const meta = data?.meta;

  /* ---- Columns ---- */

  const columns: Column<Risk>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[200px]",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(239,68,68,0.1)]">
            <ShieldAlert size={16} style={{ color: "#EF4444" }} />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {item.title}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
          {item.category ?? "--"}
        </span>
      ),
    },
    {
      key: "likelihood",
      header: "Likelihood",
      render: (item) => (
        <span className="text-sm capitalize text-[var(--text-secondary)]">
          {item.likelihood.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "impact",
      header: "Impact",
      render: (item) => (
        <span className="text-sm capitalize text-[var(--text-secondary)]">
          {item.impact.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "riskScore",
      header: "Score",
      sortable: true,
      align: "center",
      render: (item) => {
        const color = getScoreColor(item.riskScore);
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.riskScore}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {item.ownerId ? item.ownerId.slice(0, 8) + "..." : "--"}
        </span>
      ),
    },
  ];

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(239,68,68,0.1)]">
            <ShieldAlert size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Risk Register
            </h1>
            <p className="text-sm text-[var(--neutral-gray)]">
              Identify, assess, and manage project risks
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
            onClick={() => router.push("/dashboard/planning/risks/new")}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Risk
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
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
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
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Heat Map */}
      {risks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <RiskHeatMap risks={risks} />
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
          data={risks}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No risks found"
          emptyDescription="Create your first risk entry to begin tracking."
          emptyAction={
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/planning/risks/new")
              }
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              New Risk
            </button>
          }
          onRowClick={(item) =>
            router.push(`/dashboard/planning/risks/${item.id}`)
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
    </div>
  );
}

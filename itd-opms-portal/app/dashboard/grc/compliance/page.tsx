"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Scale,
  Plus,
  Filter,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  useComplianceControls,
  useComplianceStats,
} from "@/hooks/use-grc";
import type { ComplianceControl, ComplianceStats } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FRAMEWORKS = [
  { value: "", label: "All Frameworks" },
  { value: "ISO27001", label: "ISO 27001" },
  { value: "COBIT", label: "COBIT" },
  { value: "CBN_ITSP", label: "CBN IT Standards" },
  { value: "NIST", label: "NIST CSF" },
  { value: "PCIDSS", label: "PCI DSS" },
];

const IMPL_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "implemented", label: "Implemented" },
  { value: "partially_implemented", label: "Partially Implemented" },
  { value: "planned", label: "Planned" },
  { value: "not_applicable", label: "Not Applicable" },
  { value: "not_implemented", label: "Not Implemented" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getComplianceColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 60) return "#F59E0B";
  if (pct >= 40) return "#F97316";
  return "#EF4444";
}

function getImplStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "implemented":
      return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
    case "partially_implemented":
      return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
    case "planned":
      return { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" };
    case "not_applicable":
      return { bg: "var(--surface-2)", text: "var(--text-secondary)" };
    case "not_implemented":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
    default:
      return { bg: "var(--surface-2)", text: "var(--text-secondary)" };
  }
}

/* ------------------------------------------------------------------ */
/*  Framework Stats Card                                               */
/* ------------------------------------------------------------------ */

function FrameworkStatsCard({ stat }: { stat: ComplianceStats }) {
  const pct = stat.total > 0 ? Math.round((stat.compliantCount / stat.total) * 100) : 0;
  const color = getComplianceColor(pct);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {stat.framework}
        </h3>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{stat.compliantCount} compliant</span>
        <span>{stat.total} total</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ComplianceDashboardPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [framework, setFramework] = useState("");
  const [implStatus, setImplStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFrameworkTab, setActiveFrameworkTab] = useState("");

  const { data: statsData, isLoading: statsLoading } = useComplianceStats();
  const { data, isLoading } = useComplianceControls(
    page,
    20,
    activeFrameworkTab || framework || undefined,
    implStatus || undefined,
  );

  const controls = data?.data ?? [];
  const meta = data?.meta;
  const stats = statsData ?? [];

  const columns: Column<ComplianceControl>[] = [
    {
      key: "controlId",
      header: "Control ID",
      sortable: true,
      render: (item) => (
        <span className="text-sm font-mono font-medium text-[var(--primary)]">
          {item.controlId}
        </span>
      ),
    },
    {
      key: "controlName",
      header: "Name",
      sortable: true,
      className: "min-w-[200px]",
      render: (item) => (
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {item.controlName}
        </p>
      ),
    },
    {
      key: "framework",
      header: "Framework",
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
          {item.framework}
        </span>
      ),
    },
    {
      key: "implementationStatus",
      header: "Status",
      sortable: true,
      render: (item) => {
        const color = getImplStatusColor(item.implementationStatus);
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {item.implementationStatus.replace("_", " ")}
          </span>
        );
      },
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
    {
      key: "lastAssessedAt",
      header: "Last Assessed",
      render: (item) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatDate(item.lastAssessedAt)}
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(16,185,129,0.1)]">
            <Scale size={20} style={{ color: "#10B981" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Compliance Dashboard
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Framework mapping, control tracking, and compliance posture
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
            onClick={() =>
              router.push("/dashboard/grc/compliance?action=new")
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Add Control
          </button>
        </div>
      </motion.div>

      {/* Framework Stats */}
      {!statsLoading && stats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {stats.map((stat) => (
            <FrameworkStatsCard key={stat.framework} stat={stat} />
          ))}
        </motion.div>
      )}

      {/* Framework Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto"
      >
        {[{ value: "", label: "All" }, ...FRAMEWORKS.slice(1)].map((fw) => (
          <button
            key={fw.value}
            type="button"
            onClick={() => {
              setActiveFrameworkTab(fw.value);
              setPage(1);
            }}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeFrameworkTab === fw.value
                ? "text-[var(--primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {fw.label}
            {activeFrameworkTab === fw.value && (
              <motion.div
                layoutId="compliance-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
              />
            )}
          </button>
        ))}
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
              Framework
            </label>
            <select
              value={framework}
              onChange={(e) => {
                setFramework(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {FRAMEWORKS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Implementation Status
            </label>
            <select
              value={implStatus}
              onChange={(e) => {
                setImplStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              {IMPL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Controls Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <DataTable
          columns={columns}
          data={controls}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No compliance controls found"
          emptyDescription="Add compliance controls to track your regulatory posture."
          emptyAction={
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/grc/compliance?action=new")
              }
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Add Control
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
    </div>
  );
}

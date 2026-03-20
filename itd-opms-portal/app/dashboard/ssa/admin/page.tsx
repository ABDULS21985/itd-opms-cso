"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Server,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  useSSARequests,
  useSSARequestStats,
} from "@/hooks/use-ssa";
import type { SSARequest, SSARequestStats } from "@/types/ssa";
import {
  SSA_STATUS_LABELS,
  SSA_STATUS_COLORS,
  SSA_STATUSES,
} from "@/types/ssa";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, string> = {
  neutral: "var(--text-secondary)",
  blue: "#3b82f6",
  amber: "#f59e0b",
  green: "#22c55e",
  teal: "#14b8a6",
  red: "#ef4444",
};

function statusBadge(status: string) {
  const label = SSA_STATUS_LABELS[status] || status;
  const color = colorMap[SSA_STATUS_COLORS[status]] || "var(--text-secondary)";
  return (
    <span style={{ color, fontWeight: 500, fontSize: "0.8125rem" }}>
      {label}
    </span>
  );
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: number;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface-0)",
        padding: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        {icon}
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          {label}
        </p>
      </div>
      <p
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: valueColor || "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Breakdown Card                                              */
/* ------------------------------------------------------------------ */

function StatusBreakdown({ stats }: { stats: SSARequestStats }) {
  const items = [
    { label: "Draft", count: stats.draft, color: "var(--text-secondary)" },
    { label: "Submitted", count: stats.submitted, color: "#3b82f6" },
    { label: "In Progress", count: stats.inProgress, color: "#f59e0b" },
    { label: "Approved", count: stats.approved, color: "#22c55e" },
    { label: "Completed", count: stats.completed, color: "#14b8a6" },
    { label: "Rejected", count: stats.rejected, color: "#ef4444" },
    { label: "Cancelled", count: stats.cancelled, color: "var(--text-secondary)" },
  ];

  const total = stats.total || 1;

  return (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid var(--border)",
        backgroundColor: "var(--surface-0)",
        padding: "1.25rem",
      }}
    >
      <h3 style={{ margin: "0 0 1rem", fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
        Status Breakdown
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map((item) => (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>{item.label}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: item.color, fontVariantNumeric: "tabular-nums" }}>
                {item.count}
              </span>
            </div>
            <div
              style={{
                height: "6px",
                borderRadius: "3px",
                backgroundColor: "var(--surface-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(item.count / total) * 100}%`,
                  borderRadius: "3px",
                  backgroundColor: item.color,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SSAAdminPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [division, setDivision] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: listData, isLoading } = useSSARequests(
    page,
    20,
    status || undefined,
    division || undefined,
    debouncedSearch || undefined,
  );
  const { data: stats } = useSSARequestStats();

  const requests: SSARequest[] = listData?.data ?? [];
  const meta = listData?.meta;

  const handleClearFilters = useCallback(() => {
    setStatus("");
    setDivision("");
    setSearchQuery("");
    setPage(1);
  }, []);

  const columns: Column<SSARequest>[] = [
    {
      key: "referenceNo",
      header: "Reference",
      sortable: true,
      render: (item) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.875rem", fontWeight: 500, color: "var(--primary)" }}>
          {item.referenceNo}
        </span>
      ),
    },
    {
      key: "appName",
      header: "Application",
      sortable: true,
      render: (item) => (
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}>
          {item.appName}
        </span>
      ),
    },
    {
      key: "requestorName",
      header: "Requestor",
      render: (item) => (
        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          {item.requestorName}
        </span>
      ),
    },
    {
      key: "divisionOffice",
      header: "Division",
      render: (item) => (
        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          {item.divisionOffice}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => statusBadge(item.status),
    },
    {
      key: "serverType",
      header: "Type",
      render: (item) => (
        <span
          style={{
            display: "inline-flex",
            padding: "2px 8px",
            borderRadius: "9999px",
            backgroundColor: "var(--surface-2)",
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          {item.serverType}
        </span>
      ),
    },
    {
      key: "spaceGb",
      header: "Space (GB)",
      sortable: true,
      render: (item) => (
        <span style={{ fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>
          {item.spaceGb}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      sortable: true,
      render: (item) => (
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
          {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "\u2014"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
      >
        <div
          style={{
            display: "flex",
            height: "2.5rem",
            width: "2.5rem",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(27,115,64,0.1)",
          }}
        >
          <BarChart3 size={20} style={{ color: "#1B7340" }} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            SSA Admin Dashboard
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
            Overview and management of all server/storage allocation requests
          </p>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}
        >
          <div style={{ gridColumn: "1 / 3", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            <StatCard
              icon={<FileText size={14} style={{ color: "var(--text-secondary)" }} />}
              iconColor="var(--text-secondary)"
              label="Total Requests"
              value={stats.total}
            />
            <StatCard
              icon={<Clock size={14} style={{ color: "#f59e0b" }} />}
              iconColor="#f59e0b"
              label="In Progress"
              value={stats.inProgress}
              valueColor="#f59e0b"
            />
            <StatCard
              icon={<CheckCircle2 size={14} style={{ color: "#22c55e" }} />}
              iconColor="#22c55e"
              label="Completed"
              value={stats.completed}
              valueColor="#22c55e"
            />
            <StatCard
              icon={<XCircle size={14} style={{ color: "#ef4444" }} />}
              iconColor="#ef4444"
              label="Rejected"
              value={stats.rejected}
              valueColor="#ef4444"
            />
          </div>
          <StatusBreakdown stats={stats} />
        </motion.div>
      )}

      {/* ── Search & Filter Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-secondary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search all requests..."
            style={{
              width: "100%",
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-0)",
              paddingLeft: "2.25rem",
              paddingRight: "0.75rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={{
            borderRadius: "0.75rem",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-0)",
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            color: "var(--text-primary)",
            outline: "none",
          }}
        >
          <option value="">All Statuses</option>
          {SSA_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SSA_STATUS_LABELS[s] || s}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={division}
          onChange={(e) => {
            setDivision(e.target.value);
            setPage(1);
          }}
          placeholder="Division..."
          style={{
            borderRadius: "0.75rem",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-0)",
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            color: "var(--text-primary)",
            outline: "none",
            width: "140px",
          }}
        />
        {(status || division || searchQuery) && (
          <button
            onClick={handleClearFilters}
            style={{
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "transparent",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── All Requests Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <DataTable
          columns={columns}
          data={requests}
          keyExtractor={(item) => item.id}
          loading={isLoading}
          emptyTitle="No requests found"
          emptyDescription="No server/storage allocation requests match your filters."
          onRowClick={(item) => router.push(`/dashboard/ssa/${item.id}`)}
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

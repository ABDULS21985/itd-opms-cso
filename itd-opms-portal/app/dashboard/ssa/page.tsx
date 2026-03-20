"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Server,
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  useSSARequests,
  useSSARequestStats,
  useSearchSSARequests,
} from "@/hooks/use-ssa";
import type { SSARequest } from "@/types/ssa";
import {
  SSA_STATUS_LABELS,
  SSA_STATUS_COLORS,
  SSA_STATUSES,
} from "@/types/ssa";
import type { PaginatedResponse } from "@/types/core";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: string) {
  const label = SSA_STATUS_LABELS[status] || status;
  const colorMap: Record<string, string> = {
    neutral: "var(--text-secondary)",
    blue: "#3b82f6",
    amber: "#f59e0b",
    green: "#22c55e",
    teal: "#14b8a6",
    red: "#ef4444",
  };
  const color = colorMap[SSA_STATUS_COLORS[status]] || "var(--text-secondary)";
  return (
    <span style={{ color, fontWeight: 500, fontSize: "0.8125rem" }}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SSARequestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [division, setDivision] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* Debounced search value */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* Data sources: search vs regular listing */
  const { data: searchData, isLoading: searchLoading } = useSearchSSARequests(
    debouncedSearch,
    page,
    20,
  );
  const { data: listData, isLoading: listLoading } = useSSARequests(
    page,
    20,
    status || undefined,
    division || undefined,
  );

  const isSearching = debouncedSearch.length > 0;
  const data = isSearching ? searchData : listData;
  const isLoading = isSearching ? searchLoading : listLoading;

  const { data: stats } = useSSARequestStats();

  const requests: SSARequest[] = data?.data ?? [];
  const meta = data?.meta;

  /* Clear filters */
  const handleClearFilters = useCallback(() => {
    setStatus("");
    setDivision("");
    setPage(1);
  }, []);

  /* ---- Columns ---- */

  const columns: Column<SSARequest>[] = [
    {
      key: "referenceNo",
      header: "Reference No",
      sortable: true,
      className: "min-w-[140px]",
      render: (item) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--primary)",
          }}
        >
          {item.referenceNo}
        </span>
      ),
    },
    {
      key: "appName",
      header: "Application",
      sortable: true,
      className: "min-w-[180px]",
      render: (item) => (
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {item.appName}
        </span>
      ),
    },
    {
      key: "divisionOffice",
      header: "Division",
      sortable: true,
      render: (item) => (
        <span
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
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
      header: "Server Type",
      render: (item) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "9999px",
            backgroundColor: "var(--surface-2)",
            padding: "2px 10px",
            fontSize: "0.75rem",
            fontWeight: 500,
            textTransform: "capitalize",
            color: "var(--text-secondary)",
          }}
        >
          {item.serverType}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      sortable: true,
      render: (item) => (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {item.submittedAt
            ? new Date(item.submittedAt).toLocaleDateString()
            : "\u2014"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/ssa/${item.id}`);
          }}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ──────────────── Stats Bar ──────────────── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          {/* Total Requests */}
          <div
            style={{
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-0)",
              padding: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <FileText size={14} style={{ color: "var(--text-secondary)" }} />
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
                Total Requests
              </p>
            </div>
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
                margin: 0,
              }}
            >
              {stats.total}
            </p>
          </div>

          {/* In Progress */}
          <div
            style={{
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-0)",
              padding: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <Clock size={14} style={{ color: "#f59e0b" }} />
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
                In Progress
              </p>
            </div>
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#f59e0b",
                fontVariantNumeric: "tabular-nums",
                margin: 0,
              }}
            >
              {stats.inProgress}
            </p>
          </div>

          {/* Completed */}
          <div
            style={{
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-0)",
              padding: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
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
                Completed
              </p>
            </div>
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#22c55e",
                fontVariantNumeric: "tabular-nums",
                margin: 0,
              }}
            >
              {stats.completed}
            </p>
          </div>

          {/* Rejected */}
          <div
            style={{
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-0)",
              padding: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <XCircle size={14} style={{ color: "#ef4444" }} />
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
                Rejected
              </p>
            </div>
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#ef4444",
                fontVariantNumeric: "tabular-nums",
                margin: 0,
              }}
            >
              {stats.rejected}
            </p>
          </div>
        </motion.div>
      )}

      {/* ──────────────── Header ──────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
            <Server size={20} style={{ color: "#1B7340" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Server/Storage Allocation
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Manage server and storage allocation requests
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
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
              placeholder="Search requests..."
              style={{
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
              }}
            />
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.75rem",
              border: "1px solid var(--border)",
              backgroundColor: "transparent",
              padding: "0.5rem 0.875rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <Filter size={16} />
            Filters
          </button>

          {/* New Request */}
          <button
            type="button"
            onClick={() => router.push("/dashboard/ssa/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.75rem",
              border: "none",
              backgroundColor: "var(--primary)",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            New Request
          </button>
        </div>
      </motion.div>

      {/* ──────────────── Filters ──────────────── */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-0)",
            padding: "1rem",
          }}
        >
          {/* Status filter */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Status
            </label>
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
          </div>

          {/* Division filter */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Division
            </label>
            <input
              type="text"
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by division..."
              style={{
                borderRadius: "0.75rem",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-0)",
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          {/* Clear filters */}
          <button
            type="button"
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
            Clear Filters
          </button>
        </motion.div>
      )}

      {/* ──────────────── Data Table ──────────────── */}
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
          emptyDescription="Create your first server/storage allocation request to get started."
          emptyAction={
            <button
              type="button"
              onClick={() => router.push("/dashboard/ssa/new")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                borderRadius: "0.75rem",
                border: "none",
                backgroundColor: "var(--primary)",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              New Request
            </button>
          }
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

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target,
  Plus,
  ArrowLeft,
  List,
  GitBranch,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useOKRs, useOKRTree } from "@/hooks/use-governance";
import type { OKR } from "@/types";

/* ------------------------------------------------------------------ */
/*  Progress Bar Component                                              */
/* ------------------------------------------------------------------ */

function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 70 ? "var(--success)" : pct >= 40 ? "#F59E0B" : "var(--error)";

  return (
    <div
      className={`h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Level Badge                                                         */
/* ------------------------------------------------------------------ */

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    department: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
    division: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
    office: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
    unit: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  };
  const c = colors[level] || colors.unit;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {level}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tree Node Component                                                 */
/* ------------------------------------------------------------------ */

function OKRTreeNode({
  okr,
  depth = 0,
  onSelect,
}: {
  okr: OKR;
  depth?: number;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = okr.children && okr.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--surface-1)] cursor-pointer group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => onSelect(okr.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
          >
            {expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <LevelBadge level={okr.level} />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {okr.objective}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-24">
              <ProgressBar value={okr.progressPct} />
            </div>
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {okr.progressPct}%
            </span>
            <StatusBadge status={okr.status} />
          </div>
        </div>
      </div>
      {hasChildren && expanded && (
        <div>
          {okr.children!.map((child) => (
            <OKRTreeNode
              key={child.id}
              okr={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View Toggle                                                         */
/* ------------------------------------------------------------------ */

type ViewMode = "list" | "tree";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OKRListPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);

  /* Filters */
  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
  const [periodFilter, setPeriodFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  /* Data hooks */
  const { data: okrsData, isLoading: listLoading } = useOKRs(
    page,
    20,
    levelFilter,
    periodFilter,
    statusFilter,
  );
  const { data: _treeData, isLoading: _treeLoading } = useOKRTree(undefined);

  const okrs = okrsData?.data ?? [];
  const meta = okrsData?.meta;

  /* Note: useOKRTree(undefined) won't fire because enabled: !!id is false.
     We need all root OKRs. We'll use the list view data for tree as well,
     since the tree endpoint returns a single OKR. For the tree view,
     we'll use list data with children if available. */
  const treeRoots = okrs.filter((o) => !o.parentId);

  /* ------------------------------------------------------------------ */
  /*  List columns                                                       */
  /* ------------------------------------------------------------------ */

  const columns: Column<OKR>[] = [
    {
      key: "objective",
      header: "Objective",
      sortable: true,
      render: (item) => (
        <span className="font-medium text-[var(--text-primary)]">
          {item.objective}
        </span>
      ),
      className: "min-w-[250px]",
    },
    {
      key: "level",
      header: "Level",
      render: (item) => <LevelBadge level={item.level} />,
    },
    {
      key: "period",
      header: "Period",
      sortable: true,
      render: (item) => (
        <span className="text-[var(--text-secondary)]">{item.period}</span>
      ),
    },
    {
      key: "ownerId",
      header: "Owner",
      render: (item) => (
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {item.ownerId.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "progressPct",
      header: "Progress",
      render: (item) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <ProgressBar value={item.progressPct} className="flex-1" />
          <span className="text-xs tabular-nums text-[var(--text-secondary)] w-8 text-right">
            {item.progressPct}%
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/governance"
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Objectives & Key Results
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Set and track objectives across department, division, office, and
              unit levels.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/governance/okrs/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Plus size={16} />
          New OKR
        </Link>
      </motion.div>

      {/* Controls: View toggle + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* View toggle */}
        <div
          className="flex items-center gap-1 rounded-xl border p-1"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              viewMode === "list"
                ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <List size={14} />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              viewMode === "tree"
                ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <GitBranch size={14} />
            Tree
          </button>
        </div>

        {/* Filters */}
        <select
          value={levelFilter || ""}
          onChange={(e) => {
            setLevelFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <option value="">All Levels</option>
          <option value="department">Department</option>
          <option value="division">Division</option>
          <option value="office">Office</option>
          <option value="unit">Unit</option>
        </select>

        <input
          type="text"
          value={periodFilter || ""}
          onChange={(e) => {
            setPeriodFilter(e.target.value || undefined);
            setPage(1);
          }}
          placeholder="Filter by period..."
          className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        />

        <select
          value={statusFilter || ""}
          onChange={(e) => {
            setStatusFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="rounded-xl border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          style={{
            backgroundColor: "var(--surface-0)",
            borderColor: "var(--border)",
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {viewMode === "list" ? (
          <DataTable
            columns={columns}
            data={okrs}
            keyExtractor={(item) => item.id}
            loading={listLoading}
            emptyTitle="No OKRs found"
            emptyDescription="Create your first OKR to start tracking objectives."
            emptyAction={
              <Link
                href="/dashboard/governance/okrs/new"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Plus size={16} />
                New OKR
              </Link>
            }
            onRowClick={(item) =>
              router.push(`/dashboard/governance/okrs/${item.id}`)
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
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "var(--surface-0)",
              borderColor: "var(--border)",
            }}
          >
            {listLoading ? (
              <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
                Loading OKR tree...
              </div>
            ) : treeRoots.length === 0 ? (
              <div className="p-8 text-center">
                <Target
                  size={32}
                  className="mx-auto mb-2 text-[var(--text-secondary)] opacity-40"
                />
                <p className="text-sm text-[var(--text-secondary)]">
                  No OKRs found. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {treeRoots.map((okr) => (
                  <OKRTreeNode
                    key={okr.id}
                    okr={okr}
                    onSelect={(id) =>
                      router.push(`/dashboard/governance/okrs/${id}`)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

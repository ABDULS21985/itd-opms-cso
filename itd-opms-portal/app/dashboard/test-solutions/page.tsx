"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  RotateCcw,
  Search,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTestSolutionRuns, useTestSolutionStats } from "@/hooks/use-test-solution";
import { TEST_SOLUTION_STATUSES, TEST_TYPES } from "@/types/test-solution";
import type { TestSolutionRun } from "@/types/test-solution";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function testTypeLabel(value: string) {
  return TEST_TYPES.find((item) => item.value === value)?.label ?? value.replace(/_/g, " ");
}

function MetricTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value?: number | string;
  tone: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{value ?? 0}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}1A` }}>
          <Icon size={19} style={{ color: tone }} />
        </div>
      </div>
    </div>
  );
}

export default function TestSolutionsPage() {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: stats } = useTestSolutionStats();
  const { data: runsData, isLoading } = useTestSolutionRuns({
    status: status || undefined,
    page,
    pageSize,
  });

  const runs = runsData?.data ?? [];
  const totalPages = runsData?.meta?.totalPages ?? 1;
  const filteredRuns = query.trim()
    ? runs.filter((run) =>
        `${run.runNumber} ${run.title} ${run.releaseNumber ?? ""} ${run.changeTicketNumber ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : runs;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <FlaskConical size={24} className="text-emerald-400" />
            Test Solution Management
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Manage BRD 6.6/6.7 solution testing, sign-offs, rework, and release handoff.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Total runs" value={stats?.total} tone="#16A34A" icon={FlaskConical} />
        <MetricTile label="Authorized" value={stats?.byStatus?.authorized ?? 0} tone="#2563EB" icon={ClipboardCheck} />
        <MetricTile label="Pending sign-offs" value={stats?.pendingSignoffs ?? 0} tone="#D97706" icon={CheckCircle2} />
        <MetricTile label="Build rework" value={stats?.byStatus?.build_rework ?? 0} tone="#DC2626" icon={RotateCcw} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search run, release, or change..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {TEST_SOLUTION_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="mr-2 animate-spin" size={20} />
          Loading test solution runs...
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] py-16 text-center text-white/40">
          <FlaskConical size={42} className="mx-auto mb-3 opacity-30" />
          <p>No test solution runs found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                <th className="p-4 text-left">Run</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Required tests</th>
                <th className="p-4 text-left">Outcome</th>
                <th className="p-4 text-left">Linked work</th>
                <th className="p-4 text-left">Updated</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run: TestSolutionRun) => (
                <motion.tr
                  key={run.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <td className="p-4">
                    <p className="font-mono text-xs text-white/45">{run.runNumber}</p>
                    <p className="mt-1 max-w-[320px] truncate font-medium text-white">{run.title}</p>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="p-4">
                    <div className="flex max-w-[360px] flex-wrap gap-1.5">
                      {(run.requiredTestTypes ?? []).slice(0, 4).map((testType) => (
                        <span key={testType} className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/60">
                          {testTypeLabel(testType)}
                        </span>
                      ))}
                      {(run.requiredTestTypes ?? []).length > 4 ? (
                        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/40">
                          +{run.requiredTestTypes.length - 4}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4 text-white/60 capitalize">{run.overallOutcome?.replace(/_/g, " ")}</td>
                  <td className="p-4 text-white/50">
                    {run.releaseNumber ?? run.changeTicketNumber ?? run.sourceType}
                  </td>
                  <td className="p-4 text-white/50">{formatDate(run.updatedAt)}</td>
                  <td className="p-4 text-right">
                    <Link href={`/dashboard/test-solutions/${run.id}`} className="inline-flex text-white/40 hover:text-white">
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 text-sm text-white/50">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded border border-white/10 px-3 py-1.5 disabled:opacity-30"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded border border-white/10 px-3 py-1.5 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

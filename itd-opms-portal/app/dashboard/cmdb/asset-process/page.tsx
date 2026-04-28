"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardCheck,
  HardDrive,
  Loader2,
  Package,
  Search,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAssetProcessRuns, useAssetProcessStats } from "@/hooks/use-cmdb";
import {
  ASSET_PROCESS_STATUSES,
  ASSET_PROCESS_TYPES,
  type AssetProcessRun,
} from "@/types";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function processTypeLabel(value: string) {
  return (
    ASSET_PROCESS_TYPES.find((item) => item.value === value)?.label ??
    value.replace(/_/g, " ")
  );
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
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${tone}1A` }}
        >
          <Icon size={19} style={{ color: tone }} />
        </div>
      </div>
    </div>
  );
}

export default function AssetProcessPage() {
  const [status, setStatus] = useState("");
  const [processType, setProcessType] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: stats } = useAssetProcessStats();
  const { data: runsData, isLoading } = useAssetProcessRuns({
    status: status || undefined,
    processType: processType || undefined,
    page,
    pageSize,
  });

  const runs = runsData?.data ?? [];
  const totalPages = runsData?.meta?.totalPages ?? 1;
  const filteredRuns = query.trim()
    ? runs.filter((run) =>
        `${run.processNumber} ${run.title} ${run.assetTag ?? ""} ${run.assignedAssetTag ?? ""} ${run.requestedForName ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : runs;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Package size={24} className="text-emerald-400" />
            IT Asset Management Process
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Manage BRD 6.8 asset deployment, redeployment, maintenance, retirement, and
            disposal evidence.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Open processes" value={stats?.open} tone="#16A34A" icon={Package} />
        <MetricTile label="Deployment" value={stats?.deployment} tone="#2563EB" icon={HardDrive} />
        <MetricTile label="Maintenance" value={stats?.maintenance} tone="#D97706" icon={Wrench} />
        <MetricTile label="Waiting list" value={stats?.waitingList} tone="#7C3AED" icon={ShoppingCart} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search process, asset, or requester..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <select
          value={processType}
          onChange={(event) => {
            setProcessType(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="">All process types</option>
          {ASSET_PROCESS_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {ASSET_PROCESS_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="mr-2 animate-spin" size={20} />
          Loading asset processes...
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] py-16 text-center text-white/40">
          <Package size={42} className="mx-auto mb-3 opacity-30" />
          <p>No asset process runs found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                <th className="p-4 text-left">Process</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-left">Requester</th>
                <th className="p-4 text-left">Asset</th>
                <th className="p-4 text-left">Flags</th>
                <th className="p-4 text-left">Updated</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run: AssetProcessRun) => (
                <motion.tr
                  key={run.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <td className="p-4">
                    <p className="font-mono text-xs text-white/45">{run.processNumber}</p>
                    <p className="mt-1 max-w-[320px] truncate font-medium text-white">{run.title}</p>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="p-4 text-white/60 capitalize">{processTypeLabel(run.processType)}</td>
                  <td className="p-4 text-white/50">{run.requestedForName ?? run.requestedForId ?? "-"}</td>
                  <td className="p-4 text-white/50">
                    {run.assignedAssetTag ?? run.assetTag ?? run.assetName ?? "-"}
                  </td>
                  <td className="p-4">
                    <div className="flex max-w-[260px] flex-wrap gap-1.5">
                      {run.approvalRequired ? <Flag label="Approval" /> : null}
                      {run.deliverySigned ? <Flag label="Delivery signed" /> : null}
                      {run.returnSigned ? <Flag label="Return signed" /> : null}
                      {run.dataWipeConfirmed ? <Flag label="Data wipe" /> : null}
                      {!run.approvalRequired &&
                      !run.deliverySigned &&
                      !run.returnSigned &&
                      !run.dataWipeConfirmed ? (
                        <span className="text-xs text-white/35">No controls completed</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4 text-white/50">{formatDate(run.updatedAt)}</td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/dashboard/cmdb/asset-process/${run.id}`}
                      className="inline-flex text-white/40 hover:text-white"
                    >
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

function Flag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/60">
      <ClipboardCheck size={12} />
      {label}
    </span>
  );
}

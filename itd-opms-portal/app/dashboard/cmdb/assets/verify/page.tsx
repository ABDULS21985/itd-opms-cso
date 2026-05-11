"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { useAssets, useVerifyAsset } from "@/hooks/use-cmdb";
import { useSearchUsers } from "@/hooks/use-system";
import type { Asset } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CONDITIONS = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
  { value: "missing", label: "Missing" },
];

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  good: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  fair: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  poor: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  damaged: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  missing: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  maintenance: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  retired: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  disposed: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  procured: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  received: { bg: "rgba(20, 184, 166, 0.1)", text: "#14B8A6" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BulkVerificationPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnverified, setFilterUnverified] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [condition, setCondition] = useState("good");
  const [locationConfirmed, setLocationConfirmed] = useState(true);
  const [notes, setNotes] = useState("");

  const { data: assetsData, isLoading } = useAssets(1, 20, undefined, "active");
  const verifyAsset = useVerifyAsset();

  /* ---- User resolution ---- */
  const { data: allUsers } = useSearchUsers("");
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    (allUsers ?? []).forEach((u) => map.set(u.id, u.displayName));
    return map;
  }, [allUsers]);

  const assets = useMemo(() => {
    const list = (assetsData as { data?: Asset[] })?.data ?? (assetsData as Asset[] | undefined) ?? [];
    let filtered = list;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          (a.serialNumber?.toLowerCase().includes(q)),
      );
    }
    if (filterUnverified) {
      filtered = filtered.filter((a) => !a.lastVerifiedAt);
    }
    return filtered;
  }, [assetsData, searchQuery, filterUnverified]);

  /* ---- Stats ---- */
  const allAssets = (assetsData as { data?: Asset[] })?.data ?? (assetsData as Asset[] | undefined) ?? [];
  const totalCount = allAssets.length;
  const verifiedCount = allAssets.filter((a) => a.lastVerifiedAt).length;
  const unverifiedCount = totalCount - verifiedCount;
  const staleCount = allAssets.filter((a) => {
    if (!a.lastVerifiedAt) return false;
    const days = Math.floor(
      (Date.now() - new Date(a.lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    return days > 90;
  }).length;

  const handleVerify = useCallback(
    (assetId: string) => {
      verifyAsset.mutate(
        {
          assetId,
          condition,
          locationConfirmed,
          notes: notes || undefined,
        },
        {
          onSuccess: () => {
            setVerifyingId(null);
            setNotes("");
          },
        },
      );
    },
    [verifyAsset, condition, locationConfirmed, notes],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/cmdb/assets")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Assets
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <ClipboardCheck size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Bulk Asset Verification
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Verify the physical presence and condition of active assets
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.1)]">
              <CheckCircle size={16} className="text-[#10B981]" />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Verified</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-[#10B981]">{verifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.1)]">
              <AlertTriangle size={16} className="text-[#F59E0B]" />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Unverified</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-[#F59E0B]">{unverifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(239,68,68,0.1)]">
              <AlertTriangle size={16} className="text-[#EF4444]" />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Stale (&gt;90 days)</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-[#EF4444]">{staleCount}</p>
        </div>
      </motion.div>

      {/* Search & Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, tag, or serial number..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterUnverified(!filterUnverified)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
            filterUnverified
              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
          }`}
        >
          <Filter size={14} />
          {filterUnverified ? "Showing Unverified Only" : "Show Unverified Only"}
        </button>
      </motion.div>

      {/* Asset list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ClipboardCheck size={32} className="text-[var(--text-secondary)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              {filterUnverified
                ? "All active assets have been verified!"
                : "No active assets found."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {assets.map((asset) => {
              const isExpanded = verifyingId === asset.id;
              const statusColor = STATUS_COLORS[asset.status] ?? {
                bg: "var(--surface-2)",
                text: "var(--text-secondary)",
              };
              const daysSinceVerified = asset.lastVerifiedAt
                ? Math.floor(
                    (Date.now() - new Date(asset.lastVerifiedAt).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : null;

              return (
                <div key={asset.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-1)]">
                        <ClipboardCheck
                          size={18}
                          className={
                            asset.lastVerifiedAt
                              ? "text-[#10B981]"
                              : "text-[var(--text-secondary)]"
                          }
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {asset.name}
                          </p>
                          <span className="text-xs font-mono text-[var(--text-secondary)]">
                            {asset.assetTag}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                            }}
                          >
                            {asset.status}
                          </span>
                          {asset.lastVerifiedAt ? (
                            <span className="text-xs text-[var(--text-secondary)]">
                              Verified {daysSinceVerified === 0 ? "today" : `${daysSinceVerified}d ago`}
                            </span>
                          ) : (
                            <span className="text-xs text-[#F59E0B] font-medium">
                              Never verified
                            </span>
                          )}
                          {asset.location && (
                            <span className="text-xs text-[var(--text-secondary)]">
                              {asset.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setVerifyingId(isExpanded ? null : asset.id)
                      }
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                        isExpanded
                          ? "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                          : "bg-[var(--primary)] text-white hover:opacity-90"
                      }`}
                    >
                      <CheckCircle size={14} />
                      {isExpanded ? "Cancel" : "Verify"}
                    </button>
                  </div>

                  {/* Inline verify form */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                            Condition
                          </label>
                          <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
                          >
                            {CONDITIONS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                            <input
                              type="checkbox"
                              checked={locationConfirmed}
                              onChange={(e) =>
                                setLocationConfirmed(e.target.checked)
                              }
                              className="rounded border-[var(--border)]"
                            />
                            Location confirmed
                          </label>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes..."
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          type="button"
                          onClick={() => handleVerify(asset.id)}
                          disabled={verifyAsset.isPending}
                          className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {verifyAsset.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          {verifyAsset.isPending
                            ? "Verifying..."
                            : "Submit Verification"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

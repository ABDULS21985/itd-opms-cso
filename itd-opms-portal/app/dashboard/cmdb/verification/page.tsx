"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Filter,
  X,
  AlertTriangle,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  useVerificationCampaigns,
  useCreateCampaign,
  useVerificationStats,
} from "@/hooks/use-verification";
import type { VerificationCampaign, VerificationStats } from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  planned: { icon: Clock, color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  in_progress: { icon: Play, color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
  completed: { icon: CheckCircle2, color: "#22C55E", bg: "rgba(34, 197, 94, 0.1)" },
  cancelled: { icon: XCircle, color: "#6B7280", bg: "rgba(107, 114, 128, 0.1)" },
};

/* ------------------------------------------------------------------ */
/*  Status Badge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      <Icon size={12} />
      {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Cards                                                         */
/* ------------------------------------------------------------------ */

function StatsCards({ stats }: { stats: VerificationStats }) {
  const items = [
    { label: "Total Assets", value: stats.total, color: "#8B5CF6" },
    { label: "Verified", value: stats.verified, color: "#22C55E" },
    { label: "Unverified", value: stats.unverified, color: "#F59E0B" },
    { label: "Discrepancy", value: stats.discrepancy, color: "#EF4444" },
    { label: "Overdue (90d)", value: stats.overdue, color: "#F97316" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
          className="rounded-xl border p-4"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">{item.label}</p>
          <p className="text-xl font-bold" style={{ color: item.color }}>
            {item.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Campaign Dialog                                              */
/* ------------------------------------------------------------------ */

function CreateCampaignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  const createCampaign = useCreateCampaign();

  const ASSET_TYPES = ["hardware", "software", "virtual", "cloud", "network", "peripheral"];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const scopeFilter: Record<string, unknown> = {};
    if (assetTypes.length > 0) scopeFilter.asset_types = assetTypes;

    createCampaign.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        scopeFilter: Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setAssetTypes([]);
          onClose();
        },
      },
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--surface-0)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Verification Campaign</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface-2)]">
            <X size={14} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 2026 Floor 3 Stocktake"
              className="w-full text-sm rounded-lg border px-3 py-2 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full text-sm rounded-lg border px-3 py-2 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Asset Type Filter</label>
            <div className="flex flex-wrap gap-1.5">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setAssetTypes((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                    )
                  }
                  className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                  style={{
                    borderColor: assetTypes.includes(t) ? "var(--primary)" : "var(--border)",
                    backgroundColor: assetTypes.includes(t) ? "rgba(59,130,246,0.1)" : "transparent",
                    color: assetTypes.includes(t) ? "var(--primary)" : "var(--text-secondary)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Leave empty to include all types.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium px-4 py-2 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCampaign.isPending || !name.trim()}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)", color: "#fff" }}
            >
              {createCampaign.isPending && <Loader2 size={14} className="animate-spin" />}
              Create Campaign
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Campaign Card                                                       */
/* ------------------------------------------------------------------ */

function CampaignCard({ campaign, index }: { campaign: VerificationCampaign; index: number }) {
  const router = useRouter();
  const progress =
    campaign.targetAssetCount > 0
      ? Math.round((campaign.verifiedCount / campaign.targetAssetCount) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 + index * 0.04 }}
      onClick={() => router.push(`/dashboard/cmdb/verification/${campaign.id}`)}
      className="rounded-xl border p-5 cursor-pointer hover:shadow-md transition-shadow"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {campaign.name}
            </h3>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.description && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-2">{campaign.description}</p>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? "#22C55E" : "#3B82F6",
                }}
              />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
              {campaign.verifiedCount}/{campaign.targetAssetCount}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
            {campaign.discrepancyCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle size={11} />
                {campaign.discrepancyCount} discrepancies
              </span>
            )}
            <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <ChevronRight size={16} className="text-[var(--text-secondary)] mt-1 shrink-0" />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VerificationPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: statsData } = useVerificationStats();
  const { data: campaignsData, isLoading } = useVerificationCampaigns(
    page, 20, statusFilter || undefined,
  );

  const campaigns = useMemo<VerificationCampaign[]>(() => {
    if (!campaignsData) return [];
    if ("data" in campaignsData && Array.isArray((campaignsData as { data: unknown }).data)) {
      return (campaignsData as { data: VerificationCampaign[] }).data;
    }
    if (Array.isArray(campaignsData)) return campaignsData as VerificationCampaign[];
    return [];
  }, [campaignsData]);

  const totalPages = useMemo(() => {
    if (!campaignsData) return 1;
    if ("meta" in campaignsData) {
      return (campaignsData as { meta?: { totalPages?: number } }).meta?.totalPages ?? 1;
    }
    return 1;
  }, [campaignsData]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
            <ClipboardCheck size={20} style={{ color: "#22C55E" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Physical Verification</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Run stocktake campaigns to verify assets exist at their recorded locations.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {statsData && <StatsCards stats={statsData} />}

      {/* Actions + Filter */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
          style={{ backgroundColor: "var(--primary)", color: "#fff" }}
        >
          <Plus size={16} />
          Start Campaign
        </button>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-secondary)]" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm rounded-lg border px-3 py-1.5 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-[var(--surface-2)] animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 rounded-xl border"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <BarChart3 size={48} className="text-[var(--text-secondary)] mb-4 opacity-40" />
          <p className="text-[var(--text-secondary)] text-sm mb-1">No verification campaigns found.</p>
          <p className="text-[var(--text-secondary)] text-xs">Create a new campaign to start verifying assets.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c, i) => <CampaignCard key={c.id} campaign={c} index={i} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-secondary)] tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Dialog */}
      <AnimatePresence>
        {showCreate && <CreateCampaignDialog open={showCreate} onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

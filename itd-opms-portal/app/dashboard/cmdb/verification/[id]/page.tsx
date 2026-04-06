"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Loader2,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  useVerificationCampaign,
  useCampaignAssets,
  useStartCampaign,
  useCompleteCampaign,
  useVerifyCampaignAsset,
} from "@/hooks/use-verification";
import type { CampaignAsset } from "@/types";

/* ------------------------------------------------------------------ */
/*  Condition options                                                    */
/* ------------------------------------------------------------------ */

const CONDITIONS = [
  { value: "good", label: "Good", color: "#22C55E" },
  { value: "fair", label: "Fair", color: "#F59E0B" },
  { value: "poor", label: "Poor", color: "#F97316" },
  { value: "damaged", label: "Damaged", color: "#EF4444" },
  { value: "missing", label: "Missing", color: "#DC2626" },
  { value: "not_found", label: "Not Found", color: "#991B1B" },
];

const DISCREPANCY_TYPES = [
  { value: "none", label: "None" },
  { value: "location_mismatch", label: "Location Mismatch" },
  { value: "condition_issue", label: "Condition Issue" },
  { value: "missing", label: "Missing" },
  { value: "attribute_mismatch", label: "Attribute Mismatch" },
];

/* ------------------------------------------------------------------ */
/*  Verify Asset Form (inline, mobile-friendly)                         */
/* ------------------------------------------------------------------ */

function VerifyForm({
  asset,
  campaignId,
  onDone,
}: {
  asset: CampaignAsset;
  campaignId: string;
  onDone: () => void;
}) {
  const [condition, setCondition] = useState("good");
  const [locationConfirmed, setLocationConfirmed] = useState(true);
  const [actualLocation, setActualLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [discrepancy, setDiscrepancy] = useState("none");
  const verify = useVerifyCampaignAsset(campaignId);

  function handleSubmit() {
    verify.mutate(
      {
        assetId: asset.id,
        condition,
        locationConfirmed,
        actualLocation: actualLocation.trim() || undefined,
        notes: notes.trim() || undefined,
        discrepancyType: discrepancy !== "none" ? discrepancy : undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div
        className="p-4 mt-2 rounded-lg border space-y-3"
        style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        {/* Condition */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Condition</label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                style={{
                  borderColor: condition === c.value ? c.color : "var(--border)",
                  backgroundColor: condition === c.value ? `${c.color}15` : "transparent",
                  color: condition === c.value ? c.color : "var(--text-secondary)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location confirmed */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`loc-${asset.id}`}
            checked={locationConfirmed}
            onChange={(e) => setLocationConfirmed(e.target.checked)}
            className="rounded"
          />
          <label htmlFor={`loc-${asset.id}`} className="text-xs text-[var(--text-primary)]">
            Location confirmed at recorded position
          </label>
        </div>

        {/* Actual location (if mismatch) */}
        {!locationConfirmed && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Actual Location</label>
            <input
              type="text"
              value={actualLocation}
              onChange={(e) => setActualLocation(e.target.value)}
              placeholder="Where is the asset actually?"
              className="w-full text-sm rounded-lg border px-3 py-2 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
        )}

        {/* Discrepancy type */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Discrepancy</label>
          <select
            value={discrepancy}
            onChange={(e) => setDiscrepancy(e.target.value)}
            className="w-full text-sm rounded-lg border px-3 py-2 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          >
            {DISCREPANCY_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            className="w-full text-sm rounded-lg border px-3 py-2 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onDone}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={verify.isPending}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "#fff" }}
          >
            {verify.isPending && <Loader2 size={12} className="animate-spin" />}
            Confirm Verification
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Asset Row                                                           */
/* ------------------------------------------------------------------ */

function AssetRow({ asset, campaignId }: { asset: CampaignAsset; campaignId: string }) {
  const [showForm, setShowForm] = useState(false);
  const isVerified = asset.verificationStatus === "verified";
  const isDiscrepancy = asset.verificationStatus === "discrepancy";

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: isVerified
              ? "rgba(34,197,94,0.1)"
              : isDiscrepancy
                ? "rgba(239,68,68,0.1)"
                : "rgba(245,158,11,0.1)",
          }}
        >
          {isVerified ? (
            <CheckCircle2 size={16} style={{ color: "#22C55E" }} />
          ) : isDiscrepancy ? (
            <AlertTriangle size={16} style={{ color: "#EF4444" }} />
          ) : (
            <ClipboardCheck size={16} style={{ color: "#F59E0B" }} />
          )}
        </div>

        {/* Asset info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{asset.name}</span>
            <span className="text-xs text-[var(--text-secondary)] font-mono">{asset.assetTag}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-0.5">
            <span className="capitalize">{asset.type}</span>
            {(asset.building || asset.location) && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {[asset.building, asset.floor, asset.room].filter(Boolean).join(" / ") || asset.location}
              </span>
            )}
          </div>
        </div>

        {/* Verify button */}
        {!isVerified && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
            style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}
          >
            <ClipboardCheck size={13} />
            Verify
          </button>
        )}

        {isVerified && (
          <span className="text-xs text-green-500 font-medium shrink-0">Verified</span>
        )}
      </div>

      {showForm && (
        <VerifyForm asset={asset} campaignId={campaignId} onDone={() => setShowForm(false)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pendingOnly, setPendingOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [assetPage, setAssetPage] = useState(1);

  const { data: campaign, isLoading: loadingCampaign } = useVerificationCampaign(id);
  const { data: assetsData, isLoading: loadingAssets } = useCampaignAssets(id, assetPage, 50, pendingOnly);
  const startCampaign = useStartCampaign(id);
  const completeCampaign = useCompleteCampaign(id);

  const assets = useMemo<CampaignAsset[]>(() => {
    if (!assetsData) return [];
    if ("data" in assetsData && Array.isArray((assetsData as { data: unknown }).data)) {
      return (assetsData as { data: CampaignAsset[] }).data;
    }
    if (Array.isArray(assetsData)) return assetsData as CampaignAsset[];
    return [];
  }, [assetsData]);

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.toLowerCase();
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
  }, [assets, search]);

  const totalAssetPages = useMemo(() => {
    if (!assetsData || !("meta" in assetsData)) return 1;
    return (assetsData as { meta?: { totalPages?: number } }).meta?.totalPages ?? 1;
  }, [assetsData]);

  if (loadingCampaign) {
    return (
      <div className="space-y-4 pb-8">
        <div className="h-8 w-48 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="h-32 rounded-xl bg-[var(--surface-2)] animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20 text-[var(--text-secondary)]">Campaign not found.</div>
    );
  }

  const progress =
    campaign.targetAssetCount > 0
      ? Math.round((campaign.verifiedCount / campaign.targetAssetCount) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => router.push("/dashboard/cmdb/verification")}
          className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-3"
        >
          <ArrowLeft size={14} />
          Back to Campaigns
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{campaign.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {campaign.status === "planned" && (
              <button
                onClick={() => startCampaign.mutate()}
                disabled={startCampaign.isPending}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
                style={{ backgroundColor: "var(--primary)", color: "#fff" }}
              >
                {startCampaign.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Start Campaign
              </button>
            )}
            {campaign.status === "in_progress" && (
              <button
                onClick={() => completeCampaign.mutate()}
                disabled={completeCampaign.isPending}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl"
                style={{ backgroundColor: "#22C55E", color: "#fff" }}
              >
                {completeCampaign.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Complete Campaign
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Target Assets</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{campaign.targetAssetCount}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Verified</p>
            <p className="text-lg font-bold text-green-500">{campaign.verifiedCount}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Remaining</p>
            <p className="text-lg font-bold text-amber-500">
              {campaign.targetAssetCount - campaign.verifiedCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Discrepancies</p>
            <p className="text-lg font-bold text-red-500">{campaign.discrepancyCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: progress === 100 ? "#22C55E" : "#3B82F6",
              }}
            />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{progress}%</span>
        </div>
      </motion.div>

      {/* Asset Checklist Controls */}
      {campaign.status === "in_progress" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
        >
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full text-sm rounded-lg border pl-9 pr-3 py-2 bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(e) => { setPendingOnly(e.target.checked); setAssetPage(1); }}
                className="rounded"
              />
              Pending only
            </label>
          </div>
        </motion.div>
      )}

      {/* Asset List */}
      {campaign.status === "in_progress" || campaign.status === "completed" ? (
        loadingAssets ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--surface-2)] animate-pulse" />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl border"
            style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
          >
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400 opacity-60" />
            <p className="text-sm text-[var(--text-secondary)]">
              {pendingOnly ? "All assets in scope have been verified!" : "No assets match your search."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filteredAssets.map((a) => (
                <AssetRow key={a.id} asset={a} campaignId={id} />
              ))}
            </div>

            {totalAssetPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setAssetPage((p) => Math.max(1, p - 1))}
                  disabled={assetPage <= 1}
                  className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
                  style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                  Page {assetPage} of {totalAssetPages}
                </span>
                <button
                  onClick={() => setAssetPage((p) => Math.min(totalAssetPages, p + 1))}
                  disabled={assetPage >= totalAssetPages}
                  className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
                  style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )
      ) : (
        <div
          className="text-center py-12 rounded-xl border"
          style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
        >
          <Play size={40} className="mx-auto mb-3 text-blue-400 opacity-60" />
          <p className="text-sm text-[var(--text-secondary)]">
            Start the campaign to begin verifying assets.
          </p>
        </div>
      )}
    </div>
  );
}

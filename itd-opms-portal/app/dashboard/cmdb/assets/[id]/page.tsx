"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  DollarSign,
  Tag,
  Shield,
  Clock,
  Loader2,
  Trash2,
  History,
  AlertTriangle,
} from "lucide-react";
import { useAsset, useAssetLifecycleEvents } from "@/hooks/use-cmdb";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  maintenance: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  retired: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  disposed: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
  procured: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  received: { bg: "rgba(20, 184, 166, 0.1)", text: "#14B8A6" },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  hardware: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
  software: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
  virtual: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
  cloud: { bg: "rgba(14, 165, 233, 0.1)", text: "#0EA5E9" },
  network: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
  peripheral: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
};

const EVENT_ICONS: Record<string, { icon: typeof Clock; color: string }> = {
  procured: { icon: DollarSign, color: "#3B82F6" },
  received: { icon: Package, color: "#14B8A6" },
  deployed: { icon: MapPin, color: "#10B981" },
  maintenance: { icon: AlertTriangle, color: "#F59E0B" },
  transferred: { icon: User, color: "#8B5CF6" },
  retired: { icon: Shield, color: "#6B7280" },
  disposed: { icon: Trash2, color: "#EF4444" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: asset, isLoading } = useAsset(id);
  const { data: lifecycleEvents } = useAssetLifecycleEvents(id);

  const events = lifecycleEvents ?? [];

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--text-secondary)]">Asset not found.</p>
      </div>
    );
  }

  /* ---- Helpers ---- */

  const statusColor = STATUS_COLORS[asset.status] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
  };
  const typeColor = TYPE_COLORS[asset.type] ?? {
    bg: "var(--surface-2)",
    text: "var(--text-secondary)",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-[var(--text-secondary)]">
              {asset.assetTag}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
            >
              {asset.type}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
            >
              {asset.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {asset.name}
          </h1>
          {asset.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {asset.description}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Created {new Date(asset.createdAt).toLocaleString()} | Updated{" "}
            {new Date(asset.updatedAt).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/cmdb/assets/${id}/dispose`)}
            className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-opacity hover:opacity-90"
          >
            <Trash2 size={14} />
            Dispose
          </button>
        </div>
      </motion.div>

      {/* Info Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Asset Information
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Manufacturer</dt>
            <dd className="text-[var(--text-primary)]">{asset.manufacturer || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Model</dt>
            <dd className="text-[var(--text-primary)]">{asset.model || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Serial Number</dt>
            <dd className="font-mono text-[var(--text-primary)]">{asset.serialNumber || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Location</dt>
            <dd className="text-[var(--text-primary)]">
              {[asset.building, asset.floor, asset.room].filter(Boolean).join(", ") ||
                asset.location ||
                "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Owner</dt>
            <dd className="text-[var(--text-primary)]">
              {asset.ownerId ? asset.ownerId.slice(0, 8) + "..." : "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Custodian</dt>
            <dd className="text-[var(--text-primary)]">
              {asset.custodianId ? asset.custodianId.slice(0, 8) + "..." : "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Purchase Date</dt>
            <dd className="tabular-nums text-[var(--text-primary)]">
              {asset.purchaseDate
                ? new Date(asset.purchaseDate).toLocaleDateString()
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Purchase Cost</dt>
            <dd className="tabular-nums text-[var(--text-primary)]">
              {asset.purchaseCost != null
                ? `${asset.currency} ${asset.purchaseCost.toLocaleString()}`
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-secondary)]">Classification</dt>
            <dd className="capitalize text-[var(--text-primary)]">
              {asset.classification || "Not set"}
            </dd>
          </div>
        </dl>
      </motion.div>

      {/* Tags */}
      {asset.tags && asset.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* JSONB Attributes */}
      {asset.attributes && Object.keys(asset.attributes).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Custom Attributes
          </h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(asset.attributes).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium text-[var(--text-secondary)] capitalize">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="text-[var(--text-primary)]">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      )}

      {/* Lifecycle Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Lifecycle Timeline
            </h2>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <History size={24} className="text-[var(--text-secondary)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              No lifecycle events recorded yet.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />

            <div className="space-y-4">
              {events.map((event) => {
                const eventConfig = EVENT_ICONS[event.eventType] ?? {
                  icon: Clock,
                  color: "var(--text-secondary)",
                };
                const EventIcon = eventConfig.icon;
                return (
                  <div key={event.id} className="relative flex gap-4 pl-0">
                    <div
                      className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--surface-0)]"
                      style={{ backgroundColor: `${eventConfig.color}20` }}
                    >
                      <EventIcon size={14} style={{ color: eventConfig.color }} />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        by {event.performedBy.slice(0, 8)}...
                      </p>
                      {event.details && Object.keys(event.details).length > 0 && (
                        <div className="mt-1 rounded-lg bg-[var(--surface-1)] p-2">
                          {Object.entries(event.details).map(([key, value]) => (
                            <p key={key} className="text-xs text-[var(--text-secondary)]">
                              <span className="font-medium capitalize">
                                {key.replace(/_/g, " ")}:
                              </span>{" "}
                              {String(value)}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)] tabular-nums">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

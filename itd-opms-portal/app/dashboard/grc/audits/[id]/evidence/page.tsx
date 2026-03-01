"use client";

import { use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  FolderArchive,
  CheckCircle,
  Upload,
  User,
  Hash,
  Shield,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useEvidenceCollections,
  useApproveEvidenceCollection,
} from "@/hooks/use-grc";
import type { EvidenceCollection } from "@/types";

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

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "approved":
      return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
    case "submitted":
      return { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" };
    case "in_review":
      return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
    case "rejected":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
    default:
      return { bg: "var(--surface-2)", text: "var(--text-secondary)" };
  }
}

/* ------------------------------------------------------------------ */
/*  Evidence Card                                                      */
/* ------------------------------------------------------------------ */

function EvidenceCard({
  collection,
  onApprove,
  approving,
}: {
  collection: EvidenceCollection;
  onApprove: () => void;
  approving: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.1)]">
            <FolderArchive size={16} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {collection.title}
            </h3>
            <StatusBadge status={collection.status} />
          </div>
        </div>
      </div>

      {collection.description && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
          {collection.description}
        </p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Hash size={12} />
          <span>
            {collection.evidenceItemIds.length} evidence item
            {collection.evidenceItemIds.length !== 1 ? "s" : ""}
          </span>
        </div>
        {collection.collectorId && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Upload size={12} />
            <span>Collector: {collection.collectorId.slice(0, 8)}...</span>
          </div>
        )}
        {collection.reviewerId && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <User size={12} />
            <span>Reviewer: {collection.reviewerId.slice(0, 8)}...</span>
          </div>
        )}
        {collection.approvedAt && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <CheckCircle size={12} style={{ color: "#10B981" }} />
            <span>Approved: {formatDate(collection.approvedAt)}</span>
          </div>
        )}
      </div>

      {/* Checksum */}
      {collection.checksum && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-1)] mb-3">
          <Shield size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
          <span className="text-xs font-mono text-[var(--text-secondary)] truncate">
            {collection.checksum}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {collection.status === "submitted" || collection.status === "in_review" ? (
          <button
            type="button"
            onClick={onApprove}
            disabled={approving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <CheckCircle size={12} />
            Approve
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EvidenceCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: auditId } = use(params);

  const { data: collections, isLoading } = useEvidenceCollections(auditId);
  const approveMutation = useApproveEvidenceCollection(auditId);

  const evidenceList = collections ?? [];

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href={`/dashboard/grc/audits/${auditId}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Audit
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
            <FolderArchive size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Evidence Collections
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage evidence for audit readiness
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status summary */}
      {evidenceList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {["draft", "submitted", "in_review", "approved"].map((s) => {
            const count = evidenceList.filter(
              (e) => e.status === s,
            ).length;
            const color = getStatusColor(s);
            return (
              <div
                key={s}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 text-center"
              >
                <p
                  className="text-xl font-bold tabular-nums"
                  style={{ color: color.text }}
                >
                  {count}
                </p>
                <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5">
                  {s.replace("_", " ")}
                </p>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Evidence List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
            <FolderArchive
              size={40}
              className="mx-auto text-[var(--text-secondary)] mb-3"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              No evidence collections
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Create evidence collections to support this audit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evidenceList.map((collection: EvidenceCollection) => (
              <EvidenceCard
                key={collection.id}
                collection={collection}
                onApprove={() => approveMutation.mutate(collection.id)}
                approving={approveMutation.isPending}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

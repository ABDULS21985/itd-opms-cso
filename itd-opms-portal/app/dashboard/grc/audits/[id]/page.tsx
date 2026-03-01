"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  FileSearch,
  FolderArchive,
  Calendar,
  User,
  CheckCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useGRCAudit,
  useAuditFindings,
  useEvidenceCollections,
  useCloseAuditFinding,
  useApproveEvidenceCollection,
} from "@/hooks/use-grc";
import type { AuditFinding, EvidenceCollection } from "@/types";

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

function getReadinessColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function getSeverityColor(severity: string): { bg: string; text: string } {
  switch (severity) {
    case "critical":
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
    case "high":
      return { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" };
    case "medium":
      return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
    case "low":
      return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
    default:
      return { bg: "var(--surface-2)", text: "var(--text-secondary)" };
  }
}

/* ------------------------------------------------------------------ */
/*  Tab Button                                                         */
/* ------------------------------------------------------------------ */

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "text-[var(--primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className="ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs tabular-nums"
          style={{
            backgroundColor: active
              ? "rgba(var(--primary-rgb, 59, 130, 246), 0.1)"
              : "var(--surface-2)",
            color: active ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          {count}
        </span>
      )}
      {active && (
        <motion.div
          layoutId="audit-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
        />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GRCAuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<
    "overview" | "findings" | "evidence"
  >("overview");

  const { data: audit, isLoading } = useGRCAudit(id);
  const { data: findingsData, isLoading: findingsLoading } =
    useAuditFindings(id, 1, 50);
  const { data: evidenceData, isLoading: evidenceLoading } =
    useEvidenceCollections(id);

  const closeFinding = useCloseAuditFinding(id);
  const approveEvidence = useApproveEvidenceCollection(id);

  const findings = findingsData?.data ?? [];
  const evidence = evidenceData ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-secondary)]">Audit not found.</p>
        <Link
          href="/dashboard/grc/audits"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} /> Back to Audits
        </Link>
      </div>
    );
  }

  const readinessColor = getReadinessColor(audit.readinessScore);

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/dashboard/grc/audits"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Audits
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.1)]">
            <ClipboardList size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={audit.status} />
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  color: "#3B82F6",
                }}
              >
                {audit.auditType}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {audit.title}
            </h1>
          </div>
        </div>

        {/* Readiness Score */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-[var(--text-secondary)]">
            Readiness Score
          </span>
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: readinessColor }}
          >
            {audit.readinessScore}%
          </span>
          <div className="w-32 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(audit.readinessScore, 100)}%`,
                backgroundColor: readinessColor,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="border-b border-[var(--border)] flex"
      >
        <TabButton
          active={activeTab === "overview"}
          label="Overview"
          onClick={() => setActiveTab("overview")}
        />
        <TabButton
          active={activeTab === "findings"}
          label="Findings"
          count={findings.length}
          onClick={() => setActiveTab("findings")}
        />
        <TabButton
          active={activeTab === "evidence"}
          label="Evidence"
          count={evidence.length}
          onClick={() => setActiveTab("evidence")}
        />
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Scope */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  Scope
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {audit.scope || "No scope defined."}
                </p>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-[var(--text-secondary)]" />
                    <span className="text-xs text-[var(--text-secondary)]">
                      Scheduled Start
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {formatDate(audit.scheduledStart)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-[var(--text-secondary)]" />
                    <span className="text-xs text-[var(--text-secondary)]">
                      Scheduled End
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {formatDate(audit.scheduledEnd)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar details */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 space-y-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Details
                </h2>
                <div className="flex items-center gap-3">
                  <User size={14} className="text-[var(--text-secondary)]" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Auditor</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {audit.auditor || "--"}
                    </p>
                  </div>
                </div>
                {audit.auditBody && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Audit Body</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {audit.auditBody}
                    </p>
                  </div>
                )}
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-xs text-[var(--text-secondary)]">Created</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {formatDate(audit.createdAt)}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/grc/audits/${id}/evidence`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all hover:shadow-sm hover:border-[var(--primary)]/30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FolderArchive size={16} className="text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    Evidence Vault
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {evidence.length} collection{evidence.length !== 1 ? "s" : ""} uploaded
                </p>
              </Link>
            </div>
          </div>
        )}

        {activeTab === "findings" && (
          <div className="space-y-4">
            {findingsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              </div>
            ) : findings.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
                <FileSearch
                  size={36}
                  className="mx-auto text-[var(--text-secondary)] mb-2"
                />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  No findings yet
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Findings will appear here as the audit progresses.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">
                        Finding #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">
                        Owner
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((finding: AuditFinding) => {
                      const sevColor = getSeverityColor(finding.severity);
                      return (
                        <tr
                          key={finding.id}
                          className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-1)] transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-mono text-[var(--primary)]">
                            {finding.findingNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-primary)] max-w-[200px] truncate">
                            {finding.title}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                              style={{
                                backgroundColor: sevColor.bg,
                                color: sevColor.text,
                              }}
                            >
                              {finding.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={finding.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                            {finding.ownerId
                              ? finding.ownerId.slice(0, 8) + "..."
                              : "--"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                            {formatDate(finding.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {finding.status !== "closed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  closeFinding.mutate(finding.id)
                                }
                                disabled={closeFinding.isPending}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                              >
                                <CheckCircle size={12} />
                                Close
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="space-y-4">
            {evidenceLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              </div>
            ) : evidence.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
                <FolderArchive
                  size={36}
                  className="mx-auto text-[var(--text-secondary)] mb-2"
                />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  No evidence collections
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Create evidence collections to support audit activities.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evidence.map((collection: EvidenceCollection) => (
                  <div
                    key={collection.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {collection.title}
                      </h3>
                      <StatusBadge status={collection.status} />
                    </div>
                    {collection.description && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                        {collection.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-3">
                      <span>
                        {collection.evidenceItemIds.length} item
                        {collection.evidenceItemIds.length !== 1 ? "s" : ""}
                      </span>
                      {collection.collectorId && (
                        <span>Collector: {collection.collectorId.slice(0, 8)}...</span>
                      )}
                    </div>
                    {collection.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() =>
                          approveEvidence.mutate(collection.id)
                        }
                        disabled={approveEvidence.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[rgba(59,130,246,0.05)] transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={12} />
                        Approve
                      </button>
                    )}
                    {collection.checksum && (
                      <div className="mt-2 text-xs text-[var(--text-secondary)] font-mono truncate">
                        Checksum: {collection.checksum}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

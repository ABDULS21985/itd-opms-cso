"use client";

import { use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useRisk,
  useRiskAssessments,
  useEscalateRisk,
} from "@/hooks/use-grc";
import type { RiskAssessment } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): { bg: string; text: string } {
  if (score <= 4) return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" };
  if (score <= 9) return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" };
  if (score <= 16) return { bg: "rgba(249, 115, 22, 0.1)", text: "#F97316" };
  return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Assessment Timeline Item                                           */
/* ------------------------------------------------------------------ */

function AssessmentItem({ assessment }: { assessment: RiskAssessment }) {
  return (
    <div className="relative pl-6 pb-6 border-l-2 border-[var(--border)] last:border-l-0 last:pb-0">
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-[var(--primary)] bg-[var(--surface-0)]" />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {formatDate(assessment.assessmentDate)}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            by {assessment.assessedBy.slice(0, 8)}...
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mb-2">
          <div className="text-xs">
            <span className="text-[var(--text-secondary)]">Likelihood: </span>
            {assessment.previousLikelihood && (
              <span className="text-[var(--text-secondary)] line-through mr-1 capitalize">
                {assessment.previousLikelihood.replace("_", " ")}
              </span>
            )}
            <span className="font-medium text-[var(--text-primary)] capitalize">
              {assessment.newLikelihood.replace("_", " ")}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-[var(--text-secondary)]">Impact: </span>
            {assessment.previousImpact && (
              <span className="text-[var(--text-secondary)] line-through mr-1 capitalize">
                {assessment.previousImpact.replace("_", " ")}
              </span>
            )}
            <span className="font-medium text-[var(--text-primary)] capitalize">
              {assessment.newImpact.replace("_", " ")}
            </span>
          </div>
        </div>
        {assessment.rationale && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {assessment.rationale}
          </p>
        )}
        {assessment.evidenceRefs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {assessment.evidenceRefs.map((ref, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
              >
                {ref}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GRCRiskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: risk, isLoading } = useRisk(id);
  const { data: assessments, isLoading: assessmentsLoading } =
    useRiskAssessments(id);
  const escalateMutation = useEscalateRisk();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-secondary)]">Risk not found.</p>
        <Link
          href="/dashboard/grc/risks"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} /> Back to Risk Register
        </Link>
      </div>
    );
  }

  const scoreColor = getScoreColor(risk.riskScore);

  return (
    <div className="space-y-6 pb-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/dashboard/grc/risks"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Risk Register
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(239,68,68,0.1)]">
            <ShieldAlert size={20} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-[var(--primary)]">
                {risk.riskNumber}
              </span>
              <StatusBadge status={risk.status} />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {risk.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => escalateMutation.mutate(id)}
            disabled={escalateMutation.isPending || risk.status === "escalated"}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
          >
            <TrendingUp size={16} />
            Escalate
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Description */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Description
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {risk.description || "No description provided."}
            </p>
          </div>

          {/* Risk Attributes */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Risk Assessment
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Category</p>
                <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-primary)]">
                  {risk.category}
                </span>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Likelihood</p>
                <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                  {risk.likelihood.replace("_", " ")}
                </span>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Impact</p>
                <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                  {risk.impact.replace("_", " ")}
                </span>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Risk Score</p>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold tabular-nums"
                  style={{ backgroundColor: scoreColor.bg, color: scoreColor.text }}
                >
                  {risk.riskScore}
                </span>
              </div>
            </div>
          </div>

          {/* Treatment & Contingency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-[var(--primary)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Treatment Plan
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {risk.treatmentPlan || "No treatment plan defined."}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-[var(--primary)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Contingency Plan
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {risk.contingencyPlan || "No contingency plan defined."}
              </p>
            </div>
          </div>

          {/* Assessment History */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              Assessment History
            </h2>
            {assessmentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              </div>
            ) : assessments && assessments.length > 0 ? (
              <div className="space-y-0">
                {assessments.map((a) => (
                  <AssessmentItem key={a.id} assessment={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                No assessments recorded yet.
              </p>
            )}
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          {/* Details card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Details
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={14} className="text-[var(--text-secondary)]" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Owner</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {risk.ownerId ? risk.ownerId.slice(0, 8) + "..." : "--"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User size={14} className="text-[var(--text-secondary)]" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Reviewer</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {risk.reviewerId
                      ? risk.reviewerId.slice(0, 8) + "..."
                      : "--"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-[var(--text-secondary)]" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Review Date</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {formatDate(risk.reviewDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-[var(--text-secondary)]" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Next Review</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {formatDate(risk.nextReviewDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-3 space-y-2">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Escalation Threshold
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {risk.escalationThreshold}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Created</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {formatDate(risk.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Updated</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {formatDate(risk.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Linked items */}
          {(risk.linkedProjectId || risk.linkedAuditId) && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Linked Items
              </h2>
              {risk.linkedProjectId && (
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Project</p>
                  <p className="text-sm text-[var(--primary)]">
                    {risk.linkedProjectId.slice(0, 8)}...
                  </p>
                </div>
              )}
              {risk.linkedAuditId && (
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Audit</p>
                  <p className="text-sm text-[var(--primary)]">
                    {risk.linkedAuditId.slice(0, 8)}...
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

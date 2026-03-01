"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Edit,
  Calendar,
  User,
  AlertTriangle,
  Shield,
  FileWarning,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useRisk, useUpdateRisk } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LEVEL_VALUE: Record<string, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

function getScoreColor(score: number): { bg: string; text: string } {
  if (score <= 4) return { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981" };
  if (score <= 9) return { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B" };
  if (score <= 16) return { bg: "rgba(249, 115, 22, 0.15)", text: "#F97316" };
  return { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444" };
}

function getScoreLabel(score: number): string {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

const STATUS_TRANSITIONS: Record<string, { label: string; targets: string[] }> =
  {
    identified: { label: "Identified", targets: ["assessed"] },
    assessed: { label: "Assessed", targets: ["mitigating", "accepted"] },
    mitigating: { label: "Mitigating", targets: ["closed", "accepted"] },
    accepted: { label: "Accepted", targets: ["closed"] },
    closed: { label: "Closed", targets: [] },
  };

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RiskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: risk, isLoading } = useRisk(id);
  const updateRisk = useUpdateRisk(id);

  /* ---- Loading ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={24}
            className="animate-spin text-[var(--primary)]"
          />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading risk...
          </p>
        </div>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">Risk not found.</p>
      </div>
    );
  }

  const scoreColor = getScoreColor(risk.riskScore);
  const scoreLabel = getScoreLabel(risk.riskScore);
  const transitions =
    STATUS_TRANSITIONS[risk.status.toLowerCase()]?.targets ?? [];

  function handleTransition(newStatus: string) {
    updateRisk.mutate({ id: risk!.id, status: newStatus });
  }

  /* ---- Likelihood x Impact Visual ---- */
  const likelihoodVal = LEVEL_VALUE[risk.likelihood.toLowerCase()] ?? 1;
  const impactVal = LEVEL_VALUE[risk.impact.toLowerCase()] ?? 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/planning/risks")}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Risk Register
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(239,68,68,0.1)]">
            <ShieldAlert size={24} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {risk.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={risk.status} />
              {risk.category && (
                <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                  {risk.category}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transitions.map((target) => (
            <button
              key={target}
              type="button"
              disabled={updateRisk.isPending}
              onClick={() => handleTransition(target)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium capitalize text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)] disabled:opacity-50"
            >
              {updateRisk.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Edit size={16} />
              )}
              {target.replace("_", " ")}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Risk Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {/* Score */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Risk Score
          </p>
          <div className="mt-2 flex items-center justify-center">
            <span
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold"
              style={{ backgroundColor: scoreColor.bg, color: scoreColor.text }}
            >
              {risk.riskScore}
            </span>
          </div>
          <p
            className="mt-2 text-sm font-semibold"
            style={{ color: scoreColor.text }}
          >
            {scoreLabel}
          </p>
        </div>

        {/* Likelihood */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Likelihood
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-[var(--text-primary)]">
            {risk.likelihood.replace("_", " ")}
          </p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <div
                key={v}
                className="h-2 flex-1 rounded-full"
                style={{
                  backgroundColor:
                    v <= likelihoodVal
                      ? scoreColor.text
                      : "var(--surface-2)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Impact */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-gray)]">
            Impact
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-[var(--text-primary)]">
            {risk.impact.replace("_", " ")}
          </p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <div
                key={v}
                className="h-2 flex-1 rounded-full"
                style={{
                  backgroundColor:
                    v <= impactVal ? scoreColor.text : "var(--surface-2)",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Description */}
      {risk.description && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {risk.description}
          </p>
        </motion.div>
      )}

      {/* Mitigation & Contingency */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Shield size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Mitigation Plan
            </h2>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {risk.mitigationPlan || "No mitigation plan defined."}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
          <div className="mb-2 flex items-center gap-2">
            <FileWarning size={16} className="text-[var(--warning)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Contingency Plan
            </h2>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {risk.contingencyPlan || "No contingency plan defined."}
          </p>
        </div>
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Metadata
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
              <User size={12} />
              Owner
            </dt>
            <dd className="text-[var(--text-primary)]">
              {risk.ownerId || "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
              <Calendar size={12} />
              Review Date
            </dt>
            <dd className="text-[var(--text-primary)]">
              {risk.reviewDate
                ? new Date(risk.reviewDate).toLocaleDateString()
                : "Not set"}
            </dd>
          </div>
          {risk.reviewDate && (
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)]">
                <AlertTriangle size={12} />
                Review Reminder
              </dt>
              <dd className="text-[var(--text-primary)]">
                {new Date(risk.reviewDate) <= new Date() ? (
                  <span className="text-[var(--error)] font-medium">
                    Review is overdue - please reassess this risk
                  </span>
                ) : (
                  <span>
                    Next review in{" "}
                    {Math.ceil(
                      (new Date(risk.reviewDate).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    )}{" "}
                    days
                  </span>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Project ID
            </dt>
            <dd className="text-[var(--text-primary)]">
              {risk.projectId || "Organization-wide"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Created At
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(risk.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--neutral-gray)]">
              Last Updated
            </dt>
            <dd className="text-[var(--text-primary)]">
              {new Date(risk.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  GitBranch,
  Loader2,
  RotateCcw,
  Shield,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useChange,
  useTransitionChange,
  useSubmitCABDecision,
  useCompletePIR,
} from "@/hooks/use-itsm";
import { CAB_DECISIONS } from "@/types/itsm";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(value?: string) {
  if (!value) return "\u2014";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanize(value?: string) {
  return value ? value.replace(/_/g, " ") : "\u2014";
}

const CLASSIFICATION_META: Record<string, { icon: LucideIcon; accent: string; bg: string }> = {
  emergency: { icon: Zap, accent: "#DC2626", bg: "rgba(220, 38, 38, 0.10)" },
  standard: { icon: CheckCircle2, accent: "#2563EB", bg: "rgba(37, 99, 235, 0.10)" },
  normal: { icon: GitBranch, accent: "#7C3AED", bg: "rgba(124, 58, 237, 0.10)" },
};

const RISK_COLOR: Record<string, string> = {
  low: "#16A34A",
  medium: "#D97706",
  high: "#EA580C",
  critical: "#DC2626",
};

// Map from current status to allowed transitions with labels.
const CHANGE_TRANSITIONS: Record<string, { value: string; label: string; icon: LucideIcon; accent: string }[]> = {
  draft: [{ value: "submitted", label: "Submit", icon: GitBranch, accent: "#2563EB" }],
  submitted: [{ value: "assessing", label: "Begin Assessment", icon: Shield, accent: "#7C3AED" }],
  assessing: [
    { value: "cab_review", label: "Send to CAB", icon: Shield, accent: "#D97706" },
    { value: "approved", label: "Approve", icon: CheckCircle2, accent: "#16A34A" },
    { value: "rejected", label: "Reject", icon: XCircle, accent: "#DC2626" },
  ],
  cab_review: [], // Handled by CAB Decision form
  approved: [{ value: "scheduled", label: "Schedule", icon: Calendar, accent: "#2563EB" }],
  deferred: [{ value: "assessing", label: "Re-assess", icon: RotateCcw, accent: "#7C3AED" }],
  scheduled: [{ value: "implementing", label: "Start Implementation", icon: Zap, accent: "#D97706" }],
  implementing: [
    { value: "implemented", label: "Mark Implemented", icon: CheckCircle2, accent: "#16A34A" },
    { value: "failed", label: "Mark Failed", icon: XCircle, accent: "#DC2626" },
    { value: "rolled_back", label: "Rolled Back", icon: RotateCcw, accent: "#EA580C" },
  ],
  implemented: [
    { value: "pir_pending", label: "Proceed to PIR", icon: FileText, accent: "#D97706" },
    { value: "closed", label: "Close", icon: CheckCircle2, accent: "#16A34A" },
  ],
  failed: [{ value: "investigating", label: "Investigate", icon: Shield, accent: "#7C3AED" }],
  rolled_back: [{ value: "closed", label: "Close", icon: CheckCircle2, accent: "#16A34A" }],
  investigating: [{ value: "scheduled", label: "Re-schedule", icon: Calendar, accent: "#2563EB" }],
};

/* ------------------------------------------------------------------ */
/*  Info Row Component                                                 */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs text-white/40 w-36 shrink-0 uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChangeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: change, isLoading } = useChange(id);
  const transitionMutation = useTransitionChange(id);
  const cabDecisionMutation = useSubmitCABDecision(id);
  const pirMutation = useCompletePIR(id);

  const [activeTab, setActiveTab] = useState<"overview" | "planning" | "pir">("overview");
  const [cabDecision, setCabDecision] = useState("");
  const [cabNotes, setCabNotes] = useState("");
  const [pirNotes, setPirNotes] = useState("");
  const [transitionComment, setTransitionComment] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/50">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading change...
      </div>
    );
  }

  if (!change) {
    return (
      <div className="text-center py-32 text-white/40">
        <p>Change not found</p>
      </div>
    );
  }

  const clsMeta = CLASSIFICATION_META[change.changeClassification ?? ""] ?? CLASSIFICATION_META.normal;
  const ClsIcon = clsMeta.icon;
  const transitions = CHANGE_TRANSITIONS[change.status] ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/itsm/changes")}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Changes
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-white/50">{change.ticketNumber}</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                style={{ backgroundColor: clsMeta.bg, color: clsMeta.accent }}
              >
                <ClsIcon size={12} />
                {change.changeClassification}
              </span>
              <StatusBadge status={change.status} />
            </div>
            <h1 className="text-2xl font-bold text-white">{change.title}</h1>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {transitions.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {transitions.map((t) => {
            const TIcon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => transitionMutation.mutate({ targetStatus: t.value, comment: transitionComment || undefined })}
                disabled={transitionMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/10 hover:bg-white/5 transition-colors"
              >
                <TIcon size={14} style={{ color: t.accent }} />
                {t.label}
              </button>
            );
          })}
          <input
            type="text"
            placeholder="Transition comment (optional)"
            value={transitionComment}
            onChange={(e) => setTransitionComment(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 flex-1 min-w-[200px]"
          />
        </div>
      )}

      {/* CAB Decision Form */}
      {change.status === "cab_review" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">CAB Decision Required</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white"
              value={cabDecision}
              onChange={(e) => setCabDecision(e.target.value)}
            >
              <option value="">Select decision</option>
              {CAB_DECISIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Decision notes"
              value={cabNotes}
              onChange={(e) => setCabNotes(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 flex-1"
            />
            <button
              onClick={() => cabDecisionMutation.mutate({ decision: cabDecision, notes: cabNotes || undefined })}
              disabled={!cabDecision || cabDecisionMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #D97706, #B45309)" }}
            >
              {cabDecisionMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Submit Decision"}
            </button>
          </div>
        </div>
      )}

      {/* PIR Form */}
      {change.status === "pir_pending" && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-violet-400 uppercase tracking-wider">Post-Implementation Review</h3>
          <textarea
            placeholder="Enter PIR notes..."
            value={pirNotes}
            onChange={(e) => setPirNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 resize-none"
          />
          <button
            onClick={() => pirMutation.mutate({ pirNotes })}
            disabled={!pirNotes || pirMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            {pirMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Complete PIR"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06]">
        {(["overview", "planning", "pir"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? "border-violet-500 text-white"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            {tab === "pir" ? "PIR" : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === "overview" && (
          <div className="rounded-xl border border-white/[0.06] p-6 space-y-1">
            <InfoRow label="Description" value={change.description} />
            <InfoRow label="Classification" value={<span className="capitalize">{change.changeClassification}</span>} />
            <InfoRow label="Change Type" value={<span className="capitalize">{humanize(change.changeType)}</span>} />
            <InfoRow
              label="Risk Level"
              value={
                <span className="capitalize font-medium" style={{ color: RISK_COLOR[change.riskLevel ?? "medium"] }}>
                  {change.riskLevel}
                </span>
              }
            />
            <InfoRow label="Priority" value={change.priority} />
            <InfoRow label="Reporter" value={change.reporterName ?? change.reporterId} />
            <InfoRow label="Assignee" value={change.assigneeName ?? "\u2014"} />
            <InfoRow label="CAB Required" value={change.cabRequired ? "Yes" : "No"} />
            {change.cabDecision && (
              <InfoRow label="CAB Decision" value={<span className="capitalize">{humanize(change.cabDecision)}</span>} />
            )}
            {change.cabDecisionDate && <InfoRow label="CAB Decision Date" value={formatDate(change.cabDecisionDate)} />}
            <InfoRow label="Scheduled" value={`${formatDate(change.scheduledStart)} \u2192 ${formatDate(change.scheduledEnd)}`} />
            {change.actualStart && (
              <InfoRow label="Actual" value={`${formatDate(change.actualStart)} \u2192 ${formatDate(change.actualEnd)}`} />
            )}
            <InfoRow label="Created" value={formatDate(change.createdAt)} />
            <InfoRow label="Updated" value={formatDate(change.updatedAt)} />
          </div>
        )}

        {activeTab === "planning" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/[0.06] p-6">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Implementation Plan</h3>
              <p className="text-sm text-white whitespace-pre-wrap">{change.implementationPlan || "Not provided"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] p-6">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Rollback Plan</h3>
              <p className="text-sm text-white whitespace-pre-wrap">{change.rollbackPlan || "Not provided"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] p-6">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Test Plan</h3>
              <p className="text-sm text-white whitespace-pre-wrap">{change.testPlan || "Not provided"}</p>
            </div>
          </div>
        )}

        {activeTab === "pir" && (
          <div className="rounded-xl border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Post-Implementation Review</h3>
            {change.pirCompleted ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">PIR Completed</span>
                </div>
                <p className="text-sm text-white whitespace-pre-wrap">{change.pirNotes}</p>
              </div>
            ) : change.pirRequired ? (
              <p className="text-sm text-amber-400">PIR is required but not yet completed.</p>
            ) : (
              <p className="text-sm text-white/50">PIR not required for this change.</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

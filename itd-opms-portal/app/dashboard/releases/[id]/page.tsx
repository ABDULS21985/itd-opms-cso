"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Package,
  Rocket,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import {
  WorkflowActionDrawer,
  type WorkflowActionPayload,
} from "@/components/itsm/workflow-experience";
import { useITSMAllowedTransitions } from "@/hooks/use-itsm";
import {
  useRelease,
  useReleaseItems,
  useReleaseDeployments,
  useReleaseApprovals,
  useTransitionRelease,
  useDeployRelease,
  useRollbackRelease,
  useCloseRelease,
  useDecideApproval,
} from "@/hooks/use-release";
import { APPROVAL_TYPES } from "@/types/release";
import type { ReleaseItem, ReleaseDeployment, ReleaseApproval } from "@/types/release";
import type { ITSMWorkflowTransition } from "@/types";

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

function formatShortDate(value?: string) {
  if (!value) return "\u2014";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TYPE_META: Record<string, { icon: LucideIcon; accent: string; bg: string }> = {
  major: { icon: Rocket, accent: "#7C3AED", bg: "rgba(124, 58, 237, 0.10)" },
  minor: { icon: Package, accent: "#2563EB", bg: "rgba(37, 99, 235, 0.10)" },
  patch: { icon: CheckCircle2, accent: "#16A34A", bg: "rgba(22, 163, 74, 0.10)" },
  emergency: { icon: Zap, accent: "#DC2626", bg: "rgba(220, 38, 38, 0.10)" },
};

const RISK_COLOR: Record<string, string> = {
  low: "#16A34A",
  medium: "#D97706",
  high: "#EA580C",
  critical: "#DC2626",
};

const APPROVAL_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(234, 179, 8, 0.12)", text: "#FBBF24" },
  approved: { bg: "rgba(22, 163, 74, 0.12)", text: "#16A34A" },
  rejected: { bg: "rgba(220, 38, 38, 0.12)", text: "#DC2626" },
};

function roleLabel(value?: string) {
  if (!value) return "";
  const acronyms: Record<string, string> = {
    it: "IT",
    ditd: "DITD",
    cab: "CAB",
    uat: "UAT",
  };
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => acronyms[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function releaseDate(primary?: string, fallback?: string) {
  return primary ?? fallback;
}

/* ------------------------------------------------------------------ */
/*  Info Row Component                                                 */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs text-white/40 w-40 shrink-0 uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

type TabKey = "overview" | "items" | "deployments" | "approvals" | "timeline" | "closeout";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "items", label: "Items" },
  { key: "deployments", label: "Deployments" },
  { key: "approvals", label: "Approvals" },
  { key: "timeline", label: "Timeline" },
  { key: "closeout", label: "Close-Out" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReleaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: release, isLoading } = useRelease(id);
  const { data: items } = useReleaseItems(id);
  const { data: deployments } = useReleaseDeployments(id);
  const { data: approvals } = useReleaseApprovals(id);
  const { data: workflowTransitions } = useITSMAllowedTransitions("release", release?.status);
  const transitionMutation = useTransitionRelease(id);
  const deployMutation = useDeployRelease(id);
  const rollbackMutation = useRollbackRelease(id);
  const closeMutation = useCloseRelease(id);
  const decideApproval = useDecideApproval(id);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedTransition, setSelectedTransition] = useState<ITSMWorkflowTransition | null>(null);
  const [closeOutNotes, setCloseOutNotes] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/50">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading release...
      </div>
    );
  }

  if (!release) {
    return (
      <div className="text-center py-32 text-white/40">
        <p>Release not found</p>
      </div>
    );
  }

  const typeMeta = TYPE_META[release.releaseType] ?? TYPE_META.minor;
  const TypeIcon = typeMeta.icon;
  const transitions = workflowTransitions?.transitions ?? [];
  const blockedTransitions = workflowTransitions?.blockedTransitions ?? [];

  const handleWorkflowSubmit = (payload: WorkflowActionPayload) => {
    const note =
      payload.reason ||
      payload.internalNote ||
      payload.customerNote ||
      payload.resolutionNotes ||
      undefined;

    if (payload.targetStatus === "deploying") {
      deployMutation.mutate({
        environment: release.environment,
        deploymentType: "full",
        notes: note,
      });
    } else if (payload.targetStatus === "rolled_back") {
      rollbackMutation.mutate({ reason: note || "Rollback requested from release workflow" });
    } else if (payload.targetStatus === "closed") {
      closeMutation.mutate({
        closeOutReport:
          note ||
          closeOutNotes ||
          release.closeOutReport ||
          release.closeOutNotes ||
          "Release close-out completed.",
        lessonsLearned: lessonsLearned || release.lessonsLearned || undefined,
      });
    } else {
      transitionMutation.mutate({ targetStatus: payload.targetStatus, comment: note });
    }
    setSelectedTransition(null);
  };

  const releaseItems = (Array.isArray(items) ? items : (items as unknown as { data: ReleaseItem[] })?.data ?? []) as ReleaseItem[];
  const releaseDeployments = (Array.isArray(deployments) ? deployments : (deployments as unknown as { data: ReleaseDeployment[] })?.data ?? []) as ReleaseDeployment[];
  const releaseApprovals = (Array.isArray(approvals) ? approvals : (approvals as unknown as { data: ReleaseApproval[] })?.data ?? []) as ReleaseApproval[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/releases/list")}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Releases
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-white/50">{release.releaseNumber}</span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                style={{ backgroundColor: typeMeta.bg, color: typeMeta.accent }}
              >
                <TypeIcon size={12} />
                {release.releaseType}
              </span>
              <StatusBadge status={release.status} />
            </div>
            <h1 className="text-2xl font-bold text-white">{release.title}</h1>
          </div>
        </div>
      </div>

      {/* Backend-driven lifecycle actions */}
      {(transitions.length > 0 || blockedTransitions.length > 0) && (
        <div className="rounded-xl border border-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Release lifecycle actions</h2>
              {workflowTransitions?.nextAction ? (
                <p className="text-xs text-white/40">Next required step: {workflowTransitions.nextAction}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {transitions.map((transition) => (
              <button
                key={transition.value}
                onClick={() => setSelectedTransition(transition)}
                disabled={
                  transitionMutation.isPending ||
                  deployMutation.isPending ||
                  rollbackMutation.isPending ||
                  closeMutation.isPending
                }
                className="rounded-lg border border-white/10 px-4 py-2 text-left text-sm font-medium text-white transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                <span className="block">{transition.label}</span>
                <span className="mt-1 block text-[11px] font-normal text-white/45">
                  R: {roleLabel(transition.responsibleRole) || "Unassigned"}
                  {transition.accountableRole ? ` | A: ${roleLabel(transition.accountableRole)}` : ""}
                </span>
              </button>
            ))}
            {blockedTransitions.slice(0, 4).map((transition) => (
              <button
                key={`blocked-${transition.value}`}
                disabled
                title={transition.reason}
                className="rounded-lg border border-white/10 px-4 py-2 text-left text-sm font-medium text-white/35"
              >
                <span className="block">{transition.label}</span>
                <span className="mt-1 block text-[11px] font-normal text-white/30">
                  {transition.reason || "Not available from current status"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <WorkflowActionDrawer
        open={!!selectedTransition}
        entity="release"
        currentStatus={release.status}
        recordTitle={release.title}
        transition={selectedTransition}
        isSubmitting={
          transitionMutation.isPending ||
          deployMutation.isPending ||
          rollbackMutation.isPending ||
          closeMutation.isPending
        }
        onClose={() => setSelectedTransition(null)}
        onSubmit={handleWorkflowSubmit}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? "border-indigo-500 text-white"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="rounded-xl border border-white/[0.06] p-6 space-y-1">
            <InfoRow label="Description" value={release.description} />
            <InfoRow label="Release Type" value={<span className="capitalize">{release.releaseType}</span>} />
            <InfoRow
              label="Risk Level"
              value={
                release.riskLevel ? (
                  <span className="capitalize font-medium" style={{ color: RISK_COLOR[release.riskLevel] }}>
                    {release.riskLevel}
                  </span>
                ) : (
                  "\u2014"
                )
              }
            />
            {release.riskNotes && <InfoRow label="Risk Notes" value={release.riskNotes} />}
            <InfoRow label="Environment" value={<span className="capitalize">{release.environment}</span>} />
            <InfoRow label="Release Manager" value={release.releaseManagerName ?? "\u2014"} />
            <InfoRow
              label="Planned"
              value={`${formatShortDate(releaseDate(release.plannedStart, release.plannedStartDate))} \u2192 ${formatShortDate(releaseDate(release.plannedEnd, release.plannedEndDate))}`}
            />
            {releaseDate(release.actualStart, release.actualStartDate) && (
              <InfoRow
                label="Actual"
                value={`${formatShortDate(releaseDate(release.actualStart, release.actualStartDate))} \u2192 ${formatShortDate(releaseDate(release.actualEnd, release.actualEndDate))}`}
              />
            )}
            {release.deploymentPlan && (
              <div className="pt-4 mt-4 border-t border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Deployment Plan</h3>
                <p className="text-sm text-white whitespace-pre-wrap">{release.deploymentPlan}</p>
              </div>
            )}
            {release.rollbackPlan && (
              <div className="pt-4 mt-4 border-t border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Rollback Plan</h3>
                <p className="text-sm text-white whitespace-pre-wrap">{release.rollbackPlan}</p>
              </div>
            )}
            <InfoRow label="Created" value={formatDate(release.createdAt)} />
            <InfoRow label="Updated" value={formatDate(release.updatedAt)} />
          </div>
        )}

        {/* ── Items ── */}
        {activeTab === "items" && (
          <div>
            {releaseItems.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Package size={36} className="mx-auto mb-3 opacity-30" />
                <p>No release items</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                      <th className="text-left p-4">Title</th>
                      <th className="text-left p-4">Type</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">CI</th>
                      <th className="text-left p-4">Version</th>
                      <th className="text-left p-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {releaseItems.map((item) => (
                      <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="p-4 text-white font-medium">{item.title}</td>
                        <td className="p-4 text-white/50 capitalize">{item.itemType}</td>
                        <td className="p-4"><StatusBadge status={item.status} /></td>
                        <td className="p-4 text-white/50">{item.ciName ?? "\u2014"}</td>
                        <td className="p-4 text-white/50 font-mono text-xs">{item.version ?? "\u2014"}</td>
                        <td className="p-4 text-white/50">{item.notes ?? "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Deployments ── */}
        {activeTab === "deployments" && (
          <div>
            {releaseDeployments.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Rocket size={36} className="mx-auto mb-3 opacity-30" />
                <p>No deployments yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {releaseDeployments.map((dep) => (
                  <div key={dep.id} className="rounded-xl border border-white/[0.06] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={dep.status} />
                        <span className="text-sm text-white capitalize">{dep.environment}</span>
                      </div>
                      <span className="text-xs text-white/40">{formatDate(dep.createdAt)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-white/40 text-xs">Deployed By</span>
                        <p className="text-white">{dep.deployedByName ?? "\u2014"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Started</span>
                        <p className="text-white">{formatDate(dep.startedAt)}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Completed</span>
                        <p className="text-white">{formatDate(dep.completedAt)}</p>
                      </div>
                      {dep.notes && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-white/40 text-xs">Notes</span>
                          <p className="text-white text-sm">{dep.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Approvals ── */}
        {activeTab === "approvals" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {APPROVAL_TYPES.map((at) => {
              const approval = releaseApprovals.find((a) => a.approvalType === at.value);
              const statusMeta = approval
                ? APPROVAL_STATUS_COLOR[approval.status] ?? APPROVAL_STATUS_COLOR.pending
                : APPROVAL_STATUS_COLOR.pending;

              return (
                <div key={at.value} className="rounded-xl border border-white/[0.06] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{at.label}</h3>
                    <span
                      className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                      style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                    >
                      {approval?.status ?? "pending"}
                    </span>
                  </div>

                  {approval?.approverName && (
                    <p className="text-xs text-white/40">
                      Approver: {approval.approverName}
                      {approval.decidedAt ? ` | decided on ${formatDate(approval.decidedAt)}` : ""}
                    </p>
                  )}
                  {(approval?.comments || approval?.notes) && (
                    <p className="text-sm text-white/60">{approval.comments || approval.notes}</p>
                  )}

                  {/* Approve / Reject actions for pending approvals */}
                  {approval && approval.status === "pending" && (
                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={approvalNotes[approval.id] ?? ""}
                        onChange={(e) => setApprovalNotes((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            decideApproval.mutate({
                              approvalId: approval.id,
                              decision: "approved",
                              notes: approvalNotes[approval.id] || undefined,
                            })
                          }
                          disabled={decideApproval.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-400 border border-green-500/20 hover:bg-green-500/10 transition-colors"
                        >
                          <CheckCircle2 size={12} />
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            decideApproval.mutate({
                              approvalId: approval.id,
                              decision: "rejected",
                              notes: approvalNotes[approval.id] || undefined,
                            })
                          }
                          disabled={decideApproval.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                        >
                          <XCircle size={12} />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {!approval && (
                    <p className="text-xs text-white/30">Awaiting approval request</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Timeline ── */}
        {activeTab === "timeline" && (
          <div className="rounded-xl border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Release Timeline</h3>
            <div className="space-y-4">
              {/* Deployment events */}
              {releaseDeployments.map((dep) => (
                <div key={dep.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Rocket size={14} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white">
                      Deployment to <span className="capitalize font-medium">{dep.environment}</span> &mdash;{" "}
                      <span className="capitalize">{dep.status}</span>
                    </p>
                    {dep.deployedByName && <p className="text-xs text-white/40">by {dep.deployedByName}</p>}
                    <p className="text-xs text-white/30">{formatDate(dep.createdAt)}</p>
                  </div>
                </div>
              ))}

              {/* Approval events */}
              {releaseApprovals
                .filter((a) => a.decidedAt)
                .map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: a.status === "approved" ? "rgba(22, 163, 74, 0.10)" : "rgba(220, 38, 38, 0.10)",
                      }}
                    >
                      {a.status === "approved" ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        <span className="capitalize">{a.approvalType.replace(/_/g, " ")}</span> &mdash;{" "}
                        <span className="capitalize">{a.status}</span>
                      </p>
                      {a.approverName && <p className="text-xs text-white/40">by {a.approverName}</p>}
                      <p className="text-xs text-white/30">{formatDate(a.decidedAt)}</p>
                    </div>
                  </div>
                ))}

              {/* Creation event */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={14} className="text-white/40" />
                </div>
                <div>
                  <p className="text-sm text-white">Release created</p>
                  <p className="text-xs text-white/30">{formatDate(release.createdAt)}</p>
                </div>
              </div>

              {releaseDeployments.length === 0 && releaseApprovals.filter((a) => a.decidedAt).length === 0 && (
                <p className="text-sm text-white/40 pl-11">No additional timeline events yet</p>
              )}
            </div>
          </div>
        )}

        {/* ── Close-Out ── */}
        {activeTab === "closeout" && (
          <div className="space-y-6">
            {release.status === "deployed" ? (
              <>
                <div className="rounded-xl border border-white/[0.06] p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Close-Out Notes</h3>
                  <FormField
                    name="closeOutNotes"
                    label="Close-Out Notes"
                    type="textarea"
                    value={closeOutNotes || release.closeOutReport || release.closeOutNotes || ""}
                    onChange={(v) => setCloseOutNotes(v)}
                    placeholder="Document close-out observations, final checks, and sign-off details..."
                    rows={6}
                  />
                </div>
                <div className="rounded-xl border border-white/[0.06] p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Lessons Learned</h3>
                  <FormField
                    name="lessonsLearned"
                    label="Lessons Learned"
                    type="textarea"
                    value={lessonsLearned || release.lessonsLearned || ""}
                    onChange={(v) => setLessonsLearned(v)}
                    placeholder="What went well? What could be improved? Key takeaways for future releases..."
                    rows={6}
                  />
                </div>
                <button
                  onClick={() =>
                    closeMutation.mutate({
                      closeOutReport:
                        closeOutNotes ||
                        release.closeOutReport ||
                        release.closeOutNotes ||
                        "Release close-out completed.",
                      lessonsLearned: lessonsLearned || release.lessonsLearned || undefined,
                    })
                  }
                  disabled={closeMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1B7340, #0E5A2D)" }}
                >
                  {closeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Close Release
                </button>
              </>
            ) : release.status === "closed" ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-white/[0.06] p-6">
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Close-Out Notes</h3>
                  <p className="text-sm text-white whitespace-pre-wrap">{release.closeOutReport || release.closeOutNotes || "No close-out notes recorded."}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-6">
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Lessons Learned</h3>
                  <p className="text-sm text-white whitespace-pre-wrap">{release.lessonsLearned || "No lessons learned recorded."}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <FileText size={36} className="mx-auto mb-3 opacity-30" />
                <p>Close-out is available once the release is deployed.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

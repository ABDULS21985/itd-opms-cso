"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FlaskConical,
  Loader2,
  RotateCcw,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  LifecycleRail,
  WorkflowActionDrawer,
  type WorkflowActionPayload,
} from "@/components/itsm/workflow-experience";
import { useITSMAllowedTransitions, useITSMWorkflow } from "@/hooks/use-itsm";
import {
  useDecideTestSolutionSignoff,
  useTestSolutionCases,
  useTestSolutionRun,
  useTestSolutionSignoffs,
  useTransitionTestSolutionRun,
  useUpdateTestSolutionCase,
} from "@/hooks/use-test-solution";
import { TEST_TYPES } from "@/types/test-solution";
import type { ITSMWorkflowTransition, TestSolutionCase, TestSolutionSignoff } from "@/types";

type TabKey = "overview" | "cases" | "signoffs" | "evidence";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "cases", label: "Test Cases" },
  { key: "signoffs", label: "Sign-offs" },
  { key: "evidence", label: "Evidence" },
];

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(value?: string) {
  if (!value) return "";
  const acronyms: Record<string, string> = {
    it: "IT",
    itd: "ITD",
    ditd: "DITD",
    qa: "QA",
    uat: "UAT",
  };
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => acronyms[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function testTypeLabel(value: string) {
  return TEST_TYPES.find((item) => item.value === value)?.label ?? value.replace(/_/g, " ");
}

function jsonPreview(value?: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return "No evidence captured yet.";
  }
  return JSON.stringify(value, null, 2);
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p>
          <div className="mt-2 text-sm font-medium text-white">{value}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}1A` }}>
          <Icon size={17} style={{ color: tone }} />
        </div>
      </div>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "passed":
    case "signed":
    case "successful":
      return "text-green-400";
    case "failed":
    case "rejected":
      return "text-red-400";
    case "blocked":
      return "text-amber-400";
    default:
      return "text-white/55";
  }
}

export default function TestSolutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: run, isLoading } = useTestSolutionRun(id);
  const { data: casesData } = useTestSolutionCases(id);
  const { data: signoffsData } = useTestSolutionSignoffs(id);
  const { data: workflowDefinition } = useITSMWorkflow("test_solution");
  const transitionMutation = useTransitionTestSolutionRun(id);
  const updateCaseMutation = useUpdateTestSolutionCase(id);
  const decideSignoffMutation = useDecideTestSolutionSignoff(id);

  const cases = (casesData ?? run?.cases ?? []) as TestSolutionCase[];
  const signoffs = (signoffsData ?? run?.signoffs ?? []) as TestSolutionSignoff[];
  const uatSigned = useMemo(
    () =>
      signoffs.some(
        (item) =>
          (item.testType === "uat" || item.testType === "overall") &&
          item.status === "signed",
      ) ||
      ["signed", "approved"].includes(
        String((run?.uatSignoff as Record<string, unknown> | undefined)?.status ?? "").toLowerCase(),
      ),
    [run?.uatSignoff, signoffs],
  );
  const { data: transitionData } = useITSMAllowedTransitions("test_solution", run?.status, {
    uatSigned,
  });

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedTransition, setSelectedTransition] = useState<ITSMWorkflowTransition | null>(null);
  const [signoffNotes, setSignoffNotes] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/50">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Loading test solution run...
      </div>
    );
  }

  if (!run) {
    return <div className="py-32 text-center text-white/40">Test solution run not found</div>;
  }

  const transitions = transitionData?.transitions ?? [];
  const blockedTransitions = transitionData?.blockedTransitions ?? [];
  const passedCases = cases.filter((item) => item.status === "passed").length;
  const pendingSignoffs = signoffs.filter((item) => item.status === "pending").length;

  const handleWorkflowSubmit = (payload: WorkflowActionPayload) => {
    const note =
      payload.reason ||
      payload.internalNote ||
      payload.customerNote ||
      payload.resolutionNotes ||
      undefined;

    transitionMutation.mutate({
      targetStatus: payload.targetStatus,
      comment: note,
      failureReason:
        payload.targetStatus === "build_rework"
          ? note || "Returned to Build/Configure after failed test outcome"
          : undefined,
      evidence: {
        checklist: payload.checklist,
        customerNote: payload.customerNote || undefined,
        internalNote: payload.internalNote || undefined,
        recordedAt: new Date().toISOString(),
      },
      uatSignoff:
        payload.targetStatus === "release_handoff"
          ? { status: "signed", source: "workflow_drawer", recordedAt: new Date().toISOString() }
          : undefined,
    });
    setSelectedTransition(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => router.push("/dashboard/test-solutions")}
          className="mb-4 flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Test Solutions
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-white/50">{run.runNumber}</span>
              <StatusBadge status={run.status} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${statusTone(run.overallOutcome)}`}>
                {run.overallOutcome.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{run.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-white/50">{run.description || "No description provided."}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Required tests" value={run.requiredTestTypes.length} icon={FlaskConical} tone="#16A34A" />
        <SummaryTile label="Passed cases" value={`${passedCases}/${cases.length || 0}`} icon={CheckCircle2} tone="#2563EB" />
        <SummaryTile label="Pending sign-offs" value={pendingSignoffs} icon={UserCheck} tone="#D97706" />
        <SummaryTile label="Linked work" value={run.releaseNumber ?? run.changeTicketNumber ?? run.sourceType} icon={ClipboardCheck} tone="#7C3AED" />
      </div>

      <LifecycleRail
        definition={workflowDefinition}
        currentStatus={run.status}
        transitionData={transitionData}
        title="Test Solution Lifecycle"
      />

      {(transitions.length > 0 || blockedTransitions.length > 0) && (
        <section className="rounded-xl border border-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Test solution lifecycle actions</h2>
              {transitionData?.nextAction ? (
                <p className="text-xs text-white/40">Next required step: {transitionData.nextAction}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {transitions.map((transition) => (
              <button
                key={transition.value}
                type="button"
                onClick={() => setSelectedTransition(transition)}
                disabled={transitionMutation.isPending}
                className="rounded-lg border border-white/10 px-4 py-2 text-left text-sm font-medium text-white transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                <span className="block">{transition.label}</span>
                <span className="mt-1 block text-[11px] font-normal text-white/45">
                  R: {roleLabel(transition.responsibleRole) || "Unassigned"}
                  {transition.accountableRole ? ` | A: ${roleLabel(transition.accountableRole)}` : ""}
                </span>
              </button>
            ))}
            {blockedTransitions.slice(0, 6).map((transition) => (
              <button
                key={`blocked-${transition.value}`}
                type="button"
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
        </section>
      )}

      <WorkflowActionDrawer
        open={!!selectedTransition}
        entity="test_solution"
        currentStatus={run.status}
        recordTitle={run.title}
        transition={selectedTransition}
        isSubmitting={transitionMutation.isPending}
        onClose={() => setSelectedTransition(null)}
        onSubmit={handleWorkflowSubmit}
      />

      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-emerald-500 text-white"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <section className="rounded-xl border border-white/[0.06] p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Info label="Test Manager" value={run.testManagerName ?? "-"} />
            <Info label="Test Lead" value={run.testLeadName ?? "-"} />
            <Info label="Release Management Lead" value={run.releaseManagementLeadName ?? "-"} />
            <Info label="Created By" value={run.createdByName ?? run.createdBy} />
            <Info label="Created" value={formatDate(run.createdAt)} />
            <Info label="Updated" value={formatDate(run.updatedAt)} />
          </div>
          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Required test scope</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {run.requiredTestTypes.map((item) => (
                <span key={item} className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/65">
                  {testTypeLabel(item)}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "cases" && (
        <section className="overflow-x-auto rounded-xl border border-white/[0.06]">
          {cases.length === 0 ? (
            <div className="py-14 text-center text-white/40">No test cases have been created for this run.</div>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                  <th className="p-4 text-left">Case</th>
                  <th className="p-4 text-left">Type</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Assigned</th>
                  <th className="p-4 text-left">Completed</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((testCase) => (
                  <tr key={testCase.id} className="border-b border-white/[0.04]">
                    <td className="p-4">
                      <p className="font-medium text-white">{testCase.title}</p>
                      <p className="mt-1 text-xs text-white/35">{testCase.scriptReference ?? "No script reference"}</p>
                    </td>
                    <td className="p-4 text-white/60">{testTypeLabel(testCase.testType)}</td>
                    <td className={`p-4 capitalize ${statusTone(testCase.status)}`}>{testCase.status}</td>
                    <td className="p-4 text-white/50">{testCase.assignedToName ?? "-"}</td>
                    <td className="p-4 text-white/50">{formatDate(testCase.completedAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => updateCaseMutation.mutate({ caseId: testCase.id, status: "passed" })}
                          disabled={updateCaseMutation.isPending || testCase.status === "passed"}
                          className="rounded border border-green-500/25 px-2.5 py-1 text-xs font-medium text-green-400 disabled:opacity-35"
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCaseMutation.mutate({ caseId: testCase.id, status: "failed" })}
                          disabled={updateCaseMutation.isPending || testCase.status === "failed"}
                          className="rounded border border-red-500/25 px-2.5 py-1 text-xs font-medium text-red-400 disabled:opacity-35"
                        >
                          Fail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeTab === "signoffs" && (
        <section className="grid gap-4 md:grid-cols-2">
          {signoffs.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] py-14 text-center text-white/40 md:col-span-2">
              No sign-offs have been requested for this run.
            </div>
          ) : (
            signoffs.map((signoff) => (
              <div key={signoff.id} className="rounded-xl border border-white/[0.06] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{testTypeLabel(signoff.testType)}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {signoff.signerName ?? signoff.signerId} | {roleLabel(signoff.roleName)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${statusTone(signoff.status)}`}>
                    {signoff.status}
                  </span>
                </div>
                {signoff.comments ? <p className="mt-3 text-sm text-white/60">{signoff.comments}</p> : null}
                {signoff.status === "pending" ? (
                  <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                    <input
                      value={signoffNotes[signoff.id] ?? ""}
                      onChange={(event) =>
                        setSignoffNotes((current) => ({ ...current, [signoff.id]: event.target.value }))
                      }
                      placeholder="Decision comments"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          decideSignoffMutation.mutate({
                            signoffId: signoff.id,
                            status: "signed",
                            comments: signoffNotes[signoff.id] || undefined,
                          })
                        }
                        disabled={decideSignoffMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/25 px-3 py-1.5 text-xs font-medium text-green-400"
                      >
                        <CheckCircle2 size={13} />
                        Sign
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          decideSignoffMutation.mutate({
                            signoffId: signoff.id,
                            status: "rejected",
                            comments: signoffNotes[signoff.id] || undefined,
                          })
                        }
                        disabled={decideSignoffMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3 py-1.5 text-xs font-medium text-red-400"
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </section>
      )}

      {activeTab === "evidence" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <EvidenceBlock title="Requirements" value={run.requirements} />
          <EvidenceBlock title="Test Plan" value={run.testPlan} />
          <EvidenceBlock title="Readiness Checklist" value={run.readinessChecklist} />
          <EvidenceBlock title="Evidence" value={run.evidence} />
          <EvidenceBlock title="UAT Sign-off" value={run.uatSignoff} />
          <EvidenceBlock title="Failure Reason" value={run.failureReason ? { reason: run.failureReason } : undefined} />
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

function EvidenceBlock({ title, value }: { title: string; value?: unknown }) {
  return (
    <div className="rounded-xl border border-white/[0.06] p-5">
      <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-white">
        {title === "Failure Reason" ? <RotateCcw size={15} /> : <FileCheck2 size={15} />}
        {title}
      </p>
      <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/25 p-3 text-xs leading-5 text-white/60">
        {jsonPreview(value)}
      </pre>
    </div>
  );
}

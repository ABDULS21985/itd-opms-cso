"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  FileCheck2,
  HardDrive,
  Loader2,
  Package,
  ShieldCheck,
  UserCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  LifecycleRail,
  WorkflowActionDrawer,
  WorkflowBlockedActions,
  type WorkflowActionPayload,
} from "@/components/itsm/workflow-experience";
import { useAssetProcessEvents, useAssetProcessRun, useTransitionAssetProcessRun } from "@/hooks/use-cmdb";
import { useITSMAllowedTransitions, useITSMWorkflow } from "@/hooks/use-itsm";
import { ASSET_PROCESS_TYPES, type AssetProcessEvent, type ITSMWorkflowTransition } from "@/types";

type TabKey = "overview" | "events" | "evidence";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Decision Trail" },
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

function processTypeLabel(value: string) {
  return (
    ASSET_PROCESS_TYPES.find((item) => item.value === value)?.label ??
    value.replace(/_/g, " ")
  );
}

function roleLabel(value?: string) {
  if (!value) return "";
  const acronyms: Record<string, string> = {
    it: "IT",
    pssd: "PSSD",
  };
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => acronyms[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function jsonPreview(value?: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return "No evidence captured yet.";
  }
  return JSON.stringify(value, null, 2);
}

function stringField(fields: Record<string, string | boolean> | undefined, key: string) {
  const value = fields?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function boolField(fields: Record<string, string | boolean> | undefined, key: string) {
  const value = fields?.[key];
  return typeof value === "boolean" ? value : undefined;
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
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${tone}1A` }}
        >
          <Icon size={17} style={{ color: tone }} />
        </div>
      </div>
    </div>
  );
}

export default function AssetProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: run, isLoading } = useAssetProcessRun(id);
  const { data: events = [] } = useAssetProcessEvents(id);
  const { data: workflowDefinition } = useITSMWorkflow("asset_management");
  const transitionMutation = useTransitionAssetProcessRun(id);

  const workflowContext = useMemo(
    () => ({
      approvalRequired: !!run?.approvalRequired,
      assetSelected: !!(run?.assetId || run?.assignedAssetId),
      deliverySigned: !!run?.deliverySigned,
      dataWipeConfirmed: !!run?.dataWipeConfirmed,
      returnSigned: !!run?.returnSigned,
      buybackOption: !!run?.buybackOption,
    }),
    [
      run?.approvalRequired,
      run?.assetId,
      run?.assignedAssetId,
      run?.deliverySigned,
      run?.dataWipeConfirmed,
      run?.returnSigned,
      run?.buybackOption,
    ],
  );
  const { data: transitionData } = useITSMAllowedTransitions(
    "asset_management",
    run?.status,
    workflowContext,
  );

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedTransition, setSelectedTransition] = useState<ITSMWorkflowTransition | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/50">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Loading asset process...
      </div>
    );
  }

  if (!run) {
    return <div className="py-32 text-center text-white/40">Asset process not found</div>;
  }

  const transitions = transitionData?.transitions ?? [];
  const blockedTransitions = transitionData?.blockedTransitions ?? [];
  const assignedAsset = run.assignedAssetTag ?? run.assetTag ?? run.assetName ?? "-";

  const handleWorkflowSubmit = (payload: WorkflowActionPayload) => {
    const note =
      payload.reason ||
      payload.internalNote ||
      payload.customerNote ||
      payload.resolutionNotes ||
      undefined;
    const fields = payload.fields ?? {};

    transitionMutation.mutate({
      targetStatus: payload.targetStatus,
      comment: note,
      decision: stringField(fields, "approval_status") ?? stringField(fields, "availability_status"),
      assetId: stringField(fields, "asset_id"),
      assignedAssetId: stringField(fields, "assigned_asset_id"),
      stopGapAssetId: stringField(fields, "stop_gap_asset_id"),
      approvalStatus: stringField(fields, "approval_status"),
      availabilityStatus: stringField(fields, "availability_status"),
      requesterStatus: stringField(fields, "requester_status"),
      replacementEligible: boolField(fields, "replacement_eligible"),
      buybackOption: boolField(fields, "buyback_option"),
      buybackApproved: boolField(fields, "buyback_approved"),
      exitReason: stringField(fields, "exit_reason"),
      warrantyStatus: stringField(fields, "warranty_status"),
      dataWipeConfirmed: boolField(fields, "data_wipe_confirmed"),
      deliverySigned: boolField(fields, "delivery_signed"),
      returnSigned: boolField(fields, "return_signed"),
      evidence: {
        checklist: payload.checklist,
        customerNote: payload.customerNote || undefined,
        internalNote: payload.internalNote || undefined,
        requiredFields: fields,
        recordedAt: new Date().toISOString(),
      },
    });
    setSelectedTransition(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => router.push("/dashboard/cmdb/asset-process")}
          className="mb-4 flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Asset Process
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-white/50">{run.processNumber}</span>
              <StatusBadge status={run.status} />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/45">
                {processTypeLabel(run.processType)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{run.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-white/50">
              {run.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Requested for" value={run.requestedForName ?? run.requestedForId ?? "-"} icon={UserCheck} tone="#16A34A" />
        <SummaryTile label="Assigned asset" value={assignedAsset} icon={HardDrive} tone="#2563EB" />
        <SummaryTile label="Responsible" value={run.responsibleUserName ?? "Role based"} icon={ClipboardCheck} tone="#D97706" />
        <SummaryTile label="Accountable" value={run.accountableUserName ?? "IT Facilities"} icon={ShieldCheck} tone="#7C3AED" />
      </div>

      <LifecycleRail
        definition={workflowDefinition}
        currentStatus={run.status}
        transitionData={transitionData}
        title="Asset Management Lifecycle"
      />

      {(transitions.length > 0 || blockedTransitions.length > 0) && (
        <section className="rounded-xl border border-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Asset process lifecycle actions</h2>
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
                  R: {roleLabel(transition.responsibleRole) || "Role based"}
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
        entity="asset_management"
        currentStatus={run.status}
        recordTitle={run.title}
        transition={selectedTransition}
        isSubmitting={transitionMutation.isPending}
        onClose={() => setSelectedTransition(null)}
        onSubmit={handleWorkflowSubmit}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
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
                <Info label="Source" value={run.ticketNumber ?? run.requestNumber ?? run.sourceType} />
                <Info label="Approval required" value={run.approvalRequired ? "Yes" : "No"} />
                <Info label="Approval status" value={run.approvalStatus.replace(/_/g, " ")} />
                <Info label="Availability" value={run.availabilityStatus.replace(/_/g, " ")} />
                <Info label="Requester status" value={run.requesterStatus?.replace(/_/g, " ") ?? "-"} />
                <Info label="Warranty status" value={run.warrantyStatus?.replace(/_/g, " ") ?? "-"} />
                <Info label="Created by" value={run.createdByName ?? run.createdBy} />
                <Info label="Updated" value={formatDate(run.updatedAt)} />
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <ControlFlag label="Delivery signed" value={run.deliverySigned} />
                <ControlFlag label="Return signed" value={run.returnSigned} />
                <ControlFlag label="Data wipe confirmed" value={run.dataWipeConfirmed} />
              </div>
            </section>
          )}

          {activeTab === "events" && (
            <section className="rounded-xl border border-white/[0.06] p-5">
              {events.length === 0 ? (
                <div className="py-14 text-center text-white/40">No process events have been recorded.</div>
              ) : (
                <div className="space-y-3">
                  {events.map((event: AssetProcessEvent) => (
                    <div key={event.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {event.fromStatus ? `${event.fromStatus.replace(/_/g, " ")} to ` : ""}
                            {event.toStatus.replace(/_/g, " ")}
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            {event.actorName ?? event.actorId} | {formatDate(event.createdAt)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wider text-white/45">
                          {event.action}
                        </span>
                      </div>
                      {event.comment || event.decision ? (
                        <p className="mt-3 text-sm text-white/60">
                          {event.comment ?? event.decision}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "evidence" && (
            <section className="grid gap-4 lg:grid-cols-2">
              <EvidenceBlock title="Details" value={run.details} />
              <EvidenceBlock title="Evidence" value={run.evidence} />
            </section>
          )}
        </div>
        <div className="space-y-4">
          <WorkflowBlockedActions blocked={blockedTransitions} />
          <section className="rounded-xl border border-white/[0.06] p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <Wrench size={16} className="text-emerald-400" />
              BRD controls
            </p>
            <div className="mt-4 space-y-3 text-sm text-white/55">
              <p>Approval, asset availability, issue, configuration, user sign-off, buy-back, data wipe, and management reporting are captured as workflow gates.</p>
              <p>Every transition writes a decision event and can trigger CMDB asset lifecycle updates.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-1 text-sm capitalize text-white">{value}</p>
    </div>
  );
}

function ControlFlag({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/35">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${value ? "text-emerald-400" : "text-white/45"}`}>
        {value ? "Complete" : "Pending"}
      </p>
    </div>
  );
}

function EvidenceBlock({ title, value }: { title: string; value?: unknown }) {
  return (
    <div className="rounded-xl border border-white/[0.06] p-5">
      <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-white">
        <FileCheck2 size={15} />
        {title}
      </p>
      <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/25 p-3 text-xs leading-5 text-white/60">
        {jsonPreview(value)}
      </pre>
    </div>
  );
}

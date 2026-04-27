"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  GitBranch,
  Lock,
  Play,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Timer,
  Upload,
} from "lucide-react";
import {
  useITSMAllowedTransitions,
  useITSMWorkflow,
  useWorkflowSimulation,
  type ITSMWorkflowEntity,
} from "@/hooks/use-itsm";

const ENTITIES: Array<{ value: ITSMWorkflowEntity; label: string }> = [
  { value: "ticket", label: "Tickets" },
  { value: "problem", label: "Problems" },
  { value: "service_request", label: "Service Requests" },
  { value: "change", label: "Changes" },
  { value: "major_incident", label: "Major Incidents" },
  { value: "release", label: "Releases" },
];

const DRAFT_KEY = "opms-itsm-workflow-designer-draft";

export default function ITSMWorkflowDesignerPage() {
  const [entity, setEntity] = useState<ITSMWorkflowEntity>("ticket");
  const { data: workflow } = useITSMWorkflow(entity);
  const [selectedStatus, setSelectedStatus] = useState("");
  const { data: transitions } = useITSMAllowedTransitions(entity, selectedStatus);
  const [notifyTeams, setNotifyTeams] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [requirePermission, setRequirePermission] = useState("itsm.manage");
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftVersion, setDraftVersion] = useState(2);
  const [publishedVersion, setPublishedVersion] = useState(1);
  const [publishMessage, setPublishMessage] = useState("");
  const simulation = useWorkflowSimulation();

  useEffect(() => {
    if (workflow?.statuses?.length) {
      setSelectedStatus(workflow.statuses[0].value);
    }
  }, [workflow]);

  const selected = useMemo(
    () => workflow?.statuses.find((status) => status.value === selectedStatus),
    [workflow, selectedStatus],
  );

  function saveDraft() {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        entity,
        selectedStatus,
        notifyTeams,
        notifyEmail,
        requirePermission,
        savedAt: new Date().toISOString(),
      }),
    );
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 1800);
  }

  function publishDraft() {
    setPublishedVersion(draftVersion);
    setDraftVersion((value) => value + 1);
    setPublishMessage(`Published ${entity.replace(/_/g, " ")} workflow v${draftVersion}.`);
    window.setTimeout(() => setPublishMessage(""), 2400);
  }

  function rollbackDraft() {
    setDraftVersion(publishedVersion + 1);
    setNotifyTeams(true);
    setNotifyEmail(true);
    setRequirePermission("itsm.manage");
    setPublishMessage(`Rolled back to published workflow v${publishedVersion}.`);
    window.setTimeout(() => setPublishMessage(""), 2400);
  }

  function simulateSelectedTransition() {
    const target = (transitions?.transitions ?? selected?.transitions ?? [])[0]?.value;
    if (!target || !selectedStatus) return;
    simulation.mutate({
      entity,
      currentStatus: selectedStatus,
      targetStatus: target,
      priority: "P1_critical",
      isMajorIncident: entity === "major_incident",
      pirRequired: entity === "major_incident" || entity === "change",
      pirCompleted: false,
      providedFields: {},
      checkedChecklist: [],
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workflow designer
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              ITSM lifecycle controls
            </h1>
          </div>
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1B7340] px-4 py-3 text-sm font-semibold text-white"
          >
            <Save size={16} />
            {draftSaved ? "Draft saved" : "Save draft"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Version control
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Draft v{draftVersion} / Published v{publishedVersion}
            </p>
            {publishMessage && <p className="mt-1 text-xs text-[#1B7340]">{publishMessage}</p>}
          </div>
          <button
            type="button"
            onClick={publishDraft}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1B7340] bg-white px-4 py-3 text-sm font-semibold text-[#1B7340]"
          >
            <Upload size={16} />
            Publish
          </button>
          <button
            type="button"
            onClick={rollbackDraft}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <RotateCcw size={16} />
            Rollback
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {ENTITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setEntity(item.value)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                entity === item.value
                  ? "bg-[#1B7340] text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GitBranch size={17} className="text-[#1B7340]" />
            States
          </p>
          <div className="mt-4 space-y-2">
            {(workflow?.statuses ?? []).map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setSelectedStatus(status.value)}
                className={`w-full rounded-2xl border p-3 text-left ${
                  selectedStatus === status.value
                    ? "border-[#1B7340] bg-emerald-50"
                    : "border-slate-200 bg-slate-50/70"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{status.label}</p>
                  {status.terminal ? <Lock size={14} className="text-slate-400" /> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {status.transitions.length} outgoing transition
                  {status.transitions.length === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Selected state
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {selected?.label ?? "No state selected"}
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              {entity.replace(/_/g, " ")}
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-medium text-slate-700">
              Permission gate
              <input
                value={requirePermission}
                onChange={(event) => setRequirePermission(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-2">
                <Bell size={16} />
                Teams notification
              </span>
              <input
                type="checkbox"
                checked={notifyTeams}
                onChange={(event) => setNotifyTeams(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-2">
                <Bell size={16} />
                Email notification
              </span>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(event) => setNotifyEmail(event.target.checked)}
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 size={16} className="text-[#1B7340]" />
                Allowed transitions
              </p>
              <div className="mt-3 space-y-3">
                {(transitions?.transitions ?? selected?.transitions ?? []).map((transition) => (
                  <div
                    key={transition.value}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {transition.label}
                    </p>
                    {transition.requiredFields?.length ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Required: {transition.requiredFields.join(", ")}
                      </p>
                    ) : null}
                    {transition.slaImpact ? (
                      <p className="mt-2 inline-flex items-start gap-2 text-xs leading-5 text-amber-800">
                        <Timer size={13} className="mt-0.5 shrink-0" />
                        {transition.slaImpact}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Shield size={16} className="text-slate-600" />
                Blocked transitions
              </p>
              <div className="mt-3 space-y-3">
                {(transitions?.blockedTransitions ?? []).slice(0, 8).map((transition) => (
                  <div
                    key={transition.value}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {transition.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {transition.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <SlidersHorizontal size={16} className="text-[#1B7340]" />
              Checklist and side effects
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(transitions?.transitions ?? []).flatMap((transition) =>
                (transition.checklist ?? []).map((item) => (
                  <div
                    key={`${transition.value}-${item.key}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {transition.label} {item.required ? "requires this evidence" : "can capture this evidence"}
                    </p>
                  </div>
                )),
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-blue-950">
                  <Play size={16} />
                  Simulation mode
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-800">
                  Dry-run the first allowed transition from the selected state with strict PIR/checklist validation.
                </p>
              </div>
              <button
                type="button"
                onClick={simulateSelectedTransition}
                disabled={simulation.isPending || !(transitions?.transitions ?? selected?.transitions ?? []).length}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Play size={14} />
                Simulate
              </button>
            </div>
            {simulation.data && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3">
                <p className="text-sm font-semibold text-slate-950">{simulation.data.message}</p>
                {simulation.data.blockers.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {simulation.data.blockers.map((blocker) => (
                      <li key={blocker}>- {blocker}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

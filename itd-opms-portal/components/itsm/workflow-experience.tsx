"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  Info,
  Layers,
  Lightbulb,
  Lock,
  Radio,
  Route,
  ShieldAlert,
  Sparkles,
  Timer,
  Users,
  X,
} from "lucide-react";
import type {
  ITSMWorkflowDefinition,
  ITSMWorkflowTransition,
  ITSMWorkflowTransitionResponse,
  KBSuggestion,
  MajorIncidentRecord,
  Ticket,
  TicketStatusHistory,
} from "@/types";

export interface WorkflowActionPayload {
  targetStatus: string;
  reason?: string;
  resolutionCategory?: string;
  resolutionNotes?: string;
  customerNote?: string;
  internalNote?: string;
  rootCause?: string;
  kbDisposition?: string;
  fields?: Record<string, string | boolean>;
  checklist: Record<string, boolean>;
}

interface WorkflowActionDrawerProps {
  open: boolean;
  entity: string;
  currentStatus: string;
  recordTitle: string;
  transition?: ITSMWorkflowTransition | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: WorkflowActionPayload) => void;
}

function humanize(value?: string) {
  return value ? value.replace(/_/g, " ") : "not set";
}

function roleLabel(value?: string) {
  if (!value) return "";
  const acronyms: Record<string, string> = {
    it: "IT",
    ci: "CI",
    rca: "RCA",
    kb: "KB",
    sla: "SLA",
  };
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => acronyms[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function minutesUntil(value?: string) {
  if (!value) return null;
  const delta = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(delta)) return null;
  return Math.round(delta / 60000);
}

function formatMinutes(minutes: number) {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs}m`;
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

const workflowFieldLabels: Record<string, string> = {
  approval_status: "Approval status",
  availability_status: "Availability status",
  requester_status: "Requester status",
  replacement_eligible: "Replacement eligible",
  buyback_option: "Buy-back option",
  buyback_approved: "Buy-back approved",
  exit_reason: "Exit or transfer reason",
  warranty_status: "Warranty status",
  asset_id: "Asset ID",
  assigned_asset_id: "Assigned asset ID",
  stop_gap_asset_id: "Stop-gap asset ID",
  data_wipe_confirmed: "Data wipe confirmed",
  delivery_signed: "Delivery form signed",
  return_signed: "Return or job completion signed",
};

const workflowBooleanFields = new Set([
  "replacement_eligible",
  "buyback_option",
  "buyback_approved",
  "data_wipe_confirmed",
  "delivery_signed",
  "return_signed",
]);

export function WorkflowActionDrawer({
  open,
  entity,
  currentStatus,
  recordTitle,
  transition,
  isSubmitting,
  onClose,
  onSubmit,
}: WorkflowActionDrawerProps) {
  const [reason, setReason] = useState("");
  const [resolutionCategory, setResolutionCategory] = useState("fixed");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [kbDisposition, setKbDisposition] = useState("linked");
  const [fields, setFields] = useState<Record<string, string | boolean>>({});
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !transition) return;
    setReason("");
    setResolutionCategory("fixed");
    setResolutionNotes("");
    setCustomerNote("");
    setInternalNote("");
    setRootCause("");
    setKbDisposition("linked");
    setFields(
      Object.fromEntries(
        (transition.requiredFields ?? [])
          .filter(
            (field) =>
              ![
                "comment",
                "notes",
                "reason",
                "resolution_notes",
                "root_cause",
              ].includes(field),
          )
          .map((field) => [field, workflowBooleanFields.has(field) ? false : ""]),
      ),
    );
    setChecklist(
      Object.fromEntries((transition.checklist ?? []).map((item) => [item.key, false])),
    );
  }, [open, transition]);

  const requiredFields = transition?.requiredFields ?? [];
  const needsResolution =
    requiredFields.includes("resolution_notes") ||
    transition?.value === "resolved" ||
    transition?.value === "pir_pending";
  const needsRootCause =
    requiredFields.includes("root_cause") ||
    (entity === "major_incident" && transition?.value === "resolved") ||
    (entity === "problem" && transition?.value === "root_cause_identified");
  const needsTransitionReason =
    requiredFields.includes("comment") ||
    requiredFields.includes("notes") ||
    requiredFields.includes("reason");

  const requiredChecklistComplete = (transition?.checklist ?? [])
    .filter((item) => item.required)
    .every((item) => checklist[item.key]);
  const requiredFieldsComplete =
    (!requiredFields.includes("resolution_notes") || resolutionNotes.trim().length > 0) &&
    (!requiredFields.includes("root_cause") || rootCause.trim().length > 0) &&
    requiredFields
      .filter(
        (field) =>
          ![
            "comment",
            "notes",
            "reason",
            "resolution_notes",
            "root_cause",
          ].includes(field),
      )
      .every((field) => {
        const value = fields[field];
        return typeof value === "boolean" ? value : String(value ?? "").trim().length > 0;
      }) &&
    (!needsTransitionReason ||
      reason.trim().length > 0 ||
      internalNote.trim().length > 0 ||
      customerNote.trim().length > 0 ||
      resolutionNotes.trim().length > 0);
  const canSubmit = !!transition && requiredChecklistComplete && requiredFieldsComplete;

  return (
    <AnimatePresence>
      {open && transition ? (
        <motion.div
          className="fixed inset-0 z-[90] bg-slate-950/38 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto bg-white shadow-[-24px_0_70px_rgba(15,23,42,0.18)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            aria-label="Workflow action"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {humanize(entity)} transition
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    {transition.label}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {humanize(currentStatus)} to {humanize(transition.value)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                  aria-label="Close workflow action"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Record
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{recordTitle}</p>
                {transition.slaImpact ? (
                  <p className="mt-3 inline-flex items-start gap-2 text-sm leading-6 text-amber-800">
                    <Timer size={16} className="mt-0.5 shrink-0" />
                    {transition.slaImpact}
                  </p>
                ) : null}
              </div>

              {transition.checklist && transition.checklist.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Completion checklist
                  </p>
                  <div className="mt-4 space-y-3">
                    {transition.checklist.map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={!!checklist[item.key]}
                          onChange={(event) =>
                            setChecklist((current) => ({
                              ...current,
                              [item.key]: event.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <span>
                          <span className="font-medium text-slate-900">{item.label}</span>
                          {item.required ? (
                            <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                              Required
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ) : null}

              {needsResolution ? (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Resolution category
                      <select
                        value={resolutionCategory}
                        onChange={(event) => setResolutionCategory(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="fixed">Fixed</option>
                        <option value="workaround">Workaround applied</option>
                        <option value="duplicate">Duplicate</option>
                        <option value="unable_to_reproduce">Unable to reproduce</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      KB disposition
                      <select
                        value={kbDisposition}
                        onChange={(event) => setKbDisposition(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="linked">KB linked</option>
                        <option value="not_applicable">Not applicable</option>
                        <option value="needs_article">Needs new article</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-slate-700">
                    Resolution notes
                    <textarea
                      value={resolutionNotes}
                      onChange={(event) => setResolutionNotes(event.target.value)}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      placeholder="Summarize the fix, validation, and remaining customer impact."
                    />
                  </label>
                </section>
              ) : null}

              {needsRootCause ? (
                <label className="block rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
                  Root cause hint
                  <textarea
                    value={rootCause}
                    onChange={(event) => setRootCause(event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder="Capture the cause or investigation finding behind this transition."
                  />
                </label>
              ) : null}

              {Object.keys(fields).length > 0 ? (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Required workflow data
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(fields).map(([key, value]) =>
                      workflowBooleanFields.has(key) ? (
                        <label
                          key={key}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-medium text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(event) =>
                              setFields((current) => ({
                                ...current,
                                [key]: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          {workflowFieldLabels[key] ?? humanize(key)}
                        </label>
                      ) : (
                        <label key={key} className="block text-sm font-medium text-slate-700">
                          {workflowFieldLabels[key] ?? humanize(key)}
                          <input
                            value={String(value ?? "")}
                            onChange={(event) =>
                              setFields((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            placeholder={workflowFieldLabels[key] ?? humanize(key)}
                          />
                        </label>
                      ),
                    )}
                  </div>
                </section>
              ) : null}

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="block text-sm font-medium text-slate-700">
                  Customer-facing note
                  <textarea
                    value={customerNote}
                    onChange={(event) => setCustomerNote(event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder="Message visible to the requester or stakeholders."
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Internal note
                  <textarea
                    value={internalNote}
                    onChange={(event) => setInternalNote(event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder="Operational context for audit, handoff, or follow-up."
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Transition reason
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder="Short reason for the decision trail."
                  />
                </label>
              </section>

              {transition.decisionTrail && transition.decisionTrail.length > 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <FileText size={16} />
                    Decision trail captured
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {transition.decisionTrail.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800"
                      >
                        {humanize(item)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || isSubmitting}
                  onClick={() =>
                    onSubmit({
                      targetStatus: transition.value,
                      reason: reason || customerNote || undefined,
                      resolutionCategory,
                      resolutionNotes,
                      customerNote,
                      internalNote,
                      rootCause,
                      kbDisposition,
                      fields,
                      checklist,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1B7340] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  Confirm {transition.label}
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

interface LifecycleRailProps {
  definition?: ITSMWorkflowDefinition;
  currentStatus?: string;
  transitionData?: ITSMWorkflowTransitionResponse;
  title?: string;
}

export function LifecycleRail({
  definition,
  currentStatus,
  transitionData,
  title = "Lifecycle",
}: LifecycleRailProps) {
  const statuses = definition?.statuses ?? [];
  const currentIndex = statuses.findIndex((status) => status.value === currentStatus);
  const currentWorkflowState = statuses.find((status) => status.value === currentStatus);
  const nextActions = transitionData?.transitions ?? currentWorkflowState?.transitions ?? [];
  const blocked = transitionData?.blockedTransitions ?? [];
  const impact = nextActions.find((item) => item.slaImpact)?.slaImpact;
  const nextActionLabel = transitionData?.nextAction ?? nextActions[0]?.label;

  if (!definition || !currentStatus || statuses.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white/92 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            {humanize(currentStatus)}
          </h3>
        </div>
        {nextActionLabel ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <ArrowRight size={14} />
            {nextActionLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            <Lock size={14} />
            Terminal
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-6">
        {statuses.map((status, index) => {
          const isCurrent = status.value === currentStatus;
          const isDone = currentIndex >= 0 && index < currentIndex;
          const isAllowed = nextActions.some((item) => item.value === status.value);
          const blockedMatch = blocked.find((item) => item.value === status.value);
          return (
            <div
              key={status.value}
              className={`min-h-[92px] rounded-2xl border p-3 ${
                isCurrent
                  ? "border-[#1B7340] bg-emerald-50"
                  : isAllowed
                    ? "border-blue-200 bg-blue-50/70"
                    : isDone
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isCurrent || isDone
                      ? "bg-[#1B7340] text-white"
                      : isAllowed
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={15} /> : index + 1}
                </span>
                {blockedMatch ? <Lock size={14} className="text-slate-400" /> : null}
              </div>
              <p className="mt-3 text-sm font-semibold capitalize text-slate-900">
                {status.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {isCurrent
                  ? "Current status"
                  : isAllowed
                    ? "Available now"
                    : blockedMatch?.reason ?? (isDone ? "Completed" : "Pending path")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles size={16} className="text-[#1B7340]" />
            Next allowed actions
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nextActions.length > 0 ? (
              nextActions.map((item) => (
                <span
                  key={item.value}
                  className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <span>{item.label}</span>
                  {item.responsibleRole || item.accountableRole ? (
                    <span className="mt-1 block font-medium text-slate-500">
                      {item.responsibleRole ? `R: ${roleLabel(item.responsibleRole)}` : ""}
                      {item.responsibleRole && item.accountableRole ? " · " : ""}
                      {item.accountableRole ? `A: ${roleLabel(item.accountableRole)}` : ""}
                    </span>
                  ) : null}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No outgoing actions.</span>
            )}
          </div>
          {impact ? (
            <p className="mt-3 inline-flex items-start gap-2 text-xs leading-5 text-amber-800">
              <Timer size={14} className="mt-0.5 shrink-0" />
              {impact}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Info size={16} className="text-slate-500" />
            Blocked action hints
          </p>
          <div className="mt-3 space-y-2">
            {blocked.slice(0, 4).map((item) => (
              <div key={item.value} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                <Lock size={13} className="mt-1 shrink-0 text-slate-400" />
                <span>
                  <span className="font-semibold text-slate-800">{item.label}:</span>{" "}
                  {item.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SLARiskForecast({
  responseTarget,
  resolutionTarget,
  responseMet,
  resolutionMet,
  isPaused,
}: {
  responseTarget?: string;
  resolutionTarget?: string;
  responseMet?: boolean;
  resolutionMet?: boolean;
  isPaused?: boolean;
}) {
  const responseMinutes = minutesUntil(responseTarget);
  const resolutionMinutes = minutesUntil(resolutionTarget);
  const critical = resolutionMinutes !== null && resolutionMinutes <= 60 && !resolutionMet;
  const overdue = resolutionMinutes !== null && resolutionMinutes < 0 && !resolutionMet;

  const label = isPaused
    ? "Paused"
    : overdue
      ? "Breached"
      : critical
        ? `At risk in ${formatMinutes(resolutionMinutes)}`
        : resolutionMinutes !== null
          ? `${formatMinutes(resolutionMinutes)} remaining`
          : "No active target";

  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white/92 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Timer size={17} className={overdue || critical ? "text-rose-600" : "text-[#1B7340]"} />
        SLA risk forecast
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-xs text-slate-500">Resolution posture</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Response
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {responseMet
              ? "Met"
              : responseMinutes !== null
                ? `${formatMinutes(responseMinutes)} ${responseMinutes < 0 ? "overdue" : "left"}`
                : "Not tracked"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Pause posture
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {isPaused ? "Clock paused" : "Pause eligible on customer or vendor wait"}
          </p>
        </div>
      </div>
    </section>
  );
}

export function RoutingInsightPanel({ ticket }: { ticket: Ticket }) {
  const resolutionMinutes = minutesUntil(ticket.slaResolutionTarget);
  const urgency =
    resolutionMinutes !== null && resolutionMinutes < 60
      ? "Critical SLA pressure"
      : ticket.priority?.includes("P1") || ticket.priority?.includes("P2")
        ? "High priority route"
        : "Standard route";
  const workloadScore = ticket.assigneeId ? 68 : 42;

  const signals = [
    {
      icon: Route,
      label: "Queue rule matched",
      value: ticket.teamQueueName || ticket.category || "Default service desk",
    },
    {
      icon: Lightbulb,
      label: "Skill match",
      value: ticket.category ? `${ticket.category} resolver profile` : "General support profile",
    },
    {
      icon: Timer,
      label: "SLA urgency",
      value: urgency,
    },
    {
      icon: Users,
      label: "Workload score",
      value: `${workloadScore}/100 ${ticket.assigneeId ? "assigned" : "available for routing"}`,
    },
    {
      icon: GitBranch,
      label: "Similar records",
      value:
        ticket.relatedTicketIds.length > 0
          ? `${ticket.relatedTicketIds.length} linked ticket candidates`
          : "No linked ticket pattern yet",
    },
  ];

  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white/92 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Route size={17} className="text-[#1B7340]" />
        Assignment intelligence
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {signals.map((signal) => {
          const Icon = signal.icon;
          return (
            <div key={signal.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <Icon size={14} />
                {signal.label}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{signal.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SuggestedKnowledgePanel({
  suggestions,
  linkedProblemId,
  relatedTicketCount,
}: {
  suggestions: KBSuggestion[];
  linkedProblemId?: string;
  relatedTicketCount: number;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white/92 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Lightbulb size={17} className="text-amber-500" />
        Suggested knowledge and patterns
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Matching KB
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {suggestions.length > 0 ? suggestions[0].title : "No strong match yet"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Known problem
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {linkedProblemId ? `Problem ${linkedProblemId.slice(0, 8)}` : "No linked problem"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Similar tickets
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {relatedTicketCount > 0 ? `${relatedTicketCount} related` : "No related tickets"}
          </p>
        </div>
      </div>
    </section>
  );
}

export function DecisionTrailPanel({
  history,
}: {
  history: TicketStatusHistory[];
}) {
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white/92 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <FileText size={17} className="text-[#1B7340]" />
        Decision trail
      </p>
      <div className="mt-4 space-y-3">
        {history.length > 0 ? (
          history.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {humanize(entry.fromStatus)} to {humanize(entry.toStatus)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {entry.reason || "No reason recorded"}
                </p>
              </div>
              <p className="text-right text-xs text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-500">
            No workflow decisions recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}

export function MajorIncidentLiveRoom({ incident }: { incident: MajorIncidentRecord }) {
  const frequency = incident.communicationPlan?.updateFrequencyMinutes || 30;
  const nextUpdate = incident.lastUpdateAt
    ? new Date(new Date(incident.lastUpdateAt).getTime() + frequency * 60000)
    : new Date(new Date(incident.declaredAt).getTime() + frequency * 60000);
  const dueMinutes = Math.round((nextUpdate.getTime() - Date.now()) / 60000);
  const pirReady =
    !!incident.resolutionSummary &&
    !!incident.rootCauseSummary &&
    incident.status !== "declared" &&
    incident.status !== "investigating";

  const cells = [
    { icon: Radio, label: "Bridge", value: incident.bridgeUrl || incident.bridgePhone || "Not set" },
    {
      icon: ShieldAlert,
      label: "Commander",
      value: incident.incidentCommander?.displayName || incident.incidentCommanderId || "Unassigned",
    },
    {
      icon: Users,
      label: "Comms lead",
      value: incident.communicationLead?.displayName || incident.communicationLeadId || "Unassigned",
    },
    {
      icon: Clock,
      label: "Next update",
      value: dueMinutes >= 0 ? `Due in ${formatMinutes(dueMinutes)}` : `${formatMinutes(dueMinutes)} overdue`,
    },
    {
      icon: Layers,
      label: "Affected services",
      value: incident.affectedServices.length > 0 ? incident.affectedServices.join(", ") : "Not recorded",
    },
    {
      icon: FileText,
      label: "PIR readiness",
      value: pirReady ? "Ready for PIR handoff" : "Needs resolution summary and RCA",
    },
  ];

  return (
    <section className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-5 shadow-[0_18px_46px_rgba(127,29,29,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
            Major incident live room
          </p>
          <h3 className="mt-1 text-xl font-semibold text-rose-950">
            {incident.ticket?.title ?? incident.id}
          </h3>
        </div>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
          {incident.severity}
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cells.map((cell) => {
          const Icon = cell.icon;
          return (
            <div key={cell.label} className="rounded-2xl border border-rose-100 bg-white/82 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">
                <Icon size={14} />
                {cell.label}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{cell.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function WorkflowBlockedActions({
  blocked,
}: {
  blocked?: ITSMWorkflowTransition[];
}) {
  if (!blocked || blocked.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <AlertTriangle size={16} className="text-amber-500" />
        Why actions are unavailable
      </p>
      <div className="mt-3 space-y-2">
        {blocked.slice(0, 5).map((item) => (
          <p key={item.value} className="text-xs leading-5 text-slate-600">
            <span className="font-semibold text-slate-900">{item.label}:</span>{" "}
            {item.reason}
          </p>
        ))}
      </div>
    </div>
  );
}

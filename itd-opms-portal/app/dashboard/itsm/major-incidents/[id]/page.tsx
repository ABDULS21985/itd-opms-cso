"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  Megaphone,
  PhoneCall,
  RadioTower,
  Siren,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useMajorIncident,
  usePostMajorIncidentUpdate,
  useResolveMajorIncident,
  useSubmitMajorIncidentPIR,
  useTransitionMajorIncident,
} from "@/hooks/use-itsm";

type UpdateType = "status_update" | "comms" | "technical";

interface PersonCardProps {
  label: string;
  person?: {
    displayName: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    department?: string;
    jobTitle?: string;
  };
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

interface PirFormState {
  whatHappened: string;
  timeline: string;
  rootCause: string;
  contributingFactors: string;
  correctiveActions: string;
  preventiveActions: string;
  lessonsLearned: string;
}

function severityMeta(severity: string) {
  switch (severity) {
    case "sev1":
      return {
        label: "SEV-1",
        color: "#DC2626",
        banner:
          "linear-gradient(135deg, rgba(127,29,29,0.96), rgba(68,10,15,0.96))",
        surface: "rgba(220,38,38,0.12)",
      };
    case "sev2":
      return {
        label: "SEV-2",
        color: "#EA580C",
        banner:
          "linear-gradient(135deg, rgba(154,52,18,0.96), rgba(67,20,7,0.96))",
        surface: "rgba(249,115,22,0.12)",
      };
    default:
      return {
        label: "SEV-3",
        color: "#CA8A04",
        banner:
          "linear-gradient(135deg, rgba(133,77,14,0.96), rgba(68,39,5,0.96))",
        surface: "rgba(234,179,8,0.14)",
      };
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "declared":
    case "investigating":
      return "error" as const;
    case "mitigating":
    case "monitoring":
    case "pir_pending":
      return "warning" as const;
    case "mitigated":
    case "resolved":
    case "closed":
      return "success" as const;
    default:
      return "default" as const;
  }
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(
  declaredAt?: string,
  resolvedAt?: string,
  closedAt?: string,
  now = Date.now(),
) {
  if (!declaredAt) {
    return "0m";
  }

  const end = closedAt ?? resolvedAt;
  const endValue = end ? new Date(end).getTime() : now;
  const minutes = Math.max(
    0,
    Math.floor((endValue - new Date(declaredAt).getTime()) / 60000),
  );
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function listToText(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
    .join("\n");
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function PersonCard({ label, person }: PersonCardProps) {
  const initials = person?.displayName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <div className="mt-4 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[rgba(37,99,235,0.12)] text-sm font-semibold text-[var(--primary)]">
          {person?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photoUrl}
              alt={person.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials || "--"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {person?.displayName ?? "Unassigned"}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {person?.jobTitle ?? "Role pending"}
          </p>
          <div className="mt-3 space-y-1 text-xs text-[var(--text-tertiary)]">
            <p>{person?.department ?? "Department unavailable"}</p>
            <p>{person?.email ?? "Email unavailable"}</p>
            <p>{person?.phone ?? "Phone unavailable"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  tone = "primary",
  disabled,
}: ActionButtonProps) {
  const toneClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-500"
      : tone === "secondary"
        ? "border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
        : "bg-[var(--primary)] text-white hover:opacity-90";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {label}
    </button>
  );
}

export default function MajorIncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";

  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<"updates" | "pir">("updates");
  const [updateType, setUpdateType] = useState<UpdateType>("status_update");
  const [updateMessage, setUpdateMessage] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [pirForm, setPirForm] = useState<PirFormState>({
    whatHappened: "",
    timeline: "",
    rootCause: "",
    contributingFactors: "",
    correctiveActions: "",
    preventiveActions: "",
    lessonsLearned: "",
  });

  const { data: incident, isLoading } = useMajorIncident(id || undefined);
  const transitionMutation = useTransitionMajorIncident();
  const updateMutation = usePostMajorIncidentUpdate();
  const resolveMutation = useResolveMajorIncident();
  const pirMutation = useSubmitMajorIncidentPIR();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!incident) {
      return;
    }

    setResolutionSummary(incident.resolutionSummary ?? "");
    setRootCause(incident.rootCauseSummary ?? "");

    const report = (incident.pirReport ?? {}) as Record<string, unknown>;

    setPirForm({
      whatHappened:
        typeof report.whatHappened === "string" ? report.whatHappened : "",
      timeline: listToText(report.timeline),
      rootCause:
        typeof report.rootCause === "string"
          ? report.rootCause
          : incident.rootCauseSummary ?? "",
      contributingFactors: listToText(report.contributingFactors),
      correctiveActions: listToText(report.correctiveActions),
      preventiveActions: listToText(report.preventiveActions),
      lessonsLearned:
        typeof report.lessonsLearned === "string" ? report.lessonsLearned : "",
    });
  }, [incident]);

  useEffect(() => {
    if (
      incident &&
      (incident.status === "resolved" ||
        incident.status === "pir_pending" ||
        incident.status === "closed")
    ) {
      setActiveTab("pir");
    }
  }, [incident]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-[32px] bg-[var(--surface-1)]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <div className="h-72 animate-pulse rounded-[28px] bg-[var(--surface-1)]" />
            <div className="h-72 animate-pulse rounded-[28px] bg-[var(--surface-1)]" />
          </div>
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-[28px] bg-[var(--surface-1)]" />
            <div className="h-64 animate-pulse rounded-[28px] bg-[var(--surface-1)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-10 text-center">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Major incident not found
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          The requested record could not be loaded or you do not have access to it.
        </p>
        <Link
          href="/dashboard/itsm/major-incidents"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white"
        >
          <ArrowLeft size={16} />
          Back to command center
        </Link>
      </div>
    );
  }

  const severity = severityMeta(incident.severity);
  const updates = [...incident.stakeholderUpdates].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
  const showPirTab =
    incident.status === "resolved" ||
    incident.status === "pir_pending" ||
    incident.status === "closed" ||
    !!incident.resolvedAt;

  const busy =
    transitionMutation.isPending ||
    updateMutation.isPending ||
    resolveMutation.isPending ||
    pirMutation.isPending;
  const incidentID = incident.id;

  async function postUpdate() {
    if (!updateMessage.trim()) {
      return;
    }

    await updateMutation.mutateAsync({
      id: incidentID,
      message: updateMessage.trim(),
      updateType,
    });
    setUpdateMessage("");
  }

  async function submitResolution() {
    if (!resolutionSummary.trim() || !rootCause.trim()) {
      return;
    }

    await resolveMutation.mutateAsync({
      id: incidentID,
      resolutionSummary: resolutionSummary.trim(),
      rootCause: rootCause.trim(),
    });
    setShowResolveForm(false);
  }

  async function submitPir() {
    await pirMutation.mutateAsync({
      id: incidentID,
      pirReport: {
        whatHappened: pirForm.whatHappened.trim(),
        timeline: splitLines(pirForm.timeline),
        rootCause: pirForm.rootCause.trim(),
        contributingFactors: splitLines(pirForm.contributingFactors),
        correctiveActions: splitLines(pirForm.correctiveActions),
        preventiveActions: splitLines(pirForm.preventiveActions),
        lessonsLearned: pirForm.lessonsLearned.trim(),
      },
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <section
        className="relative overflow-hidden rounded-[34px] border p-6 text-white shadow-[0_42px_140px_-78px_rgba(15,23,42,1)] md:p-8"
        style={{
          background: severity.banner,
          borderColor: `${severity.color}55`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_34%),radial-gradient(circle_at_15%_20%,_rgba(250,204,21,0.12),_transparent_18%)]" />
        <div className="relative">
          <Link
            href="/dashboard/itsm/major-incidents"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80"
          >
            <ArrowLeft size={14} />
            Back to command center
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "#FFFFFF",
              }}
            >
              {severity.label}
            </span>
            <StatusBadge
              status={incident.status}
              variant={statusVariant(incident.status)}
            />
            <StatusBadge status={incident.ticket?.status ?? "unknown"} />
            <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-white/80">
              {incident.ticket?.ticketNumber ?? incident.ticketId}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {incident.ticket?.title ?? "Major incident command board"}
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/74 md:text-base">
                Declared {formatDateTime(incident.declaredAt)}. Use this board for stakeholder comms, bridge coordination, state transitions, and the PIR handoff.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/56">
                  Duration
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {formatDuration(
                    incident.declaredAt,
                    incident.resolvedAt,
                    incident.closedAt,
                    now,
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/56">
                  Impact
                </p>
                <p className="mt-2 text-lg font-semibold capitalize">
                  {incident.businessImpact ?? "Unclassified"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/56">
                  Affected Users
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {incident.estimatedAffectedUsers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("updates")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === "updates"
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)]"
              }`}
            >
              Timeline & Updates
            </button>
            {showPirTab ? (
              <button
                type="button"
                onClick={() => setActiveTab("pir")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "pir"
                    ? "bg-[var(--primary)] text-white"
                    : "border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-secondary)]"
                }`}
              >
                PIR
              </button>
            ) : null}
          </div>

          {activeTab === "updates" ? (
            <>
              <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Status Timeline
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                      Response progression
                    </h2>
                  </div>
                  <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {incident.timeline?.length ?? 0} entries
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {(incident.timeline ?? []).length > 0 ? (
                    incident.timeline?.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="relative pl-8"
                      >
                        <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-[var(--primary)]" />
                        {index < (incident.timeline?.length ?? 0) - 1 ? (
                          <div className="absolute left-[5px] top-4 h-[calc(100%+12px)] w-px bg-[var(--border)]" />
                        ) : null}

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {entry.label}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {formatDateTime(entry.timestamp)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {entry.description ?? "No additional context captured."}
                          </p>
                          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                            {entry.actorName ?? "System"}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-secondary)]">
                      No audit timeline entries have been recorded yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Stakeholder Updates
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                      Broadcast feed
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {updates.map((update) => {
                    const initials =
                      update.authorName
                        ?.split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() ?? "MI";

                    return (
                      <div
                        key={`${update.timestamp}-${update.message}`}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[rgba(37,99,235,0.1)] text-sm font-semibold text-[var(--primary)]">
                            {update.authorPhotoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={update.authorPhotoUrl}
                                alt={update.authorName ?? "Author"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {update.authorName ?? "System"}
                              </p>
                              <StatusBadge status={update.type} />
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {formatDateTime(update.timestamp)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                              {update.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Post Update
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  Notify stakeholders
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <select
                    value={updateType}
                    onChange={(event) =>
                      setUpdateType(event.target.value as UpdateType)
                    }
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="status_update">Status update</option>
                    <option value="comms">Communications</option>
                    <option value="technical">Technical</option>
                  </select>

                  <textarea
                    value={updateMessage}
                    onChange={(event) => setUpdateMessage(event.target.value)}
                    rows={4}
                    placeholder="Share the latest operational picture, next milestone, and stakeholder guidance."
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <ActionButton
                    label={updateMutation.isPending ? "Posting..." : "Send update"}
                    onClick={postUpdate}
                    disabled={busy || !updateMessage.trim()}
                  />
                </div>
              </section>

              {showResolveForm ? (
                <section className="rounded-[28px] border border-emerald-500/25 bg-emerald-500/[0.04] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Resolution
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                        Confirm restoration and capture root cause
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowResolveForm(false)}
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                    >
                      Hide
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <textarea
                      value={resolutionSummary}
                      onChange={(event) =>
                        setResolutionSummary(event.target.value)
                      }
                      rows={4}
                      placeholder="Summarize what was restored, what changed, and the user-facing outcome."
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                    />
                    <textarea
                      value={rootCause}
                      onChange={(event) => setRootCause(event.target.value)}
                      rows={4}
                      placeholder="Describe the root cause clearly enough to support PIR and problem management."
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <ActionButton
                      label={resolveMutation.isPending ? "Resolving..." : "Resolve major incident"}
                      onClick={submitResolution}
                      disabled={busy || !resolutionSummary.trim() || !rootCause.trim()}
                    />
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    Post-Incident Review
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                    Structured PIR submission
                  </h2>
                </div>
                <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {incident.pirCompletedDate
                    ? `Completed ${formatDateTime(incident.pirCompletedDate)}`
                    : `Due ${formatDateTime(incident.pirScheduledDate)}`}
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <textarea
                  value={pirForm.whatHappened}
                  onChange={(event) =>
                    setPirForm((current) => ({
                      ...current,
                      whatHappened: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="What happened?"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                />
                <textarea
                  value={pirForm.timeline}
                  onChange={(event) =>
                    setPirForm((current) => ({
                      ...current,
                      timeline: event.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Timeline, one entry per line"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                />
                <textarea
                  value={pirForm.rootCause}
                  onChange={(event) =>
                    setPirForm((current) => ({
                      ...current,
                      rootCause: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Root cause"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                />
                <textarea
                  value={pirForm.contributingFactors}
                  onChange={(event) =>
                    setPirForm((current) => ({
                      ...current,
                      contributingFactors: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Contributing factors, one per line"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                />
                <textarea
                  value={pirForm.correctiveActions}
                  onChange={(event) =>
                    setPirForm((current) => ({
                      ...current,
                      correctiveActions: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Corrective actions, one per line"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                />
                <textarea
                  value={pirForm.preventiveActions}
                  onChange={(event) =>
                    setPirForm((current) => ({
                      ...current,
                      preventiveActions: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Preventive actions, one per line"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                />
                <textarea
                  value={pirForm.lessonsLearned}
                  onChange={(event) =>
                    setPirForm((current) => ({
                      ...current,
                      lessonsLearned: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Lessons learned"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              {incident.status !== "closed" ? (
                <div className="mt-4 flex justify-end">
                  <ActionButton
                    label={pirMutation.isPending ? "Submitting PIR..." : "Submit PIR"}
                    onClick={submitPir}
                    disabled={busy || !pirForm.whatHappened.trim() || !pirForm.rootCause.trim()}
                  />
                </div>
              ) : null}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Ticket Context
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {incident.ticket?.ticketNumber ?? incident.ticketId}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {incident.ticket?.title ?? "Ticket details unavailable"}
                </p>
                {incident.ticket?.id ? (
                  <Link
                    href={`/dashboard/itsm/tickets/${incident.ticket.id}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    Open ticket detail
                    <Link2 size={14} />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <PersonCard label="Incident Commander" person={incident.incidentCommander} />
          <PersonCard label="Communication Lead" person={incident.communicationLead} />

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Bridge Call
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <RadioTower size={15} />
                  Bridge link
                </p>
                {incident.bridgeUrl ? (
                  <Link
                    href={incident.bridgeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-sm text-[var(--primary)] hover:underline"
                  >
                    {incident.bridgeUrl}
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    No bridge URL configured yet.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <PhoneCall size={15} />
                  Dial-in
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {incident.bridgePhone ?? "No phone bridge configured"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Service Impact
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <AlertTriangle size={15} />
                  Affected services
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {incident.affectedServices.length > 0 ? (
                    incident.affectedServices.map((service) => (
                      <span
                        key={service}
                        className="rounded-full bg-[rgba(37,99,235,0.08)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
                      >
                        {service}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">
                      Service impact still being assessed.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Clock3 size={15} />
                    Duration
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {formatDuration(
                      incident.declaredAt,
                      incident.resolvedAt,
                      incident.closedAt,
                      now,
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Users size={15} />
                    Stakeholder reach
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {incident.communicationPlan.internalStakeholders.length +
                      incident.communicationPlan.externalStakeholders.length}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {incident.communicationPlan.channels.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Response Actions
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  Next step controls
                </h2>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: severity.surface, color: severity.color }}
              >
                <Siren size={18} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {incident.status === "declared" ? (
                <ActionButton
                  label="Begin Investigation"
                  onClick={() =>
                    transitionMutation.mutateAsync({
                      id: incident.id,
                      targetStatus: "investigating",
                    })
                  }
                  disabled={busy}
                />
              ) : null}

              {incident.status === "investigating" ? (
                <ActionButton
                  label="Begin Mitigation"
                  onClick={() =>
                    transitionMutation.mutateAsync({
                      id: incident.id,
                      targetStatus: "mitigating",
                    })
                  }
                  disabled={busy}
                />
              ) : null}

              {incident.status === "mitigating" ? (
                <ActionButton
                  label="Confirm Mitigated"
                  onClick={() =>
                    transitionMutation.mutateAsync({
                      id: incident.id,
                      targetStatus: "mitigated",
                    })
                  }
                  disabled={busy}
                />
              ) : null}

              {incident.status === "mitigated" ? (
                <>
                  <ActionButton
                    label="Continue Monitoring"
                    tone="secondary"
                    onClick={() =>
                      transitionMutation.mutateAsync({
                        id: incident.id,
                        targetStatus: "monitoring",
                      })
                    }
                    disabled={busy}
                  />
                  <ActionButton
                    label="Confirm Resolved"
                    onClick={() => setShowResolveForm(true)}
                    disabled={busy}
                  />
                </>
              ) : null}

              {incident.status === "monitoring" ? (
                <ActionButton
                  label="Confirm Resolved"
                  onClick={() => setShowResolveForm(true)}
                  disabled={busy}
                />
              ) : null}

              {(incident.status === "resolved" ||
                incident.status === "pir_pending") ? (
                <ActionButton
                  label="Open PIR Form"
                  tone="secondary"
                  onClick={() => setActiveTab("pir")}
                  disabled={busy}
                />
              ) : null}

              {incident.status === "closed" ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-800">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    PIR complete and incident closed
                  </p>
                  <p className="mt-2 leading-6">
                    Final closure recorded {formatDateTime(incident.closedAt)}.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {incident.resolutionSummary ? (
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Resolution Snapshot
              </p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--text-secondary)]">
                <div>
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                    <Megaphone size={15} />
                    Resolution summary
                  </p>
                  <p className="mt-2">{incident.resolutionSummary}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                    <FileText size={15} />
                    Root cause
                  </p>
                  <p className="mt-2">{incident.rootCauseSummary ?? "Pending"}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

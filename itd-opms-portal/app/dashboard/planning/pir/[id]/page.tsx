"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardCheck,
  Plus,
  Star,
  Calendar,
  Loader2,
  Trash2,
  Pencil,
  CheckCircle2,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PermissionGate } from "@/components/shared/permission-gate";
import { useBreadcrumbs } from "@/providers/breadcrumb-provider";
import {
  usePIR,
  useUpdatePIR,
  useCompletePIR,
  useDeletePIR,
} from "@/hooks/use-planning";
import type {
  PIR,
  PIRSuccess,
  PIRChallenge,
  PIRLesson,
  PIRRecommendation,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REVIEW_TYPE_LABELS: Record<string, string> = {
  project: "Project",
  major_incident: "Major Incident",
  change_request: "Change Request",
};

const SUCCESS_CATEGORIES = [
  "planning",
  "technical",
  "communication",
  "process",
  "leadership",
];

const CHALLENGE_CATEGORIES = [
  "planning",
  "technical",
  "communication",
  "process",
  "leadership",
];

const LESSON_CATEGORIES = [
  "planning",
  "technical",
  "communication",
  "process",
  "leadership",
];

const APPLICABILITY_OPTIONS = [
  { value: "this_project", label: "This Project" },
  { value: "all_projects", label: "All Projects" },
  { value: "specific_domain", label: "Specific Domain" },
];

const PRIORITY_OPTIONS = ["high", "medium", "low"];

const RECOMMENDATION_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

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

/* ------------------------------------------------------------------ */
/*  Star Rating (interactive)                                          */
/* ------------------------------------------------------------------ */

function StarRating({
  score,
  editable = false,
  onChange,
}: {
  score?: number;
  editable?: boolean;
  onChange?: (score: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const displayScore = hovered ?? score ?? 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          disabled={!editable}
          onClick={() => onChange?.(v)}
          onMouseEnter={() => editable && setHovered(v)}
          onMouseLeave={() => setHovered(null)}
          className={`transition-transform ${
            editable
              ? "cursor-pointer hover:scale-110"
              : "cursor-default"
          }`}
          title={editable ? `Rate ${v} out of 5` : undefined}
        >
          <Star
            size={24}
            className={
              v <= displayScore
                ? "fill-amber-400 text-amber-400"
                : "text-[var(--surface-2)]"
            }
          />
        </button>
      ))}
      {score != null && score > 0 && (
        <span className="ml-2 text-sm font-semibold text-[var(--text-primary)]">
          {score.toFixed(1)} / 5.0
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Header with add button                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  count,
  editing,
  onAdd,
}: {
  title: string;
  count: number;
  editing: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        {title}{" "}
        <span className="text-[var(--neutral-gray)]">({count})</span>
      </h3>
      {editing && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/5"
        >
          <Plus size={14} />
          Add
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PIRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: pir, isLoading } = usePIR(id);
  const updatePIR = useUpdatePIR(id);
  const completePIR = useCompletePIR();
  const deletePIR = useDeletePIR();

  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  /* ---- Editable form state ---- */
  const [objectivesMet, setObjectivesMet] = useState("");
  const [scopeAdherence, setScopeAdherence] = useState("");
  const [timelineAdherence, setTimelineAdherence] = useState("");
  const [budgetAdherence, setBudgetAdherence] = useState("");
  const [qualityAssessment, setQualityAssessment] = useState("");
  const [stakeholderSatisfaction, setStakeholderSatisfaction] = useState("");
  const [overallScore, setOverallScore] = useState<number | undefined>(
    undefined,
  );
  const [successes, setSuccesses] = useState<PIRSuccess[]>([]);
  const [challenges, setChallenges] = useState<PIRChallenge[]>([]);
  const [lessonsLearned, setLessonsLearned] = useState<PIRLesson[]>([]);
  const [recommendations, setRecommendations] = useState<PIRRecommendation[]>(
    [],
  );

  /* ---- Sync form state from API data ---- */
  const syncFormState = useCallback((data: PIR) => {
    setObjectivesMet(data.objectivesMet ?? "");
    setScopeAdherence(data.scopeAdherence ?? "");
    setTimelineAdherence(data.timelineAdherence ?? "");
    setBudgetAdherence(data.budgetAdherence ?? "");
    setQualityAssessment(data.qualityAssessment ?? "");
    setStakeholderSatisfaction(data.stakeholderSatisfaction ?? "");
    setOverallScore(data.overallScore ?? undefined);
    setSuccesses(data.successes ?? []);
    setChallenges(data.challenges ?? []);
    setLessonsLearned(data.lessonsLearned ?? []);
    setRecommendations(data.recommendations ?? []);
  }, []);

  useEffect(() => {
    if (pir) {
      syncFormState(pir);
    }
  }, [pir, syncFormState]);

  /* ---- Breadcrumbs ---- */
  useBreadcrumbs([
    { label: "Planning", href: "/dashboard/planning" },
    { label: "PIR Reviews", href: "/dashboard/planning/pir" },
    {
      label: pir?.title ?? "Loading...",
      href: `/dashboard/planning/pir/${id}`,
    },
  ]);

  /* ---- Actions ---- */

  function handleSave() {
    updatePIR.mutate(
      {
        objectivesMet: objectivesMet || undefined,
        scopeAdherence: scopeAdherence || undefined,
        timelineAdherence: timelineAdherence || undefined,
        budgetAdherence: budgetAdherence || undefined,
        qualityAssessment: qualityAssessment || undefined,
        stakeholderSatisfaction: stakeholderSatisfaction || undefined,
        overallScore,
        successes,
        challenges,
        lessonsLearned,
        recommendations,
      },
      {
        onSuccess: () => {
          setEditing(false);
        },
      },
    );
  }

  function handleComplete() {
    completePIR.mutate(id, {
      onSuccess: () => {
        setShowCompleteConfirm(false);
        router.refresh();
      },
    });
  }

  function handleDelete() {
    deletePIR.mutate(id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        router.push("/dashboard/planning/pir");
      },
    });
  }

  function handleCancelEdit() {
    if (pir) {
      syncFormState(pir);
    }
    setEditing(false);
  }

  /* ---- Dynamic section helpers ---- */

  function addSuccess() {
    setSuccesses((prev) => [
      ...prev,
      { description: "", category: "planning", impact: "" },
    ]);
  }

  function removeSuccess(idx: number) {
    setSuccesses((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSuccess(idx: number, update: Partial<PIRSuccess>) {
    setSuccesses((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...update } : item)),
    );
  }

  function addChallenge() {
    setChallenges((prev) => [
      ...prev,
      { description: "", category: "planning", rootCause: "", impact: "" },
    ]);
  }

  function removeChallenge(idx: number) {
    setChallenges((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateChallenge(idx: number, update: Partial<PIRChallenge>) {
    setChallenges((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...update } : item)),
    );
  }

  function addLesson() {
    setLessonsLearned((prev) => [
      ...prev,
      {
        description: "",
        category: "planning",
        recommendation: "",
        applicability: "all_projects",
      },
    ]);
  }

  function removeLesson(idx: number) {
    setLessonsLearned((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLesson(idx: number, update: Partial<PIRLesson>) {
    setLessonsLearned((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...update } : item)),
    );
  }

  function addRecommendation() {
    setRecommendations((prev) => [
      ...prev,
      {
        description: "",
        priority: "medium",
        dueDate: "",
        status: "open",
        owner: "",
      },
    ]);
  }

  function removeRecommendation(idx: number) {
    setRecommendations((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRecommendation(
    idx: number,
    update: Partial<PIRRecommendation>,
  ) {
    setRecommendations((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...update } : item)),
    );
  }

  /* ---- Loading state ---- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--neutral-gray)]">
            Loading review...
          </p>
        </div>
      </div>
    );
  }

  if (!pir) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">
          Post-Implementation Review not found.
        </p>
      </div>
    );
  }

  const isCompleted = pir.status === "completed";
  const isCancelled = pir.status === "cancelled";

  /* ---- Input style helper ---- */
  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--neutral-gray)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";
  const textareaClass = `${inputClass} min-h-[80px] resize-y`;
  const selectClass =
    "rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

  return (
    <PermissionGate permission="planning.pir.read">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard/planning/pir")}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back to PIR Reviews
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
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
            >
              <ClipboardCheck size={24} style={{ color: "#10B981" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {pir.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={pir.status} />
                <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                  {REVIEW_TYPE_LABELS[pir.reviewType] ??
                    pir.reviewType.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-[var(--neutral-gray)]">
                  {pir.projectTitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isCompleted && !isCancelled && (
              <>
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={updatePIR.isPending}
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {updatePIR.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCompleteConfirm(true)}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500 px-3.5 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/5"
                >
                  <CheckCircle2 size={16} />
                  Complete
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-xl border border-[var(--error)] px-3.5 py-2 text-sm font-medium text-[var(--error)] transition-colors hover:bg-[var(--error)]/5"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </motion.div>

        {/* Metadata Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 sm:grid-cols-4"
        >
          <div>
            <p className="text-xs font-medium text-[var(--neutral-gray)]">
              Scheduled Date
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
              {formatDate(pir.scheduledDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--neutral-gray)]">
              Completed Date
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
              {formatDate(pir.completedDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--neutral-gray)]">
              Facilitator
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
              {pir.facilitatorName || "--"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--neutral-gray)]">
              Created
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
              {formatDate(pir.createdAt)}
            </p>
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Overall Score
          </h2>
          <StarRating
            score={overallScore}
            editable={editing}
            onChange={(v) => setOverallScore(v)}
          />
        </motion.div>

        {/* Structured Review Sections */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Review Assessment
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Objectives Achievement */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Objectives Achievement
              </label>
              {editing ? (
                <textarea
                  value={objectivesMet}
                  onChange={(e) => setObjectivesMet(e.target.value)}
                  placeholder="Were the project objectives met? Describe..."
                  className={textareaClass}
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                  {objectivesMet || "Not assessed yet."}
                </p>
              )}
            </div>

            {/* Scope Management */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Scope Management
              </label>
              {editing ? (
                <textarea
                  value={scopeAdherence}
                  onChange={(e) => setScopeAdherence(e.target.value)}
                  placeholder="How well was scope managed? Describe..."
                  className={textareaClass}
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                  {scopeAdherence || "Not assessed yet."}
                </p>
              )}
            </div>

            {/* Timeline Performance */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Timeline Performance
              </label>
              {editing ? (
                <textarea
                  value={timelineAdherence}
                  onChange={(e) => setTimelineAdherence(e.target.value)}
                  placeholder="Was the project delivered on time? Describe..."
                  className={textareaClass}
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                  {timelineAdherence || "Not assessed yet."}
                </p>
              )}
            </div>

            {/* Budget Performance */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Budget Performance
              </label>
              {editing ? (
                <textarea
                  value={budgetAdherence}
                  onChange={(e) => setBudgetAdherence(e.target.value)}
                  placeholder="Was the project within budget? Describe..."
                  className={textareaClass}
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                  {budgetAdherence || "Not assessed yet."}
                </p>
              )}
            </div>

            {/* Quality Assessment */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Quality Assessment
              </label>
              {editing ? (
                <textarea
                  value={qualityAssessment}
                  onChange={(e) => setQualityAssessment(e.target.value)}
                  placeholder="How was the quality of deliverables? Describe..."
                  className={textareaClass}
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                  {qualityAssessment || "Not assessed yet."}
                </p>
              )}
            </div>

            {/* Stakeholder Satisfaction */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--neutral-gray)]">
                Stakeholder Satisfaction
              </label>
              {editing ? (
                <textarea
                  value={stakeholderSatisfaction}
                  onChange={(e) =>
                    setStakeholderSatisfaction(e.target.value)
                  }
                  placeholder="How satisfied were stakeholders? Describe..."
                  className={textareaClass}
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                  {stakeholderSatisfaction || "Not assessed yet."}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Successes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <SectionHeader
            title="Successes"
            count={successes.length}
            editing={editing}
            onAdd={addSuccess}
          />
          <div className="mt-3 space-y-3">
            {successes.length === 0 && !editing && (
              <p className="text-sm text-[var(--neutral-gray)]">
                No successes recorded yet.
              </p>
            )}
            {successes.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                            Description
                          </label>
                          <textarea
                            value={item.description}
                            onChange={(e) =>
                              updateSuccess(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe the success..."
                            className={textareaClass}
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Category
                            </label>
                            <select
                              value={item.category}
                              onChange={(e) =>
                                updateSuccess(idx, {
                                  category: e.target.value,
                                })
                              }
                              className={selectClass + " w-full"}
                            >
                              {SUCCESS_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Impact
                            </label>
                            <input
                              type="text"
                              value={item.impact ?? ""}
                              onChange={(e) =>
                                updateSuccess(idx, {
                                  impact: e.target.value,
                                })
                              }
                              placeholder="Impact description..."
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSuccess(idx)}
                        className="mt-1 flex-shrink-0 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium capitalize text-emerald-600">
                        {item.category}
                      </span>
                      {item.impact && (
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Impact: {item.impact}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Challenges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <SectionHeader
            title="Challenges"
            count={challenges.length}
            editing={editing}
            onAdd={addChallenge}
          />
          <div className="mt-3 space-y-3">
            {challenges.length === 0 && !editing && (
              <p className="text-sm text-[var(--neutral-gray)]">
                No challenges recorded yet.
              </p>
            )}
            {challenges.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                            Description
                          </label>
                          <textarea
                            value={item.description}
                            onChange={(e) =>
                              updateChallenge(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe the challenge..."
                            className={textareaClass}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Category
                            </label>
                            <select
                              value={item.category}
                              onChange={(e) =>
                                updateChallenge(idx, {
                                  category: e.target.value,
                                })
                              }
                              className={selectClass + " w-full"}
                            >
                              {CHALLENGE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Root Cause
                            </label>
                            <input
                              type="text"
                              value={item.rootCause ?? ""}
                              onChange={(e) =>
                                updateChallenge(idx, {
                                  rootCause: e.target.value,
                                })
                              }
                              placeholder="Root cause..."
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Impact
                            </label>
                            <input
                              type="text"
                              value={item.impact ?? ""}
                              onChange={(e) =>
                                updateChallenge(idx, {
                                  impact: e.target.value,
                                })
                              }
                              placeholder="Impact..."
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeChallenge(idx)}
                        className="mt-1 flex-shrink-0 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium capitalize text-amber-600">
                        {item.category}
                      </span>
                      {item.impact && (
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Impact: {item.impact}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                    {item.rootCause && (
                      <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                        Root Cause: {item.rootCause}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Lessons Learned */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <SectionHeader
            title="Lessons Learned"
            count={lessonsLearned.length}
            editing={editing}
            onAdd={addLesson}
          />
          <div className="mt-3 space-y-3">
            {lessonsLearned.length === 0 && !editing && (
              <p className="text-sm text-[var(--neutral-gray)]">
                No lessons recorded yet.
              </p>
            )}
            {lessonsLearned.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                            Description
                          </label>
                          <textarea
                            value={item.description}
                            onChange={(e) =>
                              updateLesson(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe the lesson learned..."
                            className={textareaClass}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Category
                            </label>
                            <select
                              value={item.category}
                              onChange={(e) =>
                                updateLesson(idx, {
                                  category: e.target.value,
                                })
                              }
                              className={selectClass + " w-full"}
                            >
                              {LESSON_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Recommendation
                            </label>
                            <input
                              type="text"
                              value={item.recommendation ?? ""}
                              onChange={(e) =>
                                updateLesson(idx, {
                                  recommendation: e.target.value,
                                })
                              }
                              placeholder="Recommended action..."
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Applicability
                            </label>
                            <select
                              value={item.applicability ?? "all_projects"}
                              onChange={(e) =>
                                updateLesson(idx, {
                                  applicability: e.target.value,
                                })
                              }
                              className={selectClass + " w-full"}
                            >
                              {APPLICABILITY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLesson(idx)}
                        className="mt-1 flex-shrink-0 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium capitalize text-blue-600">
                        {item.category}
                      </span>
                      {item.applicability && (
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--text-secondary)]">
                          {APPLICABILITY_OPTIONS.find(
                            (o) => o.value === item.applicability,
                          )?.label ?? item.applicability.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                    {item.recommendation && (
                      <p className="mt-1 text-xs text-[var(--neutral-gray)]">
                        Recommendation: {item.recommendation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5"
        >
          <SectionHeader
            title="Recommendations"
            count={recommendations.length}
            editing={editing}
            onAdd={addRecommendation}
          />
          <div className="mt-3 space-y-3">
            {recommendations.length === 0 && !editing && (
              <p className="text-sm text-[var(--neutral-gray)]">
                No recommendations recorded yet.
              </p>
            )}
            {recommendations.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                            Description
                          </label>
                          <textarea
                            value={item.description}
                            onChange={(e) =>
                              updateRecommendation(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe the recommendation..."
                            className={textareaClass}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Priority
                            </label>
                            <select
                              value={item.priority ?? "medium"}
                              onChange={(e) =>
                                updateRecommendation(idx, {
                                  priority: e.target.value,
                                })
                              }
                              className={selectClass + " w-full"}
                            >
                              {PRIORITY_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p.charAt(0).toUpperCase() + p.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Owner
                            </label>
                            <input
                              type="text"
                              value={item.owner ?? ""}
                              onChange={(e) =>
                                updateRecommendation(idx, {
                                  owner: e.target.value,
                                })
                              }
                              placeholder="Owner..."
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={item.dueDate ?? ""}
                              onChange={(e) =>
                                updateRecommendation(idx, {
                                  dueDate: e.target.value,
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-gray)]">
                              Status
                            </label>
                            <select
                              value={item.status ?? "open"}
                              onChange={(e) =>
                                updateRecommendation(idx, {
                                  status: e.target.value,
                                })
                              }
                              className={selectClass + " w-full"}
                            >
                              {RECOMMENDATION_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecommendation(idx)}
                        className="mt-1 flex-shrink-0 rounded-lg p-1 text-[var(--neutral-gray)] transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--error)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          item.priority === "high"
                            ? "bg-[rgba(239,68,68,0.1)] text-[var(--error)]"
                            : item.priority === "medium"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {item.priority ?? "medium"}
                      </span>
                      {item.status && (
                        <StatusBadge status={item.status} />
                      )}
                      {item.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-[var(--neutral-gray)]">
                          <Calendar size={12} />
                          {formatDate(item.dueDate)}
                        </span>
                      )}
                      {item.owner && (
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Owner: {item.owner}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom save bar (sticky) when editing */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 shadow-lg"
          >
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
            >
              <X size={16} />
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updatePIR.isPending}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {updatePIR.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Save All Changes
            </button>
          </motion.div>
        )}

        {/* Complete Confirmation */}
        <ConfirmDialog
          open={showCompleteConfirm}
          onClose={() => setShowCompleteConfirm(false)}
          onConfirm={handleComplete}
          title="Complete Post-Implementation Review"
          message="Are you sure you want to mark this review as completed? This will finalize the review and set the completion date."
          confirmLabel="Complete Review"
          variant="default"
          loading={completePIR.isPending}
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Post-Implementation Review"
          message={`Are you sure you want to delete "${pir.title}"? This action cannot be undone.`}
          confirmLabel="Delete PIR"
          variant="danger"
          loading={deletePIR.isPending}
        />
      </div>
    </PermissionGate>
  );
}

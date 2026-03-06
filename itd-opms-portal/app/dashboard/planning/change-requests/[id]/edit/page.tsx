"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Check,
  GitPullRequest,
  Scale,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { ProjectPicker } from "@/components/shared/pickers";
import { useChangeRequest, useUpdateChangeRequest } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "Request", icon: GitPullRequest, description: "Title & project" },
  { label: "Justification", icon: Scale, description: "Reasoning & impact" },
  { label: "Review", icon: Sparkles, description: "Confirm & save" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const CATEGORIES = [
  { value: "", label: "None" },
  { value: "scope", label: "Scope" },
  { value: "schedule", label: "Schedule" },
  { value: "budget", label: "Budget" },
  { value: "resource", label: "Resource" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EditChangeRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: cr, isLoading: loading } = useChangeRequest(id);
  const updateCR = useUpdateChangeRequest(id);

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectDisplay, setProjectDisplay] = useState("");
  const [justification, setJustification] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  /* ---- Populate form when data loads ---- */
  useEffect(() => {
    if (cr && !initialized) {
      setTitle(cr.title || "");
      setDescription(cr.description || "");
      setProjectId(cr.projectId || "");
      setProjectDisplay(cr.projectTitle || "");
      setJustification(cr.justification || "");
      setImpactAssessment(cr.impactAssessment || "");
      setPriority(cr.priority || "medium");
      setCategory(cr.category || "");
      setInitialized(true);
    }
  }, [cr, initialized]);

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!title.trim()) newErrors.title = "Title is required";
      }
      if (s === 1) {
        if (!justification.trim())
          newErrors.justification = "Justification is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [title, justification],
  );

  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, validateStep]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (target > step) {
        if (!validateStep(step)) return;
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  /* ---- Submit ---- */
  function handleSubmit() {
    updateCR.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId.trim() || undefined,
        justification: justification.trim(),
        impactAssessment: impactAssessment.trim() || undefined,
        priority: priority,
        category: category || undefined,
      },
      {
        onSuccess: () => {
          router.push(`/dashboard/planning/change-requests/${id}`);
        },
      },
    );
  }

  const isLastStep = step === STEPS.length - 1;
  const stepComplete = [!!title.trim(), !!justification.trim(), false];

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={24}
            className="animate-spin text-[var(--primary)]"
          />
          <p className="text-sm text-[var(--neutral-gray)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!cr) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[var(--neutral-gray)]">
          Change request not found.
        </p>
      </div>
    );
  }

  /* ---- Not editable guard ---- */
  if (cr.status !== "submitted" && cr.status !== "under_review") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/planning/change-requests/${id}`)
          }
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Change Request
        </button>
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle size={24} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Cannot Edit
          </h2>
          <p className="text-sm text-[var(--neutral-gray)] text-center max-w-md">
            This change request has status &quot;{cr.status}&quot; and can no
            longer be edited. Only requests with status &quot;submitted&quot; or
            &quot;under review&quot; can be modified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/planning/change-requests/${id}`)
          }
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Change Request
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Edit Change Request
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Update the details below and save your changes.
        </p>
      </motion.div>

      {/* Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-5"
      >
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step || stepComplete[i];
            const isClickable = i <= step || stepComplete[step];

            return (
              <div
                key={s.label}
                className="flex items-center flex-1 last:flex-none"
              >
                <button
                  type="button"
                  onClick={() => isClickable && goTo(i)}
                  className={`group flex flex-col items-center gap-1.5 transition-all ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 scale-110"
                        : isDone
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    } ${isClickable && !isActive ? "group-hover:border-[var(--primary)]/50 group-hover:scale-105" : ""}`}
                  >
                    {isDone && !isActive ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : (
                      <Icon size={18} />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors hidden sm:block ${
                      isActive
                        ? "text-[var(--primary)]"
                        : isDone
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--neutral-gray)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>

                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-3">
                    <div className="h-0.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--primary)]"
                        initial={false}
                        animate={{ width: i < step ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-xs text-[var(--neutral-gray)] mt-3"
          >
            Step {step + 1} of {STEPS.length} — {STEPS[step].description}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Step Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 min-h-[320px] relative overflow-hidden"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Step 0: Request */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Change Request
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Update the title, project, priority, and category.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g. Extend project timeline by 2 weeks"
                    required
                    error={errors.title}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={description}
                    onChange={setDescription}
                    placeholder="Detailed description of the proposed change"
                    rows={4}
                  />
                  <ProjectPicker
                    label="Project"
                    value={projectId || undefined}
                    displayValue={projectDisplay}
                    onChange={(pid, ptitle) => {
                      setProjectId(pid ?? "");
                      setProjectDisplay(ptitle);
                    }}
                    description="The project this change request applies to"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Justification */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Justification &amp; Impact
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Explain why this change is needed and assess its impact.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Justification"
                    name="justification"
                    type="textarea"
                    value={justification}
                    onChange={setJustification}
                    placeholder="Why is this change necessary? What are the business drivers?"
                    rows={4}
                    required
                    error={errors.justification}
                  />
                  <FormField
                    label="Impact Assessment"
                    name="impactAssessment"
                    type="textarea"
                    value={impactAssessment}
                    onChange={setImpactAssessment}
                    placeholder="What is the impact on scope, timeline, budget, and resources?"
                    rows={4}
                    description="Describe impacts on schedule, cost, scope, quality, and risks"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Save
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the updated details below. Click any section to go back
                  and edit.
                </p>

                <div className="space-y-4">
                  {/* Request summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GitPullRequest
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Request
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Title" value={title} />
                      <ReviewField
                        label="Project"
                        value={projectDisplay || "—"}
                      />
                      <ReviewField label="Priority" value={priority} />
                      <ReviewField label="Category" value={category || "—"} />
                    </div>
                    {description && (
                      <div className="mt-2">
                        <ReviewField
                          label="Description"
                          value={
                            description.length > 120
                              ? description.slice(0, 120) + "..."
                              : description
                          }
                        />
                      </div>
                    )}
                  </button>

                  {/* Justification summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Scale
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Justification &amp; Impact
                      </span>
                    </div>
                    <div className="space-y-1">
                      <ReviewField
                        label="Justification"
                        value={
                          justification.length > 120
                            ? justification.slice(0, 120) + "..."
                            : justification
                        }
                      />
                      {impactAssessment && (
                        <ReviewField
                          label="Impact Assessment"
                          value={
                            impactAssessment.length > 120
                              ? impactAssessment.slice(0, 120) + "..."
                              : impactAssessment
                          }
                        />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={
            step === 0
              ? () =>
                  router.push(
                    `/dashboard/planning/change-requests/${id}`,
                  )
              : goPrev
          }
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
        >
          <ArrowLeft size={16} />
          {step === 0 ? "Cancel" : "Previous"}
        </button>

        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-[var(--primary)]"
                  : i < step
                    ? "w-1.5 bg-[var(--primary)]/40"
                    : "w-1.5 bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              updateCR.isPending || !title.trim() || !justification.trim()
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateCR.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25"
          >
            Continue
            <ArrowRight size={16} />
          </button>
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review field helper                                                */
/* ------------------------------------------------------------------ */

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-[var(--neutral-gray)]">{label}: </span>
      <span className="text-sm text-[var(--text-primary)]">
        {value || "—"}
      </span>
    </div>
  );
}

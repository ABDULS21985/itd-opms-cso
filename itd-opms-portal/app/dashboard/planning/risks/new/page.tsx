"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateRisk, useProjects } from "@/hooks/use-planning";
import { useUsers } from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "technical", label: "Technical" },
  { value: "operational", label: "Operational" },
  { value: "financial", label: "Financial" },
  { value: "security", label: "Security" },
  { value: "compliance", label: "Compliance" },
  { value: "resource", label: "Resource" },
  { value: "schedule", label: "Schedule" },
];

const LIKELIHOOD_LEVELS = [
  { value: "very_low", label: "Very Low (1)" },
  { value: "low", label: "Low (2)" },
  { value: "medium", label: "Medium (3)" },
  { value: "high", label: "High (4)" },
  { value: "very_high", label: "Very High (5)" },
];

const IMPACT_LEVELS = [
  { value: "very_low", label: "Very Low (1)" },
  { value: "low", label: "Low (2)" },
  { value: "medium", label: "Medium (3)" },
  { value: "high", label: "High (4)" },
  { value: "very_high", label: "Very High (5)" },
];

const STEPS = [
  { label: "Identity", icon: AlertTriangle, description: "Title & classification" },
  { label: "Assessment", icon: BarChart3, description: "Likelihood, impact & plans" },
  { label: "Review", icon: Sparkles, description: "Confirm & register" },
];

/* ------------------------------------------------------------------ */
/*  Slide animation variants                                           */
/* ------------------------------------------------------------------ */

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

export default function NewRiskPage() {
  const router = useRouter();
  const createRisk = useCreateRisk();

  const { data: projectsData } = useProjects(1, 200);
  const projects = Array.isArray(projectsData)
    ? projectsData
    : projectsData?.data ?? [];
  const projectOptions = projects.map(
    (p: { id: string; title?: string; code: string }) => ({
      value: p.id,
      label: p.title || p.code,
    }),
  );

  const { data: usersData } = useUsers(1, 200);
  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];
  const userOptions = users.map(
    (u: { id: string; displayName?: string; email: string }) => ({
      value: u.id,
      label: u.displayName || u.email,
    }),
  );

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const [likelihood, setLikelihood] = useState("");
  const [impact, setImpact] = useState("");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [contingencyPlan, setContingencyPlan] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!title.trim()) newErrors.title = "Title is required";
      }
      if (s === 1) {
        if (!likelihood) newErrors.likelihood = "Likelihood is required";
        if (!impact) newErrors.impact = "Impact is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [title, likelihood, impact],
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
    createRisk.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId.trim() || undefined,
        category: category || undefined,
        likelihood,
        impact,
        mitigationPlan: mitigationPlan.trim() || undefined,
        contingencyPlan: contingencyPlan.trim() || undefined,
        ownerId: ownerId.trim() || undefined,
        reviewDate: reviewDate || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/risks");
        },
      },
    );
  }

  /* ---- Helpers ---- */
  const findLabel = (
    opts: { value: string; label: string }[],
    val: string,
  ) => opts.find((o) => o.value === val)?.label || "—";

  const isLastStep = step === STEPS.length - 1;

  /* ---- Step completeness indicators ---- */
  const stepComplete = [
    !!title.trim(),
    !!(likelihood && impact),
    false,
  ];

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
          onClick={() => router.push("/dashboard/planning/risks")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Risk Register
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Register New Risk
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Follow the steps below to identify and assess a new risk.
        </p>
      </motion.div>

      {/* ── Stepper ── */}
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
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
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

      {/* ── Step Content ── */}
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
            {/* Step 0: Identity */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Risk Identity
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Give the risk a title, description, and classify it.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g. Key team member departure"
                    required
                    error={errors.title}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={description}
                    onChange={setDescription}
                    placeholder="Detailed description of the risk"
                    rows={3}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Project"
                      name="projectId"
                      type="select"
                      value={projectId}
                      onChange={setProjectId}
                      options={projectOptions}
                      placeholder="Select project (optional)"
                      description="Leave empty for organization-wide risks"
                    />
                    <FormField
                      label="Category"
                      name="category"
                      type="select"
                      value={category}
                      onChange={setCategory}
                      options={CATEGORIES}
                      placeholder="Select category"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Assessment */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Risk Assessment
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Assess the likelihood and impact, and define mitigation plans.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Likelihood"
                      name="likelihood"
                      type="select"
                      value={likelihood}
                      onChange={setLikelihood}
                      options={LIKELIHOOD_LEVELS}
                      placeholder="Select likelihood"
                      required
                      error={errors.likelihood}
                    />
                    <FormField
                      label="Impact"
                      name="impact"
                      type="select"
                      value={impact}
                      onChange={setImpact}
                      options={IMPACT_LEVELS}
                      placeholder="Select impact"
                      required
                      error={errors.impact}
                    />
                  </div>
                  <FormField
                    label="Mitigation Plan"
                    name="mitigationPlan"
                    type="textarea"
                    value={mitigationPlan}
                    onChange={setMitigationPlan}
                    placeholder="Steps to reduce the likelihood or impact of this risk"
                    rows={3}
                  />
                  <FormField
                    label="Contingency Plan"
                    name="contingencyPlan"
                    type="textarea"
                    value={contingencyPlan}
                    onChange={setContingencyPlan}
                    placeholder="Fallback plan if the risk materializes"
                    rows={3}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Owner"
                      name="ownerId"
                      type="select"
                      value={ownerId}
                      onChange={setOwnerId}
                      options={userOptions}
                      placeholder="Select risk owner (optional)"
                    />
                    <FormField
                      label="Review Date"
                      name="reviewDate"
                      type="date"
                      value={reviewDate}
                      onChange={setReviewDate}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Register
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click any section to go back and
                  edit.
                </p>

                <div className="space-y-4">
                  {/* Identity summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Identity
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Title" value={title} />
                      <ReviewField
                        label="Project"
                        value={findLabel(projectOptions, projectId)}
                      />
                      <ReviewField
                        label="Category"
                        value={findLabel(CATEGORIES, category)}
                      />
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

                  {/* Assessment summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Assessment
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Likelihood"
                        value={findLabel(LIKELIHOOD_LEVELS, likelihood)}
                      />
                      <ReviewField
                        label="Impact"
                        value={findLabel(IMPACT_LEVELS, impact)}
                      />
                      <ReviewField
                        label="Owner"
                        value={findLabel(userOptions, ownerId)}
                      />
                      <ReviewField
                        label="Review Date"
                        value={
                          reviewDate
                            ? new Date(reviewDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : ""
                        }
                      />
                    </div>
                    <div className="space-y-1 mt-2">
                      {mitigationPlan && (
                        <ReviewField
                          label="Mitigation Plan"
                          value={
                            mitigationPlan.length > 120
                              ? mitigationPlan.slice(0, 120) + "..."
                              : mitigationPlan
                          }
                        />
                      )}
                      {contingencyPlan && (
                        <ReviewField
                          label="Contingency Plan"
                          value={
                            contingencyPlan.length > 120
                              ? contingencyPlan.slice(0, 120) + "..."
                              : contingencyPlan
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

      {/* ── Navigation ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={step === 0 ? () => router.push("/dashboard/planning/risks") : goPrev}
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
            disabled={createRisk.isPending || !title.trim() || !likelihood || !impact}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createRisk.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Register Risk
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

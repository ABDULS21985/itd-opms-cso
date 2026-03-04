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
  Target,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { OKRPicker } from "@/components/shared/pickers";
import { useCreateOKR } from "@/hooks/use-governance";
import { useOrgUnits } from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LEVELS = [
  { value: "department", label: "Department" },
  { value: "division", label: "Division" },
  { value: "office", label: "Office" },
  { value: "unit", label: "Unit" },
];

const SCORING_METHODS = [
  { value: "percentage", label: "Percentage (0-100%)" },
  { value: "rag", label: "RAG (Red / Amber / Green)" },
  { value: "numeric", label: "Numeric" },
];

const STEPS = [
  { label: "Details", icon: Target, description: "Objective & scope" },
  { label: "Review", icon: Sparkles, description: "Confirm & create" },
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

export default function CreateOKRPage() {
  const router = useRouter();
  const createMutation = useCreateOKR();
  const { data: orgUnitsData } = useOrgUnits(1, 100);

  const orgUnits = Array.isArray(orgUnitsData)
    ? orgUnitsData
    : orgUnitsData?.data ?? [];

  const orgUnitOptions = orgUnits.map(
    (ou: { id: string; code: string; name: string }) => ({
      value: ou.id,
      label: `${ou.code} — ${ou.name}`,
    }),
  );

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [objective, setObjective] = useState("");
  const [level, setLevel] = useState("");
  const [period, setPeriod] = useState("");
  const [parentId, setParentId] = useState("");
  const [parentDisplay, setParentDisplay] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [scoringMethod, setScoringMethod] = useState("percentage");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!objective.trim()) newErrors.objective = "Objective is required";
        if (!level) newErrors.level = "Level is required";
        if (!period.trim()) newErrors.period = "Period is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [objective, level, period],
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
    createMutation.mutate(
      {
        objective: objective.trim(),
        level,
        period: period.trim(),
        parentId: parentId.trim() || undefined,
        scopeId: scopeId.trim() || undefined,
        scoringMethod,
      },
      {
        onSuccess: (data) => {
          router.push(`/dashboard/governance/okrs/${data.id}`);
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
          onClick={() => router.push("/dashboard/governance/okrs")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to OKRs
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create OKR
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Define a new objective with key results.
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
            const isDone = i < step;
            const isClickable = i <= step;
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

        {/* Step description */}
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
            {/* Step 0: Details */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  OKR Details
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Define the objective, level, period, and scoring method.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Objective"
                    name="objective"
                    type="textarea"
                    value={objective}
                    onChange={setObjective}
                    placeholder="e.g., Improve IT service delivery across the department"
                    required
                    error={errors.objective}
                    rows={3}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Level"
                      name="level"
                      type="select"
                      value={level}
                      onChange={setLevel}
                      required
                      error={errors.level}
                      options={LEVELS}
                      placeholder="Select level..."
                    />
                    <FormField
                      label="Period"
                      name="period"
                      value={period}
                      onChange={setPeriod}
                      placeholder="e.g., Q1-2026, FY2026"
                      required
                      error={errors.period}
                    />
                  </div>
                  <OKRPicker
                    label="Parent OKR"
                    value={parentId || undefined}
                    displayValue={parentDisplay}
                    onChange={(id, name) => {
                      setParentId(id ?? "");
                      setParentDisplay(name);
                    }}
                    placeholder="Search for a parent OKR..."
                    description="Link this OKR to a parent objective for cascading alignment."
                  />
                  <FormField
                    label="Scope (Org Unit)"
                    name="scopeId"
                    type="select"
                    value={scopeId}
                    onChange={setScopeId}
                    options={orgUnitOptions}
                    placeholder="Select organizational unit (optional)"
                    description="The organizational unit this OKR belongs to."
                  />
                  <FormField
                    label="Scoring Method"
                    name="scoringMethod"
                    type="select"
                    value={scoringMethod}
                    onChange={setScoringMethod}
                    options={SCORING_METHODS}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Review */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Create
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click the section to go back and edit.
                </p>

                <div className="space-y-4">
                  {/* Details summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-[var(--primary)]" />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Details
                      </span>
                    </div>
                    <div className="space-y-1">
                      <ReviewField
                        label="Objective"
                        value={
                          objective.length > 120
                            ? objective.slice(0, 120) + "..."
                            : objective
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                      <ReviewField
                        label="Level"
                        value={findLabel(LEVELS, level)}
                      />
                      <ReviewField label="Period" value={period} />
                      <ReviewField
                        label="Scoring"
                        value={findLabel(SCORING_METHODS, scoringMethod)}
                      />
                      <ReviewField
                        label="Scope"
                        value={findLabel(orgUnitOptions, scopeId)}
                      />
                      {parentId && (
                        <ReviewField label="Parent OKR" value={parentDisplay || parentId} />
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
          onClick={
            step === 0
              ? () => router.push("/dashboard/governance/okrs")
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
              createMutation.isPending ||
              !objective.trim() ||
              !level ||
              !period.trim()
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create OKR
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

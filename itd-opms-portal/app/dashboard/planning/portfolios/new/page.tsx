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
  Briefcase,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { UserPicker } from "@/components/shared/pickers";
import { useCreatePortfolio } from "@/hooks/use-planning";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "Details", icon: Briefcase, description: "Portfolio information" },
  { label: "Review", icon: Sparkles, description: "Confirm & create" },
];

const FISCAL_YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({
    value: String(current - 1 + i),
    label: String(current - 1 + i),
  }));
})();

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
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

export default function NewPortfolioPage() {
  const router = useRouter();
  const createPortfolio = useCreatePortfolio();

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fiscalYear, setFiscalYear] = useState(
    String(new Date().getFullYear()),
  );
  const [ownerId, setOwnerId] = useState("");
  const [ownerDisplay, setOwnerDisplay] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!name.trim()) newErrors.name = "Portfolio name is required";
        if (!fiscalYear || isNaN(Number(fiscalYear)))
          newErrors.fiscalYear = "Valid fiscal year is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [name, fiscalYear],
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

  /* ---- Submit ---- */
  function handleSubmit() {
    createPortfolio.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        fiscalYear: Number(fiscalYear),
        ownerId: ownerId.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/portfolios");
        },
      },
    );
  }

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
          onClick={() => router.push("/dashboard/planning/portfolios")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Portfolios
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create New Portfolio
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Define a new project portfolio for a fiscal year.
        </p>
      </motion.div>

      {/* ── Stepper ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-6 py-5"
      >
        <div className="flex items-center justify-center gap-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;

            return (
              <div
                key={s.label}
                className="flex items-center gap-4"
              >
                {/* Step circle + label */}
                <button
                  type="button"
                  onClick={() => {
                    if (i < step) {
                      setDirection(-1);
                      setStep(i);
                    } else if (i > step && validateStep(step)) {
                      setDirection(1);
                      setStep(i);
                    }
                  }}
                  className="group flex items-center gap-3 cursor-pointer"
                >
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 scale-110"
                        : isDone
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                    } ${!isActive ? "group-hover:border-[var(--primary)]/50 group-hover:scale-105" : ""}`}
                  >
                    {isDone ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : (
                      <Icon size={18} />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isActive
                          ? "text-[var(--primary)]"
                          : isDone
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--neutral-gray)]"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="text-xs text-[var(--neutral-gray)]">
                      {s.description}
                    </p>
                  </div>
                </button>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="w-16 sm:w-24">
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
      </motion.div>

      {/* ── Step Content ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 min-h-[300px] relative overflow-hidden"
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
                  Portfolio Details
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Provide the basic information for this portfolio.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Portfolio Name"
                    name="name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. FY2026 IT Infrastructure Portfolio"
                    required
                    error={errors.name}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={description}
                    onChange={setDescription}
                    placeholder="Brief description of the portfolio objectives and scope"
                    rows={3}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Fiscal Year"
                      name="fiscalYear"
                      type="select"
                      value={fiscalYear}
                      onChange={setFiscalYear}
                      options={FISCAL_YEAR_OPTIONS}
                      required
                      error={errors.fiscalYear}
                      description="The financial year this portfolio covers"
                    />
                    <UserPicker
                      label="Portfolio Owner"
                      value={ownerId || undefined}
                      displayValue={ownerDisplay}
                      onChange={(id, name) => { setOwnerId(id ?? ""); setOwnerDisplay(name); }}
                      description="The person accountable for this portfolio"
                    />
                  </div>
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
                  Review the details below, then create the portfolio.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setDirection(-1);
                    setStep(0);
                  }}
                  className="w-full text-left rounded-xl border border-[var(--border)] p-5 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase size={14} className="text-[var(--primary)]" />
                    <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                      Portfolio Details
                    </span>
                    <span className="ml-auto text-xs text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to edit
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-[var(--neutral-gray)]">
                        Name
                      </span>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {name || "—"}
                      </p>
                    </div>

                    {description && (
                      <div>
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Description
                        </span>
                        <p className="text-sm text-[var(--text-primary)]">
                          {description.length > 200
                            ? description.slice(0, 200) + "..."
                            : description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Fiscal Year
                        </span>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {fiscalYear}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Owner
                        </span>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {ownerDisplay || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Status indicator */}
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10 px-4 py-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <Check size={14} className="text-[var(--primary)]" />
                  </div>
                  <p className="text-sm text-[var(--text-primary)]">
                    The portfolio will be created with{" "}
                    <span className="font-medium">active</span> status and
                    ready for project assignments.
                  </p>
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
              ? () => router.push("/dashboard/planning/portfolios")
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
            disabled={createPortfolio.isPending || !name.trim()}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPortfolio.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Portfolio
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

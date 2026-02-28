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
  FileText,
  Users,
  Calendar,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateProject, usePortfolios } from "@/hooks/use-planning";
import { useOrgUnits, useUsers } from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STEPS = [
  { label: "Identity", icon: FileText, description: "Basic project info" },
  { label: "Charter", icon: ClipboardList, description: "Objectives & scope" },
  { label: "Team", icon: Users, description: "Sponsor & manager" },
  { label: "Schedule", icon: Calendar, description: "Timeline & budget" },
  { label: "Review", icon: Sparkles, description: "Confirm & create" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

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

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const { data: portfoliosData } = usePortfolios(1, 100);
  const portfolios = portfoliosData?.data ?? [];
  const { data: orgUnitsData } = useOrgUnits(1, 100);
  const { data: usersData } = useUsers(1, 200);

  const orgUnits = Array.isArray(orgUnitsData)
    ? orgUnitsData
    : orgUnitsData?.data ?? [];

  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];

  const userOptions = users.map(
    (u: { id: string; displayName?: string; email: string }) => ({
      value: u.id,
      label: u.displayName || u.email,
    }),
  );

  const portfolioOptions = portfolios.map(
    (p: { id: string; name: string }) => ({
      value: p.id,
      label: p.name,
    }),
  );

  const divisionOptions = orgUnits
    .filter(
      (ou: { level: string }) =>
        ou.level === "office" ||
        ou.level === "division" ||
        ou.level === "department",
    )
    .map((ou: { id: string; code: string; name: string }) => ({
      value: ou.id,
      label: `${ou.code} — ${ou.name}`,
    }));

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [description, setDescription] = useState("");
  const [charter, setCharter] = useState("");
  const [scope, setScope] = useState("");
  const [businessCase, setBusinessCase] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [budgetApproved, setBudgetApproved] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!title.trim()) newErrors.title = "Project title is required";
        if (!code.trim()) newErrors.code = "Project code is required";
      }
      if (s === 3) {
        if (plannedStart && plannedEnd && plannedStart > plannedEnd) {
          newErrors.plannedEnd = "End date must be after start date";
        }
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [title, code, plannedStart, plannedEnd],
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
        // Only allow forward navigation if current step is valid
        if (!validateStep(step)) return;
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  /* ---- Submit ---- */
  function handleSubmit() {
    createProject.mutate(
      {
        title: title.trim(),
        code: code.trim(),
        portfolioId: portfolioId || undefined,
        divisionId: divisionId || undefined,
        description: description.trim() || undefined,
        charter: charter.trim() || undefined,
        scope: scope.trim() || undefined,
        businessCase: businessCase.trim() || undefined,
        sponsorId: sponsorId.trim() || undefined,
        projectManagerId: projectManagerId.trim() || undefined,
        priority,
        plannedStart: plannedStart || undefined,
        plannedEnd: plannedEnd || undefined,
        budgetApproved: budgetApproved ? Number(budgetApproved) : undefined,
      },
      {
        onSuccess: (project) => {
          router.push(`/dashboard/planning/projects/${project.id}`);
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
    !!(title.trim() && code.trim()),
    !!(charter.trim() || scope.trim() || businessCase.trim()),
    !!(sponsorId || projectManagerId),
    !!(plannedStart || plannedEnd || budgetApproved),
    false, // review step is never "complete"
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
          onClick={() => router.push("/dashboard/planning/projects")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Initiate New Project
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Follow the steps below to define and create a new project.
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
                {/* Step circle + label */}
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

                {/* Connector line */}
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
            {/* Step 0: Identity */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Project Identity
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Give your project a name, code, and assign it to a portfolio.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Project Title"
                      name="title"
                      value={title}
                      onChange={setTitle}
                      placeholder="e.g. Core Banking Upgrade"
                      required
                      error={errors.title}
                    />
                    <FormField
                      label="Project Code"
                      name="code"
                      value={code}
                      onChange={setCode}
                      placeholder="e.g. PRJ-2026-001"
                      required
                      error={errors.code}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Portfolio"
                      name="portfolioId"
                      type="select"
                      value={portfolioId}
                      onChange={setPortfolioId}
                      options={portfolioOptions}
                      placeholder="Select portfolio (optional)"
                    />
                    <FormField
                      label="Division / Office"
                      name="divisionId"
                      type="select"
                      value={divisionId}
                      onChange={setDivisionId}
                      options={divisionOptions}
                      placeholder="Select division (optional)"
                    />
                  </div>
                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={description}
                    onChange={setDescription}
                    placeholder="Brief summary of the project objectives and deliverables"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Charter & Scope */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Charter &amp; Scope
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Define the project objectives, scope boundaries, and business
                  justification.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Project Charter"
                    name="charter"
                    type="textarea"
                    value={charter}
                    onChange={setCharter}
                    placeholder="Describe the project purpose, objectives, and high-level deliverables"
                    rows={4}
                  />
                  <FormField
                    label="Scope"
                    name="scope"
                    type="textarea"
                    value={scope}
                    onChange={setScope}
                    placeholder="Define what is in scope and out of scope"
                    rows={3}
                  />
                  <FormField
                    label="Business Case"
                    name="businessCase"
                    type="textarea"
                    value={businessCase}
                    onChange={setBusinessCase}
                    placeholder="Justify the project — expected benefits, ROI, strategic alignment"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Team */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Team &amp; Priority
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Assign key stakeholders and set the project priority level.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Project Sponsor"
                      name="sponsorId"
                      type="select"
                      value={sponsorId}
                      onChange={setSponsorId}
                      options={userOptions}
                      placeholder="Select sponsor (optional)"
                    />
                    <FormField
                      label="Project Manager"
                      name="projectManagerId"
                      type="select"
                      value={projectManagerId}
                      onChange={setProjectManagerId}
                      options={userOptions}
                      placeholder="Select project manager (optional)"
                    />
                  </div>
                  <FormField
                    label="Priority"
                    name="priority"
                    type="select"
                    value={priority}
                    onChange={setPriority}
                    options={PRIORITIES}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Timeline & Budget */}
            {step === 3 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Schedule &amp; Budget
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Set the planned timeline and approved budget for this project.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Planned Start"
                      name="plannedStart"
                      type="date"
                      value={plannedStart}
                      onChange={setPlannedStart}
                    />
                    <FormField
                      label="Planned End"
                      name="plannedEnd"
                      type="date"
                      value={plannedEnd}
                      onChange={setPlannedEnd}
                      error={errors.plannedEnd}
                    />
                  </div>
                  <FormField
                    label="Approved Budget"
                    name="budgetApproved"
                    type="number"
                    value={budgetApproved}
                    onChange={setBudgetApproved}
                    placeholder="e.g. 50,000,000"
                    description="Budget amount in NGN"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Create
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
                      <FileText
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Identity
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Title" value={title} />
                      <ReviewField label="Code" value={code} />
                      <ReviewField
                        label="Portfolio"
                        value={findLabel(portfolioOptions, portfolioId)}
                      />
                      <ReviewField
                        label="Division"
                        value={findLabel(divisionOptions, divisionId)}
                      />
                    </div>
                    {description && (
                      <div className="mt-2">
                        <ReviewField label="Description" value={description} />
                      </div>
                    )}
                  </button>

                  {/* Charter summary */}
                  {(charter || scope || businessCase) && (
                    <button
                      type="button"
                      onClick={() => goTo(1)}
                      className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList
                          size={14}
                          className="text-[var(--primary)]"
                        />
                        <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                          Charter &amp; Scope
                        </span>
                      </div>
                      <div className="space-y-1">
                        {charter && (
                          <ReviewField
                            label="Charter"
                            value={
                              charter.length > 120
                                ? charter.slice(0, 120) + "..."
                                : charter
                            }
                          />
                        )}
                        {scope && (
                          <ReviewField
                            label="Scope"
                            value={
                              scope.length > 120
                                ? scope.slice(0, 120) + "..."
                                : scope
                            }
                          />
                        )}
                        {businessCase && (
                          <ReviewField
                            label="Business Case"
                            value={
                              businessCase.length > 120
                                ? businessCase.slice(0, 120) + "..."
                                : businessCase
                            }
                          />
                        )}
                      </div>
                    </button>
                  )}

                  {/* Team summary */}
                  <button
                    type="button"
                    onClick={() => goTo(2)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Team &amp; Priority
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Sponsor"
                        value={findLabel(userOptions, sponsorId)}
                      />
                      <ReviewField
                        label="Project Manager"
                        value={findLabel(userOptions, projectManagerId)}
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Priority:
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[priority] || ""}`}
                        >
                          {priority}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Schedule summary */}
                  <button
                    type="button"
                    onClick={() => goTo(3)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Schedule &amp; Budget
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Planned Start"
                        value={
                          plannedStart
                            ? new Date(plannedStart).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"
                        }
                      />
                      <ReviewField
                        label="Planned End"
                        value={
                          plannedEnd
                            ? new Date(plannedEnd).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"
                        }
                      />
                      <ReviewField
                        label="Approved Budget"
                        value={
                          budgetApproved
                            ? `NGN ${Number(budgetApproved).toLocaleString()}`
                            : "—"
                        }
                      />
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
          onClick={step === 0 ? () => router.push("/dashboard/planning/projects") : goPrev}
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
            disabled={createProject.isPending || !title.trim() || !code.trim()}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createProject.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Project
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

"use client";

import {
  useState,
  useCallback,
  useMemo,
  type Dispatch,
  type ElementType,
  type SetStateAction,
} from "react";
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
  Briefcase,
  CalendarClock,
  CircleAlert,
  CheckCircle2,
  Layers3,
  ShieldCheck,
  Target,
  Zap,
  FileText,
  ChevronRight,
  Lightbulb,
  Radar,
  Gauge,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { ProjectPicker } from "@/components/shared/pickers";
import { useCreateChangeRequest } from "@/hooks/use-planning";

const PANEL_CLASS =
  "rounded-[1.8rem] border border-slate-200/70 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/82 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

const STEP_CARD_CLASS =
  "rounded-[1.35rem] border p-4 text-left transition-all duration-200";

const BRAND_TINT = "rgba(27,115,64,0.08)";
const BRAND_BORDER = "rgba(27,115,64,0.22)";
const GOLD_TINT = "rgba(139,111,46,0.1)";
const GOLD_BORDER = "rgba(139,111,46,0.22)";
const INFO_BORDER = "rgba(59,130,246,0.22)";
const PRIMARY_BUTTON_STYLE = {
  backgroundImage: "var(--gradient-primary)",
  borderColor: "var(--primary-light)",
  boxShadow: "var(--shadow-premium)",
};
const HERO_STYLE = {
  backgroundImage:
    "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 38%), radial-gradient(circle at bottom left, rgba(139,111,46,0.18), transparent 34%), var(--gradient-primary)",
  borderColor: "rgba(45,155,86,0.32)",
  boxShadow: "var(--shadow-premium)",
};

const STEPS = [
  {
    label: "Request Frame",
    icon: GitPullRequest,
    description: "Define the change and anchor it to delivery context.",
    cue: "Identity, scope, and urgency",
  },
  {
    label: "Reasoning",
    icon: Scale,
    description: "Explain why the change matters and what it touches.",
    cue: "Justification and impact",
  },
  {
    label: "Review",
    icon: Sparkles,
    description: "Check the signal, then submit into governance review.",
    cue: "Final pass and submit",
  },
];

const PRIORITY_META: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    description: string;
    icon: ElementType;
  }
> = {
  low: {
    label: "Low",
    color: "var(--success-dark)",
    bg: "var(--success-light)",
    border: "var(--success)",
    description: "Local adjustment with flexible timing.",
    icon: ShieldCheck,
  },
  medium: {
    label: "Medium",
    color: "var(--gold-dark)",
    bg: "var(--badge-amber-bg)",
    border: "var(--gold)",
    description: "Material change that needs coordinated review.",
    icon: Target,
  },
  high: {
    label: "High",
    color: "var(--warning-dark)",
    bg: "var(--warning-light)",
    border: "var(--warning)",
    description: "Strong delivery impact or time-sensitive pressure.",
    icon: Zap,
  },
  critical: {
    label: "Critical",
    color: "var(--error-dark)",
    bg: "var(--error-light)",
    border: "var(--error)",
    description: "Governance attention required immediately.",
    icon: CircleAlert,
  },
};

const CATEGORY_META: Array<{
  key: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: ElementType;
}> = [
  {
    key: "scope",
    label: "Scope",
    description: "Deliverables, outcomes, or boundary changes.",
    color: "var(--gold-dark)",
    bg: "var(--badge-amber-bg)",
    border: "var(--gold)",
    icon: Layers3,
  },
  {
    key: "schedule",
    label: "Schedule",
    description: "Timeline shifts, sequencing, or milestone changes.",
    color: "var(--badge-blue-text)",
    bg: "var(--badge-blue-bg)",
    border: "var(--badge-blue-dot)",
    icon: CalendarClock,
  },
  {
    key: "budget",
    label: "Budget",
    description: "Funding, spend, or cost envelope adjustments.",
    color: "var(--badge-emerald-text)",
    bg: "var(--badge-emerald-bg)",
    border: "var(--badge-emerald-dot)",
    icon: Gauge,
  },
  {
    key: "resource",
    label: "Resource",
    description: "People, capacity, or ownership changes.",
    color: "var(--badge-amber-text)",
    bg: "var(--badge-amber-bg)",
    border: "var(--badge-amber-dot)",
    icon: Briefcase,
  },
  {
    key: "technical",
    label: "Technical",
    description: "Architecture, dependency, or implementation shifts.",
    color: "var(--badge-red-text)",
    bg: "var(--badge-red-bg)",
    border: "var(--badge-red-dot)",
    icon: Radar,
  },
  {
    key: "other",
    label: "Other",
    description: "Change driver outside the standard lanes.",
    color: "var(--text-muted)",
    bg: "var(--surface-1)",
    border: "var(--surface-3)",
    icon: FileText,
  },
];

const JUSTIFICATION_PROMPTS = [
  "Preserve delivery commitments for an external dependency shift.",
  "Capture compliance or policy changes affecting the current plan.",
  "Address a newly surfaced risk before it impacts execution quality.",
];

const IMPACT_PROMPTS = [
  "Timeline impact: identify milestone movement and any recovery options.",
  "Resource impact: note team, vendor, or budget adjustments required.",
  "Delivery impact: call out scope, quality, or dependency implications.",
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 90 : -90,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 90 : -90,
    opacity: 0,
  }),
};

function ReviewField({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm leading-6 ${
          tone === "accent"
            ? "font-medium text-[var(--text-primary)]"
            : "text-[var(--text-secondary)]"
        }`}
      >
        {value || "Not provided yet"}
      </p>
    </div>
  );
}

export default function NewChangeRequestPage() {
  const router = useRouter();
  const createChangeRequest = useCreateChangeRequest();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectDisplay, setProjectDisplay] = useState("");
  const [justification, setJustification] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const activePriority = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  const activeCategory =
    CATEGORY_META.find((entry) => entry.key === category) ?? null;

  const completionScore = useMemo(() => {
    const checks = [
      Boolean(title.trim()),
      Boolean(description.trim()),
      Boolean(projectId.trim()),
      Boolean(justification.trim()),
      Boolean(impactAssessment.trim()),
      Boolean(category),
    ];
    const complete = checks.filter(Boolean).length;
    return Math.round((complete / checks.length) * 100);
  }, [
    category,
    description,
    impactAssessment,
    justification,
    projectId,
    title,
  ]);

  const checklist = useMemo(
    () => [
      { label: "Clear request title", done: Boolean(title.trim()) },
      { label: "Project linked", done: Boolean(projectId.trim()) },
      { label: "Justification captured", done: Boolean(justification.trim()) },
      {
        label: "Impact assessment drafted",
        done: Boolean(impactAssessment.trim()),
      },
      { label: "Category chosen", done: Boolean(category) },
    ],
    [category, impactAssessment, justification, projectId, title],
  );

  const requestNarrative = useMemo(() => {
    if (!title.trim() && !justification.trim()) {
      return "Shape the request on the left and the live summary will tighten here.";
    }

    const scope = category ? `${category} change` : "change request";
    const target = projectDisplay || "an unlinked project";
    const driver = justification.trim()
      ? justification.trim().slice(0, 96)
      : "reason still being drafted";

    return `${title.trim() || "Untitled request"} is positioned as a ${scope} for ${target}. Current driver: ${driver}${driver.length >= 96 ? "..." : ""}`;
  }, [category, justification, projectDisplay, title]);

  const stepComplete = [
    Boolean(title.trim()) && Boolean(category),
    Boolean(justification.trim()),
    false,
  ];

  const validateStep = useCallback(
    (targetStep: number): boolean => {
      const newErrors: Record<string, string> = {};

      if (targetStep === 0) {
        if (!title.trim()) newErrors.title = "Title is required";
        if (!category) newErrors.category = "Select a category";
      }

      if (targetStep === 1) {
        if (!justification.trim()) {
          newErrors.justification = "Justification is required";
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [category, justification, title],
  );

  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }, [step, validateStep]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (target > step && !validateStep(step)) return;
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  const applyPrompt = useCallback(
    (
      setter: Dispatch<SetStateAction<string>>,
      current: string,
      prompt: string,
    ) => {
      setter(current.trim() ? `${current.trim()} ${prompt}` : prompt);
    },
    [],
  );

  function handleSubmit() {
    createChangeRequest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId.trim() || undefined,
        justification: justification.trim(),
        impactAssessment: impactAssessment.trim() || undefined,
        priority,
        category: category || undefined,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/planning/change-requests");
        },
      },
    );
  }

  const isLastStep = step === STEPS.length - 1;
  const ActiveStepIcon = STEPS[step].icon;

  return (
    <div className="space-y-6 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border px-6 py-7 text-white"
        style={HERO_STYLE}
      >
        <div className="absolute -right-14 top-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div
          className="absolute bottom-0 left-0 h-44 w-44 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(139,111,46,0.16)" }}
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <button
              type="button"
              onClick={() => router.push("/dashboard/planning/change-requests")}
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/82 backdrop-blur-xl transition-all hover:bg-white/14"
            >
              <ArrowLeft size={14} />
              Back to Change Control
            </button>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                <ActiveStepIcon size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.15rem]">
                  New Change Request
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/88 sm:text-[15px]">
                  Compose a stronger request with live quality signals, guided
                  prompts, and a submission snapshot that evolves as you type.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Sparkles size={14} />
                    Step {step + 1} of {STEPS.length}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Gauge size={14} />
                    {completionScore}% ready
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                    <Target size={14} />
                    {activePriority.label} urgency
                  </span>
                  {projectDisplay && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl">
                      <Briefcase size={14} />
                      {projectDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[460px]">
            {[
              {
                label: "Current Step",
                value: STEPS[step].label,
                hint: STEPS[step].cue,
                icon: ActiveStepIcon,
              },
              {
                label: "Priority Signal",
                value: activePriority.label,
                hint: activePriority.description,
                icon: activePriority.icon,
              },
              {
                label: "Category Lens",
                value: activeCategory?.label || "Unselected",
                hint:
                  activeCategory?.description ||
                  "Choose the lane this request belongs to.",
                icon: activeCategory?.icon || Layers3,
              },
              {
                label: "Submission Mode",
                value: isLastStep ? "Ready to send" : "Drafting",
                hint: isLastStep
                  ? "One final check before governance review."
                  : "Build the case before submitting.",
                icon: isLastStep ? CheckCircle2 : FileText,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-[1.35rem] border border-white/14 bg-white/10 p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between text-white/72">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                      {card.label}
                    </span>
                    <Icon size={16} />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/76">
                    {card.hint}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`${PANEL_CLASS} p-5`}
          >
            <div className="grid gap-3 md:grid-cols-3">
              {STEPS.map((entry, index) => {
                const Icon = entry.icon;
                const isActive = index === step;
                const isDone = index < step || stepComplete[index];

                return (
                  <button
                    key={entry.label}
                    type="button"
                    onClick={() => goTo(index)}
                    className={STEP_CARD_CLASS}
                    style={{
                      borderColor: isActive
                        ? BRAND_BORDER
                        : "rgba(226,232,240,0.85)",
                      backgroundColor: isActive
                        ? BRAND_TINT
                        : isDone
                          ? GOLD_TINT
                          : "rgba(248,250,252,0.88)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/84 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                        style={{
                          color: isActive
                            ? "var(--primary)"
                            : isDone
                              ? "var(--gold)"
                              : "var(--text-muted)",
                          borderColor: isActive
                            ? BRAND_BORDER
                            : "rgba(226,232,240,0.85)",
                        }}
                      >
                        {isDone && !isActive ? (
                          <Check size={18} />
                        ) : (
                          <Icon size={18} />
                        )}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          isActive
                            ? "bg-[var(--success-light)] text-[var(--primary)]"
                            : isDone
                              ? "bg-[var(--badge-amber-bg)] text-[var(--gold-dark)]"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isActive
                          ? "Current"
                          : isDone
                            ? "Ready"
                            : `Step ${index + 1}`}
                      </span>
                    </div>
                    <h2 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                      {entry.label}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {entry.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={`${PANEL_CLASS} overflow-hidden`}
          >
            <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {STEPS[step].label}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {STEPS[step].description}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200/80 bg-white/84 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {STEPS[step].cue}
                </span>
              </div>
            </div>

            <div className="p-6">
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
                  {step === 0 && (
                    <div className="space-y-6">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <div className="space-y-4">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                              Title
                              <span className="ml-1 text-[var(--error)]">
                                *
                              </span>
                            </label>
                            <input
                              type="text"
                              value={title}
                              onChange={(event) => setTitle(event.target.value)}
                              placeholder="e.g. Extend delivery window for vendor integration"
                              className={`w-full rounded-[1.35rem] border bg-white/90 px-4 py-4 text-base text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--success-light)] ${
                                errors.title
                                  ? "border-[var(--error)] ring-4 ring-[var(--error-light)]"
                                  : "border-[var(--border)]"
                              }`}
                            />
                            {errors.title && (
                              <p className="mt-2 text-xs font-medium text-[var(--error)]">
                                {errors.title}
                              </p>
                            )}
                          </div>

                          <FormField
                            label="Description"
                            name="description"
                            type="textarea"
                            value={description}
                            onChange={setDescription}
                            placeholder="Describe the change request in clear operational language."
                            rows={5}
                            description="Use this to capture the visible request story before deeper justification."
                          />

                          <ProjectPicker
                            label="Project"
                            value={projectId || undefined}
                            displayValue={projectDisplay}
                            onChange={(id, displayValue) => {
                              setProjectId(id ?? "");
                              setProjectDisplay(displayValue);
                            }}
                            description="Attach the request to a project for tighter governance routing."
                          />
                        </div>

                        <div
                          className="rounded-[1.5rem] border p-4"
                          style={{
                            borderColor: GOLD_BORDER,
                            backgroundColor: "var(--badge-amber-bg)",
                          }}
                        >
                          <p
                            className="text-xs font-semibold uppercase tracking-[0.18em]"
                            style={{ color: "var(--gold-dark)" }}
                          >
                            Framing Notes
                          </p>
                          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                            Strong requests name the change clearly, tie it to a
                            project when possible, and make urgency obvious
                            before governance review begins.
                          </p>
                          <div className="mt-4 space-y-3">
                            {[
                              "Keep the title outcome-focused rather than task-focused.",
                              "Use the description for context, not the full business case.",
                              "Priority should reflect decision urgency, not implementation difficulty.",
                            ].map((tip) => (
                              <div
                                key={tip}
                                className="flex gap-3 rounded-[1.1rem] border border-white/70 bg-white/82 px-3 py-3"
                              >
                                <Lightbulb
                                  size={16}
                                  className="mt-0.5 shrink-0"
                                  style={{ color: "var(--gold)" }}
                                />
                                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                                  {tip}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              Priority Signal
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              Pick the urgency that should shape review
                              attention.
                            </p>
                          </div>
                          <span
                            className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                            style={{
                              backgroundColor: activePriority.bg,
                              color: activePriority.color,
                            }}
                          >
                            {activePriority.label}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {Object.entries(PRIORITY_META).map(([key, meta]) => {
                            const Icon = meta.icon;
                            const active = priority === key;

                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setPriority(key)}
                                className="rounded-[1.25rem] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                                style={{
                                  borderColor: active
                                    ? meta.border
                                    : "rgba(226,232,240,0.85)",
                                  backgroundColor: active
                                    ? meta.bg
                                    : "rgba(248,250,252,0.88)",
                                  boxShadow: active
                                    ? "0 20px 35px -28px rgba(15,23,42,0.35)"
                                    : "none",
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/84"
                                    style={{
                                      color: meta.color,
                                      borderColor: active
                                        ? meta.border
                                        : "rgba(226,232,240,0.85)",
                                    }}
                                  >
                                    <Icon size={18} />
                                  </span>
                                  {active && (
                                    <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                                  {meta.label}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                  {meta.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              Category Lens
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              Classify the request so reviewers see the primary
                              change dimension immediately.
                            </p>
                          </div>
                          {errors.category && (
                            <span className="text-xs font-medium text-[var(--error)]">
                              {errors.category}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {CATEGORY_META.map((entry) => {
                            const Icon = entry.icon;
                            const active = category === entry.key;

                            return (
                              <button
                                key={entry.key}
                                type="button"
                                onClick={() => {
                                  setCategory(entry.key);
                                  setErrors((current) => {
                                    const next = { ...current };
                                    delete next.category;
                                    return next;
                                  });
                                }}
                                className="rounded-[1.25rem] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                                style={{
                                  borderColor: active
                                    ? entry.border
                                    : "rgba(226,232,240,0.85)",
                                  backgroundColor: active
                                    ? entry.bg
                                    : "rgba(248,250,252,0.88)",
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/84"
                                    style={{
                                      color: entry.color,
                                      borderColor: active
                                        ? entry.border
                                        : "rgba(226,232,240,0.85)",
                                    }}
                                  >
                                    <Icon size={18} />
                                  </span>
                                  {active && (
                                    <CheckCircle2
                                      size={18}
                                      style={{ color: entry.color }}
                                    />
                                  )}
                                </div>
                                <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                                  {entry.label}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                  {entry.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div
                          className="rounded-[1.45rem] border p-4"
                          style={{
                            borderColor: GOLD_BORDER,
                            backgroundColor: "var(--badge-amber-bg)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                Justification Prompts
                              </h3>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                Quick inserts to help shape the business case.
                              </p>
                            </div>
                            <Lightbulb
                              size={18}
                              style={{ color: "var(--gold-dark)" }}
                            />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {JUSTIFICATION_PROMPTS.map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                onClick={() =>
                                  applyPrompt(
                                    setJustification,
                                    justification,
                                    prompt,
                                  )
                                }
                                className="rounded-full border bg-white/90 px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:bg-white"
                                style={{
                                  borderColor: GOLD_BORDER,
                                  color: "var(--gold-dark)",
                                }}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div
                          className="rounded-[1.45rem] border p-4"
                          style={{
                            borderColor: INFO_BORDER,
                            backgroundColor: "var(--info-light)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                Impact Prompts
                              </h3>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                Cover the consequences before reviewers ask.
                              </p>
                            </div>
                            <Radar
                              size={18}
                              style={{ color: "var(--info-dark)" }}
                            />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {IMPACT_PROMPTS.map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                onClick={() =>
                                  applyPrompt(
                                    setImpactAssessment,
                                    impactAssessment,
                                    prompt,
                                  )
                                }
                                className="rounded-full border bg-white/90 px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:bg-white"
                                style={{
                                  borderColor: INFO_BORDER,
                                  color: "var(--info-dark)",
                                }}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                        <div className="space-y-4">
                          <FormField
                            label="Justification"
                            name="justification"
                            type="textarea"
                            value={justification}
                            onChange={setJustification}
                            placeholder="Why is this change necessary? What business or delivery outcome depends on it?"
                            rows={6}
                            required
                            error={errors.justification}
                            description="Lead with the driver, then explain the need for change."
                          />

                          <FormField
                            label="Impact Assessment"
                            name="impactAssessment"
                            type="textarea"
                            value={impactAssessment}
                            onChange={setImpactAssessment}
                            placeholder="Explain the effect on scope, schedule, budget, dependencies, or resources."
                            rows={6}
                            description="Call out downstream impacts, trade-offs, and any mitigation path."
                          />
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                Impact Lens
                              </h3>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                The live summary below reflects the current
                                framing.
                              </p>
                            </div>
                            <Gauge
                              size={18}
                              style={{ color: "var(--primary)" }}
                            />
                          </div>
                          <div className="mt-4 space-y-3">
                            {[
                              {
                                label: "Urgency",
                                value: activePriority.label,
                                tone: activePriority.color,
                              },
                              {
                                label: "Category",
                                value: activeCategory?.label || "Not chosen",
                                tone:
                                  activeCategory?.color || "var(--text-muted)",
                              },
                              {
                                label: "Project link",
                                value: projectDisplay || "Not linked",
                                tone: projectDisplay
                                  ? "var(--info-dark)"
                                  : "var(--text-muted)",
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded-[1.1rem] border border-white/70 bg-white/84 px-3 py-3"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                                  {item.label}
                                </p>
                                <p
                                  className="mt-1 text-sm font-medium"
                                  style={{ color: item.tone }}
                                >
                                  {item.value}
                                </p>
                              </div>
                            ))}
                            <div className="rounded-[1.1rem] border border-white/70 bg-white/84 px-3 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                                Narrative preview
                              </p>
                              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                {requestNarrative}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <div
                        className="rounded-[1.45rem] border p-4"
                        style={{
                          borderColor: "var(--success)",
                          backgroundColor: "var(--success-light)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/90"
                            style={{
                              borderColor: "rgba(16,185,129,0.22)",
                              color: "var(--success-dark)",
                            }}
                          >
                            <Sparkles size={18} />
                          </span>
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              Review Before Submit
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              Click any card below to jump back and refine the
                              draft.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => goTo(0)}
                          className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GitPullRequest
                                size={16}
                                style={{ color: "var(--primary)" }}
                              />
                              <span
                                className="text-xs font-semibold uppercase tracking-[0.16em]"
                                style={{ color: "var(--primary)" }}
                              >
                                Request Frame
                              </span>
                            </div>
                            <ChevronRight
                              size={16}
                              className="text-[var(--text-tertiary)]"
                            />
                          </div>
                          <div className="space-y-3">
                            <ReviewField
                              label="Title"
                              value={title}
                              tone="accent"
                            />
                            <ReviewField
                              label="Project"
                              value={projectDisplay || "Unlinked"}
                            />
                            <ReviewField
                              label="Priority"
                              value={activePriority.label}
                            />
                            <ReviewField
                              label="Category"
                              value={activeCategory?.label || "Not selected"}
                            />
                            <ReviewField
                              label="Description"
                              value={description || "No short description yet"}
                            />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => goTo(1)}
                          className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Scale
                                size={16}
                                style={{ color: "var(--gold)" }}
                              />
                              <span
                                className="text-xs font-semibold uppercase tracking-[0.16em]"
                                style={{ color: "var(--gold-dark)" }}
                              >
                                Reasoning
                              </span>
                            </div>
                            <ChevronRight
                              size={16}
                              className="text-[var(--text-tertiary)]"
                            />
                          </div>
                          <div className="space-y-3">
                            <ReviewField
                              label="Justification"
                              value={justification}
                              tone="accent"
                            />
                            <ReviewField
                              label="Impact Assessment"
                              value={
                                impactAssessment || "No impact assessment yet"
                              }
                            />
                          </div>
                        </button>
                      </div>

                      <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              Submission Snapshot
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              This is the shape reviewers will encounter first.
                            </p>
                          </div>
                          <CheckCircle2
                            size={18}
                            style={{ color: "var(--success-dark)" }}
                          />
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                          {requestNarrative}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-slate-200/80 bg-slate-50/70 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={
                    step === 0
                      ? () => router.push("/dashboard/planning/change-requests")
                      : goPrev
                  }
                  className={SECONDARY_BUTTON_CLASS}
                >
                  <ArrowLeft size={16} />
                  {step === 0 ? "Cancel" : "Previous"}
                </button>

                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === step
                          ? "w-8 bg-[var(--primary)]"
                          : index < step
                            ? "w-2 bg-[var(--gold-light)]"
                            : "w-2 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>

                {isLastStep ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      createChangeRequest.isPending ||
                      !title.trim() ||
                      !justification.trim() ||
                      !category
                    }
                    className={PRIMARY_BUTTON_CLASS}
                    style={PRIMARY_BUTTON_STYLE}
                  >
                    {createChangeRequest.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Submit Change Request
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className={PRIMARY_BUTTON_CLASS}
                    style={PRIMARY_BUTTON_STYLE}
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-5 xl:sticky xl:top-6 xl:self-start"
        >
          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Readiness
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Live signal based on the current draft.
                </p>
              </div>
              <Gauge size={18} style={{ color: "var(--primary)" }} />
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold text-[var(--text-primary)]">
                  {completionScore}%
                </p>
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {completionScore >= 80
                    ? "Ready"
                    : completionScore >= 50
                      ? "Developing"
                      : "Early draft"}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${completionScore}%`,
                    backgroundImage: "var(--gradient-primary)",
                  }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3"
                >
                  <span className="text-sm text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  {item.done ? (
                    <CheckCircle2
                      size={16}
                      style={{ color: "var(--success-dark)" }}
                    />
                  ) : (
                    <CircleAlert
                      size={16}
                      style={{ color: "var(--warning)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Live Snapshot
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  A compact view of how the draft currently reads.
                </p>
              </div>
              <Radar size={18} style={{ color: "var(--gold)" }} />
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {title.trim() || "Untitled change request"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {requestNarrative}
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              <div
                className="rounded-[1.2rem] border p-4"
                style={{
                  borderColor: activePriority.border,
                  backgroundColor: activePriority.bg,
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: activePriority.color }}
                >
                  Priority
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {activePriority.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {activePriority.description}
                </p>
              </div>

              <div
                className="rounded-[1.2rem] border p-4"
                style={{
                  borderColor: activeCategory?.border || "var(--border)",
                  backgroundColor: activeCategory?.bg || "var(--surface-1)",
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{
                    color: activeCategory?.color || "var(--text-muted)",
                  }}
                >
                  Category
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {activeCategory?.label || "Unselected"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {activeCategory?.description ||
                    "Select a category to clarify the type of change under review."}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Project Link
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {projectDisplay || "No linked project"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {projectDisplay
                    ? "The request will route with stronger project context."
                    : "You can submit without a project, but governance context will be lighter."}
                </p>
              </div>
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Workflow Path
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  What happens after submission.
                </p>
              </div>
              <Sparkles size={18} style={{ color: "var(--primary-light)" }} />
            </div>

            <div className="mt-4 space-y-3">
              {[
                "Submitted into the change-request queue.",
                "Reviewed for impact, urgency, and governance fit.",
                "Approved or rejected with traceable rationale.",
                "Implemented changes remain visible in the control board.",
              ].map((entry, index) => (
                <div
                  key={entry}
                  className="flex gap-3 rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                    style={{ color: "var(--primary)" }}
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {entry}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </motion.aside>
      </div>
    </div>
  );
}

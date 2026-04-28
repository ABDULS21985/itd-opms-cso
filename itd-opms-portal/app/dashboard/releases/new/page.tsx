"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  FileText,
  Flame,
  FlaskConical,
  GitBranch,
  Lightbulb,
  Loader2,
  Package,
  Plus,
  Rocket,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateRelease } from "@/hooks/use-release";
import {
  RELEASE_TYPES,
  RELEASE_ENVIRONMENTS,
  RELEASE_ITEM_TYPES,
  RISK_LEVELS,
} from "@/types/release";

/* ------------------------------------------------------------------ */
/*  Style tokens (mirrors change-requests/new wizard)                   */
/* ------------------------------------------------------------------ */

const PANEL_CLASS =
  "rounded-[1.8rem] border border-slate-200/70 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/82 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

const STEP_CARD_CLASS =
  "rounded-[1.35rem] border p-4 text-left transition-all duration-200";

const BRAND_TINT = "rgba(27,115,64,0.08)";
const BRAND_BORDER = "rgba(27,115,64,0.22)";
const GOLD_TINT = "rgba(139,111,46,0.1)";
const GOLD_BORDER = "rgba(139,111,46,0.22)";

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
/*  Step + metadata definitions                                        */
/* ------------------------------------------------------------------ */

interface StepDef {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  cue: string;
}

const STEPS: StepDef[] = [
  {
    id: "type",
    label: "Type & Details",
    icon: Rocket,
    description: "Frame the release with a type, title, and intent.",
    cue: "Identity and shape",
  },
  {
    id: "items",
    label: "Release Items",
    icon: Package,
    description: "List the artefacts that ship with this release.",
    cue: "Content of the package",
  },
  {
    id: "deployment",
    label: "Deployment Plan",
    icon: GitBranch,
    description: "Capture the rollout sequence and rollback strategy.",
    cue: "Path to production",
  },
  {
    id: "risk",
    label: "Risk Assessment",
    icon: ShieldAlert,
    description: "Set the risk posture and call out mitigations.",
    cue: "Confidence signal",
  },
  {
    id: "schedule",
    label: "Schedule & Team",
    icon: CalendarClock,
    description: "Lock in timing, environment, and ownership.",
    cue: "Last mile before submit",
  },
];

const TYPE_META: Record<
  string,
  {
    icon: LucideIcon;
    accent: string;
    bg: string;
    border: string;
    description: string;
  }
> = {
  major: {
    icon: Rocket,
    accent: "#A8893D",
    bg: "rgba(168,137,61,0.12)",
    border: "rgba(168,137,61,0.32)",
    description:
      "Significant new features or breaking changes. Full testing and CAB review required.",
  },
  minor: {
    icon: Package,
    accent: "#26A8D9",
    bg: "rgba(38,168,217,0.12)",
    border: "rgba(38,168,217,0.32)",
    description: "Incremental improvements and non-breaking enhancements.",
  },
  patch: {
    icon: CheckCircle2,
    accent: "#16A34A",
    bg: "rgba(22,163,74,0.12)",
    border: "rgba(22,163,74,0.32)",
    description: "Bug fixes and minor corrections. Streamlined approval path.",
  },
  emergency: {
    icon: Zap,
    accent: "#DC2626",
    bg: "rgba(220,38,38,0.12)",
    border: "rgba(220,38,38,0.32)",
    description:
      "Critical hotfix requiring expedited deployment. Bypasses standard approval.",
  },
};

const RISK_META: Record<
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
    description: "Localised change with strong test coverage and easy revert.",
    icon: ShieldCheck,
  },
  medium: {
    label: "Medium",
    color: "var(--gold-dark)",
    bg: "var(--badge-amber-bg)",
    border: "var(--gold)",
    description: "Material change with manageable blast radius.",
    icon: Target,
  },
  high: {
    label: "High",
    color: "var(--warning-dark)",
    bg: "var(--warning-light)",
    border: "var(--warning)",
    description: "Touches critical paths or has cross-team dependencies.",
    icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    color: "var(--error-dark)",
    bg: "var(--error-light)",
    border: "var(--error)",
    description: "Outage-level exposure or compliance-sensitive change.",
    icon: Flame,
  },
};

const ENV_META: Record<
  string,
  {
    label: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    icon: ElementType;
  }
> = {
  development: {
    label: "Development",
    description: "Internal sandbox for in-flight builds.",
    color: "var(--info-dark)",
    bg: "var(--info-light)",
    border: "var(--info)",
    icon: Code2,
  },
  staging: {
    label: "Staging",
    description: "Pre-production mirror for validation.",
    color: "var(--gold-dark)",
    bg: "var(--badge-amber-bg)",
    border: "var(--gold)",
    icon: FlaskConical,
  },
  production: {
    label: "Production",
    description: "Customer-facing environment.",
    color: "var(--success-dark)",
    bg: "var(--success-light)",
    border: "var(--success)",
    icon: Server,
  },
};

const ITEM_TYPE_ICON: Record<string, LucideIcon> = {
  software: Package,
  hardware: Wrench,
  configuration: GitBranch,
  documentation: FileText,
};

const STEP_TIPS: string[][] = [
  [
    "Pick a release type that mirrors the actual blast radius of the change.",
    "Use a title pattern reviewers can scan: version + theme (e.g. v2.4.0 — Dashboard Upgrade).",
    "The description seeds context for approvers — name the why, not just the what.",
  ],
  [
    "Group related artefacts under one release rather than splitting them across many.",
    "Tag config and documentation items so downstream owners know what to update.",
    "Items are optional — only add what materially ships with this release.",
  ],
  [
    "Order deployment steps so each is independently verifiable.",
    "Call out feature flags or migration gates explicitly — implicit ones get missed.",
    "A rollback plan you can read in 30 seconds beats a perfect one nobody opens.",
  ],
  [
    "Risk should reflect blast radius, not engineering complexity.",
    "Mitigations belong in the notes — name owners and trigger conditions.",
    "Critical risk auto-escalates approval routing — only use when warranted.",
  ],
  [
    "Pick a window that respects change freezes and on-call coverage.",
    "Production deploys default to needing a release manager named here.",
    "End time is your forecast, not a contract — leave room for verification.",
  ],
];

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                       */
/* ------------------------------------------------------------------ */

interface ItemRow {
  title: string;
  itemType: string;
  notes: string;
}

function HeroPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-sm text-white/90 backdrop-blur-xl"
      style={
        tone === "accent"
          ? { backgroundColor: "rgba(255,255,255,0.18)" }
          : undefined
      }
    >
      <Icon size={14} />
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/14 bg-white/10 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between text-white/72">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
        <Icon size={16} />
      </div>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/76">{hint}</p>
    </div>
  );
}

function OptionCard({
  active,
  icon: Icon,
  title,
  description,
  color,
  bg,
  border,
  onClick,
  ariaPressed = true,
}: {
  active: boolean;
  icon: ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  onClick: () => void;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ? active : undefined}
      className="rounded-[1.25rem] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
      style={{
        borderColor: active ? border : "rgba(226,232,240,0.85)",
        backgroundColor: active ? bg : "rgba(248,250,252,0.88)",
        boxShadow: active
          ? "0 20px 35px -28px rgba(15,23,42,0.35)"
          : "none",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/84"
          style={{
            color,
            borderColor: active ? border : "rgba(226,232,240,0.85)",
          }}
        >
          <Icon size={18} />
        </span>
        {active && (
          <CheckCircle2 size={18} style={{ color }} />
        )}
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </button>
  );
}

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
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
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

function ReviewSection({
  title,
  icon: Icon,
  accent,
  onEdit,
  children,
}: {
  title: string;
  icon: ElementType;
  accent: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: accent }} />
          <span
            className="text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: accent }}
          >
            {title}
          </span>
        </div>
        <ChevronRight
          size={16}
          className="text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <div className="space-y-3">{children}</div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewReleasePage() {
  const router = useRouter();
  const createRelease = useCreateRelease();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    releaseType: "",
    title: "",
    description: "",
    deploymentPlan: "",
    rollbackPlan: "",
    riskLevel: "medium",
    riskNotes: "",
    plannedStart: "",
    plannedEnd: "",
    environment: "production",
    releaseManager: "",
  });

  const [items, setItems] = useState<ItemRow[]>([]);

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const addItem = useCallback((presetType?: string) => {
    setItems((prev) => [
      ...prev,
      { title: "", itemType: presetType || "software", notes: "" },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback(
    (index: number, field: keyof ItemRow, value: string) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const validateStep = useCallback(
    (target: number): boolean => {
      const next: Record<string, string> = {};
      if (target === 0) {
        if (!form.releaseType) next.releaseType = "Pick a release type";
        if (!form.title.trim()) next.title = "Title is required";
        if (!form.description.trim())
          next.description = "Description is required";
      }
      if (target === 2) {
        if (!form.deploymentPlan.trim())
          next.deploymentPlan = "Deployment steps are required";
      }
      if (target === 3) {
        if (!form.riskLevel) next.riskLevel = "Pick a risk level";
      }
      if (target === 4) {
        if (!form.environment) next.environment = "Pick an environment";
        if (
          form.plannedStart &&
          form.plannedEnd &&
          form.plannedEnd < form.plannedStart
        ) {
          next.plannedEnd = "End date must be on or after start date";
        }
      }
      setErrors((prev) => {
        const merged: Record<string, string> = { ...prev };
        // clear previous step-specific keys
        const stepKeys: Record<number, string[]> = {
          0: ["releaseType", "title", "description"],
          2: ["deploymentPlan"],
          3: ["riskLevel"],
          4: ["environment", "plannedEnd"],
        };
        (stepKeys[target] ?? []).forEach((k) => delete merged[k]);
        return { ...merged, ...next };
      });
      return Object.keys(next).length === 0;
    },
    [form],
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
      if (target === step) return;
      if (target > step) {
        // validate every step from current up to target-1
        for (let s = step; s < target; s++) {
          if (!validateStep(s)) return;
        }
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  const completionPct = useMemo(() => {
    const checks = [
      Boolean(form.releaseType),
      Boolean(form.title.trim()),
      Boolean(form.description.trim()),
      Boolean(form.deploymentPlan.trim()),
      Boolean(form.riskLevel),
      Boolean(form.environment),
      items.some((i) => i.title.trim()),
      Boolean(form.plannedStart),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [form, items]);

  const checklist = useMemo(
    () => [
      {
        label: "Release type selected",
        done: Boolean(form.releaseType),
        step: 0,
      },
      { label: "Title and description", done: Boolean(form.title.trim() && form.description.trim()), step: 0 },
      { label: "At least one item", done: items.some((i) => i.title.trim()), step: 1 },
      {
        label: "Deployment steps drafted",
        done: Boolean(form.deploymentPlan.trim()),
        step: 2,
      },
      {
        label: "Risk posture confirmed",
        done: Boolean(form.riskLevel),
        step: 3,
      },
      {
        label: "Environment chosen",
        done: Boolean(form.environment),
        step: 4,
      },
      {
        label: "Planned window set",
        done: Boolean(form.plannedStart),
        step: 4,
      },
    ],
    [form, items],
  );

  const releaseNarrative = useMemo(() => {
    if (!form.releaseType && !form.title.trim()) {
      return "Choose a release type and title to start shaping the rollout signal.";
    }
    const typeLabel =
      RELEASE_TYPES.find((t) => t.value === form.releaseType)?.label ||
      "Untyped";
    const titleText = form.title.trim() || "Untitled release";
    const env = ENV_META[form.environment]?.label || form.environment;
    const risk = RISK_META[form.riskLevel]?.label || form.riskLevel;
    const itemCount = items.filter((i) => i.title.trim()).length;
    const window =
      form.plannedStart && form.plannedEnd
        ? `, scheduled ${form.plannedStart} → ${form.plannedEnd}`
        : form.plannedStart
          ? `, planned to start ${form.plannedStart}`
          : "";
    return `${typeLabel} release "${titleText}" targeting ${env} at ${risk} risk, with ${itemCount} item${itemCount === 1 ? "" : "s"}${window}.`;
  }, [form, items]);

  const activeStep = STEPS[step];
  const activeStepIcon = activeStep.icon;
  const activeType = form.releaseType ? TYPE_META[form.releaseType] : null;
  const activeRisk = RISK_META[form.riskLevel];
  const activeEnv = ENV_META[form.environment];
  const isLastStep = step === STEPS.length - 1;

  const handleSubmit = async () => {
    // Run all step validations defensively
    for (let s = 0; s < STEPS.length; s++) {
      if (!validateStep(s)) {
        setDirection(s < step ? -1 : 1);
        setStep(s);
        return;
      }
    }
    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      releaseType: form.releaseType,
      environment: form.environment,
      deploymentPlan: form.deploymentPlan,
      riskLevel: form.riskLevel,
    };
    if (form.rollbackPlan) body.rollbackPlan = form.rollbackPlan;
    if (form.riskNotes) body.riskNotes = form.riskNotes;
    if (form.plannedStart) body.plannedStartDate = form.plannedStart + "T00:00:00Z";
    if (form.plannedEnd) body.plannedEndDate = form.plannedEnd + "T00:00:00Z";
    if (form.releaseManager) body.releaseManager = form.releaseManager;
    const namedItems = items.filter((i) => i.title.trim());
    if (namedItems.length > 0) body.items = namedItems;

    try {
      const result = await createRelease.mutateAsync(body);
      router.push(`/dashboard/releases/${(result as { id: string }).id}`);
    } catch {
      // Error surfaced by hook
    }
  };

  return (
    <div className="space-y-7 pb-10">
      {/* Hero banner */}
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
              onClick={() => router.push("/dashboard/releases/list")}
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/82 backdrop-blur-xl transition-all hover:bg-white/14"
            >
              <ArrowLeft size={14} />
              Back to Releases
            </button>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/16 bg-white/14 shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-xl">
                {(() => {
                  const Icon = activeStepIcon;
                  return <Icon size={28} />;
                })()}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.15rem]">
                  New Release
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/88 sm:text-[15px]">
                  Compose a clear, low-friction release package — guided
                  prompts, live readiness, and a review snapshot that evolves
                  as you type.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <HeroPill
                    icon={Sparkles}
                    label={`Step ${step + 1} of ${STEPS.length}`}
                  />
                  <HeroPill
                    icon={Target}
                    label={`${completionPct}% ready`}
                    tone="accent"
                  />
                  {activeType && (
                    <HeroPill
                      icon={activeType.icon}
                      label={
                        RELEASE_TYPES.find(
                          (t) => t.value === form.releaseType,
                        )?.label || ""
                      }
                    />
                  )}
                  <HeroPill
                    icon={activeRisk.icon as LucideIcon}
                    label={`${activeRisk.label} risk`}
                  />
                  <HeroPill
                    icon={activeEnv.icon as LucideIcon}
                    label={activeEnv.label}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[460px]">
            <StatCard
              label="Current Step"
              value={activeStep.label}
              hint={activeStep.cue}
              icon={activeStep.icon}
            />
            <StatCard
              label="Release Type"
              value={
                RELEASE_TYPES.find((t) => t.value === form.releaseType)
                  ?.label || "Not chosen"
              }
              hint={
                activeType?.description.split(".")[0] ||
                "Pick a type to anchor approval routing."
              }
              icon={activeType?.icon || Rocket}
            />
            <StatCard
              label="Risk Posture"
              value={activeRisk.label}
              hint={activeRisk.description}
              icon={activeRisk.icon}
            />
            <StatCard
              label="Target Environment"
              value={activeEnv.label}
              hint={activeEnv.description}
              icon={activeEnv.icon}
            />
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          {/* Stepper rail */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`${PANEL_CLASS} p-5`}
          >
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              {STEPS.map((entry, index) => {
                const Icon = entry.icon;
                const isActive = index === step;
                const isDone = index < step;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-current={isActive ? "step" : undefined}
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
                            ? "Done"
                            : `Step ${index + 1}`}
                      </span>
                    </div>
                    <h2 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                      {entry.label}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {entry.cue}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* Step panel */}
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
                    {activeStep.label}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {activeStep.description}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200/80 bg-white/84 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {activeStep.cue}
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
                  {/* Step 0 — Type & Details */}
                  {step === 0 && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              Release Type
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              Pick the lane that matches the change&apos;s
                              blast radius.
                            </p>
                          </div>
                          {errors.releaseType && (
                            <span className="text-xs font-medium text-[var(--error)]">
                              {errors.releaseType}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {RELEASE_TYPES.map((rt) => {
                            const meta = TYPE_META[rt.value];
                            return (
                              <OptionCard
                                key={rt.value}
                                active={form.releaseType === rt.value}
                                icon={meta.icon}
                                title={rt.label}
                                description={meta.description}
                                color={meta.accent}
                                bg={meta.bg}
                                border={meta.border}
                                onClick={() =>
                                  updateField("releaseType", rt.value)
                                }
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <div className="space-y-4">
                          <FormField
                            name="title"
                            label="Title"
                            required
                            value={form.title}
                            onChange={(v) => updateField("title", v)}
                            placeholder="e.g. v2.4.0 — Dashboard Upgrade"
                            error={errors.title}
                          />
                          <FormField
                            name="description"
                            label="Description"
                            required
                            type="textarea"
                            rows={5}
                            value={form.description}
                            onChange={(v) => updateField("description", v)}
                            placeholder="Describe what this release includes and why it matters..."
                            error={errors.description}
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
                            Strong releases name the change clearly and tie
                            type to actual impact, not engineering effort.
                          </p>
                          <div className="mt-4 space-y-3">
                            {STEP_TIPS[0].map((tip) => (
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
                    </div>
                  )}

                  {/* Step 1 — Items */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[var(--text-primary)]">
                            Release Items
                          </h3>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            Optional. List the artefacts that ship together so
                            owners can validate scope.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addItem()}
                          className="inline-flex items-center gap-2 self-start rounded-2xl border border-[var(--border)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <Plus size={14} />
                          Add Item
                        </button>
                      </div>

                      {items.length === 0 ? (
                        <div className="rounded-[1.45rem] border border-dashed border-[var(--border)] bg-slate-50/70 px-6 py-10 text-center">
                          <Package
                            size={32}
                            className="mx-auto mb-2 text-[var(--text-muted)] opacity-60"
                          />
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            No items added yet
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            Quick add a typed row to get started:
                          </p>
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {RELEASE_ITEM_TYPES.map((t) => {
                              const Icon = ITEM_TYPE_ICON[t.value] || Package;
                              return (
                                <button
                                  key={t.value}
                                  type="button"
                                  onClick={() => addItem(t.value)}
                                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                >
                                  <Icon size={12} />+ {t.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <AnimatePresence initial={false}>
                            {items.map((item, i) => (
                              <motion.div
                                key={i}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    Item {i + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(i)}
                                    className="rounded-full p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--error-light)] hover:text-[var(--error)]"
                                    aria-label={`Remove item ${i + 1}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <FormField
                                    name={`item-title-${i}`}
                                    label="Title"
                                    value={item.title}
                                    onChange={(v) =>
                                      updateItem(i, "title", v)
                                    }
                                    placeholder="Item name"
                                  />
                                  <FormField
                                    name={`item-type-${i}`}
                                    label="Type"
                                    type="select"
                                    value={item.itemType}
                                    onChange={(v) =>
                                      updateItem(i, "itemType", v)
                                    }
                                    options={RELEASE_ITEM_TYPES.map((t) => ({
                                      value: t.value,
                                      label: t.label,
                                    }))}
                                  />
                                </div>
                                <div className="mt-3">
                                  <FormField
                                    name={`item-notes-${i}`}
                                    label="Notes"
                                    value={item.notes}
                                    onChange={(v) =>
                                      updateItem(i, "notes", v)
                                    }
                                    placeholder="Optional notes"
                                  />
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2 — Deployment Plan */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <div className="space-y-4">
                          <FormField
                            name="deploymentPlan"
                            label="Deployment Steps"
                            required
                            type="textarea"
                            rows={9}
                            value={form.deploymentPlan}
                            onChange={(v) =>
                              updateField("deploymentPlan", v)
                            }
                            placeholder={
                              "1. Backup current state\n2. Deploy database migrations\n3. Deploy application services\n4. Run smoke tests\n5. Enable traffic..."
                            }
                            error={errors.deploymentPlan}
                          />
                          <FormField
                            name="rollbackPlan"
                            label="Rollback Plan"
                            type="textarea"
                            rows={6}
                            value={form.rollbackPlan}
                            onChange={(v) =>
                              updateField("rollbackPlan", v)
                            }
                            placeholder="Steps to revert if deployment fails..."
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
                            Deployment Cues
                          </p>
                          <div className="mt-4 space-y-3">
                            {STEP_TIPS[2].map((tip) => (
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
                    </div>
                  )}

                  {/* Step 3 — Risk */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              Risk Level
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              Reflect blast radius — not engineering
                              difficulty.
                            </p>
                          </div>
                          {errors.riskLevel && (
                            <span className="text-xs font-medium text-[var(--error)]">
                              {errors.riskLevel}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {RISK_LEVELS.map((rl) => {
                            const meta = RISK_META[rl.value];
                            return (
                              <OptionCard
                                key={rl.value}
                                active={form.riskLevel === rl.value}
                                icon={meta.icon}
                                title={meta.label}
                                description={meta.description}
                                color={meta.color}
                                bg={meta.bg}
                                border={meta.border}
                                onClick={() =>
                                  updateField("riskLevel", rl.value)
                                }
                              />
                            );
                          })}
                        </div>
                      </div>

                      <FormField
                        name="riskNotes"
                        label="Risk Notes"
                        type="textarea"
                        rows={6}
                        value={form.riskNotes}
                        onChange={(v) => updateField("riskNotes", v)}
                        placeholder="Describe potential risks, mitigation strategies, owners, and impact..."
                      />
                    </div>
                  )}

                  {/* Step 4 — Schedule & Team */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">
                              Target Environment
                            </h3>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              Deploys default to production unless lighter
                              environments are selected.
                            </p>
                          </div>
                          {errors.environment && (
                            <span className="text-xs font-medium text-[var(--error)]">
                              {errors.environment}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {RELEASE_ENVIRONMENTS.map((env) => {
                            const meta = ENV_META[env.value];
                            return (
                              <OptionCard
                                key={env.value}
                                active={form.environment === env.value}
                                icon={meta.icon}
                                title={meta.label}
                                description={meta.description}
                                color={meta.color}
                                bg={meta.bg}
                                border={meta.border}
                                onClick={() =>
                                  updateField("environment", env.value)
                                }
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          name="plannedStart"
                          label="Planned Start"
                          type="date"
                          value={form.plannedStart}
                          onChange={(v) => updateField("plannedStart", v)}
                        />
                        <FormField
                          name="plannedEnd"
                          label="Planned End"
                          type="date"
                          value={form.plannedEnd}
                          onChange={(v) => updateField("plannedEnd", v)}
                          error={errors.plannedEnd}
                        />
                      </div>

                      <FormField
                        name="releaseManager"
                        label="Release Manager"
                        value={form.releaseManager}
                        onChange={(v) => updateField("releaseManager", v)}
                        placeholder="Name of the release manager"
                        description="Production deploys typically require a named manager."
                      />

                      {/* Review summary */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Sparkles
                            size={18}
                            style={{ color: "var(--primary)" }}
                          />
                          <h3 className="text-base font-semibold text-[var(--text-primary)]">
                            Review Snapshot
                          </h3>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                          One last pass before submitting. Click any section to
                          jump back and edit.
                        </p>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <ReviewSection
                            title="Type & Details"
                            icon={Rocket}
                            accent="var(--primary)"
                            onEdit={() => goTo(0)}
                          >
                            <ReviewField
                              label="Type"
                              value={
                                RELEASE_TYPES.find(
                                  (t) => t.value === form.releaseType,
                                )?.label || ""
                              }
                              tone="accent"
                            />
                            <ReviewField
                              label="Title"
                              value={form.title}
                              tone="accent"
                            />
                            <ReviewField
                              label="Description"
                              value={form.description}
                            />
                          </ReviewSection>

                          <ReviewSection
                            title="Items"
                            icon={Package}
                            accent="var(--gold-dark)"
                            onEdit={() => goTo(1)}
                          >
                            <ReviewField
                              label="Count"
                              value={`${items.filter((i) => i.title.trim()).length} item(s)`}
                              tone="accent"
                            />
                            <ReviewField
                              label="Types"
                              value={
                                items.filter((i) => i.title.trim()).length
                                  ? Array.from(
                                      new Set(
                                        items
                                          .filter((i) => i.title.trim())
                                          .map((i) => i.itemType),
                                      ),
                                    ).join(", ")
                                  : "No items"
                              }
                            />
                          </ReviewSection>

                          <ReviewSection
                            title="Deployment"
                            icon={GitBranch}
                            accent="var(--info-dark)"
                            onEdit={() => goTo(2)}
                          >
                            <ReviewField
                              label="Steps"
                              value={
                                form.deploymentPlan
                                  ? `${form.deploymentPlan.split("\n").filter(Boolean).length} line(s)`
                                  : ""
                              }
                              tone="accent"
                            />
                            <ReviewField
                              label="Rollback"
                              value={
                                form.rollbackPlan ? "Captured" : "Not provided"
                              }
                            />
                          </ReviewSection>

                          <ReviewSection
                            title="Risk"
                            icon={ShieldAlert}
                            accent={
                              activeRisk.color.startsWith("var(")
                                ? activeRisk.color
                                : "var(--warning-dark)"
                            }
                            onEdit={() => goTo(3)}
                          >
                            <ReviewField
                              label="Level"
                              value={activeRisk.label}
                              tone="accent"
                            />
                            <ReviewField
                              label="Notes"
                              value={
                                form.riskNotes
                                  ? form.riskNotes.length > 80
                                    ? form.riskNotes.slice(0, 80) + "…"
                                    : form.riskNotes
                                  : "No notes"
                              }
                            />
                          </ReviewSection>

                          <ReviewSection
                            title="Schedule & Team"
                            icon={CalendarClock}
                            accent="var(--success-dark)"
                            onEdit={() => goTo(4)}
                          >
                            <ReviewField
                              label="Environment"
                              value={activeEnv.label}
                              tone="accent"
                            />
                            <ReviewField
                              label="Window"
                              value={
                                form.plannedStart
                                  ? `${form.plannedStart} → ${form.plannedEnd || "TBD"}`
                                  : "Not scheduled"
                              }
                            />
                            <ReviewField
                              label="Manager"
                              value={form.releaseManager || "Unassigned"}
                            />
                          </ReviewSection>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 border-t border-slate-200/80 bg-white/92 px-6 py-4 backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={
                    step === 0
                      ? () => router.push("/dashboard/releases/list")
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
                    disabled={createRelease.isPending}
                    className={PRIMARY_BUTTON_CLASS}
                    style={PRIMARY_BUTTON_STYLE}
                  >
                    {createRelease.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Package size={16} />
                    )}
                    Create Release
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

        {/* Sidebar */}
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
              <Target size={18} style={{ color: "var(--primary)" }} />
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold text-[var(--text-primary)]">
                  {completionPct}%
                </p>
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {completionPct >= 80
                    ? "Ready"
                    : completionPct >= 50
                      ? "Developing"
                      : "Early draft"}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${completionPct}%`,
                    backgroundImage: "var(--gradient-primary)",
                  }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {checklist.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item.step)}
                  className="flex w-full items-center justify-between rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-left transition-all hover:bg-white"
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
                </button>
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
                  How the draft currently reads.
                </p>
              </div>
              <Sparkles size={18} style={{ color: "var(--gold)" }} />
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {form.title.trim() || "Untitled release"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {releaseNarrative}
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              <div
                className="rounded-[1.2rem] border p-4"
                style={{
                  borderColor: activeRisk.border,
                  backgroundColor: activeRisk.bg,
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: activeRisk.color }}
                >
                  Risk
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {activeRisk.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {activeRisk.description}
                </p>
              </div>

              <div
                className="rounded-[1.2rem] border p-4"
                style={{
                  borderColor: activeEnv.border,
                  backgroundColor: activeEnv.bg,
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: activeEnv.color }}
                >
                  Environment
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {activeEnv.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {activeEnv.description}
                </p>
              </div>
            </div>
          </section>

          <section className={`${PANEL_CLASS} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Step Guidance
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Quick prompts for the active step.
                </p>
              </div>
              <Lightbulb size={18} style={{ color: "var(--gold)" }} />
            </div>
            <div className="mt-4 space-y-3">
              {STEP_TIPS[step].map((tip, idx) => (
                <div
                  key={tip}
                  className="flex gap-3 rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                    style={{ color: "var(--primary)" }}
                  >
                    {idx + 1}
                  </span>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {tip}
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

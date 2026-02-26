"use client";

import { useState, useMemo, useCallback, useRef, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Loader2,
  FileText,
  X,
  Sparkles,
  AlertTriangle,
  Eye,
  Search,
  Check,
  Plus,
  Wand2,
  Building2,
  Wifi,
  GitMerge,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  ChevronDown,
  Code2,
  Brain,
  Palette,
  Megaphone,
  Users,
  Calculator,
  Settings,
  Crown,
  GraduationCap,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useCreateJob } from "@/hooks/use-jobs";
import {
  useJobTemplates,
  useCreateJobTemplate,
  useSuggestSkills,
  useDetectSimilarJobs,
} from "@/hooks/use-job-templates";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════ */

const WIZARD_STEPS = [
  { id: "template", label: "Template" },
  { id: "details", label: "Details" },
  { id: "skills", label: "Skills" },
  { id: "compensation", label: "Compensation" },
  { id: "preview", label: "Preview" },
];

const STEP_FIELDS: Record<number, string[]> = {
  0: [],
  1: ["title", "jobType", "workMode", "description"],
  2: ["skills", "experienceLevel"],
  3: [],
  4: [],
};

const WORK_MODES = [
  { value: "on_site", label: "Office", icon: Building2, desc: "In-person" },
  { value: "remote", label: "Remote", icon: Wifi, desc: "Work anywhere" },
  { value: "hybrid", label: "Hybrid", icon: GitMerge, desc: "Flexible" },
] as const;

const JOB_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level", sub: "0–1 years" },
  { value: "mid", label: "Mid-Level", sub: "1–5 years" },
  { value: "senior", label: "Senior", sub: "5+ years" },
];

const CURRENCIES = [
  { value: "NGN", symbol: "₦" },
  { value: "USD", symbol: "$" },
  { value: "EUR", symbol: "€" },
  { value: "GBP", symbol: "£" },
  { value: "KES", symbol: "KSh" },
  { value: "GHS", symbol: "GH₵" },
  { value: "ZAR", symbol: "R" },
];

const CATEGORY_ORDER = [
  "Engineering",
  "Data & AI",
  "Product & Design",
  "Marketing",
  "Sales & Support",
  "Finance & HR",
  "Operations",
  "Leadership",
  "Internship",
];

const CATEGORY_ICONS: Record<string, typeof Code2> = {
  Engineering: Code2,
  "Data & AI": Brain,
  "Product & Design": Palette,
  Marketing: Megaphone,
  "Sales & Support": Users,
  "Finance & HR": Calculator,
  Operations: Settings,
  Leadership: Crown,
  Internship: GraduationCap,
};

const POPULAR_LOCATIONS = [
  "Lagos, Nigeria",
  "Abuja, Nigeria",
  "Nairobi, Kenya",
  "Accra, Ghana",
  "Cape Town, South Africa",
  "Johannesburg, South Africa",
  "Cairo, Egypt",
  "London, UK",
  "New York, USA",
  "San Francisco, USA",
  "Berlin, Germany",
  "Toronto, Canada",
  "Remote",
];

/* ══════════════════════════════════════════════════════════
   Schema & Types
   ══════════════════════════════════════════════════════════ */

const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  jobType: z.string().min(1, "Select a job type"),
  workMode: z.string().min(1, "Select a work mode"),
  location: z.string(),
  description: z.string().min(20, "Description needs at least 20 characters"),
  responsibilities: z.string(),
  skills: z.array(z.string()).min(1, "Add at least one skill"),
  experienceLevel: z.string().min(1, "Select an experience level"),
  salaryMin: z.string(),
  salaryMax: z.string(),
  salaryCurrency: z.string(),
  applicationDeadline: z.string(),
});

type JobFormData = z.infer<typeof jobSchema>;

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function getTemplateCategory(name: string): string {
  const n = name.toLowerCase();
  if (/\bvp\b/.test(n) || /\bdirector\b/.test(n) || /\bhead of\b/.test(n) || n.includes("engineering manager")) return "Leadership";
  if (n.includes("intern")) return "Internship";
  if (n.includes("financial") || n.includes("finance") || n.includes("people") || n.includes("payroll") || n.includes("compliance") || n.includes("talent acquisition") || /\bhr\b/.test(n)) return "Finance & HR";
  if (n.includes("data") || n.includes("machine learning") || /\bml\b/.test(n) || /\bai\b/.test(n) || n.includes("scientist") || n.includes("intelligence") || n.includes("analyst")) return "Data & AI";
  if (n.includes("product") || n.includes("design") || /\bux\b/.test(n) || /\bui\b/.test(n) || n.includes("brand")) return "Product & Design";
  if (n.includes("marketing") || n.includes("content") || n.includes("community") || n.includes("growth")) return "Marketing";
  if (n.includes("sales") || n.includes("account") || n.includes("customer") || n.includes("support") || n.includes("success")) return "Sales & Support";
  if (n.includes("program") || n.includes("project") || n.includes("scrum") || n.includes("agile") || n.includes("salesforce")) return "Operations";
  return "Engineering";
}

function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return v.toLocaleString();
}

function formatSalaryLabel(min: string, max: string, currency: string): string {
  const sym = CURRENCIES.find((c) => c.value === currency)?.symbol || "";
  if (min && max) return `${sym}${fmtK(Number(min))} – ${sym}${fmtK(Number(max))}`;
  if (min) return `From ${sym}${fmtK(Number(min))}`;
  if (max) return `Up to ${sym}${fmtK(Number(max))}`;
  return "";
}

/* ══════════════════════════════════════════════════════════
   Animation Variants
   ══════════════════════════════════════════════════════════ */

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

/* ══════════════════════════════════════════════════════════
   Step Progress Indicator
   ══════════════════════════════════════════════════════════ */

function StepProgress({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (i: number) => void;
}) {
  return (
    <div className="flex items-center w-full">
      {WIZARD_STEPS.map((s, i) => (
        <Fragment key={s.id}>
          <button
            type="button"
            onClick={() => onStepClick(i)}
            className="relative flex flex-col items-center gap-1.5 group"
          >
            <div className="relative">
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10",
                  i < currentStep && "bg-[#C4A35A] border-[#C4A35A]",
                  i === currentStep && "border-[#C4A35A] bg-[#C4A35A]/10",
                  i > currentStep && "border-[var(--border)] bg-white group-hover:border-[var(--neutral-gray)]",
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {i < currentStep ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </motion.div>
                ) : (
                  <span
                    className={cn(
                      "text-sm font-bold",
                      i === currentStep ? "text-[#C4A35A]" : "text-[var(--neutral-gray)]",
                    )}
                  >
                    {i + 1}
                  </span>
                )}
              </motion.div>

              {i === currentStep && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[#C4A35A]"
                  animate={{ scale: [1, 1.5, 1.5], opacity: [0.4, 0, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </div>

            <span
              className={cn(
                "text-[11px] font-semibold whitespace-nowrap transition-colors",
                i <= currentStep ? "text-[#C4A35A]" : "text-[var(--neutral-gray)]",
              )}
            >
              {s.label}
            </span>
          </button>

          {i < WIZARD_STEPS.length - 1 && (
            <div className="flex-1 h-[2px] bg-[var(--border)] mx-1.5 sm:mx-3 relative overflow-hidden rounded-full">
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#C4A35A] rounded-full"
                initial={false}
                animate={{ width: i < currentStep ? "100%" : "0%" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Field Error
   ══════════════════════════════════════════════════════════ */

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      className="flex items-center gap-1 text-xs text-red-500 mt-1.5 font-medium"
    >
      <AlertCircle size={12} />
      {message}
    </motion.p>
  );
}

/* ══════════════════════════════════════════════════════════
   Work Mode Toggle
   ══════════════════════════════════════════════════════════ */

function WorkModeToggle({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#171717] mb-1.5">
        Work mode <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {WORK_MODES.map((mode) => {
          const Icon = mode.icon;
          const selected = value === mode.value;
          return (
            <motion.button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-xl border-2 transition-all",
                selected
                  ? "border-[#C4A35A] bg-[#C4A35A]/5 shadow-sm"
                  : "border-[var(--border)] bg-white hover:border-[var(--neutral-gray)]",
                error && !value && "border-red-300",
              )}
            >
              <Icon
                size={20}
                className={cn(
                  "transition-colors",
                  selected ? "text-[#C4A35A]" : "text-[var(--neutral-gray)]",
                )}
              />
              <span
                className={cn(
                  "text-xs font-semibold",
                  selected ? "text-[#C4A35A]" : "text-[#171717]",
                )}
              >
                {mode.label}
              </span>
              <span className="text-[10px] text-[var(--neutral-gray)]">{mode.desc}</span>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        <FieldError message={error} />
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Skill Tag Input
   ══════════════════════════════════════════════════════════ */

function SkillTagInput({
  skills,
  onChange,
  suggestedSkills,
  error,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
  suggestedSkills: { id: string; name: string }[];
  error?: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (trimmed && !skills.includes(trimmed)) {
        onChange([...skills, trimmed]);
      }
      setInput("");
      inputRef.current?.focus();
    },
    [skills, onChange],
  );

  const removeSkill = useCallback(
    (name: string) => onChange(skills.filter((s) => s !== name)),
    [skills, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addSkill(input);
    }
    if (e.key === "Backspace" && !input && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  };

  const unusedSuggestions = suggestedSkills.filter((s) => !skills.includes(s.name));

  return (
    <div>
      <label className="block text-sm font-medium text-[#171717] mb-1.5">
        Skills <span className="text-red-500">*</span>
      </label>

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 p-2.5 border rounded-xl bg-white min-h-[48px] cursor-text transition-colors",
          "focus-within:ring-2 focus-within:ring-[#C4A35A]/20 focus-within:border-[#C4A35A]",
          error && skills.length === 0 ? "border-red-300" : "border-[var(--border)]",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence mode="popLayout">
          {skills.map((skill) => (
            <motion.span
              key={skill}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              layout
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C4A35A]/10 text-[#C4A35A] text-xs font-semibold"
            >
              {skill}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSkill(skill);
                }}
                className="hover:bg-[#C4A35A]/20 rounded-full p-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={skills.length === 0 ? "Type a skill and press Enter..." : "Add more..."}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-[var(--neutral-gray)]"
        />
      </div>

      <AnimatePresence>
        <FieldError message={error} />
      </AnimatePresence>

      {unusedSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3"
        >
          <p className="text-xs font-medium text-[var(--neutral-gray)] mb-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-[#C4A35A]" />
            <span>Suggested by AI</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.slice(0, 10).map((skill) => (
              <motion.button
                key={skill.id}
                type="button"
                onClick={() => addSkill(skill.name)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#C4A35A]/40 text-xs font-medium text-[#C4A35A]/80 hover:bg-[#C4A35A]/5 hover:border-[#C4A35A] transition-all"
              >
                <Plus size={10} />
                {skill.name}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Location Autocomplete
   ══════════════════════════════════════════════════════════ */

function LocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const filtered = useMemo(
    () =>
      value.length > 0
        ? POPULAR_LOCATIONS.filter((loc) => loc.toLowerCase().includes(value.toLowerCase()))
        : POPULAR_LOCATIONS,
    [value],
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[#171717] mb-1.5">Location</label>
      <div className="relative">
        <MapPin
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="e.g. Lagos, Nigeria or Remote"
          className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white"
        />
      </div>
      <AnimatePresence>
        {focused && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-xl shadow-lg max-h-[200px] overflow-y-auto"
          >
            {filtered.slice(0, 8).map((loc) => (
              <button
                key={loc}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(loc);
                  setFocused(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#171717] hover:bg-[#C4A35A]/5 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <MapPin size={12} className="inline mr-2 text-[var(--neutral-gray)]" />
                {loc}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Similar Job Warning Callout
   ══════════════════════════════════════════════════════════ */

function SimilarJobCallout({
  jobs,
  onDismiss,
}: {
  jobs: { id: string; title: string; status: string; createdAt: string }[];
  onDismiss: () => void;
}) {
  if (jobs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="bg-amber-50 border border-amber-200 rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Similar jobs detected</p>
          <p className="text-xs text-amber-700 mt-0.5">
            You may already have similar listings. Review them before creating a new one.
          </p>
          <div className="mt-2 space-y-1">
            {jobs.slice(0, 3).map((job) => (
              <Link
                key={job.id}
                href={`/employer/jobs/${job.id}`}
                className="flex items-center gap-2 text-xs text-amber-800 hover:text-amber-900 font-medium group"
              >
                <ExternalLink size={10} className="shrink-0" />
                <span className="truncate group-hover:underline">{job.title}</span>
                <span className="text-amber-600 shrink-0">({job.status.replace("_", " ")})</span>
              </Link>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Preview Card
   ══════════════════════════════════════════════════════════ */

function MissingBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700">
      <AlertTriangle size={10} />
      Consider adding: {text}
    </span>
  );
}

function PreviewCard({ data }: { data: JobFormData }) {
  const salaryLabel = formatSalaryLabel(data.salaryMin, data.salaryMax, data.salaryCurrency);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main preview */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2 text-sm text-[var(--neutral-gray)] mb-1">
          <Eye size={16} />
          How candidates will see your listing
        </div>

        <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-[#C4A35A]/5 to-[#A8893D]/5 px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center shrink-0">
                <Briefcase size={20} className="text-[#C4A35A]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[#171717] leading-tight">
                  {data.title || "Untitled Position"}
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mt-1">Your Company</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {data.jobType && (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium">
                  {JOB_TYPES.find((t) => t.value === data.jobType)?.label || data.jobType}
                </span>
              )}
              {data.workMode && (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-medium">
                  {WORK_MODES.find((m) => m.value === data.workMode)?.label || data.workMode}
                </span>
              )}
              {data.experienceLevel && (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-medium">
                  {EXPERIENCE_LEVELS.find((l) => l.value === data.experienceLevel)?.label || data.experienceLevel}
                </span>
              )}
              {data.location && (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium flex items-center gap-1">
                  <MapPin size={10} />
                  {data.location}
                </span>
              )}
            </div>

            {salaryLabel && (
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-[#C4A35A]" />
                <p className="text-base font-bold text-[#171717]">
                  {salaryLabel}{" "}
                  <span className="text-xs font-normal text-[var(--neutral-gray)]">
                    {data.salaryCurrency}
                  </span>
                </p>
              </div>
            )}

            {data.description ? (
              <div>
                <h3 className="text-sm font-semibold text-[#171717] mb-2">About the Role</h3>
                <p className="text-sm text-[var(--neutral-gray)] whitespace-pre-wrap leading-relaxed">
                  {data.description}
                </p>
              </div>
            ) : (
              <MissingBadge text="description" />
            )}

            {data.responsibilities ? (
              <div>
                <h3 className="text-sm font-semibold text-[#171717] mb-2">Responsibilities</h3>
                <p className="text-sm text-[var(--neutral-gray)] whitespace-pre-wrap leading-relaxed">
                  {data.responsibilities}
                </p>
              </div>
            ) : (
              <MissingBadge text="responsibilities" />
            )}

            {data.skills.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-[#171717] mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#C4A35A]/10 text-[#C4A35A] font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <MissingBadge text="skills" />
            )}

            {data.applicationDeadline && (
              <div className="flex items-center gap-2 text-xs text-[var(--neutral-gray)] pt-2 border-t border-[var(--border)]">
                <Calendar size={12} />
                Apply by{" "}
                {new Date(data.applicationDeadline).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}

            {(!salaryLabel || !data.location || !data.applicationDeadline) && (
              <div className="pt-3 border-t border-[var(--border)] flex flex-wrap gap-2">
                {!salaryLabel && <MissingBadge text="salary range" />}
                {!data.location && <MissingBadge text="location" />}
                {!data.applicationDeadline && <MissingBadge text="deadline" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#171717]">Publishing Options</h3>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-[#C4A35A]/30 bg-[#C4A35A]/5 cursor-pointer">
              <input
                type="radio"
                name="publish"
                defaultChecked
                className="mt-0.5 accent-[#C4A35A]"
              />
              <div>
                <p className="text-sm font-medium text-[#171717]">Publish Now</p>
                <p className="text-xs text-[var(--neutral-gray)]">Submit for review and go live</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] cursor-pointer hover:border-[var(--neutral-gray)] transition-colors">
              <input type="radio" name="publish" className="mt-0.5 accent-[#C4A35A]" />
              <div>
                <p className="text-sm font-medium text-[#171717]">Save as Draft</p>
                <p className="text-xs text-[var(--neutral-gray)]">Continue editing later</p>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#171717] mb-3">Completeness</h3>
          <div className="space-y-2">
            {[
              { label: "Job title", done: !!data.title },
              { label: "Description", done: data.description.length >= 20 },
              { label: "Skills", done: data.skills.length > 0 },
              { label: "Work mode", done: !!data.workMode },
              { label: "Salary range", done: !!(data.salaryMin || data.salaryMax) },
              { label: "Location", done: !!data.location },
              { label: "Deadline", done: !!data.applicationDeadline },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--border)]" />
                )}
                <span
                  className={cn(
                    "text-xs",
                    item.done ? "text-[#171717] font-medium" : "text-[var(--neutral-gray)]",
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Save as Template Modal
   ══════════════════════════════════════════════════════════ */

function SaveTemplateModal({
  open,
  onClose,
  formData,
}: {
  open: boolean;
  onClose: () => void;
  formData: JobFormData;
}) {
  const [name, setName] = useState("");
  const createTemplate = useCreateJobTemplate();

  const handleSave = () => {
    if (!name) return;
    createTemplate.mutate(
      {
        name,
        templateData: {
          title: formData.title,
          description: formData.description,
          responsibilities: formData.responsibilities,
          skills: formData.skills,
          jobType: formData.jobType,
          workMode: formData.workMode,
          experienceLevel: formData.experienceLevel,
          salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
          salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
          salaryCurrency: formData.salaryCurrency,
          location: formData.location,
        },
      },
      {
        onSuccess: () => {
          toast.success("Template saved successfully");
          setName("");
          onClose();
        },
      },
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center">
                <FileText size={16} className="text-[#C4A35A]" />
              </div>
              <h2 className="text-lg font-semibold text-[#171717]">Save as Template</h2>
            </div>
            <p className="text-sm text-[var(--neutral-gray)] mb-4">
              Save this configuration to quickly create similar positions later.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name (e.g. Senior Engineer - Remote)"
              className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A]"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!name || createTemplate.isPending}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-[#C4A35A] text-white hover:bg-[#E08A13] disabled:opacity-50 transition-colors"
              >
                {createTemplate.isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════
   Auto-Save Indicator
   ══════════════════════════════════════════════════════════ */

function AutoSaveIndicator({ dirty }: { dirty: boolean }) {
  const [saved, setSaved] = useState(false);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (dirty) {
      const timer = setTimeout(() => {
        setSaved(true);
        setTimestamp(
          new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        );
        setTimeout(() => setSaved(false), 3000);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dirty]);

  return (
    <AnimatePresence>
      {saved && timestamp && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Check size={12} />
          </motion.div>
          Draft saved at {timestamp}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page Component
   ══════════════════════════════════════════════════════════ */

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();
  const { data: templates } = useJobTemplates();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dismissedSimilar, setDismissedSimilar] = useState(false);
  const [descriptionPreview, setDescriptionPreview] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      jobType: "",
      workMode: "",
      location: "",
      description: "",
      responsibilities: "",
      skills: [],
      experienceLevel: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "NGN",
      applicationDeadline: "",
    },
  });

  const watchedTitle = watch("title");
  const watchedSkills = watch("skills");
  const watchedWorkMode = watch("workMode");
  const watchedSalaryMin = watch("salaryMin");
  const watchedSalaryMax = watch("salaryMax");
  const watchedCurrency = watch("salaryCurrency");

  const debouncedTitle = useDebounce(watchedTitle, 500);
  const { data: suggestedSkills } = useSuggestSkills(debouncedTitle);
  const { data: similarJobs } = useDetectSimilarJobs(debouncedTitle);

  /* — Template filtering — */
  const groupedTemplates = useMemo(() => {
    if (!Array.isArray(templates)) return {} as Record<string, any[]>;
    const search = templateSearch.toLowerCase();
    const filtered = templates.filter((t: any) => {
      if (!search) return true;
      return (
        t.name?.toLowerCase().includes(search) ||
        t.templateData?.title?.toLowerCase().includes(search) ||
        t.templateData?.jobType?.replace("_", " ").includes(search)
      );
    });
    const grouped: Record<string, any[]> = {};
    filtered.forEach((t: any) => {
      const category = getTemplateCategory(t.name || t.templateData?.title || "");
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(t);
    });
    return grouped;
  }, [templates, templateSearch]);

  const displayedTemplates = useMemo(() => {
    if (selectedCategory === "All") {
      const all: any[] = [];
      CATEGORY_ORDER.forEach((cat) => {
        if (groupedTemplates[cat]) all.push(...groupedTemplates[cat]);
      });
      return all;
    }
    return groupedTemplates[selectedCategory] || [];
  }, [groupedTemplates, selectedCategory]);

  const categoryTabs = useMemo(() => {
    const tabs = ["All"];
    CATEGORY_ORDER.forEach((cat) => {
      if (groupedTemplates[cat] && groupedTemplates[cat].length > 0) tabs.push(cat);
    });
    return tabs;
  }, [groupedTemplates]);

  /* — Navigation — */
  const goToStep = useCallback(
    async (target: number) => {
      if (target > step) {
        const fields = STEP_FIELDS[step];
        if (fields && fields.length > 0) {
          const valid = await trigger(fields as (keyof JobFormData)[]);
          if (!valid) return;
        }
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, trigger],
  );

  /* — Load template — */
  const loadTemplate = useCallback(
    (template: any) => {
      const d = template.templateData;
      if (d.title) setValue("title", d.title);
      if (d.description) setValue("description", d.description);
      if (d.responsibilities) setValue("responsibilities", d.responsibilities);
      if (d.skills) setValue("skills", d.skills);
      if (d.jobType) setValue("jobType", d.jobType);
      if (d.workMode) setValue("workMode", d.workMode);
      if (d.experienceLevel) setValue("experienceLevel", d.experienceLevel);
      if (d.salaryMin) setValue("salaryMin", String(d.salaryMin));
      if (d.salaryMax) setValue("salaryMax", String(d.salaryMax));
      if (d.salaryCurrency) setValue("salaryCurrency", d.salaryCurrency);
      if (d.location) setValue("location", d.location);
      setDirection(1);
      setStep(1);
      toast.success("Template loaded — customize your listing");
    },
    [setValue],
  );

  /* — Submit — */
  const onSubmit = useCallback(
    (isDraft: boolean) => {
      const data = getValues();
      const jobData: Record<string, any> = {
        title: data.title,
        jobType: data.jobType || undefined,
        workMode: data.workMode || undefined,
        location: data.location || undefined,
        description: data.description,
        responsibilities: data.responsibilities || undefined,
        niceToHaveSkills: data.skills.length > 0 ? data.skills : undefined,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
        salaryCurrency: data.salaryCurrency || undefined,
        experienceLevel: data.experienceLevel || undefined,
        applicationDeadline: data.applicationDeadline || undefined,
        status: isDraft ? "draft" : "pending_review",
      };

      createJob.mutate(jobData as any, {
        onSuccess: () => {
          toast.success(isDraft ? "Job saved as draft" : "Job submitted for review!");
          router.push("/employer/jobs");
        },
        onError: () => {
          toast.error("Failed to create job. Please try again.");
        },
      });
    },
    [createJob, getValues, router],
  );

  const salaryLabel = formatSalaryLabel(watchedSalaryMin, watchedSalaryMax, watchedCurrency);
  const isSubmitting = createJob.isPending;

  return (
    <div className="space-y-6 pb-28">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/employer/jobs"
            className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#171717]">Post a New Job</h1>
            <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
              Create a compelling listing to attract top talent.
            </p>
          </div>
        </div>
        <AutoSaveIndicator dirty={isDirty} />
      </div>

      {/* ─── Step Progress ─── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-6">
        <StepProgress currentStep={step} onStepClick={goToStep} />
      </div>

      {/* ─── Similar Job Warning ─── */}
      <AnimatePresence>
        {!dismissedSimilar &&
          Array.isArray(similarJobs) &&
          similarJobs.length > 0 &&
          step <= 1 && (
            <SimilarJobCallout
              jobs={similarJobs}
              onDismiss={() => setDismissedSimilar(true)}
            />
          )}
      </AnimatePresence>

      {/* ─── Step Content ─── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="p-6 space-y-6"
          >
            {/* ═══ Step 0: Template Selection ═══ */}
            {step === 0 && (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-5"
              >
                <motion.div variants={fadeUp} className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#171717]">Choose a Template</h2>
                    <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                      Start from a saved template or begin from scratch.
                    </p>
                  </div>
                  {displayedTemplates.length > 0 && (
                    <span className="text-xs text-[var(--neutral-gray)] bg-[var(--surface-2)] px-2.5 py-1 rounded-full">
                      {displayedTemplates.length} template
                      {displayedTemplates.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </motion.div>

                {Array.isArray(templates) && templates.length > 0 && (
                  <motion.div variants={fadeUp} className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                    />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="Search templates..."
                      className="w-full pl-10 pr-10 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white"
                    />
                    {templateSearch && (
                      <button
                        type="button"
                        onClick={() => setTemplateSearch("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] hover:text-[#171717]"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </motion.div>
                )}

                {categoryTabs.length > 2 && (
                  <motion.div
                    variants={fadeUp}
                    className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
                  >
                    {categoryTabs.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                          selectedCategory === cat
                            ? "bg-[#C4A35A] text-white shadow-sm"
                            : "bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]/80",
                        )}
                      >
                        {cat}
                        {cat !== "All" && groupedTemplates[cat] && (
                          <span className="ml-1 opacity-70">
                            ({groupedTemplates[cat].length})
                          </span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}

                <motion.div
                  variants={fadeUp}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  {/* Start from Scratch */}
                  <motion.button
                    type="button"
                    onClick={() => goToStep(1)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[#C4A35A] hover:bg-[#C4A35A]/5 transition-all min-h-[140px] group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] group-hover:bg-[#C4A35A]/10 flex items-center justify-center transition-colors">
                      <Plus
                        size={18}
                        className="text-[var(--neutral-gray)] group-hover:text-[#C4A35A] transition-colors"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#171717]">Start from Scratch</p>
                      <p className="text-xs text-[var(--neutral-gray)] mt-0.5">Blank form</p>
                    </div>
                  </motion.button>

                  {displayedTemplates.map((t: any) => {
                    const cat = getTemplateCategory(
                      t.name || t.templateData?.title || "",
                    );
                    const CatIcon = CATEGORY_ICONS[cat] || Briefcase;
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        onClick={() => loadTemplate(t)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex flex-col p-4 rounded-xl border border-[var(--border)] hover:border-[#C4A35A] hover:shadow-sm transition-all text-left group"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-lg bg-[#C4A35A]/10 flex items-center justify-center shrink-0">
                            <CatIcon size={16} className="text-[#C4A35A]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#171717] truncate group-hover:text-[#C4A35A] transition-colors">
                              {t.name}
                            </p>
                            <p className="text-[11px] text-[var(--neutral-gray)] truncate mt-0.5">
                              {[
                                t.templateData?.workMode?.replace("_", " "),
                                t.templateData?.experienceLevel,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "No details"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-medium",
                              t.templateData?.jobType === "contract"
                                ? "bg-purple-50 text-purple-700"
                                : t.templateData?.jobType === "internship"
                                  ? "bg-green-50 text-green-700"
                                  : t.templateData?.jobType === "part_time"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-blue-50 text-blue-700",
                            )}
                          >
                            {t.templateData?.jobType?.replace("_", " ") || "full time"}
                          </span>
                          <span className="text-[10px] text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Use template →
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {displayedTemplates.length === 0 && templateSearch && (
                  <p className="text-sm text-[var(--neutral-gray)] text-center py-6">
                    No templates matching &ldquo;{templateSearch}&rdquo;
                  </p>
                )}

                {(!Array.isArray(templates) || templates.length === 0) && (
                  <p className="text-sm text-[var(--neutral-gray)] text-center py-4">
                    No templates saved yet. Create your first job and save it as a template.
                  </p>
                )}
              </motion.div>
            )}

            {/* ═══ Step 1: Job Details ═══ */}
            {step === 1 && (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-5"
              >
                <motion.div variants={fadeUp}>
                  <h2 className="text-lg font-semibold text-[#171717]">Job Details</h2>
                  <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                    Describe the position you&apos;re hiring for.
                  </p>
                </motion.div>

                {/* Title */}
                <motion.div variants={fadeUp}>
                  <label className="block text-sm font-medium text-[#171717] mb-1.5">
                    Job title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                    />
                    <input
                      {...register("title")}
                      placeholder="e.g. Senior Frontend Developer"
                      className={cn(
                        "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white",
                        errors.title ? "border-red-300" : "border-[var(--border)]",
                      )}
                    />
                  </div>
                  <AnimatePresence>
                    <FieldError message={errors.title?.message} />
                  </AnimatePresence>
                </motion.div>

                {/* Type + Work Mode */}
                <motion.div
                  variants={fadeUp}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-[#171717] mb-1.5">
                      Job type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        {...register("jobType")}
                        className={cn(
                          "w-full appearance-none px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white",
                          errors.jobType ? "border-red-300" : "border-[var(--border)]",
                        )}
                      >
                        <option value="">Select type</option>
                        {JOB_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                      />
                    </div>
                    <AnimatePresence>
                      <FieldError message={errors.jobType?.message} />
                    </AnimatePresence>
                  </div>

                  <WorkModeToggle
                    value={watchedWorkMode}
                    onChange={(v) => setValue("workMode", v, { shouldValidate: true })}
                    error={errors.workMode?.message}
                  />
                </motion.div>

                {/* Location */}
                <motion.div variants={fadeUp}>
                  <LocationInput
                    value={watch("location")}
                    onChange={(v) => setValue("location", v)}
                  />
                </motion.div>

                {/* Description */}
                <motion.div variants={fadeUp}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-[#171717]">
                      Job description <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toast.info("AI description improvement coming soon!")
                        }
                        className="text-xs text-[#C4A35A] font-medium flex items-center gap-1 hover:underline"
                      >
                        <Wand2 size={11} /> AI Improve
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescriptionPreview(!descriptionPreview)}
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-md transition-colors",
                          descriptionPreview
                            ? "bg-[#C4A35A]/10 text-[#C4A35A]"
                            : "text-[var(--neutral-gray)] hover:text-[#171717]",
                        )}
                      >
                        {descriptionPreview ? "Edit" : "Preview"}
                      </button>
                    </div>
                  </div>
                  {descriptionPreview ? (
                    <div className="min-h-[160px] px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--surface-2)]/30 text-sm text-[#171717] whitespace-pre-wrap leading-relaxed">
                      {watch("description") || (
                        <span className="text-[var(--neutral-gray)] italic">
                          Nothing to preview yet
                        </span>
                      )}
                    </div>
                  ) : (
                    <textarea
                      {...register("description")}
                      placeholder="Describe the role, team, and what makes this opportunity exciting..."
                      rows={6}
                      className={cn(
                        "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white resize-none leading-relaxed",
                        errors.description ? "border-red-300" : "border-[var(--border)]",
                      )}
                    />
                  )}
                  <AnimatePresence>
                    <FieldError message={errors.description?.message} />
                  </AnimatePresence>
                </motion.div>

                {/* Responsibilities */}
                <motion.div variants={fadeUp}>
                  <label className="block text-sm font-medium text-[#171717] mb-1.5">
                    Key responsibilities
                  </label>
                  <textarea
                    {...register("responsibilities")}
                    placeholder="List key responsibilities, one per line..."
                    rows={4}
                    className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white resize-none leading-relaxed"
                  />
                </motion.div>
              </motion.div>
            )}

            {/* ═══ Step 2: Skills ═══ */}
            {step === 2 && (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-5"
              >
                <motion.div variants={fadeUp}>
                  <h2 className="text-lg font-semibold text-[#171717]">
                    Skills &amp; Experience
                  </h2>
                  <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                    What skills and experience level does this role require?
                  </p>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <SkillTagInput
                    skills={watchedSkills}
                    onChange={(s) => setValue("skills", s, { shouldValidate: true })}
                    suggestedSkills={Array.isArray(suggestedSkills) ? suggestedSkills : []}
                    error={errors.skills?.message}
                  />
                </motion.div>

                {/* Experience Level */}
                <motion.div variants={fadeUp}>
                  <label className="block text-sm font-medium text-[#171717] mb-1.5">
                    Experience level <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPERIENCE_LEVELS.map((level) => {
                      const selected = watch("experienceLevel") === level.value;
                      return (
                        <motion.button
                          key={level.value}
                          type="button"
                          onClick={() =>
                            setValue("experienceLevel", level.value, {
                              shouldValidate: true,
                            })
                          }
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "flex flex-col items-center gap-1 py-3.5 px-3 rounded-xl border-2 transition-all",
                            selected
                              ? "border-[#C4A35A] bg-[#C4A35A]/5"
                              : "border-[var(--border)] bg-white hover:border-[var(--neutral-gray)]",
                            errors.experienceLevel &&
                              !watch("experienceLevel") &&
                              "border-red-300",
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              selected ? "text-[#C4A35A]" : "text-[#171717]",
                            )}
                          >
                            {level.label}
                          </span>
                          <span className="text-[10px] text-[var(--neutral-gray)]">
                            {level.sub}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <AnimatePresence>
                    <FieldError message={errors.experienceLevel?.message} />
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {/* ═══ Step 3: Compensation ═══ */}
            {step === 3 && (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-5"
              >
                <motion.div variants={fadeUp}>
                  <h2 className="text-lg font-semibold text-[#171717]">
                    Compensation &amp; Deadline
                  </h2>
                  <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
                    Set salary expectations and application deadline (optional).
                  </p>
                </motion.div>

                {/* Salary */}
                <motion.div variants={fadeUp}>
                  <label className="block text-sm font-medium text-[#171717] mb-1.5">
                    Salary range
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    <div className="col-span-3 relative">
                      <DollarSign
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                      />
                      <input
                        {...register("salaryMin")}
                        type="number"
                        placeholder="Min"
                        className="w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white"
                      />
                    </div>
                    <div className="col-span-3 relative">
                      <DollarSign
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                      />
                      <input
                        {...register("salaryMax")}
                        type="number"
                        placeholder="Max"
                        className="w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white"
                      />
                    </div>
                    <div className="col-span-1 relative">
                      <select
                        {...register("salaryCurrency")}
                        className="w-full h-full appearance-none px-2 py-3 border border-[var(--border)] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white text-center"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {salaryLabel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3"
                    >
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#C4A35A]/5 rounded-xl border border-[#C4A35A]/20">
                        <DollarSign size={14} className="text-[#C4A35A] shrink-0" />
                        <span className="text-sm font-semibold text-[#C4A35A]">
                          {salaryLabel}
                        </span>
                        <span className="text-xs text-[var(--neutral-gray)]">
                          {watchedCurrency}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Deadline */}
                <motion.div variants={fadeUp}>
                  <label className="block text-sm font-medium text-[#171717] mb-1.5">
                    Application deadline
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                    />
                    <input
                      {...register("applicationDeadline")}
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══ Step 4: Preview ═══ */}
            {step === 4 && (
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.div variants={fadeUp}>
                  <PreviewCard data={getValues()} />
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] hover:text-[#171717] transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <Link
                href="/employer/jobs"
                className="text-sm font-medium text-[var(--neutral-gray)] hover:text-[#171717] transition-colors"
              >
                Cancel
              </Link>
            )}
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {WIZARD_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToStep(i)}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 h-2 bg-[#C4A35A]"
                    : i < step
                      ? "w-2 h-2 bg-[#C4A35A]/50"
                      : "w-2 h-2 bg-[var(--border)]",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 && (
              <motion.button
                type="button"
                onClick={() => goToStep(step + 1)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#C4A35A] text-white hover:bg-[#E08A13] transition-colors shadow-sm"
              >
                Next <ArrowRight size={14} />
              </motion.button>
            )}
            {step === 4 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSaveTemplate(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <FileText size={13} /> Template
                </button>
                <button
                  type="button"
                  onClick={() => onSubmit(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] disabled:opacity-60 transition-colors"
                >
                  <Save size={14} /> Draft
                </button>
                <motion.button
                  type="button"
                  onClick={() => {
                    handleSubmit(
                      () => onSubmit(false),
                      () => {
                        toast.error(
                          "Please fill in all required fields before publishing.",
                        );
                      },
                    )();
                  }}
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#C4A35A] to-[#A8893D] hover:from-[#E08A13] hover:to-[#D05A10] disabled:opacity-60 transition-all shadow-sm"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={14} /> Publish Job
                    </>
                  )}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      <SaveTemplateModal
        open={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        formData={getValues()}
      />
    </div>
  );
}

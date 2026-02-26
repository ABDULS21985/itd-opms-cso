"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  Send,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  ChevronDown,
  AlertCircle,
  Loader2,
  Building2,
  Wifi,
  GitMerge,
  X,
  Plus,
  Sparkles,
  Wand2,
  Check,
  CheckCircle2,
  Code2,
  RotateCcw,
} from "lucide-react";
import {
  useEmployerJob,
  useUpdateJob,
  usePublishJob,
} from "@/hooks/use-jobs";
import { useSuggestSkills } from "@/hooks/use-job-templates";
import { useDebounce } from "@/hooks/use-debounce";
import { JobStatus } from "@/types/job";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════ */

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

const POPULAR_LOCATIONS = [
  "Lagos, Nigeria", "Abuja, Nigeria", "Nairobi, Kenya", "Accra, Ghana",
  "Cape Town, South Africa", "Johannesburg, South Africa", "Cairo, Egypt",
  "London, UK", "New York, USA", "San Francisco, USA", "Berlin, Germany",
  "Toronto, Canada", "Remote",
];

/* ══════════════════════════════════════════════════════════
   Schema
   ══════════════════════════════════════════════════════════ */

const editJobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  jobType: z.string().min(1, "Select a job type"),
  workMode: z.string().min(1, "Select a work mode"),
  location: z.string(),
  description: z.string().min(20, "Description needs at least 20 characters"),
  responsibilities: z.string(),
  skills: z.array(z.string()),
  experienceLevel: z.string(),
  salaryMin: z.string(),
  salaryMax: z.string(),
  salaryCurrency: z.string(),
  applicationDeadline: z.string(),
});

type EditJobFormData = z.infer<typeof editJobSchema>;

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

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

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

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
   Field Changed Indicator
   ══════════════════════════════════════════════════════════ */

function FieldChanged({ changed }: { changed: boolean }) {
  if (!changed) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#C4A35A]/10 text-[#C4A35A]">
      Modified
    </span>
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
                "flex flex-col items-center gap-1.5 py-3 px-3 rounded-xl border-2 transition-all",
                selected
                  ? "border-[#C4A35A] bg-[#C4A35A]/5 shadow-sm"
                  : "border-[var(--border)] bg-white hover:border-[var(--neutral-gray)]",
                error && !value && "border-red-300",
              )}
            >
              <Icon
                size={18}
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
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
  suggestedSkills: { id: string; name: string }[];
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
      <label className="block text-sm font-medium text-[#171717] mb-1.5">Skills</label>
      <div
        className="flex flex-wrap items-center gap-1.5 p-2.5 border border-[var(--border)] rounded-xl bg-white min-h-[48px] cursor-text focus-within:ring-2 focus-within:ring-[#C4A35A]/20 focus-within:border-[#C4A35A] transition-colors"
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
            {unusedSuggestions.slice(0, 8).map((skill) => (
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
   Location Input
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
          Saved at {timestamp}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page Component
   ══════════════════════════════════════════════════════════ */

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
    refetch,
  } = useEmployerJob(jobId);
  const updateJob = useUpdateJob();
  const publishJob = usePublishJob();
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [originalValues, setOriginalValues] = useState<EditJobFormData | null>(null);

  const {
    register,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditJobFormData>({
    resolver: zodResolver(editJobSchema),
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

  const salaryLabel = formatSalaryLabel(watchedSalaryMin, watchedSalaryMax, watchedCurrency);

  // Populate form when job data loads
  useEffect(() => {
    if (job) {
      const values: EditJobFormData = {
        title: job.title || "",
        jobType: job.jobType || "",
        workMode: job.workMode || "",
        location: job.location || "",
        description: job.description || "",
        responsibilities: job.responsibilities || "",
        skills: job.niceToHaveSkills || [],
        experienceLevel: job.experienceLevel || "",
        salaryMin: job.salaryMin?.toString() || "",
        salaryMax: job.salaryMax?.toString() || "",
        salaryCurrency: job.salaryCurrency || "NGN",
        applicationDeadline: job.applicationDeadline
          ? job.applicationDeadline.split("T")[0]
          : "",
      };
      reset(values);
      setOriginalValues(values);
    }
  }, [job, reset]);

  // Compute changed fields for diff indicators
  const changedFields = useMemo(() => {
    if (!originalValues) return new Set<string>();
    const current = getValues();
    const changed = new Set<string>();
    for (const key of Object.keys(originalValues) as (keyof EditJobFormData)[]) {
      const orig = originalValues[key];
      const curr = current[key];
      if (Array.isArray(orig) && Array.isArray(curr)) {
        if (JSON.stringify(orig) !== JSON.stringify(curr)) changed.add(key);
      } else if (orig !== curr) {
        changed.add(key);
      }
    }
    return changed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalValues, watchedTitle, watchedSkills, watchedWorkMode, watchedSalaryMin, watchedSalaryMax, watchedCurrency, watch("description"), watch("responsibilities"), watch("jobType"), watch("location"), watch("experienceLevel"), watch("applicationDeadline")]);

  const handleDiscard = useCallback(() => {
    if (originalValues) {
      reset(originalValues);
    }
    setDiscardOpen(false);
    toast.info("Changes discarded.");
  }, [originalValues, reset]);

  const isEditable =
    job?.status === JobStatus.DRAFT || job?.status === JobStatus.REJECTED;

  const handleSave = useCallback(
    async (asDraft: boolean) => {
      const data = getValues();
      try {
        await updateJob.mutateAsync({
          jobId,
          data: {
            title: data.title,
            jobType: data.jobType as any,
            workMode: data.workMode as any,
            location: data.location || null,
            description: data.description,
            responsibilities: data.responsibilities || null,
            niceToHaveSkills: data.skills.length > 0 ? data.skills : null,
            salaryMin: data.salaryMin ? Number(data.salaryMin) : null,
            salaryMax: data.salaryMax ? Number(data.salaryMax) : null,
            salaryCurrency: data.salaryCurrency || null,
            experienceLevel: (data.experienceLevel as any) || null,
            applicationDeadline: data.applicationDeadline || null,
          },
        });

        if (!asDraft) {
          await publishJob.mutateAsync(jobId);
          toast.success("Job published for review!");
        } else {
          toast.success("Job saved as draft.");
        }

        router.push(`/employer/jobs/${jobId}`);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save job.",
        );
      }
    },
    [getValues, jobId, updateJob, publishJob, router],
  );

  // Loading state
  if (jobLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-[var(--surface-2)] rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-12 bg-[var(--surface-2)] rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (jobError || !job) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--border)] p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h3 className="font-semibold text-[#171717] mb-2">Failed to load job</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6 max-w-sm mx-auto">
          {jobError instanceof Error
            ? jobError.message
            : "Something went wrong. Please try again."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Not editable guard
  if (!isEditable) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--border)] p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-amber-500" />
        </div>
        <h3 className="font-semibold text-[#171717] mb-2">Cannot edit this job</h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-6">
          Only jobs in Draft or Rejected status can be edited.
        </p>
        <Link
          href={`/employer/jobs/${jobId}`}
          className="inline-flex px-5 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
        >
          Back to Job
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/employer/jobs/${jobId}`}
            className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#171717]">Edit Job Posting</h1>
            <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
              Update details and publish when ready.
            </p>
          </div>
        </div>
        <AutoSaveIndicator dirty={isDirty} />
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold",
            job.status === JobStatus.DRAFT
              ? "bg-gray-100 text-gray-700"
              : "bg-red-50 text-red-700",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              job.status === JobStatus.DRAFT ? "bg-gray-400" : "bg-red-400",
            )}
          />
          {job.status === JobStatus.DRAFT ? "Draft" : "Rejected"}
        </span>
      </div>

      {/* ─── Form ─── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-6"
      >
        {/* Section: Job Details */}
        <motion.div variants={fadeUp}>
          <h2 className="text-base font-semibold text-[#171717] mb-4 flex items-center gap-2">
            <Briefcase size={16} className="text-[#C4A35A]" />
            Job Details
          </h2>
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeUp}>
          <label className="block text-sm font-medium text-[#171717] mb-1.5">
            Job title <span className="text-red-500">*</span>
            <FieldChanged changed={changedFields.has("title")} />
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
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-[#171717] mb-1.5">
              Job type <span className="text-red-500">*</span>
              <FieldChanged changed={changedFields.has("jobType")} />
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
              <FieldChanged changed={changedFields.has("description")} />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toast.info("AI description improvement coming soon!")}
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
                <span className="text-[var(--neutral-gray)] italic">Nothing to preview yet</span>
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
            <FieldChanged changed={changedFields.has("responsibilities")} />
          </label>
          <textarea
            {...register("responsibilities")}
            placeholder="List key responsibilities, one per line..."
            rows={4}
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20 focus:border-[#C4A35A] transition-colors bg-white resize-none leading-relaxed"
          />
        </motion.div>

        {/* Divider */}
        <div className="border-t border-[var(--border)]" />

        {/* Section: Skills */}
        <motion.div variants={fadeUp}>
          <h2 className="text-base font-semibold text-[#171717] mb-4 flex items-center gap-2">
            <Code2 size={16} className="text-[#C4A35A]" />
            Skills &amp; Experience
          </h2>
        </motion.div>

        <motion.div variants={fadeUp}>
          <SkillTagInput
            skills={watchedSkills}
            onChange={(s) => setValue("skills", s)}
            suggestedSkills={Array.isArray(suggestedSkills) ? suggestedSkills : []}
          />
        </motion.div>

        {/* Experience Level */}
        <motion.div variants={fadeUp}>
          <label className="block text-sm font-medium text-[#171717] mb-1.5">
            Experience level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_LEVELS.map((level) => {
              const selected = watch("experienceLevel") === level.value;
              return (
                <motion.button
                  key={level.value}
                  type="button"
                  onClick={() => setValue("experienceLevel", level.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 px-3 rounded-xl border-2 transition-all",
                    selected
                      ? "border-[#C4A35A] bg-[#C4A35A]/5"
                      : "border-[var(--border)] bg-white hover:border-[var(--neutral-gray)]",
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
                  <span className="text-[10px] text-[var(--neutral-gray)]">{level.sub}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Divider */}
        <div className="border-t border-[var(--border)]" />

        {/* Section: Compensation */}
        <motion.div variants={fadeUp}>
          <h2 className="text-base font-semibold text-[#171717] mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-[#C4A35A]" />
            Compensation &amp; Deadline
          </h2>
        </motion.div>

        {/* Salary */}
        <motion.div variants={fadeUp}>
          <label className="block text-sm font-medium text-[#171717] mb-1.5">
            Salary range
            <FieldChanged changed={changedFields.has("salaryMin") || changedFields.has("salaryMax") || changedFields.has("salaryCurrency")} />
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
            <div className="col-span-1">
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
                <span className="text-sm font-semibold text-[#C4A35A]">{salaryLabel}</span>
                <span className="text-xs text-[var(--neutral-gray)]">{watchedCurrency}</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Experience + Deadline row */}
        <motion.div variants={fadeUp}>
          <label className="block text-sm font-medium text-[#171717] mb-1.5">
            Application deadline
            <FieldChanged changed={changedFields.has("applicationDeadline")} />
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

      {/* ─── Sticky Footer ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface-0)]/80 backdrop-blur-xl border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/employer/jobs/${jobId}`}
              className="text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </Link>
            {isDirty && (
              <button
                type="button"
                onClick={() => setDiscardOpen(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--error)] hover:text-[var(--error-dark)] transition-colors"
              >
                <RotateCcw size={13} /> Discard
              </button>
            )}
          </div>

          {/* Changed fields count + completeness */}
          <div className="hidden sm:flex items-center gap-4">
            {changedFields.size > 0 && (
              <span className="text-xs font-medium text-[#C4A35A]">
                {changedFields.size} field{changedFields.size > 1 ? "s" : ""} modified
              </span>
            )}
            <div className="flex items-center gap-3">
              {[
                { done: !!watchedTitle, label: "Title" },
                { done: watch("description").length >= 20, label: "Description" },
                { done: !!watchedWorkMode, label: "Mode" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  {item.done ? (
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-[var(--border)]" />
                  )}
                  <span className="text-[10px] text-[var(--neutral-gray)]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={updateJob.isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] disabled:opacity-60 transition-colors"
            >
              {updateJob.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Draft
            </button>
            <motion.button
              type="button"
              onClick={() => handleSave(false)}
              disabled={updateJob.isPending || publishJob.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#C4A35A] to-[#A8893D] hover:from-[#E08A13] hover:to-[#D05A10] disabled:opacity-60 transition-all shadow-sm"
            >
              {publishJob.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Save &amp; Publish
            </motion.button>
          </div>
        </div>
      </div>

      {/* Discard changes dialog */}
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={handleDiscard}
        title="Discard changes?"
        message="All unsaved modifications will be reverted to the original values."
        confirmLabel="Discard"
        variant="warning"
      />
    </div>
  );
}

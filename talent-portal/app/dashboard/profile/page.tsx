"use client";

// ══════════════════════════════════════════════════════════════════════════════
// Profile Editor — Premium Multi-Step Wizard
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  User,
  Briefcase,
  FolderOpen,
  Link2,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Camera,
  Upload,
  Plus,
  Trash2,
  Eye,
  Sparkles,
  MapPin,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
  Wifi,
  Building2,
  X,
  Search,
  AlertCircle,
  Send,
} from "lucide-react";
import {
  useMyProfile,
  useCreateProfile,
  useUpdateProfile,
  useUpdateSkills,
  useSubmitProfile,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/use-candidates";
import { useSkills, useTracks } from "@/hooks/use-taxonomy";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/shared/form-field";

/* ──────────────────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────────────────── */

const STEPS = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Professional", icon: Briefcase },
  { id: 3, label: "Projects", icon: FolderOpen },
  { id: 4, label: "Online Presence", icon: Link2 },
  { id: 5, label: "Preferences", icon: Clock },
] as const;

const WORK_MODES = [
  { value: "remote", label: "Remote", icon: Wifi, description: "Work from anywhere" },
  { value: "hybrid", label: "Hybrid", icon: Building2, description: "Office & remote mix" },
  { value: "on_site", label: "On-site", icon: MapPin, description: "Full-time in office" },
];

const AVAILABILITY_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "one_month", label: "Within 1 month" },
  { value: "two_three_months", label: "2-3 months" },
  { value: "not_available", label: "Not available" },
];

const STEP_FIELDS: Record<number, string[]> = {
  1: ["fullName", "contactEmail", "phone", "bio", "city", "country"],
  2: ["primaryTrackId", "skills", "yearsOfExperience", "primaryStacks"],
  3: ["projects"],
  4: ["githubUrl", "linkedinUrl", "portfolioUrl", "personalWebsite"],
  5: ["availabilityStatus", "preferredWorkMode", "preferredHoursStart", "preferredHoursEnd"],
};

const STEP_TIPS: Record<number, string> = {
  1: "A complete personal profile increases your visibility to employers by 3x.",
  2: "Employers search by skills — the more specific, the better your matches.",
  3: "Pro tip: employers love detailed project descriptions with quantifiable outcomes.",
  4: "Linking your GitHub and LinkedIn boosts trust and credibility significantly.",
  5: "Setting availability to 'Immediate' gets you 5x more intro requests.",
};

const DRAFT_KEY = "profile-editor-draft";

const inputClass =
  "w-full px-4 py-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--surface-4)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] focus:bg-[var(--surface-0)] transition-all duration-200";

/* ──────────────────────────────────────────────────────────
   Zod Schema
   ────────────────────────────────────────────────────────── */

const optionalUrl = z.union([
  z.literal(""),
  z.string().url("Please enter a valid URL"),
]);

const profileSchema = z.object({
  // Step 1
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
  contactEmail: z.union([z.literal(""), z.string().email("Please enter a valid email")]),
  phone: z.string(),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(500, "Bio must be under 500 characters"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  // Step 2
  primaryTrackId: z.string().min(1, "Please select a track"),
  skills: z.array(z.object({ id: z.string(), name: z.string() })).min(3, "Select at least 3 skills"),
  yearsOfExperience: z.string(),
  primaryStacks: z.string(),
  // Step 3
  projects: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        description: z.string(),
        projectUrl: z.string(),
        githubUrl: z.string(),
        techStack: z.string(),
      }),
    )
    .max(3),
  // Step 4
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  personalWebsite: optionalUrl,
  // Step 5
  availabilityStatus: z.string().min(1, "Please select your availability"),
  preferredWorkMode: z.string().min(1, "Please select a work mode"),
  preferredHoursStart: z.string(),
  preferredHoursEnd: z.string(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/* ──────────────────────────────────────────────────────────
   Animation Variants
   ────────────────────────────────────────────────────────── */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.98,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
    scale: 0.98,
  }),
};

/* ════════════════════════════════════════════════════════════
   Step Indicator
   ════════════════════════════════════════════════════════════ */

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] px-8 py-6">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-[var(--surface-3)] rounded-full" />
          <motion.div
            className="absolute top-5 left-[10%] h-[2px] rounded-full origin-left"
            style={{ background: "var(--gradient-primary)" }}
            initial={false}
            animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 80}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as const }}
          />
          {STEPS.map((step) => {
            const completed = currentStep > step.id;
            const current = currentStep === step.id;
            const StepIcon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => onStepClick(step.id)}
                className="relative z-10 flex flex-col items-center gap-2.5 group"
              >
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    current && "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30",
                    completed && "bg-[var(--primary)] text-white",
                    !current &&
                      !completed &&
                      "bg-[var(--surface-0)] border-2 border-[var(--surface-3)] text-[var(--neutral-gray)] group-hover:border-[var(--primary)]/40 group-hover:text-[var(--primary)]/60",
                  )}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {completed ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <motion.path
                        d="M5 12l5 5L19 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          duration: reducedMotion ? 0 : 0.4,
                          ease: "easeOut" as const,
                        }}
                      />
                    </svg>
                  ) : (
                    <StepIcon size={16} />
                  )}
                </motion.div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    current && "text-[var(--primary)]",
                    completed && "text-[var(--text-primary)]",
                    !current && !completed && "text-[var(--neutral-gray)]",
                  )}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {STEPS[currentStep - 1].label}
          </span>
          <span className="text-xs text-[var(--neutral-gray)]">
            Step {currentStep} of {STEPS.length}
          </span>
        </div>
        <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--gradient-primary)" }}
            initial={false}
            animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as const }}
          />
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   Photo Upload Zone
   ════════════════════════════════════════════════════════════ */

function PhotoUploadZone({
  photoUrl,
  isUploading,
  uploadProgress,
  onUpload,
}: {
  photoUrl: string | null;
  isUploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const displayUrl = preview || photoUrl;
  const circumference = 2 * Math.PI * 52;

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG or PNG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex items-center gap-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
      <div
        className="relative group cursor-pointer"
        style={{ transition: "transform 0.2s" }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "w-28 h-28 rounded-full flex items-center justify-center border-2 border-dashed transition-all duration-200 overflow-hidden",
            isDragging
              ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-105"
              : "border-[var(--surface-3)] group-hover:border-[var(--primary)]/40",
          )}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <Camera
              size={32}
              className="text-[var(--surface-4)] group-hover:text-[var(--primary)]/60 transition-colors"
            />
          )}
        </div>

        {isUploading && (
          <svg className="absolute inset-0 w-28 h-28 -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="52" stroke="var(--surface-3)" strokeWidth="4" fill="none" />
            <motion.circle
              cx="56"
              cy="56"
              r="52"
              stroke="var(--primary)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset: circumference - (uploadProgress / 100) * circumference,
              }}
              transition={{ duration: 0.3 }}
            />
          </svg>
        )}

        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md">
          <Plus size={14} />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => !isUploading && fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-sm font-medium text-[var(--primary)] hover:text-[var(--secondary)] flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <Upload size={14} /> {isUploading ? "Uploading..." : "Upload photo"}
        </button>
        <p className="text-xs text-[var(--neutral-gray)] mt-1">
          JPG or PNG. Max 2MB. Drag & drop or click.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Skills Tag Input
   ════════════════════════════════════════════════════════════ */

function SkillsTagInput({
  value,
  onChange,
  error,
}: {
  value: { id: string; name: string }[];
  onChange: (skills: { id: string; name: string }[]) => void;
  error?: string;
}) {
  const { data: allSkills } = useSkills();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(value.map((s) => s.id)), [value]);

  const filtered = useMemo(() => {
    if (!allSkills) return [];
    return allSkills
      .filter((s) => s.isActive && !selectedIds.has(s.id))
      .filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 20);
  }, [allSkills, selectedIds, query]);

  const addSkill = (skill: { id: string; name: string }) => {
    onChange([...value, skill]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeSkill = (id: string) => {
    onChange(value.filter((s) => s.id !== id));
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef}>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        Skills <span className="text-[var(--error)]">*</span>
      </label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          <AnimatePresence mode="popLayout">
            {value.map((skill) => (
              <motion.span
                key={skill.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--primary)]/8 text-[var(--primary)] rounded-lg text-xs font-medium"
              >
                {skill.name}
                <button
                  type="button"
                  onClick={() => removeSkill(skill.id)}
                  className="hover:bg-[var(--primary)]/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search and add skills..."
          className={cn(
            inputClass,
            "pl-9",
            error && "border-[var(--error)] ring-2 ring-[var(--error)]/10",
          )}
        />
      </div>

      <div className="mt-1.5">
        <p
          className={cn(
            "text-xs font-medium",
            value.length >= 3 ? "text-[var(--success)]" : "text-[var(--neutral-gray)]",
          )}
        >
          {value.length} of 3 minimum selected
          {value.length >= 3 && <Check size={12} className="inline ml-1" />}
        </p>
      </div>

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="relative z-20 mt-1 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto"
          >
            {filtered.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => addSkill({ id: skill.id, name: skill.name })}
                className="w-full text-left px-3.5 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {skill.name}
                {skill.category && (
                  <span className="ml-2 text-[10px] text-[var(--neutral-gray)]">
                    {skill.category}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-1 text-xs text-[var(--error)] mt-1.5 font-medium"
          >
            <AlertCircle size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Success Overlay
   ════════════════════════════════════════════════════════════ */

function SuccessOverlay({ show, onClose }: { show: boolean; onClose: () => void }) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring" as const, damping: 20, stiffness: 300 }}
            className="bg-[var(--surface-0)] rounded-3xl p-10 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.1,
                type: "spring" as const,
                damping: 15,
                stiffness: 400,
              }}
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M5 12l5 5L19 7"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    delay: reducedMotion ? 0 : 0.3,
                    duration: reducedMotion ? 0 : 0.5,
                    ease: "easeOut" as const,
                  }}
                />
              </svg>
            </motion.div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              Profile Submitted!
            </h3>
            <p className="text-sm text-[var(--neutral-gray)]">
              Your profile is now under review.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */

export default function ProfileEditorPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();

  /* ── API hooks ── */
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: profileNotFound,
  } = useMyProfile();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const submitProfile = useSubmitProfile();
  const updateSkillsMutation = useUpdateSkills();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const { data: tracks } = useTracks();
  const needsCreation = !isLoadingProfile && (profileNotFound || !profile);

  /* ── React Hook Form ── */
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      contactEmail: "",
      phone: "",
      bio: "",
      city: "",
      country: "",
      primaryTrackId: "",
      skills: [],
      yearsOfExperience: "",
      primaryStacks: "",
      projects: [{ title: "", description: "", projectUrl: "", githubUrl: "", techStack: "" }],
      githubUrl: "",
      linkedinUrl: "",
      portfolioUrl: "",
      personalWebsite: "",
      availabilityStatus: "",
      preferredWorkMode: "",
      preferredHoursStart: "09:00",
      preferredHoursEnd: "17:00",
    },
    mode: "onTouched",
  });

  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({ control: form.control, name: "projects" });

  /* ── UI state ── */
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [expandedProject, setExpandedProject] = useState<number | null>(0);
  const draftRef = useRef<ProfileFormData | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Watched values (sidebar) ── */
  const watchedValues = form.watch();

  /* ── Load profile data ── */
  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName || user?.displayName || "",
        contactEmail: profile.contactEmail || user?.email || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        city: profile.city || "",
        country: profile.country || "",
        primaryTrackId: profile.primaryTrackId || "",
        skills: (profile.candidateSkills || []).map((cs) => ({
          id: cs.skillId,
          name: cs.skill?.name || cs.customTagName || "",
        })),
        yearsOfExperience:
          profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "",
        primaryStacks: (profile.primaryStacks || []).join(", "),
        projects:
          profile.candidateProjects && profile.candidateProjects.length > 0
            ? profile.candidateProjects.map((p) => ({
                id: p.id,
                title: p.title || "",
                description: p.description || "",
                projectUrl: p.projectUrl || "",
                githubUrl: p.githubUrl || "",
                techStack: (p.techStack || []).join(", "),
              }))
            : [{ title: "", description: "", projectUrl: "", githubUrl: "", techStack: "" }],
        githubUrl: profile.githubUrl || "",
        linkedinUrl: profile.linkedinUrl || "",
        portfolioUrl: profile.portfolioUrl || "",
        personalWebsite: profile.personalWebsite || "",
        availabilityStatus: profile.availabilityStatus || "",
        preferredWorkMode: profile.preferredWorkMode || "",
        preferredHoursStart: profile.preferredHoursStart || "09:00",
        preferredHoursEnd: profile.preferredHoursEnd || "17:00",
      });
    } else if (needsCreation && user) {
      form.setValue("fullName", user.displayName || "");
      form.setValue("contactEmail", user.email || "");
    }
  }, [profile, needsCreation, user, form]);

  /* ── Draft restore check ── */
  useEffect(() => {
    if (isLoadingProfile) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { values, savedAt } = JSON.parse(raw);
      const serverTime = profile?.updatedAt ? new Date(profile.updatedAt).getTime() : 0;
      if (savedAt > serverTime) {
        draftRef.current = values;
        setShowDraftBanner(true);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [isLoadingProfile, profile]);

  /* ── Auto-save every 30s ── */
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      const values = form.getValues();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, savedAt: Date.now() }));
      toast("Draft saved", { duration: 2000 });
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [form]);

  const restoreDraft = useCallback(() => {
    if (draftRef.current) {
      form.reset(draftRef.current);
      setShowDraftBanner(false);
      toast.success("Draft restored!");
    }
  }, [form]);

  const dismissDraft = useCallback(() => {
    setShowDraftBanner(false);
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  /* ── Profile strength ── */
  const profileStrength = useMemo(() => {
    let score = 0;
    if (watchedValues.fullName) score += 10;
    if (watchedValues.bio && watchedValues.bio.length >= 50) score += 10;
    if (watchedValues.city) score += 5;
    if (watchedValues.country) score += 5;
    if (watchedValues.primaryTrackId) score += 10;
    if (watchedValues.skills?.length >= 3) score += 10;
    if (watchedValues.primaryStacks) score += 5;
    if (watchedValues.yearsOfExperience) score += 5;
    if (watchedValues.projects?.[0]?.title) score += 10;
    if (watchedValues.githubUrl) score += 5;
    if (watchedValues.linkedinUrl) score += 5;
    if (watchedValues.portfolioUrl) score += 5;
    if (watchedValues.availabilityStatus) score += 5;
    if (watchedValues.preferredWorkMode) score += 5;
    if (watchedValues.phone) score += 5;
    return Math.min(score, 100);
  }, [watchedValues]);

  const strengthLabel =
    profileStrength >= 80
      ? "Strong"
      : profileStrength >= 60
        ? "Good"
        : profileStrength >= 40
          ? "Fair"
          : "Getting Started";

  const strengthColor =
    profileStrength >= 80
      ? "var(--success)"
      : profileStrength >= 60
        ? "var(--primary)"
        : profileStrength >= 40
          ? "var(--warning)"
          : "var(--error)";

  const circumference = 2 * Math.PI * 40;

  const checklistItems = [
    { label: "Full name", done: !!watchedValues.fullName },
    { label: "Bio (50+ chars)", done: (watchedValues.bio?.length || 0) >= 50 },
    { label: "Location", done: !!watchedValues.city && !!watchedValues.country },
    { label: "Track", done: !!watchedValues.primaryTrackId },
    { label: "Skills (3+)", done: (watchedValues.skills?.length || 0) >= 3 },
    { label: "Projects", done: !!watchedValues.projects?.[0]?.title },
    { label: "GitHub", done: !!watchedValues.githubUrl },
    { label: "LinkedIn", done: !!watchedValues.linkedinUrl },
    { label: "Availability", done: !!watchedValues.availabilityStatus },
    { label: "Work mode", done: !!watchedValues.preferredWorkMode },
  ];

  /* ── Navigation ── */
  const goToStep = (step: number) => {
    if (step === currentStep) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  /* ── Photo upload ── */
  const handlePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiClient.upload<{ url: string }>("/me/profile/photo", formData);
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Photo uploaded successfully!");
    } catch {
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsUploadingPhoto(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  /* ── Save ── */
  const handleSave = async (andSubmit = false) => {
    const valid = await form.trigger(STEP_FIELDS[currentStep] as any);
    if (!valid) return;

    const v = form.getValues();
    const payload: Record<string, any> = {
      fullName: v.fullName || undefined,
      contactEmail: v.contactEmail || undefined,
      bio: v.bio || undefined,
      city: v.city || undefined,
      country: v.country || undefined,
      phone: v.phone || undefined,
      primaryTrackId: v.primaryTrackId || undefined,
      githubUrl: v.githubUrl || undefined,
      linkedinUrl: v.linkedinUrl || undefined,
      portfolioUrl: v.portfolioUrl || undefined,
      personalWebsite: v.personalWebsite || undefined,
      availabilityStatus: (v.availabilityStatus as any) || undefined,
      preferredWorkMode: (v.preferredWorkMode as any) || undefined,
      preferredHoursStart: v.preferredHoursStart || undefined,
      preferredHoursEnd: v.preferredHoursEnd || undefined,
      yearsOfExperience: v.yearsOfExperience ? parseInt(v.yearsOfExperience) : undefined,
      primaryStacks: v.primaryStacks
        ? v.primaryStacks
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      await updateProfile.mutateAsync(payload);

      if (currentStep === 2 && v.skills.length > 0) {
        try {
          await updateSkillsMutation.mutateAsync({
            skillIds: v.skills.map((s) => s.id),
          });
        } catch {
          toast.error("Skills could not be saved.");
        }
      }

      if (currentStep === 3) {
        try {
          const existingIds = (profile?.candidateProjects || []).map((p) => p.id);
          const formProjects = v.projects.filter((p) => p.title.trim());

          // Delete removed projects
          const formIds = formProjects.map((p) => p.id).filter(Boolean);
          for (const existingId of existingIds) {
            if (!formIds.includes(existingId)) {
              await deleteProjectMutation.mutateAsync(existingId);
            }
          }

          // Create or update projects
          for (let i = 0; i < formProjects.length; i++) {
            const p = formProjects[i];
            const projectData = {
              title: p.title,
              description: p.description || undefined,
              projectUrl: p.projectUrl || undefined,
              githubUrl: p.githubUrl || undefined,
              techStack: p.techStack
                ? p.techStack.split(",").map((s) => s.trim()).filter(Boolean)
                : undefined,
              displayOrder: i,
            };

            if (p.id) {
              await updateProjectMutation.mutateAsync({ projectId: p.id, data: projectData });
            } else {
              const created = await createProjectMutation.mutateAsync(projectData);
              form.setValue(`projects.${i}.id`, created.id);
            }
          }
        } catch {
          toast.error("Projects could not be saved.");
        }
      }

      if (andSubmit) {
        await submitProfile.mutateAsync();
        localStorage.removeItem(DRAFT_KEY);
        setShowSuccess(true);
        return;
      }

      toast.success("Profile saved!");
      if (currentStep < 5) goToStep(currentStep + 1);
    } catch (putError: any) {
      if (putError?.status === 404 && needsCreation) {
        try {
          await createProfile.mutateAsync(payload);
          toast.success("Profile created!");
          if (andSubmit) {
            await submitProfile.mutateAsync();
            localStorage.removeItem(DRAFT_KEY);
            setShowSuccess(true);
          } else if (currentStep < 5) {
            goToStep(currentStep + 1);
          }
        } catch {
          toast.error("Failed to save. Please try again.");
        }
      } else {
        toast.error("Failed to save. Please try again.");
      }
    }
  };

  const isSaving =
    updateProfile.isPending || createProfile.isPending || submitProfile.isPending ||
    createProjectMutation.isPending || updateProjectMutation.isPending || deleteProjectMutation.isPending;

  /* ── Loading skeleton ── */
  if (isLoadingProfile) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl skeleton-shimmer" />
            <div className="h-8 w-52 bg-[var(--surface-2)] rounded-lg skeleton-shimmer" />
          </div>
          <div className="h-4 w-80 bg-[var(--surface-2)] rounded-lg skeleton-shimmer mt-3 ml-[52px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="h-24 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] skeleton-shimmer" />
            <div className="h-[28rem] bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] skeleton-shimmer" />
          </div>
          <div className="h-96 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] skeleton-shimmer" />
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Draft restore banner */}
      <AnimatePresence>
        {showDraftBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            className="mb-6 p-4 rounded-2xl border border-[var(--info)]/30 bg-[var(--info-light)] flex items-center justify-between gap-3"
          >
            <p className="text-sm text-[var(--info-dark)] font-medium">
              You have an unsaved draft. Would you like to restore it?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={restoreDraft}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--secondary)] transition-colors"
              >
                Restore
              </button>
              <button
                onClick={dismissDraft}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-[var(--primary)]/20"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Build Your Profile</h1>
          </div>
          <p className="text-sm text-[var(--neutral-gray)] mt-2 ml-[52px]">
            A complete profile helps you stand out and get matched with the right opportunities.
          </p>
        </div>
        <Link
          href="/dashboard/profile/preview"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--primary)] bg-[var(--primary)]/8 hover:bg-[var(--primary)]/15 transition-colors"
        >
          <Eye size={16} /> Preview
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ═══ Main content (3/4) ═══ */}
        <div className="lg:col-span-3 space-y-6">
          <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

          <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 min-h-[28rem]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: reducedMotion ? 0 : 0.28,
                  ease: [0.22, 1, 0.36, 1] as const,
                }}
              >
                {/* ─── Step 1: Personal Info ─── */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                          <User size={16} className="text-[var(--primary)]" />
                        </div>
                        Personal Information
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mt-1 ml-[42px]">
                        Tell employers who you are.
                      </p>
                    </div>

                    <PhotoUploadZone
                      photoUrl={profile?.photoUrl || null}
                      isUploading={isUploadingPhoto}
                      uploadProgress={uploadProgress}
                      onUpload={handlePhotoUpload}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Controller
                        name="fullName"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <FormField
                            label="Full name"
                            name="fullName"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="e.g. Ada Okafor"
                            error={fieldState.error?.message}
                            success={!!field.value && !fieldState.error}
                            required
                          />
                        )}
                      />
                      <Controller
                        name="contactEmail"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <FormField
                            label="Email"
                            name="contactEmail"
                            type="email"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="ada@example.com"
                            error={fieldState.error?.message}
                            success={!!field.value && !fieldState.error}
                          />
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Controller
                        name="phone"
                        control={form.control}
                        render={({ field }) => (
                          <FormField
                            label="Phone number"
                            name="phone"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="+234 800 000 0000"
                          />
                        )}
                      />
                    </div>

                    <Controller
                      name="bio"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                            Bio <span className="text-[var(--error)]">*</span>
                          </label>
                          <textarea
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            placeholder="Tell employers about yourself, your passions, and what makes you stand out..."
                            rows={4}
                            className={cn(
                              inputClass,
                              "resize-none",
                              fieldState.error &&
                                "border-[var(--error)] ring-2 ring-[var(--error)]/10 animate-[shake-error_0.3s_ease-in-out]",
                            )}
                          />
                          <div className="flex justify-between mt-1.5">
                            <AnimatePresence mode="wait">
                              {fieldState.error ? (
                                <motion.p
                                  key="error"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="flex items-center gap-1 text-xs text-[var(--error)] font-medium"
                                >
                                  <AlertCircle size={12} /> {fieldState.error.message}
                                </motion.p>
                              ) : (
                                <motion.p
                                  key="hint"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="text-xs text-[var(--neutral-gray)]"
                                >
                                  {field.value.length < 50
                                    ? `${50 - field.value.length} more characters needed`
                                    : "Looking good!"}
                                </motion.p>
                              )}
                            </AnimatePresence>
                            <p
                              className={cn(
                                "text-xs",
                                field.value.length > 450
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--neutral-gray)]",
                              )}
                            >
                              {field.value.length}/500
                            </p>
                          </div>
                        </div>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Controller
                        name="city"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <FormField label="City" name="city" value={field.value} onChange={field.onChange} placeholder="Lagos" error={fieldState.error?.message} success={!!field.value && !fieldState.error} required />
                        )}
                      />
                      <Controller
                        name="country"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <FormField label="Country" name="country" value={field.value} onChange={field.onChange} placeholder="Nigeria" error={fieldState.error?.message} success={!!field.value && !fieldState.error} required />
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* ─── Step 2: Professional ─── */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                          <Briefcase size={16} className="text-[var(--primary)]" />
                        </div>
                        Professional Details
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mt-1 ml-[42px]">
                        Highlight your expertise and experience level.
                      </p>
                    </div>

                    <Controller
                      name="primaryTrackId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <FormField
                          label="Primary track"
                          name="primaryTrackId"
                          type="select"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select your track"
                          options={(tracks || []).filter((t) => t.isActive).map((t) => ({ value: t.id, label: t.name }))}
                          error={fieldState.error?.message}
                          success={!!field.value && !fieldState.error}
                          required
                        />
                      )}
                    />

                    <Controller
                      name="skills"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <SkillsTagInput value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Controller
                        name="yearsOfExperience"
                        control={form.control}
                        render={({ field }) => (
                          <FormField label="Years of experience" name="yearsOfExperience" type="select" value={field.value} onChange={field.onChange} placeholder="Select" options={[{ value: "0", label: "Less than 1 year" }, { value: "1", label: "1-2 years" }, { value: "3", label: "3-5 years" }, { value: "5", label: "5+ years" }]} />
                        )}
                      />
                      <Controller
                        name="primaryStacks"
                        control={form.control}
                        render={({ field }) => (
                          <FormField label="Primary stacks" name="primaryStacks" value={field.value} onChange={field.onChange} placeholder="MERN, Next.js, Django" description="Comma-separated list of tech stacks" />
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* ─── Step 3: Projects ─── */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                          <FolderOpen size={16} className="text-[var(--primary)]" />
                        </div>
                        Highlighted Projects
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mt-1 ml-[42px]">
                        Showcase up to 3 projects that demonstrate your skills.
                      </p>
                    </div>

                    <AnimatePresence mode="popLayout">
                      {projectFields.map((field, index) => {
                        const isExpanded = expandedProject === index;
                        const project = form.watch(`projects.${index}`);
                        const techTags = project.techStack
                          ? project.techStack.split(",").map((t: string) => t.trim()).filter(Boolean)
                          : [];

                        return (
                          <motion.div
                            key={field.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            className="border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--primary)]/20 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedProject(isExpanded ? null : index)}
                              className="w-full flex items-center justify-between p-4 text-left"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs font-bold text-[var(--neutral-gray)] flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                    {project.title || `Project ${index + 1}`}
                                  </p>
                                  {!isExpanded && techTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {techTags.slice(0, 3).map((tag: string) => (
                                        <span key={tag} className="px-1.5 py-0.5 bg-[var(--surface-2)] rounded text-[10px] text-[var(--neutral-gray)]">{tag}</span>
                                      ))}
                                      {techTags.length > 3 && <span className="text-[10px] text-[var(--neutral-gray)]">+{techTags.length - 3}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {projectFields.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeProject(index); if (expandedProject === index) setExpandedProject(null); }}
                                    className="p-1.5 rounded-lg text-[var(--neutral-gray)] hover:text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                                {isExpanded ? <ChevronUp size={16} className="text-[var(--neutral-gray)]" /> : <ChevronDown size={16} className="text-[var(--neutral-gray)]" />}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-4">
                                    <Controller name={`projects.${index}.title`} control={form.control} render={({ field: f, fieldState }) => (<FormField label="Title" name={`projects.${index}.title`} value={f.value} onChange={f.onChange} placeholder="My Awesome Project" error={fieldState.error?.message} required />)} />
                                    <Controller name={`projects.${index}.description`} control={form.control} render={({ field: f }) => (<FormField label="Description" name={`projects.${index}.description`} type="textarea" value={f.value} onChange={f.onChange} placeholder="What does it do? What was your role?" rows={3} />)} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Controller name={`projects.${index}.projectUrl`} control={form.control} render={({ field: f }) => (
                                        <div>
                                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Live URL</label>
                                          <div className="relative">
                                            <ExternalLink size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
                                            <input type="url" value={f.value} onChange={(e) => f.onChange(e.target.value)} onBlur={f.onBlur} placeholder="https://myproject.com" className={cn(inputClass, "pl-9")} />
                                          </div>
                                        </div>
                                      )} />
                                      <Controller name={`projects.${index}.githubUrl`} control={form.control} render={({ field: f }) => (
                                        <div>
                                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">GitHub URL</label>
                                          <div className="relative">
                                            <Github size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
                                            <input type="url" value={f.value} onChange={(e) => f.onChange(e.target.value)} onBlur={f.onBlur} placeholder="https://github.com/user/repo" className={cn(inputClass, "pl-9")} />
                                          </div>
                                        </div>
                                      )} />
                                    </div>
                                    <Controller name={`projects.${index}.techStack`} control={form.control} render={({ field: f }) => (<FormField label="Tech stack used" name={`projects.${index}.techStack`} value={f.value} onChange={f.onChange} placeholder="React, Node.js, MongoDB" description="Comma-separated list" />)} />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {projectFields.length < 3 ? (
                      <motion.button
                        type="button"
                        onClick={() => { appendProject({ title: "", description: "", projectUrl: "", githubUrl: "", techStack: "" }); setExpandedProject(projectFields.length); }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--surface-3)] text-sm font-medium text-[var(--neutral-gray)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-all"
                      >
                        <Plus size={16} /> Add Project
                      </motion.button>
                    ) : (
                      <p className="text-xs text-[var(--neutral-gray)] text-center">Maximum 3 projects reached.</p>
                    )}
                  </div>
                )}

                {/* ─── Step 4: Online Presence ─── */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                          <Link2 size={16} className="text-[var(--primary)]" />
                        </div>
                        Online Presence
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mt-1 ml-[42px]">
                        Help employers find and learn more about you across the web.
                      </p>
                    </div>

                    {([
                      { name: "githubUrl" as const, label: "GitHub", icon: Github, placeholder: "https://github.com/yourusername" },
                      { name: "linkedinUrl" as const, label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/yourusername" },
                      { name: "portfolioUrl" as const, label: "Portfolio", icon: Globe, placeholder: "https://yourportfolio.com" },
                      { name: "personalWebsite" as const, label: "Personal website", icon: ExternalLink, placeholder: "https://yoursite.com" },
                    ]).map(({ name, label, icon: Icon, placeholder }) => (
                      <Controller
                        key={name}
                        name={name}
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{label}</label>
                            <div className="relative">
                              <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]" />
                              <input
                                type="url"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                                placeholder={placeholder}
                                className={cn(inputClass, "pl-10", fieldState.error && "border-[var(--error)] ring-2 ring-[var(--error)]/10 animate-[shake-error_0.3s_ease-in-out]")}
                              />
                              {field.value && !fieldState.error && (
                                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--success)]">
                                  <Check size={16} />
                                </motion.span>
                              )}
                            </div>
                            <AnimatePresence>
                              {fieldState.error && (
                                <motion.p initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -4, height: 0 }} className="flex items-center gap-1 text-xs text-[var(--error)] mt-1.5 font-medium">
                                  <AlertCircle size={12} /> {fieldState.error.message}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* ─── Step 5: Preferences + Review ─── */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                          <Clock size={16} className="text-[var(--primary)]" />
                        </div>
                        Work Preferences
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mt-1 ml-[42px]">
                        Let employers know your availability and how you like to work.
                      </p>
                    </div>

                    <Controller
                      name="availabilityStatus"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <FormField label="Availability" name="availabilityStatus" type="select" value={field.value} onChange={field.onChange} placeholder="Select availability" options={AVAILABILITY_OPTIONS} error={fieldState.error?.message} success={!!field.value && !fieldState.error} required />
                      )}
                    />

                    <Controller
                      name="preferredWorkMode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                            Preferred work mode <span className="text-[var(--error)]">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {WORK_MODES.map((mode) => {
                              const ModeIcon = mode.icon;
                              const isActive = field.value === mode.value;
                              return (
                                <button
                                  key={mode.value}
                                  type="button"
                                  onClick={() => field.onChange(mode.value)}
                                  className={cn(
                                    "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                                    isActive ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm shadow-[var(--primary)]/10" : "border-[var(--border)] hover:border-[var(--surface-4)] bg-[var(--surface-0)]",
                                  )}
                                >
                                  {isActive && (
                                    <div className="absolute top-2 right-2">
                                      <div className="w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center">
                                        <Check size={10} className="text-white" strokeWidth={3} />
                                      </div>
                                    </div>
                                  )}
                                  <ModeIcon size={22} className={isActive ? "text-[var(--primary)]" : "text-[var(--neutral-gray)]"} />
                                  <span className={cn("text-sm font-medium", isActive ? "text-[var(--primary)]" : "text-[var(--text-primary)]")}>{mode.label}</span>
                                  <span className="text-xs text-[var(--neutral-gray)]">{mode.description}</span>
                                </button>
                              );
                            })}
                          </div>
                          <AnimatePresence>
                            {fieldState.error && (
                              <motion.p initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -4, height: 0 }} className="flex items-center gap-1 text-xs text-[var(--error)] mt-1.5 font-medium">
                                <AlertCircle size={12} /> {fieldState.error.message}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Controller name="preferredHoursStart" control={form.control} render={({ field }) => (
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Preferred hours start</label>
                          <input type="time" value={field.value} onChange={(e) => field.onChange(e.target.value)} className={inputClass} />
                        </div>
                      )} />
                      <Controller name="preferredHoursEnd" control={form.control} render={({ field }) => (
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Preferred hours end</label>
                          <input type="time" value={field.value} onChange={(e) => field.onChange(e.target.value)} className={inputClass} />
                        </div>
                      )} />
                    </div>

                    {/* Review Summary */}
                    <div className="mt-8 pt-6 border-t border-[var(--border)]">
                      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <Eye size={16} className="text-[var(--primary)]" /> Review Your Profile
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Personal</h4>
                            <button type="button" onClick={() => goToStep(1)} className="text-xs text-[var(--primary)] hover:underline">Edit</button>
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{watchedValues.fullName || "—"}</p>
                          <p className="text-xs text-[var(--neutral-gray)]">{watchedValues.contactEmail || "—"}</p>
                          <p className="text-xs text-[var(--neutral-gray)]">{[watchedValues.city, watchedValues.country].filter(Boolean).join(", ") || "—"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Professional</h4>
                            <button type="button" onClick={() => goToStep(2)} className="text-xs text-[var(--primary)] hover:underline">Edit</button>
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{tracks?.find((t) => t.id === watchedValues.primaryTrackId)?.name || "—"}</p>
                          <p className="text-xs text-[var(--neutral-gray)]">{watchedValues.skills?.length || 0} skills{watchedValues.yearsOfExperience ? ` · ${watchedValues.yearsOfExperience}+ yrs` : ""}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Projects</h4>
                            <button type="button" onClick={() => goToStep(3)} className="text-xs text-[var(--primary)] hover:underline">Edit</button>
                          </div>
                          {watchedValues.projects?.filter((p) => p.title).length ? (
                            watchedValues.projects.filter((p) => p.title).map((p, i) => (<p key={i} className="text-xs text-[var(--text-primary)]">{p.title}</p>))
                          ) : (
                            <p className="text-xs text-[var(--neutral-gray)]">No projects added</p>
                          )}
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">Links</h4>
                            <button type="button" onClick={() => goToStep(4)} className="text-xs text-[var(--primary)] hover:underline">Edit</button>
                          </div>
                          {(() => {
                            const links = [
                              { url: watchedValues.githubUrl, label: "GitHub" },
                              { url: watchedValues.linkedinUrl, label: "LinkedIn" },
                              { url: watchedValues.portfolioUrl, label: "Portfolio" },
                              { url: watchedValues.personalWebsite, label: "Website" },
                            ].filter((l) => l.url);
                            return links.length ? links.map((l) => (<p key={l.label} className="text-xs text-[var(--primary)] truncate">{l.label}</p>)) : <p className="text-xs text-[var(--neutral-gray)]">No links added</p>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => goToStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--neutral-gray)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--neutral-gray)] hidden sm:block">
                  Step {currentStep} of {STEPS.length}
                </span>
                {currentStep === 5 ? (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                    className="relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:shadow-[var(--primary)]/25 disabled:opacity-60 transition-all duration-200 overflow-hidden"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Send size={15} /> Submit for Review</>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--secondary)] disabled:opacity-60 shadow-md shadow-[var(--primary)]/20 hover:shadow-lg hover:shadow-[var(--primary)]/25 transition-all duration-200"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Save & Continue <ChevronRight size={16} /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Sidebar (1/4) ═══ */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 sticky top-24 space-y-5">
            <div className="text-center">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Profile Strength</h3>
              <div className="relative w-28 h-28 mx-auto">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--surface-3)" strokeWidth="6" fill="none" />
                  <motion.circle
                    cx="50" cy="50" r="40"
                    stroke={strengthColor}
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - (profileStrength / 100) * circumference }}
                    transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeOut" as const }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span className="text-2xl font-bold text-[var(--text-primary)]" key={profileStrength} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                    {profileStrength}%
                  </motion.span>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            <div>
              <h4 className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-3">Completion Checklist</h4>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 text-sm">
                    <motion.div
                      className={cn("w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300", item.done ? "bg-[var(--success)]" : "border-2 border-[var(--surface-3)]")}
                      animate={item.done ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {item.done && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" as const, stiffness: 500, damping: 20 }}>
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.div>
                    <span className={cn("text-xs transition-colors", item.done ? "text-[var(--neutral-gray)] line-through" : "text-[var(--text-primary)]")}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />
            <div className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
              <p className="text-xs text-[var(--primary)] flex items-start gap-2 leading-relaxed">
                <Sparkles size={12} className="mt-0.5 flex-shrink-0" />
                <span>{STEP_TIPS[currentStep]}</span>
              </p>
            </div>

            <Link
              href="/dashboard/profile/preview"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-200 backdrop-blur-sm"
              style={{ background: "var(--glass-bg)" }}
            >
              <Eye size={14} /> View Public Profile
            </Link>
          </div>
        </div>
      </div>

      <SuccessOverlay show={showSuccess} onClose={() => setShowSuccess(false)} />
    </div>
  );
}

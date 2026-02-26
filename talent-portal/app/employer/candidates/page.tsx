"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Users,
  Loader2,
  Mail,
  ExternalLink,
  Star,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Bookmark,
  BookmarkCheck,
  Eye,
  Clock,
  Monitor,
  Building2,
  Globe,
  Github,
  Linkedin,
  Link2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTalents, useTalentBySlug } from "@/hooks/use-candidates";
import { useCreateIntroRequest } from "@/hooks/use-intro-requests";
import { useTracks, useSkills } from "@/hooks/use-taxonomy";
import { useShortlists, useAddToShortlist } from "@/hooks/use-shortlists";
import {
  RequestIntroModal,
  type IntroRequestData,
} from "@/components/intro-requests/request-intro-modal";
import type { CandidateProfile } from "@/types/candidate";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVAILABILITY_OPTIONS = [
  { value: "all", label: "All Availability" },
  { value: "immediate", label: "Available Now" },
  { value: "one_month", label: "Within 1 Month" },
  { value: "two_three_months", label: "Within 3 Months" },
];

const EXPERIENCE_OPTIONS = [
  { value: "all", label: "All Levels" },
  { value: "junior", label: "Junior (0-2 yrs)" },
  { value: "mid", label: "Mid (3-5 yrs)" },
  { value: "senior", label: "Senior (6+ yrs)" },
];

const WORK_MODE_OPTIONS = [
  { value: "all", label: "All Work Modes" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On-site" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "experience", label: "Experience" },
  { value: "profile_strength", label: "Profile Strength" },
  { value: "recently_active", label: "Recently Active" },
];

const availabilityConfig: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  immediate: {
    label: "Available now",
    color: "text-[var(--success-dark)]",
    bg: "bg-[var(--success-light)]",
    dot: "bg-[var(--success)]",
  },
  one_month: {
    label: "Within 1 month",
    color: "text-[var(--warning-dark)]",
    bg: "bg-[var(--warning-light)]",
    dot: "bg-[var(--warning)]",
  },
  two_three_months: {
    label: "Within 3 months",
    color: "text-[var(--info-dark)]",
    bg: "bg-[var(--info-light)]",
    dot: "bg-[var(--info)]",
  },
  not_available: {
    label: "Not available",
    color: "text-[var(--neutral-gray)]",
    bg: "bg-[var(--surface-2)]",
    dot: "bg-[var(--neutral-gray)]",
  },
  placed: {
    label: "Placed",
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
    dot: "bg-[var(--primary)]",
  },
};

function getExperienceLevel(years: number | null): {
  label: string;
  color: string;
} {
  if (years == null) return { label: "Unknown", color: "text-[var(--neutral-gray)]" };
  if (years <= 2) return { label: "Junior", color: "text-[var(--info)]" };
  if (years <= 5) return { label: "Mid", color: "text-[var(--warning)]" };
  return { label: "Senior", color: "text-[var(--success)]" };
}

function getStrengthColor(strength: number): string {
  if (strength < 40) return "var(--error)";
  if (strength < 70) return "var(--warning)";
  return "var(--success)";
}

const VIEW_KEY = "talent-browse-view";

// ---------------------------------------------------------------------------
// Stagger Animation Variants
// ---------------------------------------------------------------------------

const staggerGrid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardFadeUp = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const cardFadeRight = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const availRingColor: Record<string, string> = {
  immediate: "ring-[var(--success)]",
  one_month: "ring-[var(--warning)]",
  two_three_months: "ring-[var(--info)]",
  not_available: "ring-[var(--surface-3)]",
  placed: "ring-[var(--primary)]",
};

// ---------------------------------------------------------------------------
// Profile Strength Ring (SVG)
// ---------------------------------------------------------------------------

function ProfileStrengthRing({
  value,
  size = 44,
}: {
  value: number;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = getStrengthColor(value);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
        style={{ color }}
      >
        {value}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Chip
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded hover:bg-[var(--primary)]/20 transition-colors"
      >
        <X size={10} />
      </button>
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Add to Shortlist Dropdown
// ---------------------------------------------------------------------------

function AddToShortlistButton({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: shortlists } = useShortlists();
  const addToShortlist = useAddToShortlist();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const shortlistArray = Array.isArray(shortlists) ? shortlists : [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-2 rounded-xl border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--primary)] transition-colors"
        title="Add to shortlist"
      >
        <Bookmark size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-52 bg-[var(--surface-0)] rounded-xl border border-[var(--border)] shadow-lg z-50 p-1"
          >
            {shortlistArray.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-xs text-[var(--neutral-gray)]">
                  No shortlists yet
                </p>
                <Link
                  href="/employer/candidates/shortlists"
                  className="text-xs font-medium text-[var(--primary)] hover:underline mt-1 inline-block"
                >
                  Create one
                </Link>
              </div>
            ) : (
              shortlistArray.map((sl) => (
                <button
                  key={sl.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    addToShortlist.mutate(
                      { shortlistId: sl.id, candidateId },
                      {
                        onSuccess: () => {
                          toast.success(
                            `Added ${candidateName} to "${sl.name}"`
                          );
                          setOpen(false);
                        },
                        onError: (err) => {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Failed to add to shortlist"
                          );
                        },
                      }
                    );
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors text-left"
                >
                  <Star size={12} className="text-[var(--warning)] flex-shrink-0" />
                  <span className="truncate">{sl.name}</span>
                  <span className="ml-auto text-[10px] text-[var(--neutral-gray)]">
                    {sl.candidateCount}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Grid Card
// ---------------------------------------------------------------------------

function CandidateGridCard({
  candidate,
  onRequestIntro,
  onPreview,
}: {
  candidate: CandidateProfile;
  onRequestIntro: () => void;
  onPreview: () => void;
}) {
  const avail =
    availabilityConfig[candidate.availabilityStatus || "not_available"] ||
    availabilityConfig.not_available;
  const skills = candidate.candidateSkills || [];
  const location = [candidate.city, candidate.country]
    .filter(Boolean)
    .join(", ");
  const expLevel = getExperienceLevel(candidate.yearsOfExperience);

  return (
    <motion.div
      layout
      variants={cardFadeUp}
      className="group relative bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-[var(--shadow-premium)] hover:-translate-y-1 transition-all duration-300"
    >
      {/* Top badges */}
      <div className="relative px-6 pt-5 pb-0">
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${avail.bg} ${avail.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
            {avail.label}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            {candidate.photoUrl ? (
              <img
                src={candidate.photoUrl}
                alt={candidate.fullName}
                className={`w-16 h-16 rounded-full object-cover ring-2 ${availRingColor[candidate.availabilityStatus || "not_available"] || "ring-[var(--border)]"}`}
              />
            ) : (
              <div className={`w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center ring-2 ${availRingColor[candidate.availabilityStatus || "not_available"] || "ring-[var(--border)]"}`}>
                <span className="text-xl font-bold text-[var(--primary)]">
                  {getInitials(candidate.fullName)}
                </span>
              </div>
            )}
          </div>
          <h3
            className="text-sm font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--primary)] transition-colors"
            onClick={onPreview}
          >
            {candidate.fullName}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {candidate.primaryTrack?.name || "Developer"}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="px-6 pt-3 pb-4">
        <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)] mb-3">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {location}
            </span>
          )}
          {candidate.yearsOfExperience != null && (
            <span className="flex items-center gap-1">
              <Briefcase size={11} /> {candidate.yearsOfExperience}y
              <span className={`font-medium ${expLevel.color}`}>
                {expLevel.label}
              </span>
            </span>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {skills.slice(0, 4).map((cs) => (
              <span
                key={cs.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary)]/5 text-[var(--primary)] rounded-md text-[11px] font-medium"
              >
                {cs.isVerified && (
                  <CheckCircle2 className="h-2.5 w-2.5 text-[var(--success)]" />
                )}
                {cs.skill?.name || cs.customTagName || ""}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="px-2 py-0.5 rounded-md bg-[var(--surface-1)] text-[11px] font-medium text-[var(--neutral-gray)]">
                +{skills.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Profile strength */}
        <div className="flex items-center justify-center mb-4">
          <ProfileStrengthRing value={candidate.profileStrength} />
        </div>

        {/* Quick actions — fade in on hover (always visible on mobile) */}
        <div className="flex gap-2 pt-3 border-t border-[var(--border)] opacity-100 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-200">
          <button
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Eye size={13} /> View
          </button>
          <button
            onClick={onRequestIntro}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
          >
            <Mail size={13} /> Intro
          </button>
          <AddToShortlistButton
            candidateId={candidate.id}
            candidateName={candidate.fullName}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Candidate List Card
// ---------------------------------------------------------------------------

function CandidateListCard({
  candidate,
  onRequestIntro,
  onPreview,
}: {
  candidate: CandidateProfile;
  onRequestIntro: () => void;
  onPreview: () => void;
}) {
  const avail =
    availabilityConfig[candidate.availabilityStatus || "not_available"] ||
    availabilityConfig.not_available;
  const skills = candidate.candidateSkills || [];
  const location = [candidate.city, candidate.country]
    .filter(Boolean)
    .join(", ");
  const expLevel = getExperienceLevel(candidate.yearsOfExperience);

  return (
    <motion.div
      layout
      variants={cardFadeRight}
      className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-4 hover:shadow-[var(--shadow-md)] transition-all duration-200 flex items-center gap-4"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 cursor-pointer" onClick={onPreview}>
        {candidate.photoUrl ? (
          <img
            src={candidate.photoUrl}
            alt={candidate.fullName}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--primary)]">
              {getInitials(candidate.fullName)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className="text-sm font-semibold text-[var(--text-primary)] truncate cursor-pointer hover:text-[var(--primary)] transition-colors"
            onClick={onPreview}
          >
            {candidate.fullName}
          </h3>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${avail.bg} ${avail.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
            {avail.label}
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {candidate.primaryTrack?.name || "Developer"}
          {location && ` · ${location}`}
          {candidate.yearsOfExperience != null && (
            <>
              {" "}
              · {candidate.yearsOfExperience}y{" "}
              <span className={`font-medium ${expLevel.color}`}>
                {expLevel.label}
              </span>
            </>
          )}
        </p>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {skills.slice(0, 5).map((cs) => (
              <span
                key={cs.id}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--primary)]/5 text-[var(--primary)] rounded text-[10px] font-medium"
              >
                {cs.isVerified && (
                  <CheckCircle2 className="h-2 w-2 text-[var(--success)]" />
                )}
                {cs.skill?.name || cs.customTagName || ""}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[10px] font-medium text-[var(--neutral-gray)]">
                +{skills.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Strength */}
      <div className="flex-shrink-0 hidden sm:block">
        <ProfileStrengthRing value={candidate.profileStrength} size={40} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onPreview}
          className="p-2 rounded-xl border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-2)] hover:text-[var(--primary)] transition-colors"
          title="Quick preview"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={onRequestIntro}
          className="px-3 py-2 rounded-xl text-xs font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Mail size={13} /> Intro
        </button>
        <AddToShortlistButton
          candidateId={candidate.id}
          candidateName={candidate.fullName}
        />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Quick Preview Sheet
// ---------------------------------------------------------------------------

function CandidatePreviewSheet({
  slug,
  open,
  onOpenChange,
  onRequestIntro,
}: {
  slug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestIntro: (candidate: CandidateProfile) => void;
}) {
  const { data: candidate, isLoading } = useTalentBySlug(slug || "");

  // Lock body scroll + Escape key
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring" as const, damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-lg bg-[var(--surface-0)] border-l border-[var(--border)] overflow-y-auto"
            style={{ boxShadow: "var(--shadow-premium)" }}
          >
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors z-10"
            >
              <X size={18} />
            </button>

            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2
                    size={28}
                    className="text-[var(--primary)] animate-spin"
                  />
                </div>
              ) : !candidate ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Users size={40} className="text-[var(--surface-3)] mb-3" />
                  <p className="text-sm text-[var(--neutral-gray)]">
                    Candidate not found
                  </p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-4 pb-4">
                    {candidate.photoUrl ? (
                      <img
                        src={candidate.photoUrl}
                        alt={candidate.fullName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-[var(--primary)]">
                          {getInitials(candidate.fullName)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                        {candidate.fullName}
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {candidate.primaryTrack?.name || "Developer"}
                      </p>
                      {candidate.availabilityStatus && (
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            availabilityConfig[candidate.availabilityStatus]
                              ?.bg || ""
                          } ${
                            availabilityConfig[candidate.availabilityStatus]
                              ?.color || ""
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              availabilityConfig[candidate.availabilityStatus]
                                ?.dot || ""
                            }`}
                          />
                          {
                            availabilityConfig[candidate.availabilityStatus]
                              ?.label
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5 pb-6">
                    {/* Profile Strength */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                      <ProfileStrengthRing
                        value={candidate.profileStrength}
                        size={48}
                      />
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">
                          Profile Strength
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {candidate.profileViews} views ·{" "}
                          {candidate.introRequestsReceived} intro requests
                        </p>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {candidate.city && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <MapPin
                            size={13}
                            className="text-[var(--neutral-gray)]"
                          />
                          {[candidate.city, candidate.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                      {candidate.yearsOfExperience != null && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <Briefcase
                            size={13}
                            className="text-[var(--neutral-gray)]"
                          />
                          {candidate.yearsOfExperience} years experience
                        </div>
                      )}
                      {candidate.preferredWorkMode && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          {candidate.preferredWorkMode === "remote" ? (
                            <Globe
                              size={13}
                              className="text-[var(--neutral-gray)]"
                            />
                          ) : candidate.preferredWorkMode === "hybrid" ? (
                            <Monitor
                              size={13}
                              className="text-[var(--neutral-gray)]"
                            />
                          ) : (
                            <Building2
                              size={13}
                              className="text-[var(--neutral-gray)]"
                            />
                          )}
                          {candidate.preferredWorkMode.replace("_", "-")}
                        </div>
                      )}
                      {candidate.timezone && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <Clock
                            size={13}
                            className="text-[var(--neutral-gray)]"
                          />
                          {candidate.timezone}
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    {candidate.bio && (
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                          About
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {candidate.bio}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    {candidate.candidateSkills &&
                      candidate.candidateSkills.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                            Skills
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.candidateSkills.map((cs) => (
                              <span
                                key={cs.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/5 text-[var(--primary)] rounded-lg text-[11px] font-medium"
                              >
                                {cs.isVerified && (
                                  <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                                )}
                                {cs.skill?.name || cs.customTagName || ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Projects */}
                    {candidate.candidateProjects &&
                      candidate.candidateProjects.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                            Projects
                          </h4>
                          <div className="space-y-2">
                            {candidate.candidateProjects.map((proj) => (
                              <div
                                key={proj.id}
                                className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]"
                              >
                                <p className="text-xs font-medium text-[var(--text-primary)]">
                                  {proj.title}
                                </p>
                                {proj.description && (
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                                    {proj.description}
                                  </p>
                                )}
                                {proj.techStack && proj.techStack.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {proj.techStack.map((t) => (
                                      <span
                                        key={t}
                                        className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] text-[var(--text-muted)]"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Links */}
                    {(candidate.githubUrl ||
                      candidate.linkedinUrl ||
                      candidate.portfolioUrl) && (
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                          Links
                        </h4>
                        <div className="flex gap-2">
                          {candidate.githubUrl && (
                            <a
                              href={candidate.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <Github size={16} />
                            </a>
                          )}
                          {candidate.linkedinUrl && (
                            <a
                              href={candidate.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <Linkedin size={16} />
                            </a>
                          )}
                          {candidate.portfolioUrl && (
                            <a
                              href={candidate.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <Link2 size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => onRequestIntro(candidate)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                      >
                        <Mail size={15} /> Request Intro
                      </button>
                      <Link
                        href={`/talents/${candidate.slug}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        View Full Profile <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Cards
// ---------------------------------------------------------------------------

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6 space-y-4 animate-pulse"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)]" />
            <div className="h-4 w-24 bg-[var(--surface-2)] rounded mt-3" />
            <div className="h-3 w-16 bg-[var(--surface-2)] rounded mt-2" />
          </div>
          <div className="flex justify-center gap-2">
            <div className="h-5 w-14 bg-[var(--surface-2)] rounded" />
            <div className="h-5 w-14 bg-[var(--surface-2)] rounded" />
          </div>
          <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] mx-auto" />
          <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
            <div className="h-8 flex-1 bg-[var(--surface-2)] rounded-xl" />
            <div className="h-8 flex-1 bg-[var(--surface-2)] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4 animate-pulse"
        >
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-[var(--surface-2)] rounded" />
            <div className="h-3 w-48 bg-[var(--surface-2)] rounded" />
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-[var(--surface-2)] rounded-xl" />
            <div className="w-20 h-8 bg-[var(--surface-2)] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function CandidateSearchPage() {
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [workModeFilter, setWorkModeFilter] = useState("all");
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [introCandidate, setIntroCandidate] = useState<CandidateProfile | null>(
    null
  );
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [skillSearch, setSkillSearch] = useState("");

  const createIntroRequest = useCreateIntroRequest();

  // Restore view preference
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_KEY);
    if (stored === "list" || stored === "grid") setViewMode(stored);
  }, []);

  const toggleView = useCallback((mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem(VIEW_KEY, mode);
  }, []);

  // Taxonomy data for filters
  const { data: tracks } = useTracks();
  const { data: allSkills } = useSkills();

  const trackArray = Array.isArray(tracks) ? tracks : [];
  const skillArray = Array.isArray(allSkills) ? allSkills : [];

  // Build API filters
  const apiFilters = useMemo(() => {
    const filters: Record<string, any> = { page, limit: 24 };
    if (search) filters.search = search;
    if (availabilityFilter !== "all")
      filters.availability = availabilityFilter;
    if (trackFilter !== "all") filters.trackId = trackFilter;
    if (workModeFilter !== "all") filters.workMode = workModeFilter;
    if (experienceFilter !== "all") filters.experienceLevel = experienceFilter;
    if (skillFilters.length > 0) filters.skills = skillFilters.join(",");
    if (sortBy !== "relevance") filters.sort = sortBy;
    return filters;
  }, [
    search,
    availabilityFilter,
    trackFilter,
    experienceFilter,
    workModeFilter,
    skillFilters,
    sortBy,
    page,
  ]);

  const { data, isLoading, error, refetch } = useTalents(apiFilters);
  const candidates: CandidateProfile[] = data?.data || [];
  const meta = (data as any)?.meta;
  const totalCount = meta?.total ?? candidates.length;

  // Active filters for pills
  const activeFilters = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = [];
    if (availabilityFilter !== "all") {
      const opt = AVAILABILITY_OPTIONS.find(
        (o) => o.value === availabilityFilter
      );
      pills.push({
        key: "avail",
        label: opt?.label || availabilityFilter,
        onRemove: () => setAvailabilityFilter("all"),
      });
    }
    if (trackFilter !== "all") {
      const track = trackArray.find((t) => t.id === trackFilter);
      pills.push({
        key: "track",
        label: track?.name || "Track",
        onRemove: () => setTrackFilter("all"),
      });
    }
    if (experienceFilter !== "all") {
      const opt = EXPERIENCE_OPTIONS.find(
        (o) => o.value === experienceFilter
      );
      pills.push({
        key: "exp",
        label: opt?.label || experienceFilter,
        onRemove: () => setExperienceFilter("all"),
      });
    }
    if (workModeFilter !== "all") {
      const opt = WORK_MODE_OPTIONS.find(
        (o) => o.value === workModeFilter
      );
      pills.push({
        key: "wm",
        label: opt?.label || workModeFilter,
        onRemove: () => setWorkModeFilter("all"),
      });
    }
    skillFilters.forEach((skillId) => {
      const skill = skillArray.find((s) => s.id === skillId);
      pills.push({
        key: `skill-${skillId}`,
        label: skill?.name || skillId,
        onRemove: () =>
          setSkillFilters((prev) => prev.filter((s) => s !== skillId)),
      });
    });
    return pills;
  }, [
    availabilityFilter,
    trackFilter,
    experienceFilter,
    workModeFilter,
    skillFilters,
    trackArray,
    skillArray,
  ]);

  const clearAllFilters = useCallback(() => {
    setAvailabilityFilter("all");
    setTrackFilter("all");
    setExperienceFilter("all");
    setWorkModeFilter("all");
    setSkillFilters([]);
    setSearch("");
    setPage(1);
  }, []);

  const filteredSkillOptions = useMemo(() => {
    if (!skillSearch) return skillArray.slice(0, 20);
    return skillArray
      .filter((s) =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase())
      )
      .slice(0, 20);
  }, [skillArray, skillSearch]);

  const selectClass =
    "appearance-none pl-3 pr-8 py-2 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors bg-[var(--surface-0)] text-[var(--text-primary)]";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Discover Talent
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Browse and connect with verified tech talent
            {!isLoading && !error && totalCount > 0 && (
              <span className="ml-1 text-[var(--text-muted)]">
                — {totalCount} candidates
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => toggleView("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => toggleView("list")}
              className={`p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
          <Link
            href="/employer/candidates/shortlists"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
          >
            <BookmarkCheck size={14} /> Shortlists
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, skills, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors bg-[var(--surface-0)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
              showFilters || activeFilters.length > 0
                ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Expanded filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl border border-[var(--glass-border)] space-y-3 backdrop-blur-xl" style={{ background: "var(--glass-bg)", boxShadow: "var(--glass-shadow)" }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Availability */}
                  <div className="relative">
                    <select
                      value={availabilityFilter}
                      onChange={(e) => {
                        setAvailabilityFilter(e.target.value);
                        setPage(1);
                      }}
                      className={selectClass + " w-full"}
                    >
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                    />
                  </div>

                  {/* Track */}
                  <div className="relative">
                    <select
                      value={trackFilter}
                      onChange={(e) => {
                        setTrackFilter(e.target.value);
                        setPage(1);
                      }}
                      className={selectClass + " w-full"}
                    >
                      <option value="all">All Tracks</option>
                      {trackArray.map((track) => (
                        <option key={track.id} value={track.id}>
                          {track.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                    />
                  </div>

                  {/* Experience */}
                  <div className="relative">
                    <select
                      value={experienceFilter}
                      onChange={(e) => {
                        setExperienceFilter(e.target.value);
                        setPage(1);
                      }}
                      className={selectClass + " w-full"}
                    >
                      {EXPERIENCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                    />
                  </div>

                  {/* Work Mode */}
                  <div className="relative">
                    <select
                      value={workModeFilter}
                      onChange={(e) => {
                        setWorkModeFilter(e.target.value);
                        setPage(1);
                      }}
                      className={selectClass + " w-full"}
                    >
                      {WORK_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                    />
                  </div>
                </div>

                {/* Skills multi-select */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Skills
                  </label>
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)]"
                    />
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Search skills..."
                      className="w-full pl-8 pr-3 py-2 border border-[var(--border)] rounded-lg text-xs bg-[var(--surface-0)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
                    {filteredSkillOptions.map((skill) => {
                      const isSelected = skillFilters.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          onClick={() => {
                            setSkillFilters((prev) =>
                              isSelected
                                ? prev.filter((s) => s !== skill.id)
                                : [...prev, skill.id]
                            );
                            setPage(1);
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            isSelected
                              ? "bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/30"
                              : "bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                          }`}
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter pills */}
        <AnimatePresence>
          {activeFilters.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-2"
            >
              {activeFilters.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  onRemove={f.onRemove}
                />
              ))}
              <button
                onClick={clearAllFilters}
                className="text-xs text-[var(--error)] hover:underline font-medium"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results header */}
      {!isLoading && !error && candidates.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            Showing{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {totalCount}
            </span>{" "}
            candidates
          </p>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={selectClass}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
            />
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        viewMode === "grid" ? (
          <GridSkeleton />
        ) : (
          <ListSkeleton />
        )
      ) : error ? (
        <div className="p-12 text-center bg-[var(--surface-0)] rounded-2xl border border-[var(--border)]">
          <Users size={48} className="mx-auto text-[var(--surface-3)] mb-4" />
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">
            Failed to load candidates
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
          <Users size={48} className="mx-auto text-[var(--surface-3)] mb-4" />
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">
            No candidates found
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Try adjusting your search or filters.
          </p>
          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          variants={staggerGrid}
          initial="hidden"
          animate="visible"
          key={`grid-${page}-${sortBy}-${availabilityFilter}-${trackFilter}`}
        >
          {candidates.map((candidate) => (
            <CandidateGridCard
              key={candidate.id}
              candidate={candidate}
              onRequestIntro={() => setIntroCandidate(candidate)}
              onPreview={() => setPreviewSlug(candidate.slug)}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="space-y-3"
          variants={staggerGrid}
          initial="hidden"
          animate="visible"
          key={`list-${page}-${sortBy}-${availabilityFilter}-${trackFilter}`}
        >
          {candidates.map((candidate) => (
            <CandidateListCard
              key={candidate.id}
              candidate={candidate}
              onRequestIntro={() => setIntroCandidate(candidate)}
              onPreview={() => setPreviewSlug(candidate.slug)}
            />
          ))}
        </motion.div>
      )}

      {/* Pagination — Load More */}
      {meta && meta.totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 pt-6">
          {/* Progress indicator */}
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <span>
              Showing <span className="font-semibold text-[var(--text-primary)]">{Math.min(page * (meta.limit || 24), totalCount)}</span> of{" "}
              <span className="font-semibold text-[var(--text-primary)]">{totalCount}</span>
            </span>
          </div>
          <div className="w-48 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--gradient-accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((page / meta.totalPages) * 100, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          {/* Navigation */}
          <div className="flex items-center gap-2">
            {page > 1 && (
              <button
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                Previous
              </button>
            )}
            {page < meta.totalPages && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--gradient-accent)" }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Loading...
                  </span>
                ) : (
                  `Load More Candidates`
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Candidate Preview Sheet */}
      <CandidatePreviewSheet
        slug={previewSlug}
        open={!!previewSlug}
        onOpenChange={(open) => {
          if (!open) setPreviewSlug(null);
        }}
        onRequestIntro={(candidate) => {
          setPreviewSlug(null);
          setIntroCandidate(candidate);
        }}
      />

      {/* Intro Request Modal */}
      {introCandidate && (
        <RequestIntroModal
          candidate={introCandidate}
          isOpen={!!introCandidate}
          onClose={() => setIntroCandidate(null)}
          onSubmit={async (data: IntroRequestData) => {
            await createIntroRequest.mutateAsync({
              candidateId: introCandidate.id,
              jobId: data.jobId || undefined,
              roleTitle: data.roleTitle,
              roleDescription: data.roleDescription,
              desiredStartDate: data.desiredStartDate || undefined,
              workMode: data.workMode || undefined,
              locationExpectation: data.locationExpectation || undefined,
              notesToPlacementUnit: data.notesToPlacementUnit || undefined,
            });
            setIntroCandidate(null);
          }}
        />
      )}
    </div>
  );
}

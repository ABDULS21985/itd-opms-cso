"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  MapPin,
  Clock,
  Briefcase,
  Users,
  Eye,
  DollarSign,
  Monitor,
  Calendar,
  CheckCircle2,
  XCircle,
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  Copy,
  Trash2,
  Globe,
  Share2,
  Building2,
  X,
  Loader2,
  Send,
  GitCompare,
  Download,
  MoreHorizontal,
  CalendarPlus,
  KanbanSquare,
  CheckCheck,
  Check,
  type LucideIcon,
} from "lucide-react";
import {
  useEmployerJob,
  useJobApplications,
  useCloseJob,
  usePublishJob,
} from "@/hooks/use-jobs";
import { useMyEmployerOrg } from "@/hooks/use-employers";
import { apiClient } from "@/lib/api-client";
import { JobStatus, ApplicationStatus } from "@/types/job";
import type { JobApplication } from "@/types/job";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  cn,
  formatDate,
  formatRelativeTime,
  formatSalary,
  getInitials,
} from "@/lib/utils";
import { toast } from "sonner";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const JOB_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  [JobStatus.DRAFT]: {
    label: "Draft",
    bg: "bg-[var(--surface-2)]",
    text: "text-[var(--neutral-gray)]",
    dot: "bg-[var(--neutral-gray)]",
  },
  [JobStatus.PENDING_REVIEW]: {
    label: "Pending Review",
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-dark)]",
    dot: "bg-[var(--warning)]",
  },
  [JobStatus.PUBLISHED]: {
    label: "Published",
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-dark)]",
    dot: "bg-[var(--success)]",
  },
  [JobStatus.CLOSED]: {
    label: "Closed",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error)]",
  },
  [JobStatus.ARCHIVED]: {
    label: "Archived",
    bg: "bg-[var(--surface-2)]",
    text: "text-[var(--neutral-gray)]",
    dot: "bg-[var(--neutral-gray)]",
  },
  [JobStatus.REJECTED]: {
    label: "Rejected",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
    dot: "bg-[var(--error)]",
  },
};

const APP_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  [ApplicationStatus.SUBMITTED]: {
    label: "New",
    bg: "bg-[var(--info-light)]",
    text: "text-[var(--info-dark)]",
  },
  [ApplicationStatus.VIEWED]: {
    label: "Viewed",
    bg: "bg-[var(--surface-2)]",
    text: "text-[var(--neutral-gray)]",
  },
  [ApplicationStatus.SHORTLISTED]: {
    label: "Shortlisted",
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-dark)]",
  },
  [ApplicationStatus.INTERVIEW]: {
    label: "Interview",
    bg: "bg-[#1B7340]/10",
    text: "text-[#1B7340]",
  },
  [ApplicationStatus.OFFER]: {
    label: "Offer",
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-dark)]",
  },
  [ApplicationStatus.REJECTED]: {
    label: "Rejected",
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error-dark)]",
  },
  [ApplicationStatus.WITHDRAWN]: {
    label: "Withdrawn",
    bg: "bg-[var(--surface-2)]",
    text: "text-[var(--neutral-gray)]",
  },
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: ApplicationStatus.SUBMITTED, label: "New" },
  { key: ApplicationStatus.SHORTLISTED, label: "Shortlisted" },
  { key: ApplicationStatus.INTERVIEW, label: "In Interview" },
  { key: ApplicationStatus.REJECTED, label: "Rejected" },
] as const;

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "experience", label: "Experience" },
] as const;

type TabId = "details" | "applications";
type SortKey = (typeof SORT_OPTIONS)[number]["key"];

/* ================================================================== */
/*  Animation Variants                                                 */
/* ================================================================== */

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function getDeadlineInfo(deadline: string | null): {
  label: string;
  isExpired: boolean;
  daysLeft: number;
} {
  if (!deadline) return { label: "", isExpired: false, daysLeft: -1 };
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Expired", isExpired: true, daysLeft };
  if (daysLeft === 0) return { label: "Closes today", isExpired: false, daysLeft: 0 };
  if (daysLeft === 1) return { label: "1 day remaining", isExpired: false, daysLeft: 1 };
  return { label: `${daysLeft} days remaining`, isExpired: false, daysLeft };
}

function getTimelineSteps(app: JobApplication) {
  const steps: { label: string; date: string | null; active: boolean }[] = [
    { label: "Applied", date: app.createdAt, active: true },
    {
      label: "Reviewed",
      date: app.viewedAt,
      active: !!app.viewedAt || app.status !== ApplicationStatus.SUBMITTED,
    },
  ];

  if (
    app.status === ApplicationStatus.SHORTLISTED ||
    app.status === ApplicationStatus.INTERVIEW ||
    app.status === ApplicationStatus.OFFER
  ) {
    steps.push({ label: "Shortlisted", date: app.shortlistedAt, active: true });
  }

  if (
    app.status === ApplicationStatus.INTERVIEW ||
    app.status === ApplicationStatus.OFFER
  ) {
    steps.push({ label: "Interview", date: null, active: true });
  }

  if (app.status === ApplicationStatus.OFFER) {
    steps.push({ label: "Offer", date: null, active: true });
  }

  if (app.status === ApplicationStatus.REJECTED) {
    steps.push({ label: "Rejected", date: null, active: true });
  }

  return steps;
}

/* ================================================================== */
/*  Sub-Components                                                     */
/* ================================================================== */

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <motion.div
      variants={fadeIn}
      className="bg-[var(--surface-0)]/80 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4 lg:p-5"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            accent,
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--neutral-gray)] truncate">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Reject Reason Modal ─── */

function RejectReasonModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-xl p-6"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-[var(--neutral-gray)] hover:bg-[var(--surface-1)]"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-xl bg-[var(--error-light)] flex items-center justify-center mb-4">
          <XCircle size={24} className="text-[var(--error)]" />
        </div>

        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Reject Application
        </h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">
          Optionally provide a reason for rejection.
        </p>

        <textarea
          ref={inputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Not enough experience with required tech stack..."
          rows={3}
          className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--error)]/20 focus:border-[var(--error)] bg-[var(--surface-0)] text-[var(--text-primary)] resize-none"
        />

        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--error)] text-white hover:bg-[var(--error-dark)] disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Reject
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Application Timeline ─── */

function ApplicationTimeline({ application }: { application: JobApplication }) {
  const steps = getTimelineSteps(application);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                step.active
                  ? step.label === "Rejected"
                    ? "bg-[var(--error)]"
                    : "bg-[var(--success)]"
                  : "bg-[var(--surface-3)]",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                step.active
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--neutral-gray)]",
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "w-4 h-px",
                step.active ? "bg-[var(--success)]" : "bg-[var(--surface-3)]",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Application Card ─── */

function ApplicationCard({
  application,
  selected,
  onToggleSelect,
  onShortlist,
  onReject,
  expanded,
  onToggleExpand,
}: {
  application: JobApplication;
  jobId: string;
  selected: boolean;
  onToggleSelect: () => void;
  onShortlist: () => void;
  onReject: () => void;
  onRefetch: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const candidate = application.candidate;
  const statusCfg =
    APP_STATUS_CONFIG[application.status] || APP_STATUS_CONFIG.submitted;
  const initials = getInitials(candidate?.fullName || "?");
  const canAct =
    application.status === ApplicationStatus.SUBMITTED ||
    application.status === ApplicationStatus.VIEWED;

  return (
    <motion.div
      layout
      variants={fadeIn}
      className={cn(
        "bg-[var(--surface-0)] border rounded-2xl transition-colors",
        selected
          ? "border-[#C4A35A] ring-1 ring-[#C4A35A]/20"
          : "border-[var(--border)]",
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 p-4 lg:p-5 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
            selected
              ? "bg-[#C4A35A] border-[#C4A35A] text-white"
              : "border-[var(--border)] hover:border-[#C4A35A]/50",
          )}
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden">
          {candidate?.photoUrl ? (
            <Image
              src={candidate.photoUrl}
              alt={candidate.fullName || ""}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#1B7340]/10 flex items-center justify-center">
              <span className="text-sm font-bold text-[#1B7340]">{initials}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {candidate?.fullName || "Unknown Candidate"}
            </p>
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold",
                statusCfg.bg,
                statusCfg.text,
              )}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {candidate?.contactEmail && (
              <span className="text-xs text-[var(--neutral-gray)] truncate">
                {candidate.contactEmail}
              </span>
            )}
            {candidate?.yearsOfExperience != null && (
              <span className="text-xs text-[var(--neutral-gray)]">
                {candidate.yearsOfExperience}y exp
              </span>
            )}
          </div>
        </div>

        {/* Skills preview */}
        <div className="hidden md:flex items-center gap-1.5">
          {(candidate?.primaryStacks || []).slice(0, 3).map((stack) => (
            <span
              key={stack}
              className="px-2 py-0.5 rounded-md bg-[var(--surface-1)] text-[10px] font-medium text-[var(--neutral-gray)]"
            >
              {stack}
            </span>
          ))}
        </div>

        {/* Applied date */}
        <span className="hidden sm:block text-xs text-[var(--neutral-gray)] whitespace-nowrap">
          {formatRelativeTime(application.createdAt)}
        </span>

        {/* Quick actions */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {canAct && (
            <>
              <button
                onClick={onShortlist}
                className="p-1.5 rounded-lg hover:bg-[var(--success-light)] text-[var(--neutral-gray)] hover:text-[var(--success)] transition-colors"
                title="Shortlist"
              >
                <Star size={16} />
              </button>
              <button
                onClick={onReject}
                className="p-1.5 rounded-lg hover:bg-[var(--error-light)] text-[var(--neutral-gray)] hover:text-[var(--error)] transition-colors"
                title="Reject"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
          {application.status === ApplicationStatus.SHORTLISTED && (
            <div className="p-1.5 text-[var(--success)]">
              <Star size={16} fill="currentColor" />
            </div>
          )}
          {candidate?.slug && (
            <Link
              href={`/talents/${candidate.slug}`}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] hover:text-[#1B7340] transition-colors"
              title="View Profile"
            >
              <ExternalLink size={16} />
            </Link>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 lg:px-5 pb-4 lg:pb-5 border-t border-[var(--border)] pt-4 space-y-4">
              {/* Timeline */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-2">
                  Application Timeline
                </p>
                <ApplicationTimeline application={application} />
              </div>

              {/* Cover note */}
              {application.coverNote && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-1.5">
                    Cover Note
                  </p>
                  <div className="px-4 py-3 bg-[var(--surface-1)] rounded-xl text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {application.coverNote}
                  </div>
                </div>
              )}

              {/* Skills */}
              {candidate?.primaryStacks && candidate.primaryStacks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-1.5">
                    Skills & Stacks
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.primaryStacks.map((stack) => (
                      <span
                        key={stack}
                        className="px-2.5 py-1 rounded-lg bg-[#C4A35A]/10 text-[#C4A35A] text-xs font-medium"
                      >
                        {stack}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidate details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {candidate?.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-[var(--neutral-gray)]" />
                    <span className="text-xs text-[var(--text-primary)]">
                      {candidate.city}
                      {candidate.country ? `, ${candidate.country}` : ""}
                    </span>
                  </div>
                )}
                {candidate?.yearsOfExperience != null && (
                  <div className="flex items-center gap-2">
                    <Briefcase size={13} className="text-[var(--neutral-gray)]" />
                    <span className="text-xs text-[var(--text-primary)]">
                      {candidate.yearsOfExperience} years exp
                    </span>
                  </div>
                )}
                {candidate?.preferredWorkMode && (
                  <div className="flex items-center gap-2">
                    <Monitor size={13} className="text-[var(--neutral-gray)]" />
                    <span className="text-xs text-[var(--text-primary)] capitalize">
                      {candidate.preferredWorkMode.replace("_", " ")}
                    </span>
                  </div>
                )}
                {candidate?.availabilityStatus && (
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-[var(--neutral-gray)]" />
                    <span className="text-xs text-[var(--text-primary)] capitalize">
                      {candidate.availabilityStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Rejection reason */}
              {application.rejectionReason && (
                <div className="px-4 py-3 bg-[var(--error-light)] rounded-xl">
                  <p className="text-xs font-semibold text-[var(--error-dark)] mb-0.5">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-[var(--error-dark)]">
                    {application.rejectionReason}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {candidate?.slug && (
                  <Link
                    href={`/talents/${candidate.slug}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <Eye size={13} /> View Full Profile
                  </Link>
                )}
                {canAct && (
                  <Link
                    href={`/employer/interviews?candidate=${encodeURIComponent(candidate?.fullName || "")}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[#1B7340] hover:bg-[#1B7340]/5 transition-colors"
                  >
                    <CalendarPlus size={13} /> Schedule Interview
                  </Link>
                )}
                <Link
                  href="/employer/pipeline"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  <KanbanSquare size={13} /> Add to Pipeline
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Comparison Panel ─── */

function ComparisonPanel({
  open,
  onClose,
  applications,
}: {
  open: boolean;
  onClose: () => void;
  applications: JobApplication[];
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const allStacks = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((app) => {
      (app.candidate?.primaryStacks || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [applications]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-4 bottom-0 top-16 sm:inset-x-8 sm:top-20 z-50 bg-[var(--surface-0)] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <GitCompare size={18} className="text-[#C4A35A]" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Compare Candidates ({applications.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comparison grid */}
            <div className="flex-1 overflow-auto">
              <div className="min-w-[600px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider w-[160px] sticky left-0 bg-[var(--surface-0)]">
                        Attribute
                      </th>
                      {applications.map((app) => (
                        <th key={app.id} className="text-left px-6 py-3 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                              {app.candidate?.photoUrl ? (
                                <Image
                                  src={app.candidate.photoUrl}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#1B7340]/10 flex items-center justify-center">
                                  <span className="text-xs font-bold text-[#1B7340]">
                                    {getInitials(app.candidate?.fullName || "?")}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {app.candidate?.fullName || "Unknown"}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {/* Experience */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-medium text-[var(--neutral-gray)] sticky left-0 bg-[var(--surface-0)]">
                        Experience
                      </td>
                      {applications.map((app) => {
                        const yrs = app.candidate?.yearsOfExperience;
                        const maxYrs = Math.max(
                          ...applications.map(
                            (a) => a.candidate?.yearsOfExperience || 0,
                          ),
                        );
                        return (
                          <td key={app.id} className="px-6 py-3">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                yrs === maxYrs
                                  ? "text-[var(--success-dark)]"
                                  : "text-[var(--text-primary)]",
                              )}
                            >
                              {yrs != null ? `${yrs} years` : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    {/* Location */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-medium text-[var(--neutral-gray)] sticky left-0 bg-[var(--surface-0)]">
                        Location
                      </td>
                      {applications.map((app) => (
                        <td
                          key={app.id}
                          className="px-6 py-3 text-sm text-[var(--text-primary)]"
                        >
                          {app.candidate?.city || "—"}
                          {app.candidate?.country
                            ? `, ${app.candidate.country}`
                            : ""}
                        </td>
                      ))}
                    </tr>
                    {/* Availability */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-medium text-[var(--neutral-gray)] sticky left-0 bg-[var(--surface-0)]">
                        Availability
                      </td>
                      {applications.map((app) => (
                        <td
                          key={app.id}
                          className="px-6 py-3 text-sm text-[var(--text-primary)] capitalize"
                        >
                          {app.candidate?.availabilityStatus?.replace(/_/g, " ") ||
                            "—"}
                        </td>
                      ))}
                    </tr>
                    {/* Work Mode */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-medium text-[var(--neutral-gray)] sticky left-0 bg-[var(--surface-0)]">
                        Work Mode
                      </td>
                      {applications.map((app) => (
                        <td
                          key={app.id}
                          className="px-6 py-3 text-sm text-[var(--text-primary)] capitalize"
                        >
                          {app.candidate?.preferredWorkMode?.replace("_", " ") ||
                            "—"}
                        </td>
                      ))}
                    </tr>
                    {/* Applied date */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-medium text-[var(--neutral-gray)] sticky left-0 bg-[var(--surface-0)]">
                        Applied
                      </td>
                      {applications.map((app) => (
                        <td
                          key={app.id}
                          className="px-6 py-3 text-sm text-[var(--text-primary)]"
                        >
                          {formatDate(app.createdAt)}
                        </td>
                      ))}
                    </tr>
                    {/* Status */}
                    <tr>
                      <td className="px-6 py-3 text-xs font-medium text-[var(--neutral-gray)] sticky left-0 bg-[var(--surface-0)]">
                        Status
                      </td>
                      {applications.map((app) => {
                        const cfg =
                          APP_STATUS_CONFIG[app.status] ||
                          APP_STATUS_CONFIG.submitted;
                        return (
                          <td key={app.id} className="px-6 py-3">
                            <span
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold",
                                cfg.bg,
                                cfg.text,
                              )}
                            >
                              {cfg.label}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    {/* Skills comparison */}
                    {allStacks.map((stack) => (
                      <tr key={stack}>
                        <td className="px-6 py-2.5 text-xs font-medium text-[var(--neutral-gray)] sticky left-0 bg-[var(--surface-0)]">
                          {stack}
                        </td>
                        {applications.map((app) => {
                          const has = (
                            app.candidate?.primaryStacks || []
                          ).includes(stack);
                          return (
                            <td key={app.id} className="px-6 py-2.5">
                              {has ? (
                                <CheckCircle2
                                  size={16}
                                  className="text-[var(--success)]"
                                />
                              ) : (
                                <XCircle
                                  size={16}
                                  className="text-[var(--surface-3)]"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-8 w-72 bg-[var(--surface-2)] rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      <div className="h-12 bg-[var(--surface-2)] rounded-xl animate-pulse" />
      <div className="h-96 bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl animate-pulse" />
    </div>
  );
}

/* ================================================================== */
/*  Main Page Component                                                */
/* ================================================================== */

export default function EmployerJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  /* ─── State ─── */
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [bulkRejectLoading, setBulkRejectLoading] = useState(false);
  const [bulkShortlistLoading, setBulkShortlistLoading] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  /* ─── Data ─── */
  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
    refetch: refetchJob,
  } = useEmployerJob(jobId);
  const {
    data: applicationsData,
    isLoading: appsLoading,
    refetch: refetchApps,
  } = useJobApplications(jobId);
  const { data: org } = useMyEmployerOrg();
  const closeJob = useCloseJob();
  const publishJob = usePublishJob();

  const applications: JobApplication[] = useMemo(
    () => (applicationsData as any)?.data || [],
    [applicationsData],
  );

  /* ─── Derived data ─── */
  const appCounts = useMemo(
    () => ({
      total: applications.length,
      new: applications.filter(
        (a) =>
          a.status === ApplicationStatus.SUBMITTED ||
          a.status === ApplicationStatus.VIEWED,
      ).length,
      shortlisted: applications.filter(
        (a) => a.status === ApplicationStatus.SHORTLISTED,
      ).length,
      rejected: applications.filter(
        (a) => a.status === ApplicationStatus.REJECTED,
      ).length,
      interview: applications.filter(
        (a) => a.status === ApplicationStatus.INTERVIEW,
      ).length,
    }),
    [applications],
  );

  const filteredApplications = useMemo(() => {
    let filtered =
      appStatusFilter === "all"
        ? applications
        : applications.filter((a) => a.status === appStatusFilter);

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "newest")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sortBy === "oldest")
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (sortBy === "experience")
        return (
          (b.candidate?.yearsOfExperience || 0) -
          (a.candidate?.yearsOfExperience || 0)
        );
      return 0;
    });

    return filtered;
  }, [applications, appStatusFilter, sortBy]);

  const selectedApplications = useMemo(
    () => applications.filter((a) => selectedApps.has(a.id)),
    [applications, selectedApps],
  );

  /* ─── Close action menu on outside click ─── */
  useEffect(() => {
    if (!actionMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      )
        setActionMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionMenuOpen]);

  /* ─── Actions ─── */
  const handleShortlist = useCallback(
    async (applicationId: string) => {
      try {
        await apiClient.put(
          `/employers/me/jobs/${jobId}/applications/${applicationId}`,
          { status: ApplicationStatus.SHORTLISTED },
        );
        refetchApps();
        toast.success("Candidate shortlisted!");
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to shortlist candidate.",
        );
      }
    },
    [jobId, refetchApps],
  );

  const handleReject = useCallback(
    async (applicationId: string, reason: string) => {
      try {
        await apiClient.put(
          `/employers/me/jobs/${jobId}/applications/${applicationId}`,
          {
            status: ApplicationStatus.REJECTED,
            rejectionReason: reason || null,
          },
        );
        refetchApps();
        setRejectTarget(null);
        toast.success("Application rejected.");
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to reject application.",
        );
      }
    },
    [jobId, refetchApps],
  );

  const handleBulkShortlist = useCallback(async () => {
    setBulkShortlistLoading(true);
    try {
      await Promise.all(
        Array.from(selectedApps).map((id) =>
          apiClient.put(`/employers/me/jobs/${jobId}/applications/${id}`, {
            status: ApplicationStatus.SHORTLISTED,
          }),
        ),
      );
      setSelectedApps(new Set());
      refetchApps();
      toast.success(`${selectedApps.size} candidates shortlisted!`);
    } catch {
      toast.error("Some operations failed.");
    } finally {
      setBulkShortlistLoading(false);
    }
  }, [selectedApps, jobId, refetchApps]);

  const handleBulkReject = useCallback(async () => {
    setBulkRejectLoading(true);
    try {
      await Promise.all(
        Array.from(selectedApps).map((id) =>
          apiClient.put(`/employers/me/jobs/${jobId}/applications/${id}`, {
            status: ApplicationStatus.REJECTED,
          }),
        ),
      );
      setSelectedApps(new Set());
      refetchApps();
      toast.success(`${selectedApps.size} applications rejected.`);
    } catch {
      toast.error("Some operations failed.");
    } finally {
      setBulkRejectLoading(false);
    }
  }, [selectedApps, jobId, refetchApps]);

  const handleExportCSV = useCallback(() => {
    const rows = [
      ["Name", "Email", "Status", "Applied", "Experience", "Location"],
      ...filteredApplications.map((a) => [
        a.candidate?.fullName || "",
        a.candidate?.contactEmail || "",
        a.status,
        new Date(a.createdAt).toLocaleDateString(),
        a.candidate?.yearsOfExperience?.toString() || "",
        [a.candidate?.city, a.candidate?.country].filter(Boolean).join(", "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applications-${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  }, [filteredApplications, jobId]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(
      `${window.location.origin}/jobs/${job?.slug || jobId}`,
    );
    toast.success("Job link copied to clipboard!");
  }, [job, jobId]);

  const handleCloseJob = useCallback(async () => {
    try {
      await closeJob.mutateAsync(jobId);
      setCloseConfirmOpen(false);
      toast.success("Job closed.");
      refetchJob();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to close job.",
      );
    }
  }, [closeJob, jobId, refetchJob]);

  const handlePublishJob = useCallback(async () => {
    try {
      await publishJob.mutateAsync(jobId);
      toast.success("Job published for review!");
      refetchJob();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish job.",
      );
    }
  }, [publishJob, jobId, refetchJob]);

  const handleDeleteJob = useCallback(async () => {
    try {
      await apiClient.delete(`/employers/me/jobs/${jobId}`);
      toast.success("Job deleted.");
      router.push("/employer/jobs");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete job.",
      );
    }
  }, [jobId, router]);

  const handleDuplicateJob = useCallback(async () => {
    if (!job) return;
    try {
      const newJob = await apiClient.post<any>("/employers/me/jobs", {
        title: `${job.title} (Copy)`,
        jobType: job.jobType,
        workMode: job.workMode,
        location: job.location,
        description: job.description,
        responsibilities: job.responsibilities,
        niceToHaveSkills: job.niceToHaveSkills,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        experienceLevel: job.experienceLevel,
        applicationDeadline: job.applicationDeadline,
      });
      toast.success("Job duplicated as draft!");
      router.push(`/employer/jobs/${newJob.id}/edit`);
    } catch {
      toast.error("Failed to duplicate job.");
    }
  }, [job, router]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedApps.size === filteredApplications.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(filteredApplications.map((a) => a.id)));
    }
  }, [selectedApps, filteredApplications]);

  /* ─── Loading / Error ─── */
  if (jobLoading) return <LoadingSkeleton />;

  if (jobError || !job) {
    return (
      <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--error-light)] flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-[var(--error)]" />
        </div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">
          Failed to load job
        </h3>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">
          {jobError instanceof Error
            ? jobError.message
            : "Something went wrong."}
        </p>
        <button
          onClick={() => refetchJob()}
          className="px-5 py-2.5 bg-[#C4A35A] text-white rounded-xl text-sm font-semibold hover:bg-[#A8893D] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const statusCfg = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.draft;
  const deadlineInfo = getDeadlineInfo(job.applicationDeadline);
  const isDraft = job.status === JobStatus.DRAFT;
  const isRejected = job.status === JobStatus.REJECTED;
  const isPublished = job.status === JobStatus.PUBLISHED;

  return (
    <div className="space-y-6 pb-8">
      {/* ═══════════════════════════════════════════════════════ */}
      {/*  Hero Header                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link
            href="/employer/jobs"
            className="mt-1 p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
                {job.title}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
                  statusCfg.bg,
                  statusCfg.text,
                )}
              >
                <span
                  className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)}
                />
                {statusCfg.label}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {job.location && (
                <span className="flex items-center gap-1 text-sm text-[var(--neutral-gray)]">
                  <MapPin size={14} /> {job.location}
                </span>
              )}
              {job.workMode && (
                <span className="flex items-center gap-1 text-sm text-[var(--neutral-gray)]">
                  <Monitor size={14} /> {job.workMode.replace("_", "-")}
                </span>
              )}
              {job.jobType && (
                <span className="flex items-center gap-1 text-sm text-[var(--neutral-gray)]">
                  <Briefcase size={14} /> {job.jobType.replace("_", " ")}
                </span>
              )}
              {job.publishedAt && (
                <span className="flex items-center gap-1 text-sm text-[var(--neutral-gray)]">
                  <Calendar size={14} /> Posted{" "}
                  {formatRelativeTime(job.publishedAt)}
                </span>
              )}
              {deadlineInfo.label && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    deadlineInfo.isExpired
                      ? "text-[var(--error)]"
                      : deadlineInfo.daysLeft <= 3
                        ? "text-[var(--warning-dark)]"
                        : "text-[var(--neutral-gray)]",
                  )}
                >
                  <Clock size={14} /> {deadlineInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {(isDraft || isRejected) && (
            <motion.button
              onClick={handlePublishJob}
              disabled={publishJob.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#C4A35A] to-[#A8893D] hover:from-[#E08A13] hover:to-[#D05A10] disabled:opacity-60 transition-all shadow-sm"
            >
              {publishJob.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Publish
            </motion.button>
          )}

          {(isDraft || isRejected) && (
            <Link
              href={`/employer/jobs/${jobId}/edit`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <Edit size={14} /> Edit
            </Link>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
            title="Copy job link"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* More actions dropdown */}
          <div className="relative" ref={actionMenuRef}>
            <button
              onClick={() => setActionMenuOpen((v) => !v)}
              className="p-2.5 rounded-xl border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            <AnimatePresence>
              {actionMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl shadow-xl z-30 p-1"
                >
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      handleDuplicateJob();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <Copy size={14} className="text-[var(--neutral-gray)]" />
                    Duplicate
                  </button>
                  {isPublished && (
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        setCloseConfirmOpen(true);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--warning-dark)] hover:bg-[var(--warning-light)] transition-colors"
                    >
                      <XCircle size={14} /> Close Job
                    </button>
                  )}
                  <div className="h-px bg-[var(--border)] mx-1 my-0.5" />
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      setDeleteConfirmOpen(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  Quick Stats                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Eye}
          label="Views"
          value={job.viewCount}
          accent="bg-[#1B7340]/10 text-[#1B7340]"
        />
        <StatCard
          icon={Users}
          label="Applications"
          value={appCounts.total}
          accent="bg-[#C4A35A]/10 text-[#C4A35A]"
        />
        <StatCard
          icon={Star}
          label="Shortlisted"
          value={appCounts.shortlisted}
          accent="bg-[var(--success-light)] text-[var(--success-dark)]"
        />
        <StatCard
          icon={Calendar}
          label="Interviews"
          value={appCounts.interview}
          accent="bg-[var(--primary)]/10 text-[var(--primary)]"
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  Tabs                                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex gap-1 bg-[var(--surface-2)] rounded-xl p-1">
        {(["details", "applications"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative",
              activeTab === tab
                ? "bg-[var(--surface-0)] text-[#C4A35A] shadow-sm"
                : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]",
            )}
          >
            {tab === "details"
              ? "Job Details"
              : `Applications (${appCounts.total})`}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  Tab Content                                             */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === "details" && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6">
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                  Job Description
                </h3>
                <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed opacity-80">
                  {job.description}
                </div>
              </div>

              {/* Responsibilities */}
              {job.responsibilities && (
                <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                    Responsibilities
                  </h3>
                  <ul className="space-y-2.5">
                    {job.responsibilities
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2
                            size={16}
                            className="text-[var(--success)] mt-0.5 shrink-0"
                          />
                          <span className="text-sm text-[var(--text-primary)] opacity-80">
                            {line
                              .replace(/^[-•*]\s*/, "")
                              .replace(/^\d+[.)]\s*/, "")}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Skills */}
              {((job.jobSkills && job.jobSkills.length > 0) ||
                (job.niceToHaveSkills && job.niceToHaveSkills.length > 0)) && (
                <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-6">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
                    Required Skills
                  </h3>
                  {job.jobSkills && job.jobSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.jobSkills.map((js) => (
                        <span
                          key={js.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium",
                            js.isRequired
                              ? "bg-[#C4A35A]/10 text-[#C4A35A] border border-[#C4A35A]/20"
                              : "bg-[var(--surface-1)] text-[var(--neutral-gray)] border border-[var(--border)]",
                          )}
                        >
                          {js.skill?.name || "Skill"}
                          {!js.isRequired && (
                            <span className="text-[10px] opacity-70">
                              (nice to have)
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {job.niceToHaveSkills && job.niceToHaveSkills.length > 0 && (
                    <div
                      className={
                        job.jobSkills && job.jobSkills.length > 0
                          ? "mt-3 pt-3 border-t border-[var(--border)]"
                          : ""
                      }
                    >
                      {job.jobSkills && job.jobSkills.length > 0 && (
                        <p className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-2">
                          Nice to Have
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {job.niceToHaveSkills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-[var(--surface-1)] text-[var(--neutral-gray)] border border-[var(--border)]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Salary */}
              {(job.salaryMin || job.salaryMax) && (
                <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-[#C4A35A]" />
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Salary Range
                    </h4>
                  </div>
                  <p className="text-lg font-bold text-[#C4A35A]">
                    {formatSalary(
                      job.salaryMin,
                      job.salaryMax,
                      job.salaryCurrency,
                    )}
                  </p>
                </div>
              )}

              {/* Meta info */}
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-5 space-y-3">
                {job.location && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center shrink-0">
                      <MapPin
                        size={14}
                        className="text-[var(--neutral-gray)]"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase">
                        Location
                      </p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {job.location}
                      </p>
                    </div>
                  </div>
                )}
                {job.workMode && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center shrink-0">
                      <Monitor
                        size={14}
                        className="text-[var(--neutral-gray)]"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase">
                        Work Mode
                      </p>
                      <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {job.workMode.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                )}
                {job.experienceLevel && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center shrink-0">
                      <Briefcase
                        size={14}
                        className="text-[var(--neutral-gray)]"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase">
                        Experience
                      </p>
                      <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {job.experienceLevel}
                      </p>
                    </div>
                  </div>
                )}
                {job.applicationDeadline && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center shrink-0">
                      <Calendar
                        size={14}
                        className="text-[var(--neutral-gray)]"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--neutral-gray)] uppercase">
                        Deadline
                      </p>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          deadlineInfo.isExpired
                            ? "text-[var(--error)]"
                            : "text-[var(--text-primary)]",
                        )}
                      >
                        {formatDate(job.applicationDeadline)}
                        {deadlineInfo.label && (
                          <span className="text-xs ml-1 opacity-70">
                            ({deadlineInfo.label})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* About the Company */}
              {org && (
                <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-5">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    About the Company
                  </h4>
                  <div className="flex items-center gap-3 mb-3">
                    {org.logoUrl ? (
                      <Image
                        src={org.logoUrl}
                        alt={org.companyName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#C4A35A]/10 flex items-center justify-center">
                        <Building2 size={18} className="text-[#C4A35A]" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {org.companyName}
                      </p>
                      {org.sector && (
                        <p className="text-xs text-[var(--neutral-gray)]">
                          {org.sector}
                        </p>
                      )}
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-xs text-[var(--neutral-gray)] leading-relaxed mb-3">
                      {org.description.length > 200
                        ? org.description.slice(0, 200) + "..."
                        : org.description}
                    </p>
                  )}
                  {org.websiteUrl && (
                    <a
                      href={org.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium text-[#C4A35A] hover:underline"
                    >
                      <Globe size={12} />
                      {org.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/*  Tab Content: Applications                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === "applications" && (
          <motion.div
            key="applications"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Stats bar */}
            <div className="flex flex-wrap gap-3">
              {[
                {
                  label: "Total",
                  count: appCounts.total,
                  color: "text-[var(--text-primary)]",
                },
                {
                  label: "New",
                  count: appCounts.new,
                  color: "text-[var(--info-dark)]",
                },
                {
                  label: "Shortlisted",
                  count: appCounts.shortlisted,
                  color: "text-[var(--success-dark)]",
                },
                {
                  label: "Rejected",
                  count: appCounts.rejected,
                  color: "text-[var(--error-dark)]",
                },
                {
                  label: "In Interview",
                  count: appCounts.interview,
                  color: "text-[#1B7340]",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl"
                >
                  <span className={cn("text-base font-bold", item.color)}>
                    {item.count}
                  </span>
                  <span className="text-xs text-[var(--neutral-gray)]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Filters + Sort + Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setAppStatusFilter(opt.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      appStatusFilter === opt.key
                        ? "bg-[#C4A35A]/10 text-[#C4A35A]"
                        : "text-[var(--neutral-gray)] hover:bg-[var(--surface-2)]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#C4A35A]/20"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--neutral-gray)] pointer-events-none"
                  />
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
                  title="Export to CSV"
                >
                  <Download size={12} /> Export
                </button>

                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  <CheckCheck size={12} />{" "}
                  {selectedApps.size === filteredApplications.length &&
                  filteredApplications.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
            </div>

            {/* Bulk action bar */}
            <AnimatePresence>
              {selectedApps.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 bg-[#C4A35A]/5 border border-[#C4A35A]/20 rounded-xl"
                >
                  <span className="text-sm font-medium text-[#C4A35A]">
                    {selectedApps.size} selected
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    {selectedApps.size >= 2 && (
                      <button
                        onClick={() => setCompareOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1B7340] text-white hover:bg-[#1B7340]/90 transition-colors"
                      >
                        <GitCompare size={12} /> Compare
                      </button>
                    )}
                    <button
                      onClick={handleBulkShortlist}
                      disabled={bulkShortlistLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--success)] text-white hover:bg-[var(--success-dark)] disabled:opacity-50 transition-colors"
                    >
                      {bulkShortlistLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Star size={12} />
                      )}
                      Shortlist All
                    </button>
                    <button
                      onClick={handleBulkReject}
                      disabled={bulkRejectLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--error)] text-white hover:bg-[var(--error-dark)] disabled:opacity-50 transition-colors"
                    >
                      {bulkRejectLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <XCircle size={12} />
                      )}
                      Reject All
                    </button>
                    <button
                      onClick={() => setSelectedApps(new Set())}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Applications list */}
            {appsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--surface-1)] flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-[var(--surface-3)]" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                  No applications found
                </h3>
                <p className="text-sm text-[var(--neutral-gray)]">
                  {appStatusFilter !== "all"
                    ? "Try a different filter."
                    : "Applications will appear here once candidates apply."}
                </p>
              </div>
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {filteredApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    jobId={jobId}
                    selected={selectedApps.has(application.id)}
                    onToggleSelect={() => toggleSelect(application.id)}
                    onShortlist={() => handleShortlist(application.id)}
                    onReject={() => setRejectTarget(application.id)}
                    onRefetch={() => refetchApps()}
                    expanded={expandedApp === application.id}
                    onToggleExpand={() =>
                      setExpandedApp((prev) =>
                        prev === application.id ? null : application.id,
                      )
                    }
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  Dialogs & Panels                                       */}
      {/* ═══════════════════════════════════════════════════════ */}

      <RejectReasonModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) handleReject(rejectTarget, reason);
        }}
        loading={false}
      />

      <ConfirmDialog
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={handleCloseJob}
        title="Close this job?"
        message="Closed jobs will no longer accept new applications. You can reopen it later."
        confirmLabel="Close Job"
        variant="warning"
        loading={closeJob.isPending}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteJob}
        title="Delete this job?"
        message="This action cannot be undone. All applications associated with this job will also be removed."
        confirmLabel="Delete"
        variant="danger"
      />

      <ComparisonPanel
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        applications={selectedApplications}
      />
    </div>
  );
}

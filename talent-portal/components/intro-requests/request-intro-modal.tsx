"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  User,
  Briefcase,
  Calendar,
  MapPin,
  MessageSquare,
  Loader2,
  Send,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CandidateProfile } from "@/types/candidate";
import { WorkMode } from "@/types/candidate";
import { useEmployerJobs } from "@/hooks/use-jobs";
import type { JobPost } from "@/types/job";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestIntroModalProps {
  candidate: CandidateProfile;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IntroRequestData) => void | Promise<void>;
}

export interface IntroRequestData {
  jobId?: string;
  roleTitle: string;
  roleDescription: string;
  desiredStartDate: string;
  workMode: WorkMode | null;
  locationExpectation: string;
  notesToPlacementUnit: string;
}

type Step = 1 | 2 | 3;

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  [WorkMode.REMOTE]: "Remote",
  [WorkMode.HYBRID]: "Hybrid",
  [WorkMode.ON_SITE]: "On-site",
};

const STATUS_COLORS: Record<string, string> = {
  published: "var(--success, #16a34a)",
  draft: "var(--warning, #ca8a04)",
  closed: "var(--error, #dc2626)",
};

const NOTES_TEMPLATE = `Hi Placement Team,

I'd like to request an introduction to this candidate for the role described above.

Key reasons for interest:
- [Reason 1]
- [Reason 2]

Preferred timeline: [e.g., ASAP / within 2 weeks]

Additional context:
[Any other relevant notes]`;

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: Step;
  onStepClick: (step: Step) => void;
}) {
  const steps = [
    { num: 1 as Step, label: "Select Role" },
    { num: 2 as Step, label: "Details" },
    { num: 3 as Step, label: "Review" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "0 24px",
      }}
    >
      {steps.map((step, i) => {
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;
        const isClickable = step.num < currentStep;

        return (
          <div
            key={step.num}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.num)}
              disabled={!isClickable}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: isActive
                  ? "var(--primary-light, rgba(30, 77, 183, 0.1))"
                  : "transparent",
                cursor: isClickable ? "pointer" : "default",
                transition: "all 150ms",
              }}
            >
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: isActive || isCompleted ? "#fff" : "var(--text-secondary, var(--neutral-gray, #6b7280))",
                  background:
                    isActive || isCompleted
                      ? "var(--primary, #1B7340)"
                      : "var(--surface-2, var(--surface-1, #f3f4f6))",
                  transition: "all 150ms",
                }}
              >
                {isCompleted ? <Check style={{ width: 12, height: 12 }} /> : step.num}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? "var(--text-primary, var(--foreground, #111))"
                    : "var(--text-secondary, var(--neutral-gray, #6b7280))",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: "24px",
                  height: "1px",
                  background: currentStep > step.num
                    ? "var(--primary, #1B7340)"
                    : "var(--border, #e5e7eb)",
                  transition: "background 200ms",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: "72px",
            borderRadius: "12px",
            background: "var(--surface-1, #f3f4f6)",
            animation: "skeleton-pulse 1.5s ease-in-out infinite",
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

function JobCard({
  job,
  isSelected,
  onClick,
}: {
  job: JobPost;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: "12px",
        border: `2px solid ${isSelected ? "var(--primary, #1B7340)" : "var(--border, #e5e7eb)"}`,
        background: isSelected
          ? "var(--primary-light, rgba(30, 77, 183, 0.05))"
          : "var(--surface-0, #fff)",
        cursor: "pointer",
        transition: "all 150ms",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: isSelected
            ? "var(--primary, #1B7340)"
            : "var(--surface-2, var(--surface-1, #f3f4f6))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 150ms",
        }}
      >
        <Briefcase
          style={{
            width: 16,
            height: 16,
            color: isSelected ? "#fff" : "var(--text-secondary, var(--neutral-gray, #6b7280))",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-primary, var(--foreground, #111))",
            marginBottom: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {job.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {job.location && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "12px",
                color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              }}
            >
              <MapPin style={{ width: 11, height: 11 }} />
              {job.location}
            </span>
          )}
          {job.workMode && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "var(--surface-2, var(--surface-1, #f3f4f6))",
                color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              }}
            >
              {WORK_MODE_LABELS[job.workMode] || job.workMode}
            </span>
          )}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: "999px",
              background: `${STATUS_COLORS[job.status] || "var(--neutral-gray, #6b7280)"}18`,
              color: STATUS_COLORS[job.status] || "var(--neutral-gray, #6b7280)",
            }}
          >
            {job.status}
          </span>
        </div>
      </div>
      {isSelected && (
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "var(--primary, #1B7340)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Check style={{ width: 13, height: 13, color: "#fff" }} />
        </div>
      )}
    </button>
  );
}

function ReviewField({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
            marginBottom: "4px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-primary, var(--foreground, #111))",
            wordBreak: "break-word",
          }}
        >
          {value || <span style={{ color: "var(--text-secondary, var(--neutral-gray, #6b7280))", fontStyle: "italic" }}>Not specified</span>}
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          style={{
            padding: "4px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--primary, #1B7340)",
            flexShrink: 0,
          }}
          aria-label={`Edit ${label}`}
        >
          <Pencil style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success animation styles
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = ["#C4A35A", "#1B7340", "#10B981", "#EC4899", "#8B5CF6", "#F97316", "#06B6D4"];

const successStyles = `
@keyframes success-check-draw {
  0% { stroke-dashoffset: 48; }
  100% { stroke-dashoffset: 0; }
}
@keyframes success-circle-draw {
  0% { stroke-dashoffset: 166; }
  100% { stroke-dashoffset: 0; }
}
@keyframes success-fade-in {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
  50% { opacity: 1; }
  100% { transform: translateY(200px) rotate(720deg) scale(0.3); opacity: 0; }
}
@keyframes confetti-spread {
  0% { transform: translateX(0) translateY(-10px); }
  100% { transform: translateX(var(--confetti-x)) translateY(180px); }
}
`;

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = 10 + Math.random() * 80;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random() * 1;
  const size = 4 + Math.random() * 6;
  const isCircle = index % 3 === 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: `${left}%`,
        width: `${size}px`,
        height: isCircle ? `${size}px` : `${size * 2.5}px`,
        background: color,
        borderRadius: isCircle ? "50%" : "2px",
        animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
        opacity: 0,
        animationFillMode: "forwards",
        pointerEvents: "none" as const,
      }}
    />
  );
}

function SuccessState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: "16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{successStyles}</style>

      {/* Confetti */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative", zIndex: 1 }}
      >
        <circle
          cx="32"
          cy="32"
          r="26"
          stroke="var(--success, #16a34a)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: 166,
            strokeDashoffset: 166,
            animation: "success-circle-draw 0.6s ease-out forwards",
          }}
        />
        <path
          d="M20 33L28 41L44 25"
          stroke="var(--success, #16a34a)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 48,
            strokeDashoffset: 48,
            animation: "success-check-draw 0.4s ease-out 0.4s forwards",
          }}
        />
      </svg>
      <div
        style={{
          textAlign: "center",
          animation: "success-fade-in 0.4s ease-out 0.6s both",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--text-primary, var(--foreground, #111))",
            marginBottom: "4px",
          }}
        >
          Intro request sent!
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
          }}
        >
          The placement team will be in touch shortly.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RequestIntroModal({
  candidate,
  isOpen,
  onClose,
  onSubmit,
}: RequestIntroModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [formData, setFormData] = useState<IntroRequestData>({
    roleTitle: "",
    roleDescription: "",
    desiredStartDate: "",
    workMode: null,
    locationExpectation: "",
    notesToPlacementUnit: NOTES_TEMPLATE,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: jobsData, isLoading: jobsLoading } = useEmployerJobs({
    status: "published",
    limit: 100,
  });
  const jobs: JobPost[] = jobsData?.data || [];

  const filteredJobs = useMemo(() => {
    if (!jobSearch.trim()) return jobs;
    const q = jobSearch.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        (job.location && job.location.toLowerCase().includes(q)),
    );
  }, [jobs, jobSearch]);

  const selectedJob = useMemo(
    () => (selectedJobId ? jobs.find((j) => j.id === selectedJobId) : null),
    [jobs, selectedJobId],
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleClose]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDirection(0);
      setSelectedJobId("");
      setIsCustomRole(false);
      setJobSearch("");
      setFormData({
        roleTitle: "",
        roleDescription: "",
        desiredStartDate: "",
        workMode: null,
        locationExpectation: "",
        notesToPlacementUnit: NOTES_TEMPLATE,
      });
      setErrors({});
      setLoading(false);
      setSubmitted(false);
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isOpen]);

  // Focus search when step 1 appears
  useEffect(() => {
    if (step === 1 && isOpen && !jobsLoading) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [step, isOpen, jobsLoading]);

  function goTo(target: Step) {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  }

  function handleJobSelect(jobId: string) {
    setSelectedJobId(jobId);
    setIsCustomRole(false);
    setErrors({});

    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setFormData((prev) => ({
        ...prev,
        roleTitle: job.title,
        roleDescription: job.description,
        workMode: job.workMode || null,
        locationExpectation: job.location || "",
      }));
    }
  }

  function handleCustomRole() {
    setSelectedJobId("");
    setIsCustomRole(true);
    setErrors({});
    setFormData((prev) => ({
      ...prev,
      roleTitle: "",
      roleDescription: "",
      workMode: null,
      locationExpectation: "",
    }));
  }

  function updateField(key: keyof IntroRequestData, value: string | WorkMode | null) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (!formData.roleTitle.trim()) errs.roleTitle = "Role title is required";
    if (!formData.roleDescription.trim())
      errs.roleDescription = "Role description is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    return true;
  }

  function handleNextFromStep1() {
    if (!selectedJobId && !isCustomRole) {
      setErrors({ jobId: "Please select a job or choose Custom Role" });
      return;
    }
    setErrors({});
    goTo(2);
  }

  function handleNextFromStep2() {
    if (validateStep2()) {
      goTo(3);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        jobId: selectedJobId || undefined,
      });
      setSubmitted(true);
      autoCloseTimerRef.current = setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid var(--border, #e5e7eb)",
    background: "var(--surface-0, #fff)",
    padding: "10px 14px",
    fontSize: "14px",
    color: "var(--text-primary, var(--foreground, #111))",
    outline: "none",
    transition: "border-color 150ms, box-shadow 150ms",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary, var(--foreground, #111))",
  };

  const errorStyle: React.CSSProperties = {
    marginTop: "4px",
    fontSize: "12px",
    color: "var(--error, #dc2626)",
  };

  // -----------------------------------------------------------------------
  // Step 1: Select Job or Custom Role
  // -----------------------------------------------------------------------

  function renderStep1() {
    if (jobsLoading) {
      return <SkeletonLoader />;
    }

    return (
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search jobs by title or location..."
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: "36px",
            }}
          />
        </div>

        {/* Job list */}
        <div
          style={{
            maxHeight: "280px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            paddingRight: "4px",
          }}
        >
          {filteredJobs.length === 0 && jobs.length > 0 && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              }}
            >
              No jobs match &quot;{jobSearch}&quot;
            </div>
          )}
          {jobs.length === 0 && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              }}
            >
              No published jobs found. You can still use &quot;Custom Role&quot; below.
            </div>
          )}
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSelected={selectedJobId === job.id}
              onClick={() => handleJobSelect(job.id)}
            />
          ))}
        </div>

        {/* Custom Role option */}
        <button
          type="button"
          onClick={handleCustomRole}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "14px 16px",
            borderRadius: "12px",
            border: `2px dashed ${isCustomRole ? "var(--primary, #1B7340)" : "var(--border, #e5e7eb)"}`,
            background: isCustomRole
              ? "var(--primary-light, rgba(30, 77, 183, 0.05))"
              : "var(--surface-0, #fff)",
            cursor: "pointer",
            transition: "all 150ms",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: isCustomRole
                ? "var(--primary, #1B7340)"
                : "var(--surface-2, var(--surface-1, #f3f4f6))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 150ms",
            }}
          >
            <Plus
              style={{
                width: 16,
                height: 16,
                color: isCustomRole ? "#fff" : "var(--text-secondary, var(--neutral-gray, #6b7280))",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary, var(--foreground, #111))",
              }}
            >
              Custom Role
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              }}
            >
              Define a role that isn&apos;t listed above
            </div>
          </div>
          {isCustomRole && (
            <div
              style={{
                marginLeft: "auto",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "var(--primary, #1B7340)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Check style={{ width: 13, height: 13, color: "#fff" }} />
            </div>
          )}
        </button>

        {errors.jobId && <div style={errorStyle}>{errors.jobId}</div>}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Step 2: Message & Details
  // -----------------------------------------------------------------------

  function renderStep2() {
    const isJobSelected = !!selectedJobId;

    return (
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Role Title */}
        <div>
          <label style={labelStyle}>
            Role Title <span style={{ color: "var(--error, #dc2626)" }}>*</span>
          </label>
          <input
            type="text"
            value={formData.roleTitle}
            onChange={(e) => updateField("roleTitle", e.target.value)}
            placeholder={isJobSelected ? "Auto-filled from selected job" : "e.g. Senior Frontend Developer"}
            readOnly={isJobSelected}
            style={{
              ...inputStyle,
              background: isJobSelected
                ? "var(--surface-1, #f3f4f6)"
                : "var(--surface-0, #fff)",
            }}
          />
          {errors.roleTitle && <div style={errorStyle}>{errors.roleTitle}</div>}
        </div>

        {/* Role Description */}
        <div>
          <label style={labelStyle}>
            Role Description <span style={{ color: "var(--error, #dc2626)" }}>*</span>
          </label>
          <textarea
            value={formData.roleDescription}
            onChange={(e) => updateField("roleDescription", e.target.value)}
            placeholder={isJobSelected ? "Auto-filled from selected job" : "Describe the role responsibilities and requirements..."}
            rows={4}
            readOnly={isJobSelected}
            style={{
              ...inputStyle,
              resize: "vertical" as const,
              minHeight: "96px",
              background: isJobSelected
                ? "var(--surface-1, #f3f4f6)"
                : "var(--surface-0, #fff)",
            }}
          />
          {errors.roleDescription && (
            <div style={errorStyle}>{errors.roleDescription}</div>
          )}
        </div>

        {/* Start Date + Work Mode row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={labelStyle}>
              <Calendar
                style={{
                  width: 13,
                  height: 13,
                  display: "inline",
                  verticalAlign: "-1px",
                  marginRight: "5px",
                  color: "var(--primary, #1B7340)",
                }}
              />
              Desired Start Date
            </label>
            <input
              type="date"
              value={formData.desiredStartDate}
              onChange={(e) => updateField("desiredStartDate", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Work Mode</label>
            <select
              value={formData.workMode ?? ""}
              onChange={(e) =>
                updateField(
                  "workMode",
                  e.target.value ? (e.target.value as WorkMode) : null,
                )
              }
              disabled={isJobSelected}
              style={{
                ...inputStyle,
                background: isJobSelected
                  ? "var(--surface-1, #f3f4f6)"
                  : "var(--surface-0, #fff)",
              }}
            >
              <option value="">Not specified</option>
              <option value={WorkMode.REMOTE}>Remote</option>
              <option value={WorkMode.HYBRID}>Hybrid</option>
              <option value={WorkMode.ON_SITE}>On-site</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>
            <MapPin
              style={{
                width: 13,
                height: 13,
                display: "inline",
                verticalAlign: "-1px",
                marginRight: "5px",
                color: "var(--primary, #1B7340)",
              }}
            />
            Location Expectation
          </label>
          <input
            type="text"
            value={formData.locationExpectation}
            onChange={(e) => updateField("locationExpectation", e.target.value)}
            placeholder="e.g. Lagos, Nigeria or Remote"
            readOnly={isJobSelected}
            style={{
              ...inputStyle,
              background: isJobSelected
                ? "var(--surface-1, #f3f4f6)"
                : "var(--surface-0, #fff)",
            }}
          />
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>
            <MessageSquare
              style={{
                width: 13,
                height: 13,
                display: "inline",
                verticalAlign: "-1px",
                marginRight: "5px",
                color: "var(--primary, #1B7340)",
              }}
            />
            Notes to Placement Unit
          </label>
          <textarea
            value={formData.notesToPlacementUnit}
            onChange={(e) => updateField("notesToPlacementUnit", e.target.value)}
            rows={6}
            style={{
              ...inputStyle,
              resize: "vertical" as const,
              minHeight: "120px",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Step 3: Review & Send
  // -----------------------------------------------------------------------

  function renderStep3() {
    const trackName = candidate.primaryTrack?.name ?? "N/A";

    return (
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Candidate info card */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--surface-1, #f9fafb)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <User style={{ width: 12, height: 12 }} />
            Candidate
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text-primary, var(--foreground, #111))",
            }}
          >
            {candidate.fullName}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              marginTop: "2px",
            }}
          >
            Track: {trackName}
          </div>
        </div>

        {/* Job/Role info card */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--surface-1, #f9fafb)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Building2 style={{ width: 12, height: 12 }} />
              {selectedJob ? "Selected Job" : "Custom Role"}
            </span>
            <button
              type="button"
              onClick={() => goTo(1)}
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--primary, #1B7340)",
                fontSize: "11px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Pencil style={{ width: 11, height: 11 }} /> Edit
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ReviewField label="Role Title" value={formData.roleTitle} onEdit={() => goTo(2)} />
            <ReviewField
              label="Role Description"
              value={
                formData.roleDescription.length > 150
                  ? formData.roleDescription.slice(0, 150) + "..."
                  : formData.roleDescription
              }
              onEdit={() => goTo(2)}
            />
          </div>
        </div>

        {/* Details card */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--surface-1, #f9fafb)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Details</span>
            <button
              type="button"
              onClick={() => goTo(2)}
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--primary, #1B7340)",
                fontSize: "11px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Pencil style={{ width: 11, height: 11 }} /> Edit
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <ReviewField
              label="Start Date"
              value={
                formData.desiredStartDate
                  ? new Date(formData.desiredStartDate + "T00:00:00").toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "long", day: "numeric" },
                    )
                  : null
              }
            />
            <ReviewField
              label="Work Mode"
              value={formData.workMode ? WORK_MODE_LABELS[formData.workMode] : null}
            />
            <ReviewField label="Location" value={formData.locationExpectation} />
          </div>
        </div>

        {/* Notes preview */}
        {formData.notesToPlacementUnit.trim() && (
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid var(--border, #e5e7eb)",
              background: "var(--surface-1, #f9fafb)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageSquare style={{ width: 12, height: 12 }} />
                Notes to Placement Unit
              </span>
              <button
                type="button"
                onClick={() => goTo(2)}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--primary, #1B7340)",
                  fontSize: "11px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Pencil style={{ width: 11, height: 11 }} /> Edit
              </button>
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-primary, var(--foreground, #111))",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              {formData.notesToPlacementUnit}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Footer buttons
  // -----------------------------------------------------------------------

  function renderFooter() {
    if (submitted) return null;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderTop: "1px solid var(--border, #e5e7eb)",
          background: "var(--surface-0, #fff)",
          borderRadius: "0 0 16px 16px",
        }}
      >
        {/* Left side: Back button */}
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={() => goTo((step - 1) as Step)}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid var(--border, #e5e7eb)",
                background: "var(--surface-0, #fff)",
                color: "var(--text-primary, var(--foreground, #111))",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <ChevronLeft style={{ width: 15, height: 15 }} />
              Back
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid var(--border, #e5e7eb)",
                background: "var(--surface-0, #fff)",
                color: "var(--text-primary, var(--foreground, #111))",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms",
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Right side: Next / Submit */}
        <div>
          {step === 1 && (
            <button
              type="button"
              onClick={handleNextFromStep1}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "var(--primary, #1B7340)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              Next
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={handleNextFromStep2}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "var(--primary, #1B7340)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              Review
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                background: "var(--primary, #1B7340)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                transition: "all 150ms",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                  Submitting...
                </>
              ) : (
                <>
                  <Send style={{ width: 15, height: 15 }} />
                  Send Request
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-modal-title"
        >
          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>

          {/* Backdrop */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={dialogVariants}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "16px",
              border: "1px solid var(--border, #e5e7eb)",
              background: "var(--surface-0, #fff)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: submitted ? "none" : "1px solid var(--border, #e5e7eb)",
                background: "var(--surface-0, #fff)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h2
                    id="intro-modal-title"
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "var(--text-primary, var(--foreground, #111))",
                      margin: 0,
                    }}
                  >
                    Request Introduction
                  </h2>
                  <p
                    style={{
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
                    }}
                  >
                    <User style={{ width: 13, height: 13 }} />
                    {candidate.fullName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    padding: "6px",
                    borderRadius: "8px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-secondary, var(--neutral-gray, #6b7280))",
                    cursor: "pointer",
                    transition: "all 150ms",
                    opacity: loading ? 0.4 : 1,
                  }}
                  aria-label="Close dialog"
                >
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {/* Step indicator */}
              {!submitted && (
                <div style={{ marginTop: "16px" }}>
                  <StepIndicator currentStep={step} onStepClick={goTo} />
                </div>
              )}
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
              }}
            >
              {submitted ? (
                <SuccessState />
              ) : (
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {renderFooter()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

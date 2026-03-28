"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Check,
  CalendarDays,
  Clock,
  Sparkles,
  Users,
  MapPin,
  FileText,
  Lightbulb,
  Video,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import {
  AttendeeSelector,
  type SelectedAttendee,
} from "@/components/governance/attendee-selector";
import { useCreateMeeting } from "@/hooks/use-governance";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MEETING_TYPES = [
  { value: "standing", label: "Standing" },
  { value: "ad_hoc", label: "Ad Hoc" },
  { value: "review", label: "Review" },
  { value: "governance", label: "Governance" },
];

const STEPS = [
  {
    label: "Details",
    icon: CalendarDays,
    description: "Meeting information",
    tip: "Choose a clear, descriptive title that attendees will instantly recognize. Include the meeting type to help categorize it.",
  },
  {
    label: "Schedule",
    icon: Clock,
    description: "Date, time & attendees",
    tip: "Set a realistic duration. Most effective meetings run 30–60 minutes. Add all required attendees upfront.",
  },
  {
    label: "Review",
    icon: Sparkles,
    description: "Confirm & create",
    tip: "Double-check the details below. Click any section to jump back and make changes before creating.",
  },
];

const TYPE_ICONS: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  standing: { icon: CalendarDays, color: "#6366F1" },
  ad_hoc: { icon: Sparkles, color: "#F59E0B" },
  review: { icon: FileText, color: "#3B82F6" },
  governance: { icon: Users, color: "#10B981" },
};

/* ------------------------------------------------------------------ */
/*  Slide animation variants                                           */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

/* ------------------------------------------------------------------ */
/*  Circular Progress                                                  */
/* ------------------------------------------------------------------ */

function CircularProgress({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-[var(--text-primary)]">
        {step + 1}/{total}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ReviewSection                                                      */
/* ------------------------------------------------------------------ */

function ReviewSection({
  icon: Icon,
  label,
  onEdit,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 transition-all hover:border-[var(--primary)]/30 hover:shadow-md hover:shadow-black/5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)]/10">
            <Icon size={14} className="text-[var(--primary)]" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            {label}
          </span>
        </div>
        <span className="text-[10px] font-medium text-[var(--neutral-gray)] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-1)] px-2 py-0.5 rounded-full">
          Click to edit
        </span>
      </div>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ReviewField                                                        */
/* ------------------------------------------------------------------ */

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
        {label}
      </span>
      <p className="text-sm text-[var(--text-primary)] mt-0.5">
        {value || "—"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CreateMeetingPage() {
  const router = useRouter();
  const createMutation = useCreateMeeting();

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [agenda, setAgenda] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [attendees, setAttendees] = useState<SelectedAttendee[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Completion tracking ---- */
  const completionPct = useMemo(() => {
    let filled = 0;
    let total = 4;
    if (title.trim()) filled++;
    if (meetingType) filled++;
    if (scheduledAt) filled++;
    if (attendees.length > 0) filled++;
    return Math.round((filled / total) * 100);
  }, [title, meetingType, scheduledAt, attendees]);

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!title.trim()) newErrors.title = "Title is required";
      }
      if (s === 1) {
        if (!scheduledAt)
          newErrors.scheduledAt = "Scheduled date/time is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [title, scheduledAt],
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
        if (!validateStep(step)) return;
      }
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, validateStep],
  );

  /* ---- Submit ---- */
  function handleSubmit() {
    const attendeeIds = attendees.map((a) => a.id);

    createMutation.mutate(
      {
        title: title.trim(),
        meetingType: meetingType || undefined,
        agenda: agenda.trim() || undefined,
        location: location.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: durationMinutes
          ? parseInt(durationMinutes, 10)
          : undefined,
        attendeeIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      },
      {
        onSuccess: (data) => {
          router.push(`/dashboard/governance/meetings/${data.id}`);
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

  return (
    <div className="space-y-6">
      {/* ================================================ */}
      {/*  HERO HEADER                                      */}
      {/* ================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.04]"
            style={{
              background:
                "radial-gradient(circle, #6366F1 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full opacity-[0.03]"
            style={{
              background:
                "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              }}
            >
              <Video size={26} className="text-white" />
            </div>
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/governance/meetings")
                }
                className="flex items-center gap-1 text-xs font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)] mb-0.5"
              >
                <ArrowLeft size={12} />
                Back to Meetings
              </button>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Schedule Meeting
              </h1>
              <p className="mt-0.5 text-sm text-[var(--neutral-gray)]">
                Create a new meeting with agenda and attendees
              </p>
            </div>
          </div>

          {/* Completion badge */}
          <div className="flex items-center gap-3 self-start rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
            <CircularProgress step={step} total={STEPS.length} />
            <div>
              <p className="text-xs font-medium text-[var(--neutral-gray)]">
                Completion
              </p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {completionPct}%
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ================================================ */}
      {/*  TWO-PANEL LAYOUT                                 */}
      {/* ================================================ */}
      <div className="flex gap-6">
        {/* ---- Sidebar Stepper ---- */}
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden w-72 shrink-0 lg:block"
        >
          <div className="sticky top-24 space-y-4">
            {/* Vertical stepper */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neutral-gray)] mb-4">
                Steps
              </p>
              <div className="space-y-1">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === step;
                  const isDone = i < step;
                  const isClickable = i <= step;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => isClickable && goTo(i)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? "bg-[var(--primary)]/10"
                          : isClickable
                            ? "hover:bg-[var(--surface-1)] cursor-pointer"
                            : "cursor-default opacity-50"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                          isActive
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                            : isDone
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                              : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--neutral-gray)]"
                        }`}
                      >
                        {isDone ? (
                          <Check size={16} strokeWidth={2.5} />
                        ) : (
                          <Icon size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-[var(--primary)]"
                              : isDone
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--neutral-gray)]"
                          }`}
                        >
                          {s.label}
                        </p>
                        <p className="text-[11px] text-[var(--neutral-gray)] truncate">
                          {s.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contextual tip */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-4"
                style={{ borderColor: "rgba(245, 158, 11, 0.2)", backgroundColor: "rgba(245, 158, 11, 0.05)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb
                    size={14}
                    style={{ color: "#F59E0B" }}
                  />
                  <span className="text-xs font-semibold" style={{ color: "#D97706" }}>
                    Tip
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {STEPS[step].tip}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>

        {/* ---- Main Content ---- */}
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex-1 min-w-0"
        >
          {/* Mobile stepper */}
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-5 py-3 lg:hidden">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => i <= step && goTo(i)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs transition-all ${
                        isActive
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : isDone
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--neutral-gray)]"
                      }`}
                    >
                      {isDone ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? "text-[var(--primary)]" : "text-[var(--neutral-gray)]"}`}>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-2">
                      <div className="h-0.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                        <motion.div
                          className="h-full bg-[var(--primary)]"
                          initial={false}
                          animate={{ width: i < step ? "100%" : "0%" }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] overflow-hidden">
            {/* Step header bar */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)]/50 px-6 py-3">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = STEPS[step].icon;
                  return <Icon size={15} className="text-[var(--primary)]" />;
                })()}
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {STEPS[step].label}
                </span>
                <span className="text-xs text-[var(--neutral-gray)]">
                  — {STEPS[step].description}
                </span>
              </div>
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
            </div>

            {/* Step body */}
            <div className="p-6 min-h-[380px] relative overflow-hidden">
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
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                        Meeting Details
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mb-6">
                        Provide the meeting title, type, agenda, and location.
                      </p>
                      <div className="space-y-5">
                        <FormField
                          label="Title"
                          name="title"
                          value={title}
                          onChange={setTitle}
                          placeholder="e.g., Weekly IT Governance Review"
                          required
                          error={errors.title}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            label="Meeting Type"
                            name="meetingType"
                            type="select"
                            value={meetingType}
                            onChange={setMeetingType}
                            options={MEETING_TYPES}
                            placeholder="Select meeting type..."
                          />
                          <FormField
                            label="Location"
                            name="location"
                            value={location}
                            onChange={setLocation}
                            placeholder="e.g., Conference Room A"
                          />
                        </div>
                        <FormField
                          label="Agenda"
                          name="agenda"
                          type="textarea"
                          value={agenda}
                          onChange={setAgenda}
                          placeholder="Meeting agenda items..."
                          rows={5}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 1: Schedule */}
                  {step === 1 && (
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                        Schedule &amp; Attendees
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mb-6">
                        Set the date/time, duration, and invite attendees.
                      </p>
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                              Scheduled Date/Time{" "}
                              <span className="text-[var(--error)]">*</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={scheduledAt}
                              onChange={(e) => setScheduledAt(e.target.value)}
                              className={`w-full rounded-xl border bg-[var(--surface-0)] px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] ${
                                errors.scheduledAt
                                  ? "border-[var(--error)]"
                                  : "border-[var(--border)]"
                              }`}
                            />
                            {errors.scheduledAt && (
                              <p className="text-xs text-[var(--error)] mt-1">
                                {errors.scheduledAt}
                              </p>
                            )}
                          </div>
                          <FormField
                            label="Duration (minutes)"
                            name="durationMinutes"
                            type="number"
                            value={durationMinutes}
                            onChange={setDurationMinutes}
                            placeholder="e.g., 60"
                          />
                        </div>

                        {/* Quick duration presets */}
                        <div>
                          <p className="text-xs font-medium text-[var(--neutral-gray)] mb-2">
                            Quick duration
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["15", "30", "45", "60", "90", "120"].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDurationMinutes(d)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                  durationMinutes === d
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                                }`}
                              >
                                {d} min
                              </button>
                            ))}
                          </div>
                        </div>

                        <AttendeeSelector
                          selected={attendees}
                          onChange={setAttendees}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Review */}
                  {step === 2 && (
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                        Review &amp; Create
                      </h2>
                      <p className="text-sm text-[var(--neutral-gray)] mb-6">
                        Review the details below. Click any section to go back
                        and edit.
                      </p>

                      <div className="space-y-4">
                        {/* Details summary */}
                        <ReviewSection
                          icon={CalendarDays}
                          label="Meeting Details"
                          onEdit={() => goTo(0)}
                        >
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <ReviewField label="Title" value={title} />
                            <ReviewField
                              label="Type"
                              value={findLabel(MEETING_TYPES, meetingType)}
                            />
                            {location && (
                              <ReviewField label="Location" value={location} />
                            )}
                          </div>
                          {agenda && (
                            <div className="mt-3 rounded-xl bg-[var(--surface-1)] p-3">
                              <span className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
                                Agenda
                              </span>
                              <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap line-clamp-4">
                                {agenda}
                              </p>
                            </div>
                          )}
                        </ReviewSection>

                        {/* Schedule summary */}
                        <ReviewSection
                          icon={Clock}
                          label="Schedule & Attendees"
                          onEdit={() => goTo(1)}
                        >
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <ReviewField
                              label="Scheduled At"
                              value={
                                scheduledAt
                                  ? new Date(scheduledAt).toLocaleString(
                                      "en-GB",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "—"
                              }
                            />
                            <ReviewField
                              label="Duration"
                              value={
                                durationMinutes
                                  ? `${durationMinutes} minutes`
                                  : "—"
                              }
                            />
                          </div>
                          {attendees.length > 0 && (
                            <div className="mt-3">
                              <span className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
                                Attendees ({attendees.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {attendees.map((a) => (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
                                  >
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[9px] font-bold">
                                      {a.displayName.charAt(0).toUpperCase()}
                                    </span>
                                    {a.displayName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </ReviewSection>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation footer */}
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-1)]/30 px-6 py-4">
              <button
                type="button"
                onClick={
                  step === 0
                    ? () => router.push("/dashboard/governance/meetings")
                    : goPrev
                }
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
              >
                <ArrowLeft size={16} />
                {step === 0 ? "Cancel" : "Previous"}
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    createMutation.isPending || !title.trim() || !scheduledAt
                  }
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  }}
                >
                  {createMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Schedule Meeting
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  }}
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}

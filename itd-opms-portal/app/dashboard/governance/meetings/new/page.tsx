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
  CalendarDays,
  Clock,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
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
  { label: "Details", icon: CalendarDays, description: "Meeting information" },
  { label: "Schedule", icon: Clock, description: "Date, time & attendees" },
  { label: "Review", icon: Sparkles, description: "Confirm & create" },
];

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
  const [attendeeIds, setAttendeeIds] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!title.trim()) newErrors.title = "Title is required";
      }
      if (s === 1) {
        if (!scheduledAt) newErrors.scheduledAt = "Scheduled date/time is required";
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
    const attendees = attendeeIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

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
        attendeeIds: attendees.length > 0 ? attendees : undefined,
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
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/governance/meetings")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Meetings
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Schedule Meeting
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Create a new meeting with agenda and attendees.
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
            const isDone = i < step;
            const isClickable = i <= step;
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
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
            {/* Step 0: Details */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Meeting Details
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Provide the meeting title, type, agenda, and location.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g., Weekly IT Governance Review"
                    required
                    error={errors.title}
                  />
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
                    label="Agenda"
                    name="agenda"
                    type="textarea"
                    value={agenda}
                    onChange={setAgenda}
                    placeholder="Meeting agenda items..."
                    rows={4}
                  />
                  <FormField
                    label="Location"
                    name="location"
                    value={location}
                    onChange={setLocation}
                    placeholder="e.g., Conference Room A / Microsoft Teams"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Schedule */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Schedule &amp; Attendees
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Set the date/time, duration, and invite attendees.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                        Scheduled Date/Time <span className="text-[var(--error)]">*</span>
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
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      Attendee IDs
                    </label>
                    <input
                      type="text"
                      value={attendeeIds}
                      onChange={(e) => setAttendeeIds(e.target.value)}
                      placeholder="Comma-separated UUIDs of attendees"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3.5 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                    <p className="text-xs text-[var(--neutral-gray)] mt-1">
                      Separate multiple attendee IDs with commas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Create
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click any section to go back and edit.
                </p>

                <div className="space-y-4">
                  {/* Details summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays size={14} className="text-[var(--primary)]" />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Details
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
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
                      <div className="mt-2">
                        <ReviewField
                          label="Agenda"
                          value={
                            agenda.length > 120
                              ? agenda.slice(0, 120) + "..."
                              : agenda
                          }
                        />
                      </div>
                    )}
                  </button>

                  {/* Schedule summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} className="text-[var(--primary)]" />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Schedule
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Scheduled At"
                        value={
                          scheduledAt
                            ? new Date(scheduledAt).toLocaleString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"
                        }
                      />
                      <ReviewField
                        label="Duration"
                        value={
                          durationMinutes ? `${durationMinutes} minutes` : "—"
                        }
                      />
                      {attendeeIds.trim() && (
                        <ReviewField
                          label="Attendees"
                          value={`${attendeeIds.split(",").filter(Boolean).length} attendee(s)`}
                        />
                      )}
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
            disabled={createMutation.isPending || !title.trim() || !scheduledAt}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
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

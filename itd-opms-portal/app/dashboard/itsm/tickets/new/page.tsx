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
  AlertCircle,
  Headphones,
  FileText,
  Users,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateTicket } from "@/hooks/use-itsm";
import { useUsers } from "@/hooks/use-system";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TICKET_TYPES = [
  {
    value: "incident",
    label: "Incident",
    description: "Something is broken or not working as expected",
    icon: AlertCircle,
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
  },
  {
    value: "service_request",
    label: "Service Request",
    description: "Request a new service, access, or information",
    icon: Headphones,
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
];

const URGENCY_LEVELS = ["critical", "high", "medium", "low"] as const;
const IMPACT_LEVELS = ["critical", "high", "medium", "low"] as const;

type UrgencyLevel = (typeof URGENCY_LEVELS)[number];
type ImpactLevel = (typeof IMPACT_LEVELS)[number];

const LEVEL_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_MATRIX: Record<string, Record<string, string>> = {
  critical: {
    critical: "P1_critical",
    high: "P1_critical",
    medium: "P2_high",
    low: "P3_medium",
  },
  high: {
    critical: "P1_critical",
    high: "P2_high",
    medium: "P2_high",
    low: "P3_medium",
  },
  medium: {
    critical: "P2_high",
    high: "P2_high",
    medium: "P3_medium",
    low: "P3_medium",
  },
  low: {
    critical: "P3_medium",
    high: "P3_medium",
    medium: "P3_medium",
    low: "P4_low",
  },
};

const PRIORITY_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  P1_critical: { label: "P1 - Critical", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" },
  P2_high: { label: "P2 - High", color: "#F97316", bg: "rgba(249, 115, 22, 0.1)" },
  P3_medium: { label: "P3 - Medium", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  P4_low: { label: "P4 - Low", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
};

const CELL_COLORS: Record<string, string> = {
  P1_critical: "#EF4444",
  P2_high: "#F97316",
  P3_medium: "#F59E0B",
  P4_low: "#3B82F6",
};

const CATEGORIES = [
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "network", label: "Network" },
  { value: "access", label: "Access & Permissions" },
  { value: "email", label: "Email & Communication" },
  { value: "database", label: "Database" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const STEPS = [
  { label: "Type", icon: Headphones, description: "Ticket type & priority" },
  { label: "Details", icon: FileText, description: "Title & description" },
  { label: "Assignment", icon: Users, description: "Assign & tag" },
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

export default function NewTicketPage() {
  const router = useRouter();
  const createTicket = useCreateTicket();
  const { data: usersData } = useUsers(1, 200);

  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];

  const userOptions = users.map(
    (u: { id: string; displayName?: string; email: string }) => ({
      value: u.id,
      label: u.displayName || u.email,
    }),
  );

  /* ---- Stepper state ---- */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  /* ---- Form state ---- */
  const [ticketType, setTicketType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel | "">("");
  const [impact, setImpact] = useState<ImpactLevel | "">("");
  const [assigneeId, setAssigneeId] = useState("");
  const [teamQueueId, setTeamQueueId] = useState("");
  const [tags, setTags] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Computed priority ---- */
  const computedPriority = useMemo(() => {
    if (!urgency || !impact) return null;
    return PRIORITY_MATRIX[urgency]?.[impact] ?? null;
  }, [urgency, impact]);

  const priorityDisplay = computedPriority
    ? PRIORITY_DISPLAY[computedPriority]
    : null;

  /* ---- Step validation ---- */
  const validateStep = useCallback(
    (s: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (s === 0) {
        if (!ticketType) newErrors.ticketType = "Please select a ticket type";
        if (!urgency) newErrors.urgency = "Please select urgency";
        if (!impact) newErrors.impact = "Please select impact";
      }
      if (s === 1) {
        if (!title.trim()) newErrors.title = "Title is required";
        if (!description.trim()) newErrors.description = "Description is required";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [ticketType, urgency, impact, title, description],
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
    createTicket.mutate(
      {
        type: ticketType,
        title: title.trim(),
        description: description.trim(),
        category: category || undefined,
        subcategory: subcategory.trim() || undefined,
        urgency: urgency as string,
        impact: impact as string,
        priority: computedPriority!,
        channel: "portal",
        assigneeId: assigneeId.trim() || undefined,
        teamQueueId: teamQueueId.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      {
        onSuccess: (ticket) => {
          router.push(`/dashboard/itsm/tickets/${ticket.id}`);
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

  /* ---- Step completeness indicators ---- */
  const stepComplete = [
    !!(ticketType && urgency && impact),
    !!(title.trim() && description.trim()),
    !!(assigneeId || teamQueueId || tags.trim()),
    false,
  ];

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
          onClick={() => router.push("/dashboard/itsm/tickets")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-gray)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Back to Tickets
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Create New Ticket
        </h1>
        <p className="text-sm text-[var(--neutral-gray)]">
          Report an incident or submit a service request
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
            const isDone = i < step || stepComplete[i];
            const isClickable = i <= step || stepComplete[step];

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
            {/* Step 0: Type & Priority */}
            {step === 0 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Ticket Type &amp; Priority
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Select the type of ticket and set impact &amp; urgency to
                  calculate priority.
                </p>

                {/* Type selector cards */}
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    What do you need help with?
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {TICKET_TYPES.map((t) => {
                      const Icon = t.icon;
                      const isSelected = ticketType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTicketType(t.value)}
                          className="relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200"
                          style={{
                            borderColor: isSelected ? t.color : "var(--border)",
                            backgroundColor: isSelected ? t.bgColor : "transparent",
                          }}
                        >
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: t.bgColor }}
                          >
                            <Icon size={20} style={{ color: t.color }} />
                          </div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {t.label}
                          </p>
                          <p className="text-xs text-[var(--neutral-gray)]">
                            {t.description}
                          </p>
                          {isSelected && (
                            <motion.div
                              layoutId="type-indicator"
                              className="absolute right-3 top-3 h-3 w-3 rounded-full"
                              style={{ backgroundColor: t.color }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {errors.ticketType && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--error)]">
                      <AlertCircle size={12} />
                      {errors.ticketType}
                    </p>
                  )}
                </div>

                {/* Impact x Urgency Matrix */}
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Impact &amp; Urgency Matrix
                  </h3>
                  <p className="text-xs text-[var(--neutral-gray)] mb-4">
                    Select the urgency (row) and impact (column) to auto-calculate
                    priority
                  </p>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className="text-xs font-medium text-[var(--neutral-gray)]"
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                        }}
                      >
                        Urgency
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-col gap-1">
                        {URGENCY_LEVELS.map((u) => (
                          <div key={u} className="flex items-center gap-1">
                            <span className="w-16 text-right pr-2 text-xs font-medium text-[var(--neutral-gray)] capitalize">
                              {LEVEL_LABELS[u]}
                            </span>
                            {IMPACT_LEVELS.map((i) => {
                              const cellPriority = PRIORITY_MATRIX[u][i];
                              const isSelected = urgency === u && impact === i;
                              const cellColor = CELL_COLORS[cellPriority];

                              return (
                                <button
                                  key={`${u}-${i}`}
                                  type="button"
                                  onClick={() => {
                                    setUrgency(u);
                                    setImpact(i);
                                  }}
                                  className="flex h-14 w-14 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 sm:h-16 sm:w-16"
                                  style={{
                                    backgroundColor: cellColor,
                                    opacity: isSelected ? 1 : 0.35,
                                    color: "#fff",
                                    transform: isSelected ? "scale(1.08)" : "scale(1)",
                                    boxShadow: isSelected
                                      ? `0 0 0 2px ${cellColor}, 0 4px 12px ${cellColor}40`
                                      : "none",
                                  }}
                                  title={`Urgency: ${LEVEL_LABELS[u]}, Impact: ${LEVEL_LABELS[i]} = ${PRIORITY_DISPLAY[cellPriority]?.label}`}
                                >
                                  {PRIORITY_DISPLAY[cellPriority]?.label.split(" - ")[0]}
                                </button>
                              );
                            })}
                          </div>
                        ))}

                        <div className="flex items-center gap-1">
                          <span className="w-16" />
                          {IMPACT_LEVELS.map((i) => (
                            <span
                              key={i}
                              className="w-14 text-center text-xs font-medium text-[var(--neutral-gray)] capitalize sm:w-16"
                            >
                              {LEVEL_LABELS[i]}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-center">
                          <span className="text-xs font-medium text-[var(--neutral-gray)]">
                            Impact
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {priorityDisplay && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex items-center gap-2 rounded-xl p-3"
                      style={{ backgroundColor: priorityDisplay.bg }}
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: priorityDisplay.color }}
                      />
                      <span
                        className="text-sm font-bold"
                        style={{ color: priorityDisplay.color }}
                      >
                        Calculated Priority: {priorityDisplay.label}
                      </span>
                    </motion.div>
                  )}

                  {(errors.urgency || errors.impact) && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--error)]">
                      <AlertCircle size={12} />
                      {errors.urgency || errors.impact}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Ticket Details
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Provide a clear title and description for your ticket.
                </p>
                <div className="space-y-4">
                  <FormField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    placeholder="Brief summary of the issue or request"
                    required
                    error={errors.title}
                  />

                  <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={description}
                    onChange={setDescription}
                    placeholder="Provide a detailed description, including steps to reproduce if applicable"
                    rows={5}
                    required
                    error={errors.description}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Category"
                      name="category"
                      type="select"
                      value={category}
                      onChange={setCategory}
                      options={CATEGORIES}
                      placeholder="Select category"
                    />
                    <FormField
                      label="Subcategory"
                      name="subcategory"
                      value={subcategory}
                      onChange={setSubcategory}
                      placeholder="e.g. Microsoft Office, VPN"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Assignment */}
            {step === 2 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Assignment
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Optionally assign the ticket to a user, team queue, or add tags.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Assignee"
                      name="assigneeId"
                      type="select"
                      value={assigneeId}
                      onChange={setAssigneeId}
                      options={userOptions}
                      placeholder="Select assignee (optional)"
                    />
                    <FormField
                      label="Team Queue ID"
                      name="teamQueueId"
                      value={teamQueueId}
                      onChange={setTeamQueueId}
                      placeholder="Queue UUID (optional)"
                    />
                  </div>
                  <FormField
                    label="Tags"
                    name="tags"
                    value={tags}
                    onChange={setTags}
                    placeholder="Comma-separated tags, e.g. vpn, urgent, laptop"
                    description="Separate multiple tags with commas"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  Review &amp; Create
                </h2>
                <p className="text-sm text-[var(--neutral-gray)] mb-5">
                  Review the details below. Click any section to go back and
                  edit.
                </p>

                <div className="space-y-4">
                  {/* Type & Priority summary */}
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Headphones
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Type &amp; Priority
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Type"
                        value={
                          TICKET_TYPES.find((t) => t.value === ticketType)
                            ?.label || "—"
                        }
                      />
                      <ReviewField
                        label="Urgency"
                        value={urgency ? LEVEL_LABELS[urgency] : "—"}
                      />
                      <ReviewField
                        label="Impact"
                        value={impact ? LEVEL_LABELS[impact] : "—"}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--neutral-gray)]">
                          Priority:
                        </span>
                        {priorityDisplay ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{
                              backgroundColor: priorityDisplay.bg,
                              color: priorityDisplay.color,
                            }}
                          >
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: priorityDisplay.color }}
                            />
                            {priorityDisplay.label}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--text-primary)]">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Details summary */}
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Details
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField label="Title" value={title} />
                      <ReviewField
                        label="Category"
                        value={findLabel(CATEGORIES, category)}
                      />
                      {subcategory && (
                        <ReviewField label="Subcategory" value={subcategory} />
                      )}
                    </div>
                    {description && (
                      <div className="mt-2">
                        <ReviewField
                          label="Description"
                          value={
                            description.length > 120
                              ? description.slice(0, 120) + "..."
                              : description
                          }
                        />
                      </div>
                    )}
                  </button>

                  {/* Assignment summary */}
                  <button
                    type="button"
                    onClick={() => goTo(2)}
                    className="w-full text-left rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-1)]/50 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users
                        size={14}
                        className="text-[var(--primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Assignment
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <ReviewField
                        label="Assignee"
                        value={findLabel(userOptions, assigneeId)}
                      />
                      <ReviewField
                        label="Team Queue"
                        value={teamQueueId || "—"}
                      />
                      <ReviewField
                        label="Tags"
                        value={tags || "—"}
                      />
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
              ? () => router.push("/dashboard/itsm/tickets")
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
            disabled={
              createTicket.isPending ||
              !ticketType ||
              !urgency ||
              !impact ||
              !title.trim() ||
              !description.trim()
            }
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createTicket.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Ticket
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

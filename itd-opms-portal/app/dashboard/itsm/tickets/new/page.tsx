"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Headphones,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { useCreateTicket } from "@/hooks/use-itsm";

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewTicketPage() {
  const router = useRouter();
  const createTicket = useCreateTicket();

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

  /* ---- Validation ---- */
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!ticketType) newErrors.ticketType = "Please select a ticket type";
    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!urgency) newErrors.urgency = "Please select urgency";
    if (!impact) newErrors.impact = "Please select impact";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* ---- Submit ---- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6"
      >
        {/* Section: Type Selector */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            What do you need help with?
          </h2>
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

        {/* Section: Impact x Urgency Matrix */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Impact &amp; Urgency Matrix
          </h2>
          <p className="text-xs text-[var(--neutral-gray)] mb-4">
            Select the urgency (row) and impact (column) to auto-calculate
            priority
          </p>

          <div className="flex gap-4">
            {/* Y-axis label */}
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
              {/* Matrix grid */}
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

                {/* X-axis labels */}
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

          {/* Selected priority display */}
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

        {/* Section: Details */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Ticket Details
          </h2>
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

        {/* Section: Assignment (Optional) */}
        <div className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Assignment (Optional)
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Assignee ID"
                name="assigneeId"
                value={assigneeId}
                onChange={setAssigneeId}
                placeholder="User UUID (optional)"
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/itsm/tickets")}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-1)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createTicket.isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createTicket.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Create Ticket
          </button>
        </div>
      </motion.form>
    </div>
  );
}

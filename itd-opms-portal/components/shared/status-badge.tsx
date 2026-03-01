import { type ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  children?: ReactNode;
  className?: string;
  dot?: boolean;
  /** Enable pulse animation on the dot for pending-like statuses */
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success:
    "bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success)]/20",
  warning:
    "bg-[var(--warning-light)] text-[var(--warning-dark)] border-[var(--warning)]/20",
  error:
    "bg-[var(--error-light)] text-[var(--error-dark)] border-[var(--error)]/20",
  info: "bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info)]/20",
  default:
    "bg-[var(--surface-2)] text-[var(--neutral-gray)] border-[var(--border)]",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  error: "bg-[var(--error)]",
  info: "bg-[var(--info)]",
  default: "bg-[var(--neutral-gray)]",
};

/**
 * Maps common OPMS status strings to badge variants automatically.
 * Extends the talent-portal pattern with OPMS-specific statuses.
 * Override with the `variant` prop if needed.
 */
function resolveVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();

  // Success statuses
  if (
    [
      "active",
      "approved",
      "completed",
      "published",
      "resolved",
      "closed",
      "verified",
      "placed",
      "accepted",
      "hired",
      "procured",
    ].includes(s)
  ) {
    return "success";
  }

  // Warning statuses
  if (
    [
      "pending",
      "review",
      "under_review",
      "in_progress",
      "draft",
      "classified",
      "assigned",
      "maintenance",
      "shortlisted",
    ].includes(s)
  ) {
    return "warning";
  }

  // Error statuses
  if (
    [
      "rejected",
      "declined",
      "failed",
      "expired",
      "suspended",
      "cancelled",
      "retired",
      "disposed",
      "critical",
      "overdue",
    ].includes(s)
  ) {
    return "error";
  }

  // Info statuses
  if (
    [
      "new",
      "open",
      "submitted",
      "logged",
      "invited",
      "interview",
      "scheduled",
    ].includes(s)
  ) {
    return "info";
  }

  return "default";
}

export function StatusBadge({
  status,
  variant,
  children,
  className = "",
  dot = true,
  pulse,
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? resolveVariant(status);
  const displayText = children ?? status.replace(/_/g, " ");
  const shouldPulse = pulse ?? resolvedVariant === "warning";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${variantStyles[resolvedVariant]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[resolvedVariant]} ${shouldPulse ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
      )}
      {displayText}
    </span>
  );
}

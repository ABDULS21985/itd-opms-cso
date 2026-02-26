"use client";

import { AvailabilityStatus } from "@/types/candidate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  size?: "sm" | "md" | "lg";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  AvailabilityStatus,
  { label: string; colorClass: string; dotClass: string }
> = {
  [AvailabilityStatus.IMMEDIATE]: {
    label: "Available now",
    colorClass: "bg-[var(--success-light)] text-[var(--success-dark)]",
    dotClass: "bg-[var(--success)]",
  },
  [AvailabilityStatus.ONE_MONTH]: {
    label: "Within 1 month",
    colorClass: "bg-[var(--warning-light)] text-[var(--warning-dark)]",
    dotClass: "bg-[var(--warning)]",
  },
  [AvailabilityStatus.TWO_THREE_MONTHS]: {
    label: "2-3 months",
    colorClass: "bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]",
    dotClass: "bg-[var(--accent-orange)]",
  },
  [AvailabilityStatus.NOT_AVAILABLE]: {
    label: "Not available",
    colorClass: "bg-[var(--error-light)] text-[var(--error-dark)]",
    dotClass: "bg-[var(--error)]",
  },
  [AvailabilityStatus.PLACED]: {
    label: "Placed",
    colorClass: "bg-[var(--surface-2)] text-[var(--neutral-gray)]",
    dotClass: "bg-[var(--neutral-gray)]",
  },
};

const sizeStyles: Record<"sm" | "md" | "lg", { badge: string; dot: string }> = {
  sm: { badge: "px-2 py-0.5 text-[10px]", dot: "h-1 w-1" },
  md: { badge: "px-2.5 py-0.5 text-xs", dot: "h-1.5 w-1.5" },
  lg: { badge: "px-3 py-1 text-sm", dot: "h-2 w-2" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvailabilityBadge({
  status,
  size = "md",
}: AvailabilityBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.colorClass} ${sizes.badge}`}
    >
      <span
        className={`shrink-0 rounded-full ${config.dotClass} ${sizes.dot}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

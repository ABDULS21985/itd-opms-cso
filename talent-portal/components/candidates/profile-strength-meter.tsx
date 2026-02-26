"use client";

import { AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileStrengthMeterProps {
  strength: number;
  missingFields?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStrengthColor(strength: number): string {
  if (strength < 30) return "var(--error)";
  if (strength < 60) return "var(--accent-orange)";
  if (strength < 80) return "var(--warning)";
  return "var(--success)";
}

function getStrengthLabel(strength: number): string {
  if (strength < 30) return "Needs work";
  if (strength < 60) return "Getting there";
  if (strength < 80) return "Almost complete";
  return "Strong profile";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileStrengthMeter({
  strength,
  missingFields,
}: ProfileStrengthMeterProps) {
  const clamped = Math.max(0, Math.min(100, strength));
  const color = getStrengthColor(clamped);
  const label = getStrengthLabel(clamped);

  // Circle parameters
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular progress */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[var(--foreground)]">
            {clamped}%
          </span>
        </div>
      </div>

      {/* Label */}
      <p
        className="text-sm font-semibold"
        style={{ color }}
      >
        {label}
      </p>

      {/* Missing fields */}
      {missingFields && missingFields.length > 0 && (
        <div className="w-full rounded-lg bg-[var(--surface-1)] p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
            <AlertCircle className="h-3.5 w-3.5 text-[var(--warning)]" />
            Complete these to improve your profile
          </p>
          <ul className="space-y-1">
            {missingFields.map((field) => (
              <li
                key={field}
                className="text-xs text-[var(--neutral-gray)]"
              >
                &bull; {field}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

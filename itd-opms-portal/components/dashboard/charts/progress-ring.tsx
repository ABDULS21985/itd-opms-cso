"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  delay?: number;
  showPercentage?: boolean;
  fontSize?: number;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color,
  trackColor = "var(--surface-2)",
  label,
  delay = 0.3,
  showPercentage = true,
  fontSize = 20,
}: ProgressRingProps) {
  const pct = useMemo(() => Math.max(0, Math.min(100, (value / max) * 100)), [value, max]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const autoColor = useMemo(() => {
    if (color) return color;
    if (pct >= 75) return "#22C55E";
    if (pct >= 50) return "#F59E0B";
    return "#EF4444";
  }, [color, pct]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={autoColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
            transition={{ duration: 1.2, ease: "easeOut", delay }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <span
              className="font-bold tabular-nums"
              style={{ color: autoColor, fontSize }}
            >
              {Math.round(pct)}%
            </span>
          )}
          {label && (
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

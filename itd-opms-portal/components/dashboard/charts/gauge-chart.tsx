"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  thresholds?: { good: number; warning: number };
  suffix?: string;
  delay?: number;
  showValue?: boolean;
}

export function GaugeChart({
  value,
  max = 100,
  label,
  size = 160,
  thresholds = { good: 75, warning: 50 },
  suffix = "%",
  delay = 0.3,
  showValue = true,
}: GaugeChartProps) {
  const pct = useMemo(() => Math.max(0, Math.min(100, (value / max) * 100)), [value, max]);

  const color = useMemo(() => {
    if (pct >= thresholds.good) return "#22C55E";
    if (pct >= thresholds.warning) return "#F59E0B";
    return "#EF4444";
  }, [pct, thresholds]);

  // Scale stroke and text proportionally to size
  const compact = size < 100;
  const strokeWidth = compact ? Math.max(4, Math.round(size * 0.09)) : 12;
  const valueFontSize = compact ? Math.max(10, Math.round(size * 0.18)) : 24;

  // Arc parameters — semicircle gauge
  const radius = (size - strokeWidth) / 2;
  const halfCircumference = Math.PI * radius;

  // In compact mode, reduce extra vertical padding
  const bottomPad = compact ? 8 : 20;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + bottomPad }}>
        <svg
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
          className="w-full h-full"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            initial={{ strokeDashoffset: halfCircumference }}
            animate={{ strokeDashoffset: halfCircumference * (1 - pct / 100) }}
            transition={{ duration: 1.2, ease: "easeOut", delay }}
          />
        </svg>
        {/* Center text — hidden when showValue=false or when compact and the parent already displays the value */}
        {showValue && (
          <div
            className="absolute flex flex-col items-center"
            style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}
          >
            <span className="font-bold tabular-nums" style={{ color, fontSize: valueFontSize }}>
              {Math.round(value)}{suffix}
            </span>
            {label && !compact && (
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                {label}
              </span>
            )}
          </div>
        )}
      </div>
      {/* Scale markers — hide in compact mode to save space */}
      {!compact && (
        <div className="flex justify-between w-full px-2 mt-1" style={{ maxWidth: size }}>
          <span className="text-[9px] text-[var(--text-muted)]">0</span>
          <span className="text-[9px] text-[var(--text-muted)]">{max}</span>
        </div>
      )}
    </div>
  );
}

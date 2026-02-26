"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeatmapDay } from "./shared";

// ────────────────────────────────────────────────────────
// Color scale
// ────────────────────────────────────────────────────────

const COLOR_SCALE = [
  "var(--surface-2)",   // 0
  "#c6dbef",           // low
  "#6baed6",           // medium
  "#2171b5",           // high
  "var(--primary)",    // very high
];

function getColor(count: number, max: number): string {
  if (count === 0 || max === 0) return COLOR_SCALE[0];
  const normalized = count / max;
  if (normalized <= 0.25) return COLOR_SCALE[1];
  if (normalized <= 0.5) return COLOR_SCALE[2];
  if (normalized <= 0.75) return COLOR_SCALE[3];
  return COLOR_SCALE[4];
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

// ────────────────────────────────────────────────────────
// Tooltip
// ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────

interface HeatmapCalendarProps {
  data: HeatmapDay[];
}

export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const [tooltip, setTooltip] = useState<{
    day: HeatmapDay;
    x: number;
    y: number;
  } | null>(null);

  const { weeks, maxCount, totalActivity } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.count), 1);
    const total = data.reduce((sum, d) => sum + d.count, 0);

    // Organize into weeks (columns of 7 days)
    // Pad the start so first day aligns to its day-of-week
    const firstDate = data.length > 0 ? new Date(data[0].date + "T00:00:00") : new Date();
    const startDow = firstDate.getDay(); // 0=Sun, 1=Mon, ...
    const padded: (HeatmapDay | null)[] = Array(startDow).fill(null);
    padded.push(...data);

    // Split into weeks
    const wks: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      wks.push(padded.slice(i, i + 7));
    }
    // Pad last week to 7
    const lastWeek = wks[wks.length - 1];
    if (lastWeek && lastWeek.length < 7) {
      while (lastWeek.length < 7) lastWeek.push(null);
    }

    return { weeks: wks, maxCount: max, totalActivity: total };
  }, [data]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wIdx) => {
      for (const day of week) {
        if (day) {
          const month = new Date(day.date + "T00:00:00").getMonth();
          if (month !== lastMonth) {
            lastMonth = month;
            labels.push({
              label: new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" }),
              colIndex: wIdx,
            });
          }
          break;
        }
      }
    });
    return labels;
  }, [weeks]);

  return (
    <motion.div
      className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <CalendarDays size={18} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Platform Activity</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {totalActivity} actions in the last 90 days
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span>Less</span>
          {COLOR_SCALE.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex ml-8 mb-1 text-[10px] text-[var(--text-muted)]" style={{ gap: "3px" }}>
        {weeks.map((_, wIdx) => {
          const monthLabel = monthLabels.find((m) => m.colIndex === wIdx);
          return (
            <div key={wIdx} style={{ width: "12px", flexShrink: 0 }} className="text-center">
              {monthLabel ? (
                <span className="whitespace-nowrap">{monthLabel.label}</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-0 overflow-x-auto relative" onMouseLeave={() => setTooltip(null)}>
        {/* Day labels */}
        <div className="flex flex-col shrink-0 mr-1" style={{ gap: "3px" }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-[10px] text-[var(--text-muted)] flex items-center justify-end pr-1"
              style={{ width: "28px", height: "12px" }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex" style={{ gap: "3px" }}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col" style={{ gap: "3px" }}>
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  className={cn(
                    "w-3 h-3 rounded-[2px] transition-all duration-150",
                    day && "cursor-pointer hover:ring-2 hover:ring-[var(--primary)]/30 hover:ring-offset-1",
                  )}
                  style={{
                    backgroundColor: day ? getColor(day.count, maxCount) : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!day) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parent = e.currentTarget.closest(".overflow-x-auto")?.getBoundingClientRect();
                    setTooltip({
                      day,
                      x: rect.left - (parent?.left ?? 0) + 6,
                      y: rect.top - (parent?.top ?? 0) - 36,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute px-2 py-1 bg-[var(--text-primary)] text-[var(--surface-0)] text-[10px] rounded whitespace-nowrap pointer-events-none z-20"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translateX(-50%)" }}
          >
            <span className="font-semibold">{tooltip.day.count}</span>{" "}
            action{tooltip.day.count !== 1 ? "s" : ""} on{" "}
            {formatDate(tooltip.day.date)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

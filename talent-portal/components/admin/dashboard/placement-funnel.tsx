"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, Target, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorAlpha } from "@/lib/color-utils";
import type { FunnelStage } from "./shared";
import { C, pct } from "./shared";
import type { TimeMetrics } from "@/hooks/use-reports";

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

interface PlacementFunnelProps {
  stages: FunnelStage[];
  timeMetrics?: TimeMetrics;
  healthRates: { label: string; value: number; color: string }[];
  onStageClick?: (status: string) => void;
}

// ────────────────────────────────────────────────────────
// Animation variants
// ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────

export function PlacementFunnel({
  stages,
  timeMetrics,
  healthRates,
  onStageClick,
}: PlacementFunnelProps) {
  const maxCount = useMemo(() => Math.max(...stages.map((s) => s.count), 1), [stages]);

  return (
    <motion.div
      className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
          <Clock size={18} className="text-[var(--primary)]" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Placement Funnel</h2>
          <p className="text-xs text-[var(--text-secondary)]">Pipeline stages and conversion rates</p>
        </div>
      </div>

      {/* Funnel stages */}
      <div className="flex items-stretch gap-1 mb-6">
        {stages.map((stage, i) => {
          const widthPct = Math.max(15, (stage.count / maxCount) * 100);
          const conversionRate =
            i > 0 && stages[i - 1].count > 0
              ? Math.round((stage.count / stages[i - 1].count) * 100)
              : null;

          return (
            <div key={stage.status} className="contents">
              {/* Connector arrow with conversion rate */}
              {i > 0 && (
                <div className="flex flex-col items-center justify-center shrink-0 w-10">
                  <svg width="24" height="40" viewBox="0 0 24 40" className="shrink-0">
                    <line
                      x1="0" y1="20" x2="24" y2="20"
                      stroke={stage.color}
                      strokeWidth="2"
                      className="funnel-flow-line"
                      strokeOpacity="0.4"
                    />
                    <polygon
                      points="18,14 24,20 18,26"
                      fill={stage.color}
                      fillOpacity="0.4"
                    />
                  </svg>
                  {conversionRate !== null && (
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] mt-0.5">
                      {conversionRate}%
                    </span>
                  )}
                </div>
              )}

              {/* Stage block */}
              <motion.button
                onClick={() => onStageClick?.(stage.status)}
                className={cn(
                  "relative rounded-xl cursor-pointer transition-all group",
                  "hover:shadow-md hover:shadow-black/[0.05]",
                )}
                style={{ flex: `${widthPct} 0 0%`, minWidth: "60px" }}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <div
                  className="h-[72px] rounded-xl flex flex-col items-center justify-center px-2"
                  style={{
                    background: `linear-gradient(135deg, ${colorAlpha(stage.color, 0.08)}, ${colorAlpha(stage.color, 0.19)})`,
                    borderLeft: `3px solid ${stage.color}`,
                  }}
                >
                  <p
                    className="text-lg font-bold leading-none"
                    style={{ color: stage.color }}
                  >
                    {stage.count}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium leading-tight text-center">
                    {stage.label}
                  </p>
                </div>

                {/* Hover tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--text-primary)] text-[var(--surface-0)] text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Click to filter
                </div>
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Time metrics row */}
      {timeMetrics && (
        <div className="flex items-center gap-2 py-4 border-t border-[var(--border)]">
          {([
            { label: "Avg. Response", value: timeMetrics.avgDaysToResponse, icon: Zap, color: C.primaryLight },
            { label: "Avg. to Interview", value: timeMetrics.avgDaysToInterview, icon: Target, color: C.orange },
            { label: "Avg. to Placement", value: timeMetrics.avgDaysToPlacement, icon: CheckCircle2, color: C.green },
          ] as const).map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div key={step.label} className="contents">
                {idx > 0 && (
                  <div className="shrink-0 text-[var(--text-muted)]">
                    <ArrowRight size={20} />
                  </div>
                )}
                <div className="flex-1 text-center">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: colorAlpha(step.color, 0.07) }}
                  >
                    <StepIcon size={20} style={{ color: step.color }} />
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {step.value > 0 ? step.value : "\u2014"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">days</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Platform health rates */}
      {healthRates.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          {healthRates.map((rate) => (
            <div key={rate.label} className="text-center">
              <p className="text-xl font-bold text-[var(--text-primary)]">{rate.value}%</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium leading-tight">
                {rate.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

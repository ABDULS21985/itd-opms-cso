"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ExternalLink, Info, type LucideIcon } from "lucide-react";

interface KPIStatCardProps {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  isLoading: boolean;
  index?: number;
  suffix?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  subtitle?: string;
  href?: string;
  hint?: string;
}

export function KPIStatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  isLoading,
  index = 0,
  suffix = "",
  trend,
  trendValue,
  subtitle,
  href,
  hint,
}: KPIStatCardProps) {
  const [showHint, setShowHint] = useState(false);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#22C55E" : trend === "down" ? "#EF4444" : "var(--text-muted)";

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
      className={`relative rounded-xl border p-4 ${href ? "transition-all hover:shadow-md hover:border-[var(--primary)]/30 cursor-pointer group" : ""}`}
      style={{ backgroundColor: "var(--surface-0)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex items-center gap-1">
          {trend && (
            <>
              <TrendIcon size={12} style={{ color: trendColor }} />
              {trendValue && (
                <span className="text-[10px] font-medium" style={{ color: trendColor }}>
                  {trendValue}
                </span>
              )}
            </>
          )}
          {hint && (
            <button
              type="button"
              className="relative p-0.5 rounded-full transition-colors hover:bg-[var(--surface-2)]"
              onMouseEnter={() => setShowHint(true)}
              onMouseLeave={() => setShowHint(false)}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHint((p) => !p); }}
              aria-label={`Info: ${hint}`}
            >
              <Info size={13} className="text-[var(--text-muted)]" />
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 shadow-lg"
                  >
                    <p className="text-[11px] leading-relaxed text-[var(--text-secondary)] text-left font-normal normal-case tracking-normal">
                      {hint}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}
          {href && (
            <ExternalLink
              size={12}
              className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            />
          )}
        </div>
      </div>
      <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        {label}
      </span>
      {isLoading ? (
        <div className="h-8 w-16 rounded bg-[var(--surface-2)] animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color }}>
          {value ?? "--"}{suffix}
        </p>
      )}
      {subtitle && (
        <p className="text-[10px] text-[var(--text-muted)] mt-1">{subtitle}</p>
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
}

"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

interface EnhancedKPICardProps {
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
  children?: React.ReactNode;
  needsAttention?: boolean;
}

export function EnhancedKPICard({
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
  children,
  needsAttention = false,
}: EnhancedKPICardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "#22C55E"
      : trend === "down"
        ? "#EF4444"
        : "var(--text-muted)";

  // Generate a unique animation name based on the color to avoid collisions
  const pulseId = React.useId().replace(/:/g, "");

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
      className={[
        "rounded-xl border p-4 min-w-[200px]",
        href
          ? "transition-all hover:shadow-md hover:border-[var(--primary)]/30 cursor-pointer group"
          : "",
        needsAttention ? `enhanced-kpi-pulse-${pulseId}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      {needsAttention && (
        <style jsx>{`
          @keyframes kpi-attention-${pulseId} {
            0%,
            100% {
              box-shadow: 0 0 0 0 ${color}33;
            }
            50% {
              box-shadow: 0 0 12px 4px ${color}33;
            }
          }
          .enhanced-kpi-pulse-${pulseId} {
            animation: kpi-attention-${pulseId} 2s ease-in-out infinite;
          }
        `}</style>
      )}

      {/* Top row: icon + trend + external link */}
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
                <span
                  className="text-[10px] font-medium"
                  style={{ color: trendColor }}
                >
                  {trendValue}
                </span>
              )}
            </>
          )}
          {href && (
            <ExternalLink
              size={12}
              className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            />
          )}
        </div>
      </div>

      {/* Body: side-by-side when children are present, vertical otherwise */}
      {children ? (
        <div className="flex items-end justify-between gap-3">
          {/* Left column: label, value, subtitle */}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              {label}
            </span>
            {isLoading ? (
              <div className="h-8 w-16 rounded bg-[var(--surface-2)] animate-pulse mt-1" />
            ) : (
              <p
                className="text-2xl font-bold tabular-nums mt-0.5"
                style={{ color }}
              >
                {value ?? "--"}
                {suffix}
              </p>
            )}
            {subtitle && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right column: inline chart / widget */}
          <div className="flex-shrink-0">
            {isLoading ? (
              <div className="h-7 w-20 rounded bg-[var(--surface-2)] animate-pulse" />
            ) : (
              children
            )}
          </div>
        </div>
      ) : (
        <>
          <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            {label}
          </span>
          {isLoading ? (
            <div className="h-8 w-16 rounded bg-[var(--surface-2)] animate-pulse mt-1" />
          ) : (
            <p
              className="text-2xl font-bold tabular-nums mt-0.5"
              style={{ color }}
            >
              {value ?? "--"}
              {suffix}
            </p>
          )}
          {subtitle && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {subtitle}
            </p>
          )}
        </>
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
}

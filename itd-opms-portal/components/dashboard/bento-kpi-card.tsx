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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface BentoKPICardProps {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  color: string;
  size?: "hero" | "wide" | "compact";
  isLoading?: boolean;
  index?: number;
  suffix?: string;
  subtitle?: string;
  href?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  needsAttention?: boolean;
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Size Configuration Map                                             */
/* ------------------------------------------------------------------ */

const SIZE_CONFIG = {
  hero: {
    grid: "col-span-2 row-span-2",
    radius: "rounded-[20px]",
    padding: "p-6",
    iconBg: "w-12 h-12",
    iconSize: 28,
    valueText: "text-4xl",
    labelText: "text-xs",
    trendIconSize: 14,
    trendTextSize: "text-xs",
  },
  wide: {
    grid: "col-span-2",
    radius: "rounded-[16px]",
    padding: "p-5",
    iconBg: "w-10 h-10",
    iconSize: 22,
    valueText: "text-3xl",
    labelText: "text-[11px]",
    trendIconSize: 12,
    trendTextSize: "text-[11px]",
  },
  compact: {
    grid: "",
    radius: "rounded-[14px]",
    padding: "p-4",
    iconBg: "w-9 h-9",
    iconSize: 18,
    valueText: "text-2xl",
    labelText: "text-xs",
    trendIconSize: 11,
    trendTextSize: "text-[10px]",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getTrendColor(trend: "up" | "down" | "flat"): string {
  // "down" is green (less tickets = good), "up" is red (more = bad)
  if (trend === "down") return "#22C55E";
  if (trend === "up") return "#EF4444";
  return "var(--text-muted)";
}

function getTrendIcon(trend: "up" | "down" | "flat") {
  if (trend === "up") return TrendingUp;
  if (trend === "down") return TrendingDown;
  return Minus;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BentoKPICard({
  label,
  value,
  icon: Icon,
  color,
  size = "compact",
  isLoading = false,
  index = 0,
  suffix = "",
  subtitle,
  href,
  trend,
  trendValue,
  needsAttention = false,
  children,
}: BentoKPICardProps) {
  const cfg = SIZE_CONFIG[size];
  const pulseId = React.useId().replace(/:/g, "");

  /* ----- Trend ---------------------------------------------------- */
  const TrendIcon = trend ? getTrendIcon(trend) : null;
  const trendColor = trend ? getTrendColor(trend) : undefined;

  /* ----- Dynamic inline styles ------------------------------------ */
  const glassStyle: React.CSSProperties = {
    /* light-mode glass — overridden by CSS vars in dark mode */
    background: "rgba(255, 255, 255, 0.6)",
    WebkitBackdropFilter: "blur(20px)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    boxShadow:
      "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
    /* CSS variable for the conic gradient border */
    "--bento-color": color,
  } as React.CSSProperties;

  /* ----- CSS class list ------------------------------------------- */
  const cardClasses = [
    "relative overflow-hidden group/bento",
    cfg.grid,
    cfg.radius,
    cfg.padding,
    "transition-shadow duration-300 ease-out",
    "bento-glass-card", // dark-mode glass override target
    href ? "cursor-pointer" : "",
    needsAttention
      ? `bento-pulse-glow-${pulseId}`
      : "bento-breathe",
  ]
    .filter(Boolean)
    .join(" ");

  /* ================================================================ */
  /*  Render helpers                                                    */
  /* ================================================================ */

  const renderIcon = () => (
    <div
      className={`${cfg.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: `${color}18` }}
    >
      <Icon size={cfg.iconSize} style={{ color }} />
    </div>
  );

  const renderValue = () => {
    if (isLoading) {
      return (
        <div
          className={`${size === "hero" ? "h-11 w-24" : size === "wide" ? "h-9 w-20" : "h-8 w-16"} rounded-lg bg-[var(--surface-2)] skeleton-shimmer`}
        />
      );
    }
    return (
      <p
        className={`${cfg.valueText} font-bold tabular-nums leading-none`}
        style={{ color: "var(--text-primary)" }}
      >
        {value ?? "--"}
        {suffix && (
          <span className="text-[0.6em] font-semibold ml-0.5 opacity-70">
            {suffix}
          </span>
        )}
      </p>
    );
  };

  const renderLabel = () => (
    <span
      className={`${cfg.labelText} font-medium uppercase tracking-wider`}
      style={{ color: "var(--text-muted)" }}
    >
      {label}
    </span>
  );

  const renderSubtitle = () =>
    subtitle ? (
      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
        {subtitle}
      </p>
    ) : null;

  const renderTrend = () => {
    if (!trend || !TrendIcon || isLoading) return null;
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <TrendIcon size={cfg.trendIconSize} style={{ color: trendColor }} />
        {trendValue && (
          <span
            className={`${cfg.trendTextSize} font-medium`}
            style={{ color: trendColor }}
          >
            {trendValue}
          </span>
        )}
      </div>
    );
  };

  const renderExternalLink = () =>
    href ? (
      <ExternalLink
        size={12}
        className="text-[var(--text-muted)] opacity-0 group-hover/bento:opacity-100 transition-opacity absolute top-3 right-3"
      />
    ) : null;

  /* ================================================================ */
  /*  Layout by size                                                    */
  /* ================================================================ */

  const renderBody = () => {
    switch (size) {
      /* ---- HERO (2x2) -------------------------------------------- */
      case "hero":
        return (
          <div className="flex flex-col h-full">
            {/* Top section */}
            <div className="flex items-start justify-between mb-4">
              {renderIcon()}
              <div className="flex items-center gap-1.5">
                {renderTrend()}
                {renderExternalLink()}
              </div>
            </div>

            {/* Value + label */}
            <div className="mb-1">
              {renderLabel()}
              <div className="mt-1.5">{renderValue()}</div>
              {renderSubtitle()}
            </div>

            {/* Children / chart — takes remaining space */}
            {children && (
              <div className="flex-1 mt-4 min-h-0">
                {isLoading ? (
                  <div className="h-full w-full rounded-lg bg-[var(--surface-2)] skeleton-shimmer" />
                ) : (
                  children
                )}
              </div>
            )}
          </div>
        );

      /* ---- WIDE (1x2) -------------------------------------------- */
      case "wide":
        return (
          <div className="flex items-center gap-4">
            {/* Left: Icon */}
            {renderIcon()}

            {/* Middle: Value + Label */}
            <div className="flex flex-col min-w-0 flex-1">
              {renderLabel()}
              <div className="mt-1">{renderValue()}</div>
              {renderTrend()}
              {renderSubtitle()}
            </div>

            {/* Right: Children or external link */}
            {children ? (
              <div className="flex-shrink-0">
                {isLoading ? (
                  <div className="h-10 w-24 rounded-lg bg-[var(--surface-2)] skeleton-shimmer" />
                ) : (
                  children
                )}
              </div>
            ) : (
              renderExternalLink()
            )}
          </div>
        );

      /* ---- COMPACT (1x1) ----------------------------------------- */
      case "compact":
      default:
        return (
          <div className="flex flex-col">
            {/* Top row: icon + link */}
            <div className="flex items-center justify-between mb-3">
              {renderIcon()}
              {renderExternalLink()}
            </div>

            {/* Value */}
            {renderValue()}

            {/* Label */}
            <div className="mt-1.5">{renderLabel()}</div>

            {/* Trend */}
            {renderTrend()}

            {/* Subtitle */}
            {renderSubtitle()}

            {/* Optional inline children */}
            {children && !isLoading && (
              <div className="mt-3">{children}</div>
            )}
          </div>
        );
    }
  };

  /* ================================================================ */
  /*  Card shell                                                       */
  /* ================================================================ */

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        type: "spring",
        damping: 25,
      }}
      className={cardClasses}
      style={glassStyle}
    >
      {/* Animated gradient border overlay */}
      <div
        className="bento-gradient-border pointer-events-none absolute inset-[-1px] opacity-0 group-hover/bento:opacity-100 transition-opacity duration-500"
        style={
          {
            background: `conic-gradient(from var(--angle, 0deg), transparent 30%, ${color}40, transparent 70%)`,
            borderRadius: "inherit",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            padding: "1px",
          } as React.CSSProperties
        }
      />

      {/* Needs-attention pulsing glow — injected CSS */}
      {needsAttention && (
        <style>{`
          @keyframes bento-attention-${pulseId} {
            0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 0 0 0 ${color}00; }
            50% { box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 0 20px 6px ${color}33; }
          }
          .bento-pulse-glow-${pulseId} {
            animation: bento-attention-${pulseId} 2.5s ease-in-out infinite;
          }
        `}</style>
      )}

      {/* Card content */}
      {renderBody()}
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className={cfg.grid || undefined}>
        {card}
      </Link>
    );
  }

  return card;
}

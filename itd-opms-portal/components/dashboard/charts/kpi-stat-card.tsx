"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ExternalLink, type LucideIcon } from "lucide-react";

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
}: KPIStatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#22C55E" : trend === "down" ? "#EF4444" : "var(--text-muted)";

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
      className={`rounded-xl border p-4 ${href ? "transition-all hover:shadow-md hover:border-[var(--primary)]/30 cursor-pointer group" : ""}`}
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

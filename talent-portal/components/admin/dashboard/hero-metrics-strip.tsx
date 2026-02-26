"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { colorAlpha } from "@/lib/color-utils";
import type { MetricItem } from "./shared";

// ────────────────────────────────────────────────────────
// Animated counter hook
// ────────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion.current || target === 0) {
      setCount(target);
      return;
    }
    let start: number | null = null;
    let raf: number;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return count;
}

// ────────────────────────────────────────────────────────
// Sparkline data generator (deterministic)
// ────────────────────────────────────────────────────────

function generateSparkline(value: number, label: string): { v: number }[] {
  let seed = 0;
  for (let i = 0; i < label.length; i++) {
    seed = (seed + label.charCodeAt(i)) * 31;
  }
  const points: { v: number }[] = [];
  for (let i = 0; i < 7; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const variance = (seed / 233280 - 0.5) * 0.3;
    points.push({ v: Math.max(0, Math.round(value * (0.7 + i * 0.05 + variance))) });
  }
  return points;
}

// ────────────────────────────────────────────────────────
// Animation variants
// ────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ────────────────────────────────────────────────────────
// Metric Card
// ────────────────────────────────────────────────────────

function MetricCard({ metric }: { metric: MetricItem }) {
  const animatedValue = useAnimatedCounter(metric.value);
  const sparklineData = generateSparkline(metric.value, metric.label);
  const Icon = metric.icon;
  const isUp = metric.trendDirection === "up";

  return (
    <motion.div variants={item}>
      <Link
        href={metric.href}
        className={cn(
          "glass-card block rounded-2xl p-5 group relative overflow-hidden",
          "hover:border-[var(--glass-border)]",
        )}
      >
        {/* Gradient border glow on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${colorAlpha(metric.color, 0.03)}, ${colorAlpha(metric.color, 0.08)})`,
          }}
        />

        <div className="relative z-10">
          {/* Top row: icon + trend */}
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ backgroundColor: colorAlpha(metric.color, 0.07) }}
            >
              <Icon size={20} style={{ color: metric.color }} />
            </div>
            <div className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
              isUp ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--error)]/10 text-[var(--error)]",
            )}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {metric.trendValue}%
            </div>
          </div>

          {/* Value + sparkline */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-none tabular-nums">
                {animatedValue.toLocaleString()}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-medium">{metric.label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{metric.sub}</p>
            </div>
            <div className="w-[80px] h-[32px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={metric.color}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Hover arrow */}
        <ArrowUpRight
          size={14}
          className="absolute top-4 right-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors opacity-0 group-hover:opacity-100"
        />
      </Link>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────
// Hero Metrics Strip
// ────────────────────────────────────────────────────────

interface HeroMetricsStripProps {
  metrics: MetricItem[];
}

export function HeroMetricsStrip({ metrics }: HeroMetricsStripProps) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </motion.div>
  );
}

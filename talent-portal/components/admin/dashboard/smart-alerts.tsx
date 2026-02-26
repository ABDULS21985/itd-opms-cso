"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SmartAlert, AlertSeverity } from "./shared";

// ────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────

const severityConfig: Record<
  AlertSeverity,
  { bg: string; border: string; iconBg: string; iconColor: string; btnBg: string; btnText: string; icon: typeof AlertCircle }
> = {
  urgent: {
    bg: "bg-[var(--error)]/10",
    border: "border-red-200/60",
    iconBg: "bg-[var(--error)]/15",
    iconColor: "text-[var(--error)]",
    btnBg: "bg-[var(--error)] hover:bg-[var(--error)]/90",
    btnText: "text-white",
    icon: AlertCircle,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200/60",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    btnBg: "bg-amber-600 hover:bg-amber-700",
    btnText: "text-white",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-[var(--primary)]/10",
    border: "border-blue-200/60",
    iconBg: "bg-[var(--primary)]/15",
    iconColor: "text-[var(--primary)]",
    btnBg: "bg-[var(--primary)] hover:bg-[var(--primary)]/90",
    btnText: "text-white",
    icon: Info,
  },
};

// ────────────────────────────────────────────────────────
// Animation variants
// ────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────

interface SmartAlertsPanelProps {
  alerts: SmartAlert[];
}

export function SmartAlertsPanel({ alerts }: SmartAlertsPanelProps) {
  if (alerts.length === 0) return null;

  return (
    <motion.div
      className="space-y-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;

        return (
          <motion.div
            key={alert.id}
            variants={item}
            className={cn(
              "rounded-2xl border p-4 flex items-center justify-between gap-4",
              config.bg,
              config.border,
              alert.severity === "urgent" && "alert-urgent-pulse",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  config.iconBg,
                )}
              >
                <Icon size={18} className={config.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {alert.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{alert.description}</p>
              </div>
            </div>

            <Link
              href={alert.actionHref}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0",
                config.btnBg,
                config.btnText,
              )}
            >
              {alert.actionLabel}
              <ArrowRight size={12} />
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

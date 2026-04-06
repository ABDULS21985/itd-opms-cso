"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ArrowRight } from "lucide-react";

interface CriticalAlertsBannerProps {
  openP1Incidents: number;
  slaBreaches24h: number;
  criticalRisks: number;
}

export function CriticalAlertsBanner({
  openP1Incidents,
  slaBreaches24h,
  criticalRisks,
}: CriticalAlertsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const totalCritical = openP1Incidents + slaBreaches24h + criticalRisks;
  const isVisible = totalCritical > 0 && !dismissed;

  const pills: { label: string; count: number; href: string }[] = [
    {
      label: "P1 Incidents",
      count: openP1Incidents,
      href: "/dashboard/itsm?priority=P1",
    },
    {
      label: "SLA Breaches",
      count: slaBreaches24h,
      href: "/dashboard/itsm?tab=sla",
    },
    {
      label: "Critical Risks",
      count: criticalRisks,
      href: "/dashboard/grc/risks?severity=critical",
    },
  ].filter((p) => p.count > 0);

  return (
    <>
      <style jsx>{`
        @keyframes critical-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
          }
          50% {
            box-shadow: 0 0 20px 4px rgba(220, 38, 38, 0.25);
          }
        }
      `}</style>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="rounded-xl px-5 py-3"
              style={{
                background: "linear-gradient(135deg, #DC2626, #991B1B)",
                animation: "critical-pulse 2.5s ease-in-out infinite",
              }}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left: icon + message */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                  >
                    <AlertTriangle size={18} color="#fff" />
                  </div>
                  <span className="text-sm font-semibold text-white whitespace-nowrap">
                    {totalCritical} Critical Item{totalCritical !== 1 ? "s" : ""} Require{totalCritical === 1 ? "s" : ""} Attention
                  </span>
                </div>

                {/* Center: quick-action pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {pills.map((pill) => (
                    <Link key={pill.href} href={pill.href}>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white transition-colors cursor-pointer"
                        style={{ backgroundColor: "rgba(255, 255, 255, 0.18)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor =
                            "rgba(255, 255, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor =
                            "rgba(255, 255, 255, 0.18)";
                        }}
                      >
                        {pill.count} {pill.label}
                        <ArrowRight size={12} />
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Right: dismiss button */}
                <button
                  onClick={() => setDismissed(true)}
                  className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(255, 255, 255, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent";
                  }}
                  aria-label="Dismiss critical alerts"
                >
                  <X size={18} color="#fff" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  useExecutiveSummary,
  useMyTasks,
  useUpcomingEvents,
} from "@/hooks/use-reporting";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface AttentionItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  count: number;
  href: string;
  module: string;
  dismissed?: boolean;
}

interface AttentionQueueProps {
  className?: string;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const STORAGE_KEY = "opms-attention-queue-expanded";

const MODULE_COLORS: Record<string, string> = {
  ITSM: "#F59E0B",
  Planning: "#8B5CF6",
  GRC: "#EF4444",
  People: "#3B82F6",
  Assets: "#EF4444",
  Governance: "#1B7340",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function getStoredExpanded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

/* ================================================================== */
/*  Skeleton Row                                                       */
/* ================================================================== */

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="w-3 h-3 rounded-full skeleton-shimmer flex-shrink-0"
        style={{ backgroundColor: "var(--surface-0)" }}
      />
      <div className="flex-1 space-y-1.5">
        <div
          className="h-4 w-36 rounded skeleton-shimmer"
          style={{ backgroundColor: "var(--surface-0)" }}
        />
        <div
          className="h-3 w-52 rounded skeleton-shimmer"
          style={{ backgroundColor: "var(--surface-0)" }}
        />
      </div>
      <div
        className="h-7 w-20 rounded-md skeleton-shimmer flex-shrink-0"
        style={{ backgroundColor: "var(--surface-0)" }}
      />
    </div>
  );
}

/* ================================================================== */
/*  AttentionQueue Component                                           */
/* ================================================================== */

export function AttentionQueue({ className }: AttentionQueueProps) {
  /* ---- State ---------------------------------------------------- */
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  /* Hydrate expanded state from localStorage after mount */
  useEffect(() => {
    setIsExpanded(getStoredExpanded());
  }, []);

  /* Persist expanded state */
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  /* ---- Data ----------------------------------------------------- */
  const {
    data: execSummary,
    isLoading: execLoading,
  } = useExecutiveSummary();

  const {
    data: myTasks,
    isLoading: tasksLoading,
  } = useMyTasks();

  const {
    data: upcomingEvents,
    isLoading: eventsLoading,
  } = useUpcomingEvents();

  const isLoading = execLoading || tasksLoading || eventsLoading;

  /* ---- Build attention items ------------------------------------ */
  const items = useMemo<AttentionItem[]>(() => {
    const result: AttentionItem[] = [];

    /* Executive summary items */
    if (execSummary) {
      if (execSummary.openP1Incidents > 0) {
        result.push({
          id: "p1-incidents",
          title: `${execSummary.openP1Incidents} P1 ${pluralize("Incident", execSummary.openP1Incidents)}`,
          description: "Require immediate escalation",
          severity: "critical",
          count: execSummary.openP1Incidents,
          href: "/dashboard/itsm?priority=P1",
          module: "ITSM",
        });
      }

      if (execSummary.slaBreaches24h > 0) {
        result.push({
          id: "sla-breaches",
          title: `${execSummary.slaBreaches24h} SLA ${pluralize("Breach", execSummary.slaBreaches24h)}`,
          description: "Breached within the last 24 hours",
          severity: "critical",
          count: execSummary.slaBreaches24h,
          href: "/dashboard/itsm?tab=sla",
          module: "ITSM",
        });
      }

      if (execSummary.criticalRisks > 0) {
        result.push({
          id: "critical-risks",
          title: `${execSummary.criticalRisks} Critical ${pluralize("Risk", execSummary.criticalRisks)}`,
          description: "Require immediate mitigation",
          severity: "critical",
          count: execSummary.criticalRisks,
          href: "/dashboard/grc/risks?severity=critical",
          module: "GRC",
        });
      }

      if (
        execSummary.slaCompliancePct !== undefined &&
        execSummary.slaCompliancePct < 90
      ) {
        result.push({
          id: "sla-compliance",
          title: `SLA Compliance at ${execSummary.slaCompliancePct.toFixed(1)}%`,
          description: "Below 90% target threshold",
          severity: "warning",
          count: 1,
          href: "/dashboard/itsm?tab=sla",
          module: "ITSM",
        });
      }

      if (execSummary.overdueTrainingCerts > 0) {
        result.push({
          id: "overdue-training",
          title: `${execSummary.overdueTrainingCerts} Overdue Training ${pluralize("Cert", execSummary.overdueTrainingCerts)}`,
          description: "Staff certifications past due date",
          severity: "warning",
          count: execSummary.overdueTrainingCerts,
          href: "/dashboard/people?tab=training",
          module: "People",
        });
      }

      if (execSummary.warrantiesExpiring90Days > 0) {
        result.push({
          id: "warranties-expiring",
          title: `${execSummary.warrantiesExpiring90Days} ${pluralize("Warranty", execSummary.warrantiesExpiring90Days)} Expiring`,
          description: "Expiring within the next 90 days",
          severity: "info",
          count: execSummary.warrantiesExpiring90Days,
          href: "/dashboard/assets?tab=warranties",
          module: "Assets",
        });
      }
    }

    /* My Tasks items */
    if (myTasks) {
      if (myTasks.overdueItems.count > 0) {
        const firstHref =
          myTasks.overdueItems.items[0]?.href || "/dashboard/planning";
        result.push({
          id: "overdue-items",
          title: `${myTasks.overdueItems.count} Overdue ${pluralize("Item", myTasks.overdueItems.count)}`,
          description: "Past their due date and need action",
          severity: "warning",
          count: myTasks.overdueItems.count,
          href: firstHref,
          module: "Planning",
        });
      }

      if (myTasks.tasksDueThisWeek.count > 0) {
        const firstHref =
          myTasks.tasksDueThisWeek.items[0]?.href || "/dashboard/planning";
        result.push({
          id: "tasks-due-week",
          title: `${myTasks.tasksDueThisWeek.count} ${pluralize("Task", myTasks.tasksDueThisWeek.count)} Due This Week`,
          description: "Scheduled for completion this week",
          severity: "info",
          count: myTasks.tasksDueThisWeek.count,
          href: firstHref,
          module: "Planning",
        });
      }

      if (myTasks.pendingApprovals.count > 0) {
        const firstHref =
          myTasks.pendingApprovals.items[0]?.href || "/dashboard/planning";
        result.push({
          id: "pending-approvals",
          title: `${myTasks.pendingApprovals.count} Pending ${pluralize("Approval", myTasks.pendingApprovals.count)}`,
          description: "Awaiting your review and approval",
          severity: "info",
          count: myTasks.pendingApprovals.count,
          href: firstHref,
          module: "Governance",
        });
      }
    }

    /* Upcoming events within 3 days */
    if (upcomingEvents) {
      const now = new Date();
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000,
      );

      const urgentEvents = upcomingEvents.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate <= threeDaysFromNow && eventDate >= now;
      });

      if (urgentEvents.length > 0) {
        const firstHref = urgentEvents[0]?.href || "/dashboard/planning";
        result.push({
          id: "upcoming-deadlines",
          title: `${urgentEvents.length} Upcoming ${pluralize("Deadline", urgentEvents.length)}`,
          description: "Due within the next 3 days",
          severity: "info",
          count: urgentEvents.length,
          href: firstHref,
          module: "Planning",
        });
      }
    }

    /* Sort by severity: critical -> warning -> info */
    result.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );

    return result;
  }, [execSummary, myTasks, upcomingEvents]);

  /* ---- Filtered items (excluding dismissed) --------------------- */
  const visibleItems = useMemo(
    () => items.filter((item) => !dismissedIds.has(item.id)),
    [items, dismissedIds],
  );

  const dismissItem = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  /* ---- Summary counts for collapsed view ------------------------ */
  const criticalCount = visibleItems.filter(
    (i) => i.severity === "critical",
  ).length;
  const warningCount = visibleItems.filter(
    (i) => i.severity === "warning",
  ).length;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className}
      style={{
        background: "rgba(255, 255, 255, 0.6)",
        WebkitBackdropFilter: "blur(20px)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: "16px",
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* ---- Header ------------------------------------------------ */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={18} style={{ color: "var(--primary)" }} />
          <span className="text-sm font-semibold">What Needs Attention</span>

          {/* Badge with total count */}
          {!isLoading && visibleItems.length > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white"
              style={{
                backgroundColor:
                  criticalCount > 0
                    ? SEVERITY_COLORS.critical
                    : warningCount > 0
                      ? SEVERITY_COLORS.warning
                      : SEVERITY_COLORS.info,
              }}
            >
              {visibleItems.length}
            </span>
          )}

          {/* Collapsed summary text */}
          {!isExpanded && !isLoading && visibleItems.length > 0 && (
            <span
              className="text-xs ml-1"
              style={{ color: "var(--text-muted)" }}
            >
              {[
                criticalCount > 0
                  ? `${criticalCount} critical`
                  : null,
                warningCount > 0
                  ? `${warningCount} ${pluralize("warning", warningCount)}`
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 0 : 180 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />
        </motion.div>
      </button>

      {/* ---- Body -------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="attention-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-2 pb-3"
              style={{
                borderTop: "1px solid var(--border)",
              }}
            >
              {/* Loading skeletons */}
              {isLoading && (
                <div className="pt-1">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              )}

              {/* Empty state */}
              {!isLoading && visibleItems.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <CheckCircle2 size={20} style={{ color: "#22C55E" }} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    All systems operating normally
                  </span>
                </div>
              )}

              {/* Attention item rows */}
              {!isLoading && visibleItems.length > 0 && (
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 50, height: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: index * 0.05,
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl mt-1 group/item transition-colors"
                      style={{
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgba(0, 0, 0, 0.03)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "transparent";
                      }}
                    >
                      {/* Severity dot */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: SEVERITY_COLORS[item.severity],
                          boxShadow:
                            item.severity === "critical"
                              ? `0 0 8px ${SEVERITY_COLORS.critical}80`
                              : "none",
                        }}
                      />

                      {/* Center: text content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {item.description}
                        </p>
                        {/* Module chip */}
                        <span
                          className="inline-block mt-1 px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            fontSize: "10px",
                            lineHeight: "14px",
                            color:
                              MODULE_COLORS[item.module] || "var(--primary)",
                            backgroundColor: `${MODULE_COLORS[item.module] || "var(--primary)"}1A`,
                          }}
                        >
                          {item.module}
                        </span>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                          style={{
                            color: "var(--primary)",
                            backgroundColor: "rgba(27, 115, 64, 0.08)",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLElement
                            ).style.backgroundColor =
                              "rgba(27, 115, 64, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLElement
                            ).style.backgroundColor =
                              "rgba(27, 115, 64, 0.08)";
                          }}
                        >
                          Investigate
                          <ArrowRight size={12} />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissItem(item.id);
                          }}
                          className="p-1 rounded-md transition-colors opacity-0 group-hover/item:opacity-100"
                          style={{
                            color: "var(--text-muted)",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLElement
                            ).style.backgroundColor = "rgba(0, 0, 0, 0.06)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLElement
                            ).style.backgroundColor = "transparent";
                          }}
                          aria-label={`Dismiss ${item.title}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Calendar,
  LayoutGrid,
  List,
  Plus,
  CalendarDays,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  useInterviews,
  useScheduleInterview,
  useCancelInterview,
} from "@/hooks/use-interviews";
import { InterviewStatus } from "@/types/interview";
import type { Interview } from "@/types/interview";
import { InterviewCard } from "@/components/employer/interviews/interview-card";
import { CalendarView } from "@/components/employer/interviews/calendar-view";
import { AgendaView } from "@/components/employer/interviews/agenda-view";
import {
  ScheduleInterviewModal,
  type ScheduleFormData,
} from "@/components/employer/interviews/schedule-modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ViewMode = "cards" | "calendar" | "agenda";

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "cards", label: "Cards", icon: LayoutGrid },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "agenda", label: "Agenda", icon: List },
];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: InterviewStatus.SCHEDULED, label: "Scheduled" },
  { value: InterviewStatus.COMPLETED, label: "Completed" },
  { value: InterviewStatus.CANCELLED, label: "Cancelled" },
];

/* ------------------------------------------------------------------ */
/*  Stats Header                                                        */
/* ------------------------------------------------------------------ */

function StatsHeader({
  interviews,
  onViewToday,
}: {
  interviews: Interview[];
  onViewToday: () => void;
}) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const weekEnd = new Date(todayStart.getTime() + (7 - todayStart.getDay()) * 86400000);

  const upcoming = interviews.filter(
    (i) =>
      i.status === InterviewStatus.SCHEDULED &&
      new Date(i.scheduledAt) >= todayStart,
  ).length;

  const thisWeek = interviews.filter((i) => {
    const d = new Date(i.scheduledAt);
    return d >= todayStart && d < weekEnd;
  }).length;

  const completed = interviews.filter(
    (i) => i.status === InterviewStatus.COMPLETED,
  ).length;

  const cancelled = interviews.filter(
    (i) => i.status === InterviewStatus.CANCELLED,
  ).length;

  const todayCount = interviews.filter((i) => {
    const d = new Date(i.scheduledAt);
    return d >= todayStart && d < tomorrowStart && i.status === InterviewStatus.SCHEDULED;
  }).length;

  const stats = [
    {
      label: "Upcoming",
      value: upcoming,
      icon: CalendarDays,
      color: "text-[var(--accent-orange)]",
      bg: "bg-[var(--accent-orange)]/10",
    },
    {
      label: "This Week",
      value: thisWeek,
      icon: Calendar,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--primary)]/10",
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Cancelled",
      value: cancelled,
      icon: XCircle,
      color: "text-[var(--error)]",
      bg: "bg-[var(--error)]/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.bg}`}
                >
                  <Icon size={18} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-xs text-[var(--neutral-gray)]">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Today banner */}
      {todayCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between bg-[var(--accent-orange)]/5 border border-[var(--accent-orange)]/15 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--accent-orange)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              You have{" "}
              <span className="text-[var(--accent-orange)] font-semibold">
                {todayCount} interview{todayCount !== 1 ? "s" : ""}
              </span>{" "}
              today
            </p>
          </div>
          <button
            onClick={onViewToday}
            className="flex items-center gap-1 text-xs font-medium text-[var(--accent-orange)] hover:underline"
          >
            View Today
            <ArrowRight size={12} />
          </button>
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty States                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  statusFilter,
  onClearFilter,
  onSchedule,
}: {
  statusFilter: string;
  onClearFilter: () => void;
  onSchedule: () => void;
}) {
  if (statusFilter) {
    const label =
      statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--surface-2)] rounded-2xl flex items-center justify-center">
          <Calendar size={28} className="text-[var(--neutral-gray)]" />
        </div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
          No {label.toLowerCase()} interviews
        </h2>
        <p className="text-sm text-[var(--neutral-gray)] mb-4">
          There are no {label.toLowerCase()} interviews to display
        </p>
        <button
          onClick={onClearFilter}
          className="text-sm font-medium text-[var(--accent-orange)] hover:underline"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent-orange)]/10 rounded-2xl flex items-center justify-center">
        <CalendarDays size={28} className="text-[var(--accent-orange)]" />
      </div>
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        No interviews yet
      </h2>
      <p className="text-sm text-[var(--neutral-gray)] mb-4">
        Schedule your first interview to get started
      </p>
      <button
        onClick={onSchedule}
        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-[var(--accent-orange)] text-white rounded-xl hover:bg-[#E08A13] transition-colors"
      >
        <Plus size={16} />
        Schedule Interview
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                    */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] animate-pulse" />
              <div className="space-y-1.5">
                <div
                  className="h-6 w-10 bg-[var(--surface-2)] rounded animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
                <div className="h-3 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div
                  className="h-3.5 w-28 bg-[var(--surface-2)] rounded animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
                <div className="h-3 w-20 bg-[var(--surface-2)] rounded animate-pulse" />
              </div>
            </div>
            <div className="h-4 w-40 bg-[var(--surface-2)] rounded animate-pulse" />
            <div className="h-px bg-[var(--border)]" />
            <div className="flex gap-2">
              <div className="h-7 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-7 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function InterviewsPage() {
  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [statusFilter, setStatusFilter] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Data hooks
  const { data: interviewsData, isLoading } = useInterviews(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const scheduleInterview = useScheduleInterview();
  const cancelInterview = useCancelInterview();

  const interviews: Interview[] = useMemo(() => {
    const raw = (interviewsData as any)?.data || interviewsData || [];
    return Array.isArray(raw) ? raw : [];
  }, [interviewsData]);

  // ICS download
  const handleDownloadIcs = useCallback((id: string) => {
    const token = localStorage.getItem("token");
    const baseUrl =
      process.env.NEXT_PUBLIC_TALENT_API_URL || "http://localhost:4002/api/v1";
    window.open(
      `${baseUrl}/employer/interviews/${id}/ics?token=${token}`,
      "_blank",
    );
  }, []);

  // Schedule
  function handleSchedule(data: ScheduleFormData) {
    scheduleInterview.mutate(
      {
        candidateId: data.candidateId,
        scheduledAt: data.scheduledAt,
        type: data.type,
        duration: data.duration,
        jobId: data.jobId || undefined,
        location: data.location || undefined,
        meetingUrl: data.meetingUrl || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled successfully");
        },
        onError: () => {
          toast.error("Failed to schedule interview");
        },
      },
    );
  }

  // Cancel
  function handleCancelConfirm() {
    if (!cancelTarget) return;
    cancelInterview.mutate(
      { id: cancelTarget },
      {
        onSuccess: () => {
          toast.success("Interview cancelled");
          setCancelTarget(null);
        },
        onError: () => {
          toast.error("Failed to cancel interview");
          setCancelTarget(null);
        },
      },
    );
  }

  // View today shortcut
  function handleViewToday() {
    setViewMode("agenda");
    setStatusFilter(InterviewStatus.SCHEDULED);
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ */}
      {/*  Page Header                                                   */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Interviews
          </h1>
          <p className="text-sm text-[var(--neutral-gray)] mt-0.5">
            Manage and schedule candidate interviews
          </p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 bg-[var(--accent-orange)] text-white rounded-xl hover:bg-[#E08A13] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          Schedule Interview
        </button>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Stats Header                                                  */}
      {/* ------------------------------------------------------------ */}
      {!isLoading && interviews.length > 0 && (
        <StatsHeader interviews={interviews} onViewToday={handleViewToday} />
      )}

      {/* ------------------------------------------------------------ */}
      {/*  View Toggle + Filters                                         */}
      {/* ------------------------------------------------------------ */}
      {!isLoading && interviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((sf) => (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(sf.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === sf.value
                    ? "bg-[var(--accent-orange)] text-white"
                    : "bg-[var(--surface-0)] border border-[var(--border)] text-[var(--neutral-gray)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-[var(--surface-0)] border border-[var(--border)] rounded-lg p-0.5">
            {VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = viewMode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setViewMode(opt.value)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]"
                      : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
                  }`}
                  title={opt.label}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Content                                                       */}
      {/* ------------------------------------------------------------ */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : interviews.length === 0 ? (
        <EmptyState
          statusFilter={statusFilter}
          onClearFilter={() => setStatusFilter("")}
          onSchedule={() => setShowScheduleModal(true)}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {/* Card View */}
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviews.map((interview: Interview) => (
                  <InterviewCard
                    key={interview.id}
                    interview={interview}
                    onCancel={(id) => setCancelTarget(id)}
                    onDownloadIcs={handleDownloadIcs}
                  />
                ))}
              </div>
            )}

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <CalendarView interviews={interviews} />
            )}

            {/* Agenda View */}
            {viewMode === "agenda" && (
              <AgendaView
                interviews={interviews}
                onCancel={(id) => setCancelTarget(id)}
                onDownloadIcs={handleDownloadIcs}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Schedule Interview Modal                                      */}
      {/* ------------------------------------------------------------ */}
      <ScheduleInterviewModal
        open={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          scheduleInterview.reset();
        }}
        onSchedule={handleSchedule}
        isPending={scheduleInterview.isPending}
        isSuccess={scheduleInterview.isSuccess}
      />

      {/* ------------------------------------------------------------ */}
      {/*  Cancel Confirm Dialog                                         */}
      {/* ------------------------------------------------------------ */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Interview"
        message="Are you sure you want to cancel this interview? The candidate will be notified."
        confirmLabel="Cancel Interview"
        variant="danger"
        loading={cancelInterview.isPending}
      />
    </div>
  );
}

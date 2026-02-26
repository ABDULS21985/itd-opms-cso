"use client";

import { useState } from "react";
import {
  Video,
  MapPin,
  Phone,
  Download,
  Ban,
  Clock,
  ExternalLink,
  MessageSquare,
  RotateCcw,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { InterviewType, InterviewStatus } from "@/types/interview";
import type { Interview } from "@/types/interview";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const typeConfig: Record<
  string,
  { icon: typeof Video; label: string }
> = {
  [InterviewType.VIDEO]: { icon: Video, label: "Video Call" },
  [InterviewType.IN_PERSON]: { icon: Building2, label: "In-Person" },
  [InterviewType.PHONE]: { icon: Phone, label: "Phone" },
};

const statusConfig: Record<
  string,
  { ribbon: string; badge: string; label: string }
> = {
  [InterviewStatus.SCHEDULED]: {
    ribbon: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Scheduled",
  },
  [InterviewStatus.COMPLETED]: {
    ribbon: "bg-[var(--primary)]",
    badge: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
    label: "Completed",
  },
  [InterviewStatus.CANCELLED]: {
    ribbon: "bg-[var(--error)]",
    badge: "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20",
    label: "Cancelled",
  },
  [InterviewStatus.NO_SHOW]: {
    ribbon: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "No Show",
  },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const dayAfterTomorrow = new Date(todayStart.getTime() + 86400000 * 2);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const tz = Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;

  if (date >= todayStart && date < tomorrowStart) {
    return `Today, ${time}${tz ? ` ${tz}` : ""}`;
  }
  if (date >= tomorrowStart && date < dayAfterTomorrow) {
    return `Tomorrow, ${time}${tz ? ` ${tz}` : ""}`;
  }
  if (date >= yesterdayStart && date < todayStart) {
    return `Yesterday, ${time}${tz ? ` ${tz}` : ""}`;
  }

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${weekday}, ${monthDay}, ${time}`;
}

function isJoinable(interview: Interview): boolean {
  if (
    interview.type !== InterviewType.VIDEO ||
    interview.status !== InterviewStatus.SCHEDULED ||
    !interview.meetingUrl
  )
    return false;
  const now = Date.now();
  const scheduled = new Date(interview.scheduledAt).getTime();
  // Joinable 10 minutes before to 30 minutes after start
  return now >= scheduled - 10 * 60000 && now <= scheduled + 30 * 60000;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface InterviewCardProps {
  interview: Interview;
  onCancel: (id: string) => void;
  onReschedule?: (interview: Interview) => void;
  onFeedback?: (interview: Interview) => void;
  onDownloadIcs: (id: string) => void;
}

export function InterviewCard({
  interview,
  onCancel,
  onReschedule,
  onFeedback,
  onDownloadIcs,
}: InterviewCardProps) {
  const [hovered, setHovered] = useState(false);
  const status = statusConfig[interview.status] || statusConfig[InterviewStatus.SCHEDULED];
  const typeInfo = typeConfig[interview.type] || typeConfig[InterviewType.VIDEO];
  const TypeIcon = typeInfo.icon;
  const isCompleted = interview.status === InterviewStatus.COMPLETED;
  const isCancelled = interview.status === InterviewStatus.CANCELLED;
  const joinable = isJoinable(interview);

  return (
    <motion.div
      className={`relative bg-[var(--surface-0)] rounded-xl border border-[var(--border)] overflow-hidden transition-shadow ${
        isCompleted || isCancelled ? "opacity-75" : ""
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.15 }}
    >
      {/* Status ribbon */}
      <div className={`h-1 w-full ${status.ribbon}`} />

      <div className="p-4">
        {/* Top row: avatar + info + type icon */}
        <div className="flex items-start gap-3">
          {/* Candidate avatar */}
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {interview.candidate?.photoUrl ? (
              <img
                src={interview.candidate.photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-[var(--neutral-gray)]">
                {interview.candidate?.fullName?.charAt(0) || "?"}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {interview.candidate?.fullName || "Candidate"}
            </h3>
            <p className="text-xs text-[var(--neutral-gray)] truncate">
              {interview.job?.title || "General Interview"}
            </p>
          </div>

          {/* Type icon */}
          <div className="w-9 h-9 rounded-lg bg-[var(--surface-1)] flex items-center justify-center flex-shrink-0">
            <TypeIcon size={18} className="text-[var(--neutral-gray)]" />
          </div>
        </div>

        {/* Date/time — large, prominent */}
        <div className="mt-3">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {formatRelativeDate(interview.scheduledAt)}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-[var(--neutral-gray)]">
              <Clock size={11} />
              {interview.duration} min
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 font-medium ${status.badge}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Notes preview */}
        {interview.notes && (
          <p className="text-xs text-[var(--neutral-gray)] mt-2 line-clamp-2 leading-relaxed">
            {interview.notes}
          </p>
        )}

        {/* Actions bar */}
        <div
          className={`flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)] transition-opacity duration-150 ${
            hovered || joinable || isCompleted ? "opacity-100" : "opacity-60"
          }`}
        >
          {/* Join meeting — prominent when available */}
          {joinable && (
            <a
              href={interview.meetingUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--accent-orange)] text-white hover:bg-[#E08A13] transition-colors"
            >
              <ExternalLink size={12} />
              Join Meeting
            </a>
          )}

          {/* Completed: feedback CTA */}
          {isCompleted && !interview.feedback && onFeedback && (
            <button
              onClick={() => onFeedback(interview)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-colors"
            >
              <MessageSquare size={12} />
              Add Feedback
            </button>
          )}

          {/* Reschedule */}
          {interview.status === InterviewStatus.SCHEDULED && onReschedule && (
            <button
              onClick={() => onReschedule(interview)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-1)] transition-colors text-[var(--text-primary)]"
            >
              <RotateCcw size={11} />
              Reschedule
            </button>
          )}

          <div className="flex-1" />

          {/* ICS download */}
          <button
            onClick={() => onDownloadIcs(interview.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-1)] text-[var(--neutral-gray)] transition-colors"
            title="Download calendar invite"
          >
            <Download size={14} />
          </button>

          {/* Cancel */}
          {interview.status === InterviewStatus.SCHEDULED && (
            <button
              onClick={() => onCancel(interview.id)}
              className="p-1.5 rounded-lg hover:bg-[var(--error)]/5 text-[var(--error)] transition-colors"
              title="Cancel interview"
            >
              <Ban size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

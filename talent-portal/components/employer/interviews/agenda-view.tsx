"use client";

import { useMemo } from "react";
import {
  Video,
  Phone,
  Building2,
  Clock,
  ExternalLink,
  Download,
  Ban,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { InterviewType, InterviewStatus } from "@/types/interview";
import type { Interview } from "@/types/interview";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const statusDotColors: Record<string, string> = {
  [InterviewStatus.SCHEDULED]: "bg-emerald-500",
  [InterviewStatus.COMPLETED]: "bg-blue-500",
  [InterviewStatus.CANCELLED]: "bg-[var(--error)]",
  [InterviewStatus.NO_SHOW]: "bg-amber-500",
};

const statusLabels: Record<string, string> = {
  [InterviewStatus.SCHEDULED]: "Scheduled",
  [InterviewStatus.COMPLETED]: "Completed",
  [InterviewStatus.CANCELLED]: "Cancelled",
  [InterviewStatus.NO_SHOW]: "No Show",
};

const typeConfig: Record<string, { icon: typeof Video; label: string }> = {
  [InterviewType.VIDEO]: { icon: Video, label: "Video" },
  [InterviewType.IN_PERSON]: { icon: Building2, label: "In-Person" },
  [InterviewType.PHONE]: { icon: Phone, label: "Phone" },
};

interface DateGroup {
  label: string;
  interviews: Interview[];
}

function groupByDate(interviews: Interview[]): DateGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const thisWeekEnd = new Date(todayStart.getTime() + (7 - todayStart.getDay()) * 86400000);
  const nextWeekEnd = new Date(thisWeekEnd.getTime() + 7 * 86400000);

  const groups: DateGroup[] = [
    { label: "Overdue", interviews: [] },
    { label: "Today", interviews: [] },
    { label: "Tomorrow", interviews: [] },
    { label: "This Week", interviews: [] },
    { label: "Next Week", interviews: [] },
    { label: "Later", interviews: [] },
  ];

  const sorted = [...interviews].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  for (const iv of sorted) {
    const d = new Date(iv.scheduledAt);
    if (d < todayStart && iv.status === InterviewStatus.SCHEDULED) {
      groups[0].interviews.push(iv);
    } else if (d >= todayStart && d < tomorrowStart) {
      groups[1].interviews.push(iv);
    } else if (d >= tomorrowStart && d < new Date(tomorrowStart.getTime() + 86400000)) {
      groups[2].interviews.push(iv);
    } else if (d >= tomorrowStart && d < thisWeekEnd) {
      groups[3].interviews.push(iv);
    } else if (d >= thisWeekEnd && d < nextWeekEnd) {
      groups[4].interviews.push(iv);
    } else {
      groups[5].interviews.push(iv);
    }
  }

  return groups.filter((g) => g.interviews.length > 0);
}

/* ------------------------------------------------------------------ */
/*  Agenda Row                                                          */
/* ------------------------------------------------------------------ */

function AgendaRow({
  interview,
  onCancel,
  onDownloadIcs,
}: {
  interview: Interview;
  onCancel: (id: string) => void;
  onDownloadIcs: (id: string) => void;
}) {
  const date = new Date(interview.scheduledAt);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dayLabel = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const statusDot = statusDotColors[interview.status] || "bg-[var(--neutral-gray)]";
  const typeInfo = typeConfig[interview.type] || typeConfig[InterviewType.VIDEO];
  const TypeIcon = typeInfo.icon;
  const isCompleted = interview.status === InterviewStatus.COMPLETED;
  const isCancelled = interview.status === InterviewStatus.CANCELLED;
  const isScheduled = interview.status === InterviewStatus.SCHEDULED;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--surface-1)] transition-colors ${
        isCompleted || isCancelled ? "opacity-60" : ""
      }`}
    >
      {/* Time column */}
      <div className="w-20 flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{time}</p>
        <p className="text-[10px] text-[var(--neutral-gray)] sm:hidden">{dayLabel}</p>
      </div>

      {/* Timeline dot */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {interview.candidate?.photoUrl ? (
          <img
            src={interview.candidate.photoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-semibold text-[var(--neutral-gray)]">
            {interview.candidate?.fullName?.charAt(0) || "?"}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {interview.candidate?.fullName || "Candidate"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--neutral-gray)] truncate">
            {interview.job?.title || "General Interview"}
          </span>
          <span className="text-[var(--border)]">·</span>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--neutral-gray)]">
            <TypeIcon size={10} />
            {typeInfo.label}
          </span>
          <span className="text-[var(--border)]">·</span>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--neutral-gray)]">
            <Clock size={10} />
            {interview.duration}min
          </span>
        </div>
      </div>

      {/* Actions — show on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isScheduled && interview.type === InterviewType.VIDEO && interview.meetingUrl && (
          <a
            href={interview.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] transition-colors"
            title="Join meeting"
          >
            <ExternalLink size={14} />
          </a>
        )}
        {isCompleted && !interview.feedback && (
          <button
            className="p-1.5 rounded-lg hover:bg-[var(--primary)]/5 text-[var(--primary)] transition-colors"
            title="Add feedback"
          >
            <MessageSquare size={14} />
          </button>
        )}
        <button
          onClick={() => onDownloadIcs(interview.id)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
          title="Download ICS"
        >
          <Download size={14} />
        </button>
        {isScheduled && (
          <button
            onClick={() => onCancel(interview.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--error)]/5 text-[var(--error)] transition-colors"
            title="Cancel"
          >
            <Ban size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  AgendaView                                                          */
/* ------------------------------------------------------------------ */

interface AgendaViewProps {
  interviews: Interview[];
  onCancel: (id: string) => void;
  onDownloadIcs: (id: string) => void;
}

export function AgendaView({ interviews, onCancel, onDownloadIcs }: AgendaViewProps) {
  const groups = useMemo(() => groupByDate(interviews), [interviews]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-[var(--neutral-gray)] uppercase tracking-wider mb-2 px-3">
            {group.label}
            <span className="ml-2 text-[var(--neutral-gray)]/60">
              ({group.interviews.length})
            </span>
          </h3>
          <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
            {group.interviews.map((iv) => (
              <AgendaRow
                key={iv.id}
                interview={iv}
                onCancel={onCancel}
                onDownloadIcs={onDownloadIcs}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

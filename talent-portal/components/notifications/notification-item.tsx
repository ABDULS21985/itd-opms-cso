"use client";

import {
  CheckCircle,
  AlertCircle,
  Briefcase,
  UserCheck,
  UserX,
  Mail,
  Building2,
  TrendingUp,
  MessageSquare,
  Eye,
  Star,
  XCircle,
  Bell,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/date-utils";

const TYPE_ICONS: Record<string, any> = {
  profile_approved: CheckCircle,
  profile_needs_update: AlertCircle,
  profile_suspended: XCircle,
  intro_requested: Mail,
  intro_approved: UserCheck,
  intro_declined: UserX,
  intro_response: MessageSquare,
  application_received: Briefcase,
  application_viewed: Eye,
  application_shortlisted: Star,
  application_rejected: XCircle,
  job_published: Briefcase,
  job_rejected: XCircle,
  employer_verified: Building2,
  employer_rejected: XCircle,
  placement_update: TrendingUp,
  new_candidate: UserCheck,
  new_employer: Building2,
  admin_feedback: MessageSquare,
  system_alert: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  profile_approved: "text-emerald-500",
  profile_needs_update: "text-amber-500",
  profile_suspended: "text-[var(--error)]",
  intro_requested: "text-[var(--primary)]",
  intro_approved: "text-emerald-500",
  intro_declined: "text-[var(--error)]",
  intro_response: "text-[var(--primary)]",
  application_received: "text-[var(--primary)]",
  application_viewed: "text-[var(--neutral-gray)]",
  application_shortlisted: "text-amber-500",
  application_rejected: "text-[var(--error)]",
  job_published: "text-emerald-500",
  job_rejected: "text-[var(--error)]",
  employer_verified: "text-emerald-500",
  employer_rejected: "text-[var(--error)]",
  placement_update: "text-[var(--primary)]",
  new_candidate: "text-[var(--primary)]",
  new_employer: "text-[var(--primary)]",
  admin_feedback: "text-[var(--neutral-gray)]",
  system_alert: "text-amber-500",
};

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    link?: string | null;
    actionUrl?: string | null;
  };
  onMarkRead: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type] || Bell;
  const iconColor = TYPE_COLORS[notification.type] || "text-[var(--neutral-gray)]";

  return (
    <button
      onClick={onMarkRead}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--surface-1)] transition-colors ${
        !notification.isRead ? "bg-[var(--primary)]/5" : ""
      }`}
    >
      <div
        className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          !notification.isRead ? "bg-[var(--surface-0)] shadow-sm" : "bg-[var(--surface-1)]"
        }`}
      >
        <Icon size={16} className={iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm truncate ${
              !notification.isRead
                ? "font-semibold text-[#171717]"
                : "font-medium text-[var(--neutral-gray)]"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-[11px] text-[var(--neutral-gray)] flex-shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-[var(--neutral-gray)] mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>

      {!notification.isRead && (
        <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[var(--primary)]" />
      )}
    </button>
  );
}

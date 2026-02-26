"use client";

import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

/* ------------------------------------------------------------------ */
/*  Notification Item                                                  */
/* ------------------------------------------------------------------ */

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  return (
    <button
      onClick={onMarkRead}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--surface-2)] transition-colors ${
        !notification.isRead ? "bg-[var(--primary)]/5" : ""
      }`}
    >
      {/* Status dot */}
      <div className="mt-1.5 flex-shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            !notification.isRead
              ? "bg-[var(--primary)]"
              : "bg-[var(--neutral-gray)]/30"
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm truncate ${
              !notification.isRead
                ? "font-semibold text-[var(--text-primary)]"
                : "font-medium text-[var(--neutral-gray)]"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-[11px] text-[var(--neutral-gray)] flex-shrink-0 whitespace-nowrap">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-[var(--neutral-gray)] mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>
    </button>
  );
}

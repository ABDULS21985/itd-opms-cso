"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Inbox, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { useNotificationSocket } from "@/providers/notification-provider";
import { groupNotificationsByDate } from "@/lib/date-utils";
import { NotificationItem } from "./notification-item";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notificationCount = 0 } = useUnreadCount();
  const { data: notificationsData } = useNotifications(1);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const { lastNotification } = useNotificationSocket();

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  // Pulse animation on new notification
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (lastNotification) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastNotification]);

  const notifications = notificationsData?.data || [];
  const grouped = groupNotificationsByDate(notifications);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={pulse ? "animate-[wiggle_0.5s_ease-in-out_3]" : ""}
        />
        {notificationCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-in fade-in zoom-in">
            {notificationCount > 99 ? "99+" : notificationCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[400px] max-h-[520px] flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-0)] shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[#171717]">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {notificationCount > 0 && (
                  <button
                    onClick={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending}
                    className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline disabled:opacity-50"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--neutral-gray)]">
                  <Inbox size={36} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs mt-1 opacity-70">
                    We&apos;ll notify you when something happens
                  </p>
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.label}>
                    <div className="px-4 py-1.5 bg-[var(--surface-1)]">
                      <span className="text-[11px] font-medium text-[var(--neutral-gray)] uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {group.items.map((n: any) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onMarkRead={() => {
                            if (!n.isRead) {
                              markAsRead.mutate(n.id);
                            }
                            const url = n.actionUrl || n.link;
                            if (url) {
                              setOpen(false);
                              window.location.href = url;
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-[var(--border)] px-4 py-2.5">
                <a
                  href="/admin/settings/notifications"
                  className="text-xs text-[var(--primary)] hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Notification settings
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

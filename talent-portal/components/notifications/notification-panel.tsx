"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Inbox, Settings, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { useNotificationSocket } from "@/providers/notification-provider";
import { NotificationItem } from "./notification-item";

/* ------------------------------------------------------------------ */
/*  Bell trigger                                                       */
/* ------------------------------------------------------------------ */

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { data: notificationCount = 0 } = useUnreadCount();
  const { lastNotification } = useNotificationSocket();

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (lastNotification) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastNotification]);

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
      aria-label="Notifications"
    >
      <Bell
        size={20}
        className={pulse ? "animate-[wiggle_0.5s_ease-in-out_3]" : ""}
      />
      {notificationCount > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-in fade-in zoom-in">
          {notificationCount > 99 ? "99+" : notificationCount}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel (slide-out) component                                        */
/* ------------------------------------------------------------------ */

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const router = useRouter();
  const { data: notificationCount = 0 } = useUnreadCount();
  const { data: notificationsData } = useNotifications(1);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = notificationsData?.data || [];

  const unread = notifications.filter((n: any) => !n.isRead);
  const read = notifications.filter((n: any) => n.isRead);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  const handleNotificationClick = (n: any) => {
    if (!n.isRead) {
      markAsRead.mutate(n.id);
    }
    const url = n.actionUrl || n.link;
    if (url) {
      onOpenChange(false);
      router.push(url);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-[420px] bg-[var(--surface-1)] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    Notifications
                  </h2>
                  {notificationCount > 0 && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                      {notificationCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {notificationCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate()}
                      disabled={markAllAsRead.isPending}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/6 disabled:opacity-50 transition-colors"
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--neutral-gray)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--neutral-gray)]">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--surface-1)] flex items-center justify-center mb-4">
                    <Inbox size={28} className="opacity-40" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    No notifications yet
                  </p>
                  <p className="text-xs mt-1.5 text-[var(--neutral-gray)]">
                    We&apos;ll notify you when something happens
                  </p>
                </div>
              ) : (
                <>
                  {unread.length > 0 && (
                    <div>
                      <div className="px-5 py-2 bg-[var(--surface-1)]">
                        <span className="text-[11px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                          Unread ({unread.length})
                        </span>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {unread.map((n: any) => (
                          <NotificationItem
                            key={n.id}
                            notification={n}
                            onMarkRead={() => handleNotificationClick(n)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {read.length > 0 && (
                    <div>
                      <div className="px-5 py-2 bg-[var(--surface-1)]">
                        <span className="text-[11px] font-semibold text-[var(--neutral-gray)] uppercase tracking-wider">
                          Earlier
                        </span>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {read.map((n: any) => (
                          <NotificationItem
                            key={n.id}
                            notification={n}
                            onMarkRead={() => handleNotificationClick(n)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] px-5 py-3 flex-shrink-0">
              <a
                href="/admin/settings/notifications"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenChange(false);
                  router.push("/admin/settings/notifications");
                }}
                className="flex items-center gap-2 text-xs text-[var(--primary)] hover:underline"
              >
                <Settings size={13} />
                Notification settings
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

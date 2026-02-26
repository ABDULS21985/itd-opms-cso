"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useNotificationStream } from "@/providers/notification-provider";

/* ------------------------------------------------------------------ */
/*  Notification Bell                                                  */
/* ------------------------------------------------------------------ */

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { data: notificationCount = 0 } = useUnreadCount();
  const { lastNotification } = useNotificationStream();

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
        size={18}
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

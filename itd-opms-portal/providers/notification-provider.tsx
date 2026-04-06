"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface NotificationContextType {
  isConnected: boolean;
  lastNotification: any | null;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({
  isConnected: false,
  lastNotification: null,
  unreadCount: 0,
});

import { API_BASE_URL } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<any | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasRequestedPush = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 2000;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    // Handle "notification" events
    eventSource.addEventListener("notification", (event: MessageEvent) => {
      try {
        const notification = JSON.parse(event.data);
        setLastNotification(notification);
        setUnreadCount((prev) => prev + 1);

        // Invalidate React Query caches
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({
          queryKey: ["notifications-unread-count"],
        });

        // Show toast
        toast(notification.title, {
          description: notification.message,
          action: notification.actionUrl
            ? {
              label: "View",
              onClick: () => {
                window.location.href = notification.actionUrl;
              },
            }
            : undefined,
        });

        // Browser push notification if tab is hidden
        if (
          typeof document !== "undefined" &&
          document.hidden &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification(notification.title, {
            body: notification.message,
            icon: "/favicon.ico",
          });
        }

        // Request browser notification permission on first real-time notification
        if (
          !hasRequestedPush.current &&
          typeof Notification !== "undefined" &&
          Notification.permission === "default"
        ) {
          hasRequestedPush.current = true;
          toast("Enable notifications?", {
            description:
              "Get browser notifications for important updates when this tab is in the background.",
            action: {
              label: "Enable",
              onClick: () => {
                Notification.requestPermission();
              },
            },
            duration: 10000,
          });
        }
      } catch {
        // Silently handle malformed event data
      }
    });

    // Handle "ping" keep-alive events
    eventSource.addEventListener("ping", () => {
      // Keep-alive — nothing to do
    });

    // Handle errors and auto-reconnect with exponential backoff
    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
          30000,
        );
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    eventSourceRef.current = eventSource;
  }, [queryClient]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      cleanup();
      return;
    }

    connect();

    return () => {
      cleanup();
    };
  }, [isLoggedIn, user, connect, cleanup]);

  // Sync unreadCount when React Query cache changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event?.query?.queryKey?.[0] === "notifications-unread-count" &&
        event?.query?.state?.data !== undefined
      ) {
        setUnreadCount(event.query.state.data as number);
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  return (
    <NotificationContext.Provider
      value={{ isConnected, lastNotification, unreadCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationStream = () => useContext(NotificationContext);

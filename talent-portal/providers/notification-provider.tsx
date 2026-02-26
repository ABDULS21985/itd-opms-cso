"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth";
import { toast } from "sonner";

interface NotificationContextType {
  isConnected: boolean;
  lastNotification: any | null;
}

const NotificationContext = createContext<NotificationContextType>({
  isConnected: false,
  lastNotification: null,
});

const WS_URL =
  process.env.NEXT_PUBLIC_TALENT_API_WS_URL || "http://localhost:4002";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<any | null>(null);
  const hasRequestedPush = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = getToken();
    if (!token) return;

    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", () => {
      // Silently handle — server may not be running
    });

    socket.on("notification", (notification: any) => {
      setLastNotification(notification);

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
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, user, queryClient]);

  return (
    <NotificationContext.Provider value={{ isConnected, lastNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationSocket = () => useContext(NotificationContext);

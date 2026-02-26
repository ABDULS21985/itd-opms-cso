import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/types/api";

// ──────────────────────────────────────────────
// Notification types
// ──────────────────────────────────────────────

export interface Notification {
  id: string;
  createdAt: string;
  updatedAt: string;

  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
}

// ──────────────────────────────────────────────
// Notification queries
// ──────────────────────────────────────────────

export function useNotifications(page?: number) {
  return useQuery({
    queryKey: ["notifications", page],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Notification>>("/me/notifications", {
        page,
      }),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const result = await apiClient.get<{ count: number }>(
        "/me/notifications/unread-count",
      );
      return result.count;
    },
    refetchInterval: (query) =>
      query.state.status === "error" ? false : 30_000,
    retry: false,
  });
}

// ──────────────────────────────────────────────
// Notification mutations
// ──────────────────────────────────────────────

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.put(`/me/notifications/${notificationId}/read`),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData([
        "notifications",
        1,
      ]);
      const previousCount = queryClient.getQueryData([
        "notifications-unread-count",
      ]);

      // Optimistic update: mark as read in cache
      queryClient.setQueryData(["notifications", 1], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((n: Notification) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n,
          ),
        };
      });

      // Decrement unread count
      queryClient.setQueryData(
        ["notifications-unread-count"],
        (old: number | undefined) => Math.max(0, (old || 0) - 1),
      );

      return { previousNotifications, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications", 1],
          context.previousNotifications,
        );
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          ["notifications-unread-count"],
          context.previousCount,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.put("/me/notifications/read-all"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData([
        "notifications",
        1,
      ]);

      // Optimistic: mark all as read
      queryClient.setQueryData(["notifications", 1], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((n: Notification) => ({
            ...n,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
        };
      });

      queryClient.setQueryData(["notifications-unread-count"], 0);

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications", 1],
          context.previousNotifications,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

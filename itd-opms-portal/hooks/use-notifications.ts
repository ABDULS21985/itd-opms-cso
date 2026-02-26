import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Notification,
  NotificationPreferences,
  PaginatedResponse,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/**
 * GET /notifications - paginated list of notifications.
 */
export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["notifications", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Notification>>("/notifications", {
        page,
        limit,
      }),
  });
}

/**
 * GET /notifications/unread-count - returns the unread notification count.
 * Polls every 60 seconds as a fallback when SSE is not connected.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const result = await apiClient.get<{ count: number }>(
        "/notifications/unread-count",
      );
      return result.count;
    },
    refetchInterval: (query) =>
      query.state.status === "error" ? false : 60_000,
    retry: false,
  });
}

/**
 * GET /notifications/preferences - user notification preferences.
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () =>
      apiClient.get<NotificationPreferences>("/notifications/preferences"),
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/**
 * POST /notifications/{id}/read - mark a single notification as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.post(`/notifications/${notificationId}/read`),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData([
        "notifications",
        1,
        20,
      ]);
      const previousCount = queryClient.getQueryData([
        "notifications-unread-count",
      ]);

      // Optimistic update: mark as read in cache
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((n: Notification) =>
              n.id === notificationId
                ? { ...n, isRead: true, readAt: new Date().toISOString() }
                : n,
            ),
          };
        },
      );

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
          ["notifications", 1, 20],
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

/**
 * POST /notifications/read-all - mark all notifications as read.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/notifications/read-all"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData([
        "notifications",
        1,
        20,
      ]);

      // Optimistic: mark all as read
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((n: Notification) => ({
              ...n,
              isRead: true,
              readAt: new Date().toISOString(),
            })),
          };
        },
      );

      queryClient.setQueryData(["notifications-unread-count"], 0);

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications", 1, 20],
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

/**
 * PUT /notifications/preferences - update notification preferences.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      apiClient.put("/notifications/preferences", preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notification-preferences"],
      });
    },
  });
}

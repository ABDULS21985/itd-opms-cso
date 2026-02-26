import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type NotificationChannel = "in_app" | "email" | "both" | "none";
export type EmailDigestFrequency = "immediate" | "daily" | "weekly" | "none";

export interface NotificationPreferences {
  id: string;
  userId: string;
  preferences: Record<string, NotificationChannel>;
  emailDigest: EmailDigestFrequency;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  browserPushEnabled: boolean;
}

export interface UpdateNotificationPreferencesPayload {
  preferences?: Record<string, NotificationChannel>;
  emailDigest?: EmailDigestFrequency;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  browserPushEnabled?: boolean;
}

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const result = await apiClient.get<{ data: NotificationPreferences }>(
        "/me/notification-preferences",
      );
      return result.data;
    },
  });
}

// ──────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateNotificationPreferencesPayload) =>
      apiClient.put("/me/notification-preferences", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Notification preferences saved");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save preferences");
    },
  });
}

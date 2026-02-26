import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ActivityLog } from "@/types/activity";

export function useActivityFeed(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["activity-feed", page, limit],
    queryFn: () =>
      apiClient.get<{ data: ActivityLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        "/employer/activity",
        { page, limit },
      ),
  });
}

export function useCandidateActivity(candidateId: string | null, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["candidate-activity", candidateId, page],
    queryFn: () =>
      apiClient.get<{ data: ActivityLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        `/employer/activity/candidate/${candidateId}`,
        { page, limit },
      ),
    enabled: !!candidateId,
  });
}

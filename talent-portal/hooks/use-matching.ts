import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/types/api";
import type {
  CandidateRecommendation,
  JobRecommendation,
  MatchStats,
  MatchExplanation,
} from "@/types/matching";

// ──────────────────────────────────────────────
// Employer recommendation hooks
// ──────────────────────────────────────────────

export function useRecommendedCandidates(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["recommended-candidates", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CandidateRecommendation>>(
        "/employers/me/recommendations",
        filters,
      ),
  });
}

export function useRecommendedCandidatesForJob(
  jobId: string,
  filters?: Record<string, any>,
) {
  return useQuery({
    queryKey: ["recommended-candidates-job", jobId, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CandidateRecommendation>>(
        `/employers/me/recommendations/jobs/${jobId}`,
        filters,
      ),
    enabled: !!jobId,
  });
}

// ──────────────────────────────────────────────
// Candidate recommendation hooks
// ──────────────────────────────────────────────

export function useRecommendedJobs(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["recommended-jobs", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<JobRecommendation>>(
        "/me/recommended-jobs",
        filters,
      ),
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/me/recommended-jobs/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommended-jobs"] });
    },
  });
}

// ──────────────────────────────────────────────
// Admin hooks
// ──────────────────────────────────────────────

export function useMatchStats() {
  return useQuery({
    queryKey: ["match-stats"],
    queryFn: () => apiClient.get<MatchStats>("/admin/matching/stats"),
  });
}

export function useRecomputeMatches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string; jobsProcessed: number; totalMatches: number }>(
        "/admin/matching/recompute",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommended-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recommended-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["match-stats"] });
    },
  });
}

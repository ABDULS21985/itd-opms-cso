import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { IntroRequest, CandidateIntroResponse } from "@/types/intro-request";
import type { PaginatedResponse } from "@/types/api";

// ──────────────────────────────────────────────
// Employer intro requests
// ──────────────────────────────────────────────

export function useEmployerIntroRequests(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["employer-intro-requests", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<IntroRequest>>(
        "/employers/intro-requests",
        filters,
      ),
  });
}

export function useCreateIntroRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      candidateId: string;
      jobId?: string;
      roleTitle: string;
      roleDescription: string;
      desiredStartDate?: string;
      workMode?: string;
      locationExpectation?: string;
      notesToPlacementUnit?: string;
    }) => apiClient.post<IntroRequest>("/employers/intro-requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-intro-requests"] });
    },
  });
}

// ──────────────────────────────────────────────
// Candidate intro requests
// ──────────────────────────────────────────────

export function useCandidateIntroRequests(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["candidate-intro-requests", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<IntroRequest>>(
        "/me/intro-requests",
        filters,
      ),
  });
}

export function useRespondToIntro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      introRequestId,
      response,
    }: {
      introRequestId: string;
      response: CandidateIntroResponse;
    }) =>
      apiClient.put<IntroRequest>(
        `/me/intro-requests/${introRequestId}/respond`,
        { response },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-intro-requests"] });
    },
  });
}

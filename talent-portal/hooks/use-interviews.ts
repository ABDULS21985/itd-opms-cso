import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Interview } from "@/types/interview";

export function useInterviews(filters?: {
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["interviews", filters],
    queryFn: () =>
      apiClient.get<{ data: Interview[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        "/employer/interviews",
        filters,
      ),
  });
}

export function useInterview(id: string | null) {
  return useQuery({
    queryKey: ["interview", id],
    queryFn: () => apiClient.get<Interview>(`/employer/interviews/${id}`),
    enabled: !!id,
  });
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      candidateId: string;
      scheduledAt: string;
      type: string;
      duration?: number;
      jobId?: string;
      pipelineCandidateId?: string;
      location?: string;
      meetingUrl?: string;
      notes?: string;
    }) => apiClient.post<Interview>("/employer/interviews", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      scheduledAt?: string;
      type?: string;
      duration?: number;
      location?: string;
      meetingUrl?: string;
      notes?: string;
      feedback?: string;
    }) => apiClient.put<Interview>(`/employer/interviews/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}

export function useCancelInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post<Interview>(`/employer/interviews/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}

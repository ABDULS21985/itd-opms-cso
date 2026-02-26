import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { HiringPipeline, PipelineWithCandidates, PipelineCandidate } from "@/types/pipeline";

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: () => apiClient.get<HiringPipeline[]>("/employer/pipelines"),
  });
}

export function usePipeline(id: string | null) {
  return useQuery({
    queryKey: ["pipeline", id],
    queryFn: () => apiClient.get<PipelineWithCandidates>(`/employer/pipelines/${id}`),
    enabled: !!id,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; isDefault?: boolean }) =>
      apiClient.post<HiringPipeline>("/employer/pipelines", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}

export function useAddCandidateToPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pipelineId,
      ...data
    }: {
      pipelineId: string;
      candidateId: string;
      stageId?: string;
      matchScore?: number;
      notes?: string;
    }) => apiClient.post<PipelineCandidate>(`/employer/pipelines/${pipelineId}/candidates`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", variables.pipelineId] });
    },
  });
}

export function useMovePipelineCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pipelineId,
      candidateId,
      stageId,
    }: {
      pipelineId: string;
      candidateId: string;
      stageId: string;
    }) =>
      apiClient.put<PipelineCandidate>(
        `/employer/pipelines/${pipelineId}/candidates/${candidateId}/move`,
        { stageId },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", variables.pipelineId] });
    },
  });
}

export function useRemovePipelineCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pipelineId,
      candidateId,
    }: {
      pipelineId: string;
      candidateId: string;
    }) => apiClient.delete(`/employer/pipelines/${pipelineId}/candidates/${candidateId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", variables.pipelineId] });
    },
  });
}

export function useUpdatePipelineStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pipelineId,
      stages,
    }: {
      pipelineId: string;
      stages: { id: string; name: string; order: number; color: string }[];
    }) => apiClient.put(`/employer/pipelines/${pipelineId}/stages`, { stages }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", variables.pipelineId] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CandidateNote } from "@/types/activity";

export function useCandidateNotes(candidateId: string | null) {
  return useQuery({
    queryKey: ["candidate-notes", candidateId],
    queryFn: () => apiClient.get<CandidateNote[]>(`/employer/notes/candidate/${candidateId}`),
    enabled: !!candidateId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      candidateId: string;
      content: string;
      mentionedUserIds?: string[];
    }) => apiClient.post<CandidateNote>("/employer/notes", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", variables.candidateId] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string; candidateId: string }) =>
      apiClient.put<CandidateNote>(`/employer/notes/${id}`, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", variables.candidateId] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; candidateId: string }) =>
      apiClient.delete(`/employer/notes/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", variables.candidateId] });
    },
  });
}

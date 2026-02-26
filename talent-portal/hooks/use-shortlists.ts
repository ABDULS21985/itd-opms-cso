import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ShortlistCandidate {
  id: string;
  candidateId: string;
  fullName: string;
  slug: string;
  photoUrl: string | null;
  track: string | null;
  city: string | null;
  country: string | null;
}

export interface Shortlist {
  id: string;
  name: string;
  description: string | null;
  candidateCount: number;
  createdAt: string;
  candidates?: ShortlistCandidate[];
}

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

export function useShortlists() {
  return useQuery({
    queryKey: ["employer-shortlists"],
    queryFn: () => apiClient.get<Shortlist[]>("/employers/me/shortlists"),
  });
}

export function useShortlistCandidates(shortlistId: string | null) {
  return useQuery({
    queryKey: ["shortlist-candidates", shortlistId],
    queryFn: () =>
      apiClient.get<ShortlistCandidate[]>(
        `/employers/me/shortlists/${shortlistId}/candidates`
      ),
    enabled: !!shortlistId,
  });
}

// ──────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────

export function useCreateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post<Shortlist>("/employers/me/shortlists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-shortlists"] });
    },
  });
}

export function useDeleteShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shortlistId: string) =>
      apiClient.delete(`/employers/me/shortlists/${shortlistId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-shortlists"] });
    },
  });
}

export function useAddToShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shortlistId,
      candidateId,
    }: {
      shortlistId: string;
      candidateId: string;
    }) =>
      apiClient.post(
        `/employers/me/shortlists/${shortlistId}/candidates`,
        { candidateId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-shortlists"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist-candidates"] });
    },
  });
}

export function useRemoveFromShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shortlistId,
      candidateId,
    }: {
      shortlistId: string;
      candidateId: string;
    }) =>
      apiClient.delete(
        `/employers/me/shortlists/${shortlistId}/candidates/${candidateId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-shortlists"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist-candidates"] });
    },
  });
}

export function useMoveToShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fromShortlistId,
      toShortlistId,
      candidateId,
    }: {
      fromShortlistId: string;
      toShortlistId: string;
      candidateId: string;
    }) => {
      await apiClient.post(
        `/employers/me/shortlists/${toShortlistId}/candidates`,
        { candidateId }
      );
      await apiClient.delete(
        `/employers/me/shortlists/${fromShortlistId}/candidates/${candidateId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-shortlists"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist-candidates"] });
    },
  });
}

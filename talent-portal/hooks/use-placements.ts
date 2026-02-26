import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PlacementRecord, PlacementStatus } from "@/types/placement";
import type { PaginatedResponse } from "@/types/api";

// ──────────────────────────────────────────────
// Admin placement browsing
// ──────────────────────────────────────────────

export interface PlacementFilters {
  status?: PlacementStatus;
  candidateId?: string;
  employerId?: string;
  page?: number;
  limit?: number;
}

export function usePlacements(filters?: PlacementFilters) {
  return useQuery({
    queryKey: ["placements", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PlacementRecord>>(
        "/admin/placements",
        filters as Record<string, string | number | boolean | undefined>,
      ),
  });
}

export function usePlacement(id: string) {
  return useQuery({
    queryKey: ["placement", id],
    queryFn: () => apiClient.get<PlacementRecord>(`/admin/placements/${id}`),
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────
// Admin placement mutations
// ──────────────────────────────────────────────

export function useCreatePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PlacementRecord>) =>
      apiClient.post<PlacementRecord>("/admin/placements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placements"] });
    },
  });
}

export function useUpdatePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PlacementRecord>;
    }) => apiClient.put<PlacementRecord>(`/admin/placements/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({
        queryKey: ["placement", variables.id],
      });
    },
  });
}

export function useUpdatePlacementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: PlacementStatus;
      notes?: string;
    }) =>
      apiClient.put<PlacementRecord>(`/admin/placements/${id}/status`, {
        status,
        notes,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["placements"] });
      queryClient.invalidateQueries({
        queryKey: ["placement", variables.id],
      });
    },
  });
}

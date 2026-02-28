import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

export interface HeatmapProject {
  id: string;
  title: string;
  pct: number;
}

export interface HeatmapCell {
  period: string;
  allocationPct: number;
  projectCount: number;
  projects: HeatmapProject[];
}

export interface HeatmapRow {
  id: string;
  label: string;
  cells: HeatmapCell[];
  averageLoad: number;
}

export interface HeatmapSummary {
  totalUsers: number;
  overAllocatedUsers: number;
  underUtilizedUsers: number;
  averageUtilization: number;
}

export interface HeatmapResponse {
  periods: string[];
  rows: HeatmapRow[];
  summary: HeatmapSummary;
}

export interface AllocationEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  projectId: string;
  projectTitle: string;
  allocationPct: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationFilters {
  userId?: string;
  projectId?: string;
  start?: string;
  end?: string;
  page?: number;
  limit?: number;
}

export interface CreateAllocationBody {
  userId: string;
  projectId: string;
  allocationPct: number;
  periodStart: string;
  periodEnd: string;
}

export interface UpdateAllocationBody {
  allocationPct?: number;
  periodStart?: string;
  periodEnd?: string;
}

interface PaginatedAllocations {
  data: AllocationEntry[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/* ================================================================== */
/*  Capacity Heatmap — Query                                            */
/* ================================================================== */

/**
 * GET /people/capacity/heatmap — fetch the resource capacity heatmap.
 */
export function useCapacityHeatmap(
  start: string,
  end: string,
  groupBy: "user" | "project" = "user",
  granularity: "week" | "month" = "month",
) {
  return useQuery({
    queryKey: ["capacity-heatmap", start, end, groupBy, granularity],
    queryFn: () =>
      apiClient.get<HeatmapResponse>("/people/capacity/heatmap", {
        start,
        end,
        group_by: groupBy,
        granularity,
      }),
    enabled: !!start && !!end,
  });
}

/* ================================================================== */
/*  Allocations — Query                                                 */
/* ================================================================== */

/**
 * GET /people/capacity/allocations — paginated list of enriched allocations.
 */
export function useAllocations(filters?: AllocationFilters) {
  return useQuery({
    queryKey: ["capacity-heatmap-allocations", filters],
    queryFn: () =>
      apiClient.get<PaginatedAllocations>("/people/capacity/allocations", {
        user_id: filters?.userId,
        project_id: filters?.projectId,
        start: filters?.start,
        end: filters?.end,
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 20,
      }),
  });
}

/* ================================================================== */
/*  Allocations — Mutations                                             */
/* ================================================================== */

/**
 * POST /people/capacity/allocations — create a new allocation.
 */
export function useCreateAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAllocationBody) =>
      apiClient.post<AllocationEntry>("/people/capacity/allocations", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-heatmap"] });
      queryClient.invalidateQueries({
        queryKey: ["capacity-heatmap-allocations"],
      });
      queryClient.invalidateQueries({ queryKey: ["capacity-allocations"] });
      toast.success("Allocation created successfully");
    },
    onError: () => {
      toast.error("Failed to create allocation");
    },
  });
}

/**
 * PUT /people/capacity/allocations/{id} — update an allocation.
 */
export function useUpdateAllocation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAllocationBody) =>
      apiClient.put<AllocationEntry>(
        `/people/capacity/allocations/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-heatmap"] });
      queryClient.invalidateQueries({
        queryKey: ["capacity-heatmap-allocations"],
      });
      queryClient.invalidateQueries({ queryKey: ["capacity-allocations"] });
      toast.success("Allocation updated successfully");
    },
    onError: () => {
      toast.error("Failed to update allocation");
    },
  });
}

/**
 * DELETE /people/capacity/allocations/{id} — delete an allocation.
 */
export function useDeleteAllocation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.delete(`/people/capacity/allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-heatmap"] });
      queryClient.invalidateQueries({
        queryKey: ["capacity-heatmap-allocations"],
      });
      queryClient.invalidateQueries({ queryKey: ["capacity-allocations"] });
      toast.success("Allocation deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete allocation");
    },
  });
}

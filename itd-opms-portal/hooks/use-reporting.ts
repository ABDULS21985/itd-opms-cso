import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  ExecutiveSummary,
  ChartDataPoint,
  SLAComplianceRate,
  ReportDefinition,
  ReportRun,
  GlobalSearchResults,
  SavedSearch,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  Executive Dashboard — Queries                                        */
/* ================================================================== */

/**
 * GET /reporting/dashboards/executive - executive summary KPIs.
 */
export function useExecutiveSummary() {
  return useQuery({
    queryKey: ["executive-summary"],
    queryFn: () =>
      apiClient.get<ExecutiveSummary>("/reporting/dashboards/executive"),
  });
}

/**
 * GET /reporting/dashboards/my - current user's personal dashboard.
 */
export function useMyDashboard() {
  return useQuery({
    queryKey: ["my-dashboard"],
    queryFn: () =>
      apiClient.get<Record<string, unknown>>("/reporting/dashboards/my"),
  });
}

/**
 * GET /reporting/dashboards/charts/tickets-by-priority - ticket distribution by priority.
 */
export function useTicketsByPriority() {
  return useQuery({
    queryKey: ["chart-tickets-by-priority"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/tickets-by-priority",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/tickets-by-status - ticket distribution by status.
 */
export function useTicketsByStatus() {
  return useQuery({
    queryKey: ["chart-tickets-by-status"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/tickets-by-status",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/projects-by-status - project distribution by status.
 */
export function useProjectsByStatus() {
  return useQuery({
    queryKey: ["chart-projects-by-status"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/projects-by-status",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/assets-by-type - asset distribution by type.
 */
export function useAssetsByType() {
  return useQuery({
    queryKey: ["chart-assets-by-type"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/assets-by-type",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/assets-by-status - asset distribution by status.
 */
export function useAssetsByStatus() {
  return useQuery({
    queryKey: ["chart-assets-by-status"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/assets-by-status",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/sla-compliance - SLA compliance rate.
 */
export function useSLACompliance(since?: string) {
  return useQuery({
    queryKey: ["chart-sla-compliance", since],
    queryFn: () =>
      apiClient.get<SLAComplianceRate>(
        "/reporting/dashboards/charts/sla-compliance",
        { since },
      ),
  });
}

/* ================================================================== */
/*  Report Definitions — Queries                                         */
/* ================================================================== */

/**
 * GET /reporting/reports - paginated list of report definitions.
 */
export function useReportDefinitions(
  page = 1,
  limit = 20,
  type?: string,
) {
  return useQuery({
    queryKey: ["report-definitions", page, limit, type],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ReportDefinition>>(
        "/reporting/reports",
        { page, limit, type },
      ),
  });
}

/**
 * GET /reporting/reports/{id} - single report definition.
 */
export function useReportDefinition(id: string | undefined) {
  return useQuery({
    queryKey: ["report-definition", id],
    queryFn: () =>
      apiClient.get<ReportDefinition>(`/reporting/reports/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Report Definitions — Mutations                                       */
/* ================================================================== */

/**
 * POST /reporting/reports - create a report definition.
 */
export function useCreateReportDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ReportDefinition>) =>
      apiClient.post<ReportDefinition>("/reporting/reports", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-definitions"] });
      toast.success("Report definition created successfully");
    },
    onError: () => {
      toast.error("Failed to create report definition");
    },
  });
}

/**
 * PUT /reporting/reports/{id} - update a report definition.
 */
export function useUpdateReportDefinition(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ReportDefinition>) =>
      apiClient.put<ReportDefinition>(`/reporting/reports/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["report-definition", id] });
      toast.success("Report definition updated successfully");
    },
    onError: () => {
      toast.error("Failed to update report definition");
    },
  });
}

/**
 * DELETE /reporting/reports/{id} - delete a report definition.
 */
export function useDeleteReportDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/reporting/reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-definitions"] });
      toast.success("Report definition deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete report definition");
    },
  });
}

/* ================================================================== */
/*  Report Runs — Queries & Mutations                                    */
/* ================================================================== */

/**
 * POST /reporting/reports/{id}/run - trigger a new report run.
 */
export function useTriggerReportRun(definitionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<ReportRun>(
        `/reporting/reports/${definitionId}/run`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["report-runs", definitionId],
      });
      queryClient.invalidateQueries({ queryKey: ["report-definitions"] });
      toast.success("Report run triggered successfully");
    },
    onError: () => {
      toast.error("Failed to trigger report run");
    },
  });
}

/**
 * GET /reporting/reports/{definitionId}/runs - paginated list of runs.
 */
export function useReportRuns(
  definitionId: string | undefined,
  page = 1,
  limit = 10,
  status?: string,
) {
  return useQuery({
    queryKey: ["report-runs", definitionId, page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ReportRun>>(
        `/reporting/reports/${definitionId}/runs`,
        { page, limit, status },
      ),
    enabled: !!definitionId,
  });
}

/* ================================================================== */
/*  Global Search — Queries                                              */
/* ================================================================== */

/**
 * GET /reporting/search?q=...&types=... - global search across entities.
 */
export function useGlobalSearch(query: string, entityTypes?: string[]) {
  return useQuery({
    queryKey: ["global-search", query, entityTypes],
    queryFn: () =>
      apiClient.get<GlobalSearchResults>("/reporting/search", {
        q: query,
        types: entityTypes?.join(","),
      }),
    enabled: query.length >= 2,
  });
}

/**
 * GET /reporting/search/saved/recent - recent searches.
 */
export function useRecentSearches() {
  return useQuery({
    queryKey: ["recent-searches"],
    queryFn: () =>
      apiClient.get<SavedSearch[]>("/reporting/search/saved/recent"),
  });
}

/**
 * GET /reporting/search/saved - saved searches.
 */
export function useSavedSearches() {
  return useQuery({
    queryKey: ["saved-searches"],
    queryFn: () =>
      apiClient.get<SavedSearch[]>("/reporting/search/saved"),
  });
}

/* ================================================================== */
/*  Global Search — Mutations                                            */
/* ================================================================== */

/**
 * POST /reporting/search/saved - save a search.
 */
export function useSaveSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { query: string; entityTypes?: string[] }) =>
      apiClient.post<SavedSearch>("/reporting/search/saved", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      queryClient.invalidateQueries({ queryKey: ["recent-searches"] });
      toast.success("Search saved successfully");
    },
    onError: () => {
      toast.error("Failed to save search");
    },
  });
}

/**
 * DELETE /reporting/search/saved/{id} - delete a saved search.
 */
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/reporting/search/saved/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      queryClient.invalidateQueries({ queryKey: ["recent-searches"] });
      toast.success("Saved search removed");
    },
    onError: () => {
      toast.error("Failed to remove saved search");
    },
  });
}

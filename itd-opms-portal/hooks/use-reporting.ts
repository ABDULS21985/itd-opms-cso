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
  SearchEntityType,
  PaginatedResponse,
  ProjectDivisionAssignment,
  DivisionAssignmentLog,
} from "@/types";

/* ================================================================== */
/*  Shared request input types — mirror backend DTOs exactly           */
/* ================================================================== */

export interface CreateReportDefinitionInput {
  name: string;
  type: string;
  description?: string;
  scheduleCron?: string;
  recipients?: string[];
  template?: Record<string, unknown>;
}

export interface UpdateReportDefinitionInput {
  name?: string;
  type?: string;
  description?: string;
  scheduleCron?: string;
  recipients?: string[];
  template?: Record<string, unknown>;
  isActive?: boolean;
}

/* ================================================================== */
/*  Activity Feed — Types & Queries                                      */
/* ================================================================== */

export interface ActivityFeedItem {
  id: string;
  type:
    | "ticket.created"
    | "ticket.resolved"
    | "ticket.escalated"
    | "project.status_changed"
    | "risk.identified"
    | "risk.mitigated"
    | "asset.deployed"
    | "asset.decommissioned"
    | "policy.approved"
    | "policy.expired"
    | "sla.breached";
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  description: string;
  entity: {
    type: "ticket" | "project" | "risk" | "asset" | "policy" | "sla";
    id: string;
    label: string;
    href: string;
  };
  timestamp: string;
}

export interface ActivityFeedResponse {
  data: ActivityFeedItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * GET /reporting/dashboards/activity-feed - recent activity across all modules.
 */
export function useRecentActivity(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["activity-feed", page, limit],
    queryFn: () =>
      apiClient.get<ActivityFeedResponse>(
        "/reporting/dashboards/activity-feed",
        { page, limit },
      ),
    refetchInterval: 30 * 1000, // Poll every 30s for near-realtime feel
  });
}

export interface MyTasksSummary {
  openTickets: { count: number; items: Array<{ id: string; title: string; href: string; priority: string }> };
  tasksDueThisWeek: { count: number; items: Array<{ id: string; title: string; href: string; dueDate: string }> };
  pendingApprovals: { count: number; items: Array<{ id: string; title: string; href: string; type: string }> };
  overdueItems: { count: number; items: Array<{ id: string; title: string; href: string; dueDate: string }> };
}

/**
 * GET /reporting/dashboards/my-tasks - current user's assigned items with detail arrays.
 */
export function useMyTasks() {
  return useQuery({
    queryKey: ["my-tasks"],
    queryFn: () =>
      apiClient.get<MyTasksSummary>("/reporting/dashboards/my-tasks"),
    refetchInterval: 60 * 1000,
  });
}

export interface UpcomingEvent {
  id: string;
  title: string;
  type: "deadline" | "meeting" | "milestone" | "expiration";
  date: string;
  href?: string;
}

/**
 * GET /reporting/dashboards/upcoming - next upcoming events/deadlines.
 */
export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: ["upcoming-events", limit],
    queryFn: () =>
      apiClient.get<UpcomingEvent[]>("/reporting/dashboards/upcoming", { limit }),
    refetchInterval: 5 * 60 * 1000,
  });
}

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
    refetchInterval: 60 * 1000,
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
 * Convert a shorthand time range (e.g. "7d", "30d", "90d", "today") to an
 * RFC3339 date string the backend expects.
 */
function resolveTimeRange(range?: string): string | undefined {
  if (!range) return undefined;
  const now = new Date();
  switch (range) {
    case "today":
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    case "7d":
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    case "30d":
      now.setDate(now.getDate() - 30);
      return now.toISOString();
    case "90d":
      now.setDate(now.getDate() - 90);
      return now.toISOString();
    default:
      // Already RFC3339 or unknown — pass through
      return range;
  }
}

/**
 * GET /reporting/dashboards/charts/sla-compliance - SLA compliance rate.
 */
export function useSLACompliance(since?: string) {
  const resolvedSince = resolveTimeRange(since);
  return useQuery({
    queryKey: ["chart-sla-compliance", since],
    queryFn: () =>
      apiClient.get<SLAComplianceRate>(
        "/reporting/dashboards/charts/sla-compliance",
        { since: resolvedSince },
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/projects-by-rag - project distribution by RAG status.
 */
export function useProjectsByRAG() {
  return useQuery({
    queryKey: ["chart-projects-by-rag"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/projects-by-rag",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/projects-by-priority - project distribution by priority.
 */
export function useProjectsByPriority() {
  return useQuery({
    queryKey: ["chart-projects-by-priority"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/projects-by-priority",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/risks-by-category - open risk distribution by category.
 */
export function useRisksByCategory() {
  return useQuery({
    queryKey: ["chart-risks-by-category"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/risks-by-category",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/work-items-by-status - work item distribution by status.
 */
export function useWorkItemsByStatus() {
  return useQuery({
    queryKey: ["chart-work-items-by-status"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/work-items-by-status",
      ),
  });
}

/* ================================================================== */
/*  Office Analytics — Queries                                            */
/* ================================================================== */

export interface OfficeAnalyticsData {
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  avgCompletionPct: number;
  budgetApproved: number;
  budgetSpent: number;
  ragGreen: number;
  ragAmber: number;
  ragRed: number;
  openRisks: number;
  openIssues: number;
  totalWorkItems: number;
  completedWorkItems: number;
  overdueWorkItems: number;
  staffCount: number;
}

/**
 * GET /reporting/dashboards/charts/office-analytics - aggregated analytics per office.
 */
export function useOfficeAnalytics() {
  return useQuery({
    queryKey: ["chart-office-analytics"],
    queryFn: () =>
      apiClient.get<OfficeAnalyticsData[]>(
        "/reporting/dashboards/charts/office-analytics",
      ),
  });
}

/**
 * GET /reporting/dashboards/charts/projects-by-office - project counts per office.
 */
export function useProjectsByOffice() {
  return useQuery({
    queryKey: ["chart-projects-by-office"],
    queryFn: () =>
      apiClient.get<ChartDataPoint[]>(
        "/reporting/dashboards/charts/projects-by-office",
      ),
  });
}

/* ================================================================== */
/*  Division Assignment — Queries & Mutations                             */
/* ================================================================== */

/**
 * GET /planning/projects/{id}/divisions - active division assignments for a project.
 */
export function useProjectDivisionAssignments(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-divisions", projectId],
    queryFn: () =>
      apiClient.get<ProjectDivisionAssignment[]>(
        `/planning/projects/${projectId}/divisions`,
      ),
    enabled: !!projectId,
  });
}

/**
 * GET /planning/projects/{id}/divisions/history - assignment history.
 */
export function useDivisionAssignmentHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ["division-assignment-history", projectId],
    queryFn: () =>
      apiClient.get<DivisionAssignmentLog[]>(
        `/planning/projects/${projectId}/divisions/history`,
      ),
    enabled: !!projectId,
  });
}

/**
 * POST /planning/projects/{id}/divisions - assign a division.
 */
export function useAssignProjectDivision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { divisionId: string; assignmentType?: string; notes?: string }) =>
      apiClient.post<ProjectDivisionAssignment>(
        `/planning/projects/${projectId}/divisions`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-divisions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["division-assignment-history", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Division assigned successfully");
    },
    onError: () => toast.error("Failed to assign division"),
  });
}

/**
 * DELETE /planning/projects/{id}/divisions/{divisionId} - unassign a division.
 */
export function useUnassignProjectDivision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (divisionId: string) =>
      apiClient.delete(`/planning/projects/${projectId}/divisions/${divisionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-divisions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["division-assignment-history", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Division unassigned successfully");
    },
    onError: () => toast.error("Failed to unassign division"),
  });
}

/**
 * POST /planning/projects/{id}/divisions/reassign - reassign from one division to another.
 */
export function useReassignProjectDivision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { fromDivisionId: string; toDivisionId: string; notes?: string }) =>
      apiClient.post(`/planning/projects/${projectId}/divisions/reassign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-divisions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["division-assignment-history", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project reassigned successfully");
    },
    onError: () => toast.error("Failed to reassign project"),
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
 * Payload maps to backend CreateReportDefinitionRequest: name (required), type (required),
 * description, scheduleCron, recipients (UUID strings), template.
 */
export function useCreateReportDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReportDefinitionInput) =>
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
 * PUT /reporting/reports/{id} - update a report definition (partial update via COALESCE).
 * Payload maps to backend UpdateReportDefinitionRequest: all fields optional.
 */
export function useUpdateReportDefinition(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateReportDefinitionInput) =>
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
 * POST /reporting/reports/executive-pack/generate - ensures definition and triggers run.
 */
export function useGenerateExecutivePack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<ReportRun>("/reporting/reports/executive-pack/generate", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["report-runs"] });
      toast.success("Executive pack generation triggered");
    },
    onError: () => {
      toast.error("Failed to generate executive pack");
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
export function useGlobalSearch(query: string, entityTypes?: SearchEntityType[]) {
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
 * POST /reporting/search/saved (isSaved=false) - silently record a search into
 * recent-search history. Called automatically on every settled search; no toast.
 */
export function useRecordRecentSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { query: string; entityTypes?: SearchEntityType[] }) =>
      apiClient.post<SavedSearch>("/reporting/search/saved", { ...body, isSaved: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-searches"] });
    },
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
      apiClient.post<SavedSearch>("/reporting/search/saved", { ...body, isSaved: true }),
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

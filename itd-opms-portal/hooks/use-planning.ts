import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Portfolio,
  PortfolioAnalytics,
  Project,
  ProjectDependency,
  ProjectStakeholder,
  WorkItem,
  WorkItemStatusCount,
  PlanningMilestone,
  TimeEntry,
  Risk,
  ProjectIssue,
  ChangeRequest,
  ProjectTimeline,
  PortfolioTimelineItem,
  PIR,
  PIRTemplate,
  PIRStats,
  PaginatedResponse,
  ProjectDocument,
  ProjectDocumentCategoryCount,
  DocumentDownloadResponse,
  ValidateImportResponse,
  CommitImportResponse,
  ImportBatch,
  ImportBatchError,
} from "@/types";

/* ================================================================== */
/*  Portfolios — Queries                                               */
/* ================================================================== */

/**
 * GET /planning/portfolios - paginated list of portfolios.
 */
export function usePortfolios(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ["portfolios", page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Portfolio>>("/planning/portfolios", {
        page,
        limit,
        status,
      }),
  });
}

/**
 * GET /planning/portfolios/{id} - single portfolio detail.
 */
export function usePortfolio(id: string | undefined) {
  return useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => apiClient.get<Portfolio>(`/planning/portfolios/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /planning/portfolios/{id}/roadmap - projects in the portfolio for roadmap view.
 */
export function usePortfolioRoadmap(id: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-roadmap", id],
    queryFn: () =>
      apiClient.get<Project[]>(`/planning/portfolios/${id}/roadmap`),
    enabled: !!id,
  });
}

/**
 * GET /planning/portfolios/{id}/analytics - portfolio analytics summary.
 */
export function usePortfolioAnalytics(id: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-analytics", id],
    queryFn: () =>
      apiClient.get<PortfolioAnalytics>(
        `/planning/portfolios/${id}/analytics`,
      ),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Portfolios — Mutations                                             */
/* ================================================================== */

/**
 * POST /planning/portfolios - create a new portfolio.
 */
export function useCreatePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Portfolio>) =>
      apiClient.post<Portfolio>("/planning/portfolios", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio created successfully");
    },
    onError: () => {
      toast.error("Failed to create portfolio");
    },
  });
}

/**
 * PUT /planning/portfolios/{id} - update a portfolio.
 */
export function useUpdatePortfolio(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Portfolio>) =>
      apiClient.put<Portfolio>(`/planning/portfolios/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", id] });
      toast.success("Portfolio updated successfully");
    },
    onError: () => {
      toast.error("Failed to update portfolio");
    },
  });
}

/**
 * DELETE /planning/portfolios/{id} - delete a portfolio.
 */
export function useDeletePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/planning/portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete portfolio");
    },
  });
}

/* ================================================================== */
/*  Projects — Queries                                                 */
/* ================================================================== */

/**
 * GET /planning/projects - paginated list of projects.
 */
export function useProjects(
  page = 1,
  limit = 20,
  portfolioId?: string,
  status?: string,
  ragStatus?: string,
) {
  return useQuery({
    queryKey: ["projects", page, limit, portfolioId, status, ragStatus],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Project>>("/planning/projects", {
        page,
        limit,
        portfolio_id: portfolioId,
        status,
        rag_status: ragStatus,
      }),
  });
}

/**
 * GET /planning/projects?search=<query> — lightweight project search for pickers.
 */
export function useSearchProjects(query: string) {
  return useQuery({
    queryKey: ["projects-search", query],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Project>>("/planning/projects", {
        page: 1,
        limit: 15,
        ...(query.length >= 2 ? { search: query } : {}),
      }),
  });
}

/**
 * GET /planning/projects/{id} - single project detail.
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => apiClient.get<Project>(`/planning/projects/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /planning/projects/{id}/dependencies - project dependencies.
 */
export function useProjectDependencies(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-dependencies", projectId],
    queryFn: () =>
      apiClient.get<ProjectDependency[]>(
        `/planning/projects/${projectId}/dependencies`,
      ),
    enabled: !!projectId,
  });
}

/**
 * GET /planning/projects/{id}/stakeholders - project stakeholders.
 */
export function useProjectStakeholders(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-stakeholders", projectId],
    queryFn: () =>
      apiClient.get<ProjectStakeholder[]>(
        `/planning/projects/${projectId}/stakeholders`,
      ),
    enabled: !!projectId,
  });
}

/* ================================================================== */
/*  Projects — Mutations                                               */
/* ================================================================== */

/**
 * POST /planning/projects - create a new project.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Project>) =>
      apiClient.post<Project>("/planning/projects", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
    },
    onError: () => {
      toast.error("Failed to create project");
    },
  });
}

/**
 * PUT /planning/projects/{id} - update a project.
 */
export function useUpdateProject(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Project>) =>
      apiClient.put<Project>(`/planning/projects/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Project updated successfully");
    },
    onError: () => {
      toast.error("Failed to update project");
    },
  });
}

/**
 * DELETE /planning/projects/{id} - delete a project.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/planning/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });
}

/**
 * POST /planning/projects/{id}/approve - approve a project (status transition).
 * Backend requires { status, ragStatus? } in the request body.
 */
export function useApproveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      ragStatus,
    }: {
      id: string;
      status: string;
      ragStatus?: string;
    }) =>
      apiClient.post(`/planning/projects/${id}/approve`, { status, ragStatus }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
      toast.success("Project approved");
    },
    onError: () => {
      toast.error("Failed to approve project");
    },
  });
}

/**
 * POST /planning/projects/{id}/dependencies - add a project dependency.
 */
export function useAddProjectDependency(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ProjectDependency>) =>
      apiClient.post<ProjectDependency>(
        `/planning/projects/${projectId}/dependencies`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-dependencies", projectId],
      });
      toast.success("Dependency added");
    },
    onError: () => {
      toast.error("Failed to add dependency");
    },
  });
}

/**
 * DELETE /planning/projects/{projectId}/dependencies/{depId} - remove a dependency.
 */
export function useRemoveProjectDependency(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (depId: string) =>
      apiClient.delete(
        `/planning/projects/${projectId}/dependencies/${depId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-dependencies", projectId],
      });
      toast.success("Dependency removed");
    },
    onError: () => {
      toast.error("Failed to remove dependency");
    },
  });
}

/**
 * POST /planning/projects/{id}/stakeholders - add a project stakeholder.
 */
export function useAddProjectStakeholder(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ProjectStakeholder>) =>
      apiClient.post<ProjectStakeholder>(
        `/planning/projects/${projectId}/stakeholders`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-stakeholders", projectId],
      });
      toast.success("Stakeholder added");
    },
    onError: () => {
      toast.error("Failed to add stakeholder");
    },
  });
}

/**
 * DELETE /planning/projects/{projectId}/stakeholders/{stakeholderId} - remove a stakeholder.
 */
export function useRemoveProjectStakeholder(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stakeholderId: string) =>
      apiClient.delete(
        `/planning/projects/${projectId}/stakeholders/${stakeholderId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-stakeholders", projectId],
      });
      toast.success("Stakeholder removed");
    },
    onError: () => {
      toast.error("Failed to remove stakeholder");
    },
  });
}

/* ================================================================== */
/*  Work Items — Queries                                               */
/* ================================================================== */

/**
 * GET /planning/work-items - paginated list of work items.
 */
export function useWorkItems(
  page = 1,
  limit = 20,
  projectId?: string,
  status?: string,
  assigneeId?: string,
  priority?: string,
  type?: string,
) {
  return useQuery({
    queryKey: [
      "work-items",
      page,
      limit,
      projectId,
      status,
      assigneeId,
      priority,
      type,
    ],
    queryFn: () =>
      apiClient.get<PaginatedResponse<WorkItem>>("/planning/work-items", {
        page,
        limit,
        project_id: projectId,
        status,
        assignee_id: assigneeId,
        priority,
        type,
      }),
  });
}

/**
 * GET /planning/work-items/{id} - single work item detail.
 */
export function useWorkItem(id: string | undefined) {
  return useQuery({
    queryKey: ["work-item", id],
    queryFn: () => apiClient.get<WorkItem>(`/planning/work-items/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /planning/work-items/wbs?project_id=... - WBS tree for a project.
 */
export function useWBSTree(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbs-tree", projectId],
    queryFn: () =>
      apiClient.get<WorkItem[]>("/planning/work-items/wbs", {
        project_id: projectId,
      }),
    enabled: !!projectId,
  });
}

/**
 * GET /planning/work-items/overdue - overdue work items.
 */
export function useOverdueWorkItems(projectId?: string) {
  return useQuery({
    queryKey: ["work-items-overdue", projectId],
    queryFn: () =>
      apiClient.get<WorkItem[]>("/planning/work-items/overdue", {
        project_id: projectId,
      }),
  });
}

/**
 * GET /planning/work-items/status-counts?project_id=... - status counts.
 */
export function useWorkItemStatusCounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["work-item-status-counts", projectId],
    queryFn: () =>
      apiClient.get<WorkItemStatusCount[]>(
        "/planning/work-items/status-counts",
        { project_id: projectId },
      ),
    enabled: !!projectId,
  });
}

/**
 * GET /planning/work-items/{id}/time-entries - time entries for a work item.
 */
export function useTimeEntries(workItemId: string | undefined) {
  return useQuery({
    queryKey: ["time-entries", workItemId],
    queryFn: () =>
      apiClient.get<TimeEntry[]>(
        `/planning/work-items/${workItemId}/time-entries`,
      ),
    enabled: !!workItemId,
  });
}

/* ================================================================== */
/*  Work Items — Mutations                                             */
/* ================================================================== */

/**
 * POST /planning/work-items - create a new work item.
 */
export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<WorkItem>) =>
      apiClient.post<WorkItem>("/planning/work-items", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["wbs-tree"] });
      toast.success("Work item created");
    },
    onError: () => {
      toast.error("Failed to create work item");
    },
  });
}

/**
 * PUT /planning/work-items/{id} - update a work item.
 */
export function useUpdateWorkItem(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<WorkItem>) =>
      apiClient.put<WorkItem>(`/planning/work-items/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["work-item", id] });
      queryClient.invalidateQueries({ queryKey: ["wbs-tree"] });
      toast.success("Work item updated");
    },
    onError: () => {
      toast.error("Failed to update work item");
    },
  });
}

/**
 * PUT /planning/work-items/{id}/transition - transition a work item status.
 */
export function useTransitionWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) =>
      apiClient.put(`/planning/work-items/${id}/transition`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({
        queryKey: ["work-item", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["wbs-tree"] });
      queryClient.invalidateQueries({ queryKey: ["work-item-status-counts"] });
      toast.success("Work item status updated");
    },
    onError: () => {
      toast.error("Failed to transition work item");
    },
  });
}

/**
 * DELETE /planning/work-items/{id} - delete a work item.
 */
export function useDeleteWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/planning/work-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["wbs-tree"] });
      toast.success("Work item deleted");
    },
    onError: () => {
      toast.error("Failed to delete work item");
    },
  });
}

/**
 * POST /planning/work-items/{id}/time-entries - log a time entry.
 */
export function useLogTimeEntry(workItemId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<TimeEntry>) =>
      apiClient.post<TimeEntry>(
        `/planning/work-items/${workItemId}/time-entries`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["time-entries", workItemId],
      });
      queryClient.invalidateQueries({ queryKey: ["work-item", workItemId] });
      toast.success("Time entry logged");
    },
    onError: () => {
      toast.error("Failed to log time entry");
    },
  });
}

/* ================================================================== */
/*  Milestones — Queries                                               */
/* ================================================================== */

/**
 * GET /planning/milestones - list milestones (optionally by project).
 */
export function useMilestones(projectId?: string) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () =>
      apiClient.get<PlanningMilestone[]>("/planning/milestones", {
        project_id: projectId,
      }),
  });
}

/* ================================================================== */
/*  Milestones — Mutations                                             */
/* ================================================================== */

/**
 * POST /planning/milestones - create a milestone.
 */
export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PlanningMilestone>) =>
      apiClient.post<PlanningMilestone>("/planning/milestones", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Milestone created");
    },
    onError: () => {
      toast.error("Failed to create milestone");
    },
  });
}

/**
 * PUT /planning/milestones/{id} - update a milestone.
 */
export function useUpdateMilestone(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PlanningMilestone>) =>
      apiClient.put<PlanningMilestone>(`/planning/milestones/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Milestone updated");
    },
    onError: () => {
      toast.error("Failed to update milestone");
    },
  });
}

/**
 * DELETE /planning/milestones/{id} - delete a milestone.
 */
export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/planning/milestones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Milestone deleted");
    },
    onError: () => {
      toast.error("Failed to delete milestone");
    },
  });
}

/* ================================================================== */
/*  Risks — Queries                                                    */
/* ================================================================== */

/**
 * GET /planning/risks - paginated list of risks.
 */
export function useRisks(
  page = 1,
  limit = 20,
  projectId?: string,
  status?: string,
  category?: string,
) {
  return useQuery({
    queryKey: ["risks", page, limit, projectId, status, category],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Risk>>("/planning/risks", {
        page,
        limit,
        project_id: projectId,
        status,
        category,
      }),
  });
}

/**
 * GET /planning/risks/{id} - single risk detail.
 */
export function useRisk(id: string | undefined) {
  return useQuery({
    queryKey: ["risk", id],
    queryFn: () => apiClient.get<Risk>(`/planning/risks/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Risks — Mutations                                                  */
/* ================================================================== */

/**
 * POST /planning/risks - create a risk.
 */
export function useCreateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Risk>) =>
      apiClient.post<Risk>("/planning/risks", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      toast.success("Risk created");
    },
    onError: () => {
      toast.error("Failed to create risk");
    },
  });
}

/**
 * PUT /planning/risks/{id} - update a risk.
 */
export function useUpdateRisk(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Risk>) =>
      apiClient.put<Risk>(`/planning/risks/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      queryClient.invalidateQueries({ queryKey: ["risk", id] });
      toast.success("Risk updated");
    },
    onError: () => {
      toast.error("Failed to update risk");
    },
  });
}

/**
 * DELETE /planning/risks/{id} - delete a risk.
 */
export function useDeleteRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/planning/risks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      toast.success("Risk deleted");
    },
    onError: () => {
      toast.error("Failed to delete risk");
    },
  });
}

/* ================================================================== */
/*  Issues — Queries                                                   */
/* ================================================================== */

/**
 * GET /planning/issues - paginated list of issues.
 */
export function useIssues(
  page = 1,
  limit = 20,
  projectId?: string,
  status?: string,
  severity?: string,
) {
  return useQuery({
    queryKey: ["issues", page, limit, projectId, status, severity],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProjectIssue>>("/planning/issues", {
        page,
        limit,
        project_id: projectId,
        status,
        severity,
      }),
  });
}

/**
 * GET /planning/issues/{id} - single issue detail.
 */
export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: ["issue", id],
    queryFn: () => apiClient.get<ProjectIssue>(`/planning/issues/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Issues — Mutations                                                 */
/* ================================================================== */

/**
 * POST /planning/issues - create an issue.
 */
export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ProjectIssue>) =>
      apiClient.post<ProjectIssue>("/planning/issues", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast.success("Issue created");
    },
    onError: () => {
      toast.error("Failed to create issue");
    },
  });
}

/**
 * PUT /planning/issues/{id} - update an issue.
 */
export function useUpdateIssue(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ProjectIssue>) =>
      apiClient.put<ProjectIssue>(`/planning/issues/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue", id] });
      toast.success("Issue updated");
    },
    onError: () => {
      toast.error("Failed to update issue");
    },
  });
}

/**
 * DELETE /planning/issues/{id} - delete an issue.
 */
export function useDeleteIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/planning/issues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast.success("Issue deleted");
    },
    onError: () => {
      toast.error("Failed to delete issue");
    },
  });
}

/**
 * PUT /planning/issues/{id}/escalate - escalate an issue.
 */
export function useEscalateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      escalatedToId,
    }: {
      id: string;
      escalatedToId: string;
    }) =>
      apiClient.put(`/planning/issues/${id}/escalate`, { escalatedToId }),
    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast.success("Issue escalated");
    },
    onError: () => {
      toast.error("Failed to escalate issue");
    },
  });
}

/* ================================================================== */
/*  Change Requests — Queries                                          */
/* ================================================================== */

/**
 * GET /planning/change-requests - paginated list of change requests.
 */
export function useChangeRequests(
  page = 1,
  limit = 20,
  projectId?: string,
  status?: string,
  priority?: string,
  category?: string,
) {
  return useQuery({
    queryKey: ["change-requests", page, limit, projectId, status, priority, category],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ChangeRequest>>(
        "/planning/change-requests",
        { page, limit, project_id: projectId, status, priority, category },
      ),
  });
}

/**
 * GET /planning/change-requests/{id} - single change request detail.
 */
export function useChangeRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["change-request", id],
    queryFn: () =>
      apiClient.get<ChangeRequest>(`/planning/change-requests/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Change Requests — Mutations                                        */
/* ================================================================== */

/**
 * POST /planning/change-requests - create a change request.
 */
export function useCreateChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ChangeRequest>) =>
      apiClient.post<ChangeRequest>("/planning/change-requests", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      toast.success("Change request created");
    },
    onError: () => {
      toast.error("Failed to create change request");
    },
  });
}

/**
 * PUT /planning/change-requests/{id} - update a change request.
 */
export function useUpdateChangeRequest(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ChangeRequest>) =>
      apiClient.put<ChangeRequest>(`/planning/change-requests/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["change-request", id] });
      toast.success("Change request updated");
    },
    onError: () => {
      toast.error("Failed to update change request");
    },
  });
}

/**
 * PUT /planning/change-requests/{id}/status - update change request status.
 */
export function useUpdateChangeRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) =>
      apiClient.put(`/planning/change-requests/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      toast.success("Change request status updated");
    },
    onError: () => {
      toast.error("Failed to update change request status");
    },
  });
}

/**
 * DELETE /planning/change-requests/{id} - delete a change request.
 */
export function useDeleteChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/planning/change-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-requests"] });
      toast.success("Change request deleted");
    },
    onError: () => {
      toast.error("Failed to delete change request");
    },
  });
}

/* ================================================================== */
/*  FR-C009: Project & Portfolio Timeline                              */
/* ================================================================== */

/**
 * GET /planning/projects/{id}/timeline - project timeline data for Gantt chart.
 */
export function useProjectTimeline(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-timeline", projectId],
    queryFn: () =>
      apiClient.get<ProjectTimeline>(
        `/planning/projects/${projectId}/timeline`,
      ),
    enabled: !!projectId,
  });
}

/**
 * GET /planning/portfolios/{id}/timeline - portfolio timeline for Gantt chart.
 */
export function usePortfolioTimeline(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-timeline", portfolioId],
    queryFn: () =>
      apiClient.get<PortfolioTimelineItem[]>(
        `/planning/portfolios/${portfolioId}/timeline`,
      ),
    enabled: !!portfolioId,
  });
}

/* ================================================================== */
/*  FR-C016: Post-Implementation Reviews (PIR)                         */
/* ================================================================== */

/**
 * GET /planning/pir - paginated list of PIRs.
 */
export function usePIRs(
  page = 1,
  limit = 20,
  projectId?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["pirs", page, limit, projectId, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PIR>>("/planning/pir", {
        page,
        limit,
        projectId,
        status,
      }),
  });
}

/**
 * GET /planning/pir/{id} - single PIR detail.
 */
export function usePIR(id: string | undefined) {
  return useQuery({
    queryKey: ["pir", id],
    queryFn: () => apiClient.get<PIR>(`/planning/pir/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /planning/pir/stats - PIR statistics.
 */
export function usePIRStats() {
  return useQuery({
    queryKey: ["pir-stats"],
    queryFn: () => apiClient.get<PIRStats>("/planning/pir/stats"),
  });
}

/**
 * GET /planning/pir/templates - PIR templates.
 */
export function usePIRTemplates(reviewType?: string) {
  return useQuery({
    queryKey: ["pir-templates", reviewType],
    queryFn: () =>
      apiClient.get<PIRTemplate[]>("/planning/pir/templates", { reviewType }),
  });
}

/**
 * POST /planning/pir - create a PIR.
 */
export function useCreatePIR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PIR>) =>
      apiClient.post<PIR>("/planning/pir", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pirs"] });
      queryClient.invalidateQueries({ queryKey: ["pir-stats"] });
      toast.success("Post-Implementation Review created");
    },
    onError: () => {
      toast.error("Failed to create PIR");
    },
  });
}

/**
 * PUT /planning/pir/{id} - update a PIR.
 */
export function useUpdatePIR(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PIR>) =>
      apiClient.put<PIR>(`/planning/pir/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pirs"] });
      queryClient.invalidateQueries({ queryKey: ["pir", id] });
      queryClient.invalidateQueries({ queryKey: ["pir-stats"] });
      toast.success("PIR updated");
    },
    onError: () => {
      toast.error("Failed to update PIR");
    },
  });
}

/**
 * POST /planning/pir/{id}/complete - complete a PIR.
 */
export function useCompletePIR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<PIR>(`/planning/pir/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pirs"] });
      queryClient.invalidateQueries({ queryKey: ["pir-stats"] });
      toast.success("PIR marked as completed");
    },
    onError: () => {
      toast.error("Failed to complete PIR");
    },
  });
}

/**
 * DELETE /planning/pir/{id} - delete a PIR.
 */
export function useDeletePIR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/planning/pir/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pirs"] });
      queryClient.invalidateQueries({ queryKey: ["pir-stats"] });
      toast.success("PIR deleted");
    },
    onError: () => {
      toast.error("Failed to delete PIR");
    },
  });
}

/* ================================================================== */
/*  Project Documents — Queries                                        */
/* ================================================================== */

/**
 * GET /planning/projects/{id}/documents - paginated list of project documents.
 */
export function useProjectDocuments(
  projectId: string | undefined,
  page = 1,
  limit = 20,
  category?: string,
  status?: string,
  search?: string,
) {
  return useQuery({
    queryKey: [
      "project-documents",
      projectId,
      page,
      limit,
      category,
      status,
      search,
    ],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ProjectDocument>>(
        `/planning/projects/${projectId}/documents`,
        { page, limit, category, status, search },
      ),
    enabled: !!projectId,
  });
}

/**
 * GET /planning/projects/{id}/documents/categories - category counts.
 */
export function useProjectDocumentCategories(
  projectId: string | undefined,
) {
  return useQuery({
    queryKey: ["project-document-categories", projectId],
    queryFn: () =>
      apiClient.get<ProjectDocumentCategoryCount[]>(
        `/planning/projects/${projectId}/documents/categories`,
      ),
    enabled: !!projectId,
  });
}

/* ================================================================== */
/*  Project Documents — Mutations                                      */
/* ================================================================== */

/**
 * POST /planning/projects/{id}/documents - upload a document (multipart).
 */
export function useUploadProjectDocument(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<ProjectDocument>(
        `/planning/projects/${projectId}/documents`,
        formData,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-documents", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-document-categories", projectId],
      });
      toast.success("Document uploaded successfully");
    },
    onError: () => {
      toast.error("Failed to upload document");
    },
  });
}

/**
 * PUT /planning/projects/{id}/documents/{docId} - update document metadata.
 */
export function useUpdateProjectDocument(
  projectId: string | undefined,
  docId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ProjectDocument>) =>
      apiClient.put<ProjectDocument>(
        `/planning/projects/${projectId}/documents/${docId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-documents", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-document-categories", projectId],
      });
      toast.success("Document updated successfully");
    },
    onError: () => {
      toast.error("Failed to update document");
    },
  });
}

/**
 * DELETE /planning/projects/{id}/documents/{docId} - delete a document.
 */
export function useDeleteProjectDocument(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      apiClient.delete(
        `/planning/projects/${projectId}/documents/${docId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-documents", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-document-categories", projectId],
      });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });
}

/**
 * GET /planning/projects/{id}/documents/{docId}/download - get download URL.
 */
export function useDownloadProjectDocument(
  projectId: string | undefined,
) {
  return useMutation({
    mutationFn: (docId: string) =>
      apiClient.get<DocumentDownloadResponse>(
        `/planning/projects/${projectId}/documents/${docId}/download`,
      ),
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: () => {
      toast.error("Failed to download document");
    },
  });
}

/**
 * POST /planning/work-items/bulk/update - bulk update work items.
 */
export function useBulkUpdateWorkItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; fields: Record<string, string> }) =>
      apiClient.post("/planning/work-items/bulk/update", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}

/* ================================================================== */
/*  Bulk Project Import                                                */
/* ================================================================== */

/**
 * POST /planning/projects/import/validate - upload and validate a file.
 */
export function useValidateProjectImport() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<ValidateImportResponse>(
        "/planning/projects/import/validate",
        formData,
      ),
    onError: () => {
      toast.error("Failed to validate import file");
    },
  });
}

/**
 * POST /planning/projects/import/commit - commit a validated batch.
 */
export function useCommitProjectImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient.post<CommitImportResponse>(
        "/planning/projects/import/commit",
        { batchId },
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(
        `Successfully imported ${data.importedRows} project${data.importedRows !== 1 ? "s" : ""}`,
      );
    },
    onError: () => {
      toast.error("Failed to import projects");
    },
  });
}

/**
 * GET /planning/projects/import/batches/{id} - get batch details.
 */
export function useImportBatch(id: string | undefined) {
  return useQuery({
    queryKey: ["import-batch", id],
    queryFn: () =>
      apiClient.get<ImportBatch>(
        `/planning/projects/import/batches/${id}`,
      ),
    enabled: !!id,
  });
}

/**
 * GET /planning/projects/import/batches/{id}/errors - get batch errors.
 */
export function useImportBatchErrors(id: string | undefined) {
  return useQuery({
    queryKey: ["import-batch-errors", id],
    queryFn: () =>
      apiClient.get<ImportBatchError[]>(
        `/planning/projects/import/batches/${id}/errors`,
      ),
    enabled: !!id,
  });
}

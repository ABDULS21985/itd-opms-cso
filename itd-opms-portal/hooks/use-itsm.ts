import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiClient } from "@/lib/api-client";
import type {
  AddCommentPayload,
  CatalogCategory,
  CatalogItem,
  Ticket,
  TicketComment,
  TicketStatusHistory,
  TicketStats,
  MajorIncidentCommunicationPlan,
  MajorIncidentRecord,
  MajorIncidentStats,
  SLAPolicy,
  BusinessHoursCalendar,
  SLABreachEntry,
  SLAComplianceStats,
  EscalationRule,
  ITSMProblem,
  ProblemRCATemplate,
  KnownError,
  SupportQueue,
  CSATSurvey,
  CSATStats,
  CABMeeting,
  ChangeStats,
  ChangeCalendarEvent,
  CreateCABMeetingPayload,
  CreateChangePayload,
  PaginatedResponse,
  OperationalLevelAgreement,
  UnderpinningContract,
  SLADependencyChainEntry,
  ConsistencyViolation,
  ExpiringAgreements,
  TicketKBLink,
  KBSuggestion,
  SubtasksResponse,
  UpdateCABMeetingPayload,
  UpdateChangePayload,
  UpdateProblemPayload,
  UpdateTicketPayload,
  ITSMWorkflowDefinition,
  ITSMWorkflowTransitionResponse,
  CopilotRequest,
  CopilotResponse,
  ImpactMapResponse,
  ITSMEvidencePack,
  ITSMEvidencePackRequest,
  OperationsSnapshotResponse,
  PlaybookPreviewRequest,
  PlaybookPreviewResponse,
  ProcessMiningResponse,
  SLAForecastRequest,
  SLAForecastResponse,
  TriageRequest,
  TriageSuggestion,
  WorkflowSimulationRequest,
  WorkflowSimulationResult,
} from "@/types";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function toastMutationError(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  if (message === fallback) {
    toast.error(fallback);
    return;
  }
  toast.error(fallback, { description: message });
}

export type ITSMWorkflowEntity =
  | "ticket"
  | "problem"
  | "service_request"
  | "change"
  | "major_incident"
  | "release"
  | "catalog_item"
  | "cab_meeting";

export function useITSMWorkflow(entity: ITSMWorkflowEntity | undefined) {
  return useQuery({
    queryKey: ["itsm-workflow", entity],
    queryFn: () => apiClient.get<ITSMWorkflowDefinition>(`/itsm/workflows/${entity}`),
    enabled: !!entity,
    staleTime: 5 * 60 * 1000,
  });
}

export function useITSMAllowedTransitions(
  entity: ITSMWorkflowEntity | undefined,
  status: string | undefined,
) {
  return useQuery({
    queryKey: ["itsm-workflow-transitions", entity, status],
    queryFn: () =>
      apiClient.get<ITSMWorkflowTransitionResponse>(
        `/itsm/workflows/${entity}/transitions`,
        { status },
      ),
    enabled: !!entity && !!status,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTriageAssistant() {
  return useMutation({
    mutationFn: (body: TriageRequest) =>
      apiClient.post<TriageSuggestion>("/itsm/intelligence/triage", body),
    onError: (error) => toastMutationError(error, "Failed to run triage assistant"),
  });
}

export function useAgentCopilot() {
  return useMutation({
    mutationFn: (body: CopilotRequest) =>
      apiClient.post<CopilotResponse>("/itsm/intelligence/copilot", body),
    onError: (error) => toastMutationError(error, "Failed to generate copilot guidance"),
  });
}

export function useWorkflowSimulation() {
  return useMutation({
    mutationFn: (body: WorkflowSimulationRequest) =>
      apiClient.post<WorkflowSimulationResult>(
        "/itsm/intelligence/workflow-simulation",
        body,
      ),
    onError: (error) => toastMutationError(error, "Failed to simulate workflow"),
  });
}

export function useImpactMap(
  entityType: string | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: ["itsm-impact-map", entityType, entityId],
    queryFn: () =>
      apiClient.get<ImpactMapResponse>("/itsm/intelligence/impact-map", {
        entityType,
        entityId,
      }),
    enabled: !!entityType && !!entityId,
  });
}

export function useProcessMining() {
  return useQuery({
    queryKey: ["itsm-process-mining"],
    queryFn: () =>
      apiClient.get<ProcessMiningResponse>("/itsm/intelligence/process-mining"),
    staleTime: 60_000,
  });
}

export function useGenerateITSMEvidencePack() {
  return useMutation({
    mutationFn: (body: ITSMEvidencePackRequest) =>
      apiClient.post<ITSMEvidencePack>("/itsm/intelligence/evidence-pack", body),
    onSuccess: () => toast.success("Evidence pack generated"),
    onError: (error) => toastMutationError(error, "Failed to generate evidence pack"),
  });
}

export function useSLAForecast() {
  return useMutation({
    mutationFn: (body: SLAForecastRequest) =>
      apiClient.post<SLAForecastResponse>("/itsm/intelligence/sla-forecast", body),
    onError: (error) => toastMutationError(error, "Failed to forecast SLA risk"),
  });
}

export function usePlaybookPreview() {
  return useMutation({
    mutationFn: (body: PlaybookPreviewRequest) =>
      apiClient.post<PlaybookPreviewResponse>(
        "/itsm/intelligence/playbooks/preview",
        body,
      ),
    onError: (error) => toastMutationError(error, "Failed to preview playbook"),
  });
}

export function useOperationsSnapshot() {
  return useQuery({
    queryKey: ["itsm-operations-snapshot"],
    queryFn: () =>
      apiClient.get<OperationsSnapshotResponse>(
        "/itsm/intelligence/operations-snapshot",
      ),
    staleTime: 60_000,
  });
}

/* ================================================================== */
/*  Catalog Categories — Queries                                        */
/* ================================================================== */

/**
 * GET /itsm/catalog/categories - list catalog categories.
 */
export function useCatalogCategories(parentId?: string) {
  return useQuery({
    queryKey: ["catalog-categories", parentId],
    queryFn: () =>
      apiClient.get<CatalogCategory[]>("/itsm/catalog/categories", {
        parentId,
      }),
  });
}

/**
 * GET /itsm/catalog/categories/{id} - single catalog category.
 */
export function useCatalogCategory(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-category", id],
    queryFn: () =>
      apiClient.get<CatalogCategory>(`/itsm/catalog/categories/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Catalog Categories — Mutations                                      */
/* ================================================================== */

/**
 * POST /itsm/catalog/categories - create a catalog category.
 */
export function useCreateCatalogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CatalogCategory>) =>
      apiClient.post<CatalogCategory>("/itsm/catalog/categories", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create category");
    },
  });
}

/**
 * PUT /itsm/catalog/categories/{id} - update a catalog category.
 */
export function useUpdateCatalogCategory(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CatalogCategory>) =>
      apiClient.put<CatalogCategory>(`/itsm/catalog/categories/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-category", id] });
      toast.success("Category updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update category");
    },
  });
}

/**
 * DELETE /itsm/catalog/categories/{id} - delete a catalog category.
 */
export function useDeleteCatalogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/catalog/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete category");
    },
  });
}

/* ================================================================== */
/*  Catalog Items — Queries                                             */
/* ================================================================== */

/**
 * GET /itsm/catalog/items - paginated list of catalog items.
 */
export function useCatalogItems(
  page = 1,
  limit = 20,
  categoryId?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["catalog-items", page, limit, categoryId, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CatalogItem>>("/itsm/catalog/items", {
        page,
        limit,
        categoryId,
        status,
      }),
  });
}

/**
 * GET /itsm/catalog/items/entitled - items the current user is entitled to.
 */
export function useEntitledCatalogItems() {
  return useQuery({
    queryKey: ["catalog-items-entitled"],
    queryFn: () =>
      apiClient.get<CatalogItem[]>("/itsm/catalog/items/entitled"),
  });
}

/**
 * GET /itsm/catalog/items/{id} - single catalog item detail.
 */
export function useCatalogItem(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-item", id],
    queryFn: () =>
      apiClient.get<CatalogItem>(`/itsm/catalog/items/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /itsm/catalog/items/{id}/related - related items in the same category.
 */
export function useRelatedCatalogItems(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-item-related", id],
    queryFn: () =>
      apiClient.get<CatalogItem[]>(`/itsm/catalog/items/${id}/related`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Catalog Items — Mutations                                           */
/* ================================================================== */

/**
 * POST /itsm/catalog/items/bulk/status - bulk update status for multiple items.
 */
export function useBulkUpdateCatalogItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; status: string }) =>
      apiClient.post<{ updated: number }>("/itsm/catalog/items/bulk/status", body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-items-entitled"] });
      toast.success(`${variables.ids.length} item(s) updated to ${variables.status}`);
    },
    onError: (error) => {
      toastMutationError(error, "Failed to bulk update item statuses");
    },
  });
}

/**
 * POST /itsm/catalog/items - create a catalog item.
 */
export function useCreateCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CatalogItem>) =>
      apiClient.post<CatalogItem>("/itsm/catalog/items", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-items-entitled"] });
      toast.success("Catalog item created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create catalog item");
    },
  });
}

/**
 * PUT /itsm/catalog/items/{id} - update a catalog item.
 */
export function useUpdateCatalogItem(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CatalogItem>) =>
      apiClient.put<CatalogItem>(`/itsm/catalog/items/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-items-entitled"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-item", id] });
      toast.success("Catalog item updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update catalog item");
    },
  });
}

/**
 * DELETE /itsm/catalog/items/{id} - delete a catalog item.
 */
export function useDeleteCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/catalog/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-items-entitled"] });
      toast.success("Catalog item deleted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete catalog item");
    },
  });
}

/* ================================================================== */
/*  Tickets — Queries                                                   */
/* ================================================================== */

/**
 * GET /itsm/tickets - paginated list of tickets.
 */
export function useTickets(
  page = 1,
  limit = 20,
  filters?: {
    status?: string;
    priority?: string;
    type?: string;
    assigneeId?: string;
    reporterId?: string;
    hideSubtasks?: boolean;
  },
) {
  return useQuery({
    queryKey: ["tickets", page, limit, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>("/itsm/tickets", {
        page,
        limit,
        status: filters?.status,
        priority: filters?.priority,
        type: filters?.type,
        assigneeId: filters?.assigneeId,
        reporterId: filters?.reporterId,
        hideSubtasks: filters?.hideSubtasks ? "true" : undefined,
      }),
  });
}

/**
 * GET /itsm/tickets/{id} - single ticket detail.
 */
export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: () => apiClient.get<Ticket>(`/itsm/tickets/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /itsm/tickets/stats - ticket statistics summary.
 */
export function useTicketStats() {
  return useQuery({
    queryKey: ["ticket-stats"],
    queryFn: () => apiClient.get<TicketStats>("/itsm/tickets/stats"),
  });
}

/* ================================================================== */
/*  Subtasks                                                           */
/* ================================================================== */

/**
 * GET /itsm/tickets/{id}/subtasks - child tickets + progress.
 */
export function useSubtasks(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-subtasks", ticketId],
    queryFn: () =>
      apiClient.get<SubtasksResponse>(`/itsm/tickets/${ticketId}/subtasks`),
    enabled: !!ticketId,
  });
}

/**
 * POST /itsm/tickets/{parentId}/subtasks - create a subtask.
 */
export function useCreateSubtask(parentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      description: string;
      priority?: string;
      assigneeId?: string;
    }) => apiClient.post<Ticket>(`/itsm/tickets/${parentId}/subtasks`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-subtasks", parentId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", parentId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Subtask created");
    },
    onError: (error) => toastMutationError(error, "Failed to create subtask"),
  });
}

/**
 * DELETE /itsm/tickets/{parentId}/subtasks/{childId} - unlink a subtask.
 */
export function useUnlinkSubtask(parentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (childId: string) =>
      apiClient.delete(`/itsm/tickets/${parentId}/subtasks/${childId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-subtasks", parentId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", parentId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Subtask unlinked");
    },
    onError: (error) => toastMutationError(error, "Failed to unlink subtask"),
  });
}

export interface DeclareMajorIncidentPayload {
  ticketId: string;
  severity?: "sev1" | "sev2" | "sev3";
  incidentCommanderId?: string;
  communicationLeadId?: string;
  bridgeUrl?: string;
  bridgePhone?: string;
  affectedServices?: string[];
  affectedCiIds?: string[];
  estimatedAffectedUsers?: number;
  businessImpact?: "critical" | "high" | "medium" | "low";
  communicationPlan?: MajorIncidentCommunicationPlan;
}

export interface MajorIncidentFilterParams {
  status?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  ticketId?: string;
}

export function useMajorIncidents(
  page = 1,
  limit = 20,
  filters?: MajorIncidentFilterParams,
) {
  return useQuery({
    queryKey: ["major-incidents", page, limit, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<MajorIncidentRecord>>("/itsm/major-incidents", {
        page,
        limit,
        status: filters?.status,
        severity: filters?.severity,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        ticketId: filters?.ticketId,
      }),
  });
}

export function useActiveMajorIncidents() {
  return useQuery({
    queryKey: ["major-incidents-active"],
    queryFn: () => apiClient.get<MajorIncidentRecord[]>("/itsm/major-incidents/active"),
  });
}

export function useMajorIncident(id: string | undefined) {
  return useQuery({
    queryKey: ["major-incident", id],
    queryFn: () => apiClient.get<MajorIncidentRecord>(`/itsm/major-incidents/${id}`),
    enabled: !!id,
  });
}

export function useMajorIncidentStats() {
  return useQuery({
    queryKey: ["major-incident-stats"],
    queryFn: () => apiClient.get<MajorIncidentStats>("/itsm/major-incidents/stats"),
  });
}

/**
 * GET /itsm/tickets/my-queue - tickets assigned to the current user.
 */
export function useMyQueue(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["my-queue", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>("/itsm/tickets/my-queue", {
        page,
        limit,
      }),
  });
}

/**
 * GET /itsm/tickets/team-queue/{teamId} - tickets assigned to a team queue.
 */
export function useTeamQueue(
  teamId: string | undefined,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: ["team-queue", teamId, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>(
        `/itsm/tickets/team-queue/${teamId}`,
        { page, limit },
      ),
    enabled: !!teamId,
  });
}

/* ================================================================== */
/*  Tickets — Mutations                                                 */
/* ================================================================== */

/**
 * POST /itsm/tickets - create a new ticket.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Ticket>) =>
      apiClient.post<Ticket>("/itsm/tickets", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-queue"] });
      toast.success("Ticket created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create ticket");
    },
  });
}

/**
 * PUT /itsm/tickets/{id} - update a ticket.
 */
export function useUpdateTicket(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTicketPayload) =>
      apiClient.put<Ticket>(`/itsm/tickets/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast.success("Ticket updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update ticket");
    },
  });
}

/**
 * POST /itsm/tickets/{id}/transition - transition ticket status.
 */
export function useTransitionTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) =>
      apiClient.post(`/itsm/tickets/${id}/transition`, { status, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({
        queryKey: ["ticket", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-queue"] });
      toast.success("Ticket status updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to transition ticket");
    },
  });
}

/**
 * POST /itsm/tickets/{id}/assign - assign a ticket.
 */
export function useAssignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      assigneeId,
      teamQueueId,
    }: {
      id: string;
      assigneeId?: string;
      teamQueueId?: string;
    }) =>
      apiClient.post(`/itsm/tickets/${id}/assign`, {
        assigneeId,
        teamQueueId,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({
        queryKey: ["ticket", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-queue"] });
      queryClient.invalidateQueries({ queryKey: ["team-queue"] });
      toast.success("Ticket assigned successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to assign ticket");
    },
  });
}

/**
 * POST /itsm/tickets/{id}/resolve - resolve a ticket.
 */
export function useResolveTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      resolutionNotes,
    }: {
      id: string;
      resolutionNotes: string;
    }) =>
      apiClient.post(`/itsm/tickets/${id}/resolve`, { resolutionNotes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({
        queryKey: ["ticket", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-queue"] });
      toast.success("Ticket resolved");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to resolve ticket");
    },
  });
}

/**
 * POST /itsm/tickets/{id}/close - close a ticket.
 */
export function useCloseTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/itsm/tickets/${id}/close`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast.success("Ticket closed");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to close ticket");
    },
  });
}

/**
 * POST /itsm/major-incidents - declare a major incident.
 */
export function useDeclareMajorIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeclareMajorIncidentPayload) =>
      apiClient.post<MajorIncidentRecord>("/itsm/major-incidents", {
        ticketId: payload.ticketId,
        severity: payload.severity,
        incidentCommanderId: payload.incidentCommanderId,
        communicationLeadId: payload.communicationLeadId,
        bridgeUrl: payload.bridgeUrl,
        bridgePhone: payload.bridgePhone,
        affectedServices: payload.affectedServices,
        affectedCiIds: payload.affectedCiIds,
        estimatedAffectedUsers: payload.estimatedAffectedUsers,
        businessImpact: payload.businessImpact,
        communicationPlan: payload.communicationPlan,
      }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", payload.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents-active"] });
      queryClient.invalidateQueries({ queryKey: ["major-incident-stats"] });
      toast.success("Major incident declared");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to declare major incident");
    },
  });
}

export function useTransitionMajorIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }: { id: string; targetStatus: string }) =>
      apiClient.post<MajorIncidentRecord>(`/itsm/major-incidents/${id}/transition`, {
        targetStatus,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["major-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents-active"] });
      queryClient.invalidateQueries({ queryKey: ["major-incident", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast.success("Major incident status updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to transition major incident");
    },
  });
}

export function usePostMajorIncidentUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      message,
      updateType,
    }: {
      id: string;
      message: string;
      updateType: "status_update" | "comms" | "technical";
    }) =>
      apiClient.post<MajorIncidentRecord>(`/itsm/major-incidents/${id}/update`, {
        message,
        updateType,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["major-incident", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents-active"] });
      toast.success("Stakeholder update posted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to post stakeholder update");
    },
  });
}

export function useResolveMajorIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      resolutionSummary,
      rootCause,
    }: {
      id: string;
      resolutionSummary: string;
      rootCause: string;
    }) =>
      apiClient.post<MajorIncidentRecord>(`/itsm/major-incidents/${id}/resolve`, {
        resolutionSummary,
        rootCause,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["major-incident", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents-active"] });
      queryClient.invalidateQueries({ queryKey: ["major-incident-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast.success("Major incident resolved");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to resolve major incident");
    },
  });
}

export function useSubmitMajorIncidentPIR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      pirReport,
    }: {
      id: string;
      pirReport: Record<string, unknown>;
    }) =>
      apiClient.post<MajorIncidentRecord>(`/itsm/major-incidents/${id}/pir`, {
        pirReport,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["major-incident", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents-active"] });
      queryClient.invalidateQueries({ queryKey: ["major-incident-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast.success("PIR submitted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to submit PIR");
    },
  });
}

export function useUpdateMajorIncidentCommunicationPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      communicationPlan,
    }: {
      id: string;
      communicationPlan: MajorIncidentCommunicationPlan;
    }) =>
      apiClient.put<MajorIncidentRecord>(`/itsm/major-incidents/${id}/communication-plan`, {
        communicationPlan,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["major-incident", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["major-incidents"] });
      toast.success("Communication plan updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update communication plan");
    },
  });
}

/**
 * POST /itsm/tickets/{id}/escalate - escalate a ticket manually.
 */
export function useEscalateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/itsm/tickets/${id}/escalate`, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.id] });
      toast.success("Ticket escalated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to escalate ticket");
    },
  });
}

/**
 * POST /itsm/tickets/{id}/link - link tickets together.
 */
export function useLinkTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      relatedTicketId,
    }: {
      id: string;
      relatedTicketId: string;
    }) =>
      apiClient.post(`/itsm/tickets/${id}/link`, { relatedTicketId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({
        queryKey: ["ticket", variables.id],
      });
      toast.success("Tickets linked successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to link tickets");
    },
  });
}

/* ================================================================== */
/*  Ticket Comments — Queries & Mutations                               */
/* ================================================================== */

/**
 * GET /itsm/tickets/{id}/comments - list comments for a ticket.
 */
export function useTicketComments(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: () =>
      apiClient.get<TicketComment[]>(`/itsm/tickets/${ticketId}/comments`, {
        includeInternal: true,
      }),
    enabled: !!ticketId,
  });
}

/**
 * POST /itsm/tickets/{id}/comments - add a comment to a ticket.
 */
export function useAddComment(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddCommentPayload) =>
      apiClient.post<TicketComment>(
        `/itsm/tickets/${ticketId}/comments`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-comments", ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", ticketId] });
      toast.success("Comment added");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to add comment");
    },
  });
}

/* ================================================================== */
/*  Ticket Status History                                               */
/* ================================================================== */

/**
 * GET /itsm/tickets/{id}/history - status history for a ticket.
 */
export function useTicketStatusHistory(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-history", ticketId],
    queryFn: () =>
      apiClient.get<TicketStatusHistory[]>(
        `/itsm/tickets/${ticketId}/history`,
      ),
    enabled: !!ticketId,
  });
}

/* ================================================================== */
/*  Ticket ↔ KB Article Links                                           */
/* ================================================================== */



/** GET /itsm/tickets/{id}/kb-links */
export function useTicketKBLinks(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-kb-links", ticketId],
    queryFn: () =>
      apiClient.get<TicketKBLink[]>(`/itsm/tickets/${ticketId}/kb-links`),
    enabled: !!ticketId,
  });
}

/** GET /itsm/tickets/{id}/kb-suggestions */
export function useTicketKBSuggestions(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-kb-suggestions", ticketId],
    queryFn: () =>
      apiClient.get<KBSuggestion[]>(
        `/itsm/tickets/${ticketId}/kb-suggestions`,
      ),
    enabled: !!ticketId,
  });
}

/** GET /itsm/tickets/{id}/kb-search?q=... */
export function useTicketKBSearch(
  ticketId: string | undefined,
  query: string,
) {
  return useQuery({
    queryKey: ["ticket-kb-search", ticketId, query],
    queryFn: () =>
      apiClient.get<KBSuggestion[]>(
        `/itsm/tickets/${ticketId}/kb-search`,
        { q: query, limit: 10 },
      ),
    enabled: !!ticketId && query.length >= 2,
  });
}

/** POST /itsm/tickets/{id}/kb-links */
export function useLinkArticle(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { articleId: string; linkType: string }) =>
      apiClient.post<TicketKBLink>(
        `/itsm/tickets/${ticketId}/kb-links`,
        body,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-kb-links", ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ticket-kb-suggestions", ticketId],
      });
      // Resolution links auto-add a comment, so refresh the timeline.
      if (variables.linkType === "resolution") {
        queryClient.invalidateQueries({
          queryKey: ["ticket-comments", ticketId],
        });
      }
      toast.success("Article linked");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to link article");
    },
  });
}

/** DELETE /itsm/tickets/{id}/kb-links/{linkId} */
export function useUnlinkArticle(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      apiClient.delete(`/itsm/tickets/${ticketId}/kb-links/${linkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-kb-links", ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ticket-kb-suggestions", ticketId],
      });
      toast.success("Article unlinked");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to unlink article");
    },
  });
}

/* ================================================================== */
/*  SLA Policies — Queries                                              */
/* ================================================================== */

/**
 * GET /itsm/sla-policies - paginated list of SLA policies.
 */
export function useSLAPolicies(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["sla-policies", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SLAPolicy>>("/itsm/sla-policies", {
        page,
        limit,
      }),
  });
}

/**
 * GET /itsm/sla-policies/{id} - single SLA policy detail.
 */
export function useSLAPolicy(id: string | undefined) {
  return useQuery({
    queryKey: ["sla-policy", id],
    queryFn: () =>
      apiClient.get<SLAPolicy>(`/itsm/sla-policies/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /itsm/sla-policies/default - the default SLA policy.
 */
export function useDefaultSLAPolicy() {
  return useQuery({
    queryKey: ["sla-policy-default"],
    queryFn: () =>
      apiClient.get<SLAPolicy>("/itsm/sla-policies/default"),
  });
}

/* ================================================================== */
/*  SLA Policies — Mutations                                            */
/* ================================================================== */

/**
 * POST /itsm/sla-policies - create an SLA policy.
 */
export function useCreateSLAPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SLAPolicy>) =>
      apiClient.post<SLAPolicy>("/itsm/sla-policies", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      toast.success("SLA policy created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create SLA policy");
    },
  });
}

/**
 * PUT /itsm/sla-policies/{id} - update an SLA policy.
 */
export function useUpdateSLAPolicy(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SLAPolicy>) =>
      apiClient.put<SLAPolicy>(`/itsm/sla-policies/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      queryClient.invalidateQueries({ queryKey: ["sla-policy", id] });
      toast.success("SLA policy updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update SLA policy");
    },
  });
}

/**
 * DELETE /itsm/sla-policies/{id} - delete an SLA policy.
 */
export function useDeleteSLAPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/sla-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      toast.success("SLA policy deleted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete SLA policy");
    },
  });
}

/* ================================================================== */
/*  SLA Compliance & Breaches                                           */
/* ================================================================== */

/**
 * GET /itsm/sla-compliance - overall SLA compliance stats.
 */
export function useSLAComplianceStats(priority?: string) {
  return useQuery({
    queryKey: ["sla-compliance", priority],
    queryFn: () =>
      apiClient.get<SLAComplianceStats>("/itsm/sla-compliance", {
        priority,
      }),
  });
}

/**
 * GET /itsm/sla-compliance/service-requests - SLA compliance stats for service requests.
 */
export interface ServiceRequestSLACompliance {
  totalRequests: number;
  withSla: number;
  resolutionMet: number;
  resolutionBreached: number;
  fulfillmentMet: number;
  fulfillmentBreached: number;
  activeAtRisk: number;
}

export function useServiceRequestSLACompliance() {
  return useQuery({
    queryKey: ["sla-compliance-service-requests"],
    queryFn: () =>
      apiClient.get<ServiceRequestSLACompliance>(
        "/itsm/sla-compliance/service-requests",
      ),
  });
}

/**
 * GET /itsm/sla-breaches/{ticketId} - SLA breach entries for a ticket.
 */
export function useSLABreaches(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["sla-breaches", ticketId],
    queryFn: () =>
      apiClient.get<SLABreachEntry[]>(`/itsm/sla-breaches/${ticketId}`),
    enabled: !!ticketId,
  });
}

/* ================================================================== */
/*  Business Hours Calendars — Queries                                  */
/* ================================================================== */

/**
 * GET /itsm/business-hours - list business hours calendars.
 */
export function useBusinessHoursCalendars() {
  return useQuery({
    queryKey: ["business-hours"],
    queryFn: () =>
      apiClient.get<BusinessHoursCalendar[]>("/itsm/business-hours"),
  });
}

/* ================================================================== */
/*  Business Hours Calendars — Mutations                                */
/* ================================================================== */

/**
 * POST /itsm/business-hours - create a business hours calendar.
 */
export function useCreateBusinessHoursCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<BusinessHoursCalendar>) =>
      apiClient.post<BusinessHoursCalendar>("/itsm/business-hours", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours"] });
      toast.success("Business hours calendar created");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create business hours calendar");
    },
  });
}

/**
 * PUT /itsm/business-hours/{id} - update a business hours calendar.
 */
export function useUpdateBusinessHoursCalendar(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<BusinessHoursCalendar>) =>
      apiClient.put<BusinessHoursCalendar>(
        `/itsm/business-hours/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours"] });
      toast.success("Business hours calendar updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update business hours calendar");
    },
  });
}

/**
 * DELETE /itsm/business-hours/{id} - delete a business hours calendar.
 */
export function useDeleteBusinessHoursCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/business-hours/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours"] });
      toast.success("Business hours calendar deleted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete business hours calendar");
    },
  });
}

/* ================================================================== */
/*  Escalation Rules — Queries                                          */
/* ================================================================== */

/**
 * GET /itsm/escalation-rules - list escalation rules.
 */
export function useEscalationRules() {
  return useQuery({
    queryKey: ["escalation-rules"],
    queryFn: () =>
      apiClient.get<EscalationRule[]>("/itsm/escalation-rules"),
  });
}

/* ================================================================== */
/*  Escalation Rules — Mutations                                        */
/* ================================================================== */

/**
 * POST /itsm/escalation-rules - create an escalation rule.
 */
export function useCreateEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EscalationRule>) =>
      apiClient.post<EscalationRule>("/itsm/escalation-rules", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-rules"] });
      toast.success("Escalation rule created");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create escalation rule");
    },
  });
}

/**
 * PUT /itsm/escalation-rules/{id} - update an escalation rule.
 */
export function useUpdateEscalationRule(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EscalationRule>) =>
      apiClient.put<EscalationRule>(`/itsm/escalation-rules/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-rules"] });
      toast.success("Escalation rule updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update escalation rule");
    },
  });
}

/**
 * DELETE /itsm/escalation-rules/{id} - delete an escalation rule.
 */
export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/escalation-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-rules"] });
      toast.success("Escalation rule deleted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete escalation rule");
    },
  });
}

/* ================================================================== */
/*  Problems — Queries                                                  */
/* ================================================================== */

/**
 * GET /itsm/problems - paginated list of problems.
 */
export function useProblems(page = 1, limit = 20, status?: string, assignedGroupId?: string) {
  return useQuery({
    queryKey: ["itsm-problems", page, limit, status, assignedGroupId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ITSMProblem>>("/itsm/problems", {
        page,
        limit,
        status,
        assignedGroupId,
      }),
  });
}

/**
 * GET /itsm/problems/{id} - single problem detail.
 */
export function useProblem(id: string | undefined) {
  return useQuery({
    queryKey: ["itsm-problem", id],
    queryFn: () => apiClient.get<ITSMProblem>(`/itsm/problems/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /itsm/problems/rca-templates - structured RCA templates.
 */
export function useProblemRCATemplates() {
  return useQuery({
    queryKey: ["problem-rca-templates"],
    queryFn: () =>
      apiClient.get<ProblemRCATemplate[]>("/itsm/problems/rca-templates"),
  });
}

/* ================================================================== */
/*  Problems — Mutations                                                */
/* ================================================================== */

/**
 * POST /itsm/problems - create a problem.
 */
export function useCreateProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ITSMProblem>) =>
      apiClient.post<ITSMProblem>("/itsm/problems", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsm-problems"] });
      toast.success("Problem created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create problem");
    },
  });
}

/**
 * PUT /itsm/problems/{id} - update a problem.
 */
export function useUpdateProblem(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProblemPayload) =>
      apiClient.put<ITSMProblem>(`/itsm/problems/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsm-problems"] });
      queryClient.invalidateQueries({ queryKey: ["itsm-problem", id] });
      toast.success("Problem updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update problem");
    },
  });
}

/**
 * DELETE /itsm/problems/{id} - delete a problem.
 */
export function useDeleteProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/problems/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsm-problems"] });
      toast.success("Problem deleted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete problem");
    },
  });
}

/**
 * POST /itsm/problems/{id}/transition - transition problem status.
 */
export function useTransitionProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      targetStatus,
      comment,
    }: {
      id: string;
      targetStatus: string;
      comment?: string;
    }) =>
      apiClient.post(`/itsm/problems/${id}/transition`, {
        targetStatus,
        comment,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["itsm-problems"] });
      queryClient.invalidateQueries({
        queryKey: ["itsm-problem", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["known-errors"] });
      toast.success("Problem status updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to transition problem");
    },
  });
}

/**
 * POST /itsm/problems/{id}/link-incident - link an incident to a problem.
 */
export function useLinkIncidentToProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      problemId,
      ticketId,
    }: {
      problemId: string;
      ticketId: string;
    }) =>
      apiClient.post(`/itsm/problems/${problemId}/link-incident`, {
        incidentId: ticketId,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["itsm-problems"] });
      queryClient.invalidateQueries({
        queryKey: ["itsm-problem", variables.problemId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ticket", variables.ticketId],
      });
      toast.success("Incident linked to problem");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to link incident to problem");
    },
  });
}

/**
 * POST /itsm/problems/{id}/configuration-links - link assets and CIs to a problem.
 */
export function useLinkProblemConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      problemId,
      assetIds,
      ciIds,
      replace,
    }: {
      problemId: string;
      assetIds?: string[];
      ciIds?: string[];
      replace?: boolean;
    }) =>
      apiClient.post(`/itsm/problems/${problemId}/configuration-links`, {
        assetIds,
        ciIds,
        replace,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["itsm-problems"] });
      queryClient.invalidateQueries({
        queryKey: ["itsm-problem", variables.problemId],
      });
      toast.success("Problem configuration links updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to link configuration items");
    },
  });
}

/* ================================================================== */
/*  Known Errors — Queries & Mutations                                  */
/* ================================================================== */

/**
 * GET /itsm/problems/known-errors - list known errors.
 */
export function useKnownErrors(problemId?: string) {
  return useQuery({
    queryKey: ["known-errors", problemId],
    queryFn: () =>
      apiClient.get<KnownError[]>("/itsm/problems/known-errors", {
        problemId,
      }),
  });
}

/**
 * POST /itsm/problems/known-errors - create a known error.
 */
export function useCreateKnownError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KnownError>) =>
      apiClient.post<KnownError>("/itsm/problems/known-errors", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["known-errors"] });
      toast.success("Known error created");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create known error");
    },
  });
}

/**
 * PUT /itsm/problems/known-errors/{id} - update a known error.
 */
export function useUpdateKnownError(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KnownError>) =>
      apiClient.put<KnownError>(`/itsm/problems/known-errors/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["known-errors"] });
      toast.success("Known error updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update known error");
    },
  });
}

/**
 * DELETE /itsm/problems/known-errors/{id} - delete a known error.
 */
export function useDeleteKnownError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/problems/known-errors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["known-errors"] });
      toast.success("Known error deleted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete known error");
    },
  });
}

/* ================================================================== */
/*  Support Queues — Queries                                            */
/* ================================================================== */

/**
 * GET /itsm/queues - list support queues.
 */
export function useSupportQueues(isActive?: boolean) {
  return useQuery({
    queryKey: ["support-queues", isActive],
    queryFn: () =>
      apiClient.get<SupportQueue[]>("/itsm/queues", {
        isActive,
      }),
  });
}

/* ================================================================== */
/*  Support Queues — Mutations                                          */
/* ================================================================== */

/**
 * POST /itsm/queues - create a support queue.
 */
export function useCreateSupportQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SupportQueue>) =>
      apiClient.post<SupportQueue>("/itsm/queues", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-queues"] });
      toast.success("Support queue created");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create support queue");
    },
  });
}

/**
 * PUT /itsm/queues/{id} - update a support queue.
 */
export function useUpdateSupportQueue(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SupportQueue>) =>
      apiClient.put<SupportQueue>(`/itsm/queues/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-queues"] });
      toast.success("Support queue updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update support queue");
    },
  });
}

/**
 * DELETE /itsm/queues/{id} - delete a support queue.
 */
export function useDeleteSupportQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/queues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-queues"] });
      toast.success("Support queue deleted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete support queue");
    },
  });
}

/* ================================================================== */
/*  CSAT — Queries & Mutations                                          */
/* ================================================================== */

/**
 * GET /itsm/tickets/csat-stats - customer satisfaction statistics.
 */
export function useCSATStats() {
  return useQuery({
    queryKey: ["csat-stats"],
    queryFn: () => apiClient.get<CSATStats>("/itsm/tickets/csat-stats"),
  });
}

/**
 * POST /itsm/tickets/csat - submit a CSAT survey.
 * ticketId is passed in the request body (not the URL path).
 */
export function useCreateCSATSurvey(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CSATSurvey>) =>
      apiClient.post<CSATSurvey>(
        `/itsm/tickets/csat`,
        { ...body, ticketId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csat-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast.success("Feedback submitted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to submit feedback");
    },
  });
}

/**
 * POST /itsm/tickets/bulk/update - bulk update tickets.
 */
export function useBulkUpdateTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; fields: Record<string, unknown> }) =>
      apiClient.post("/itsm/tickets/bulk/update", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });
}

/* ================================================================== */
/*  Service Requests — Types                                           */
/* ================================================================== */

export interface ServiceRequest {
  id: string;
  tenantId: string;
  requestNumber: string;
  catalogItemId: string;
  requesterId: string;
  status: string;
  formData?: Record<string, unknown>;
  assignedTo?: string;
  priority: string;
  ticketId?: string;
  rejectionReason?: string;
  fulfillmentNotes?: string;
  fulfilledAt?: string;
  closedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  catalogItemName?: string;
  // SLA fields
  slaPolicyId?: string;
  slaResolutionTarget?: string;
  slaResolutionMet?: boolean;
  slaFulfillmentTarget?: string;
  slaFulfillmentMet?: boolean;
  slaPausedAt?: string;
  slaPausedDurationMinutes?: number;
}

export interface ApprovalTask {
  id: string;
  tenantId: string;
  requestId: string;
  approverId: string;
  sequenceOrder: number;
  status: string;
  decisionAt?: string;
  comment?: string;
  delegatedTo?: string;
  createdAt: string;
}

export interface RequestTimelineEntry {
  id: string;
  requestId: string;
  eventType: string;
  actorId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ServiceRequestDetail extends ServiceRequest {
  approvalTasks: ApprovalTask[];
  timeline: RequestTimelineEntry[];
}

/* ================================================================== */
/*  Service Requests — Queries                                         */
/* ================================================================== */

/**
 * GET /itsm/catalog/requests - list service requests for the current user.
 */
export function useMyServiceRequests(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ["service-requests", page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ServiceRequest>>(
        "/itsm/catalog/requests",
        { page, limit, status },
      ),
  });
}

/**
 * GET /itsm/catalog/requests/{id} - single service request detail.
 */
export function useServiceRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["service-request", id],
    queryFn: () =>
      apiClient.get<ServiceRequestDetail>(`/itsm/catalog/requests/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /itsm/catalog/requests/pending-approvals - requests pending approval by the current user.
 */
export function usePendingApprovals(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["pending-approvals", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ServiceRequest>>(
        "/itsm/catalog/requests/pending-approvals",
        { page, limit },
      ),
  });
}

/* ================================================================== */
/*  Service Requests — Mutations                                       */
/* ================================================================== */

/**
 * POST /itsm/catalog/requests - submit a new service request.
 */
export function useSubmitServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      catalogItemId: string;
      formData?: Record<string, unknown>;
    }) => apiClient.post<ServiceRequest>("/itsm/catalog/requests", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Service request submitted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to submit service request");
    },
  });
}

/**
 * POST /itsm/catalog/requests/{id}/approve - approve a service request.
 */
export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      apiClient.post(`/itsm/catalog/requests/${id}/approve`, { comment }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["service-request", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["itsm-operations-snapshot"] });
      toast.success("Request approved");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to approve request");
    },
  });
}

/**
 * POST /itsm/catalog/requests/{id}/reject - reject a service request.
 */
export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/itsm/catalog/requests/${id}/reject`, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["service-request", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["itsm-operations-snapshot"] });
      toast.success("Request rejected");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to reject request");
    },
  });
}

/**
 * POST /itsm/catalog/requests/{id}/cancel - cancel a service request.
 */
export function useCancelServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/itsm/catalog/requests/${id}/cancel`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["service-request", id] });
      toast.success("Request cancelled");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to cancel request");
    },
  });
}

/**
 * POST /itsm/catalog/requests/{id}/start-fulfillment - start fulfillment work.
 */
export function useStartServiceRequestFulfillment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo?: string }) =>
      apiClient.post<ServiceRequest>(
        `/itsm/catalog/requests/${id}/start-fulfillment`,
        { assignedTo },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["service-request", variables.id],
      });
      toast.success("Fulfillment started");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to start fulfillment");
    },
  });
}

/**
 * POST /itsm/catalog/requests/{id}/fulfill - mark a service request fulfilled.
 */
export function useFulfillServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiClient.post<ServiceRequest>(`/itsm/catalog/requests/${id}/fulfill`, {
        fulfillmentNotes: notes,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["service-request", variables.id],
      });
      toast.success("Request marked fulfilled");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to fulfill request");
    },
  });
}

/**
 * POST /itsm/catalog/requests/{id}/close - close a fulfilled service request.
 */
export function useCloseServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      apiClient.post<ServiceRequest>(`/itsm/catalog/requests/${id}/close`, {
        comment,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["service-request", variables.id],
      });
      toast.success("Request closed");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to close request");
    },
  });
}

/* ================================================================== */
/*  Change Management — Queries                                        */
/* ================================================================== */

/**
 * GET /itsm/changes - list changes with optional filters.
 */
export function useChanges(params?: { classification?: string; status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["changes", params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>("/itsm/changes", {
        classification: params?.classification,
        status: params?.status,
        page: params?.page,
        pageSize: params?.pageSize,
      }),
  });
}

/**
 * GET /itsm/changes/{id} - single change.
 */
export function useChange(id: string | undefined) {
  return useQuery({
    queryKey: ["change", id],
    queryFn: () => apiClient.get<Ticket>(`/itsm/changes/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /itsm/changes/stats - change statistics.
 */
export function useChangeStats() {
  return useQuery({
    queryKey: ["change-stats"],
    queryFn: () => apiClient.get<ChangeStats>("/itsm/changes/stats"),
  });
}

/**
 * GET /itsm/changes/calendar - change calendar events.
 */
export function useChangeCalendar(start: string, end: string) {
  return useQuery({
    queryKey: ["change-calendar", start, end],
    queryFn: () =>
      apiClient.get<ChangeCalendarEvent[]>("/itsm/changes/calendar", { start, end }),
    enabled: !!start && !!end,
  });
}

/* ================================================================== */
/*  Change Management — Mutations                                      */
/* ================================================================== */

/**
 * POST /itsm/changes - create a change.
 */
export function useCreateChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChangePayload) =>
      apiClient.post<Ticket>("/itsm/changes", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change-stats"] });
      toast.success("Change created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create change");
    },
  });
}

/**
 * PUT /itsm/changes/{id} - update a change.
 */
export function useUpdateChange(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChangePayload) =>
      apiClient.put<Ticket>(`/itsm/changes/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      toast.success("Change updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update change");
    },
  });
}

/**
 * POST /itsm/changes/{id}/transition - transition change status.
 */
export function useTransitionChange(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { targetStatus: string; comment?: string }) =>
      apiClient.post<Ticket>(`/itsm/changes/${id}/transition`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      queryClient.invalidateQueries({ queryKey: ["change-stats"] });
      toast.success("Change status updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to transition change");
    },
  });
}

/**
 * POST /itsm/changes/{id}/cab-decision - submit CAB decision.
 */
export function useSubmitCABDecision(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: string; notes?: string }) =>
      apiClient.post<Ticket>(`/itsm/changes/${id}/cab-decision`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      queryClient.invalidateQueries({ queryKey: ["change-stats"] });
      toast.success("CAB decision submitted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to submit CAB decision");
    },
  });
}

/**
 * POST /itsm/changes/{id}/pir - complete post-implementation review.
 */
export function useCompletePIR(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { pirNotes: string }) =>
      apiClient.post<Ticket>(`/itsm/changes/${id}/pir`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      queryClient.invalidateQueries({ queryKey: ["change-stats"] });
      toast.success("PIR completed");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to complete PIR");
    },
  });
}

/**
 * POST /itsm/changes/{id}/risk-assessment - submit risk assessment.
 */
export function useSubmitRiskAssessment(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { riskAssessment: Record<string, unknown>; riskLevel?: string }) =>
      apiClient.post<Ticket>(`/itsm/changes/${id}/risk-assessment`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      toast.success("Risk assessment submitted");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to submit risk assessment");
    },
  });
}

/**
 * POST /itsm/changes/{id}/implement - start implementation.
 */
export function useImplementChange(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: { comment?: string }) =>
      apiClient.post<Ticket>(`/itsm/changes/${id}/implement`, body ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      queryClient.invalidateQueries({ queryKey: ["change-stats"] });
      toast.success("Implementation started");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to start implementation");
    },
  });
}

/**
 * POST /itsm/changes/{id}/complete - complete change with success/failure.
 */
export function useCompleteChange(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { success: boolean; notes?: string }) =>
      apiClient.post<Ticket>(`/itsm/changes/${id}/complete`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      queryClient.invalidateQueries({ queryKey: ["change-stats"] });
      toast.success("Change completed");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to complete change");
    },
  });
}

/**
 * POST /itsm/changes/{id}/rollback - trigger rollback.
 */
export function useRollbackChange(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiClient.post<Ticket>(`/itsm/changes/${id}/rollback`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["change", id] });
      queryClient.invalidateQueries({ queryKey: ["change-stats"] });
      toast.success("Change rolled back");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to rollback change");
    },
  });
}

/* ================================================================== */
/*  CAB Meetings — Queries                                             */
/* ================================================================== */

/**
 * GET /itsm/cab-meetings - list CAB meetings.
 */
export function useCABMeetings(params?: { status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["cab-meetings", params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CABMeeting>>("/itsm/cab-meetings", {
        status: params?.status,
        page: params?.page,
        pageSize: params?.pageSize,
      }),
  });
}

/**
 * GET /itsm/cab-meetings/{id} - single CAB meeting.
 */
export function useCABMeeting(id: string | undefined) {
  return useQuery({
    queryKey: ["cab-meeting", id],
    queryFn: () => apiClient.get<CABMeeting>(`/itsm/cab-meetings/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  CAB Meetings — Mutations                                           */
/* ================================================================== */

/**
 * POST /itsm/cab-meetings - create a CAB meeting.
 */
export function useCreateCABMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCABMeetingPayload) =>
      apiClient.post<CABMeeting>("/itsm/cab-meetings", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cab-meetings"] });
      toast.success("CAB meeting created");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create CAB meeting");
    },
  });
}

/**
 * PUT /itsm/cab-meetings/{id} - update a CAB meeting.
 */
export function useUpdateCABMeeting(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCABMeetingPayload) =>
      apiClient.put<CABMeeting>(`/itsm/cab-meetings/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cab-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["cab-meeting", id] });
      toast.success("CAB meeting updated");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update CAB meeting");
    },
  });
}

/**
 * POST /itsm/cab-meetings/{id}/complete - complete a CAB meeting.
 */
export function useCompleteCABMeeting(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post(`/itsm/cab-meetings/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cab-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["cab-meeting", id] });
      toast.success("CAB meeting completed");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to complete CAB meeting");
    },
  });
}

/* ================================================================== */
/*  OLA (Operational Level Agreements) — Queries                       */
/* ================================================================== */

export function useOLAs(status?: string) {
  return useQuery({
    queryKey: ["olas", status],
    queryFn: () =>
      apiClient.get<OperationalLevelAgreement[]>("/itsm/olas", { status }),
  });
}

export function useOLA(id: string | undefined) {
  return useQuery({
    queryKey: ["ola", id],
    queryFn: () =>
      apiClient.get<OperationalLevelAgreement>(`/itsm/olas/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  OLA — Mutations                                                    */
/* ================================================================== */

export function useCreateOLA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OperationalLevelAgreement>) =>
      apiClient.post<OperationalLevelAgreement>("/itsm/olas", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["olas"] });
      toast.success("OLA created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create OLA");
    },
  });
}

export function useUpdateOLA(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OperationalLevelAgreement>) =>
      apiClient.put<OperationalLevelAgreement>(`/itsm/olas/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["olas"] });
      queryClient.invalidateQueries({ queryKey: ["ola", id] });
      toast.success("OLA updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update OLA");
    },
  });
}

export function useDeleteOLA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/olas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["olas"] });
      toast.success("OLA deleted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete OLA");
    },
  });
}

/* ================================================================== */
/*  UC (Underpinning Contracts) — Queries                              */
/* ================================================================== */

export function useUCs(status?: string) {
  return useQuery({
    queryKey: ["ucs", status],
    queryFn: () =>
      apiClient.get<UnderpinningContract[]>("/itsm/underpinning-contracts", { status }),
  });
}

export function useUC(id: string | undefined) {
  return useQuery({
    queryKey: ["uc", id],
    queryFn: () =>
      apiClient.get<UnderpinningContract>(`/itsm/underpinning-contracts/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  UC — Mutations                                                     */
/* ================================================================== */

export function useCreateUC() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UnderpinningContract>) =>
      apiClient.post<UnderpinningContract>("/itsm/underpinning-contracts", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ucs"] });
      toast.success("Underpinning contract created successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create underpinning contract");
    },
  });
}

export function useUpdateUC(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UnderpinningContract>) =>
      apiClient.put<UnderpinningContract>(`/itsm/underpinning-contracts/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ucs"] });
      queryClient.invalidateQueries({ queryKey: ["uc", id] });
      toast.success("Underpinning contract updated successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to update underpinning contract");
    },
  });
}

export function useDeleteUC() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/underpinning-contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ucs"] });
      toast.success("Underpinning contract deleted successfully");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to delete underpinning contract");
    },
  });
}

/* ================================================================== */
/*  SLA Dependency Chain                                               */
/* ================================================================== */

export function useSLADependencyChain(slaId: string | undefined) {
  return useQuery({
    queryKey: ["sla-dependency-chain", slaId],
    queryFn: () =>
      apiClient.get<SLADependencyChainEntry[]>(`/itsm/sla/dependency-chain/${slaId}`),
    enabled: !!slaId,
  });
}

export function useCreateDependencyChainEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { slaPolicyId: string; olaId?: string; ucId?: string; notes?: string }) =>
      apiClient.post("/itsm/sla/dependency-chain", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-dependency-chain"] });
      toast.success("Dependency chain entry created");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to create dependency chain entry");
    },
  });
}

export function useDeleteDependencyChainEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/itsm/sla/dependency-chain/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-dependency-chain"] });
      toast.success("Dependency chain entry removed");
    },
    onError: (error) => {
      toastMutationError(error, "Failed to remove dependency chain entry");
    },
  });
}

/* ================================================================== */
/*  SLA Consistency Check & Expiring                                   */
/* ================================================================== */

export function useSLAConsistencyCheck() {
  return useQuery({
    queryKey: ["sla-consistency-check"],
    queryFn: () =>
      apiClient.get<ConsistencyViolation[]>("/itsm/sla/consistency-check"),
  });
}

export function useExpiringAgreements(days = 30) {
  return useQuery({
    queryKey: ["sla-expiring", days],
    queryFn: () =>
      apiClient.get<ExpiringAgreements>("/itsm/sla/expiring", { days }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  CatalogCategory,
  CatalogItem,
  Ticket,
  TicketComment,
  TicketStatusHistory,
  TicketStats,
  SLAPolicy,
  BusinessHoursCalendar,
  SLABreachEntry,
  SLAComplianceStats,
  EscalationRule,
  ITSMProblem,
  KnownError,
  SupportQueue,
  CSATSurvey,
  CSATStats,
  PaginatedResponse,
} from "@/types";

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
        parent_id: parentId,
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
    onError: () => {
      toast.error("Failed to create category");
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
    onError: () => {
      toast.error("Failed to update category");
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
    onError: () => {
      toast.error("Failed to delete category");
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
        category_id: categoryId,
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
    onError: () => {
      toast.error("Failed to bulk update item statuses");
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
    onError: () => {
      toast.error("Failed to create catalog item");
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
    onError: () => {
      toast.error("Failed to update catalog item");
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
    onError: () => {
      toast.error("Failed to delete catalog item");
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
        assignee_id: filters?.assigneeId,
        reporter_id: filters?.reporterId,
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
    onError: () => {
      toast.error("Failed to create ticket");
    },
  });
}

/**
 * PUT /itsm/tickets/{id} - update a ticket.
 */
export function useUpdateTicket(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Ticket>) =>
      apiClient.put<Ticket>(`/itsm/tickets/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast.success("Ticket updated successfully");
    },
    onError: () => {
      toast.error("Failed to update ticket");
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
    onError: () => {
      toast.error("Failed to transition ticket");
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
    onError: () => {
      toast.error("Failed to assign ticket");
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
    onError: () => {
      toast.error("Failed to resolve ticket");
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
    onError: () => {
      toast.error("Failed to close ticket");
    },
  });
}

/**
 * POST /itsm/tickets/{id}/major-incident - declare a major incident.
 */
export function useDeclareMajorIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/itsm/tickets/${id}/major-incident`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast.success("Major incident declared");
    },
    onError: () => {
      toast.error("Failed to declare major incident");
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
    onError: () => {
      toast.error("Failed to link tickets");
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
    mutationFn: (body: Partial<TicketComment>) =>
      apiClient.post<TicketComment>(
        `/itsm/tickets/${ticketId}/comments`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-comments", ticketId],
      });
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
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
    onError: () => {
      toast.error("Failed to create SLA policy");
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
    onError: () => {
      toast.error("Failed to update SLA policy");
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
    onError: () => {
      toast.error("Failed to delete SLA policy");
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
    onError: () => {
      toast.error("Failed to create business hours calendar");
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
    onError: () => {
      toast.error("Failed to update business hours calendar");
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
    onError: () => {
      toast.error("Failed to delete business hours calendar");
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
    onError: () => {
      toast.error("Failed to create escalation rule");
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
    onError: () => {
      toast.error("Failed to update escalation rule");
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
    onError: () => {
      toast.error("Failed to delete escalation rule");
    },
  });
}

/* ================================================================== */
/*  Problems — Queries                                                  */
/* ================================================================== */

/**
 * GET /itsm/problems - paginated list of problems.
 */
export function useProblems(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ["itsm-problems", page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ITSMProblem>>("/itsm/problems", {
        page,
        limit,
        status,
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
    onError: () => {
      toast.error("Failed to create problem");
    },
  });
}

/**
 * PUT /itsm/problems/{id} - update a problem.
 */
export function useUpdateProblem(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ITSMProblem>) =>
      apiClient.put<ITSMProblem>(`/itsm/problems/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsm-problems"] });
      queryClient.invalidateQueries({ queryKey: ["itsm-problem", id] });
      toast.success("Problem updated successfully");
    },
    onError: () => {
      toast.error("Failed to update problem");
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
    onError: () => {
      toast.error("Failed to delete problem");
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
        ticketId,
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
    onError: () => {
      toast.error("Failed to link incident to problem");
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
        problem_id: problemId,
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
    onError: () => {
      toast.error("Failed to create known error");
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
    onError: () => {
      toast.error("Failed to update known error");
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
        is_active: isActive,
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
    onError: () => {
      toast.error("Failed to create support queue");
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
    onError: () => {
      toast.error("Failed to update support queue");
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
    onError: () => {
      toast.error("Failed to delete support queue");
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
 * POST /itsm/tickets/{ticketId}/csat - submit a CSAT survey.
 */
export function useCreateCSATSurvey(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CSATSurvey>) =>
      apiClient.post<CSATSurvey>(
        `/itsm/tickets/${ticketId}/csat`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csat-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast.success("Feedback submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit feedback");
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
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  catalogItemName?: string;
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
      toast.success("Service request submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit service request");
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
      toast.success("Request approved");
    },
    onError: () => {
      toast.error("Failed to approve request");
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
      toast.success("Request rejected");
    },
    onError: () => {
      toast.error("Failed to reject request");
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
    onError: () => {
      toast.error("Failed to cancel request");
    },
  });
}

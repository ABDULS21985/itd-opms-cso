import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/types";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface WorkflowStepDef {
  stepOrder: number;
  name: string;
  mode: "sequential" | "parallel" | "any_of";
  quorum: number;
  approverType: string;
  approverIds: string[];
  timeoutHours: number;
  allowDelegation: boolean;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  entityType: string;
  steps: WorkflowStepDef[];
  isActive: boolean;
  version: number;
  autoAssignRules?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStep {
  id: string;
  chainId: string;
  stepOrder: number;
  approverId: string;
  approverName: string;
  decision: "pending" | "approved" | "rejected" | "skipped";
  comments: string | null;
  decidedAt: string | null;
  evidenceRefs: string[];
  delegatedFrom: string | null;
  reminderSentAt: string | null;
  deadline: string | null;
  createdAt: string;
}

export interface ApprovalChain {
  id: string;
  entityType: string;
  entityId: string;
  tenantId: string;
  workflowDefinitionId: string;
  status: "pending" | "in_progress" | "approved" | "rejected" | "cancelled";
  currentStep: number;
  deadline: string | null;
  urgency: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  steps: ApprovalStep[];
}

export interface PendingApprovalItem {
  stepId: string;
  chainId: string;
  entityType: string;
  entityId: string;
  stepOrder: number;
  stepName: string;
  urgency: string;
  deadline: string | null;
  requestedBy: string;
  requestedAt: string;
  chainStatus: string;
}

export interface ApprovalHistoryItem {
  chainId: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  urgency: string;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

/* ================================================================== */
/*  Workflow Definitions — Queries                                     */
/* ================================================================== */

/**
 * GET /approvals/workflows - list all workflow definitions.
 */
export function useWorkflowDefinitions(entityType?: string) {
  return useQuery({
    queryKey: ["workflow-definitions", entityType],
    queryFn: () =>
      apiClient.get<WorkflowDefinition[]>("/approvals/workflows", {
        entityType,
      }),
  });
}

/**
 * GET /approvals/workflows/{id} - single workflow definition.
 */
export function useWorkflowDefinition(id: string | undefined) {
  return useQuery({
    queryKey: ["workflow-definition", id],
    queryFn: () =>
      apiClient.get<WorkflowDefinition>(`/approvals/workflows/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Workflow Definitions — Request types                               */
/* ================================================================== */

export interface CreateWorkflowDefinitionBody {
  name: string;
  description: string | null;
  entityType: string;
  steps: WorkflowStepDef[];
  autoAssignRules?: Record<string, unknown>;
}

export interface UpdateWorkflowDefinitionBody {
  name?: string;
  description?: string | null;
  entityType?: string;
  steps?: WorkflowStepDef[];
  isActive?: boolean;
  autoAssignRules?: Record<string, unknown>;
}

/* ================================================================== */
/*  Workflow Definitions — Mutations                                   */
/* ================================================================== */

/**
 * POST /approvals/workflows - create a workflow definition.
 */
export function useCreateWorkflowDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkflowDefinitionBody) =>
      apiClient.post<WorkflowDefinition>("/approvals/workflows", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
      toast.success("Workflow definition created");
    },
    onError: () => {
      toast.error("Failed to create workflow definition");
    },
  });
}

/**
 * PUT /approvals/workflows/{id} - update a workflow definition.
 * Sends only the fields that should be updated; server uses COALESCE for
 * omitted fields so existing values are preserved.
 * Description accepts null to explicitly clear the field.
 */
export function useUpdateWorkflowDefinition(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateWorkflowDefinitionBody) =>
      apiClient.put<WorkflowDefinition>(`/approvals/workflows/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
      queryClient.invalidateQueries({
        queryKey: ["workflow-definition", id],
      });
      toast.success("Workflow definition updated");
    },
    onError: () => {
      toast.error("Failed to update workflow definition");
    },
  });
}

/**
 * DELETE /approvals/workflows/{id} - soft-delete a workflow definition.
 */
export function useDeleteWorkflowDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/approvals/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
      toast.success("Workflow definition deactivated");
    },
    onError: () => {
      toast.error("Failed to deactivate workflow definition");
    },
  });
}

/* ================================================================== */
/*  Approval Chains — Queries                                          */
/* ================================================================== */

/**
 * GET /approvals/chains/{id} - single approval chain with steps.
 */
export function useApprovalChain(id: string | undefined) {
  return useQuery({
    queryKey: ["approval-chain", id],
    queryFn: () => apiClient.get<ApprovalChain>(`/approvals/chains/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /approvals/entity/{entityType}/{entityId} - chain for a specific entity.
 */
export function useApprovalChainForEntity(
  entityType: string | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: ["approval-chain-entity", entityType, entityId],
    queryFn: () =>
      apiClient.get<ApprovalChain>(
        `/approvals/entity/${entityType}/${entityId}`,
      ),
    enabled: !!entityType && !!entityId,
    retry: false,
  });
}

/* ================================================================== */
/*  Approval Chains — Mutations                                        */
/* ================================================================== */

/**
 * POST /approvals/chains - start a new approval chain.
 */
export function useStartApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      entityType: string;
      entityId: string;
      workflowDefinitionId?: string;
      urgency?: string;
      deadline?: string;
      metadata?: Record<string, unknown>;
    }) => apiClient.post<ApprovalChain>("/approvals/chains", body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approval-chain-entity"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-approvals"] });
      queryClient.invalidateQueries({
        queryKey: [
          "approval-chain-entity",
          variables.entityType,
          variables.entityId,
        ],
      });
      toast.success("Approval workflow started");
    },
    onError: () => {
      toast.error("Failed to start approval workflow");
    },
  });
}

/**
 * POST /approvals/chains/{id}/cancel - cancel an approval chain.
 */
export function useCancelApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chainId: string) =>
      apiClient.post(`/approvals/chains/${chainId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-chain"] });
      queryClient.invalidateQueries({ queryKey: ["approval-chain-entity"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["my-pending-approval-count"],
      });
      toast.success("Approval chain cancelled");
    },
    onError: () => {
      toast.error("Failed to cancel approval chain");
    },
  });
}

/* ================================================================== */
/*  My Pending Approvals — Queries                                     */
/* ================================================================== */

/**
 * GET /approvals/my-pending - paginated list of pending approvals.
 */
export function useMyPendingApprovals(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["my-pending-approvals", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PendingApprovalItem>>(
        "/approvals/my-pending",
        { page, limit },
      ),
  });
}

/**
 * GET /approvals/my-pending/count - count for badge display.
 */
export function useMyPendingApprovalCount() {
  return useQuery({
    queryKey: ["my-pending-approval-count"],
    queryFn: () =>
      apiClient.get<{ count: number }>("/approvals/my-pending/count"),
    refetchInterval: 60000, // Refresh every 60 seconds for badge updates.
  });
}

/* ================================================================== */
/*  Step Actions — Mutations                                           */
/* ================================================================== */

/**
 * POST /approvals/steps/{id}/decide - approve a step.
 */
export function useApproveStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      comments,
      evidenceRefs,
    }: {
      stepId: string;
      comments?: string;
      evidenceRefs?: string[];
    }) =>
      apiClient.post(`/approvals/steps/${stepId}/decide`, {
        decision: "approved",
        comments,
        evidenceRefs,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-chain"] });
      queryClient.invalidateQueries({ queryKey: ["approval-chain-entity"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["my-pending-approval-count"],
      });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      toast.success("Step approved");
    },
    onError: () => {
      toast.error("Failed to approve step");
    },
  });
}

/**
 * POST /approvals/steps/{id}/decide - reject a step.
 */
export function useRejectStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      comments,
      evidenceRefs,
    }: {
      stepId: string;
      comments?: string;
      evidenceRefs?: string[];
    }) =>
      apiClient.post(`/approvals/steps/${stepId}/decide`, {
        decision: "rejected",
        comments,
        evidenceRefs,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-chain"] });
      queryClient.invalidateQueries({ queryKey: ["approval-chain-entity"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["my-pending-approval-count"],
      });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      toast.success("Step rejected");
    },
    onError: () => {
      toast.error("Failed to reject step");
    },
  });
}

/**
 * POST /approvals/steps/{id}/delegate - delegate a step to another user.
 */
export function useDelegateStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      toUserId,
      reason,
    }: {
      stepId: string;
      toUserId: string;
      reason?: string;
    }) =>
      apiClient.post(`/approvals/steps/${stepId}/delegate`, {
        toUserId,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-chain"] });
      queryClient.invalidateQueries({ queryKey: ["approval-chain-entity"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["my-pending-approval-count"],
      });
      toast.success("Step delegated successfully");
    },
    onError: () => {
      toast.error("Failed to delegate step");
    },
  });
}

/* ================================================================== */
/*  Approval History — Queries                                         */
/* ================================================================== */

/**
 * GET /approvals/history - paginated list of approval chain history.
 */
export function useApprovalHistory(
  filters?: { entityType?: string },
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: ["approval-history", filters?.entityType, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ApprovalHistoryItem>>(
        "/approvals/history",
        {
          entityType: filters?.entityType,
          page,
          limit,
        },
      ),
  });
}

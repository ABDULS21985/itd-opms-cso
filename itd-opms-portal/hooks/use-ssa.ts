import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  SSARequest,
  SSARequestDetail,
  SSARequestStats,
  ServiceImpact,
  SSAApproval,
  SSAAuditLog,
  SSADelegation,
  ASDAssessment,
  QCMDAnalysis,
  SANProvisioning,
  DCOServer,
} from "@/types/ssa";
import type { PaginatedResponse } from "@/types/core";

/* ================================================================== */
/*  SSA Requests — Queries                                              */
/* ================================================================== */

/**
 * GET /ssa/requests - paginated list of SSA requests.
 */
export function useSSARequests(
  page = 1,
  limit = 20,
  status?: string,
  division?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ["ssa-requests", page, limit, status, division, search],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>("/ssa/requests", {
        page,
        limit,
        status,
        division,
        search,
      }),
  });
}

/**
 * GET /ssa/requests/my - paginated list of current user's SSA requests.
 */
export function useMySSARequests(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ssa-my-requests", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>("/ssa/requests/my", {
        page,
        limit,
      }),
  });
}

/**
 * GET /ssa/requests/{id} - single SSA request detail.
 */
export function useSSARequest(id: string | undefined) {
  return useQuery({
    queryKey: ["ssa-request", id],
    queryFn: () =>
      apiClient.get<SSARequestDetail>(`/ssa/requests/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /ssa/requests/stats - SSA request statistics summary.
 */
export function useSSARequestStats() {
  return useQuery({
    queryKey: ["ssa-stats"],
    queryFn: () => apiClient.get<SSARequestStats>("/ssa/requests/stats"),
  });
}

/**
 * GET /ssa/requests/search - search SSA requests by query string.
 */
export function useSearchSSARequests(q: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ssa-requests-search", q, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>("/ssa/requests/search", {
        q,
        page,
        limit,
      }),
    enabled: !!q,
  });
}

/**
 * GET /ssa/requests/{requestId}/impacts - service impacts for a request.
 */
export function useSSAServiceImpacts(requestId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-impacts", requestId],
    queryFn: () =>
      apiClient.get<ServiceImpact[]>(
        `/ssa/requests/${requestId}/impacts`,
      ),
    enabled: !!requestId,
  });
}

/**
 * GET /ssa/requests/{requestId}/approvals - approval history for a request.
 */
export function useSSAApprovalHistory(requestId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-approvals", requestId],
    queryFn: () =>
      apiClient.get<SSAApproval[]>(
        `/ssa/requests/${requestId}/approvals`,
      ),
    enabled: !!requestId,
  });
}

/**
 * GET /ssa/requests/{requestId}/audit-log - audit log for a request.
 */
export function useSSAAuditLog(requestId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-audit-log", requestId],
    queryFn: () =>
      apiClient.get<SSAAuditLog[]>(
        `/ssa/requests/${requestId}/audit-log`,
      ),
    enabled: !!requestId,
  });
}

/* ================================================================== */
/*  Queue — Queries                                                     */
/* ================================================================== */

/**
 * GET /ssa/queue/endorsements - endorsement queue (HOO).
 */
export function useEndorsementQueue(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ssa-endorsement-queue", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>(
        "/ssa/queue/endorsements",
        { page, limit },
      ),
  });
}

/**
 * GET /ssa/queue/asd-assessments - ASD assessment queue.
 */
export function useASDQueue(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ssa-asd-queue", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>(
        "/ssa/queue/asd-assessments",
        { page, limit },
      ),
  });
}

/**
 * GET /ssa/queue/qcmd-analyses - QCMD analysis queue.
 */
export function useQCMDQueue(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ssa-qcmd-queue", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>(
        "/ssa/queue/qcmd-analyses",
        { page, limit },
      ),
  });
}

/**
 * GET /ssa/queue/approvals - approval queue, optionally filtered by stage.
 */
export function useApprovalQueue(page = 1, limit = 20, stage?: string) {
  return useQuery({
    queryKey: ["ssa-approval-queue", page, limit, stage],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>(
        "/ssa/queue/approvals",
        { page, limit, stage },
      ),
  });
}

/**
 * GET /ssa/queue/san-provisioning - SAN provisioning queue.
 */
export function useSANQueue(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ssa-san-queue", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>(
        "/ssa/queue/san-provisioning",
        { page, limit },
      ),
  });
}

/**
 * GET /ssa/queue/dco-servers - DCO server creation queue.
 */
export function useDCOQueue(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ssa-dco-queue", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SSARequest>>(
        "/ssa/queue/dco-servers",
        { page, limit },
      ),
  });
}

/* ================================================================== */
/*  Delegations — Queries                                               */
/* ================================================================== */

/**
 * GET /ssa/delegations - list of active delegations.
 */
export function useSSADelegations() {
  return useQuery({
    queryKey: ["ssa-delegations"],
    queryFn: () => apiClient.get<SSADelegation[]>("/ssa/delegations"),
  });
}

/* ================================================================== */
/*  SSA Requests — Mutations                                            */
/* ================================================================== */

/**
 * POST /ssa/requests - create a new SSA request.
 */
export function useCreateSSARequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SSARequest>) =>
      apiClient.post<SSARequest>("/ssa/requests", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      toast.success("Request created successfully");
    },
    onError: () => {
      toast.error("Failed to create request");
    },
  });
}

/**
 * PUT /ssa/requests/{id} - update an SSA request.
 */
export function useUpdateSSARequest(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SSARequest>) =>
      apiClient.put<SSARequest>(`/ssa/requests/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      toast.success("Request updated successfully");
    },
    onError: () => {
      toast.error("Failed to update request");
    },
  });
}

/**
 * POST /ssa/requests/{id}/submit - submit an SSA request for processing.
 */
export function useSubmitSSARequest(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<SSARequest>(`/ssa/requests/${id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-my-requests"] });
      toast.success("Request submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit request");
    },
  });
}

/**
 * POST /ssa/requests/{id}/cancel - cancel an SSA request.
 */
export function useCancelSSARequest(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: { reason?: string }) =>
      apiClient.post<SSARequest>(`/ssa/requests/${id}/cancel`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      toast.success("Request cancelled successfully");
    },
    onError: () => {
      toast.error("Failed to cancel request");
    },
  });
}

/**
 * POST /ssa/requests/{id}/revise - revise a rejected SSA request.
 */
export function useReviseSSARequest(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SSARequest>) =>
      apiClient.post<SSARequest>(`/ssa/requests/${id}/revise`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      toast.success("Request revised successfully");
    },
    onError: () => {
      toast.error("Failed to revise request");
    },
  });
}

/* ================================================================== */
/*  Service Impacts — Mutations                                         */
/* ================================================================== */

/**
 * POST /ssa/requests/{requestId}/impacts - create a service impact.
 */
export function useCreateServiceImpact(requestId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ServiceImpact>) =>
      apiClient.post<ServiceImpact>(
        `/ssa/requests/${requestId}/impacts`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ssa-impacts", requestId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ssa-request", requestId],
      });
      toast.success("Service impact added successfully");
    },
    onError: () => {
      toast.error("Failed to add service impact");
    },
  });
}

/**
 * PUT /ssa/requests/{requestId}/impacts/{impactId} - update a service impact.
 */
export function useUpdateServiceImpact(requestId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      impactId,
      ...body
    }: Partial<ServiceImpact> & { impactId: string }) =>
      apiClient.put<ServiceImpact>(
        `/ssa/requests/${requestId}/impacts/${impactId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ssa-impacts", requestId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ssa-request", requestId],
      });
      toast.success("Service impact updated successfully");
    },
    onError: () => {
      toast.error("Failed to update service impact");
    },
  });
}

/**
 * DELETE /ssa/requests/{requestId}/impacts/{impactId} - delete a service impact.
 */
export function useDeleteServiceImpact(requestId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (impactId: string) =>
      apiClient.delete(
        `/ssa/requests/${requestId}/impacts/${impactId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ssa-impacts", requestId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ssa-request", requestId],
      });
      toast.success("Service impact deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete service impact");
    },
  });
}

/* ================================================================== */
/*  Workflow Actions — Mutations                                        */
/* ================================================================== */

/**
 * POST /ssa/requests/{id}/endorse - submit HOO endorsement.
 */
export function useSubmitEndorsement(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: string; remarks?: string }) =>
      apiClient.post<SSAApproval>(`/ssa/requests/${id}/endorse`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      queryClient.invalidateQueries({
        queryKey: ["ssa-endorsement-queue"],
      });
      toast.success("Endorsement submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit endorsement");
    },
  });
}

/**
 * POST /ssa/requests/{id}/asd-assessment - submit ASD assessment.
 */
export function useSubmitASDAssessment(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ASDAssessment>) =>
      apiClient.post<ASDAssessment>(
        `/ssa/requests/${id}/asd-assessment`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-asd-queue"] });
      toast.success("ASD assessment submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit ASD assessment");
    },
  });
}

/**
 * POST /ssa/requests/{id}/qcmd-analysis - submit QCMD analysis.
 */
export function useSubmitQCMDAnalysis(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<QCMDAnalysis>) =>
      apiClient.post<QCMDAnalysis>(
        `/ssa/requests/${id}/qcmd-analysis`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-qcmd-queue"] });
      toast.success("QCMD analysis submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit QCMD analysis");
    },
  });
}

/**
 * POST /ssa/requests/{id}/approve - submit approval decision.
 */
export function useSubmitApproval(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: string; remarks?: string }) =>
      apiClient.post<SSAApproval>(`/ssa/requests/${id}/approve`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      queryClient.invalidateQueries({
        queryKey: ["ssa-approval-queue"],
      });
      toast.success("Approval submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit approval");
    },
  });
}

/**
 * POST /ssa/requests/{id}/san-provisioning - submit SAN provisioning details.
 */
export function useSubmitSANProvisioning(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SANProvisioning>) =>
      apiClient.post<SANProvisioning>(
        `/ssa/requests/${id}/san-provisioning`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-san-queue"] });
      toast.success("SAN provisioning submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit SAN provisioning");
    },
  });
}

/**
 * POST /ssa/requests/{id}/dco-server - submit DCO server creation details.
 */
export function useSubmitDCOServer(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<DCOServer>) =>
      apiClient.post<DCOServer>(
        `/ssa/requests/${id}/dco-server`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-requests"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-request", id] });
      queryClient.invalidateQueries({ queryKey: ["ssa-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ssa-dco-queue"] });
      toast.success("DCO server details submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit DCO server details");
    },
  });
}

/* ================================================================== */
/*  Delegations — Mutations                                             */
/* ================================================================== */

/**
 * POST /ssa/delegations - create a new delegation.
 */
export function useCreateDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SSADelegation>) =>
      apiClient.post<SSADelegation>("/ssa/delegations", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-delegations"] });
      toast.success("Delegation created successfully");
    },
    onError: () => {
      toast.error("Failed to create delegation");
    },
  });
}

/**
 * DELETE /ssa/delegations/{id} - delete a delegation.
 */
export function useDeleteDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/ssa/delegations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssa-delegations"] });
      toast.success("Delegation deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete delegation");
    },
  });
}

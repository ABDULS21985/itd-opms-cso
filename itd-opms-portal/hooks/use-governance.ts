import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Policy,
  PolicyVersion,
  VersionDiff,
  AttestationStatus,
  AttestationCampaign,
  RACIMatrix,
  RACIEntry,
  RACICoverageReport,
  RACICoverageSummary,
  Meeting,
  MeetingDecision,
  ActionItem,
  OverdueStats,
  OKR,
  KeyResult,
  KPI,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  Policies — Queries                                                 */
/* ================================================================== */

/**
 * GET /governance/policies - paginated list of policies.
 */
export function usePolicies(
  page = 1,
  limit = 20,
  category?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["policies", page, limit, category, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Policy>>("/governance/policies", {
        page,
        limit,
        category,
        status,
      }),
  });
}

/**
 * GET /governance/policies/{id} - single policy detail.
 */
export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: ["policy", id],
    queryFn: () => apiClient.get<Policy>(`/governance/policies/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /governance/policies/{id}/versions - version history for a policy.
 */
export function usePolicyVersions(id: string | undefined) {
  return useQuery({
    queryKey: ["policy-versions", id],
    queryFn: () =>
      apiClient.get<PolicyVersion[]>(`/governance/policies/${id}/versions`),
    enabled: !!id,
  });
}

/**
 * GET /governance/policies/{id}/diff?v1=X&v2=Y - compare two versions.
 */
export function usePolicyDiff(
  id: string | undefined,
  v1: number | undefined,
  v2: number | undefined,
) {
  return useQuery({
    queryKey: ["policy-diff", id, v1, v2],
    queryFn: () =>
      apiClient.get<VersionDiff>(`/governance/policies/${id}/diff`, {
        v1,
        v2,
      }),
    enabled: !!id && v1 !== undefined && v2 !== undefined,
  });
}

/**
 * GET /governance/policies/{id}/attestation-status - attestation summary.
 */
export function useAttestationStatus(policyId: string | undefined) {
  return useQuery({
    queryKey: ["attestation-status", policyId],
    queryFn: () =>
      apiClient.get<AttestationStatus>(
        `/governance/policies/${policyId}/attestation-status`,
      ),
    enabled: !!policyId,
  });
}

/* ================================================================== */
/*  Policies — Mutations                                               */
/* ================================================================== */

/**
 * POST /governance/policies - create a new policy.
 */
export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Policy>) =>
      apiClient.post<Policy>("/governance/policies", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy created successfully");
    },
    onError: () => {
      toast.error("Failed to create policy");
    },
  });
}

/**
 * PUT /governance/policies/{id} - update a policy.
 */
export function useUpdatePolicy(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Policy>) =>
      apiClient.put<Policy>(`/governance/policies/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", id] });
      toast.success("Policy updated successfully");
    },
    onError: () => {
      toast.error("Failed to update policy");
    },
  });
}

/**
 * POST /governance/policies/{id}/submit - submit policy for review.
 */
export function useSubmitPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/governance/policies/${id}/submit`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", id] });
      toast.success("Policy submitted for review");
    },
    onError: () => {
      toast.error("Failed to submit policy");
    },
  });
}

/**
 * POST /governance/policies/{id}/approve - approve a policy.
 */
export function useApprovePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/governance/policies/${id}/approve`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", id] });
      toast.success("Policy approved");
    },
    onError: () => {
      toast.error("Failed to approve policy");
    },
  });
}

/**
 * POST /governance/policies/{id}/publish - publish a policy.
 */
export function usePublishPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/governance/policies/${id}/publish`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", id] });
      toast.success("Policy published");
    },
    onError: () => {
      toast.error("Failed to publish policy");
    },
  });
}

/**
 * POST /governance/policies/{id}/retire - retire a policy.
 */
export function useRetirePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/governance/policies/${id}/retire`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", id] });
      toast.success("Policy retired");
    },
    onError: () => {
      toast.error("Failed to retire policy");
    },
  });
}

/**
 * POST /governance/policies/{id}/attestation-campaigns - launch a campaign.
 */
export function useLaunchCampaign(policyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AttestationCampaign>) =>
      apiClient.post<AttestationCampaign>(
        `/governance/policies/${policyId}/attestation-campaigns`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attestation-status", policyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attestation-campaigns", policyId],
      });
      toast.success("Attestation campaign launched");
    },
    onError: () => {
      toast.error("Failed to launch campaign");
    },
  });
}

/**
 * POST /governance/attestations/{id}/attest - attest to a policy.
 */
export function useAttestPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/governance/attestations/${id}/attest`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attestation-status"] });
      queryClient.invalidateQueries({ queryKey: ["attestation-campaigns"] });
      toast.success("Policy attested successfully");
    },
    onError: () => {
      toast.error("Failed to attest policy");
    },
  });
}

/* ================================================================== */
/*  RACI — Queries                                                     */
/* ================================================================== */

/**
 * GET /governance/raci - paginated list of RACI matrices.
 */
export function useRACIMatrices(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["raci-matrices", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<RACIMatrix>>("/governance/raci", {
        page,
        limit,
      }),
  });
}

/**
 * GET /governance/raci/{id} - single RACI matrix with entries.
 */
export function useRACIMatrix(id: string | undefined) {
  return useQuery({
    queryKey: ["raci-matrix", id],
    queryFn: () => apiClient.get<RACIMatrix>(`/governance/raci/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  RACI — Mutations                                                   */
/* ================================================================== */

/**
 * POST /governance/raci - create a new RACI matrix.
 */
export function useCreateRACIMatrix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RACIMatrix>) =>
      apiClient.post<RACIMatrix>("/governance/raci", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raci-matrices"] });
      toast.success("RACI matrix created");
    },
    onError: () => {
      toast.error("Failed to create RACI matrix");
    },
  });
}

/**
 * PUT /governance/raci/{id} - update a RACI matrix.
 */
export function useUpdateRACIMatrix(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RACIMatrix>) =>
      apiClient.put<RACIMatrix>(`/governance/raci/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raci-matrices"] });
      queryClient.invalidateQueries({ queryKey: ["raci-matrix", id] });
      toast.success("RACI matrix updated");
    },
    onError: () => {
      toast.error("Failed to update RACI matrix");
    },
  });
}

/**
 * DELETE /governance/raci/{id} - delete a RACI matrix.
 */
export function useDeleteRACIMatrix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/governance/raci/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raci-matrices"] });
      toast.success("RACI matrix deleted");
    },
    onError: () => {
      toast.error("Failed to delete RACI matrix");
    },
  });
}

/**
 * POST /governance/raci/{id}/entries - add an entry to a RACI matrix.
 */
export function useAddRACIEntry(matrixId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RACIEntry>) =>
      apiClient.post<RACIEntry>(
        `/governance/raci/${matrixId}/entries`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["raci-matrix", matrixId],
      });
      toast.success("RACI entry added");
    },
    onError: () => {
      toast.error("Failed to add RACI entry");
    },
  });
}

/**
 * PUT /governance/raci/entries/{entryId} - update a RACI entry.
 */
export function useUpdateRACIEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      body,
    }: {
      entryId: string;
      body: Partial<RACIEntry>;
    }) => apiClient.put<RACIEntry>(`/governance/raci/entries/${entryId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raci-matrix"] });
      toast.success("RACI entry updated");
    },
    onError: () => {
      toast.error("Failed to update RACI entry");
    },
  });
}

/**
 * DELETE /governance/raci/entries/{entryId} - delete a RACI entry.
 */
export function useDeleteRACIEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      apiClient.delete(`/governance/raci/entries/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raci-matrix"] });
      toast.success("RACI entry deleted");
    },
    onError: () => {
      toast.error("Failed to delete RACI entry");
    },
  });
}

/* ================================================================== */
/*  Meetings — Queries                                                 */
/* ================================================================== */

/**
 * GET /governance/meetings - paginated list of meetings.
 */
export function useMeetings(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ["meetings", page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Meeting>>("/governance/meetings", {
        page,
        limit,
        status,
      }),
  });
}

/**
 * GET /governance/meetings/{id} - single meeting detail.
 */
export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: ["meeting", id],
    queryFn: () => apiClient.get<Meeting>(`/governance/meetings/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /governance/meetings/{id}/decisions - decisions for a meeting.
 */
export function useMeetingDecisions(meetingId: string | undefined) {
  return useQuery({
    queryKey: ["meeting-decisions", meetingId],
    queryFn: () =>
      apiClient.get<MeetingDecision[]>(
        `/governance/meetings/${meetingId}/decisions`,
      ),
    enabled: !!meetingId,
  });
}

/* ================================================================== */
/*  Meetings — Mutations                                               */
/* ================================================================== */

/**
 * POST /governance/meetings - create a new meeting.
 */
export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Meeting>) =>
      apiClient.post<Meeting>("/governance/meetings", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting created");
    },
    onError: () => {
      toast.error("Failed to create meeting");
    },
  });
}

/**
 * PUT /governance/meetings/{id} - update a meeting.
 */
export function useUpdateMeeting(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Meeting>) =>
      apiClient.put<Meeting>(`/governance/meetings/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting", id] });
      toast.success("Meeting updated");
    },
    onError: () => {
      toast.error("Failed to update meeting");
    },
  });
}

/**
 * POST /governance/meetings/{id}/decisions - create a decision for a meeting.
 */
export function useCreateDecision(meetingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MeetingDecision>) =>
      apiClient.post<MeetingDecision>(
        `/governance/meetings/${meetingId}/decisions`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["meeting-decisions", meetingId],
      });
      toast.success("Decision recorded");
    },
    onError: () => {
      toast.error("Failed to record decision");
    },
  });
}

/* ================================================================== */
/*  Action Items — Queries                                             */
/* ================================================================== */

/**
 * GET /governance/meetings/actions - paginated list of action items.
 */
export function useActionItems(
  page = 1,
  limit = 20,
  status?: string,
  ownerId?: string,
) {
  return useQuery({
    queryKey: ["action-items", page, limit, status, ownerId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ActionItem>>(
        "/governance/meetings/actions",
        { page, limit, status, ownerId },
      ),
  });
}

/**
 * GET /governance/meetings/actions/overdue - overdue action items.
 */
export function useOverdueActions() {
  return useQuery({
    queryKey: ["action-items-overdue"],
    queryFn: () =>
      apiClient.get<ActionItem[]>("/governance/meetings/actions/overdue"),
  });
}

/* ================================================================== */
/*  Action Items — Mutations                                           */
/* ================================================================== */

/**
 * POST /governance/meetings/actions - create an action item.
 */
export function useCreateActionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ActionItem>) =>
      apiClient.post<ActionItem>("/governance/meetings/actions", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
      toast.success("Action item created");
    },
    onError: () => {
      toast.error("Failed to create action item");
    },
  });
}

/**
 * PUT /governance/meetings/actions/{id} - update an action item.
 */
export function useUpdateActionItem(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ActionItem>) =>
      apiClient.put<ActionItem>(`/governance/meetings/actions/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
      toast.success("Action item updated");
    },
    onError: () => {
      toast.error("Failed to update action item");
    },
  });
}

/**
 * POST /governance/meetings/actions/{id}/complete - mark action item complete.
 * Accepts an optional evidence string; sends empty object when omitted so the
 * backend JSON decoder does not receive an empty body.
 */
export function useCompleteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, evidence = "" }: { id: string; evidence?: string }) =>
      apiClient.post(`/governance/meetings/actions/${id}/complete`, {
        evidence,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
      queryClient.invalidateQueries({ queryKey: ["action-items-overdue"] });
      toast.success("Action item completed");
    },
    onError: () => {
      toast.error("Failed to complete action item");
    },
  });
}

/* ================================================================== */
/*  OKRs — Queries                                                     */
/* ================================================================== */

/**
 * GET /governance/okrs - paginated list of OKRs.
 */
export function useOKRs(
  page = 1,
  limit = 20,
  level?: string,
  period?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["okrs", page, limit, level, period, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<OKR>>("/governance/okrs", {
        page,
        limit,
        level,
        period,
        status,
      }),
  });
}

/**
 * GET /governance/okrs/{id} - single OKR detail.
 */
export function useOKR(id: string | undefined) {
  return useQuery({
    queryKey: ["okr", id],
    queryFn: () => apiClient.get<OKR>(`/governance/okrs/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /governance/okrs/{id}/tree - OKR tree (with children and key results).
 */
export function useOKRTree(id: string | undefined) {
  return useQuery({
    queryKey: ["okr-tree", id],
    queryFn: () => apiClient.get<OKR>(`/governance/okrs/${id}/tree`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  OKRs — Mutations                                                   */
/* ================================================================== */

/**
 * POST /governance/okrs - create an OKR.
 */
export function useCreateOKR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OKR>) =>
      apiClient.post<OKR>("/governance/okrs", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okrs"] });
      toast.success("OKR created");
    },
    onError: () => {
      toast.error("Failed to create OKR");
    },
  });
}

/**
 * PUT /governance/okrs/{id} - update an OKR.
 */
export function useUpdateOKR(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OKR>) =>
      apiClient.put<OKR>(`/governance/okrs/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okrs"] });
      queryClient.invalidateQueries({ queryKey: ["okr", id] });
      toast.success("OKR updated");
    },
    onError: () => {
      toast.error("Failed to update OKR");
    },
  });
}

/**
 * POST /governance/okrs/{id}/key-results - add a key result to an OKR.
 */
export function useCreateKeyResult(okrId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KeyResult>) =>
      apiClient.post<KeyResult>(
        `/governance/okrs/${okrId}/key-results`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr", okrId] });
      queryClient.invalidateQueries({ queryKey: ["okr-tree", okrId] });
      toast.success("Key result added");
    },
    onError: () => {
      toast.error("Failed to add key result");
    },
  });
}

/**
 * PUT /governance/key-results/{id} - update a key result.
 */
export function useUpdateKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<KeyResult> }) =>
      apiClient.put<KeyResult>(`/governance/key-results/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr"] });
      queryClient.invalidateQueries({ queryKey: ["okr-tree"] });
      toast.success("Key result updated");
    },
    onError: () => {
      toast.error("Failed to update key result");
    },
  });
}

/**
 * DELETE /governance/key-results/{id} - delete a key result.
 */
export function useDeleteKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/governance/key-results/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr"] });
      queryClient.invalidateQueries({ queryKey: ["okr-tree"] });
      toast.success("Key result deleted");
    },
    onError: () => {
      toast.error("Failed to delete key result");
    },
  });
}

/* ================================================================== */
/*  KPIs — Queries                                                     */
/* ================================================================== */

/**
 * GET /governance/kpis - paginated list of KPIs.
 */
export function useKPIs(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["kpis", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<KPI>>("/governance/kpis", {
        page,
        limit,
      }),
  });
}

/* ================================================================== */
/*  KPIs — Mutations                                                   */
/* ================================================================== */

/**
 * POST /governance/kpis - create a KPI.
 */
export function useCreateKPI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KPI>) =>
      apiClient.post<KPI>("/governance/kpis", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast.success("KPI created");
    },
    onError: () => {
      toast.error("Failed to create KPI");
    },
  });
}

/**
 * PUT /governance/kpis/{id} - update a KPI.
 */
export function useUpdateKPI(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KPI>) =>
      apiClient.put<KPI>(`/governance/kpis/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast.success("KPI updated");
    },
    onError: () => {
      toast.error("Failed to update KPI");
    },
  });
}

/**
 * DELETE /governance/kpis/{id} - delete a KPI.
 */
export function useDeleteKPI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/governance/kpis/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast.success("KPI deleted");
    },
    onError: () => {
      toast.error("Failed to delete KPI");
    },
  });
}

/* ================================================================== */
/*  FR-A010: RACI Coverage Reports                                     */
/* ================================================================== */

/**
 * GET /governance/raci/{id}/coverage - full gap-analysis coverage report.
 */
export function useRACICoverageReport(matrixId: string | undefined) {
  return useQuery({
    queryKey: ["raci-coverage", matrixId],
    queryFn: () =>
      apiClient.get<RACICoverageReport>(
        `/governance/raci/${matrixId}/coverage`,
      ),
    enabled: !!matrixId,
  });
}

/**
 * GET /governance/raci/coverage-summary - tenant-wide coverage stats.
 */
export function useRACICoverageSummary() {
  return useQuery({
    queryKey: ["raci-coverage-summary"],
    queryFn: () =>
      apiClient.get<RACICoverageSummary>("/governance/raci/coverage-summary"),
  });
}

/* ================================================================== */
/*  FR-A014: Overdue Action Stats                                      */
/* ================================================================== */

/**
 * GET /governance/meetings/actions/overdue/stats - overdue action statistics.
 */
export function useOverdueActionStats() {
  return useQuery({
    queryKey: ["action-items-overdue-stats"],
    queryFn: () =>
      apiClient.get<OverdueStats>(
        "/governance/meetings/actions/overdue/stats",
      ),
  });
}

/**
 * GET /governance/meetings/actions/overdue/mine - current user's overdue actions.
 */
export function useMyOverdueActions() {
  return useQuery({
    queryKey: ["action-items-overdue-mine"],
    queryFn: () =>
      apiClient.get<ActionItem[]>(
        "/governance/meetings/actions/overdue/mine",
      ),
  });
}

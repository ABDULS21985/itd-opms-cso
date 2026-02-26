import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  GRCRisk,
  RiskAssessment,
  RiskHeatMapEntry,
  GRCAudit,
  AuditFinding,
  EvidenceCollection,
  AccessReviewCampaign,
  AccessReviewEntry,
  ComplianceControl,
  ComplianceStats,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  Risks — Queries                                                     */
/* ================================================================== */

/**
 * GET /grc/risks - paginated list of GRC risks.
 */
export function useRisks(
  page = 1,
  limit = 20,
  status?: string,
  category?: string,
) {
  return useQuery({
    queryKey: ["grc-risks", page, limit, status, category],
    queryFn: () =>
      apiClient.get<PaginatedResponse<GRCRisk>>("/grc/risks", {
        page,
        limit,
        status,
        category,
      }),
  });
}

/**
 * GET /grc/risks/{id} - single GRC risk detail.
 */
export function useRisk(id: string | undefined) {
  return useQuery({
    queryKey: ["grc-risk", id],
    queryFn: () => apiClient.get<GRCRisk>(`/grc/risks/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /grc/risks/heat-map - risk heat map data.
 */
export function useRiskHeatMap() {
  return useQuery({
    queryKey: ["grc-risk-heat-map"],
    queryFn: () =>
      apiClient.get<RiskHeatMapEntry[]>("/grc/risks/heat-map"),
  });
}

/**
 * GET /grc/risks/review-needed - risks needing review.
 */
export function useRisksNeedingReview() {
  return useQuery({
    queryKey: ["grc-risks-review-needed"],
    queryFn: () =>
      apiClient.get<GRCRisk[]>("/grc/risks/review-needed"),
  });
}

/**
 * GET /grc/risks/{riskId}/assessments - assessments for a risk.
 */
export function useRiskAssessments(riskId: string | undefined) {
  return useQuery({
    queryKey: ["grc-risk-assessments", riskId],
    queryFn: () =>
      apiClient.get<RiskAssessment[]>(`/grc/risks/${riskId}/assessments`),
    enabled: !!riskId,
  });
}

/* ================================================================== */
/*  Risks — Mutations                                                   */
/* ================================================================== */

/**
 * POST /grc/risks - create a GRC risk.
 */
export function useCreateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<GRCRisk>) =>
      apiClient.post<GRCRisk>("/grc/risks", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] });
      queryClient.invalidateQueries({ queryKey: ["grc-risk-heat-map"] });
      toast.success("Risk created successfully");
    },
    onError: () => {
      toast.error("Failed to create risk");
    },
  });
}

/**
 * PUT /grc/risks/{id} - update a GRC risk.
 */
export function useUpdateRisk(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<GRCRisk>) =>
      apiClient.put<GRCRisk>(`/grc/risks/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] });
      queryClient.invalidateQueries({ queryKey: ["grc-risk", id] });
      queryClient.invalidateQueries({ queryKey: ["grc-risk-heat-map"] });
      toast.success("Risk updated successfully");
    },
    onError: () => {
      toast.error("Failed to update risk");
    },
  });
}

/**
 * DELETE /grc/risks/{id} - delete a GRC risk.
 */
export function useDeleteRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/grc/risks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] });
      queryClient.invalidateQueries({ queryKey: ["grc-risk-heat-map"] });
      toast.success("Risk deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete risk");
    },
  });
}

/**
 * POST /grc/risks/{riskId}/assess - create a risk assessment.
 */
export function useCreateRiskAssessment(riskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RiskAssessment>) =>
      apiClient.post<RiskAssessment>(`/grc/risks/${riskId}/assess`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-risk-assessments", riskId],
      });
      queryClient.invalidateQueries({ queryKey: ["grc-risk", riskId] });
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] });
      queryClient.invalidateQueries({ queryKey: ["grc-risk-heat-map"] });
      toast.success("Risk assessment recorded");
    },
    onError: () => {
      toast.error("Failed to record risk assessment");
    },
  });
}

/**
 * POST /grc/risks/{id}/escalate - escalate a GRC risk.
 */
export function useEscalateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/grc/risks/${id}/escalate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] });
      toast.success("Risk escalated successfully");
    },
    onError: () => {
      toast.error("Failed to escalate risk");
    },
  });
}

/* ================================================================== */
/*  Audits — Queries                                                    */
/* ================================================================== */

/**
 * GET /grc/audits - paginated list of GRC audits.
 */
export function useGRCAudits(
  page = 1,
  limit = 20,
  status?: string,
  auditType?: string,
) {
  return useQuery({
    queryKey: ["grc-audits", page, limit, status, auditType],
    queryFn: () =>
      apiClient.get<PaginatedResponse<GRCAudit>>("/grc/audits", {
        page,
        limit,
        status,
        audit_type: auditType,
      }),
  });
}

/**
 * GET /grc/audits/{id} - single GRC audit detail.
 */
export function useGRCAudit(id: string | undefined) {
  return useQuery({
    queryKey: ["grc-audit", id],
    queryFn: () => apiClient.get<GRCAudit>(`/grc/audits/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /grc/audits/{auditId}/readiness - audit readiness score.
 */
export function useAuditReadiness(auditId: string | undefined) {
  return useQuery({
    queryKey: ["grc-audit-readiness", auditId],
    queryFn: () =>
      apiClient.get<{ readinessScore: number }>(
        `/grc/audits/${auditId}/readiness`,
      ),
    enabled: !!auditId,
  });
}

/* ================================================================== */
/*  Audits — Mutations                                                  */
/* ================================================================== */

/**
 * POST /grc/audits - create a GRC audit.
 */
export function useCreateGRCAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<GRCAudit>) =>
      apiClient.post<GRCAudit>("/grc/audits", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-audits"] });
      toast.success("Audit created successfully");
    },
    onError: () => {
      toast.error("Failed to create audit");
    },
  });
}

/**
 * PUT /grc/audits/{id} - update a GRC audit.
 */
export function useUpdateGRCAudit(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<GRCAudit>) =>
      apiClient.put<GRCAudit>(`/grc/audits/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-audits"] });
      queryClient.invalidateQueries({ queryKey: ["grc-audit", id] });
      toast.success("Audit updated successfully");
    },
    onError: () => {
      toast.error("Failed to update audit");
    },
  });
}

/**
 * DELETE /grc/audits/{id} - delete a GRC audit.
 */
export function useDeleteGRCAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/grc/audits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-audits"] });
      toast.success("Audit deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete audit");
    },
  });
}

/* ================================================================== */
/*  Findings — Queries                                                  */
/* ================================================================== */

/**
 * GET /grc/audits/{auditId}/findings - paginated list of findings.
 */
export function useAuditFindings(
  auditId: string | undefined,
  page = 1,
  limit = 20,
  status?: string,
) {
  return useQuery({
    queryKey: ["grc-audit-findings", auditId, page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AuditFinding>>(
        `/grc/audits/${auditId}/findings`,
        { page, limit, status },
      ),
    enabled: !!auditId,
  });
}

/**
 * GET /grc/audits/{auditId}/findings/{findingId} - single finding.
 */
export function useAuditFinding(
  auditId: string | undefined,
  findingId: string | undefined,
) {
  return useQuery({
    queryKey: ["grc-audit-finding", auditId, findingId],
    queryFn: () =>
      apiClient.get<AuditFinding>(
        `/grc/audits/${auditId}/findings/${findingId}`,
      ),
    enabled: !!auditId && !!findingId,
  });
}

/* ================================================================== */
/*  Findings — Mutations                                                */
/* ================================================================== */

/**
 * POST /grc/audits/{auditId}/findings - create a finding.
 */
export function useCreateAuditFinding(auditId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AuditFinding>) =>
      apiClient.post<AuditFinding>(
        `/grc/audits/${auditId}/findings`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-audit-findings", auditId],
      });
      queryClient.invalidateQueries({ queryKey: ["grc-audit", auditId] });
      toast.success("Finding created successfully");
    },
    onError: () => {
      toast.error("Failed to create finding");
    },
  });
}

/**
 * PUT /grc/audits/{auditId}/findings/{findingId} - update a finding.
 */
export function useUpdateAuditFinding(
  auditId: string | undefined,
  findingId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AuditFinding>) =>
      apiClient.put<AuditFinding>(
        `/grc/audits/${auditId}/findings/${findingId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-audit-findings", auditId],
      });
      queryClient.invalidateQueries({
        queryKey: ["grc-audit-finding", auditId, findingId],
      });
      toast.success("Finding updated successfully");
    },
    onError: () => {
      toast.error("Failed to update finding");
    },
  });
}

/**
 * POST /grc/audits/{auditId}/findings/{findingId}/close - close a finding.
 */
export function useCloseAuditFinding(auditId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (findingId: string) =>
      apiClient.post(
        `/grc/audits/${auditId}/findings/${findingId}/close`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-audit-findings", auditId],
      });
      queryClient.invalidateQueries({ queryKey: ["grc-audit", auditId] });
      toast.success("Finding closed successfully");
    },
    onError: () => {
      toast.error("Failed to close finding");
    },
  });
}

/* ================================================================== */
/*  Evidence — Queries                                                  */
/* ================================================================== */

/**
 * GET /grc/audits/{auditId}/evidence - list evidence collections.
 */
export function useEvidenceCollections(
  auditId: string | undefined,
  status?: string,
) {
  return useQuery({
    queryKey: ["grc-evidence-collections", auditId, status],
    queryFn: () =>
      apiClient.get<EvidenceCollection[]>(
        `/grc/audits/${auditId}/evidence`,
        { status },
      ),
    enabled: !!auditId,
  });
}

/**
 * GET /grc/audits/{auditId}/evidence/{id} - single evidence collection.
 */
export function useEvidenceCollection(
  auditId: string | undefined,
  id: string | undefined,
) {
  return useQuery({
    queryKey: ["grc-evidence-collection", auditId, id],
    queryFn: () =>
      apiClient.get<EvidenceCollection>(
        `/grc/audits/${auditId}/evidence/${id}`,
      ),
    enabled: !!auditId && !!id,
  });
}

/* ================================================================== */
/*  Evidence — Mutations                                                */
/* ================================================================== */

/**
 * POST /grc/audits/{auditId}/evidence - create an evidence collection.
 */
export function useCreateEvidenceCollection(auditId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EvidenceCollection>) =>
      apiClient.post<EvidenceCollection>(
        `/grc/audits/${auditId}/evidence`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-evidence-collections", auditId],
      });
      toast.success("Evidence collection created");
    },
    onError: () => {
      toast.error("Failed to create evidence collection");
    },
  });
}

/**
 * PUT /grc/audits/{auditId}/evidence/{id} - update an evidence collection.
 */
export function useUpdateEvidenceCollection(
  auditId: string | undefined,
  id: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EvidenceCollection>) =>
      apiClient.put<EvidenceCollection>(
        `/grc/audits/${auditId}/evidence/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-evidence-collections", auditId],
      });
      queryClient.invalidateQueries({
        queryKey: ["grc-evidence-collection", auditId, id],
      });
      toast.success("Evidence collection updated");
    },
    onError: () => {
      toast.error("Failed to update evidence collection");
    },
  });
}

/**
 * POST /grc/audits/{auditId}/evidence/{id}/approve - approve an evidence collection.
 */
export function useApproveEvidenceCollection(auditId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(
        `/grc/audits/${auditId}/evidence/${id}/approve`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-evidence-collections", auditId],
      });
      toast.success("Evidence collection approved");
    },
    onError: () => {
      toast.error("Failed to approve evidence collection");
    },
  });
}

/* ================================================================== */
/*  Access Reviews — Queries                                            */
/* ================================================================== */

/**
 * GET /grc/access-reviews - paginated list of access review campaigns.
 */
export function useAccessReviewCampaigns(
  page = 1,
  limit = 20,
  status?: string,
) {
  return useQuery({
    queryKey: ["grc-access-reviews", page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AccessReviewCampaign>>(
        "/grc/access-reviews",
        { page, limit, status },
      ),
  });
}

/**
 * GET /grc/access-reviews/{id} - single access review campaign.
 */
export function useAccessReviewCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ["grc-access-review", id],
    queryFn: () =>
      apiClient.get<AccessReviewCampaign>(`/grc/access-reviews/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /grc/access-reviews/{campaignId}/entries - entries for a campaign.
 */
export function useAccessReviewEntries(
  campaignId: string | undefined,
  decision?: string,
) {
  return useQuery({
    queryKey: ["grc-access-review-entries", campaignId, decision],
    queryFn: () =>
      apiClient.get<AccessReviewEntry[]>(
        `/grc/access-reviews/${campaignId}/entries`,
        { decision },
      ),
    enabled: !!campaignId,
  });
}

/* ================================================================== */
/*  Access Reviews — Mutations                                          */
/* ================================================================== */

/**
 * POST /grc/access-reviews - create an access review campaign.
 */
export function useCreateAccessReviewCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AccessReviewCampaign>) =>
      apiClient.post<AccessReviewCampaign>("/grc/access-reviews", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-access-reviews"] });
      toast.success("Access review campaign created");
    },
    onError: () => {
      toast.error("Failed to create access review campaign");
    },
  });
}

/**
 * POST /grc/access-reviews/{campaignId}/entries/{entryId}/decide - record decision.
 */
export function useRecordAccessReviewDecision(
  campaignId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      ...body
    }: { entryId: string; decision: string; justification?: string }) =>
      apiClient.post(
        `/grc/access-reviews/${campaignId}/entries/${entryId}/decide`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-access-review-entries", campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ["grc-access-review", campaignId],
      });
      queryClient.invalidateQueries({ queryKey: ["grc-access-reviews"] });
      toast.success("Decision recorded");
    },
    onError: () => {
      toast.error("Failed to record decision");
    },
  });
}

/* ================================================================== */
/*  Compliance — Queries                                                */
/* ================================================================== */

/**
 * GET /grc/compliance - paginated list of compliance controls.
 */
export function useComplianceControls(
  page = 1,
  limit = 20,
  framework?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["grc-compliance-controls", page, limit, framework, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ComplianceControl>>(
        "/grc/compliance",
        { page, limit, framework, status },
      ),
  });
}

/**
 * GET /grc/compliance/{id} - single compliance control.
 */
export function useComplianceControl(id: string | undefined) {
  return useQuery({
    queryKey: ["grc-compliance-control", id],
    queryFn: () =>
      apiClient.get<ComplianceControl>(`/grc/compliance/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /grc/compliance/stats - compliance statistics by framework.
 */
export function useComplianceStats() {
  return useQuery({
    queryKey: ["grc-compliance-stats"],
    queryFn: () =>
      apiClient.get<ComplianceStats[]>("/grc/compliance/stats"),
  });
}

/* ================================================================== */
/*  Compliance — Mutations                                              */
/* ================================================================== */

/**
 * POST /grc/compliance - create a compliance control.
 */
export function useCreateComplianceControl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ComplianceControl>) =>
      apiClient.post<ComplianceControl>("/grc/compliance", body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-compliance-controls"],
      });
      queryClient.invalidateQueries({ queryKey: ["grc-compliance-stats"] });
      toast.success("Compliance control created");
    },
    onError: () => {
      toast.error("Failed to create compliance control");
    },
  });
}

/**
 * PUT /grc/compliance/{id} - update a compliance control.
 */
export function useUpdateComplianceControl(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ComplianceControl>) =>
      apiClient.put<ComplianceControl>(`/grc/compliance/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["grc-compliance-controls"],
      });
      queryClient.invalidateQueries({
        queryKey: ["grc-compliance-control", id],
      });
      queryClient.invalidateQueries({ queryKey: ["grc-compliance-stats"] });
      toast.success("Compliance control updated");
    },
    onError: () => {
      toast.error("Failed to update compliance control");
    },
  });
}

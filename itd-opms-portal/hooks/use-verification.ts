import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  VerificationCampaign,
  CampaignAsset,
  VerificationStats,
  AssetVerification,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  Campaign Queries                                                    */
/* ================================================================== */

export function useVerificationCampaigns(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ["verification-campaigns", page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<VerificationCampaign>>(
        "/cmdb/verification/campaigns",
        { page, limit, status },
      ),
  });
}

export function useVerificationCampaign(id?: string) {
  return useQuery({
    queryKey: ["verification-campaign", id],
    queryFn: () =>
      apiClient.get<VerificationCampaign>(`/cmdb/verification/campaigns/${id}`),
    enabled: !!id,
  });
}

export function useCampaignAssets(
  campaignId?: string,
  page = 1,
  limit = 50,
  pendingOnly = false,
) {
  return useQuery({
    queryKey: ["campaign-assets", campaignId, page, limit, pendingOnly],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CampaignAsset>>(
        `/cmdb/verification/campaigns/${campaignId}/assets`,
        { page, limit, pendingOnly },
      ),
    enabled: !!campaignId,
  });
}

export function useVerificationStats() {
  return useQuery({
    queryKey: ["verification-stats"],
    queryFn: () =>
      apiClient.get<VerificationStats>("/cmdb/assets/verification-status"),
  });
}

/* ================================================================== */
/*  Campaign Mutations                                                  */
/* ================================================================== */

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      scopeFilter?: Record<string, unknown>;
    }) => apiClient.post<VerificationCampaign>("/cmdb/verification/campaigns", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification-campaigns"] });
      toast.success("Campaign created");
    },
    onError: () => toast.error("Failed to create campaign"),
  });
}

export function useStartCampaign(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<VerificationCampaign>(
        `/cmdb/verification/campaigns/${id}/start`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification-campaigns"] });
      qc.invalidateQueries({ queryKey: ["verification-campaign", id] });
      toast.success("Campaign started");
    },
    onError: () => toast.error("Failed to start campaign"),
  });
}

export function useCompleteCampaign(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<VerificationCampaign>(
        `/cmdb/verification/campaigns/${id}/complete`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification-campaigns"] });
      qc.invalidateQueries({ queryKey: ["verification-campaign", id] });
      toast.success("Campaign completed");
    },
    onError: () => toast.error("Failed to complete campaign"),
  });
}

export function useVerifyCampaignAsset(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      assetId: string;
      locationConfirmed?: boolean;
      condition?: string;
      actualLocation?: string;
      notes?: string;
      photoEvidenceIds?: string[];
      discrepancyType?: string;
    }) => {
      const { assetId, ...body } = data;
      return apiClient.post<AssetVerification>(
        `/cmdb/verification/campaigns/${campaignId}/assets/${assetId}/verify`,
        body,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-assets", campaignId] });
      qc.invalidateQueries({ queryKey: ["verification-campaign", campaignId] });
      qc.invalidateQueries({ queryKey: ["verification-stats"] });
      toast.success("Asset verified");
    },
    onError: () => toast.error("Failed to verify asset"),
  });
}

export function useBulkVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      assetIds: string[];
      campaignId?: string;
      condition?: string;
    }) => apiClient.post<{ verified: number }>("/cmdb/verification/bulk-verify", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["verification-campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign-assets"] });
      qc.invalidateQueries({ queryKey: ["verification-stats"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(`${data.verified} assets verified`);
    },
    onError: () => toast.error("Bulk verification failed"),
  });
}

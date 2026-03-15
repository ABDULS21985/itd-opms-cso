import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Asset,
  AssetLifecycleEvent,
  AssetDisposal,
  AssetStats,
  CMDBItem,
  CMDBRelationship,
  ReconciliationRun,
  License,
  LicenseAssignment,
  LicenseComplianceStats,
  Warranty,
  RenewalAlert,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  Assets — Queries                                                    */
/* ================================================================== */

/**
 * GET /cmdb/assets - paginated list of assets.
 */
export function useAssets(
  page = 1,
  limit = 20,
  type?: string,
  status?: string,
  location?: string,
  ownerId?: string,
) {
  return useQuery({
    queryKey: ["assets", page, limit, type, status, location, ownerId],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Asset>>("/cmdb/assets", {
        page,
        limit,
        assetType: type,
        status,
        location,
        ownerId,
      }),
  });
}

/**
 * GET /cmdb/assets/{id} - single asset detail.
 */
export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ["asset", id],
    queryFn: () => apiClient.get<Asset>(`/cmdb/assets/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /cmdb/assets/stats - asset statistics summary.
 */
export function useAssetStats() {
  return useQuery({
    queryKey: ["asset-stats"],
    queryFn: () => apiClient.get<AssetStats>("/cmdb/assets/stats"),
  });
}

/**
 * GET /cmdb/assets/search - search assets by query string.
 */
export function useSearchAssets(q: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["assets-search", q, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Asset>>("/cmdb/assets/search", {
        q,
        page,
        limit,
      }),
    enabled: !!q,
  });
}

/**
 * GET /cmdb/assets/{id}/lifecycle - lifecycle events for an asset.
 */
export function useAssetLifecycleEvents(assetId: string | undefined) {
  return useQuery({
    queryKey: ["asset-lifecycle", assetId],
    queryFn: () =>
      apiClient.get<AssetLifecycleEvent[]>(
        `/cmdb/assets/${assetId}/lifecycle`,
      ),
    enabled: !!assetId,
  });
}

/**
 * GET /cmdb/assets/disposals - paginated list of asset disposals.
 */
export function useAssetDisposals(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ["asset-disposals", page, limit, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AssetDisposal>>(
        "/cmdb/assets/disposals",
        { page, limit, status },
      ),
  });
}

/* ================================================================== */
/*  Assets — Mutations                                                  */
/* ================================================================== */

/**
 * POST /cmdb/assets - create a new asset.
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Asset>) =>
      apiClient.post<Asset>("/cmdb/assets", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast.success("Asset registered successfully");
    },
    onError: () => {
      toast.error("Failed to register asset");
    },
  });
}

/**
 * PUT /cmdb/assets/{id} - update an asset.
 */
export function useUpdateAsset(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Asset>) =>
      apiClient.put<Asset>(`/cmdb/assets/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast.success("Asset updated successfully");
    },
    onError: () => {
      toast.error("Failed to update asset");
    },
  });
}

/**
 * DELETE /cmdb/assets/{id} - delete an asset.
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/cmdb/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast.success("Asset deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete asset");
    },
  });
}

/**
 * POST /cmdb/assets/{id}/transition - transition asset status.
 */
export function useAssetTransition(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: string }) =>
      apiClient.post<Asset>(`/cmdb/assets/${id}/transition`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      queryClient.invalidateQueries({ queryKey: ["asset-lifecycle", id] });
      toast.success("Asset status updated");
    },
    onError: () => {
      toast.error("Failed to transition asset status");
    },
  });
}

/**
 * POST /cmdb/assets/{assetId}/lifecycle - create a lifecycle event.
 */
export function useCreateLifecycleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      ...body
    }: Partial<AssetLifecycleEvent> & { assetId: string }) =>
      apiClient.post<AssetLifecycleEvent>(
        `/cmdb/assets/${assetId}/lifecycle`,
        body,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["asset-lifecycle", variables.assetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["asset", variables.assetId],
      });
      toast.success("Lifecycle event recorded");
    },
    onError: () => {
      toast.error("Failed to record lifecycle event");
    },
  });
}

/* ================================================================== */
/*  Disposals — Queries & Mutations                                     */
/* ================================================================== */

/**
 * GET /cmdb/assets/disposals/{id} - single disposal detail.
 */
export function useAssetDisposal(id: string | undefined) {
  return useQuery({
    queryKey: ["asset-disposal", id],
    queryFn: () =>
      apiClient.get<AssetDisposal>(`/cmdb/assets/disposals/${id}`),
    enabled: !!id,
  });
}

/**
 * POST /cmdb/assets/disposals - create a disposal request.
 * assetId must be included in the request body as the backend reads it from there.
 */
export function useCreateDisposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      ...body
    }: Partial<AssetDisposal> & { assetId: string }) =>
      apiClient.post<AssetDisposal>(`/cmdb/assets/disposals`, {
        assetId,
        ...body,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({
        queryKey: ["asset", variables.assetId],
      });
      queryClient.invalidateQueries({ queryKey: ["asset-disposals"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast.success("Disposal request created");
    },
    onError: () => {
      toast.error("Failed to create disposal request");
    },
  });
}

/**
 * PUT /cmdb/assets/disposals/{id}/status - update disposal status.
 */
export function useUpdateDisposalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.put(`/cmdb/assets/disposals/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["asset-disposals"] });
      queryClient.invalidateQueries({
        queryKey: ["asset-disposal", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast.success("Disposal status updated");
    },
    onError: () => {
      toast.error("Failed to update disposal status");
    },
  });
}

/* ================================================================== */
/*  CMDB Items — Queries                                                */
/* ================================================================== */

/**
 * GET /cmdb/items - paginated list of configuration items.
 */
export function useCMDBItems(
  page = 1,
  limit = 20,
  ciType?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ["cmdb-items", page, limit, ciType, status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CMDBItem>>("/cmdb/items", {
        page,
        limit,
        ciType,
        status,
      }),
  });
}

/**
 * GET /cmdb/items/{id} - single configuration item detail.
 */
export function useCMDBItem(id: string | undefined) {
  return useQuery({
    queryKey: ["cmdb-item", id],
    queryFn: () => apiClient.get<CMDBItem>(`/cmdb/items/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /cmdb/items/search - search configuration items.
 */
export function useSearchCMDBItems(q: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["cmdb-items-search", q, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CMDBItem>>("/cmdb/items/search", {
        q,
        page,
        limit,
      }),
    enabled: !!q,
  });
}

/**
 * GET /cmdb/items/{id}/relationships - relationships for a CI.
 */
export function useCMDBRelationships(ciId: string | undefined) {
  return useQuery({
    queryKey: ["cmdb-relationships", ciId],
    queryFn: () =>
      apiClient.get<CMDBRelationship[]>(`/cmdb/items/${ciId}/relationships`),
    enabled: !!ciId,
  });
}

/* ================================================================== */
/*  CMDB Items — Mutations                                              */
/* ================================================================== */

/**
 * POST /cmdb/items - create a configuration item.
 */
export function useCreateCMDBItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CMDBItem>) =>
      apiClient.post<CMDBItem>("/cmdb/items", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cmdb-items"] });
      toast.success("Configuration item created successfully");
    },
    onError: () => {
      toast.error("Failed to create configuration item");
    },
  });
}

/**
 * PUT /cmdb/items/{id} - update a configuration item.
 */
export function useUpdateCMDBItem(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CMDBItem>) =>
      apiClient.put<CMDBItem>(`/cmdb/items/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cmdb-items"] });
      queryClient.invalidateQueries({ queryKey: ["cmdb-item", id] });
      toast.success("Configuration item updated successfully");
    },
    onError: () => {
      toast.error("Failed to update configuration item");
    },
  });
}

/**
 * DELETE /cmdb/items/{id} - delete a configuration item.
 */
export function useDeleteCMDBItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/cmdb/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cmdb-items"] });
      toast.success("Configuration item deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete configuration item");
    },
  });
}

/* ================================================================== */
/*  Relationships — Mutations                                           */
/* ================================================================== */

/**
 * POST /cmdb/relationships - create a relationship.
 * ciId is used only for cache invalidation; sourceCiId/targetCiId go in the body.
 */
export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ciId,
      ...body
    }: Partial<CMDBRelationship> & { ciId: string }) =>
      apiClient.post<CMDBRelationship>(
        `/cmdb/relationships`,
        body,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cmdb-relationships", variables.ciId],
      });
      queryClient.invalidateQueries({ queryKey: ["cmdb-items"] });
      toast.success("Relationship created successfully");
    },
    onError: () => {
      toast.error("Failed to create relationship");
    },
  });
}

/**
 * DELETE /cmdb/relationships/{relationshipId} - delete a relationship.
 * ciId is used only for cache invalidation.
 */
export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ciId: _ciId,
      relationshipId,
    }: {
      ciId: string;
      relationshipId: string;
    }) =>
      apiClient.delete(`/cmdb/relationships/${relationshipId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cmdb-relationships", variables.ciId],
      });
      queryClient.invalidateQueries({ queryKey: ["cmdb-items"] });
      toast.success("Relationship deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete relationship");
    },
  });
}

/* ================================================================== */
/*  Reconciliation — Queries & Mutations                                */
/* ================================================================== */

/**
 * GET /cmdb/reconciliation - paginated list of reconciliation runs.
 */
export function useReconciliationRuns(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["reconciliation-runs", page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ReconciliationRun>>(
        "/cmdb/reconciliation",
        { page, limit },
      ),
  });
}

/**
 * GET /cmdb/reconciliation/{id} - single reconciliation run detail.
 */
export function useReconciliationRun(id: string | undefined) {
  return useQuery({
    queryKey: ["reconciliation-run", id],
    queryFn: () =>
      apiClient.get<ReconciliationRun>(`/cmdb/reconciliation/${id}`),
    enabled: !!id,
  });
}

/**
 * POST /cmdb/reconciliation - trigger a new reconciliation run.
 */
export function useCreateReconciliationRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { source: string }) =>
      apiClient.post<ReconciliationRun>("/cmdb/reconciliation", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-runs"] });
      toast.success("Reconciliation run triggered");
    },
    onError: () => {
      toast.error("Failed to trigger reconciliation run");
    },
  });
}

/* ================================================================== */
/*  Licenses — Queries                                                  */
/* ================================================================== */

/**
 * GET /cmdb/licenses - paginated list of licenses.
 */
export function useLicenses(
  page = 1,
  limit = 20,
  licenseType?: string,
  complianceStatus?: string,
) {
  return useQuery({
    queryKey: ["licenses", page, limit, licenseType, complianceStatus],
    queryFn: () =>
      apiClient.get<PaginatedResponse<License>>("/cmdb/licenses", {
        page,
        limit,
        licenseType,
        complianceStatus,
      }),
  });
}

/**
 * GET /cmdb/licenses/{id} - single license detail.
 */
export function useLicense(id: string | undefined) {
  return useQuery({
    queryKey: ["license", id],
    queryFn: () => apiClient.get<License>(`/cmdb/licenses/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /cmdb/licenses/compliance-stats - license compliance statistics.
 */
export function useLicenseComplianceStats() {
  return useQuery({
    queryKey: ["license-compliance-stats"],
    queryFn: () =>
      apiClient.get<LicenseComplianceStats>("/cmdb/licenses/compliance-stats"),
  });
}

/**
 * GET /cmdb/licenses/{id}/assignments - assignments for a license.
 */
export function useLicenseAssignments(licenseId: string | undefined) {
  return useQuery({
    queryKey: ["license-assignments", licenseId],
    queryFn: () =>
      apiClient.get<LicenseAssignment[]>(
        `/cmdb/licenses/${licenseId}/assignments`,
      ),
    enabled: !!licenseId,
  });
}

/* ================================================================== */
/*  Licenses — Mutations                                                */
/* ================================================================== */

/**
 * POST /cmdb/licenses - create a license.
 */
export function useCreateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<License>) =>
      apiClient.post<License>("/cmdb/licenses", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      queryClient.invalidateQueries({
        queryKey: ["license-compliance-stats"],
      });
      toast.success("License created successfully");
    },
    onError: () => {
      toast.error("Failed to create license");
    },
  });
}

/**
 * PUT /cmdb/licenses/{id} - update a license.
 */
export function useUpdateLicense(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<License>) =>
      apiClient.put<License>(`/cmdb/licenses/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      queryClient.invalidateQueries({ queryKey: ["license", id] });
      queryClient.invalidateQueries({
        queryKey: ["license-compliance-stats"],
      });
      toast.success("License updated successfully");
    },
    onError: () => {
      toast.error("Failed to update license");
    },
  });
}

/**
 * DELETE /cmdb/licenses/{id} - delete a license.
 */
export function useDeleteLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/cmdb/licenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      queryClient.invalidateQueries({
        queryKey: ["license-compliance-stats"],
      });
      toast.success("License deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete license");
    },
  });
}

/**
 * POST /cmdb/licenses/{licenseId}/assignments - create a license assignment.
 */
export function useCreateLicenseAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      licenseId,
      ...body
    }: Partial<LicenseAssignment> & { licenseId: string }) =>
      apiClient.post<LicenseAssignment>(
        `/cmdb/licenses/${licenseId}/assignments`,
        body,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["license-assignments", variables.licenseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["license", variables.licenseId],
      });
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      queryClient.invalidateQueries({
        queryKey: ["license-compliance-stats"],
      });
      toast.success("License assigned successfully");
    },
    onError: () => {
      toast.error("Failed to assign license");
    },
  });
}

/**
 * DELETE /cmdb/licenses/assignments/{assignmentId} - remove a license assignment.
 * licenseId is used only for cache invalidation; it is not part of the URL.
 */
export function useDeleteLicenseAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      licenseId: _licenseId,
      assignmentId,
    }: {
      licenseId: string;
      assignmentId: string;
    }) =>
      apiClient.delete(
        `/cmdb/licenses/assignments/${assignmentId}`,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["license-assignments", variables.licenseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["license", variables.licenseId],
      });
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      queryClient.invalidateQueries({
        queryKey: ["license-compliance-stats"],
      });
      toast.success("License assignment removed");
    },
    onError: () => {
      toast.error("Failed to remove license assignment");
    },
  });
}

/* ================================================================== */
/*  Warranties — Queries                                                */
/* ================================================================== */

/**
 * GET /cmdb/warranties - paginated list of warranties.
 */
export function useWarranties(
  page = 1,
  limit = 20,
  renewalStatus?: string,
) {
  return useQuery({
    queryKey: ["warranties", page, limit, renewalStatus],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Warranty>>("/cmdb/warranties", {
        page,
        limit,
        renewalStatus,
      }),
  });
}

/**
 * GET /cmdb/warranties/{id} - single warranty detail.
 */
export function useWarranty(id: string | undefined) {
  return useQuery({
    queryKey: ["warranty", id],
    queryFn: () => apiClient.get<Warranty>(`/cmdb/warranties/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /cmdb/warranties/expiring - warranties expiring within N days.
 */
export function useExpiringWarranties(days = 90) {
  return useQuery({
    queryKey: ["warranties-expiring", days],
    queryFn: () =>
      apiClient.get<Warranty[]>("/cmdb/warranties/expiring", { days }),
  });
}

/* ================================================================== */
/*  Warranties — Mutations                                              */
/* ================================================================== */

/**
 * POST /cmdb/warranties - create a warranty.
 */
export function useCreateWarranty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Warranty>) =>
      apiClient.post<Warranty>("/cmdb/warranties", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      queryClient.invalidateQueries({ queryKey: ["warranties-expiring"] });
      toast.success("Warranty created successfully");
    },
    onError: () => {
      toast.error("Failed to create warranty");
    },
  });
}

/**
 * PUT /cmdb/warranties/{id} - update a warranty.
 */
export function useUpdateWarranty(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Warranty>) =>
      apiClient.put<Warranty>(`/cmdb/warranties/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      queryClient.invalidateQueries({ queryKey: ["warranty", id] });
      queryClient.invalidateQueries({ queryKey: ["warranties-expiring"] });
      toast.success("Warranty updated successfully");
    },
    onError: () => {
      toast.error("Failed to update warranty");
    },
  });
}

/**
 * DELETE /cmdb/warranties/{id} - delete a warranty.
 */
export function useDeleteWarranty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/cmdb/warranties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      queryClient.invalidateQueries({ queryKey: ["warranties-expiring"] });
      toast.success("Warranty deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete warranty");
    },
  });
}

/* ================================================================== */
/*  Renewal Alerts — Queries & Mutations                                */
/* ================================================================== */

/**
 * GET /cmdb/renewal-alerts - pending renewal alerts.
 */
export function usePendingAlerts() {
  return useQuery({
    queryKey: ["renewal-alerts"],
    queryFn: () =>
      apiClient.get<RenewalAlert[]>("/cmdb/renewal-alerts"),
  });
}

/**
 * POST /cmdb/renewal-alerts - create a renewal alert.
 */
export function useCreateRenewalAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RenewalAlert>) =>
      apiClient.post<RenewalAlert>("/cmdb/renewal-alerts", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewal-alerts"] });
      toast.success("Renewal alert created");
    },
    onError: () => {
      toast.error("Failed to create renewal alert");
    },
  });
}

/**
 * PUT /cmdb/renewal-alerts/{id}/sent - mark an alert as sent.
 */
export function useMarkAlertSent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.put(`/cmdb/renewal-alerts/${id}/sent`, { sent: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewal-alerts"] });
      toast.success("Alert marked as sent");
    },
    onError: () => {
      toast.error("Failed to mark alert as sent");
    },
  });
}

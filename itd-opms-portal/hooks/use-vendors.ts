import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/types";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  vendorType: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  taxId: string | null;
  paymentTerms: string | null;
  notes: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  vendorId: string;
  contractNumber: string;
  title: string;
  description: string | null;
  contractType: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  renewalNoticeDays: number | null;
  totalValue: number | null;
  annualValue: number | null;
  currency: string;
  paymentSchedule: string | null;
  slaTerms: Record<string, unknown>;
  documentIds: string[];
  ownerId: string | null;
  approvalChainId: string | null;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  vendorName: string;
}

export interface VendorScorecard {
  id: string;
  tenantId: string;
  vendorId: string;
  contractId: string | null;
  reviewPeriod: string;
  qualityScore: number;
  deliveryScore: number;
  responsivenessScore: number;
  costScore: number;
  complianceScore: number;
  overallScore: number;
  strengths: string | null;
  weaknesses: string | null;
  improvementAreas: string | null;
  notes: string | null;
  slaMetrics: Record<string, unknown>;
  reviewedBy: string;
  createdAt: string;
}

export interface ContractRenewal {
  id: string;
  contractId: string;
  tenantId: string;
  renewalType: string;
  newStartDate: string;
  newEndDate: string;
  newValue: number | null;
  changeNotes: string | null;
  approvalChainId: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface VendorSummary {
  totalContracts: number;
  activeContracts: number;
  totalAnnualValue: number;
  avgScore: number;
}

export interface ContractDashboard {
  totalContracts: number;
  activeValue: number;
  expiringIn30: number;
  expiringIn60: number;
  expiringIn90: number;
}

/* ================================================================== */
/*  Vendors — Queries                                                  */
/* ================================================================== */

/**
 * GET /vendors - paginated list of vendors.
 */
export function useVendors(
  page = 1,
  limit = 20,
  vendorType?: string,
  status?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ["vendors", page, limit, vendorType, status, search],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Vendor>>("/vendors", {
        page,
        limit,
        vendorType,
        status,
        search,
      }),
  });
}

/**
 * GET /vendors/{id} - single vendor detail.
 */
export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor", id],
    queryFn: () => apiClient.get<Vendor>(`/vendors/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /vendors/{id}/summary - vendor aggregate stats.
 */
export function useVendorSummary(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor-summary", id],
    queryFn: () => apiClient.get<VendorSummary>(`/vendors/${id}/summary`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Vendors — Mutations                                                */
/* ================================================================== */

/**
 * POST /vendors - create a new vendor.
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Vendor>) =>
      apiClient.post<Vendor>("/vendors", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
    },
    onError: () => {
      toast.error("Failed to create vendor");
    },
  });
}

/**
 * PUT /vendors/{id} - update a vendor.
 */
export function useUpdateVendor(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Vendor>) =>
      apiClient.put<Vendor>(`/vendors/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-summary", id] });
      toast.success("Vendor updated successfully");
    },
    onError: () => {
      toast.error("Failed to update vendor");
    },
  });
}

/**
 * DELETE /vendors/{id} - delete a vendor (soft).
 */
export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete vendor");
    },
  });
}

/* ================================================================== */
/*  Contracts — Queries                                                */
/* ================================================================== */

/**
 * GET /vendors/contracts - paginated list of contracts.
 */
export function useContracts(
  page = 1,
  limit = 20,
  contractType?: string,
  status?: string,
  vendorId?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ["contracts", page, limit, contractType, status, vendorId, search],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Contract>>("/vendors/contracts", {
        page,
        limit,
        contractType,
        status,
        vendorId,
        search,
      }),
  });
}

/**
 * GET /vendors/contracts/{id} - single contract detail.
 */
export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: () => apiClient.get<Contract>(`/vendors/contracts/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /vendors/contracts/expiring - expiring contracts.
 */
export function useExpiringContracts(days = 90) {
  return useQuery({
    queryKey: ["contracts-expiring", days],
    queryFn: () =>
      apiClient.get<Contract[]>("/vendors/contracts/expiring", { days }),
  });
}

/**
 * GET /vendors/contracts/dashboard - contract dashboard stats.
 */
export function useContractDashboard() {
  return useQuery({
    queryKey: ["contract-dashboard"],
    queryFn: () =>
      apiClient.get<ContractDashboard>("/vendors/contracts/dashboard"),
  });
}

/* ================================================================== */
/*  Contracts — Mutations                                              */
/* ================================================================== */

/**
 * POST /vendors/contracts - create a contract.
 */
export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Contract>) =>
      apiClient.post<Contract>("/vendors/contracts", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-expiring"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Contract created successfully");
    },
    onError: () => {
      toast.error("Failed to create contract");
    },
  });
}

/**
 * PUT /vendors/contracts/{id} - update a contract.
 */
export function useUpdateContract(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Contract>) =>
      apiClient.put<Contract>(`/vendors/contracts/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      queryClient.invalidateQueries({ queryKey: ["contract-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-expiring"] });
      toast.success("Contract updated successfully");
    },
    onError: () => {
      toast.error("Failed to update contract");
    },
  });
}

/**
 * POST /vendors/contracts/{id}/renew - renew a contract.
 */
export function useRenewContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      ...body
    }: Partial<ContractRenewal> & { contractId: string }) =>
      apiClient.post<ContractRenewal>(
        `/vendors/contracts/${contractId}/renew`,
        body,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({
        queryKey: ["contract", variables.contractId],
      });
      queryClient.invalidateQueries({ queryKey: ["contract-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-expiring"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Contract renewed successfully");
    },
    onError: () => {
      toast.error("Failed to renew contract");
    },
  });
}

/* ================================================================== */
/*  Scorecards — Queries & Mutations                                   */
/* ================================================================== */

/**
 * GET /vendors/{vendorId}/scorecards - vendor scorecards.
 */
export function useVendorScorecards(vendorId: string | undefined) {
  return useQuery({
    queryKey: ["vendor-scorecards", vendorId],
    queryFn: () =>
      apiClient.get<VendorScorecard[]>(`/vendors/${vendorId}/scorecards`),
    enabled: !!vendorId,
  });
}

/**
 * POST /vendors/scorecards - create a scorecard.
 */
export function useCreateScorecard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<VendorScorecard>) =>
      apiClient.post<VendorScorecard>("/vendors/scorecards", body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vendor-scorecards", variables.vendorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["vendor-summary", variables.vendorId],
      });
      toast.success("Scorecard created successfully");
    },
    onError: () => {
      toast.error("Failed to create scorecard");
    },
  });
}

/**
 * PUT /vendors/scorecards/{id} - update a scorecard.
 */
export function useUpdateScorecard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      vendorId,
      ...body
    }: Partial<VendorScorecard> & { id: string; vendorId: string }) =>
      apiClient.put<VendorScorecard>(`/vendors/scorecards/${id}`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vendor-scorecards", variables.vendorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["vendor-summary", variables.vendorId],
      });
      toast.success("Scorecard updated successfully");
    },
    onError: () => {
      toast.error("Failed to update scorecard");
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface CostCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  code: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CostEntry {
  id: string;
  tenantId: string;
  projectId: string;
  categoryId: string | null;
  categoryName: string;
  description: string;
  amount: number;
  entryType: "actual" | "committed" | "forecast";
  entryDate: string;
  vendorName: string | null;
  invoiceRef: string | null;
  documentId: string | null;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  actual: number;
  committed: number;
  forecast: number;
}

export interface BudgetSummary {
  projectId: string;
  approvedBudget: number;
  actualSpend: number;
  committedSpend: number;
  forecastTotal: number;
  remainingBudget: number;
  variancePct: number;
  burnRate: number;
  monthsRemaining: number;
  estimatedAtCompletion: number;
  costPerformanceIndex: number;
  byCategory: CategorySpend[];
}

export interface BurnRatePoint {
  period: string;
  actual: number;
  committed: number;
  forecast: number;
  cumulativeActual: number;
  budgetLine: number;
}

export interface BudgetForecast {
  projectId: string;
  approvedBudget: number;
  actualSpend: number;
  completionPct: number;
  estimatedAtCompletion: number;
  varianceAtCompletion: number;
  costPerformanceIndex: number;
  forecastPoints: BurnRatePoint[];
}

export interface BudgetSnapshot {
  id: string;
  tenantId: string;
  projectId: string;
  snapshotDate: string;
  approvedBudget: number;
  actualSpend: number;
  committedSpend: number;
  forecastTotal: number;
  completionPct: number;
  notes: string | null;
  createdBy: string;
  creatorName: string;
  createdAt: string;
}

export interface PortfolioBudgetItem {
  projectId: string;
  projectTitle: string;
  projectCode: string;
  status: string;
  approvedBudget: number;
  actualSpend: number;
  committedSpend: number;
  remainingBudget: number;
  variancePct: number;
}

export interface PortfolioBudgetSummary {
  totalApproved: number;
  totalSpent: number;
  totalCommitted: number;
  totalRemaining: number;
  avgVariance: number;
  projects: PortfolioBudgetItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CostEntryFilters {
  entryType?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PortfolioFilters {
  portfolioId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/* ================================================================== */
/*  Budget Summary                                                     */
/* ================================================================== */

/**
 * GET /planning/projects/{projectId}/budget/summary
 */
export function useBudgetSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ["budget-summary", projectId],
    queryFn: () =>
      apiClient.get<BudgetSummary>(
        `/planning/projects/${projectId}/budget/summary`,
      ),
    enabled: !!projectId,
  });
}

/* ================================================================== */
/*  Cost Entries                                                       */
/* ================================================================== */

/**
 * GET /planning/projects/{projectId}/budget/entries
 */
export function useCostEntries(
  projectId: string | undefined,
  filters?: CostEntryFilters,
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;

  return useQuery({
    queryKey: [
      "cost-entries",
      projectId,
      page,
      limit,
      filters?.entryType,
      filters?.categoryId,
      filters?.startDate,
      filters?.endDate,
    ],
    queryFn: () =>
      apiClient.get<PaginatedResponse<CostEntry>>(
        `/planning/projects/${projectId}/budget/entries`,
        {
          page,
          limit,
          entry_type: filters?.entryType,
          category_id: filters?.categoryId,
          start_date: filters?.startDate,
          end_date: filters?.endDate,
        },
      ),
    enabled: !!projectId,
  });
}

/**
 * POST /planning/projects/{projectId}/budget/entries
 */
export function useCreateCostEntry(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      categoryId?: string;
      description: string;
      amount: number;
      entryType: string;
      entryDate?: string;
      vendorName?: string;
      invoiceRef?: string;
      documentId?: string;
    }) =>
      apiClient.post<CostEntry>(
        `/planning/projects/${projectId}/budget/entries`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cost-entries", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["budget-summary", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["burn-rate", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["budget-forecast", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Cost entry created");
    },
    onError: () => {
      toast.error("Failed to create cost entry");
    },
  });
}

/**
 * PUT /planning/projects/{projectId}/budget/entries/{entryId}
 */
export function useUpdateCostEntry(
  projectId: string | undefined,
  entryId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      categoryId?: string;
      description?: string;
      amount?: number;
      entryType?: string;
      entryDate?: string;
      vendorName?: string;
      invoiceRef?: string;
      documentId?: string;
    }) =>
      apiClient.put<CostEntry>(
        `/planning/projects/${projectId}/budget/entries/${entryId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cost-entries", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["budget-summary", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["burn-rate", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["budget-forecast", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Cost entry updated");
    },
    onError: () => {
      toast.error("Failed to update cost entry");
    },
  });
}

/**
 * DELETE /planning/projects/{projectId}/budget/entries/{entryId}
 */
export function useDeleteCostEntry(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      apiClient.delete(
        `/planning/projects/${projectId}/budget/entries/${entryId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cost-entries", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["budget-summary", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["burn-rate", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["budget-forecast", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Cost entry deleted");
    },
    onError: () => {
      toast.error("Failed to delete cost entry");
    },
  });
}

/* ================================================================== */
/*  Burn Rate & Forecast                                               */
/* ================================================================== */

/**
 * GET /planning/projects/{projectId}/budget/burn-rate
 */
export function useBurnRate(projectId: string | undefined) {
  return useQuery({
    queryKey: ["burn-rate", projectId],
    queryFn: () =>
      apiClient.get<BurnRatePoint[]>(
        `/planning/projects/${projectId}/budget/burn-rate`,
      ),
    enabled: !!projectId,
  });
}

/**
 * GET /planning/projects/{projectId}/budget/forecast
 */
export function useBudgetForecast(projectId: string | undefined) {
  return useQuery({
    queryKey: ["budget-forecast", projectId],
    queryFn: () =>
      apiClient.get<BudgetForecast>(
        `/planning/projects/${projectId}/budget/forecast`,
      ),
    enabled: !!projectId,
  });
}

/* ================================================================== */
/*  Budget Snapshots                                                   */
/* ================================================================== */

/**
 * GET /planning/projects/{projectId}/budget/snapshots
 */
export function useBudgetSnapshots(
  projectId: string | undefined,
  page = 1,
  limit = 10,
) {
  return useQuery({
    queryKey: ["budget-snapshots", projectId, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<BudgetSnapshot>>(
        `/planning/projects/${projectId}/budget/snapshots`,
        { page, limit },
      ),
    enabled: !!projectId,
  });
}

/**
 * POST /planning/projects/{projectId}/budget/snapshots
 */
export function useCreateBudgetSnapshot(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: { notes?: string }) =>
      apiClient.post<BudgetSnapshot>(
        `/planning/projects/${projectId}/budget/snapshots`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["budget-snapshots", projectId],
      });
      toast.success("Budget snapshot created");
    },
    onError: () => {
      toast.error("Failed to create budget snapshot");
    },
  });
}

/* ================================================================== */
/*  Cost Categories                                                    */
/* ================================================================== */

/**
 * GET /planning/budget/cost-categories
 */
export function useCostCategories() {
  return useQuery({
    queryKey: ["cost-categories"],
    queryFn: () =>
      apiClient.get<CostCategory[]>("/planning/budget/cost-categories"),
  });
}

/**
 * POST /planning/budget/cost-categories
 */
export function useCreateCostCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      code?: string;
      parentId?: string;
    }) =>
      apiClient.post<CostCategory>(
        "/planning/budget/cost-categories",
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
      toast.success("Cost category created");
    },
    onError: () => {
      toast.error("Failed to create cost category");
    },
  });
}

/**
 * PUT /planning/budget/cost-categories/{id}
 */
export function useUpdateCostCategory(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      description?: string;
      code?: string;
      parentId?: string;
    }) =>
      apiClient.put<CostCategory>(
        `/planning/budget/cost-categories/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
      toast.success("Cost category updated");
    },
    onError: () => {
      toast.error("Failed to update cost category");
    },
  });
}

/**
 * DELETE /planning/budget/cost-categories/{id}
 */
export function useDeleteCostCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/planning/budget/cost-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
      toast.success("Cost category deleted");
    },
    onError: () => {
      toast.error("Failed to delete cost category");
    },
  });
}

/* ================================================================== */
/*  Portfolio Budget Summary                                           */
/* ================================================================== */

/**
 * GET /planning/budget/portfolio-summary
 */
export function usePortfolioBudgetSummary(filters?: PortfolioFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;

  return useQuery({
    queryKey: [
      "portfolio-budget-summary",
      page,
      limit,
      filters?.portfolioId,
      filters?.status,
    ],
    queryFn: () =>
      apiClient.get<PortfolioBudgetSummary>(
        "/planning/budget/portfolio-summary",
        {
          page,
          limit,
          portfolio_id: filters?.portfolioId,
          status: filters?.status,
        },
      ),
  });
}

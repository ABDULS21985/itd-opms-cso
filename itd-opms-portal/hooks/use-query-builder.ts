import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface QueryFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface SavedQuery {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  entityType: string;
  filters: QueryFilter[];
  columns: string[];
  sortBy?: string;
  sortOrder?: string;
  groupBy?: string;
  chartType?: string;
  isShared: boolean;
  schedule?: string;
  emailRecipients: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface EntityFieldInfo {
  name: string;
  type: string;
}

export interface EntitySchema {
  entityType: string;
  fields: EntityFieldInfo[];
}

export interface CreateSavedQueryInput {
  name: string;
  description?: string;
  entityType: string;
  filters: QueryFilter[];
  columns: string[];
  sortBy?: string;
  sortOrder?: string;
  groupBy?: string;
  chartType?: string;
  isShared?: boolean;
  schedule?: string;
  emailRecipients?: string[];
}

export interface UpdateSavedQueryInput {
  name?: string;
  description?: string;
  entityType?: string;
  filters?: QueryFilter[];
  columns?: string[];
  sortBy?: string;
  sortOrder?: string;
  groupBy?: string;
  chartType?: string;
  isShared?: boolean;
  schedule?: string;
  emailRecipients?: string[];
}

export interface ExecuteQueryInput {
  entityType: string;
  columns: string[];
  filters: QueryFilter[];
  sortBy?: string;
  sortOrder?: string;
  groupBy?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

/* ================================================================== */
/*  Schema                                                             */
/* ================================================================== */

export function useQuerySchema(entityType?: string) {
  return useQuery({
    queryKey: ["query-schema", entityType],
    queryFn: () =>
      apiClient.get<EntitySchema[]>(
        "/reporting/reports/query/schema",
        entityType ? { entityType } : {},
      ),
  });
}

/* ================================================================== */
/*  Preview / Execute                                                  */
/* ================================================================== */

export function usePreviewQuery() {
  return useMutation({
    mutationFn: (data: ExecuteQueryInput) =>
      apiClient.post<QueryResult>("/reporting/reports/query/preview", data),
    onError: (err: Error) => {
      toast.error(err.message || "Query preview failed");
    },
  });
}

function useBlobExport(
  endpoint: string,
  filename: string,
  successMsg: string,
) {
  return useMutation({
    mutationFn: async (data: ExecuteQueryInput) => {
      const res = await fetch(`/api/v1/reporting/reports/query/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Export failed");
      return res.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(successMsg);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Export failed");
    },
  });
}

export function useExportQuery() {
  return useBlobExport("export", "query_export.csv", "CSV exported");
}

export function useExportExcel() {
  return useBlobExport("export-excel", "query_export.xlsx", "Excel exported");
}

export function useExportPDF() {
  return useBlobExport("export-pdf", "query_export.html", "Report exported");
}

/* ================================================================== */
/*  Saved Queries CRUD                                                 */
/* ================================================================== */

export function useSavedQueries(page = 1, limit = 20, entityType?: string) {
  return useQuery({
    queryKey: ["saved-queries", page, limit, entityType],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SavedQuery>>(
        "/reporting/reports/saved-queries",
        { page, limit, ...(entityType && { entityType }) },
      ),
  });
}

export function useSavedQuery(id: string) {
  return useQuery({
    queryKey: ["saved-query", id],
    queryFn: () => apiClient.get<SavedQuery>(`/reporting/reports/saved-queries/${id}`),
    enabled: !!id,
  });
}

export function useCreateSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSavedQueryInput) =>
      apiClient.post<SavedQuery>("/reporting/reports/saved-queries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-queries"] });
      toast.success("Query saved");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save query");
    },
  });
}

export function useUpdateSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSavedQueryInput }) =>
      apiClient.put<SavedQuery>(`/reporting/reports/saved-queries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-queries"] });
      toast.success("Query updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update query");
    },
  });
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/reporting/reports/saved-queries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-queries"] });
      toast.success("Query deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete query");
    },
  });
}

export function useRunSavedQuery() {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<QueryResult>(`/reporting/reports/saved-queries/${id}/run`, {}),
    onError: (err: Error) => {
      toast.error(err.message || "Failed to run query");
    },
  });
}

/* ================================================================== */
/*  Operator labels for UI                                             */
/* ================================================================== */

export const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not Equals" },
  { value: "in", label: "In" },
  { value: "not_in", label: "Not In" },
  { value: "gt", label: "Greater Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "lt", label: "Less Than" },
  { value: "lte", label: "Less or Equal" },
  { value: "between", label: "Between" },
  { value: "contains", label: "Contains" },
  { value: "is_null", label: "Is Empty" },
  { value: "is_not_null", label: "Is Not Empty" },
];

export const ENTITY_TYPES = [
  { value: "tickets", label: "Tickets (Incidents)" },
  { value: "assets", label: "Assets" },
  { value: "cmdb_items", label: "CI Items" },
  { value: "problems", label: "Problems" },
  { value: "changes", label: "Changes" },
  { value: "releases", label: "Releases" },
  { value: "service_requests", label: "Service Requests" },
  { value: "kb_articles", label: "KB Articles" },
];

export const CHART_TYPES = [
  { value: "table", label: "Table" },
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "donut", label: "Donut Chart" },
];

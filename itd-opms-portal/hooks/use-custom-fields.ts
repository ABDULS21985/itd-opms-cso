import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  description: string;
  isRequired: boolean;
  isFilterable: boolean;
  isVisibleInList: boolean;
  displayOrder: number;
  validationRules: Record<string, unknown>;
  defaultValue: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldDefinitionPayload {
  entityType: string;
  fieldKey?: string;
  fieldLabel: string;
  fieldType: string;
  description?: string;
  isRequired?: boolean;
  isFilterable?: boolean;
  isVisibleInList?: boolean;
  displayOrder?: number;
  validationRules?: Record<string, unknown>;
  defaultValue?: string | null;
}

export interface UpdateCustomFieldDefinitionPayload {
  fieldLabel?: string;
  description?: string;
  isRequired?: boolean;
  isFilterable?: boolean;
  isVisibleInList?: boolean;
  displayOrder?: number;
  validationRules?: Record<string, unknown>;
  defaultValue?: string | null;
  isActive?: boolean;
}

export interface ReorderItem {
  id: string;
  displayOrder: number;
}

/* ================================================================== */
/*  Definitions — Queries                                               */
/* ================================================================== */

/**
 * GET /custom-fields/definitions?entityType=... — list active definitions.
 */
export function useCustomFieldDefinitions(entityType: string) {
  return useQuery({
    queryKey: ["custom-field-definitions", entityType],
    queryFn: () =>
      apiClient.get<CustomFieldDefinition[]>(
        "/custom-fields/definitions",
        { entityType },
      ),
    enabled: !!entityType,
  });
}

/**
 * GET /custom-fields/definitions/{id} — single definition detail.
 */
export function useCustomFieldDefinition(id: string | undefined) {
  return useQuery({
    queryKey: ["custom-field-definition", id],
    queryFn: () =>
      apiClient.get<CustomFieldDefinition>(
        `/custom-fields/definitions/${id}`,
      ),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Definitions — Mutations                                             */
/* ================================================================== */

/**
 * POST /custom-fields/definitions — create a new definition.
 */
export function useCreateCustomFieldDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCustomFieldDefinitionPayload) =>
      apiClient.post<CustomFieldDefinition>(
        "/custom-fields/definitions",
        body,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions", variables.entityType],
      });
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions"],
      });
      toast.success("Custom field created successfully");
    },
    onError: () => {
      toast.error("Failed to create custom field");
    },
  });
}

/**
 * PUT /custom-fields/definitions/{id} — update a definition.
 */
export function useUpdateCustomFieldDefinition(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCustomFieldDefinitionPayload) =>
      apiClient.put<CustomFieldDefinition>(
        `/custom-fields/definitions/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definition", id],
      });
      toast.success("Custom field updated successfully");
    },
    onError: () => {
      toast.error("Failed to update custom field");
    },
  });
}

/**
 * DELETE /custom-fields/definitions/{id} — soft-delete a definition.
 */
export function useDeleteCustomFieldDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/custom-fields/definitions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions"],
      });
      toast.success("Custom field deleted");
    },
    onError: () => {
      toast.error("Failed to delete custom field");
    },
  });
}

/**
 * POST /custom-fields/definitions/reorder?entityType=... — batch reorder.
 */
export function useReorderCustomFieldDefinitions(entityType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ReorderItem[]) =>
      apiClient.post(
        `/custom-fields/definitions/reorder?entityType=${encodeURIComponent(entityType)}`,
        { items },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions", entityType],
      });
      queryClient.invalidateQueries({
        queryKey: ["custom-field-definitions"],
      });
      toast.success("Fields reordered successfully");
    },
    onError: () => {
      toast.error("Failed to reorder fields");
    },
  });
}

/* ================================================================== */
/*  Entity Values — Queries                                             */
/* ================================================================== */

/**
 * GET /custom-fields/entity/{entityType}/{entityId}/values — read values.
 */
export function useCustomFieldValues(
  entityType: string | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: ["custom-field-values", entityType, entityId],
    queryFn: () =>
      apiClient.get<Record<string, unknown>>(
        `/custom-fields/entity/${entityType}/${entityId}/values`,
      ),
    enabled: !!entityType && !!entityId,
  });
}

/* ================================================================== */
/*  Entity Values — Mutations                                           */
/* ================================================================== */

/**
 * PUT /custom-fields/entity/{entityType}/{entityId}/values — write values.
 */
export function useUpdateCustomFieldValues(
  entityType: string | undefined,
  entityId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiClient.put(
        `/custom-fields/entity/${entityType}/${entityId}/values`,
        values,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["custom-field-values", entityType, entityId],
      });
      toast.success("Custom field values saved");
    },
    onError: () => {
      toast.error("Failed to save custom field values");
    },
  });
}

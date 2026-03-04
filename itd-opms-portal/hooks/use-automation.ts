import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

export interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: "event" | "schedule" | "condition";
  triggerConfig: Record<string, unknown>;
  conditionConfig: Record<string, unknown>;
  actions: ActionConfig[];
  maxExecutionsPerHour: number;
  cooldownMinutes: number;
  executionCount: number;
  lastExecutedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionConfig {
  type: string;
  config: Record<string, unknown>;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  tenantId: string;
  triggerEvent: Record<string, unknown>;
  entityType: string;
  entityId: string;
  actionsTaken: Record<string, unknown>[];
  status: "success" | "partial" | "failed";
  errorMessage: string | null;
  durationMs: number;
  executedAt: string;
}

export interface AutomationStats {
  totalRules: number;
  activeRules: number;
  executionsToday: number;
  failuresToday: number;
}

export interface CreateAutomationRulePayload {
  name: string;
  description?: string;
  triggerType: "event" | "schedule" | "condition";
  triggerConfig?: Record<string, unknown>;
  conditionConfig?: Record<string, unknown>;
  actions?: ActionConfig[];
  maxExecutionsPerHour?: number;
  cooldownMinutes?: number;
}

export interface UpdateAutomationRulePayload {
  name?: string;
  description?: string;
  triggerType?: "event" | "schedule" | "condition";
  triggerConfig?: Record<string, unknown>;
  conditionConfig?: Record<string, unknown>;
  actions?: ActionConfig[];
  maxExecutionsPerHour?: number;
  cooldownMinutes?: number;
}

export interface TestRulePayload {
  entityType: string;
  entityId: string;
}

export interface TestRuleResult {
  ruleId: string;
  ruleName: string;
  conditionsMet: boolean;
  matchedConditions: Record<string, unknown>[];
  actionsToExecute: ActionConfig[];
  entityData: Record<string, unknown>;
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

/* ================================================================== */
/*  Rules -- Queries                                                    */
/* ================================================================== */

/**
 * GET /automation/rules - paginated list of automation rules with filters.
 */
export function useAutomationRules(
  page = 1,
  pageSize = 20,
  filters?: {
    isActive?: boolean;
    triggerType?: string;
  },
) {
  return useQuery({
    queryKey: ["automation-rules", page, pageSize, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AutomationRule>>(
        "/automation/rules",
        {
          page,
          limit: pageSize,
          isActive: filters?.isActive !== undefined ? String(filters.isActive) : undefined,
          triggerType: filters?.triggerType,
        },
      ),
  });
}

/**
 * GET /automation/rules/{id} - single rule detail.
 */
export function useAutomationRule(id: string | undefined) {
  return useQuery({
    queryKey: ["automation-rule", id],
    queryFn: () =>
      apiClient.get<AutomationRule>(`/automation/rules/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Rules -- Mutations                                                  */
/* ================================================================== */

/**
 * POST /automation/rules - create a new automation rule.
 */
export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAutomationRulePayload) =>
      apiClient.post<AutomationRule>("/automation/rules", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      toast.success("Automation rule created successfully");
    },
    onError: () => {
      toast.error("Failed to create automation rule");
    },
  });
}

/**
 * PUT /automation/rules/{id} - update an automation rule.
 */
export function useUpdateAutomationRule(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAutomationRulePayload) =>
      apiClient.put<AutomationRule>(`/automation/rules/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      queryClient.invalidateQueries({ queryKey: ["automation-rule", id] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      toast.success("Automation rule updated successfully");
    },
    onError: () => {
      toast.error("Failed to update automation rule");
    },
  });
}

/**
 * DELETE /automation/rules/{id} - delete an automation rule.
 */
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/automation/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["automation-executions"] });
      toast.success("Automation rule deleted");
    },
    onError: () => {
      toast.error("Failed to delete automation rule");
    },
  });
}

/**
 * POST /automation/rules/{id}/toggle - toggle rule active status.
 */
export function useToggleAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<AutomationRule>(`/automation/rules/${id}/toggle`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      queryClient.invalidateQueries({ queryKey: ["automation-rule", id] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      toast.success("Rule status toggled");
    },
    onError: () => {
      toast.error("Failed to toggle rule status");
    },
  });
}

/**
 * POST /automation/rules/{id}/test - dry-run test a rule.
 */
export function useTestAutomationRule(id: string | undefined) {
  return useMutation({
    mutationFn: (body: TestRulePayload) =>
      apiClient.post<TestRuleResult>(`/automation/rules/${id}/test`, body),
    onSuccess: () => {
      toast.success("Rule test completed");
    },
    onError: () => {
      toast.error("Failed to test rule");
    },
  });
}

/* ================================================================== */
/*  Executions -- Queries                                               */
/* ================================================================== */

/**
 * GET /automation/rules/{ruleId}/executions - execution log for a specific rule.
 * GET /automation/executions - execution log across all rules.
 */
export function useAutomationExecutions(
  page = 1,
  pageSize = 20,
  filters?: {
    ruleId?: string;
    status?: string;
  },
) {
  const path = filters?.ruleId
    ? `/automation/rules/${filters.ruleId}/executions`
    : "/automation/executions";

  return useQuery({
    queryKey: ["automation-executions", page, pageSize, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AutomationExecution>>(path, {
        page,
        limit: pageSize,
        status: filters?.status,
      }),
  });
}

/* ================================================================== */
/*  Stats -- Queries                                                    */
/* ================================================================== */

/**
 * GET /automation/stats - automation aggregate statistics.
 */
export function useAutomationStats() {
  return useQuery({
    queryKey: ["automation-stats"],
    queryFn: () =>
      apiClient.get<AutomationStats>("/automation/stats"),
  });
}

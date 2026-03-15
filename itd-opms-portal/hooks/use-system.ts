import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  UserDetail,
  UserSearchResult,
  RoleDetail,
  RoleBinding,
  Delegation,
  PermissionCatalog,
  TenantDetail,
  OrgUnitDetail,
  OrgTreeNode,
  OrgAnalyticsResponse,
  SystemSetting,
  AuditEventDetail,
  AuditStatsResponse,
  ActiveSession,
  SessionMgmtStats,
  PlatformHealth,
  SystemStats,
  DirectorySyncStatus,
  EmailTemplate,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  Users — Queries                                                     */
/* ================================================================== */

/**
 * GET /system/users - paginated list of users with filters.
 */
export function useUsers(
  page = 1,
  pageSize = 20,
  filters?: {
    search?: string;
    role?: string;
    status?: string;
    department?: string;
    sortBy?: string;
    sortOrder?: string;
  },
) {
  return useQuery({
    queryKey: ["system-users", page, pageSize, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<UserDetail>>("/system/users", {
        page,
        limit: pageSize,
        search: filters?.search,
        role: filters?.role,
        status: filters?.status,
        department: filters?.department,
        sort: filters?.sortBy,
        order: filters?.sortOrder,
      }),
  });
}

/**
 * GET /system/users/{id} - single user detail with roles and delegations.
 */
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["system-user", id],
    queryFn: () => apiClient.get<UserDetail>(`/system/users/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /system/users/search?q=... - user autocomplete search.
 */
export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["system-users-search", query],
    queryFn: () =>
      apiClient.get<UserSearchResult[]>("/system/users/search", { q: query }),
    enabled: query.length >= 2,
  });
}

/**
 * GET /system/users/stats - user statistics.
 */
export function useUserStats() {
  return useQuery({
    queryKey: ["system-user-stats"],
    queryFn: () =>
      apiClient.get<{
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
        onlineNow: number;
        newThisMonth: number;
      }>("/system/users/stats"),
  });
}

/**
 * GET /system/users/{id}/delegations - delegations for a user.
 */
export function useUserDelegations(userId: string | undefined) {
  return useQuery({
    queryKey: ["system-user-delegations", userId],
    queryFn: () =>
      apiClient.get<Delegation[]>(`/system/users/${userId}/delegations`),
    enabled: !!userId,
  });
}

/* ================================================================== */
/*  Users — Mutations                                                   */
/* ================================================================== */

/**
 * PATCH /system/users/{id} - update a user.
 */
export function useUpdateUser(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UserDetail>) =>
      apiClient.patch<UserDetail>(`/system/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["system-user", id] });
      queryClient.invalidateQueries({ queryKey: ["system-user-stats"] });
      toast.success("User updated successfully");
    },
    onError: () => {
      toast.error("Failed to update user");
    },
  });
}

/**
 * POST /system/users - create a new user.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      email: string;
      displayName: string;
      jobTitle?: string;
      department?: string;
      office?: string;
      unit?: string;
      phone?: string;
    }) => apiClient.post<UserDetail>("/system/users", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["system-user-stats"] });
      toast.success("User created successfully");
    },
    onError: () => {
      toast.error("Failed to create user");
    },
  });
}

/**
 * POST /system/users/{id}/deactivate - deactivate a user.
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/system/users/${id}/deactivate`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["system-user", id] });
      queryClient.invalidateQueries({ queryKey: ["system-user-stats"] });
      toast.success("User deactivated");
    },
    onError: () => {
      toast.error("Failed to deactivate user");
    },
  });
}

/**
 * POST /system/users/{id}/reactivate - reactivate a user.
 */
export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/system/users/${id}/reactivate`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["system-user", id] });
      queryClient.invalidateQueries({ queryKey: ["system-user-stats"] });
      toast.success("User reactivated");
    },
    onError: () => {
      toast.error("Failed to reactivate user");
    },
  });
}

/**
 * POST /system/users/{id}/roles - assign a role to a user.
 */
export function useAssignRole(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      roleId: string;
      scopeType: string;
      scopeId?: string;
      expiresAt?: string;
    }) => apiClient.post<RoleBinding>(`/system/users/${userId}/roles`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["system-role-stats"] });
      toast.success("Role assigned successfully");
    },
    onError: () => {
      toast.error("Failed to assign role");
    },
  });
}

/**
 * DELETE /system/users/{id}/roles/{bindingId} - revoke a role from a user.
 */
export function useRevokeRole(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bindingId: string) =>
      apiClient.delete(`/system/users/${userId}/roles/${bindingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      queryClient.invalidateQueries({ queryKey: ["system-role-stats"] });
      toast.success("Role revoked");
    },
    onError: () => {
      toast.error("Failed to revoke role");
    },
  });
}

/**
 * POST /system/users/{id}/delegations - create a delegation.
 */
export function useCreateDelegation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      delegateId: string;
      roleId: string;
      reason: string;
      startsAt: string;
      endsAt: string;
    }) =>
      apiClient.post<Delegation>(
        `/system/users/${userId}/delegations`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["system-user-delegations", userId],
      });
      queryClient.invalidateQueries({ queryKey: ["system-user", userId] });
      toast.success("Delegation created successfully");
    },
    onError: () => {
      toast.error("Failed to create delegation");
    },
  });
}

/**
 * DELETE /system/users/{id}/delegations/{delegationId} - revoke a delegation.
 */
export function useRevokeDelegation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delegationId: string) =>
      apiClient.delete(
        `/system/users/${userId}/delegations/${delegationId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["system-user-delegations", userId],
      });
      queryClient.invalidateQueries({ queryKey: ["system-user", userId] });
      toast.success("Delegation revoked");
    },
    onError: () => {
      toast.error("Failed to revoke delegation");
    },
  });
}

/* ================================================================== */
/*  Roles — Queries                                                     */
/* ================================================================== */

/**
 * GET /system/roles - list all roles.
 */
export function useRoles() {
  return useQuery({
    queryKey: ["system-roles"],
    queryFn: () => apiClient.get<RoleDetail[]>("/system/roles"),
  });
}

/**
 * GET /system/roles/{id} - single role detail.
 */
export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: ["system-role", id],
    queryFn: () => apiClient.get<RoleDetail>(`/system/roles/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /system/roles/stats - role statistics.
 */
export function useRoleStats() {
  return useQuery({
    queryKey: ["system-role-stats"],
    queryFn: () =>
      apiClient.get<{
        totalRoles: number;
        systemRoles: number;
        customRoles: number;
        totalBindings: number;
      }>("/system/roles/stats"),
  });
}

/**
 * GET /system/permissions - permission catalog grouped by module.
 */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["system-permissions"],
    queryFn: () =>
      apiClient.get<PermissionCatalog[]>("/system/permissions"),
  });
}

/* ================================================================== */
/*  Roles — Mutations                                                   */
/* ================================================================== */

/**
 * POST /system/roles - create a custom role.
 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description: string;
      permissions: string[];
    }) => apiClient.post<RoleDetail>("/system/roles", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-roles"] });
      queryClient.invalidateQueries({ queryKey: ["system-role-stats"] });
      toast.success("Role created successfully");
    },
    onError: () => {
      toast.error("Failed to create role");
    },
  });
}

/**
 * PATCH /system/roles/{id} - update a role.
 */
export function useUpdateRole(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { description?: string; permissions?: string[] }) =>
      apiClient.patch<RoleDetail>(`/system/roles/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-roles"] });
      queryClient.invalidateQueries({ queryKey: ["system-role", id] });
      toast.success("Role updated successfully");
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });
}

/**
 * DELETE /system/roles/{id} - delete a role.
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/system/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-roles"] });
      queryClient.invalidateQueries({ queryKey: ["system-role-stats"] });
      toast.success("Role deleted");
    },
    onError: () => {
      toast.error("Failed to delete role");
    },
  });
}

/* ================================================================== */
/*  Tenants — Queries                                                   */
/* ================================================================== */

/**
 * GET /system/tenants - all tenants (tree).
 */
export function useTenants() {
  return useQuery({
    queryKey: ["system-tenants"],
    queryFn: () => apiClient.get<TenantDetail[]>("/system/tenants"),
  });
}

/**
 * GET /system/tenants/{id} - single tenant detail.
 */
export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ["system-tenant", id],
    queryFn: () => apiClient.get<TenantDetail>(`/system/tenants/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Tenants — Mutations                                                 */
/* ================================================================== */

/**
 * POST /system/tenants - create a tenant.
 */
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      code: string;
      type: string;
      parentId?: string;
      config?: Record<string, unknown>;
    }) => apiClient.post<TenantDetail>("/system/tenants", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-tenants"] });
      toast.success("Tenant created successfully");
    },
    onError: () => {
      toast.error("Failed to create tenant");
    },
  });
}

/**
 * PATCH /system/tenants/{id} - update a tenant.
 */
export function useUpdateTenant(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<TenantDetail>) =>
      apiClient.patch<TenantDetail>(`/system/tenants/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["system-tenant", id] });
      toast.success("Tenant updated successfully");
    },
    onError: () => {
      toast.error("Failed to update tenant");
    },
  });
}

/**
 * POST /system/tenants/{id}/deactivate - deactivate a tenant.
 */
export function useDeactivateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/system/tenants/${id}/deactivate`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["system-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["system-tenant", id] });
      toast.success("Tenant deactivated");
    },
    onError: () => {
      toast.error("Failed to deactivate tenant");
    },
  });
}

/* ================================================================== */
/*  Org Units — Queries                                                 */
/* ================================================================== */

/**
 * GET /system/org-units - paginated list of org units.
 */
export function useOrgUnits(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["system-org-units", page, pageSize],
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgUnitDetail>>("/system/org-units", {
        page,
        limit: pageSize,
      }),
  });
}

/**
 * GET /system/org-units/tree - org hierarchy tree.
 */
export function useOrgTree() {
  return useQuery({
    queryKey: ["system-org-tree"],
    queryFn: () => apiClient.get<OrgTreeNode[]>("/system/org-units/tree"),
  });
}

/**
 * GET /system/org-units/{id} - single org unit detail.
 */
export function useOrgUnit(id: string | undefined) {
  return useQuery({
    queryKey: ["system-org-unit", id],
    queryFn: () =>
      apiClient.get<OrgUnitDetail>(`/system/org-units/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /system/org-units/analytics - org analytics dashboard data.
 */
export function useOrgAnalytics() {
  return useQuery({
    queryKey: ["system-org-analytics"],
    queryFn: () => apiClient.get<OrgAnalyticsResponse>("/system/org-units/analytics"),
  });
}

/* ================================================================== */
/*  Org Units — Mutations                                               */
/* ================================================================== */

/**
 * POST /system/org-units - create an org unit.
 */
export function useCreateOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      code: string;
      level: string;
      parentId?: string;
      managerUserId?: string;
    }) => apiClient.post<OrgUnitDetail>("/system/org-units", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-org-units"] });
      queryClient.invalidateQueries({ queryKey: ["system-org-tree"] });
      toast.success("Org unit created successfully");
    },
    onError: () => {
      toast.error("Failed to create org unit");
    },
  });
}

/**
 * PATCH /system/org-units/{id} - update an org unit.
 */
export function useUpdateOrgUnit(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OrgUnitDetail>) =>
      apiClient.patch<OrgUnitDetail>(`/system/org-units/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-org-units"] });
      queryClient.invalidateQueries({ queryKey: ["system-org-unit", id] });
      queryClient.invalidateQueries({ queryKey: ["system-org-tree"] });
      toast.success("Org unit updated successfully");
    },
    onError: () => {
      toast.error("Failed to update org unit");
    },
  });
}

/**
 * POST /system/org-units/{id}/move - move an org unit in the hierarchy.
 */
export function useMoveOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      newParentId,
    }: {
      id: string;
      newParentId: string;
    }) => apiClient.post(`/system/org-units/${id}/move`, { newParentId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["system-org-units"] });
      queryClient.invalidateQueries({
        queryKey: ["system-org-unit", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["system-org-tree"] });
      toast.success("Org unit moved successfully");
    },
    onError: () => {
      toast.error("Failed to move org unit");
    },
  });
}

/**
 * DELETE /system/org-units/{id} - delete an org unit.
 */
export function useDeleteOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/system/org-units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-org-units"] });
      queryClient.invalidateQueries({ queryKey: ["system-org-tree"] });
      toast.success("Org unit deleted");
    },
    onError: () => {
      toast.error("Failed to delete org unit");
    },
  });
}

/* ================================================================== */
/*  Platform Health — Queries                                           */
/* ================================================================== */

/**
 * GET /system/health - platform health check (all services).
 */
export function usePlatformHealth() {
  return useQuery({
    queryKey: ["system-platform-health"],
    queryFn: () => apiClient.get<PlatformHealth>("/system/health"),
    refetchInterval: 30_000, // auto-refresh every 30 seconds
  });
}

/**
 * GET /system/health/stats - system-wide statistics.
 */
export function useSystemStats() {
  return useQuery({
    queryKey: ["system-stats"],
    queryFn: () => apiClient.get<SystemStats>("/system/health/stats"),
  });
}

/**
 * GET /system/health/directory-sync - directory sync status and history.
 */
export function useDirectorySyncStatus(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ["system-directory-sync", page, pageSize],
    queryFn: () =>
      apiClient.get<DirectorySyncStatus>("/system/health/directory-sync", {
        page,
        limit: pageSize,
      }),
  });
}

/* ================================================================== */
/*  Settings — Queries                                                  */
/* ================================================================== */

/**
 * GET /system/settings?category=X - list settings by category.
 */
export function useSettings(category?: string) {
  return useQuery({
    queryKey: ["system-settings", category],
    queryFn: () =>
      apiClient.get<SystemSetting[]>("/system/settings", { category }),
  });
}

/**
 * GET /system/settings/categories - list all setting categories.
 */
export function useSettingCategories() {
  return useQuery({
    queryKey: ["system-setting-categories"],
    queryFn: () => apiClient.get<string[]>("/system/settings/categories"),
  });
}

/**
 * GET /system/settings/{category}/{key} - get a single setting.
 */
export function useSetting(
  category: string | undefined,
  key: string | undefined,
) {
  return useQuery({
    queryKey: ["system-setting", category, key],
    queryFn: () =>
      apiClient.get<SystemSetting>(`/system/settings/${category}/${key}`),
    enabled: !!category && !!key,
  });
}

/* ================================================================== */
/*  Settings — Mutations                                                */
/* ================================================================== */

/**
 * PUT /system/settings/{category}/{key} - update a setting value.
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      category,
      key,
      value,
    }: {
      category: string;
      key: string;
      value: unknown;
    }) =>
      apiClient.put<SystemSetting>(`/system/settings/${category}/${key}`, {
        value,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      queryClient.invalidateQueries({
        queryKey: ["system-setting", variables.category, variables.key],
      });
      toast.success("Setting updated successfully");
    },
    onError: () => {
      toast.error("Failed to update setting");
    },
  });
}

/**
 * DELETE /system/settings/{category}/{key} - delete a tenant override.
 */
export function useDeleteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, key }: { category: string; key: string }) =>
      apiClient.delete(`/system/settings/${category}/${key}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      queryClient.invalidateQueries({
        queryKey: ["system-setting", variables.category, variables.key],
      });
      toast.success("Setting override removed");
    },
    onError: () => {
      toast.error("Failed to remove setting override");
    },
  });
}

/* ================================================================== */
/*  Audit Explorer — Queries                                            */
/* ================================================================== */

/**
 * GET /system/audit-logs - paginated audit events with filters.
 */
export function useAuditLogs(
  page = 1,
  pageSize = 20,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    actorId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  },
) {
  return useQuery({
    queryKey: ["system-audit-logs", page, pageSize, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AuditEventDetail>>(
        "/system/audit-logs",
        {
          page,
          limit: pageSize,
          dateFrom: filters?.dateFrom ? `${filters.dateFrom}T00:00:00Z` : undefined,
          dateTo: filters?.dateTo ? `${filters.dateTo}T23:59:59Z` : undefined,
          actorId: filters?.actorId,
          entityType: filters?.entityType,
          entityId: filters?.entityId,
          action: filters?.action,
          search: filters?.search,
          sortBy: filters?.sortBy,
          sortOrder: filters?.sortOrder,
        },
      ),
  });
}

/**
 * GET /system/audit-logs/{id} - single audit event detail.
 */
export function useAuditEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["system-audit-event", id],
    queryFn: () =>
      apiClient.get<AuditEventDetail>(`/system/audit-logs/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /system/audit-logs/entity/{type}/{id} - entity audit timeline.
 */
export function useAuditTimeline(
  entityType: string | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: ["system-audit-timeline", entityType, entityId],
    queryFn: () =>
      apiClient.get<AuditEventDetail[]>(
        `/system/audit-logs/entity/${entityType}/${entityId}`,
      ),
    enabled: !!entityType && !!entityId,
  });
}

/**
 * GET /system/audit-logs/stats - audit statistics for a date range.
 */
export function useAuditStats(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["system-audit-stats", dateFrom, dateTo],
    queryFn: () =>
      apiClient.get<AuditStatsResponse>("/system/audit-logs/stats", {
        dateFrom: dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59Z` : undefined,
      }),
  });
}

/* ================================================================== */
/*  Audit Explorer — Mutations                                          */
/* ================================================================== */

/**
 * POST /system/audit-logs/verify - verify audit log integrity.
 * Backend returns: { valid: boolean; totalEvents: number; verified: number; firstInvalid?: string }
 */
export function useVerifyIntegrity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: { dateFrom?: string; dateTo?: string }) =>
      apiClient.post<{
        valid: boolean;
        totalEvents: number;
        verified: number;
        firstInvalid?: string;
      }>(
        "/system/audit-logs/verify",
        {
          // Append time components so the backend can parse as time.Time (RFC3339)
          dateFrom: body?.dateFrom ? `${body.dateFrom}T00:00:00Z` : undefined,
          dateTo: body?.dateTo ? `${body.dateTo}T23:59:59Z` : undefined,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-audit-stats"] });
    },
    onError: () => {
      toast.error("Failed to verify audit integrity");
    },
  });
}

/**
 * GET /system/audit-logs/export - export filtered audit logs as CSV or JSON.
 * The backend returns []AuditEventDetail; the download is generated client-side.
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (params: {
      format: "csv" | "json";
      dateFrom?: string;
      dateTo?: string;
      actorId?: string;
      entityType?: string;
      entityId?: string;
      action?: string;
      search?: string;
    }) => {
      const { format, ...filters } = params;
      const events = await apiClient.get<AuditEventDetail[]>(
        "/system/audit-logs/export",
        {
          format,
          dateFrom: filters.dateFrom ? `${filters.dateFrom}T00:00:00Z` : undefined,
          dateTo: filters.dateTo ? `${filters.dateTo}T23:59:59Z` : undefined,
          actorId: filters.actorId,
          entityType: filters.entityType,
          entityId: filters.entityId,
          action: filters.action,
          search: filters.search,
        },
      );

      const rows = Array.isArray(events) ? events : [];
      let content: string;
      let mimeType: string;

      if (format === "csv") {
        const csvHeaders = [
          "id", "timestamp", "actorId", "actorName", "actorRole",
          "action", "entityType", "entityId", "ipAddress",
          "correlationId", "checksum",
        ];
        const csvRows = rows.map((e) =>
          [
            e.id, e.createdAt, e.actorId, e.actorName, e.actorRole,
            e.action, e.entityType, e.entityId, e.ipAddress,
            e.correlationId, e.checksum,
          ]
            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(","),
        );
        content = [csvHeaders.join(","), ...csvRows].join("\n");
        mimeType = "text/csv;charset=utf-8;";
      } else {
        content = JSON.stringify(rows, null, 2);
        mimeType = "application/json";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return rows;
    },
    onSuccess: () => {
      toast.success("Audit logs exported");
    },
    onError: () => {
      toast.error("Failed to export audit logs");
    },
  });
}

/* ================================================================== */
/*  Sessions — Queries                                                  */
/* ================================================================== */

/**
 * GET /system/sessions - paginated list of active sessions.
 */
export function useSessions(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["system-sessions", page, pageSize],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ActiveSession>>("/system/sessions", {
        page,
        limit: pageSize,
      }),
  });
}

/**
 * GET /system/sessions/stats - session statistics.
 */
export function useSessionStats() {
  return useQuery({
    queryKey: ["system-session-stats"],
    queryFn: () =>
      apiClient.get<SessionMgmtStats>("/system/sessions/stats"),
  });
}

/**
 * GET /system/sessions/user/{userId} - sessions for a specific user.
 */
export function useUserSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ["system-user-sessions", userId],
    queryFn: () =>
      apiClient.get<ActiveSession[]>(`/system/sessions/user/${userId}`),
    enabled: !!userId,
  });
}

/* ================================================================== */
/*  Sessions — Mutations                                                */
/* ================================================================== */

/**
 * DELETE /system/sessions/{id} - revoke a single session.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/system/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["system-session-stats"] });
      queryClient.invalidateQueries({ queryKey: ["system-user-sessions"] });
      toast.success("Session revoked");
    },
    onError: () => {
      toast.error("Failed to revoke session");
    },
  });
}

/**
 * DELETE /system/sessions/user/{userId} - revoke all sessions for a user.
 */
export function useRevokeAllUserSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/system/sessions/user/${userId}`),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["system-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["system-session-stats"] });
      queryClient.invalidateQueries({
        queryKey: ["system-user-sessions", userId],
      });
      toast.success("All sessions revoked for user");
    },
    onError: () => {
      toast.error("Failed to revoke user sessions");
    },
  });
}

/* ================================================================== */
/*  Email Templates — Queries                                           */
/* ================================================================== */

/**
 * GET /system/email-templates - paginated list of email templates.
 */
export function useEmailTemplates(
  page = 1,
  pageSize = 20,
  category?: string,
) {
  return useQuery({
    queryKey: ["system-email-templates", page, pageSize, category],
    queryFn: () =>
      apiClient.get<PaginatedResponse<EmailTemplate>>(
        "/system/email-templates",
        { page, pageSize, category },
      ),
  });
}

/**
 * GET /system/email-templates/{id} - single email template.
 */
export function useEmailTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["system-email-template", id],
    queryFn: () =>
      apiClient.get<EmailTemplate>(`/system/email-templates/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Email Templates — Mutations                                         */
/* ================================================================== */

/**
 * POST /system/email-templates - create an email template.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EmailTemplate>) =>
      apiClient.post<EmailTemplate>("/system/email-templates", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-email-templates"] });
      toast.success("Email template created successfully");
    },
    onError: () => {
      toast.error("Failed to create email template");
    },
  });
}

/**
 * PATCH /system/email-templates/{id} - update an email template.
 */
export function useUpdateTemplate(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EmailTemplate>) =>
      apiClient.patch<EmailTemplate>(`/system/email-templates/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-email-templates"] });
      queryClient.invalidateQueries({
        queryKey: ["system-email-template", id],
      });
      toast.success("Email template updated successfully");
    },
    onError: () => {
      toast.error("Failed to update email template");
    },
  });
}

/**
 * DELETE /system/email-templates/{id} - delete an email template.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/system/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-email-templates"] });
      toast.success("Email template deleted");
    },
    onError: () => {
      toast.error("Failed to delete email template");
    },
  });
}

/**
 * POST /system/email-templates/{id}/preview - preview a rendered template.
 */
export function usePreviewTemplate(id: string | undefined) {
  return useMutation({
    mutationFn: (variables: Record<string, string>) =>
      apiClient.post<{ html: string; text: string }>(
        `/system/email-templates/${id}/preview`,
        { variables },
      ),
    onError: () => {
      toast.error("Failed to preview template");
    },
  });
}

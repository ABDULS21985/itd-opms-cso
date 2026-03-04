import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import {
  createWrapper,
  mockGet,
  mockPost,
  mockPatch,
  mockPut,
  mockDelete,
  paginatedMeta,
} from "./hook-test-utils";
import {
  useUsers,
  useUser,
  useSearchUsers,
  useUserStats,
  useUserDelegations,
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
  useAssignRole,
  useRevokeRole,
  useCreateDelegation,
  useRevokeDelegation,
  useRoles,
  useRole,
  useRoleStats,
  usePermissionCatalog,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useDeactivateTenant,
  useOrgUnits,
  useOrgTree,
  useOrgUnit,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useMoveOrgUnit,
  useDeleteOrgUnit,
  usePlatformHealth,
  useSystemStats,
  useDirectorySyncStatus,
  useSettings,
  useSettingCategories,
  useSetting,
  useUpdateSetting,
  useDeleteSetting,
  useAuditLogs,
  useAuditEvent,
  useAuditTimeline,
  useAuditStats,
  useVerifyIntegrity,
  useExportAuditLogs,
  useSessions,
  useSessionStats,
  useUserSessions,
  useRevokeSession,
  useRevokeAllUserSessions,
  useEmailTemplates,
  useEmailTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  usePreviewTemplate,
} from "@/hooks/use-system";

/* ================================================================== */
/*  Users — Queries                                                    */
/* ================================================================== */

describe("useUsers", () => {
  it("fetches paginated users", async () => {
    const user = { id: "u-1", displayName: "Alice" };
    server.use(mockGet("/system/users", [user], paginatedMeta));

    const { result } = renderHook(() => useUsers(1, 20), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useUser", () => {
  it("fetches a single user when id is provided", async () => {
    const user = { id: "u-1", displayName: "Alice" };
    server.use(mockGet("/system/users/u-1", user));

    const { result } = renderHook(() => useUser("u-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(user);
  });

  it("does not fetch when id is undefined", () => {
    const { result } = renderHook(() => useUser(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useSearchUsers", () => {
  it("fetches search results when query length >= 2", async () => {
    const users = [{ id: "u-1", displayName: "Alice" }];
    server.use(mockGet("/system/users/search", users));

    const { result } = renderHook(() => useSearchUsers("Al"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(users);
  });

  it("does not fetch when query is too short", () => {
    const { result } = renderHook(() => useSearchUsers("A"), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUserStats", () => {
  it("fetches user statistics", async () => {
    const stats = { totalUsers: 10, activeUsers: 8, inactiveUsers: 2, onlineNow: 3, newThisMonth: 1 };
    server.use(mockGet("/system/users/stats", stats));

    const { result } = renderHook(() => useUserStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useUserDelegations", () => {
  it("fetches delegations for a user", async () => {
    const delegations = [{ id: "d-1", delegateId: "u-2" }];
    server.use(mockGet("/system/users/u-1/delegations", delegations));

    const { result } = renderHook(() => useUserDelegations("u-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(delegations);
  });
});

/* ================================================================== */
/*  Users — Mutations                                                  */
/* ================================================================== */

describe("useUpdateUser", () => {
  it("calls PATCH /system/users/{id}", async () => {
    server.use(mockPatch("/system/users/u-1", { id: "u-1" }));

    const { result } = renderHook(() => useUpdateUser("u-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ displayName: "Bob" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeactivateUser", () => {
  it("calls POST /system/users/{id}/deactivate", async () => {
    server.use(mockPost("/system/users/u-1/deactivate"));

    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("u-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReactivateUser", () => {
  it("calls POST /system/users/{id}/reactivate", async () => {
    server.use(mockPost("/system/users/u-1/reactivate"));

    const { result } = renderHook(() => useReactivateUser(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("u-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAssignRole", () => {
  it("calls POST /system/users/{id}/roles", async () => {
    server.use(mockPost("/system/users/u-1/roles", { id: "rb-1" }));

    const { result } = renderHook(() => useAssignRole("u-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ roleId: "r-1", scopeType: "global" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRevokeRole", () => {
  it("calls DELETE /system/users/{id}/roles/{bindingId}", async () => {
    server.use(mockDelete("/system/users/u-1/roles/rb-1"));

    const { result } = renderHook(() => useRevokeRole("u-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("rb-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateDelegation", () => {
  it("calls POST /system/users/{id}/delegations", async () => {
    server.use(mockPost("/system/users/u-1/delegations", { id: "d-1" }));

    const { result } = renderHook(() => useCreateDelegation("u-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      delegateId: "u-2",
      roleId: "r-1",
      reason: "Vacation",
      startsAt: "2026-01-01",
      endsAt: "2026-01-15",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRevokeDelegation", () => {
  it("calls DELETE /system/users/{id}/delegations/{delegationId}", async () => {
    server.use(mockDelete("/system/users/u-1/delegations/d-1"));

    const { result } = renderHook(() => useRevokeDelegation("u-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("d-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Roles                                                              */
/* ================================================================== */

describe("useRoles", () => {
  it("fetches all roles", async () => {
    const roles = [{ id: "r-1", name: "Admin" }];
    server.use(mockGet("/system/roles", roles));

    const { result } = renderHook(() => useRoles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(roles);
  });
});

describe("useRole", () => {
  it("fetches a single role", async () => {
    const role = { id: "r-1", name: "Admin" };
    server.use(mockGet("/system/roles/r-1", role));

    const { result } = renderHook(() => useRole("r-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(role);
  });
});

describe("useRoleStats", () => {
  it("fetches role statistics", async () => {
    const stats = { totalRoles: 5, systemRoles: 3, customRoles: 2 };
    server.use(mockGet("/system/roles/stats", stats));

    const { result } = renderHook(() => useRoleStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("usePermissionCatalog", () => {
  it("fetches permission catalog", async () => {
    const catalog = { permissions: [{ key: "users.read" }] };
    server.use(mockGet("/system/permissions", catalog));

    const { result } = renderHook(() => usePermissionCatalog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(catalog);
  });
});

describe("useCreateRole", () => {
  it("calls POST /system/roles", async () => {
    server.use(mockPost("/system/roles", { id: "r-2" }));

    const { result } = renderHook(() => useCreateRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Editor" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateRole", () => {
  it("calls PATCH /system/roles/{id}", async () => {
    server.use(mockPatch("/system/roles/r-1", { id: "r-1" }));

    const { result } = renderHook(() => useUpdateRole("r-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteRole", () => {
  it("calls DELETE /system/roles/{id}", async () => {
    server.use(mockDelete("/system/roles/r-1"));

    const { result } = renderHook(() => useDeleteRole(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("r-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Tenants                                                            */
/* ================================================================== */

describe("useTenants", () => {
  it("fetches all tenants", async () => {
    const tenants = [{ id: "t-1", name: "Acme" }];
    server.use(mockGet("/system/tenants", tenants));

    const { result } = renderHook(() => useTenants(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tenants);
  });
});

describe("useTenant", () => {
  it("fetches a single tenant", async () => {
    const tenant = { id: "t-1", name: "Acme" };
    server.use(mockGet("/system/tenants/t-1", tenant));

    const { result } = renderHook(() => useTenant("t-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tenant);
  });
});

describe("useCreateTenant", () => {
  it("calls POST /system/tenants", async () => {
    server.use(mockPost("/system/tenants", { id: "t-2" }));

    const { result } = renderHook(() => useCreateTenant(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Corp" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateTenant", () => {
  it("calls PATCH /system/tenants/{id}", async () => {
    server.use(mockPatch("/system/tenants/t-1", { id: "t-1" }));

    const { result } = renderHook(() => useUpdateTenant("t-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeactivateTenant", () => {
  it("calls POST /system/tenants/{id}/deactivate", async () => {
    server.use(mockPost("/system/tenants/t-1/deactivate"));

    const { result } = renderHook(() => useDeactivateTenant(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("t-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Org Units                                                          */
/* ================================================================== */

describe("useOrgUnits", () => {
  it("fetches paginated org units", async () => {
    const units = [{ id: "ou-1", name: "IT Dept" }];
    server.use(mockGet("/system/org-units", units, paginatedMeta));

    const { result } = renderHook(() => useOrgUnits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useOrgTree", () => {
  it("fetches the org tree", async () => {
    const tree = [{ id: "ou-1", name: "Root", children: [] }];
    server.use(mockGet("/system/org-units/tree", tree));

    const { result } = renderHook(() => useOrgTree(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tree);
  });
});

describe("useOrgUnit", () => {
  it("fetches a single org unit", async () => {
    const unit = { id: "ou-1", name: "IT" };
    server.use(mockGet("/system/org-units/ou-1", unit));

    const { result } = renderHook(() => useOrgUnit("ou-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(unit);
  });
});

describe("useCreateOrgUnit", () => {
  it("calls POST /system/org-units", async () => {
    server.use(mockPost("/system/org-units", { id: "ou-2" }));

    const { result } = renderHook(() => useCreateOrgUnit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "HR" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateOrgUnit", () => {
  it("calls PATCH /system/org-units/{id}", async () => {
    server.use(mockPatch("/system/org-units/ou-1", { id: "ou-1" }));

    const { result } = renderHook(() => useUpdateOrgUnit("ou-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMoveOrgUnit", () => {
  it("calls POST /system/org-units/{id}/move", async () => {
    server.use(mockPost("/system/org-units/ou-1/move"));

    const { result } = renderHook(() => useMoveOrgUnit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "ou-1", newParentId: "ou-2" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteOrgUnit", () => {
  it("calls DELETE /system/org-units/{id}", async () => {
    server.use(mockDelete("/system/org-units/ou-1"));

    const { result } = renderHook(() => useDeleteOrgUnit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ou-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Platform Health / System Stats                                     */
/* ================================================================== */

describe("usePlatformHealth", () => {
  it("fetches platform health data", async () => {
    const health = { status: "healthy", uptime: 99.9 };
    server.use(mockGet("/system/health", health));

    const { result } = renderHook(() => usePlatformHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(health);
  });
});

describe("useSystemStats", () => {
  it("fetches system statistics", async () => {
    const stats = { totalUsers: 100, totalTickets: 50 };
    server.use(mockGet("/system/health/stats", stats));

    const { result } = renderHook(() => useSystemStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useDirectorySyncStatus", () => {
  it("fetches directory sync status", async () => {
    const data = { lastSync: "2026-01-01T00:00:00Z" };
    server.use(mockGet("/system/health/directory-sync", data, paginatedMeta));

    const { result } = renderHook(() => useDirectorySyncStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

/* ================================================================== */
/*  Settings                                                           */
/* ================================================================== */

describe("useSettings", () => {
  it("fetches settings", async () => {
    const settings = [{ key: "theme", value: "dark" }];
    server.use(mockGet("/system/settings", settings));

    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(settings);
  });
});

describe("useSettingCategories", () => {
  it("fetches setting categories", async () => {
    const categories = ["general", "security"];
    server.use(mockGet("/system/settings/categories", categories));

    const { result } = renderHook(() => useSettingCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(categories);
  });
});

describe("useSetting", () => {
  it("fetches a setting by category and key", async () => {
    const setting = { key: "theme", value: "dark" };
    server.use(mockGet("/system/settings/general/theme", setting));

    const { result } = renderHook(() => useSetting("general", "theme"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(setting);
  });
});

describe("useUpdateSetting", () => {
  it("calls PUT /system/settings/{category}/{key}", async () => {
    server.use(mockPut("/system/settings/general/theme", {}));

    const { result } = renderHook(() => useUpdateSetting(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ category: "general", key: "theme", value: "light" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSetting", () => {
  it("calls DELETE /system/settings/{category}/{key}", async () => {
    server.use(mockDelete("/system/settings/general/theme"));

    const { result } = renderHook(() => useDeleteSetting(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ category: "general", key: "theme" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Audit                                                              */
/* ================================================================== */

describe("useAuditLogs", () => {
  it("fetches paginated audit logs", async () => {
    const logs = [{ id: "al-1", action: "user.login" }];
    server.use(mockGet("/system/audit-logs", logs, paginatedMeta));

    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAuditEvent", () => {
  it("fetches a single audit event", async () => {
    const event = { id: "al-1", action: "user.login" };
    server.use(mockGet("/system/audit-logs/al-1", event));

    const { result } = renderHook(() => useAuditEvent("al-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(event);
  });
});

describe("useAuditTimeline", () => {
  it("fetches audit timeline for an entity", async () => {
    const timeline = [{ id: "al-1", action: "update" }];
    server.use(mockGet("/system/audit-logs/timeline/project/p-1", timeline));

    const { result } = renderHook(() => useAuditTimeline("project", "p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(timeline);
  });
});

describe("useAuditStats", () => {
  it("fetches audit statistics", async () => {
    const stats = { totalEvents: 100, byAction: {} };
    server.use(mockGet("/system/audit-logs/stats", stats));

    const { result } = renderHook(() => useAuditStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useVerifyIntegrity", () => {
  it("calls POST /audit/verify", async () => {
    server.use(mockPost("/system/audit-logs/verify-integrity", { valid: true }));

    const { result } = renderHook(() => useVerifyIntegrity(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useExportAuditLogs", () => {
  it("calls POST /system/audit-logs/export", async () => {
    server.use(mockPost("/system/audit-logs/export", { url: "/download/audit.csv" }));

    const { result } = renderHook(() => useExportAuditLogs(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ format: "csv" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Sessions                                                           */
/* ================================================================== */

describe("useSessions", () => {
  it("fetches paginated sessions", async () => {
    const sessions = [{ id: "s-1", userId: "u-1" }];
    server.use(mockGet("/system/sessions", sessions, paginatedMeta));

    const { result } = renderHook(() => useSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useSessionStats", () => {
  it("fetches session statistics", async () => {
    const stats = { activeSessions: 10, peakToday: 15 };
    server.use(mockGet("/system/sessions/stats", stats));

    const { result } = renderHook(() => useSessionStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useUserSessions", () => {
  it("fetches sessions for a user", async () => {
    const sessions = [{ id: "s-1" }];
    server.use(mockGet("/system/sessions/user/u-1", sessions));

    const { result } = renderHook(() => useUserSessions("u-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sessions);
  });
});

describe("useRevokeSession", () => {
  it("calls POST /system/sessions/{id}/revoke", async () => {
    server.use(mockPost("/system/sessions/s-1/revoke"));

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("s-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRevokeAllUserSessions", () => {
  it("calls POST /system/sessions/user/{userId}/revoke-all", async () => {
    server.use(mockPost("/system/sessions/user/u-1/revoke-all"));

    const { result } = renderHook(() => useRevokeAllUserSessions(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("u-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Email Templates                                                    */
/* ================================================================== */

describe("useEmailTemplates", () => {
  it("fetches paginated email templates", async () => {
    const templates = [{ id: "et-1", name: "Welcome" }];
    server.use(mockGet("/system/email-templates", templates, paginatedMeta));

    const { result } = renderHook(() => useEmailTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useEmailTemplate", () => {
  it("fetches a single email template", async () => {
    const template = { id: "et-1", name: "Welcome" };
    server.use(mockGet("/system/email-templates/et-1", template));

    const { result } = renderHook(() => useEmailTemplate("et-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(template);
  });
});

describe("useCreateTemplate", () => {
  it("calls POST /system/email-templates", async () => {
    server.use(mockPost("/system/email-templates", { id: "et-2" }));

    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Template" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateTemplate", () => {
  it("calls PATCH /system/email-templates/{id}", async () => {
    server.use(mockPatch("/system/email-templates/et-1", { id: "et-1" }));

    const { result } = renderHook(() => useUpdateTemplate("et-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteTemplate", () => {
  it("calls DELETE /system/email-templates/{id}", async () => {
    server.use(mockDelete("/system/email-templates/et-1"));

    const { result } = renderHook(() => useDeleteTemplate(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("et-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePreviewTemplate", () => {
  it("calls POST /system/email-templates/{id}/preview", async () => {
    server.use(mockPost("/system/email-templates/et-1/preview", { html: "<p>Hello</p>", text: "Hello" }));

    const { result } = renderHook(() => usePreviewTemplate("et-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userName: "Alice" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

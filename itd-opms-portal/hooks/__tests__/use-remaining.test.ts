/**
 * Combined test file for: budget, calendar, vault, approvals,
 * custom-fields, automation, and heatmap hooks.
 */
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import {
  createWrapper,
  mockGet,
  mockPost,
  mockPut,
  mockPatch,
  mockDelete,
  paginatedMeta,
} from "./hook-test-utils";

// Budget
import {
  useBudgetSummary,
  useCostEntries,
  useCreateCostEntry,
  useUpdateCostEntry,
  useDeleteCostEntry,
  useBurnRate,
  useBudgetForecast,
  useBudgetSnapshots,
  useCreateBudgetSnapshot,
  useCostCategories,
  useCreateCostCategory,
  useUpdateCostCategory,
  useDeleteCostCategory,
  usePortfolioBudgetSummary,
} from "@/hooks/use-budget";

// Calendar
import {
  useCalendarEvents,
  useMaintenanceWindow,
  useCreateMaintenanceWindow,
  useUpdateMaintenanceWindow,
  useDeleteMaintenanceWindow,
  useFreezePeriods,
  useCreateFreezePeriod,
  useDeleteFreezePeriod,
  useConflictCheck,
} from "@/hooks/use-calendar";

// Vault
import {
  useDocuments,
  useDocument,
  useDocumentVersions,
  useDocumentAccessLog,
  useDocumentDownloadUrl,
  useUploadDocument,
  useUpdateDocument,
  useDeleteDocument,
  useUploadVersion,
  useLockDocument,
  useUnlockDocument,
  useMoveDocument,
  useShareDocument,
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useVaultSearch,
  useRecentDocuments,
  useVaultStats,
} from "@/hooks/use-vault";

// Approvals
import {
  useWorkflowDefinitions,
  useWorkflowDefinition,
  useCreateWorkflowDefinition,
  useUpdateWorkflowDefinition,
  useDeleteWorkflowDefinition,
  useApprovalChain,
  useApprovalChainForEntity,
  useStartApproval,
  useCancelApproval,
  useMyPendingApprovals,
  useMyPendingApprovalCount,
  useApproveStep,
  useRejectStep,
  useDelegateStep,
  useApprovalHistory,
} from "@/hooks/use-approvals";

// Custom Fields
import {
  useCustomFieldDefinitions,
  useCustomFieldDefinition,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  useReorderCustomFieldDefinitions,
  useCustomFieldValues,
  useUpdateCustomFieldValues,
} from "@/hooks/use-custom-fields";

// Automation
import {
  useAutomationRules,
  useAutomationRule,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useToggleAutomationRule,
  useTestAutomationRule,
  useAutomationExecutions,
  useAutomationStats,
} from "@/hooks/use-automation";

// Heatmap
import {
  useCapacityHeatmap,
  useAllocations,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
} from "@/hooks/use-heatmap";

/* ================================================================== */
/*  Budget                                                             */
/* ================================================================== */

describe("useBudgetSummary", () => {
  it("fetches budget summary for a project", async () => {
    const summary = { totalBudget: 100000, spent: 50000 };
    server.use(mockGet("/planning/projects/p-1/budget/summary", summary));

    const { result } = renderHook(() => useBudgetSummary("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});

describe("useCostEntries", () => {
  it("fetches paginated cost entries for a project", async () => {
    const entry = { id: "ce-1", amount: 500 };
    server.use(mockGet("/planning/projects/p-1/budget/entries", [entry], paginatedMeta));

    const { result } = renderHook(() => useCostEntries("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateCostEntry", () => {
  it("calls POST /planning/projects/{id}/budget/entries", async () => {
    server.use(mockPost("/planning/projects/p-1/budget/entries", { id: "ce-2" }));

    const { result } = renderHook(() => useCreateCostEntry("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ amount: 1000, description: "Licenses" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateCostEntry", () => {
  it("calls PUT /planning/projects/{pid}/budget/entries/{ceId}", async () => {
    server.use(mockPut("/planning/projects/p-1/budget/entries/ce-1", { id: "ce-1" }));

    const { result } = renderHook(() => useUpdateCostEntry("p-1", "ce-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ amount: 1500 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCostEntry", () => {
  it("calls DELETE /planning/projects/{pid}/budget/entries/{ceId}", async () => {
    server.use(mockDelete("/planning/projects/p-1/budget/entries/ce-1"));

    const { result } = renderHook(() => useDeleteCostEntry("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ce-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useBurnRate", () => {
  it("fetches burn rate for a project", async () => {
    const data = { weeklyBurnRate: 5000, projectedEnd: "2026-12-01" };
    server.use(mockGet("/planning/projects/p-1/budget/burn-rate", data));

    const { result } = renderHook(() => useBurnRate("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useBudgetForecast", () => {
  it("fetches budget forecast for a project", async () => {
    const forecast = { predictedSpend: 80000, confidence: 0.9 };
    server.use(mockGet("/planning/projects/p-1/budget/forecast", forecast));

    const { result } = renderHook(() => useBudgetForecast("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(forecast);
  });
});

describe("useBudgetSnapshots", () => {
  it("fetches budget snapshots for a project", async () => {
    const snapshot = { id: "bs-1", date: "2026-01-01" };
    server.use(mockGet("/planning/projects/p-1/budget/snapshots", [snapshot], paginatedMeta));

    const { result } = renderHook(() => useBudgetSnapshots("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateBudgetSnapshot", () => {
  it("calls POST /planning/projects/{id}/budget/snapshots", async () => {
    server.use(mockPost("/planning/projects/p-1/budget/snapshots", { id: "bs-2" }));

    const { result } = renderHook(() => useCreateBudgetSnapshot("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCostCategories", () => {
  it("fetches cost categories", async () => {
    const categories = [{ id: "cc-1", name: "Hardware" }];
    server.use(mockGet("/planning/budget/cost-categories", categories));

    const { result } = renderHook(() => useCostCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(categories);
  });
});

describe("useCreateCostCategory", () => {
  it("calls POST /planning/budget/cost-categories", async () => {
    server.use(mockPost("/planning/budget/cost-categories", { id: "cc-2" }));

    const { result } = renderHook(() => useCreateCostCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Software" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateCostCategory", () => {
  it("calls PUT /planning/budget/cost-categories/{id}", async () => {
    server.use(mockPut("/planning/budget/cost-categories/cc-1", { id: "cc-1" }));

    const { result } = renderHook(() => useUpdateCostCategory("cc-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCostCategory", () => {
  it("calls DELETE /planning/budget/cost-categories/{id}", async () => {
    server.use(mockDelete("/planning/budget/cost-categories/cc-1"));

    const { result } = renderHook(() => useDeleteCostCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("cc-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePortfolioBudgetSummary", () => {
  it("fetches portfolio budget summary", async () => {
    const summary = { totalBudget: 500000, totalSpent: 200000 };
    server.use(mockGet("/planning/budget/portfolio-summary", summary));

    const { result } = renderHook(() => usePortfolioBudgetSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});

/* ================================================================== */
/*  Calendar                                                           */
/* ================================================================== */

describe("useCalendarEvents", () => {
  it("fetches calendar events", async () => {
    const event = { id: "ev-1", title: "Maintenance" };
    server.use(mockGet("/calendar/events", [event]));

    const { result } = renderHook(() => useCalendarEvents("2026-01-01", "2026-01-31"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([event]);
  });
});

describe("useMaintenanceWindow", () => {
  it("fetches a single maintenance window", async () => {
    const mw = { id: "mw-1", title: "Scheduled Maintenance" };
    server.use(mockGet("/calendar/maintenance-windows/mw-1", mw));

    const { result } = renderHook(() => useMaintenanceWindow("mw-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mw);
  });
});

describe("useCreateMaintenanceWindow", () => {
  it("calls POST /calendar/maintenance-windows", async () => {
    server.use(mockPost("/calendar/maintenance-windows", { id: "mw-2" }));

    const { result } = renderHook(() => useCreateMaintenanceWindow(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New MW" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateMaintenanceWindow", () => {
  it("calls PUT /calendar/maintenance-windows/{id}", async () => {
    server.use(mockPut("/calendar/maintenance-windows/mw-1", { id: "mw-1" }));

    const { result } = renderHook(() => useUpdateMaintenanceWindow("mw-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteMaintenanceWindow", () => {
  it("calls DELETE /calendar/maintenance-windows/{id}", async () => {
    server.use(mockDelete("/calendar/maintenance-windows/mw-1"));

    const { result } = renderHook(() => useDeleteMaintenanceWindow(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("mw-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useFreezePeriods", () => {
  it("fetches freeze periods", async () => {
    const periods = [{ id: "fp-1", reason: "Year-end" }];
    server.use(mockGet("/calendar/freeze-periods", periods));

    const { result } = renderHook(() => useFreezePeriods(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(periods);
  });
});

describe("useCreateFreezePeriod", () => {
  it("calls POST /calendar/freeze-periods", async () => {
    server.use(mockPost("/calendar/freeze-periods", { id: "fp-2" }));

    const { result } = renderHook(() => useCreateFreezePeriod(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ reason: "Holiday" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteFreezePeriod", () => {
  it("calls DELETE /calendar/freeze-periods/{id}", async () => {
    server.use(mockDelete("/calendar/freeze-periods/fp-1"));

    const { result } = renderHook(() => useDeleteFreezePeriod(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("fp-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useConflictCheck", () => {
  it("fetches conflict check results", async () => {
    const conflicts = { overlappingEvents: [], freezePeriods: [] };
    server.use(mockGet("/calendar/conflicts", conflicts));

    const { result } = renderHook(
      () => useConflictCheck("2026-01-01", "2026-01-02"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(conflicts);
  });
});

/* ================================================================== */
/*  Vault                                                              */
/* ================================================================== */

describe("useDocuments", () => {
  it("fetches paginated vault documents", async () => {
    const doc = { id: "vd-1", name: "Spec.pdf" };
    server.use(mockGet("/vault/documents", [doc], paginatedMeta));

    const { result } = renderHook(() => useDocuments({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useDocument", () => {
  it("fetches a single vault document", async () => {
    const doc = { id: "vd-1", name: "Spec.pdf" };
    server.use(mockGet("/vault/documents/vd-1", doc));

    const { result } = renderHook(() => useDocument("vd-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(doc);
  });
});

describe("useDocumentVersions", () => {
  it("fetches document versions", async () => {
    const versions = [{ version: 1 }, { version: 2 }];
    server.use(mockGet("/vault/documents/vd-1/versions", versions));

    const { result } = renderHook(() => useDocumentVersions("vd-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(versions);
  });
});

describe("useDocumentAccessLog", () => {
  it("fetches document access log", async () => {
    const log = [{ userId: "u-1", action: "view" }];
    server.use(mockGet("/vault/documents/vd-1/access-log", log, paginatedMeta));

    const { result } = renderHook(() => useDocumentAccessLog("vd-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useDocumentDownloadUrl", () => {
  it("is disabled by default (manually triggered)", () => {
    const { result } = renderHook(() => useDocumentDownloadUrl("vd-1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateDocument", () => {
  it("calls PUT /vault/documents/{id}", async () => {
    server.use(mockPut("/vault/documents/vd-1", { id: "vd-1" }));

    const { result } = renderHook(() => useUpdateDocument("vd-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteDocument (vault)", () => {
  it("calls DELETE /vault/documents/{id}", async () => {
    server.use(mockDelete("/vault/documents/vd-1"));

    const { result } = renderHook(() => useDeleteDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("vd-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLockDocument", () => {
  it("calls POST /vault/documents/{id}/lock", async () => {
    server.use(mockPost("/vault/documents/vd-1/lock"));

    const { result } = renderHook(() => useLockDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("vd-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUnlockDocument", () => {
  it("calls POST /vault/documents/{id}/unlock", async () => {
    server.use(mockPost("/vault/documents/vd-1/unlock"));

    const { result } = renderHook(() => useUnlockDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("vd-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMoveDocument", () => {
  it("calls POST /vault/documents/{id}/move", async () => {
    server.use(mockPost("/vault/documents/vd-1/move"));

    const { result } = renderHook(() => useMoveDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "vd-1", folderId: "f-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useShareDocument", () => {
  it("calls POST /vault/documents/{id}/share", async () => {
    server.use(mockPost("/vault/documents/vd-1/share"));

    const { result } = renderHook(() => useShareDocument("vd-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u-1", permission: "read" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useFolders", () => {
  it("fetches vault folders", async () => {
    const folders = [{ id: "f-1", name: "Policies" }];
    server.use(mockGet("/vault/folders", folders));

    const { result } = renderHook(() => useFolders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(folders);
  });
});

describe("useCreateFolder", () => {
  it("calls POST /vault/folders", async () => {
    server.use(mockPost("/vault/folders", { id: "f-2" }));

    const { result } = renderHook(() => useCreateFolder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Templates" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateFolder", () => {
  it("calls PUT /vault/folders/{id}", async () => {
    server.use(mockPut("/vault/folders/f-1", { id: "f-1" }));

    const { result } = renderHook(() => useUpdateFolder("f-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteFolder", () => {
  it("calls DELETE /vault/folders/{id}", async () => {
    server.use(mockDelete("/vault/folders/f-1"));

    const { result } = renderHook(() => useDeleteFolder(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("f-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useVaultSearch", () => {
  it("fetches vault search results", async () => {
    const results = [{ id: "vd-1", name: "Spec" }];
    server.use(mockGet("/vault/search", results, paginatedMeta));

    const { result } = renderHook(() => useVaultSearch("spec"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useRecentDocuments", () => {
  it("fetches recent documents", async () => {
    const docs = [{ id: "vd-1", name: "Spec.pdf" }];
    server.use(mockGet("/vault/recent", docs));

    const { result } = renderHook(() => useRecentDocuments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(docs);
  });
});

describe("useVaultStats", () => {
  it("fetches vault statistics", async () => {
    const stats = { totalDocuments: 100, totalSize: 500000 };
    server.use(mockGet("/vault/stats", stats));

    const { result } = renderHook(() => useVaultStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

/* ================================================================== */
/*  Approvals                                                          */
/* ================================================================== */

describe("useWorkflowDefinitions", () => {
  it("fetches workflow definitions", async () => {
    const wf = { id: "wf-1", name: "Project Approval" };
    server.use(mockGet("/approvals/workflows", [wf]));

    const { result } = renderHook(() => useWorkflowDefinitions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([wf]);
  });
});

describe("useWorkflowDefinition", () => {
  it("fetches a single workflow definition", async () => {
    const wf = { id: "wf-1", name: "Project Approval" };
    server.use(mockGet("/approvals/workflows/wf-1", wf));

    const { result } = renderHook(() => useWorkflowDefinition("wf-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(wf);
  });
});

describe("useCreateWorkflowDefinition", () => {
  it("calls POST /approvals/workflows", async () => {
    server.use(mockPost("/approvals/workflows", { id: "wf-2" }));

    const { result } = renderHook(() => useCreateWorkflowDefinition(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Budget Approval" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateWorkflowDefinition", () => {
  it("calls PUT /approvals/workflows/{id}", async () => {
    server.use(mockPut("/approvals/workflows/wf-1", { id: "wf-1" }));

    const { result } = renderHook(() => useUpdateWorkflowDefinition("wf-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteWorkflowDefinition", () => {
  it("calls DELETE /approvals/workflows/{id}", async () => {
    server.use(mockDelete("/approvals/workflows/wf-1"));

    const { result } = renderHook(() => useDeleteWorkflowDefinition(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("wf-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useApprovalChain", () => {
  it("fetches an approval chain by ID", async () => {
    const chain = { id: "ac-1", status: "pending" };
    server.use(mockGet("/approvals/chains/ac-1", chain));

    const { result } = renderHook(() => useApprovalChain("ac-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(chain);
  });
});

describe("useApprovalChainForEntity", () => {
  it("fetches approval chain for an entity", async () => {
    const chain = { id: "ac-1", entityType: "project", entityId: "p-1" };
    server.use(mockGet("/approvals/entity/project/p-1", chain));

    const { result } = renderHook(() => useApprovalChainForEntity("project", "p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(chain);
  });
});

describe("useStartApproval", () => {
  it("calls POST /approvals/chains", async () => {
    server.use(mockPost("/approvals/chains", { id: "ac-2" }));

    const { result } = renderHook(() => useStartApproval(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ entityType: "project", entityId: "p-1", workflowId: "wf-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCancelApproval", () => {
  it("calls POST /approvals/chains/{id}/cancel", async () => {
    server.use(mockPost("/approvals/chains/ac-1/cancel"));

    const { result } = renderHook(() => useCancelApproval(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ac-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMyPendingApprovals", () => {
  it("fetches my pending approvals", async () => {
    const approvals = [{ id: "step-1", chainId: "ac-1" }];
    server.use(mockGet("/approvals/my-pending", approvals, paginatedMeta));

    const { result } = renderHook(() => useMyPendingApprovals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useMyPendingApprovalCount", () => {
  it("fetches my pending approval count", async () => {
    server.use(mockGet("/approvals/my-pending/count", { count: 3 }));

    const { result } = renderHook(() => useMyPendingApprovalCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ count: 3 });
  });
});

describe("useApproveStep", () => {
  it("calls POST /approvals/steps/{stepId}/decide", async () => {
    server.use(mockPost("/approvals/steps/step-1/decide"));

    const { result } = renderHook(() => useApproveStep(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ stepId: "step-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRejectStep", () => {
  it("calls POST /approvals/steps/{stepId}/decide", async () => {
    server.use(mockPost("/approvals/steps/step-1/decide"));

    const { result } = renderHook(() => useRejectStep(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ stepId: "step-1", comments: "Not ready" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDelegateStep", () => {
  it("calls POST /approvals/steps/{stepId}/delegate", async () => {
    server.use(mockPost("/approvals/steps/step-1/delegate"));

    const { result } = renderHook(() => useDelegateStep(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ stepId: "step-1", toUserId: "u-2" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useApprovalHistory", () => {
  it("fetches approval history", async () => {
    const history = [{ chainId: "ac-1", status: "approved" }];
    server.use(mockGet("/approvals/history", history, paginatedMeta));

    const { result } = renderHook(() => useApprovalHistory({ entityType: "project" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

/* ================================================================== */
/*  Custom Fields                                                      */
/* ================================================================== */

describe("useCustomFieldDefinitions", () => {
  it("fetches custom field definitions by entity type", async () => {
    const defs = [{ id: "cf-1", name: "Priority Label" }];
    server.use(mockGet("/custom-fields/definitions", defs));

    const { result } = renderHook(() => useCustomFieldDefinitions("project"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(defs);
  });
});

describe("useCustomFieldDefinition", () => {
  it("fetches a single custom field definition", async () => {
    const def = { id: "cf-1", name: "Priority Label" };
    server.use(mockGet("/custom-fields/definitions/cf-1", def));

    const { result } = renderHook(() => useCustomFieldDefinition("cf-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(def);
  });
});

describe("useCreateCustomFieldDefinition", () => {
  it("calls POST /custom-fields/definitions", async () => {
    server.use(mockPost("/custom-fields/definitions", { id: "cf-2" }));

    const { result } = renderHook(() => useCreateCustomFieldDefinition(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Cost Center", entityType: "project" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateCustomFieldDefinition", () => {
  it("calls PUT /custom-fields/definitions/{id}", async () => {
    server.use(mockPut("/custom-fields/definitions/cf-1", { id: "cf-1" }));

    const { result } = renderHook(() => useUpdateCustomFieldDefinition("cf-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCustomFieldDefinition", () => {
  it("calls DELETE /custom-fields/definitions/{id}", async () => {
    server.use(mockDelete("/custom-fields/definitions/cf-1"));

    const { result } = renderHook(() => useDeleteCustomFieldDefinition(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("cf-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReorderCustomFieldDefinitions", () => {
  it("calls POST /custom-fields/definitions/reorder", async () => {
    server.use(mockPost("/custom-fields/definitions/reorder", {}));

    const { result } = renderHook(() => useReorderCustomFieldDefinitions("project"), {
      wrapper: createWrapper(),
    });

    result.current.mutate([{ id: "cf-1", displayOrder: 0 }, { id: "cf-2", displayOrder: 1 }] as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCustomFieldValues", () => {
  it("fetches custom field values for an entity", async () => {
    const values = [{ fieldId: "cf-1", value: "High" }];
    server.use(mockGet("/custom-fields/entity/project/p-1/values", values));

    const { result } = renderHook(() => useCustomFieldValues("project", "p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(values);
  });
});

describe("useUpdateCustomFieldValues", () => {
  it("calls PUT /custom-fields/values/{entityType}/{entityId}", async () => {
    server.use(mockPut("/custom-fields/entity/project/p-1/values", {}));

    const { result } = renderHook(() => useUpdateCustomFieldValues("project", "p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate([{ fieldId: "cf-1", value: "Low" }] as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Automation                                                         */
/* ================================================================== */

describe("useAutomationRules", () => {
  it("fetches paginated automation rules", async () => {
    const rule = { id: "ar-1", name: "Auto-assign" };
    server.use(mockGet("/automation/rules", [rule], paginatedMeta));

    const { result } = renderHook(() => useAutomationRules(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAutomationRule", () => {
  it("fetches a single automation rule", async () => {
    const rule = { id: "ar-1", name: "Auto-assign" };
    server.use(mockGet("/automation/rules/ar-1", rule));

    const { result } = renderHook(() => useAutomationRule("ar-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rule);
  });
});

describe("useCreateAutomationRule", () => {
  it("calls POST /automation/rules", async () => {
    server.use(mockPost("/automation/rules", { id: "ar-2" }));

    const { result } = renderHook(() => useCreateAutomationRule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Auto-close" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateAutomationRule", () => {
  it("calls PUT /automation/rules/{id}", async () => {
    server.use(mockPut("/automation/rules/ar-1", { id: "ar-1" }));

    const { result } = renderHook(() => useUpdateAutomationRule("ar-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteAutomationRule", () => {
  it("calls DELETE /automation/rules/{id}", async () => {
    server.use(mockDelete("/automation/rules/ar-1"));

    const { result } = renderHook(() => useDeleteAutomationRule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ar-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useToggleAutomationRule", () => {
  it("calls POST /automation/rules/{id}/toggle", async () => {
    server.use(mockPost("/automation/rules/ar-1/toggle"));

    const { result } = renderHook(() => useToggleAutomationRule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ar-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useTestAutomationRule", () => {
  it("calls POST /automation/rules/{id}/test", async () => {
    server.use(mockPost("/automation/rules/ar-1/test", { matched: true }));

    const { result } = renderHook(() => useTestAutomationRule("ar-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAutomationExecutions", () => {
  it("fetches paginated automation executions", async () => {
    const exec = { id: "ae-1", status: "success" };
    server.use(mockGet("/automation/executions", [exec], paginatedMeta));

    const { result } = renderHook(() => useAutomationExecutions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAutomationStats", () => {
  it("fetches automation statistics", async () => {
    const stats = { totalRules: 10, activeRules: 8, executionsToday: 50 };
    server.use(mockGet("/automation/stats", stats));

    const { result } = renderHook(() => useAutomationStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

/* ================================================================== */
/*  Heatmap / Allocations                                              */
/* ================================================================== */

describe("useCapacityHeatmap", () => {
  it("fetches capacity heatmap data", async () => {
    const heatmap = { periods: [], rows: [], summary: { totalUsers: 0, overAllocatedUsers: 0, underUtilizedUsers: 0, averageUtilization: 0 } };
    server.use(mockGet("/people/capacity/heatmap", heatmap));

    const { result } = renderHook(() => useCapacityHeatmap("2026-01-01", "2026-03-31"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(heatmap);
  });
});

describe("useAllocations (heatmap)", () => {
  it("fetches allocations", async () => {
    const allocations = [{ id: "alloc-1", userId: "u-1" }];
    server.use(mockGet("/people/capacity/allocations", allocations));

    const { result } = renderHook(() => useAllocations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(allocations);
  });
});

describe("useCreateAllocation (heatmap)", () => {
  it("calls POST /people/capacity/allocations", async () => {
    server.use(mockPost("/people/capacity/allocations", { id: "alloc-2" }));

    const { result } = renderHook(() => useCreateAllocation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u-1", projectId: "p-1", hours: 40 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateAllocation (heatmap)", () => {
  it("calls PUT /people/capacity/allocations/{id}", async () => {
    server.use(mockPut("/people/capacity/allocations/alloc-1", { id: "alloc-1" }));

    const { result } = renderHook(() => useUpdateAllocation("alloc-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ hours: 30 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteAllocation (heatmap)", () => {
  it("calls DELETE /people/capacity/allocations/{id}", async () => {
    server.use(mockDelete("/people/capacity/allocations/alloc-1"));

    const { result } = renderHook(() => useDeleteAllocation("alloc-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

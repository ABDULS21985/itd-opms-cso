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
import {
  useAssets,
  useAsset,
  useAssetStats,
  useSearchAssets,
  useAssetLifecycleEvents,
  useAssetDisposals,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useCreateLifecycleEvent,
  useAssetDisposal,
  useCreateDisposal,
  useUpdateDisposalStatus,
  useCMDBItems,
  useCMDBItem,
  useSearchCMDBItems,
  useCMDBRelationships,
  useCreateCMDBItem,
  useUpdateCMDBItem,
  useDeleteCMDBItem,
  useCreateRelationship,
  useDeleteRelationship,
  useReconciliationRuns,
  useReconciliationRun,
  useCreateReconciliationRun,
  useLicenses,
  useLicense,
  useLicenseComplianceStats,
  useLicenseAssignments,
  useCreateLicense,
  useUpdateLicense,
  useDeleteLicense,
  useCreateLicenseAssignment,
  useDeleteLicenseAssignment,
  useWarranties,
  useWarranty,
  useExpiringWarranties,
  useCreateWarranty,
  useUpdateWarranty,
  useDeleteWarranty,
  usePendingAlerts,
  useCreateRenewalAlert,
  useMarkAlertSent,
} from "@/hooks/use-cmdb";

/* ================================================================== */
/*  Assets                                                             */
/* ================================================================== */

describe("useAssets", () => {
  it("fetches paginated assets", async () => {
    const asset = { id: "a-1", name: "Server 01" };
    server.use(mockGet("/cmdb/assets", [asset], paginatedMeta));

    const { result } = renderHook(() => useAssets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAsset", () => {
  it("fetches a single asset", async () => {
    const asset = { id: "a-1", name: "Server 01" };
    server.use(mockGet("/cmdb/assets/a-1", asset));

    const { result } = renderHook(() => useAsset("a-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(asset);
  });
});

describe("useAssetStats", () => {
  it("fetches asset statistics", async () => {
    const stats = { totalAssets: 200, active: 180 };
    server.use(mockGet("/cmdb/assets/stats", stats));

    const { result } = renderHook(() => useAssetStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useSearchAssets", () => {
  it("fetches asset search results", async () => {
    const assets = [{ id: "a-1", name: "Server 01" }];
    server.use(mockGet("/cmdb/assets/search", assets, paginatedMeta));

    const { result } = renderHook(() => useSearchAssets("Server"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAssetLifecycleEvents", () => {
  it("fetches lifecycle events for an asset", async () => {
    const events = [{ id: "le-1", type: "deployed" }];
    server.use(mockGet("/cmdb/assets/a-1/lifecycle", events));

    const { result } = renderHook(() => useAssetLifecycleEvents("a-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(events);
  });
});

describe("useAssetDisposals", () => {
  it("fetches paginated asset disposals", async () => {
    const disposal = { id: "d-1", status: "pending" };
    server.use(mockGet("/cmdb/assets/disposals", [disposal], paginatedMeta));

    const { result } = renderHook(() => useAssetDisposals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateAsset", () => {
  it("calls POST /cmdb/assets", async () => {
    server.use(mockPost("/cmdb/assets", { id: "a-2" }));

    const { result } = renderHook(() => useCreateAsset(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Server" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateAsset", () => {
  it("calls PUT /cmdb/assets/{id}", async () => {
    server.use(mockPut("/cmdb/assets/a-1", { id: "a-1" }));

    const { result } = renderHook(() => useUpdateAsset("a-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteAsset", () => {
  it("calls DELETE /cmdb/assets/{id}", async () => {
    server.use(mockDelete("/cmdb/assets/a-1"));

    const { result } = renderHook(() => useDeleteAsset(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("a-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateLifecycleEvent", () => {
  it("calls POST /cmdb/assets/{id}/lifecycle", async () => {
    server.use(mockPost("/cmdb/assets/a-1/lifecycle", { id: "le-2" }));

    const { result } = renderHook(() => useCreateLifecycleEvent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ assetId: "a-1", type: "maintenance" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAssetDisposal", () => {
  it("fetches a single disposal", async () => {
    const disposal = { id: "d-1", status: "pending" };
    server.use(mockGet("/cmdb/assets/disposals/d-1", disposal));

    const { result } = renderHook(() => useAssetDisposal("d-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(disposal);
  });
});

describe("useCreateDisposal", () => {
  it("calls POST /cmdb/assets/disposals", async () => {
    server.use(mockPost("/cmdb/assets/a-1/dispose", { id: "d-2" }));

    const { result } = renderHook(() => useCreateDisposal(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ assetId: "a-1", reason: "EOL" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateDisposalStatus", () => {
  it("calls PATCH /cmdb/assets/disposals/{id}/status", async () => {
    server.use(mockPut("/cmdb/assets/disposals/d-1/status", { id: "d-1" }));

    const { result } = renderHook(() => useUpdateDisposalStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "d-1", status: "approved" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  CMDB Items                                                         */
/* ================================================================== */

describe("useCMDBItems", () => {
  it("fetches paginated CMDB items", async () => {
    const ci = { id: "ci-1", name: "App Server" };
    server.use(mockGet("/cmdb/ci", [ci], paginatedMeta));

    const { result } = renderHook(() => useCMDBItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCMDBItem", () => {
  it("fetches a single CMDB item", async () => {
    const ci = { id: "ci-1", name: "App Server" };
    server.use(mockGet("/cmdb/ci/ci-1", ci));

    const { result } = renderHook(() => useCMDBItem("ci-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ci);
  });
});

describe("useSearchCMDBItems", () => {
  it("fetches CMDB item search results", async () => {
    const items = [{ id: "ci-1" }];
    server.use(mockGet("/cmdb/ci/search", items, paginatedMeta));

    const { result } = renderHook(() => useSearchCMDBItems("Server"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCMDBRelationships", () => {
  it("fetches relationships for a CI", async () => {
    const rels = [{ id: "rel-1", type: "depends_on" }];
    server.use(mockGet("/cmdb/ci/ci-1/relationships", rels));

    const { result } = renderHook(() => useCMDBRelationships("ci-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rels);
  });
});

describe("useCreateCMDBItem", () => {
  it("calls POST /cmdb/ci", async () => {
    server.use(mockPost("/cmdb/ci", { id: "ci-2" }));

    const { result } = renderHook(() => useCreateCMDBItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New CI" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateCMDBItem", () => {
  it("calls PUT /cmdb/ci/{id}", async () => {
    server.use(mockPut("/cmdb/ci/ci-1", { id: "ci-1" }));

    const { result } = renderHook(() => useUpdateCMDBItem("ci-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCMDBItem", () => {
  it("calls DELETE /cmdb/ci/{id}", async () => {
    server.use(mockDelete("/cmdb/ci/ci-1"));

    const { result } = renderHook(() => useDeleteCMDBItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ci-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateRelationship", () => {
  it("calls POST /cmdb/ci/{id}/relationships", async () => {
    server.use(mockPost("/cmdb/ci/ci-1/relationships", { id: "rel-2" }));

    const { result } = renderHook(() => useCreateRelationship(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ ciId: "ci-1", targetId: "ci-2", type: "depends_on" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteRelationship", () => {
  it("calls DELETE /cmdb/ci/{ciId}/relationships/{relId}", async () => {
    server.use(mockDelete("/cmdb/ci/ci-1/relationships/rel-1"));

    const { result } = renderHook(() => useDeleteRelationship(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ ciId: "ci-1", relationshipId: "rel-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Reconciliation                                                     */
/* ================================================================== */

describe("useReconciliationRuns", () => {
  it("fetches paginated reconciliation runs", async () => {
    const run = { id: "rr-1", status: "completed" };
    server.use(mockGet("/cmdb/reconciliation", [run], paginatedMeta));

    const { result } = renderHook(() => useReconciliationRuns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useReconciliationRun", () => {
  it("fetches a single reconciliation run", async () => {
    const run = { id: "rr-1", status: "completed" };
    server.use(mockGet("/cmdb/reconciliation/rr-1", run));

    const { result } = renderHook(() => useReconciliationRun("rr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(run);
  });
});

describe("useCreateReconciliationRun", () => {
  it("calls POST /cmdb/reconciliation", async () => {
    server.use(mockPost("/cmdb/reconciliation", { id: "rr-2" }));

    const { result } = renderHook(() => useCreateReconciliationRun(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Licenses                                                           */
/* ================================================================== */

describe("useLicenses", () => {
  it("fetches paginated licenses", async () => {
    const license = { id: "lic-1", name: "MS Office" };
    server.use(mockGet("/cmdb/licenses", [license], paginatedMeta));

    const { result } = renderHook(() => useLicenses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useLicense", () => {
  it("fetches a single license", async () => {
    const license = { id: "lic-1", name: "MS Office" };
    server.use(mockGet("/cmdb/licenses/lic-1", license));

    const { result } = renderHook(() => useLicense("lic-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(license);
  });
});

describe("useLicenseComplianceStats", () => {
  it("fetches license compliance stats", async () => {
    const stats = { totalLicenses: 50, compliant: 45 };
    server.use(mockGet("/cmdb/licenses/compliance", stats));

    const { result } = renderHook(() => useLicenseComplianceStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useLicenseAssignments", () => {
  it("fetches license assignments", async () => {
    const assignments = [{ id: "la-1", userId: "u-1" }];
    server.use(mockGet("/cmdb/licenses/lic-1/assignments", assignments));

    const { result } = renderHook(() => useLicenseAssignments("lic-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(assignments);
  });
});

describe("useCreateLicense", () => {
  it("calls POST /cmdb/licenses", async () => {
    server.use(mockPost("/cmdb/licenses", { id: "lic-2" }));

    const { result } = renderHook(() => useCreateLicense(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Adobe CC" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateLicense", () => {
  it("calls PUT /cmdb/licenses/{id}", async () => {
    server.use(mockPut("/cmdb/licenses/lic-1", { id: "lic-1" }));

    const { result } = renderHook(() => useUpdateLicense("lic-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteLicense", () => {
  it("calls DELETE /cmdb/licenses/{id}", async () => {
    server.use(mockDelete("/cmdb/licenses/lic-1"));

    const { result } = renderHook(() => useDeleteLicense(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("lic-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateLicenseAssignment", () => {
  it("calls POST /cmdb/licenses/{id}/assignments", async () => {
    server.use(mockPost("/cmdb/licenses/lic-1/assignments", { id: "la-2" }));

    const { result } = renderHook(() => useCreateLicenseAssignment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ licenseId: "lic-1", userId: "u-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteLicenseAssignment", () => {
  it("calls DELETE /cmdb/licenses/{id}/assignments/{aId}", async () => {
    server.use(mockDelete("/cmdb/licenses/lic-1/assignments/la-1"));

    const { result } = renderHook(() => useDeleteLicenseAssignment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ licenseId: "lic-1", assignmentId: "la-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Warranties                                                         */
/* ================================================================== */

describe("useWarranties", () => {
  it("fetches paginated warranties", async () => {
    const warranty = { id: "w-1", vendor: "Dell" };
    server.use(mockGet("/cmdb/warranties", [warranty], paginatedMeta));

    const { result } = renderHook(() => useWarranties(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useWarranty", () => {
  it("fetches a single warranty", async () => {
    const warranty = { id: "w-1", vendor: "Dell" };
    server.use(mockGet("/cmdb/warranties/w-1", warranty));

    const { result } = renderHook(() => useWarranty("w-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(warranty);
  });
});

describe("useExpiringWarranties", () => {
  it("fetches expiring warranties", async () => {
    const warranties = [{ id: "w-1", expiresAt: "2026-04-01" }];
    server.use(mockGet("/cmdb/warranties/expiring", warranties));

    const { result } = renderHook(() => useExpiringWarranties(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(warranties);
  });
});

describe("useCreateWarranty", () => {
  it("calls POST /cmdb/warranties", async () => {
    server.use(mockPost("/cmdb/warranties", { id: "w-2" }));

    const { result } = renderHook(() => useCreateWarranty(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ vendor: "HP" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateWarranty", () => {
  it("calls PUT /cmdb/warranties/{id}", async () => {
    server.use(mockPut("/cmdb/warranties/w-1", { id: "w-1" }));

    const { result } = renderHook(() => useUpdateWarranty("w-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ vendor: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteWarranty", () => {
  it("calls DELETE /cmdb/warranties/{id}", async () => {
    server.use(mockDelete("/cmdb/warranties/w-1"));

    const { result } = renderHook(() => useDeleteWarranty(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("w-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Renewal Alerts                                                     */
/* ================================================================== */

describe("usePendingAlerts", () => {
  it("fetches pending renewal alerts", async () => {
    const alerts = [{ id: "ra-1", type: "warranty_expiry" }];
    server.use(mockGet("/cmdb/renewal-alerts", alerts));

    const { result } = renderHook(() => usePendingAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(alerts);
  });
});

describe("useCreateRenewalAlert", () => {
  it("calls POST /cmdb/renewal-alerts", async () => {
    server.use(mockPost("/cmdb/renewal-alerts", { id: "ra-2" }));

    const { result } = renderHook(() => useCreateRenewalAlert(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ type: "license_renewal" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMarkAlertSent", () => {
  it("calls POST /cmdb/renewal-alerts/{id}/sent", async () => {
    server.use(mockPut("/cmdb/renewal-alerts/ra-1/sent", {}));

    const { result } = renderHook(() => useMarkAlertSent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ra-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

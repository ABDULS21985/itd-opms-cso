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
  usePolicies,
  usePolicy,
  usePolicyVersions,
  usePolicyDiff,
  useAttestationStatus,
  useCreatePolicy,
  useUpdatePolicy,
  useSubmitPolicy,
  useApprovePolicy,
  usePublishPolicy,
  useRetirePolicy,
  useLaunchCampaign,
  useAttestPolicy,
  useRACIMatrices,
  useRACIMatrix,
  useCreateRACIMatrix,
  useUpdateRACIMatrix,
  useDeleteRACIMatrix,
  useAddRACIEntry,
  useUpdateRACIEntry,
  useDeleteRACIEntry,
  useMeetings,
  useMeeting,
  useMeetingDecisions,
  useCreateMeeting,
  useUpdateMeeting,
  useCreateDecision,
  useActionItems,
  useOverdueActions,
  useCreateActionItem,
  useUpdateActionItem,
  useCompleteAction,
  useOKRs,
  useOKR,
  useOKRTree,
  useCreateOKR,
  useUpdateOKR,
  useCreateKeyResult,
  useUpdateKeyResult,
  useDeleteKeyResult,
  useKPIs,
  useCreateKPI,
  useUpdateKPI,
  useDeleteKPI,
  useRACICoverageReport,
  useRACICoverageSummary,
  useOverdueActionStats,
  useMyOverdueActions,
} from "@/hooks/use-governance";

/* ================================================================== */
/*  Policies                                                           */
/* ================================================================== */

describe("usePolicies", () => {
  it("fetches paginated policies", async () => {
    const policy = { id: "pol-1", title: "Security Policy" };
    server.use(mockGet("/governance/policies", [policy], paginatedMeta));

    const { result } = renderHook(() => usePolicies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("usePolicy", () => {
  it("fetches a single policy", async () => {
    const policy = { id: "pol-1", title: "Security Policy" };
    server.use(mockGet("/governance/policies/pol-1", policy));

    const { result } = renderHook(() => usePolicy("pol-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(policy);
  });
});

describe("usePolicyVersions", () => {
  it("fetches policy versions", async () => {
    const versions = [{ version: 1 }, { version: 2 }];
    server.use(mockGet("/governance/policies/pol-1/versions", versions));

    const { result } = renderHook(() => usePolicyVersions("pol-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(versions);
  });
});

describe("usePolicyDiff", () => {
  it("fetches diff between two policy versions", async () => {
    const diff = { additions: 5, deletions: 2 };
    server.use(mockGet("/governance/policies/pol-1/diff", diff));

    const { result } = renderHook(() => usePolicyDiff("pol-1", 1, 2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(diff);
  });
});

describe("useAttestationStatus", () => {
  it("fetches attestation status for a policy", async () => {
    const status = { totalRequired: 50, attested: 45 };
    server.use(mockGet("/governance/policies/pol-1/attestation-status", status));

    const { result } = renderHook(() => useAttestationStatus("pol-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(status);
  });
});

describe("useCreatePolicy", () => {
  it("calls POST /governance/policies", async () => {
    server.use(mockPost("/governance/policies", { id: "pol-2" }));

    const { result } = renderHook(() => useCreatePolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Policy" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdatePolicy", () => {
  it("calls PUT /governance/policies/{id}", async () => {
    server.use(mockPut("/governance/policies/pol-1", { id: "pol-1" }));

    const { result } = renderHook(() => useUpdatePolicy("pol-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSubmitPolicy", () => {
  it("calls POST /governance/policies/{id}/submit", async () => {
    server.use(mockPost("/governance/policies/pol-1/submit"));

    const { result } = renderHook(() => useSubmitPolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pol-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useApprovePolicy", () => {
  it("calls POST /governance/policies/{id}/approve", async () => {
    server.use(mockPost("/governance/policies/pol-1/approve"));

    const { result } = renderHook(() => useApprovePolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pol-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePublishPolicy", () => {
  it("calls POST /governance/policies/{id}/publish", async () => {
    server.use(mockPost("/governance/policies/pol-1/publish"));

    const { result } = renderHook(() => usePublishPolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pol-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRetirePolicy", () => {
  it("calls POST /governance/policies/{id}/retire", async () => {
    server.use(mockPost("/governance/policies/pol-1/retire"));

    const { result } = renderHook(() => useRetirePolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pol-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLaunchCampaign", () => {
  it("calls POST /governance/policies/{id}/launch-campaign", async () => {
    server.use(mockPost("/governance/policies/pol-1/attestation-campaigns"));

    const { result } = renderHook(() => useLaunchCampaign("pol-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ deadline: "2026-04-01" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAttestPolicy", () => {
  it("calls POST /governance/policies/{id}/attest", async () => {
    server.use(mockPost("/governance/attestations/att-1/attest"));

    const { result } = renderHook(() => useAttestPolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("att-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  RACI                                                               */
/* ================================================================== */

describe("useRACIMatrices", () => {
  it("fetches paginated RACI matrices", async () => {
    const matrix = { id: "raci-1", name: "IT Operations" };
    server.use(mockGet("/governance/raci", [matrix], paginatedMeta));

    const { result } = renderHook(() => useRACIMatrices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useRACIMatrix", () => {
  it("fetches a single RACI matrix", async () => {
    const matrix = { id: "raci-1", name: "IT Operations" };
    server.use(mockGet("/governance/raci/raci-1", matrix));

    const { result } = renderHook(() => useRACIMatrix("raci-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(matrix);
  });
});

describe("useCreateRACIMatrix", () => {
  it("calls POST /governance/raci", async () => {
    server.use(mockPost("/governance/raci", { id: "raci-2" }));

    const { result } = renderHook(() => useCreateRACIMatrix(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Matrix" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateRACIMatrix", () => {
  it("calls PUT /governance/raci/{id}", async () => {
    server.use(mockPut("/governance/raci/raci-1", { id: "raci-1" }));

    const { result } = renderHook(() => useUpdateRACIMatrix("raci-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteRACIMatrix", () => {
  it("calls DELETE /governance/raci/{id}", async () => {
    server.use(mockDelete("/governance/raci/raci-1"));

    const { result } = renderHook(() => useDeleteRACIMatrix(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("raci-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAddRACIEntry", () => {
  it("calls POST /governance/raci/{id}/entries", async () => {
    server.use(mockPost("/governance/raci/raci-1/entries", { id: "re-1" }));

    const { result } = renderHook(() => useAddRACIEntry("raci-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ activity: "Deploy", userId: "u-1", role: "R" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateRACIEntry", () => {
  it("calls PUT /governance/raci/{matrixId}/entries/{entryId}", async () => {
    server.use(mockPut("/governance/raci/entries/re-1", { id: "re-1" }));

    const { result } = renderHook(() => useUpdateRACIEntry(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ entryId: "re-1", body: { role: "A" } } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteRACIEntry", () => {
  it("calls DELETE /governance/raci/{matrixId}/entries/{entryId}", async () => {
    server.use(mockDelete("/governance/raci/entries/re-1"));

    const { result } = renderHook(() => useDeleteRACIEntry(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("re-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Meetings                                                           */
/* ================================================================== */

describe("useMeetings", () => {
  it("fetches paginated meetings", async () => {
    const meeting = { id: "m-1", title: "Sprint Review" };
    server.use(mockGet("/governance/meetings", [meeting], paginatedMeta));

    const { result } = renderHook(() => useMeetings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useMeeting", () => {
  it("fetches a single meeting", async () => {
    const meeting = { id: "m-1", title: "Sprint Review" };
    server.use(mockGet("/governance/meetings/m-1", meeting));

    const { result } = renderHook(() => useMeeting("m-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(meeting);
  });
});

describe("useMeetingDecisions", () => {
  it("fetches meeting decisions", async () => {
    const decisions = [{ id: "dec-1", text: "Approved" }];
    server.use(mockGet("/governance/meetings/m-1/decisions", decisions));

    const { result } = renderHook(() => useMeetingDecisions("m-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(decisions);
  });
});

describe("useCreateMeeting", () => {
  it("calls POST /governance/meetings", async () => {
    server.use(mockPost("/governance/meetings", { id: "m-2" }));

    const { result } = renderHook(() => useCreateMeeting(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Meeting" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateMeeting", () => {
  it("calls PUT /governance/meetings/{id}", async () => {
    server.use(mockPut("/governance/meetings/m-1", { id: "m-1" }));

    const { result } = renderHook(() => useUpdateMeeting("m-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateDecision", () => {
  it("calls POST /governance/meetings/{id}/decisions", async () => {
    server.use(mockPost("/governance/meetings/m-1/decisions", { id: "dec-2" }));

    const { result } = renderHook(() => useCreateDecision("m-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ text: "New Decision" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Action Items                                                       */
/* ================================================================== */

describe("useActionItems", () => {
  it("fetches paginated action items", async () => {
    const item = { id: "ai-1", title: "Follow up" };
    server.use(mockGet("/governance/meetings/actions", [item], paginatedMeta));

    const { result } = renderHook(() => useActionItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useOverdueActions", () => {
  it("fetches overdue actions", async () => {
    const items = [{ id: "ai-1", isOverdue: true }];
    server.use(mockGet("/governance/meetings/actions/overdue", items));

    const { result } = renderHook(() => useOverdueActions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
  });
});

describe("useCreateActionItem", () => {
  it("calls POST /governance/meetings/actions", async () => {
    server.use(mockPost("/governance/meetings/actions", { id: "ai-2" }));

    const { result } = renderHook(() => useCreateActionItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Action" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateActionItem", () => {
  it("calls PUT /governance/meetings/actions/{id}", async () => {
    server.use(mockPut("/governance/meetings/actions/ai-1", { id: "ai-1" }));

    const { result } = renderHook(() => useUpdateActionItem("ai-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCompleteAction", () => {
  it("calls POST /governance/meetings/actions/{id}/complete", async () => {
    server.use(mockPost("/governance/meetings/actions/ai-1/complete"));

    const { result } = renderHook(() => useCompleteAction(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ai-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  OKRs                                                               */
/* ================================================================== */

describe("useOKRs", () => {
  it("fetches paginated OKRs", async () => {
    const okr = { id: "okr-1", objective: "Increase uptime" };
    server.use(mockGet("/governance/okrs", [okr], paginatedMeta));

    const { result } = renderHook(() => useOKRs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useOKR", () => {
  it("fetches a single OKR", async () => {
    const okr = { id: "okr-1", objective: "Increase uptime" };
    server.use(mockGet("/governance/okrs/okr-1", okr));

    const { result } = renderHook(() => useOKR("okr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(okr);
  });
});

describe("useOKRTree", () => {
  it("fetches OKR tree", async () => {
    const tree = { id: "okr-1", children: [] };
    server.use(mockGet("/governance/okrs/okr-1/tree", tree));

    const { result } = renderHook(() => useOKRTree("okr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tree);
  });
});

describe("useCreateOKR", () => {
  it("calls POST /governance/okrs", async () => {
    server.use(mockPost("/governance/okrs", { id: "okr-2" }));

    const { result } = renderHook(() => useCreateOKR(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ objective: "New OKR" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateOKR", () => {
  it("calls PUT /governance/okrs/{id}", async () => {
    server.use(mockPut("/governance/okrs/okr-1", { id: "okr-1" }));

    const { result } = renderHook(() => useUpdateOKR("okr-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ objective: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateKeyResult", () => {
  it("calls POST /governance/okrs/{id}/key-results", async () => {
    server.use(mockPost("/governance/okrs/okr-1/key-results", { id: "kr-1" }));

    const { result } = renderHook(() => useCreateKeyResult("okr-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Reduce latency" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateKeyResult", () => {
  it("calls PUT /governance/okrs/{okrId}/key-results/{krId}", async () => {
    server.use(mockPut("/governance/key-results/kr-1", { id: "kr-1" }));

    const { result } = renderHook(() => useUpdateKeyResult(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "kr-1", body: { progress: 50 } } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteKeyResult", () => {
  it("calls DELETE /governance/okrs/{okrId}/key-results/{krId}", async () => {
    server.use(mockDelete("/governance/key-results/kr-1"));

    const { result } = renderHook(() => useDeleteKeyResult(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("kr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  KPIs                                                               */
/* ================================================================== */

describe("useKPIs", () => {
  it("fetches paginated KPIs", async () => {
    const kpi = { id: "kpi-1", name: "SLA Achievement" };
    server.use(mockGet("/governance/kpis", [kpi], paginatedMeta));

    const { result } = renderHook(() => useKPIs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateKPI", () => {
  it("calls POST /governance/kpis", async () => {
    server.use(mockPost("/governance/kpis", { id: "kpi-2" }));

    const { result } = renderHook(() => useCreateKPI(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New KPI" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateKPI", () => {
  it("calls PUT /governance/kpis/{id}", async () => {
    server.use(mockPut("/governance/kpis/kpi-1", { id: "kpi-1" }));

    const { result } = renderHook(() => useUpdateKPI("kpi-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteKPI", () => {
  it("calls DELETE /governance/kpis/{id}", async () => {
    server.use(mockDelete("/governance/kpis/kpi-1"));

    const { result } = renderHook(() => useDeleteKPI(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("kpi-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Coverage Reports & Stats                                           */
/* ================================================================== */

describe("useRACICoverageReport", () => {
  it("fetches coverage report for a matrix", async () => {
    const report = { coverage: 85, gaps: [] };
    server.use(mockGet("/governance/raci/raci-1/coverage", report));

    const { result } = renderHook(() => useRACICoverageReport("raci-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(report);
  });
});

describe("useRACICoverageSummary", () => {
  it("fetches RACI coverage summary", async () => {
    const summary = { totalMatrices: 5, avgCoverage: 90 };
    server.use(mockGet("/governance/raci/coverage-summary", summary));

    const { result } = renderHook(() => useRACICoverageSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});

describe("useOverdueActionStats", () => {
  it("fetches overdue action stats", async () => {
    const stats = { total: 10, critical: 3 };
    server.use(mockGet("/governance/meetings/actions/overdue/stats", stats));

    const { result } = renderHook(() => useOverdueActionStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useMyOverdueActions", () => {
  it("fetches my overdue actions", async () => {
    const items = [{ id: "ai-1" }];
    server.use(mockGet("/governance/meetings/actions/overdue/mine", items));

    const { result } = renderHook(() => useMyOverdueActions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
  });
});

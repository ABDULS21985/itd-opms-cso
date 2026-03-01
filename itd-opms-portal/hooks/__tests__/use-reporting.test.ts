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
  useExecutiveSummary,
  useMyDashboard,
  useTicketsByPriority,
  useTicketsByStatus,
  useProjectsByStatus,
  useAssetsByType,
  useAssetsByStatus,
  useSLACompliance,
  useProjectsByRAG,
  useProjectsByPriority,
  useRisksByCategory,
  useWorkItemsByStatus,
  useOfficeAnalytics,
  useProjectsByOffice,
  useProjectDivisionAssignments,
  useDivisionAssignmentHistory,
  useAssignProjectDivision,
  useUnassignProjectDivision,
  useReassignProjectDivision,
  useReportDefinitions,
  useReportDefinition,
  useCreateReportDefinition,
  useUpdateReportDefinition,
  useDeleteReportDefinition,
  useTriggerReportRun,
  useGenerateExecutivePack,
  useReportRuns,
  useGlobalSearch,
  useRecentSearches,
  useSavedSearches,
  useSaveSearch,
  useDeleteSavedSearch,
} from "@/hooks/use-reporting";

/* ================================================================== */
/*  Dashboard Charts                                                   */
/* ================================================================== */

describe("useExecutiveSummary", () => {
  it("fetches executive summary", async () => {
    const summary = { totalProjects: 10, openTickets: 30 };
    server.use(mockGet("/reporting/dashboards/executive", summary));

    const { result } = renderHook(() => useExecutiveSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});

describe("useMyDashboard", () => {
  it("fetches my dashboard data", async () => {
    const data = { myTickets: 5, myProjects: 3 };
    server.use(mockGet("/reporting/dashboards/my", data));

    const { result } = renderHook(() => useMyDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useTicketsByPriority", () => {
  it("fetches tickets by priority chart data", async () => {
    const data = [{ priority: "high", count: 10 }];
    server.use(mockGet("/reporting/dashboards/charts/tickets-by-priority", data));

    const { result } = renderHook(() => useTicketsByPriority(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useTicketsByStatus", () => {
  it("fetches tickets by status chart data", async () => {
    const data = [{ status: "open", count: 20 }];
    server.use(mockGet("/reporting/dashboards/charts/tickets-by-status", data));

    const { result } = renderHook(() => useTicketsByStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useProjectsByStatus", () => {
  it("fetches projects by status chart data", async () => {
    const data = [{ status: "active", count: 5 }];
    server.use(mockGet("/reporting/dashboards/charts/projects-by-status", data));

    const { result } = renderHook(() => useProjectsByStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useAssetsByType", () => {
  it("fetches assets by type chart data", async () => {
    const data = [{ type: "server", count: 50 }];
    server.use(mockGet("/reporting/dashboards/charts/assets-by-type", data));

    const { result } = renderHook(() => useAssetsByType(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useAssetsByStatus", () => {
  it("fetches assets by status chart data", async () => {
    const data = [{ status: "active", count: 100 }];
    server.use(mockGet("/reporting/dashboards/charts/assets-by-status", data));

    const { result } = renderHook(() => useAssetsByStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useSLACompliance", () => {
  it("fetches SLA compliance chart data", async () => {
    const data = { compliant: 95, breached: 5 };
    server.use(mockGet("/reporting/dashboards/charts/sla-compliance", data));

    const { result } = renderHook(() => useSLACompliance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useProjectsByRAG", () => {
  it("fetches projects by RAG status", async () => {
    const data = [{ rag: "green", count: 8 }];
    server.use(mockGet("/reporting/dashboards/charts/projects-by-rag", data));

    const { result } = renderHook(() => useProjectsByRAG(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useProjectsByPriority", () => {
  it("fetches projects by priority", async () => {
    const data = [{ priority: "high", count: 3 }];
    server.use(mockGet("/reporting/dashboards/charts/projects-by-priority", data));

    const { result } = renderHook(() => useProjectsByPriority(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useRisksByCategory", () => {
  it("fetches risks by category", async () => {
    const data = [{ category: "security", count: 5 }];
    server.use(mockGet("/reporting/dashboards/charts/risks-by-category", data));

    const { result } = renderHook(() => useRisksByCategory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useWorkItemsByStatus", () => {
  it("fetches work items by status", async () => {
    const data = [{ status: "in_progress", count: 15 }];
    server.use(mockGet("/reporting/dashboards/charts/work-items-by-status", data));

    const { result } = renderHook(() => useWorkItemsByStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

/* ================================================================== */
/*  Office Analytics                                                   */
/* ================================================================== */

describe("useOfficeAnalytics", () => {
  it("fetches office analytics", async () => {
    const analytics = { offices: [] };
    server.use(mockGet("/reporting/dashboards/charts/office-analytics", analytics));

    const { result } = renderHook(() => useOfficeAnalytics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(analytics);
  });
});

describe("useProjectsByOffice", () => {
  it("fetches projects by office", async () => {
    const data = [{ office: "HQ", count: 10 }];
    server.use(mockGet("/reporting/dashboards/charts/projects-by-office", data));

    const { result } = renderHook(() => useProjectsByOffice(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

/* ================================================================== */
/*  Division Assignments                                               */
/* ================================================================== */

describe("useProjectDivisionAssignments", () => {
  it("fetches division assignments for a project", async () => {
    const assignments = [{ id: "da-1", divisionId: "d-1" }];
    server.use(mockGet("/planning/projects/p-1/divisions", assignments));

    const { result } = renderHook(() => useProjectDivisionAssignments("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(assignments);
  });
});

describe("useDivisionAssignmentHistory", () => {
  it("fetches division assignment history", async () => {
    const history = [{ id: "dah-1", action: "assigned" }];
    server.use(mockGet("/planning/projects/p-1/divisions/history", history));

    const { result } = renderHook(() => useDivisionAssignmentHistory("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(history);
  });
});

describe("useAssignProjectDivision", () => {
  it("calls POST /reporting/projects/{id}/divisions", async () => {
    server.use(mockPost("/planning/projects/p-1/divisions", { id: "da-2" }));

    const { result } = renderHook(() => useAssignProjectDivision("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ divisionId: "d-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUnassignProjectDivision", () => {
  it("calls DELETE /reporting/projects/{id}/divisions/{divisionId}", async () => {
    server.use(mockDelete("/planning/projects/p-1/divisions/d-1"));

    const { result } = renderHook(() => useUnassignProjectDivision("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("d-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReassignProjectDivision", () => {
  it("calls POST /planning/projects/{id}/divisions/reassign", async () => {
    server.use(mockPost("/planning/projects/p-1/divisions/reassign", {}));

    const { result } = renderHook(() => useReassignProjectDivision("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ fromDivisionId: "d-1", toDivisionId: "d-2" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Reports                                                            */
/* ================================================================== */

describe("useReportDefinitions", () => {
  it("fetches paginated report definitions", async () => {
    const report = { id: "rep-1", name: "Monthly" };
    server.use(mockGet("/reporting/reports", [report], paginatedMeta));

    const { result } = renderHook(() => useReportDefinitions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useReportDefinition", () => {
  it("fetches a single report definition", async () => {
    const report = { id: "rep-1", name: "Monthly" };
    server.use(mockGet("/reporting/reports/rep-1", report));

    const { result } = renderHook(() => useReportDefinition("rep-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(report);
  });
});

describe("useCreateReportDefinition", () => {
  it("calls POST /reporting/reports", async () => {
    server.use(mockPost("/reporting/reports", { id: "rep-2" }));

    const { result } = renderHook(() => useCreateReportDefinition(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Weekly" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateReportDefinition", () => {
  it("calls PUT /reporting/reports/{id}", async () => {
    server.use(mockPut("/reporting/reports/rep-1", { id: "rep-1" }));

    const { result } = renderHook(() => useUpdateReportDefinition("rep-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteReportDefinition", () => {
  it("calls DELETE /reporting/reports/{id}", async () => {
    server.use(mockDelete("/reporting/reports/rep-1"));

    const { result } = renderHook(() => useDeleteReportDefinition(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("rep-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useTriggerReportRun", () => {
  it("calls POST /reporting/reports/{id}/run", async () => {
    server.use(mockPost("/reporting/reports/rep-1/run", { runId: "run-1" }));

    const { result } = renderHook(() => useTriggerReportRun("rep-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useGenerateExecutivePack", () => {
  it("calls POST /reporting/reports/executive-pack", async () => {
    server.use(mockPost("/reporting/reports/executive-pack/generate", { url: "/download/pack.pdf" }));

    const { result } = renderHook(() => useGenerateExecutivePack(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({} as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReportRuns", () => {
  it("fetches paginated report runs", async () => {
    const run = { id: "run-1", status: "completed" };
    server.use(mockGet("/reporting/reports/rep-1/runs", [run], paginatedMeta));

    const { result } = renderHook(() => useReportRuns("rep-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

/* ================================================================== */
/*  Search                                                             */
/* ================================================================== */

describe("useGlobalSearch", () => {
  it("fetches global search results when query has content", async () => {
    const results = [{ type: "project", id: "p-1" }];
    server.use(mockGet("/reporting/search", results));

    const { result } = renderHook(() => useGlobalSearch("server"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(results);
  });

  it("does not search when query is empty", () => {
    const { result } = renderHook(() => useGlobalSearch(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useRecentSearches", () => {
  it("fetches recent searches", async () => {
    const searches = [{ query: "server", timestamp: "2026-01-01" }];
    server.use(mockGet("/reporting/search/saved/recent", searches));

    const { result } = renderHook(() => useRecentSearches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(searches);
  });
});

describe("useSavedSearches", () => {
  it("fetches saved searches", async () => {
    const searches = [{ id: "ss-1", name: "My Search" }];
    server.use(mockGet("/reporting/search/saved", searches));

    const { result } = renderHook(() => useSavedSearches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(searches);
  });
});

describe("useSaveSearch", () => {
  it("calls POST /reporting/search/saved", async () => {
    server.use(mockPost("/reporting/search/saved", { id: "ss-2" }));

    const { result } = renderHook(() => useSaveSearch(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Search", query: "test" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSavedSearch", () => {
  it("calls DELETE /reporting/search/saved/{id}", async () => {
    server.use(mockDelete("/reporting/search/saved/ss-1"));

    const { result } = renderHook(() => useDeleteSavedSearch(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ss-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

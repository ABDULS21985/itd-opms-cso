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
  usePortfolios,
  usePortfolio,
  usePortfolioRoadmap,
  usePortfolioAnalytics,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
  useProjects,
  useProject,
  useProjectDependencies,
  useProjectStakeholders,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useApproveProject,
  useAddProjectDependency,
  useRemoveProjectDependency,
  useAddProjectStakeholder,
  useRemoveProjectStakeholder,
  useWorkItems,
  useWorkItem,
  useWBSTree,
  useOverdueWorkItems,
  useWorkItemStatusCounts,
  useTimeEntries,
  useCreateWorkItem,
  useUpdateWorkItem,
  useTransitionWorkItem,
  useDeleteWorkItem,
  useLogTimeEntry,
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useRisks,
  useRisk,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useIssues,
  useIssue,
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
  useEscalateIssue,
  useChangeRequests,
  useChangeRequest,
  useCreateChangeRequest,
  useUpdateChangeRequest,
  useUpdateChangeRequestStatus,
  useDeleteChangeRequest,
  useProjectTimeline,
  usePortfolioTimeline,
  usePIRs,
  usePIR,
  usePIRStats,
  usePIRTemplates,
  useCreatePIR,
  useUpdatePIR,
  useCompletePIR,
  useDeletePIR,
  useProjectDocuments,
  useProjectDocumentCategories,
  useDeleteProjectDocument,
  useBulkUpdateWorkItems,
} from "@/hooks/use-planning";

/* ================================================================== */
/*  Portfolios                                                         */
/* ================================================================== */

describe("usePortfolios", () => {
  it("fetches paginated portfolios", async () => {
    const portfolio = { id: "pf-1", name: "IT Portfolio" };
    server.use(mockGet("/planning/portfolios", [portfolio], paginatedMeta));

    const { result } = renderHook(() => usePortfolios(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("usePortfolio", () => {
  it("fetches a single portfolio", async () => {
    const portfolio = { id: "pf-1", name: "IT Portfolio" };
    server.use(mockGet("/planning/portfolios/pf-1", portfolio));

    const { result } = renderHook(() => usePortfolio("pf-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(portfolio);
  });

  it("does not fetch when id is undefined", () => {
    const { result } = renderHook(() => usePortfolio(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePortfolioRoadmap", () => {
  it("fetches portfolio roadmap projects", async () => {
    const projects = [{ id: "p-1", name: "Project A" }];
    server.use(mockGet("/planning/portfolios/pf-1/roadmap", projects));

    const { result } = renderHook(() => usePortfolioRoadmap("pf-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(projects);
  });
});

describe("usePortfolioAnalytics", () => {
  it("fetches portfolio analytics", async () => {
    const analytics = { totalProjects: 5, onTrack: 3 };
    server.use(mockGet("/planning/portfolios/pf-1/analytics", analytics));

    const { result } = renderHook(() => usePortfolioAnalytics("pf-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(analytics);
  });
});

describe("useCreatePortfolio", () => {
  it("calls POST /planning/portfolios", async () => {
    server.use(mockPost("/planning/portfolios", { id: "pf-2" }));

    const { result } = renderHook(() => useCreatePortfolio(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Portfolio" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdatePortfolio", () => {
  it("calls PUT /planning/portfolios/{id}", async () => {
    server.use(mockPut("/planning/portfolios/pf-1", { id: "pf-1" }));

    const { result } = renderHook(() => useUpdatePortfolio("pf-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeletePortfolio", () => {
  it("calls DELETE /planning/portfolios/{id}", async () => {
    server.use(mockDelete("/planning/portfolios/pf-1"));

    const { result } = renderHook(() => useDeletePortfolio(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pf-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Projects                                                           */
/* ================================================================== */

describe("useProjects", () => {
  it("fetches paginated projects", async () => {
    const project = { id: "p-1", name: "Project A" };
    server.use(mockGet("/planning/projects", [project], paginatedMeta));

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useProject", () => {
  it("fetches a single project", async () => {
    const project = { id: "p-1", name: "Project A" };
    server.use(mockGet("/planning/projects/p-1", project));

    const { result } = renderHook(() => useProject("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(project);
  });
});

describe("useProjectDependencies", () => {
  it("fetches project dependencies", async () => {
    const deps = [{ id: "dep-1" }];
    server.use(mockGet("/planning/projects/p-1/dependencies", deps));

    const { result } = renderHook(() => useProjectDependencies("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deps);
  });
});

describe("useProjectStakeholders", () => {
  it("fetches project stakeholders", async () => {
    const stakeholders = [{ id: "sh-1", name: "John" }];
    server.use(mockGet("/planning/projects/p-1/stakeholders", stakeholders));

    const { result } = renderHook(() => useProjectStakeholders("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stakeholders);
  });
});

describe("useCreateProject", () => {
  it("calls POST /planning/projects", async () => {
    server.use(mockPost("/planning/projects", { id: "p-2" }));

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Project" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateProject", () => {
  it("calls PUT /planning/projects/{id}", async () => {
    server.use(mockPut("/planning/projects/p-1", { id: "p-1" }));

    const { result } = renderHook(() => useUpdateProject("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteProject", () => {
  it("calls DELETE /planning/projects/{id}", async () => {
    server.use(mockDelete("/planning/projects/p-1"));

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("p-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useApproveProject", () => {
  it("calls POST /planning/projects/{id}/approve", async () => {
    server.use(mockPost("/planning/projects/p-1/approve"));

    const { result } = renderHook(() => useApproveProject(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("p-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAddProjectDependency", () => {
  it("calls POST /planning/projects/{id}/dependencies", async () => {
    server.use(mockPost("/planning/projects/p-1/dependencies", { id: "dep-2" }));

    const { result } = renderHook(() => useAddProjectDependency("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ dependsOnProjectId: "p-2" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRemoveProjectDependency", () => {
  it("calls DELETE /planning/projects/{id}/dependencies/{depId}", async () => {
    server.use(mockDelete("/planning/projects/p-1/dependencies/dep-1"));

    const { result } = renderHook(() => useRemoveProjectDependency("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("dep-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAddProjectStakeholder", () => {
  it("calls POST /planning/projects/{id}/stakeholders", async () => {
    server.use(mockPost("/planning/projects/p-1/stakeholders", { id: "sh-2" }));

    const { result } = renderHook(() => useAddProjectStakeholder("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: "u-1", role: "sponsor" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRemoveProjectStakeholder", () => {
  it("calls DELETE /planning/projects/{id}/stakeholders/{shId}", async () => {
    server.use(mockDelete("/planning/projects/p-1/stakeholders/sh-1"));

    const { result } = renderHook(() => useRemoveProjectStakeholder("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("sh-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Work Items                                                         */
/* ================================================================== */

describe("useWorkItems", () => {
  it("fetches paginated work items", async () => {
    const item = { id: "wi-1", title: "Task 1" };
    server.use(mockGet("/planning/work-items", [item], paginatedMeta));

    const { result } = renderHook(() => useWorkItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useWorkItem", () => {
  it("fetches a single work item", async () => {
    const item = { id: "wi-1", title: "Task 1" };
    server.use(mockGet("/planning/work-items/wi-1", item));

    const { result } = renderHook(() => useWorkItem("wi-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(item);
  });
});

describe("useWBSTree", () => {
  it("fetches WBS tree for a project", async () => {
    const tree = [{ id: "wi-1", children: [] }];
    server.use(mockGet("/planning/work-items/wbs", tree));

    const { result } = renderHook(() => useWBSTree("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tree);
  });
});

describe("useOverdueWorkItems", () => {
  it("fetches overdue work items", async () => {
    const items = [{ id: "wi-1", isOverdue: true }];
    server.use(mockGet("/planning/work-items/overdue", items));

    const { result } = renderHook(() => useOverdueWorkItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
  });
});

describe("useWorkItemStatusCounts", () => {
  it("fetches status counts for a project", async () => {
    const counts = { open: 5, inProgress: 3, done: 2 };
    server.use(mockGet("/planning/work-items/status-counts", counts));

    const { result } = renderHook(() => useWorkItemStatusCounts("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(counts);
  });
});

describe("useTimeEntries", () => {
  it("fetches time entries for a work item", async () => {
    const entries = [{ id: "te-1", hours: 2 }];
    server.use(mockGet("/planning/work-items/wi-1/time-entries", entries));

    const { result } = renderHook(() => useTimeEntries("wi-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(entries);
  });
});

describe("useCreateWorkItem", () => {
  it("calls POST /planning/work-items", async () => {
    server.use(mockPost("/planning/work-items", { id: "wi-2" }));

    const { result } = renderHook(() => useCreateWorkItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Task" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateWorkItem", () => {
  it("calls PUT /planning/work-items/{id}", async () => {
    server.use(mockPut("/planning/work-items/wi-1", { id: "wi-1" }));

    const { result } = renderHook(() => useUpdateWorkItem("wi-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useTransitionWorkItem", () => {
  it("calls PUT /planning/work-items/{id}/transition", async () => {
    server.use(mockPut("/planning/work-items/wi-1/transition", {}));

    const { result } = renderHook(() => useTransitionWorkItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "wi-1", status: "done" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteWorkItem", () => {
  it("calls DELETE /planning/work-items/{id}", async () => {
    server.use(mockDelete("/planning/work-items/wi-1"));

    const { result } = renderHook(() => useDeleteWorkItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("wi-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLogTimeEntry", () => {
  it("calls POST /planning/work-items/{id}/time-entries", async () => {
    server.use(mockPost("/planning/work-items/wi-1/time-entries", { id: "te-2" }));

    const { result } = renderHook(() => useLogTimeEntry("wi-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ hours: 3, description: "coding" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Milestones                                                         */
/* ================================================================== */

describe("useMilestones", () => {
  it("fetches milestones", async () => {
    const milestones = [{ id: "ms-1", name: "Phase 1" }];
    server.use(mockGet("/planning/milestones", milestones));

    const { result } = renderHook(() => useMilestones(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(milestones);
  });
});

describe("useCreateMilestone", () => {
  it("calls POST /planning/milestones", async () => {
    server.use(mockPost("/planning/milestones", { id: "ms-2" }));

    const { result } = renderHook(() => useCreateMilestone(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Phase 2" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateMilestone", () => {
  it("calls PUT /planning/milestones/{id}", async () => {
    server.use(mockPut("/planning/milestones/ms-1", { id: "ms-1" }));

    const { result } = renderHook(() => useUpdateMilestone("ms-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteMilestone", () => {
  it("calls DELETE /planning/milestones/{id}", async () => {
    server.use(mockDelete("/planning/milestones/ms-1"));

    const { result } = renderHook(() => useDeleteMilestone(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ms-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Risks (Planning)                                                   */
/* ================================================================== */

describe("useRisks (planning)", () => {
  it("fetches paginated risks", async () => {
    const risk = { id: "r-1", title: "Risk 1" };
    server.use(mockGet("/planning/risks", [risk], paginatedMeta));

    const { result } = renderHook(() => useRisks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useRisk (planning)", () => {
  it("fetches a single risk", async () => {
    const risk = { id: "r-1", title: "Risk 1" };
    server.use(mockGet("/planning/risks/r-1", risk));

    const { result } = renderHook(() => useRisk("r-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(risk);
  });
});

describe("useCreateRisk (planning)", () => {
  it("calls POST /planning/risks", async () => {
    server.use(mockPost("/planning/risks", { id: "r-2" }));

    const { result } = renderHook(() => useCreateRisk(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Risk" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateRisk (planning)", () => {
  it("calls PUT /planning/risks/{id}", async () => {
    server.use(mockPut("/planning/risks/r-1", { id: "r-1" }));

    const { result } = renderHook(() => useUpdateRisk("r-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteRisk (planning)", () => {
  it("calls DELETE /planning/risks/{id}", async () => {
    server.use(mockDelete("/planning/risks/r-1"));

    const { result } = renderHook(() => useDeleteRisk(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("r-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Issues                                                             */
/* ================================================================== */

describe("useIssues", () => {
  it("fetches paginated issues", async () => {
    const issue = { id: "iss-1", title: "Issue 1" };
    server.use(mockGet("/planning/issues", [issue], paginatedMeta));

    const { result } = renderHook(() => useIssues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useIssue", () => {
  it("fetches a single issue", async () => {
    const issue = { id: "iss-1", title: "Issue 1" };
    server.use(mockGet("/planning/issues/iss-1", issue));

    const { result } = renderHook(() => useIssue("iss-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(issue);
  });
});

describe("useCreateIssue", () => {
  it("calls POST /planning/issues", async () => {
    server.use(mockPost("/planning/issues", { id: "iss-2" }));

    const { result } = renderHook(() => useCreateIssue(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Issue" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateIssue", () => {
  it("calls PUT /planning/issues/{id}", async () => {
    server.use(mockPut("/planning/issues/iss-1", { id: "iss-1" }));

    const { result } = renderHook(() => useUpdateIssue("iss-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteIssue", () => {
  it("calls DELETE /planning/issues/{id}", async () => {
    server.use(mockDelete("/planning/issues/iss-1"));

    const { result } = renderHook(() => useDeleteIssue(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("iss-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useEscalateIssue", () => {
  it("calls PUT /planning/issues/{id}/escalate", async () => {
    server.use(mockPut("/planning/issues/iss-1/escalate", {}));

    const { result } = renderHook(() => useEscalateIssue(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "iss-1", escalatedToId: "u-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Change Requests                                                    */
/* ================================================================== */

describe("useChangeRequests", () => {
  it("fetches paginated change requests", async () => {
    const cr = { id: "cr-1", title: "CR 1" };
    server.use(mockGet("/planning/change-requests", [cr], paginatedMeta));

    const { result } = renderHook(() => useChangeRequests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useChangeRequest", () => {
  it("fetches a single change request", async () => {
    const cr = { id: "cr-1", title: "CR 1" };
    server.use(mockGet("/planning/change-requests/cr-1", cr));

    const { result } = renderHook(() => useChangeRequest("cr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(cr);
  });
});

describe("useCreateChangeRequest", () => {
  it("calls POST /planning/change-requests", async () => {
    server.use(mockPost("/planning/change-requests", { id: "cr-2" }));

    const { result } = renderHook(() => useCreateChangeRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New CR" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateChangeRequest", () => {
  it("calls PUT /planning/change-requests/{id}", async () => {
    server.use(mockPut("/planning/change-requests/cr-1", { id: "cr-1" }));

    const { result } = renderHook(() => useUpdateChangeRequest("cr-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateChangeRequestStatus", () => {
  it("calls PUT /planning/change-requests/{id}/status", async () => {
    server.use(mockPut("/planning/change-requests/cr-1/status", {}));

    const { result } = renderHook(() => useUpdateChangeRequestStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "cr-1", status: "approved" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteChangeRequest", () => {
  it("calls DELETE /planning/change-requests/{id}", async () => {
    server.use(mockDelete("/planning/change-requests/cr-1"));

    const { result } = renderHook(() => useDeleteChangeRequest(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("cr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Timelines                                                          */
/* ================================================================== */

describe("useProjectTimeline", () => {
  it("fetches project timeline", async () => {
    const timeline = { milestones: [], workItems: [] };
    server.use(mockGet("/planning/projects/p-1/timeline", timeline));

    const { result } = renderHook(() => useProjectTimeline("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(timeline);
  });
});

describe("usePortfolioTimeline", () => {
  it("fetches portfolio timeline", async () => {
    const timeline = [{ id: "p-1", startDate: "2026-01-01" }];
    server.use(mockGet("/planning/portfolios/pf-1/timeline", timeline));

    const { result } = renderHook(() => usePortfolioTimeline("pf-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(timeline);
  });
});

/* ================================================================== */
/*  PIRs                                                               */
/* ================================================================== */

describe("usePIRs", () => {
  it("fetches paginated PIRs", async () => {
    const pir = { id: "pir-1", title: "PIR 1" };
    server.use(mockGet("/planning/pir", [pir], paginatedMeta));

    const { result } = renderHook(() => usePIRs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("usePIR", () => {
  it("fetches a single PIR", async () => {
    const pir = { id: "pir-1", title: "PIR 1" };
    server.use(mockGet("/planning/pir/pir-1", pir));

    const { result } = renderHook(() => usePIR("pir-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(pir);
  });
});

describe("usePIRStats", () => {
  it("fetches PIR statistics", async () => {
    const stats = { totalPIRs: 10, completed: 8 };
    server.use(mockGet("/planning/pir/stats", stats));

    const { result } = renderHook(() => usePIRStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("usePIRTemplates", () => {
  it("fetches PIR templates", async () => {
    const templates = [{ id: "pt-1", name: "Default" }];
    server.use(mockGet("/planning/pir/templates", templates));

    const { result } = renderHook(() => usePIRTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(templates);
  });
});

describe("useCreatePIR", () => {
  it("calls POST /planning/pirs", async () => {
    server.use(mockPost("/planning/pir", { id: "pir-2" }));

    const { result } = renderHook(() => useCreatePIR(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New PIR" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdatePIR", () => {
  it("calls PUT /planning/pirs/{id}", async () => {
    server.use(mockPut("/planning/pir/pir-1", { id: "pir-1" }));

    const { result } = renderHook(() => useUpdatePIR("pir-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCompletePIR", () => {
  it("calls POST /planning/pirs/{id}/complete", async () => {
    server.use(mockPost("/planning/pir/pir-1/complete"));

    const { result } = renderHook(() => useCompletePIR(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pir-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeletePIR", () => {
  it("calls DELETE /planning/pirs/{id}", async () => {
    server.use(mockDelete("/planning/pir/pir-1"));

    const { result } = renderHook(() => useDeletePIR(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pir-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Project Documents                                                  */
/* ================================================================== */

describe("useProjectDocuments", () => {
  it("fetches project documents", async () => {
    const docs = [{ id: "doc-1", name: "Spec.pdf" }];
    server.use(mockGet("/planning/projects/p-1/documents", docs, paginatedMeta));

    const { result } = renderHook(() => useProjectDocuments("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useProjectDocumentCategories", () => {
  it("fetches document categories for a project", async () => {
    const cats = [{ category: "spec", count: 2 }];
    server.use(mockGet("/planning/projects/p-1/documents/categories", cats));

    const { result } = renderHook(() => useProjectDocumentCategories("p-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(cats);
  });
});

describe("useDeleteProjectDocument", () => {
  it("calls DELETE /planning/projects/{pid}/documents/{docId}", async () => {
    server.use(mockDelete("/planning/projects/p-1/documents/doc-1"));

    const { result } = renderHook(() => useDeleteProjectDocument("p-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("doc-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Bulk                                                               */
/* ================================================================== */

describe("useBulkUpdateWorkItems", () => {
  it("calls POST /planning/work-items/bulk/update", async () => {
    server.use(mockPost("/planning/work-items/bulk/update", { updated: 3 }));

    const { result } = renderHook(() => useBulkUpdateWorkItems(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ ids: ["wi-1", "wi-2"], status: "done" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

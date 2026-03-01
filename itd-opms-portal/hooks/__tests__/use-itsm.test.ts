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
  useCatalogCategories,
  useCatalogCategory,
  useCreateCatalogCategory,
  useUpdateCatalogCategory,
  useDeleteCatalogCategory,
  useCatalogItems,
  useEntitledCatalogItems,
  useCatalogItem,
  useCreateCatalogItem,
  useUpdateCatalogItem,
  useDeleteCatalogItem,
  useTickets,
  useTicket,
  useTicketStats,
  useMyQueue,
  useTeamQueue,
  useCreateTicket,
  useUpdateTicket,
  useTransitionTicket,
  useAssignTicket,
  useResolveTicket,
  useCloseTicket,
  useDeclareMajorIncident,
  useLinkTickets,
  useTicketComments,
  useAddComment,
  useTicketStatusHistory,
  useSLAPolicies,
  useSLAPolicy,
  useDefaultSLAPolicy,
  useCreateSLAPolicy,
  useUpdateSLAPolicy,
  useDeleteSLAPolicy,
  useSLAComplianceStats,
  useSLABreaches,
  useBusinessHoursCalendars,
  useCreateBusinessHoursCalendar,
  useUpdateBusinessHoursCalendar,
  useDeleteBusinessHoursCalendar,
  useEscalationRules,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useDeleteEscalationRule,
  useProblems,
  useProblem,
  useCreateProblem,
  useUpdateProblem,
  useDeleteProblem,
  useLinkIncidentToProblem,
  useKnownErrors,
  useCreateKnownError,
  useUpdateKnownError,
  useSupportQueues,
  useCreateSupportQueue,
  useUpdateSupportQueue,
  useDeleteSupportQueue,
  useCSATStats,
  useCreateCSATSurvey,
  useBulkUpdateTickets,
} from "@/hooks/use-itsm";

/* ================================================================== */
/*  Catalog Categories                                                 */
/* ================================================================== */

describe("useCatalogCategories", () => {
  it("fetches catalog categories", async () => {
    const cat = { id: "cat-1", name: "Hardware" };
    server.use(mockGet("/itsm/catalog/categories", [cat]));

    const { result } = renderHook(() => useCatalogCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([cat]);
  });
});

describe("useCatalogCategory", () => {
  it("fetches a single catalog category", async () => {
    const cat = { id: "cat-1", name: "Hardware" };
    server.use(mockGet("/itsm/catalog/categories/cat-1", cat));

    const { result } = renderHook(() => useCatalogCategory("cat-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(cat);
  });
});

describe("useCreateCatalogCategory", () => {
  it("calls POST /itsm/catalog/categories", async () => {
    server.use(mockPost("/itsm/catalog/categories", { id: "cat-2" }));

    const { result } = renderHook(() => useCreateCatalogCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Software" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateCatalogCategory", () => {
  it("calls PUT /itsm/catalog/categories/{id}", async () => {
    server.use(mockPut("/itsm/catalog/categories/cat-1", { id: "cat-1" }));

    const { result } = renderHook(() => useUpdateCatalogCategory("cat-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCatalogCategory", () => {
  it("calls DELETE /itsm/catalog/categories/{id}", async () => {
    server.use(mockDelete("/itsm/catalog/categories/cat-1"));

    const { result } = renderHook(() => useDeleteCatalogCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("cat-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Catalog Items                                                      */
/* ================================================================== */

describe("useCatalogItems", () => {
  it("fetches paginated catalog items", async () => {
    const item = { id: "ci-1", name: "Laptop" };
    server.use(mockGet("/itsm/catalog/items", [item], paginatedMeta));

    const { result } = renderHook(() => useCatalogItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useEntitledCatalogItems", () => {
  it("fetches entitled catalog items for the current user", async () => {
    const items = [{ id: "ci-1", name: "Laptop" }];
    server.use(mockGet("/itsm/catalog/items/entitled", items));

    const { result } = renderHook(() => useEntitledCatalogItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(items);
  });
});

describe("useCatalogItem", () => {
  it("fetches a single catalog item", async () => {
    const item = { id: "ci-1", name: "Laptop" };
    server.use(mockGet("/itsm/catalog/items/ci-1", item));

    const { result } = renderHook(() => useCatalogItem("ci-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(item);
  });
});

describe("useCreateCatalogItem", () => {
  it("calls POST /itsm/catalog/items", async () => {
    server.use(mockPost("/itsm/catalog/items", { id: "ci-2" }));

    const { result } = renderHook(() => useCreateCatalogItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Monitor" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateCatalogItem", () => {
  it("calls PUT /itsm/catalog/items/{id}", async () => {
    server.use(mockPut("/itsm/catalog/items/ci-1", { id: "ci-1" }));

    const { result } = renderHook(() => useUpdateCatalogItem("ci-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCatalogItem", () => {
  it("calls DELETE /itsm/catalog/items/{id}", async () => {
    server.use(mockDelete("/itsm/catalog/items/ci-1"));

    const { result } = renderHook(() => useDeleteCatalogItem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ci-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Tickets                                                            */
/* ================================================================== */

describe("useTickets", () => {
  it("fetches paginated tickets", async () => {
    const ticket = { id: "tk-1", subject: "Server down" };
    server.use(mockGet("/itsm/tickets", [ticket], paginatedMeta));

    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useTicket", () => {
  it("fetches a single ticket", async () => {
    const ticket = { id: "tk-1", subject: "Server down" };
    server.use(mockGet("/itsm/tickets/tk-1", ticket));

    const { result } = renderHook(() => useTicket("tk-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ticket);
  });
});

describe("useTicketStats", () => {
  it("fetches ticket statistics", async () => {
    const stats = { totalTickets: 50, open: 20 };
    server.use(mockGet("/itsm/tickets/stats", stats));

    const { result } = renderHook(() => useTicketStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useMyQueue", () => {
  it("fetches my ticket queue", async () => {
    const tickets = [{ id: "tk-1" }];
    server.use(mockGet("/itsm/tickets/my-queue", tickets, paginatedMeta));

    const { result } = renderHook(() => useMyQueue(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useTeamQueue", () => {
  it("fetches team ticket queue", async () => {
    const tickets = [{ id: "tk-1" }];
    server.use(mockGet("/itsm/tickets/team-queue/team-1", tickets, paginatedMeta));

    const { result } = renderHook(() => useTeamQueue("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateTicket", () => {
  it("calls POST /itsm/tickets", async () => {
    server.use(mockPost("/itsm/tickets", { id: "tk-2" }));

    const { result } = renderHook(() => useCreateTicket(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ subject: "New ticket" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateTicket", () => {
  it("calls PUT /itsm/tickets/{id}", async () => {
    server.use(mockPut("/itsm/tickets/tk-1", { id: "tk-1" }));

    const { result } = renderHook(() => useUpdateTicket("tk-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ subject: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useTransitionTicket", () => {
  it("calls POST /itsm/tickets/{id}/transition", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/transition"));

    const { result } = renderHook(() => useTransitionTicket(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "tk-1", status: "closed" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAssignTicket", () => {
  it("calls POST /itsm/tickets/{id}/assign", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/assign"));

    const { result } = renderHook(() => useAssignTicket(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "tk-1", assigneeId: "u-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useResolveTicket", () => {
  it("calls POST /itsm/tickets/{id}/resolve", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/resolve"));

    const { result } = renderHook(() => useResolveTicket(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "tk-1", resolution: "Fixed" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCloseTicket", () => {
  it("calls POST /itsm/tickets/{id}/close", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/close"));

    const { result } = renderHook(() => useCloseTicket(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("tk-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeclareMajorIncident", () => {
  it("calls POST /itsm/tickets/{id}/major-incident", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/major-incident"));

    const { result } = renderHook(() => useDeclareMajorIncident(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("tk-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLinkTickets", () => {
  it("calls POST /itsm/tickets/{id}/link", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/link"));

    const { result } = renderHook(() => useLinkTickets(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "tk-1", relatedTicketId: "tk-2" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Ticket Comments & History                                          */
/* ================================================================== */

describe("useTicketComments", () => {
  it("fetches ticket comments", async () => {
    const comments = [{ id: "c-1", body: "Working on it" }];
    server.use(mockGet("/itsm/tickets/tk-1/comments", comments));

    const { result } = renderHook(() => useTicketComments("tk-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(comments);
  });
});

describe("useAddComment", () => {
  it("calls POST /itsm/tickets/{id}/comments", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/comments", { id: "c-2" }));

    const { result } = renderHook(() => useAddComment("tk-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ body: "Comment text" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useTicketStatusHistory", () => {
  it("fetches ticket status history", async () => {
    const history = [{ from: "open", to: "in-progress" }];
    server.use(mockGet("/itsm/tickets/tk-1/history", history));

    const { result } = renderHook(() => useTicketStatusHistory("tk-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(history);
  });
});

/* ================================================================== */
/*  SLA                                                                */
/* ================================================================== */

describe("useSLAPolicies", () => {
  it("fetches paginated SLA policies", async () => {
    const policy = { id: "sla-1", name: "Premium" };
    server.use(mockGet("/itsm/sla-policies", [policy], paginatedMeta));

    const { result } = renderHook(() => useSLAPolicies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useSLAPolicy", () => {
  it("fetches a single SLA policy", async () => {
    const policy = { id: "sla-1", name: "Premium" };
    server.use(mockGet("/itsm/sla-policies/sla-1", policy));

    const { result } = renderHook(() => useSLAPolicy("sla-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(policy);
  });
});

describe("useDefaultSLAPolicy", () => {
  it("fetches the default SLA policy", async () => {
    const policy = { id: "sla-default", name: "Default" };
    server.use(mockGet("/itsm/sla-policies/default", policy));

    const { result } = renderHook(() => useDefaultSLAPolicy(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(policy);
  });
});

describe("useCreateSLAPolicy", () => {
  it("calls POST /itsm/sla-policies", async () => {
    server.use(mockPost("/itsm/sla-policies", { id: "sla-2" }));

    const { result } = renderHook(() => useCreateSLAPolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Gold" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateSLAPolicy", () => {
  it("calls PUT /itsm/sla-policies/{id}", async () => {
    server.use(mockPut("/itsm/sla-policies/sla-1", { id: "sla-1" }));

    const { result } = renderHook(() => useUpdateSLAPolicy("sla-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSLAPolicy", () => {
  it("calls DELETE /itsm/sla-policies/{id}", async () => {
    server.use(mockDelete("/itsm/sla-policies/sla-1"));

    const { result } = renderHook(() => useDeleteSLAPolicy(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("sla-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSLAComplianceStats", () => {
  it("fetches SLA compliance stats", async () => {
    const stats = { compliant: 95, breached: 5 };
    server.use(mockGet("/itsm/sla-compliance", stats));

    const { result } = renderHook(() => useSLAComplianceStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useSLABreaches", () => {
  it("fetches SLA breaches for a ticket", async () => {
    const breaches = [{ id: "b-1", type: "response" }];
    server.use(mockGet("/itsm/sla-breaches/tk-1", breaches));

    const { result } = renderHook(() => useSLABreaches("tk-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(breaches);
  });
});

/* ================================================================== */
/*  Business Hours & Escalation Rules                                  */
/* ================================================================== */

describe("useBusinessHoursCalendars", () => {
  it("fetches business hours calendars", async () => {
    const calendars = [{ id: "bh-1", name: "Standard" }];
    server.use(mockGet("/itsm/business-hours", calendars));

    const { result } = renderHook(() => useBusinessHoursCalendars(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(calendars);
  });
});

describe("useCreateBusinessHoursCalendar", () => {
  it("calls POST /itsm/business-hours", async () => {
    server.use(mockPost("/itsm/business-hours", { id: "bh-2" }));

    const { result } = renderHook(() => useCreateBusinessHoursCalendar(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Extended" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateBusinessHoursCalendar", () => {
  it("calls PUT /itsm/business-hours/{id}", async () => {
    server.use(mockPut("/itsm/business-hours/bh-1", { id: "bh-1" }));

    const { result } = renderHook(() => useUpdateBusinessHoursCalendar("bh-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteBusinessHoursCalendar", () => {
  it("calls DELETE /itsm/business-hours/{id}", async () => {
    server.use(mockDelete("/itsm/business-hours/bh-1"));

    const { result } = renderHook(() => useDeleteBusinessHoursCalendar(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("bh-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useEscalationRules", () => {
  it("fetches escalation rules", async () => {
    const rules = [{ id: "er-1", name: "P1 Escalation" }];
    server.use(mockGet("/itsm/escalation-rules", rules));

    const { result } = renderHook(() => useEscalationRules(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rules);
  });
});

describe("useCreateEscalationRule", () => {
  it("calls POST /itsm/escalation-rules", async () => {
    server.use(mockPost("/itsm/escalation-rules", { id: "er-2" }));

    const { result } = renderHook(() => useCreateEscalationRule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "P2 Escalation" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateEscalationRule", () => {
  it("calls PUT /itsm/escalation-rules/{id}", async () => {
    server.use(mockPut("/itsm/escalation-rules/er-1", { id: "er-1" }));

    const { result } = renderHook(() => useUpdateEscalationRule("er-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteEscalationRule", () => {
  it("calls DELETE /itsm/escalation-rules/{id}", async () => {
    server.use(mockDelete("/itsm/escalation-rules/er-1"));

    const { result } = renderHook(() => useDeleteEscalationRule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("er-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Problems & Known Errors                                            */
/* ================================================================== */

describe("useProblems", () => {
  it("fetches paginated problems", async () => {
    const problem = { id: "pr-1", title: "DB Slowness" };
    server.use(mockGet("/itsm/problems", [problem], paginatedMeta));

    const { result } = renderHook(() => useProblems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useProblem", () => {
  it("fetches a single problem", async () => {
    const problem = { id: "pr-1", title: "DB Slowness" };
    server.use(mockGet("/itsm/problems/pr-1", problem));

    const { result } = renderHook(() => useProblem("pr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(problem);
  });
});

describe("useCreateProblem", () => {
  it("calls POST /itsm/problems", async () => {
    server.use(mockPost("/itsm/problems", { id: "pr-2" }));

    const { result } = renderHook(() => useCreateProblem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Problem" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateProblem", () => {
  it("calls PUT /itsm/problems/{id}", async () => {
    server.use(mockPut("/itsm/problems/pr-1", { id: "pr-1" }));

    const { result } = renderHook(() => useUpdateProblem("pr-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteProblem", () => {
  it("calls DELETE /itsm/problems/{id}", async () => {
    server.use(mockDelete("/itsm/problems/pr-1"));

    const { result } = renderHook(() => useDeleteProblem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("pr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLinkIncidentToProblem", () => {
  it("calls POST /itsm/problems/{id}/incidents", async () => {
    server.use(mockPost("/itsm/problems/pr-1/link-incident"));

    const { result } = renderHook(() => useLinkIncidentToProblem(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ problemId: "pr-1", ticketId: "tk-1" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useKnownErrors", () => {
  it("fetches known errors", async () => {
    const errors = [{ id: "ke-1", title: "Known Error 1" }];
    server.use(mockGet("/itsm/problems/known-errors", errors));

    const { result } = renderHook(() => useKnownErrors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(errors);
  });
});

describe("useCreateKnownError", () => {
  it("calls POST /itsm/problems/known-errors", async () => {
    server.use(mockPost("/itsm/problems/known-errors", { id: "ke-2" }));

    const { result } = renderHook(() => useCreateKnownError(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New KE" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateKnownError", () => {
  it("calls PUT /itsm/problems/known-errors/{id}", async () => {
    server.use(mockPut("/itsm/problems/known-errors/ke-1", { id: "ke-1" }));

    const { result } = renderHook(() => useUpdateKnownError("ke-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Support Queues                                                     */
/* ================================================================== */

describe("useSupportQueues", () => {
  it("fetches support queues", async () => {
    const queues = [{ id: "q-1", name: "General" }];
    server.use(mockGet("/itsm/queues", queues));

    const { result } = renderHook(() => useSupportQueues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(queues);
  });
});

describe("useCreateSupportQueue", () => {
  it("calls POST /itsm/queues", async () => {
    server.use(mockPost("/itsm/queues", { id: "q-2" }));

    const { result } = renderHook(() => useCreateSupportQueue(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "VIP" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateSupportQueue", () => {
  it("calls PUT /itsm/queues/{id}", async () => {
    server.use(mockPut("/itsm/queues/q-1", { id: "q-1" }));

    const { result } = renderHook(() => useUpdateSupportQueue("q-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSupportQueue", () => {
  it("calls DELETE /itsm/queues/{id}", async () => {
    server.use(mockDelete("/itsm/queues/q-1"));

    const { result } = renderHook(() => useDeleteSupportQueue(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("q-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  CSAT                                                               */
/* ================================================================== */

describe("useCSATStats", () => {
  it("fetches CSAT statistics", async () => {
    const stats = { avgScore: 4.2, totalSurveys: 100 };
    server.use(mockGet("/itsm/tickets/csat-stats", stats));

    const { result } = renderHook(() => useCSATStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useCreateCSATSurvey", () => {
  it("calls POST /itsm/tickets/{id}/csat", async () => {
    server.use(mockPost("/itsm/tickets/tk-1/csat", { id: "csat-1" }));

    const { result } = renderHook(() => useCreateCSATSurvey("tk-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ score: 5, comment: "Great" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useBulkUpdateTickets", () => {
  it("calls PATCH /itsm/tickets/bulk", async () => {
    server.use(mockPost("/itsm/tickets/bulk/update", { updated: 3 }));

    const { result } = renderHook(() => useBulkUpdateTickets(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ ids: ["tk-1", "tk-2"], priority: "high" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

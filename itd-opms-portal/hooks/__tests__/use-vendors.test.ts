import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import {
  createWrapper,
  mockGet,
  mockPost,
  mockPut,
  mockDelete,
  paginatedMeta,
} from "./hook-test-utils";
import {
  useVendors,
  useVendor,
  useVendorSummary,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useContracts,
  useContract,
  useExpiringContracts,
  useContractDashboard,
  useCreateContract,
  useUpdateContract,
  useRenewContract,
  useVendorScorecards,
  useCreateScorecard,
  useUpdateScorecard,
} from "@/hooks/use-vendors";

/* ================================================================== */
/*  Vendors                                                            */
/* ================================================================== */

describe("useVendors", () => {
  it("fetches paginated vendors", async () => {
    const vendor = { id: "v-1", name: "Acme Corp" };
    server.use(mockGet("/vendors", [vendor], paginatedMeta));

    const { result } = renderHook(() => useVendors(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useVendor", () => {
  it("fetches a single vendor", async () => {
    const vendor = { id: "v-1", name: "Acme Corp" };
    server.use(mockGet("/vendors/v-1", vendor));

    const { result } = renderHook(() => useVendor("v-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(vendor);
  });
});

describe("useVendorSummary", () => {
  it("fetches vendor summary", async () => {
    const summary = { activeContracts: 3, totalSpend: 100000 };
    server.use(mockGet("/vendors/v-1/summary", summary));

    const { result } = renderHook(() => useVendorSummary("v-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});

describe("useCreateVendor", () => {
  it("calls POST /vendors", async () => {
    server.use(mockPost("/vendors", { id: "v-2" }));

    const { result } = renderHook(() => useCreateVendor(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Vendor" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateVendor", () => {
  it("calls PUT /vendors/{id}", async () => {
    server.use(mockPut("/vendors/v-1", { id: "v-1" }));

    const { result } = renderHook(() => useUpdateVendor("v-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteVendor", () => {
  it("calls DELETE /vendors/{id}", async () => {
    server.use(mockDelete("/vendors/v-1"));

    const { result } = renderHook(() => useDeleteVendor(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("v-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Contracts                                                          */
/* ================================================================== */

describe("useContracts", () => {
  it("fetches paginated contracts", async () => {
    const contract = { id: "con-1", title: "SLA Agreement" };
    server.use(mockGet("/vendors/contracts", [contract], paginatedMeta));

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useContract", () => {
  it("fetches a single contract", async () => {
    const contract = { id: "con-1", title: "SLA Agreement" };
    server.use(mockGet("/vendors/contracts/con-1", contract));

    const { result } = renderHook(() => useContract("con-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(contract);
  });
});

describe("useExpiringContracts", () => {
  it("fetches expiring contracts", async () => {
    const contracts = [{ id: "con-1", expiresAt: "2026-04-01" }];
    server.use(mockGet("/vendors/contracts/expiring", contracts));

    const { result } = renderHook(() => useExpiringContracts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(contracts);
  });
});

describe("useContractDashboard", () => {
  it("fetches contract dashboard data", async () => {
    const data = { totalContracts: 20, activeContracts: 15 };
    server.use(mockGet("/vendors/contracts/dashboard", data));

    const { result } = renderHook(() => useContractDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
  });
});

describe("useCreateContract", () => {
  it("calls POST /vendors/contracts", async () => {
    server.use(mockPost("/vendors/contracts", { id: "con-2" }));

    const { result } = renderHook(() => useCreateContract(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Contract" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateContract", () => {
  it("calls PUT /vendors/contracts/{id}", async () => {
    server.use(mockPut("/vendors/contracts/con-1", { id: "con-1" }));

    const { result } = renderHook(() => useUpdateContract("con-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRenewContract", () => {
  it("calls POST /vendors/contracts/{id}/renew", async () => {
    server.use(mockPost("/vendors/contracts/con-1/renew", { id: "con-3" }));

    const { result } = renderHook(() => useRenewContract(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ contractId: "con-1", newEndDate: "2027-01-01" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Scorecards                                                         */
/* ================================================================== */

describe("useVendorScorecards", () => {
  it("fetches vendor scorecards", async () => {
    const scorecards = [{ id: "sc-1", score: 85 }];
    server.use(mockGet("/vendors/v-1/scorecards", scorecards));

    const { result } = renderHook(() => useVendorScorecards("v-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(scorecards);
  });
});

describe("useCreateScorecard", () => {
  it("calls POST /vendors/scorecards", async () => {
    server.use(mockPost("/vendors/scorecards", { id: "sc-2" }));

    const { result } = renderHook(() => useCreateScorecard(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ vendorId: "v-1", overallScore: 90 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateScorecard", () => {
  it("calls PUT /vendors/scorecards/{id}", async () => {
    server.use(mockPut("/vendors/scorecards/sc-1", { id: "sc-1" }));

    const { result } = renderHook(() => useUpdateScorecard(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "sc-1", vendorId: "v-1", overallScore: 95 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

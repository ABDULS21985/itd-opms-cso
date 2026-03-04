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
  useRisks,
  useRisk,
  useRiskHeatMap,
  useRisksNeedingReview,
  useRiskAssessments,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useCreateRiskAssessment,
  useEscalateRisk,
  useGRCAudits,
  useGRCAudit,
  useAuditReadiness,
  useCreateGRCAudit,
  useUpdateGRCAudit,
  useDeleteGRCAudit,
  useAuditFindings,
  useAuditFinding,
  useCreateAuditFinding,
  useUpdateAuditFinding,
  useCloseAuditFinding,
  useEvidenceCollections,
  useEvidenceCollection,
  useCreateEvidenceCollection,
  useUpdateEvidenceCollection,
  useApproveEvidenceCollection,
  useAccessReviewCampaigns,
  useAccessReviewCampaign,
  useAccessReviewEntries,
  useCreateAccessReviewCampaign,
  useRecordAccessReviewDecision,
  useComplianceControls,
  useComplianceControl,
  useComplianceStats,
  useCreateComplianceControl,
  useUpdateComplianceControl,
} from "@/hooks/use-grc";

/* ================================================================== */
/*  GRC Risks                                                          */
/* ================================================================== */

describe("useRisks (GRC)", () => {
  it("fetches paginated GRC risks", async () => {
    const risk = { id: "gr-1", title: "Data Breach" };
    server.use(mockGet("/grc/risks", [risk], paginatedMeta));

    const { result } = renderHook(() => useRisks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useRisk (GRC)", () => {
  it("fetches a single GRC risk", async () => {
    const risk = { id: "gr-1", title: "Data Breach" };
    server.use(mockGet("/grc/risks/gr-1", risk));

    const { result } = renderHook(() => useRisk("gr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(risk);
  });
});

describe("useRiskHeatMap", () => {
  it("fetches risk heat map data", async () => {
    const heatmap = { cells: [] };
    server.use(mockGet("/grc/risks/heat-map", heatmap));

    const { result } = renderHook(() => useRiskHeatMap(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(heatmap);
  });
});

describe("useRisksNeedingReview", () => {
  it("fetches risks needing review", async () => {
    const risks = [{ id: "gr-1", needsReview: true }];
    server.use(mockGet("/grc/risks/review-needed", risks));

    const { result } = renderHook(() => useRisksNeedingReview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(risks);
  });
});

describe("useRiskAssessments", () => {
  it("fetches risk assessments", async () => {
    const assessments = [{ id: "ra-1", score: 7 }];
    server.use(mockGet("/grc/risks/gr-1/assessments", assessments));

    const { result } = renderHook(() => useRiskAssessments("gr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(assessments);
  });
});

describe("useCreateRisk (GRC)", () => {
  it("calls POST /grc/risks", async () => {
    server.use(mockPost("/grc/risks", { id: "gr-2" }));

    const { result } = renderHook(() => useCreateRisk(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Risk" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateRisk (GRC)", () => {
  it("calls PUT /grc/risks/{id}", async () => {
    server.use(mockPut("/grc/risks/gr-1", { id: "gr-1" }));

    const { result } = renderHook(() => useUpdateRisk("gr-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteRisk (GRC)", () => {
  it("calls DELETE /grc/risks/{id}", async () => {
    server.use(mockDelete("/grc/risks/gr-1"));

    const { result } = renderHook(() => useDeleteRisk(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("gr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateRiskAssessment", () => {
  it("calls POST /grc/risks/{id}/assess", async () => {
    server.use(mockPost("/grc/risks/gr-1/assess", { id: "ra-2" }));

    const { result } = renderHook(() => useCreateRiskAssessment("gr-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ score: 8 } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useEscalateRisk", () => {
  it("calls POST /grc/risks/{id}/escalate", async () => {
    server.use(mockPost("/grc/risks/gr-1/escalate"));

    const { result } = renderHook(() => useEscalateRisk(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("gr-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Audits                                                             */
/* ================================================================== */

describe("useGRCAudits", () => {
  it("fetches paginated audits", async () => {
    const audit = { id: "aud-1", title: "ISO 27001" };
    server.use(mockGet("/grc/audits", [audit], paginatedMeta));

    const { result } = renderHook(() => useGRCAudits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useGRCAudit", () => {
  it("fetches a single audit", async () => {
    const audit = { id: "aud-1", title: "ISO 27001" };
    server.use(mockGet("/grc/audits/aud-1", audit));

    const { result } = renderHook(() => useGRCAudit("aud-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(audit);
  });
});

describe("useAuditReadiness", () => {
  it("fetches audit readiness", async () => {
    const readiness = { score: 85, gaps: [] };
    server.use(mockGet("/grc/audits/aud-1/readiness", readiness));

    const { result } = renderHook(() => useAuditReadiness("aud-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(readiness);
  });
});

describe("useCreateGRCAudit", () => {
  it("calls POST /grc/audits", async () => {
    server.use(mockPost("/grc/audits", { id: "aud-2" }));

    const { result } = renderHook(() => useCreateGRCAudit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Audit" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateGRCAudit", () => {
  it("calls PUT /grc/audits/{id}", async () => {
    server.use(mockPut("/grc/audits/aud-1", { id: "aud-1" }));

    const { result } = renderHook(() => useUpdateGRCAudit("aud-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteGRCAudit", () => {
  it("calls DELETE /grc/audits/{id}", async () => {
    server.use(mockDelete("/grc/audits/aud-1"));

    const { result } = renderHook(() => useDeleteGRCAudit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("aud-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Audit Findings                                                     */
/* ================================================================== */

describe("useAuditFindings", () => {
  it("fetches audit findings", async () => {
    const findings = [{ id: "f-1", title: "Missing MFA" }];
    server.use(mockGet("/grc/audits/aud-1/findings", findings, paginatedMeta));

    const { result } = renderHook(() => useAuditFindings("aud-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAuditFinding", () => {
  it("fetches a single finding", async () => {
    const finding = { id: "f-1", title: "Missing MFA" };
    server.use(mockGet("/grc/audits/aud-1/findings/f-1", finding));

    const { result } = renderHook(() => useAuditFinding("aud-1", "f-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(finding);
  });
});

describe("useCreateAuditFinding", () => {
  it("calls POST /grc/audits/{id}/findings", async () => {
    server.use(mockPost("/grc/audits/aud-1/findings", { id: "f-2" }));

    const { result } = renderHook(() => useCreateAuditFinding("aud-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Finding" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateAuditFinding", () => {
  it("calls PUT /grc/audits/{auditId}/findings/{findingId}", async () => {
    server.use(mockPut("/grc/audits/aud-1/findings/f-1", { id: "f-1" }));

    const { result } = renderHook(() => useUpdateAuditFinding("aud-1", "f-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCloseAuditFinding", () => {
  it("calls POST /grc/audits/{auditId}/findings/{findingId}/close", async () => {
    server.use(mockPost("/grc/audits/aud-1/findings/f-1/close"));

    const { result } = renderHook(() => useCloseAuditFinding("aud-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("f-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Evidence                                                           */
/* ================================================================== */

describe("useEvidenceCollections", () => {
  it("fetches evidence collections for an audit", async () => {
    const evidence = [{ id: "ev-1", title: "Screenshot" }];
    server.use(mockGet("/grc/audits/aud-1/evidence", evidence));

    const { result } = renderHook(() => useEvidenceCollections("aud-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(evidence);
  });
});

describe("useEvidenceCollection", () => {
  it("fetches a single evidence collection", async () => {
    const evidence = { id: "ev-1", title: "Screenshot" };
    server.use(mockGet("/grc/audits/aud-1/evidence/ev-1", evidence));

    const { result } = renderHook(() => useEvidenceCollection("aud-1", "ev-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(evidence);
  });
});

describe("useCreateEvidenceCollection", () => {
  it("calls POST /grc/audits/{id}/evidence", async () => {
    server.use(mockPost("/grc/audits/aud-1/evidence", { id: "ev-2" }));

    const { result } = renderHook(() => useCreateEvidenceCollection("aud-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Evidence" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateEvidenceCollection", () => {
  it("calls PUT /grc/audits/{auditId}/evidence/{evidenceId}", async () => {
    server.use(mockPut("/grc/audits/aud-1/evidence/ev-1", { id: "ev-1" }));

    const { result } = renderHook(() => useUpdateEvidenceCollection("aud-1", "ev-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useApproveEvidenceCollection", () => {
  it("calls POST /grc/audits/{auditId}/evidence/{evidenceId}/approve", async () => {
    server.use(mockPost("/grc/audits/aud-1/evidence/ev-1/approve"));

    const { result } = renderHook(() => useApproveEvidenceCollection("aud-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ev-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Access Reviews                                                     */
/* ================================================================== */

describe("useAccessReviewCampaigns", () => {
  it("fetches paginated access review campaigns", async () => {
    const campaign = { id: "arc-1", name: "Q1 Review" };
    server.use(mockGet("/grc/access-reviews", [campaign], paginatedMeta));

    const { result } = renderHook(() => useAccessReviewCampaigns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAccessReviewCampaign", () => {
  it("fetches a single access review campaign", async () => {
    const campaign = { id: "arc-1", name: "Q1 Review" };
    server.use(mockGet("/grc/access-reviews/arc-1", campaign));

    const { result } = renderHook(() => useAccessReviewCampaign("arc-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(campaign);
  });
});

describe("useAccessReviewEntries", () => {
  it("fetches access review entries for a campaign", async () => {
    const entries = [{ id: "are-1", status: "pending" }];
    server.use(mockGet("/grc/access-reviews/arc-1/entries", entries));

    const { result } = renderHook(() => useAccessReviewEntries("arc-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateAccessReviewCampaign", () => {
  it("calls POST /grc/access-reviews", async () => {
    server.use(mockPost("/grc/access-reviews", { id: "arc-2" }));

    const { result } = renderHook(() => useCreateAccessReviewCampaign(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Q2 Review" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRecordAccessReviewDecision", () => {
  it("calls POST /grc/access-reviews/{id}/entries/{entryId}/decide", async () => {
    server.use(mockPost("/grc/access-reviews/arc-1/entries/are-1/decide"));

    const { result } = renderHook(() => useRecordAccessReviewDecision("arc-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ entryId: "are-1", decision: "approved" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Compliance                                                         */
/* ================================================================== */

describe("useComplianceControls", () => {
  it("fetches paginated compliance controls", async () => {
    const control = { id: "cc-1", name: "AC-1" };
    server.use(mockGet("/grc/compliance", [control], paginatedMeta));

    const { result } = renderHook(() => useComplianceControls(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useComplianceControl", () => {
  it("fetches a single compliance control", async () => {
    const control = { id: "cc-1", name: "AC-1" };
    server.use(mockGet("/grc/compliance/cc-1", control));

    const { result } = renderHook(() => useComplianceControl("cc-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(control);
  });
});

describe("useComplianceStats", () => {
  it("fetches compliance statistics", async () => {
    const stats = { totalControls: 50, implemented: 45 };
    server.use(mockGet("/grc/compliance/stats", stats));

    const { result } = renderHook(() => useComplianceStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useCreateComplianceControl", () => {
  it("calls POST /grc/compliance", async () => {
    server.use(mockPost("/grc/compliance", { id: "cc-2" }));

    const { result } = renderHook(() => useCreateComplianceControl(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "AC-2" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateComplianceControl", () => {
  it("calls PUT /grc/compliance/{id}", async () => {
    server.use(mockPut("/grc/compliance/cc-1", { id: "cc-1" }));

    const { result } = renderHook(() => useUpdateComplianceControl("cc-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

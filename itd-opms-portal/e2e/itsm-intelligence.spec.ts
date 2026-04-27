import { expect, test, type Page, type Route } from "@playwright/test";

const user = {
  id: "user-1",
  email: "admin@example.com",
  displayName: "Workflow Admin",
  roles: ["admin"],
  permissions: ["*", "itsm.view", "itsm.manage", "system.manage"],
  tenantId: "tenant-1",
  tenantName: "ITD",
};

function jwtWithFutureExpiry() {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  return `e30.${payload}.sig`;
}

async function signIn(page: Page) {
  await page.addInitScript((token) => {
    localStorage.setItem("opms-token", token);
    localStorage.setItem("opms-refresh-token", "refresh-token");
    localStorage.setItem("opms-auth-mode", "dev");
  }, jwtWithFutureExpiry());
}

async function fulfill(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(status >= 400 ? data : { status: "success", data }),
  });
}

async function mockApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();

    if (path === "/auth/oidc/config") return fulfill(route, {}, 404);
    if (path === "/auth/me") return fulfill(route, user);
    if (path.startsWith("/notifications")) {
      if (path === "/notifications/unread-count") return fulfill(route, { count: 0 });
      return fulfill(route, []);
    }
    if (path === "/itsm/intelligence/process-mining") {
      return fulfill(route, {
        generatedAt: "2026-04-27T09:00:00.000Z",
        metrics: { openTickets: 12, slaRiskTickets: 3, pendingApprovals: 2 },
        queueBottlenecks: [{ id: "q1", label: "Network queue", count: 8, ageHours: 28, severity: "high", reasons: ["Queue has aging open work."] }],
        approvalDelays: [],
        slaHotspots: [],
        reassignmentLoops: [],
        recommendations: ["Review queue pressure."],
      });
    }
    if (path === "/itsm/intelligence/operations-snapshot") {
      return fulfill(route, {
        waitingOnMe: [{ id: "ticket-1", label: "INC-001001 - Payment latency", type: "ticket", status: "in_progress", actionUrl: "/dashboard/itsm/tickets/ticket-1", reason: "Assigned to you." }],
        mobileApprovals: [{ id: "approval-1", label: "Approve REQ-001001", type: "approval", status: "pending", actionUrl: "/dashboard/itsm/service-catalog/my-requests/request-1", reason: "Pending approval assigned to you." }],
        savedWorkspaces: [{ key: "noc", label: "NOC", description: "Major incident and CI impact view.", filters: ["priority:P1/P2"] }],
        ciHealth: [{ id: "ci-1", label: "Payment Switch", ciType: "application", confidence: 0.82, reason: "Recently reconciled." }],
        drReadiness: [{ key: "rpo", label: "RPO target", status: "configured", evidence: "DR targets configured." }],
        personalPreference: { defaultQueue: "My Queue", density: "comfortable", savedFilters: ["SLA risk"] },
      });
    }
    if (path === "/itsm/intelligence/triage" && method === "POST") {
      return fulfill(route, {
        category: "Infrastructure",
        subcategory: "Network",
        priority: "P2_high",
        queue: { id: "queue-1", label: "Network Operations", type: "queue", confidence: 0.82, reason: "Matched priority and category." },
        assignee: { id: "user-2", label: "Network Analyst", type: "user", confidence: 0.76, reason: "Low workload." },
        relatedCis: [],
        knownErrors: [],
        kbArticles: [],
        requiredFields: ["category", "impact", "urgency", "description"],
        explanation: ["Priority suggested as P2 because impact=high and urgency=high."],
        confidence: 0.86,
      });
    }
    if (path === "/itsm/intelligence/workflow-simulation" && method === "POST") {
      return fulfill(route, {
        allowed: false,
        message: "Simulation blocked: resolved cannot move to closed until prerequisites are satisfied.",
        blockers: ["PIR must be completed before major incident closure."],
        requiredFields: [],
        checklist: [],
        sideEffects: ["Audit event will capture actor."],
        notifications: ["Teams and email update to stakeholders."],
        auditTrail: ["Actor identity", "Supporting evidence"],
      });
    }
    if (path === "/itsm/intelligence/sla-forecast" && method === "POST") {
      return fulfill(route, {
        breachProbability: 0.72,
        riskLabel: "high",
        minutesRemaining: 42,
        drivers: ["Queue workload is elevated."],
        recommendations: ["Escalate before the final SLA window."],
      });
    }
    if (path === "/itsm/intelligence/playbooks/preview" && method === "POST") {
      return fulfill(route, {
        actions: [{ type: "teams_bridge", label: "Create Teams bridge", description: "Create or attach a bridge link.", required: true }],
        warnings: ["Dry run only."],
      });
    }
    return fulfill(route, method === "GET" ? [] : {});
  });
}

test.describe("ITSM intelligence experience", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await mockApi(page);
  });

  test("operations intelligence runs triage, simulation, playbook, and SLA forecasting", async ({ page }) => {
    await page.goto("/dashboard/itsm/intelligence");

    await expect(page.getByRole("heading", { name: "Operations Intelligence" })).toBeVisible();
    await expect(page.getByText("Open tickets")).toBeVisible();

    await page.getByRole("button", { name: "Run triage" }).click();
    await expect(page.getByText("Infrastructure / Network")).toBeVisible();
    await expect(page.getByText(/Priority suggested as P2/)).toBeVisible();

    await page.getByRole("button", { name: "Simulate" }).click();
    await expect(page.getByText(/Simulation blocked/)).toBeVisible();
    await expect(page.getByText(/PIR must be completed/)).toBeVisible();

    await page.getByRole("button", { name: "Preview playbook" }).click();
    await expect(page.getByText("Create Teams bridge")).toBeVisible();

    await page.getByRole("button", { name: "Forecast SLA risk" }).click();
    await expect(page.getByText("72%")).toBeVisible();
    await expect(page.getByText(/high breach probability/i)).toBeVisible();
  });

  test("mobile approval mode shows lightweight pending decisions", async ({ page }) => {
    await page.goto("/dashboard/itsm/mobile-approvals");

    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
    await expect(page.getByText("Approve REQ-001001")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  });
});

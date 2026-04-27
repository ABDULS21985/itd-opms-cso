import { expect, test, type Page, type Route } from "@playwright/test";

const now = "2026-04-27T09:00:00.000Z";
const user = {
  id: "user-1",
  email: "admin@example.com",
  displayName: "Workflow Admin",
  roles: ["admin"],
  permissions: ["*", "itsm.manage", "itsm.view"],
  tenantId: "tenant-1",
  tenantName: "ITD",
  department: "Service Operations",
  jobTitle: "Service Manager",
};

const ticket = {
  id: "ticket-1",
  tenantId: "tenant-1",
  ticketNumber: "INC-001001",
  type: "incident",
  category: "Infrastructure",
  subcategory: "Network",
  title: "Payment switch latency",
  description: "Customers are seeing intermittent latency on the payment switch.",
  priority: "P2_high",
  urgency: "high",
  impact: "high",
  status: "in_progress",
  channel: "portal",
  reporterId: user.id,
  reporterName: user.displayName,
  reporterDepartment: user.department,
  assigneeId: user.id,
  assigneeName: user.displayName,
  assigneeDepartment: user.department,
  slaPausedDurationMinutes: 0,
  slaResponseTarget: "2026-04-27T10:00:00.000Z",
  slaResolutionTarget: "2026-04-27T17:00:00.000Z",
  slaResponseMet: true,
  slaResolutionMet: false,
  isMajorIncident: false,
  relatedTicketIds: [],
  linkedAssetIds: [],
  linkedCiIds: [],
  tags: ["payments"],
  cabRequired: false,
  pirRequired: false,
  pirCompleted: false,
  createdAt: now,
  updatedAt: now,
};

const problem = {
  id: "problem-1",
  tenantId: "tenant-1",
  problemNumber: "PRB-001001",
  title: "Recurring switch latency",
  description: "Pattern of incident recurrence across the payment switch.",
  status: "investigating",
  linkedIncidentIds: ["ticket-1"],
  linkedAssetIds: [],
  linkedCiIds: [],
  rootCause: "",
  workaround: "Route priority traffic through the standby path.",
  permanentFix: "",
  ownerId: user.id,
  ownerName: user.displayName,
  assignedGroupName: "Network Operations",
  createdAt: now,
  updatedAt: now,
};

const change = {
  ...ticket,
  id: "change-1",
  ticketNumber: "CHG-001001",
  type: "change",
  title: "Patch payment switch firmware",
  description: "Apply firmware patch to remove the latency defect.",
  status: "assessing",
  changeClassification: "normal",
  changeType: "infrastructure",
  riskLevel: "medium",
  riskAssessment: {},
  implementationPlan: "Patch standby, fail over, then patch primary.",
  rollbackPlan: "Revert firmware and move traffic back to the current baseline.",
  testPlan: "Synthetic payment transaction checks and latency sampling.",
  scheduledStart: "2026-04-28T18:00:00.000Z",
  scheduledEnd: "2026-04-28T20:00:00.000Z",
};

const majorIncident = {
  id: "major-1",
  tenantId: "tenant-1",
  ticketId: ticket.id,
  severity: "sev1",
  incidentCommanderId: user.id,
  communicationLeadId: user.id,
  bridgeUrl: "https://teams.example/bridge",
  bridgePhone: "+2348000000000",
  affectedServices: ["Payment Switch"],
  affectedCiIds: [],
  estimatedAffectedUsers: 1200,
  businessImpact: "critical",
  status: "investigating",
  stakeholderUpdates: [],
  communicationPlan: {
    internalStakeholders: ["Executive Operations"],
    externalStakeholders: [],
    updateFrequencyMinutes: 30,
    channels: ["teams", "email"],
  },
  declaredAt: now,
  createdAt: now,
  updatedAt: now,
  ticket: {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    reporterId: user.id,
    reporterName: user.displayName,
    assigneeId: user.id,
    assigneeName: user.displayName,
  },
  incidentCommander: {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
  },
  communicationLead: {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
  },
  timeline: [],
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

async function mockApi(page: Page, onTransition?: (path: string, body: unknown) => void) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();

    if (path === "/auth/oidc/config") {
      return fulfill(route, { message: "OIDC disabled for e2e" }, 404);
    }
    if (path === "/auth/me") {
      return fulfill(route, user);
    }
    if (path === "/system/users/search") {
      return fulfill(route, []);
    }

    if (path === "/itsm/tickets/ticket-1" && method === "GET") {
      return fulfill(route, ticket);
    }
    if (path === "/itsm/tickets/ticket-1/comments") {
      return fulfill(route, []);
    }
    if (path === "/itsm/tickets/ticket-1/history") {
      return fulfill(route, []);
    }
    if (path === "/itsm/tickets/ticket-1/kb-links") {
      return fulfill(route, []);
    }
    if (path === "/itsm/tickets/ticket-1/kb-suggestions") {
      return fulfill(route, []);
    }
    if (path === "/itsm/tickets/ticket-1/subtasks") {
      return fulfill(route, { subtasks: [], progress: { total: 0, completed: 0, cancelled: 0 } });
    }
    if (path === "/itsm/sla-breaches/ticket-1") {
      return fulfill(route, []);
    }
    if (path === "/itsm/workflows/ticket/transitions") {
      return fulfill(route, {
        entity: "ticket",
        status: url.searchParams.get("status"),
        transitions: [{ value: "pending_customer", label: "Waiting on customer" }],
      });
    }
    if (path === "/itsm/tickets/ticket-1/transition" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      return fulfill(route, { ...ticket, status: body.status });
    }

    if (path === "/itsm/problems" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: [problem],
          meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
        }),
      });
    }
    if (path === "/itsm/problems/known-errors") {
      return fulfill(route, []);
    }
    if (path === "/itsm/workflows/problem/transitions") {
      return fulfill(route, {
        entity: "problem",
        status: url.searchParams.get("status"),
        transitions: [{ value: "root_cause_identified", label: "Root Cause Found" }],
      });
    }
    if (path === "/itsm/problems/problem-1/transition" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      return fulfill(route, { ...problem, status: body.targetStatus });
    }

    if (path === "/itsm/changes/change-1" && method === "GET") {
      return fulfill(route, change);
    }
    if (path === "/itsm/workflows/change/transitions") {
      return fulfill(route, {
        entity: "change",
        status: url.searchParams.get("status"),
        transitions: [{ value: "approved", label: "Approve" }],
      });
    }
    if (path === "/itsm/changes/change-1/transition" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      return fulfill(route, { ...change, status: body.targetStatus });
    }

    if (path === "/itsm/major-incidents/major-1" && method === "GET") {
      return fulfill(route, majorIncident);
    }
    if (path === "/itsm/workflows/major_incident/transitions") {
      return fulfill(route, {
        entity: "major_incident",
        status: url.searchParams.get("status"),
        transitions: [{ value: "mitigating", label: "Begin mitigation" }],
      });
    }
    if (path === "/itsm/major-incidents/major-1/transition" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      return fulfill(route, { ...majorIncident, status: body.targetStatus });
    }

    return fulfill(route, method === "GET" ? [] : {});
  });
}

test.describe("ITSM workflow-backed lifecycle actions", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("ticket detail renders only backend-allowed transitions and posts through lifecycle API", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/itsm/tickets/ticket-1");

    await expect(page.getByRole("heading", { name: ticket.title, level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: "Pending Customer", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resolve", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Pending Customer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Pending Customer" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm Pending Customer" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/tickets/ticket-1/transition",
      body: { status: "pending_customer" },
    });
  });

  test("problem board renders workflow transitions from backend", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/itsm/problems");

    await expect(page.getByRole("heading", { name: problem.title })).toBeVisible();
    await expect(page.getByRole("button", { name: "Root Cause Found", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Known Error", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Root Cause Found", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Root Cause Found" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm Root Cause Found" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/problems/problem-1/transition",
      body: { targetStatus: "root_cause_identified" },
    });
  });

  test("change detail renders workflow transitions from backend", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/itsm/changes/change-1");

    await expect(page.getByRole("heading", { name: change.title })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send to CAB", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reject", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Approve" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm Approve" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/changes/change-1/transition",
      body: { targetStatus: "approved" },
    });
  });

  test("major incident detail renders workflow transitions from backend", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/itsm/major-incidents/major-1");

    await expect(page.getByRole("heading", { name: majorIncident.ticket.title, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Begin Mitigation", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm Mitigated", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Begin Mitigation", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Begin mitigation/i })).toBeVisible();
    await page.getByRole("button", { name: /Confirm Begin mitigation/i }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/major-incidents/major-1/transition",
      body: { targetStatus: "mitigating" },
    });
  });
});

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

const serviceRequestDetail = {
  id: "request-1",
  tenantId: "tenant-1",
  requestNumber: "REQ-001001",
  catalogItemId: "catalog-1",
  requesterId: user.id,
  status: "approved",
  formData: { requestedFor: "Workflow smoke test" },
  assignedTo: undefined,
  priority: "P3_medium",
  ticketId: undefined,
  rejectionReason: undefined,
  fulfillmentNotes: undefined,
  fulfilledAt: undefined,
  closedAt: undefined,
  cancelledAt: undefined,
  createdAt: now,
  updatedAt: now,
  catalogItemName: "Monitor Request",
  approvalTasks: [],
  timeline: [
    {
      id: "timeline-1",
      requestId: "request-1",
      eventType: "submitted",
      actorId: user.id,
      description: "Service request submitted for Monitor Request",
      metadata: {},
      createdAt: now,
    },
  ],
};

const releaseRecord = {
  id: "release-1",
  tenantId: "tenant-1",
  releaseNumber: "REL-001001",
  title: "Payment switch release",
  description: "Deploy the payment switch latency fix to production.",
  releaseType: "minor",
  status: "planning",
  environment: "production",
  releaseManagerId: user.id,
  releaseManagerName: user.displayName,
  plannedStart: "2026-04-29T18:00:00.000Z",
  plannedEnd: "2026-04-29T20:00:00.000Z",
  deploymentPlan: "Deploy standby node, validate, then promote.",
  rollbackPlan: "Roll back to previous firmware baseline.",
  changeTicketIds: ["change-1"],
  deploymentTeam: [user.id],
  createdBy: user.id,
  createdAt: now,
  updatedAt: now,
  items: [],
  deployments: [],
  approvals: [],
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

type MutableServiceRequestDetail = Omit<
  typeof serviceRequestDetail,
  "assignedTo" | "closedAt" | "fulfilledAt" | "fulfillmentNotes" | "status" | "timeline"
> & {
  assignedTo?: string;
  closedAt?: string;
  fulfilledAt?: string;
  fulfillmentNotes?: string;
  status: string;
  timeline: Array<Record<string, unknown>>;
};

async function mockApi(page: Page, onTransition?: (path: string, body: unknown) => void) {
  let currentServiceRequest: MutableServiceRequestDetail = {
    ...serviceRequestDetail,
    timeline: [...serviceRequestDetail.timeline],
  };

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
        transitions: [
          {
            value: "pending_customer",
            label: "Pending Customer",
            responsibleRole: "service_desk_specialist",
            accountableRole: "senior_it_service_center_specialist",
          },
        ],
      });
    }
    if (path === "/itsm/tickets/ticket-1/transition" && method === "POST") {
      const body = request.postDataJSON() as { status: string };
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
    if (path === "/itsm/problems/problem-1" && method === "GET") {
      return fulfill(route, problem);
    }
    if (path === "/itsm/problems/known-errors") {
      return fulfill(route, []);
    }
    if (path === "/itsm/workflows/problem" && method === "GET") {
      return fulfill(route, {
        entity: "problem",
        statuses: [
          { value: "logged", label: "Logged", terminal: false, transitions: [{ value: "investigating", label: "Investigate", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" }] },
          { value: "investigating", label: "Investigating", terminal: false, transitions: [
            { value: "root_cause_identified", label: "Root Cause Found", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" },
            { value: "known_error", label: "Known Error", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" },
            { value: "third_party_escalated", label: "Escalate to 3rd Party", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" },
          ] },
          { value: "third_party_escalated", label: "3rd Party Escalated", terminal: false, transitions: [{ value: "investigating", label: "Continue Investigation", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" }] },
          { value: "root_cause_identified", label: "Root Cause Found", terminal: false, transitions: [{ value: "resolved", label: "Resolve", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" }] },
          { value: "known_error", label: "Known Error", terminal: false, transitions: [{ value: "resolved", label: "Resolve", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" }] },
          { value: "resolved", label: "Resolved", terminal: false, transitions: [{ value: "closed", label: "Close", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" }] },
          { value: "closed", label: "Closed", terminal: true, transitions: [] },
        ],
      });
    }
    if (path === "/itsm/workflows/problem/transitions") {
      return fulfill(route, {
        entity: "problem",
        status: url.searchParams.get("status"),
        transitions: [
          { value: "root_cause_identified", label: "Root Cause Found", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" },
          { value: "known_error", label: "Known Error", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" },
          { value: "third_party_escalated", label: "Escalate to 3rd Party", responsibleRole: "it_service_center_specialist", accountableRole: "senior_it_service_center_specialist" },
        ],
      });
    }
    if (path === "/itsm/problems/problem-1/transition" && method === "POST") {
      const body = request.postDataJSON() as { targetStatus: string };
      onTransition?.(path, body);
      return fulfill(route, { ...problem, status: body.targetStatus });
    }

    if (path === "/itsm/changes/change-1" && method === "GET") {
      return fulfill(route, change);
    }
    if (path === "/itsm/workflows/change" && method === "GET") {
      return fulfill(route, {
        entity: "change",
        statuses: [
          { value: "draft", label: "Draft", terminal: false, transitions: [{ value: "submitted", label: "Document RFC", responsibleRole: "business_analyst", accountableRole: "business_relationship_manager" }] },
          { value: "submitted", label: "Submitted", terminal: false, transitions: [{ value: "assessing", label: "Risk Assessment", responsibleRole: "business_analyst", accountableRole: "business_relationship_manager" }] },
          { value: "assessing", label: "Assessing", terminal: false, transitions: [{ value: "cab_review", label: "Prepare for CAB", responsibleRole: "change_requestor", accountableRole: "cab_meeting_secretary" }] },
          { value: "cab_review", label: "CAB Review", terminal: false, transitions: [{ value: "approved", label: "Approve RFC", responsibleRole: "cab_member", accountableRole: "change_approver" }] },
          { value: "approved", label: "Approved", terminal: false, transitions: [{ value: "scheduled", label: "Schedule Implementation", responsibleRole: "change_manager", accountableRole: "test_management_specialist" }] },
          { value: "scheduled", label: "Scheduled", terminal: false, transitions: [{ value: "implementing", label: "Authorize Implementation", responsibleRole: "release_manager", accountableRole: "change_approver" }] },
          { value: "closed", label: "Closed", terminal: true, transitions: [] },
        ],
      });
    }
    if (path === "/itsm/workflows/change/transitions") {
      return fulfill(route, {
        entity: "change",
        status: url.searchParams.get("status"),
        transitions: [
          {
            value: "cab_review",
            label: "Prepare for CAB",
            responsibleRole: "change_requestor",
            accountableRole: "cab_meeting_secretary",
          },
        ],
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

    if (path === "/releases/release-1" && method === "GET") {
      return fulfill(route, releaseRecord);
    }
    if (path === "/releases/release-1/items") {
      return fulfill(route, []);
    }
    if (path === "/releases/release-1/deployments") {
      return fulfill(route, []);
    }
    if (path === "/releases/release-1/approvals") {
      return fulfill(route, []);
    }
    if (path === "/itsm/workflows/release/transitions") {
      return fulfill(route, {
        entity: "release",
        status: url.searchParams.get("status"),
        transitions: [
          {
            value: "build",
            label: "Create Deployment Plan",
            responsibleRole: "release_manager",
            accountableRole: "release_management_lead",
            checklist: [
              { key: "uat_signoff_received", label: "UAT signoff received with signed test scripts", required: true },
              { key: "deployment_plan_defined", label: "Deployment approach documented", required: true },
            ],
          },
        ],
        blockedTransitions: [
          {
            value: "closed",
            label: "Conduct Close-Out",
            reason: "Move through Evaluate Results before Conduct Close-Out.",
          },
        ],
        nextAction: "Create Deployment Plan",
      });
    }
    if (path === "/releases/release-1/transition" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      return fulfill(route, { ...releaseRecord, status: body.targetStatus });
    }

    if (path === "/itsm/catalog/requests/request-1" && method === "GET") {
      return fulfill(route, currentServiceRequest);
    }
    if (path === "/itsm/workflows/service_request" && method === "GET") {
      return fulfill(route, {
        entity: "service_request",
        statuses: [
          { value: "pending_approval", label: "Pending Approval", terminal: false, transitions: [] },
          { value: "approved", label: "Approved", terminal: false, transitions: [{ value: "in_progress", label: "Start Fulfillment", responsibleRole: "service_desk_analyst", accountableRole: "senior_service_desk_analyst" }] },
          { value: "in_progress", label: "In Progress", terminal: false, transitions: [{ value: "fulfilled", label: "Fulfill", responsibleRole: "service_desk_analyst", accountableRole: "senior_service_desk_analyst" }] },
          { value: "fulfilled", label: "Fulfilled", terminal: false, transitions: [{ value: "closed", label: "Close", responsibleRole: "service_desk_analyst", accountableRole: "senior_service_desk_analyst" }] },
          { value: "closed", label: "Closed", terminal: true, transitions: [] },
        ],
      });
    }
    if (path === "/itsm/workflows/service_request/transitions" && method === "GET") {
      const status = url.searchParams.get("status");
      const transitions =
        status === "approved"
          ? [{ value: "in_progress", label: "Start Fulfillment", responsibleRole: "service_desk_analyst", accountableRole: "senior_service_desk_analyst" }]
          : status === "in_progress"
            ? [{ value: "fulfilled", label: "Fulfill", responsibleRole: "service_desk_analyst", accountableRole: "senior_service_desk_analyst" }]
            : status === "fulfilled"
              ? [{ value: "closed", label: "Close", responsibleRole: "service_desk_analyst", accountableRole: "senior_service_desk_analyst" }]
              : [];
      return fulfill(route, {
        entity: "service_request",
        status,
        transitions,
        blockedTransitions: [],
        nextAction: transitions[0]?.label,
      });
    }
    if (path === "/itsm/catalog/requests/request-1/start-fulfillment" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      currentServiceRequest = {
        ...currentServiceRequest,
        status: "in_progress",
        assignedTo: user.id,
        timeline: [
          ...currentServiceRequest.timeline,
          {
            id: "timeline-2",
            requestId: "request-1",
            eventType: "in_progress",
            actorId: user.id,
            description: "Fulfillment started",
            metadata: {},
            createdAt: now,
          },
        ],
      };
      return fulfill(route, currentServiceRequest);
    }
    if (path === "/itsm/catalog/requests/request-1/fulfill" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      currentServiceRequest = {
        ...currentServiceRequest,
        status: "fulfilled",
        fulfillmentNotes: body.fulfillmentNotes,
        fulfilledAt: now,
      };
      return fulfill(route, currentServiceRequest);
    }
    if (path === "/itsm/catalog/requests/request-1/close" && method === "POST") {
      const body = request.postDataJSON();
      onTransition?.(path, body);
      currentServiceRequest = { ...currentServiceRequest, status: "closed", closedAt: now };
      return fulfill(route, currentServiceRequest);
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
    await expect(page.getByRole("button", { name: /Pending Customer/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resolve", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
    await expect(page.getByText(/R: Service Desk Specialist/).first()).toBeVisible();
    await expect(page.getByText(/A: Senior IT Service Center Specialist/).first()).toBeVisible();

    await page.getByRole("button", { name: /Pending Customer/ }).click();
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
    await expect(page.getByRole("button", { name: "Escalate to 3rd Party", exact: true })).toBeVisible();
    await expect(page.getByText(/R: IT Service Center Specialist/).first()).toBeVisible();
    await expect(page.getByText(/A: Senior IT Service Center Specialist/).first()).toBeVisible();

    await page.getByRole("button", { name: "Escalate to 3rd Party", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Escalate to 3rd Party" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm Escalate to 3rd Party" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/problems/problem-1/transition",
      body: { targetStatus: "third_party_escalated" },
    });
  });

  test("problem detail renders only allowed workflow actions", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/itsm/problems/problem-1");

    await expect(page.getByText("Allowed Workflow Actions")).toBeVisible();
    await expect(page.getByRole("button", { name: /Escalate to 3rd Party/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Close/ })).toHaveCount(0);
    await expect(page.getByText(/R: IT Service Center Specialist/).first()).toBeVisible();

    await page.getByRole("button", { name: /Escalate to 3rd Party/ }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/problems/problem-1/transition",
      body: { targetStatus: "third_party_escalated", comment: "Escalate to 3rd Party" },
    });
  });

  test("change detail renders workflow transitions from backend", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/itsm/changes/change-1");

    await expect(page.getByRole("heading", { name: change.title })).toBeVisible();
    await expect(page.getByRole("button", { name: /Prepare for CAB/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve RFC/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Reject RFC/ })).toHaveCount(0);
    await expect(page.getByText(/R: Change Requestor/).first()).toBeVisible();
    await expect(page.getByText(/A: CAB Meeting Secretary/).first()).toBeVisible();

    await page.getByRole("button", { name: /Prepare for CAB/ }).click();
    await expect(page.getByRole("heading", { name: "Prepare for CAB" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm Prepare for CAB" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/changes/change-1/transition",
      body: { targetStatus: "cab_review" },
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

  test("service request detail supports fulfillment, confirmation, and closure path", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/itsm/service-catalog/my-requests/request-1");

    await expect(page.getByRole("heading", { name: "Monitor Request" })).toBeVisible();
    await expect(page.getByText("Request lifecycle")).toBeVisible();
    await expect(page.getByText(/R: Service Desk Analyst/)).toBeVisible();
    await expect(page.getByText(/A: Senior Service Desk Analyst/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Fulfillment" })).toBeVisible();

    await page.getByRole("button", { name: "Start Fulfillment" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/catalog/requests/request-1/start-fulfillment",
      body: {},
    });

    await page.getByRole("button", { name: "Mark Fulfilled" }).click();
    await page.getByPlaceholder(/Record what was fulfilled/i).fill(
      "Executed request and confirmed completeness.",
    );
    await page.getByRole("button", { name: "Confirm Fulfillment" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/catalog/requests/request-1/fulfill",
      body: { fulfillmentNotes: "Executed request and confirmed completeness." },
    });

    await page.getByPlaceholder("Closure comment (optional)").fill(
      "Requester notified and request closed.",
    );
    await page.getByRole("button", { name: "Close Request" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/itsm/catalog/requests/request-1/close",
      body: { comment: "Requester notified and request closed." },
    });
    await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();
  });

  test("release detail renders BRD workflow roles and uses lifecycle drawer", async ({ page }) => {
    const calls: Array<{ path: string; body: unknown }> = [];
    await mockApi(page, (path, body) => calls.push({ path, body }));

    await page.goto("/dashboard/releases/release-1");

    await expect(page.getByRole("heading", { name: releaseRecord.title })).toBeVisible();
    await expect(page.getByText("Release lifecycle actions")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Deployment Plan/ })).toBeVisible();
    await expect(page.getByText(/R: Release Manager/)).toBeVisible();
    await expect(page.getByText(/A: Release Management Lead/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Conduct Close-Out/ })).toBeDisabled();

    await page.getByRole("button", { name: /Create Deployment Plan/ }).click();
    await expect(page.getByRole("heading", { name: "Create Deployment Plan" })).toBeVisible();
    for (const checkbox of await page.getByRole("checkbox").all()) {
      await checkbox.check();
    }
    await page.getByRole("button", { name: "Confirm Create Deployment Plan" }).click();
    await expect.poll(() => calls).toContainEqual({
      path: "/releases/release-1/transition",
      body: { targetStatus: "build" },
    });
  });
});

import { expect, test, type Page, type Route } from "@playwright/test";

const now = "2026-04-28T09:00:00.000Z";
const user = {
  id: "user-1",
  email: "asset-admin@example.com",
  displayName: "Asset Workflow Admin",
  roles: ["global_admin"],
  permissions: ["*", "cmdb.view", "cmdb.manage", "cmdb.asset_process.view", "cmdb.asset_process.manage"],
  tenantId: "tenant-1",
  tenantName: "ITD",
  department: "IT Facilities",
  jobTitle: "Senior IT Facilities Specialist",
};

const assetProcess = {
  id: "asset-process-1",
  tenantId: "tenant-1",
  processNumber: "AMP-001001",
  processType: "deployment",
  title: "New staff laptop allocation",
  description: "Deploy a work tool to a new staff member.",
  sourceType: "service_request",
  requestedForId: user.id,
  requestedForName: user.displayName,
  status: "availability_check",
  approvalRequired: false,
  approvalStatus: "not_required",
  availabilityStatus: "unknown",
  dataWipeConfirmed: false,
  deliverySigned: false,
  returnSigned: false,
  details: { requestChannel: "service desk" },
  evidence: {},
  createdBy: user.id,
  createdByName: user.displayName,
  createdAt: now,
  updatedAt: now,
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

async function mockApi(page: Page, onTransition?: (body: Record<string, unknown>) => void) {
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
    if (path === "/notifications" || path === "/notifications/unread-count") {
      return fulfill(route, path.endsWith("unread-count") ? { count: 0 } : []);
    }
    if (path === "/system/users/search") {
      return fulfill(route, []);
    }

    if (path === "/cmdb/asset-process/stats") {
      return fulfill(route, {
        total: 1,
        deployment: 1,
        redeployment: 0,
        maintenance: 0,
        retirementDisposal: 0,
        open: 1,
        closed: 0,
        waitingList: 0,
        byStatus: { availability_check: 1 },
        byType: { deployment: 1 },
      });
    }
    if (path === "/cmdb/asset-process" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: [assetProcess],
          meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        }),
      });
    }
    if (path === "/cmdb/asset-process/asset-process-1" && method === "GET") {
      return fulfill(route, assetProcess);
    }
    if (path === "/cmdb/asset-process/asset-process-1/events") {
      return fulfill(route, [
        {
          id: "event-1",
          tenantId: "tenant-1",
          processId: assetProcess.id,
          fromStatus: "requester_check",
          toStatus: "availability_check",
          action: "transition",
          actorId: user.id,
          actorName: user.displayName,
          comment: "Checking PSSD store availability.",
          evidence: {},
          createdAt: now,
        },
      ]);
    }
    if (path === "/itsm/workflows/asset_management") {
      return fulfill(route, {
        entity: "asset_management",
        statuses: [
          { value: "request_received", label: "Receive Asset Request", terminal: false, transitions: [] },
          { value: "availability_check", label: "Check Work Tool Availability", terminal: false, transitions: [] },
          { value: "waiting_list", label: "Add to Waiting List", terminal: false, transitions: [] },
          { value: "procurement", label: "Procure Work Tool", terminal: false, transitions: [] },
          { value: "issue_from_store", label: "Issue from PSSD Store", terminal: false, transitions: [] },
          { value: "closed", label: "Close Process", terminal: true, transitions: [] },
        ],
      });
    }
    if (path === "/itsm/workflows/asset_management/transitions") {
      return fulfill(route, {
        entity: "asset_management",
        status: url.searchParams.get("status"),
        transitions: [
          {
            value: "waiting_list",
            label: "Add to Waiting List",
            responsibleRole: "assistant_it_facilities_specialist",
            accountableRole: "it_facilities_lead",
            checklist: [
              { key: "requester_notified", label: "Requester notified", required: true },
              { key: "waiting_reason_recorded", label: "Waiting-list reason recorded", required: true },
            ],
          },
          {
            value: "procurement",
            label: "Procure Work Tool",
            responsibleRole: "assistant_it_facilities_specialist",
            accountableRole: "it_facilities_lead",
          },
        ],
        blockedTransitions: [
          {
            value: "issue_from_store",
            label: "Issue from PSSD Store",
            reason: "Select an available work tool before issuing from the PSSD store.",
          },
        ],
        nextAction: "Add to Waiting List",
      });
    }
    if (path === "/cmdb/asset-process/asset-process-1/transition" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      onTransition?.(body);
      return fulfill(route, { ...assetProcess, status: body.targetStatus, availabilityStatus: "waiting_list" });
    }

    return fulfill(route, []);
  });
}

test("asset process workbench lists BRD 6.8 runs", async ({ page }) => {
  await signIn(page);
  await mockApi(page);

  await page.goto("/dashboard/cmdb/asset-process");

  await expect(page.getByRole("heading", { name: "IT Asset Management Process" })).toBeVisible();
  await expect(page.getByText("AMP-001001")).toBeVisible();
  await expect(page.getByText("New staff laptop allocation")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Asset deployment" })).toBeVisible();
});

test("asset process detail shows blocked hints and submits guided transition", async ({ page }) => {
  await signIn(page);
  let submitted: Record<string, unknown> | undefined;
  await mockApi(page, (body) => {
    submitted = body;
  });

  await page.goto("/dashboard/cmdb/asset-process/asset-process-1");

  await expect(page.getByRole("heading", { name: "New staff laptop allocation" })).toBeVisible();
  await expect(page.getByText("Asset process lifecycle actions")).toBeVisible();
  await expect(page.getByRole("button", { name: /Issue from PSSD Store/ })).toBeDisabled();
  await expect(page.getByText("Select an available work tool before issuing from the PSSD store.").first()).toBeVisible();

  await page.getByRole("button", { name: /Add to Waiting List/ }).click();
  await page.getByRole("checkbox", { name: /Requester notified/ }).check();
  await page.getByRole("checkbox", { name: /Waiting-list reason recorded/ }).check();
  await page.getByLabel("Internal note").fill("No eligible work tool is currently available in PSSD store.");
  await page.getByRole("button", { name: /Confirm Add to Waiting List/ }).click();

  await expect.poll(() => submitted?.targetStatus).toBe("waiting_list");
  expect(submitted?.evidence).toMatchObject({
    checklist: {
      requester_notified: true,
      waiting_reason_recorded: true,
    },
  });
});

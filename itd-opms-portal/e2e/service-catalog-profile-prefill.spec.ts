import { expect, test, type Page, type Route } from "@playwright/test";

const catalogItemId = "b0000000-0000-0000-0000-000000000013";
const categoryId = "cat-access";
const now = "2026-04-29T10:00:00.000Z";

const erpUser = {
  id: "user-erp-1",
  email: "ada.analyst@cbn.gov.ng",
  displayName: "Ada Service Analyst",
  employeeNumber: "CBN-0042",
  roles: ["service_desk_analyst"],
  permissions: ["itsm.view", "itsm.manage"],
  tenantId: "tenant-1",
  tenantName: "ITD",
  department: "Service Management Department",
  jobTitle: "Service Desk Analyst",
  office: "Head Office",
  unit: "Service Desk",
  phone: "+2348000000042",
};

const catalogItem = {
  id: catalogItemId,
  tenantId: "tenant-1",
  categoryId,
  name: "New User Account Setup",
  description: "Create accounts and access for a new user.",
  approvalRequired: true,
  approvalChainConfig: { type: "sequential", levels: [{ role: "line_manager" }] },
  slaPolicyId: undefined,
  formSchema: {
    fields: [
      { name: "full_name", label: "Full Name", type: "text", required: true },
      { name: "employee_id", label: "Employee / Contractor ID", type: "text", required: true },
      { name: "department", label: "Department", type: "text", required: true },
      { name: "job_title", label: "Job Title", type: "text", required: true },
      { name: "start_date", label: "Start Date", type: "date", required: true },
      {
        name: "account_type",
        label: "Account Type",
        type: "select",
        required: true,
        options: [
          { label: "Full-time Employee", value: "employee" },
          { label: "Contractor", value: "contractor" },
        ],
      },
    ],
  },
  entitlementRoles: [],
  estimatedDelivery: "1 business day",
  status: "active",
  version: 1,
  createdAt: now,
  updatedAt: now,
};

function jwtWithFutureExpiry() {
  const payload = Buffer.from(
    JSON.stringify({ sub: erpUser.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
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

    if (path === "/auth/oidc/config") {
      return fulfill(route, { message: "OIDC disabled for e2e" }, 404);
    }
    if (path === "/auth/me") {
      return fulfill(route, erpUser);
    }
    if (path === `/itsm/catalog/items/${catalogItemId}`) {
      return fulfill(route, catalogItem);
    }
    if (path === `/itsm/catalog/categories/${categoryId}`) {
      return fulfill(route, {
        id: categoryId,
        tenantId: "tenant-1",
        name: "Access Management",
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (path === `/itsm/catalog/items/${catalogItemId}/related`) {
      return fulfill(route, []);
    }
    if (path === "/notifications" || path === "/notifications/unread-count") {
      return fulfill(route, path.endsWith("unread-count") ? { count: 0 } : []);
    }
    if (path === "/notifications/stream-token") {
      return fulfill(route, { expiresAt: "2026-04-29T11:00:00.000Z" });
    }
    if (path === "/notifications/stream") {
      return route.fulfill({ status: 204, body: "" });
    }

    return fulfill(route, []);
  });
}

test("service catalog form pre-fills authenticated ERP user profile fields", async ({ page }) => {
  await signIn(page);
  await mockApi(page);

  await page.goto(`/dashboard/itsm/service-catalog/${catalogItemId}`);

  await expect(page.getByRole("heading", { name: "New User Account Setup" })).toBeVisible();
  await expect(page.getByLabel("Full Name")).toHaveValue("Ada Service Analyst");
  await expect(page.getByLabel("Employee / Contractor ID")).toHaveValue("CBN-0042");
  await expect(page.getByLabel("Department")).toHaveValue("Service Management Department");
  await expect(page.getByLabel("Job Title")).toHaveValue("Service Desk Analyst");
});


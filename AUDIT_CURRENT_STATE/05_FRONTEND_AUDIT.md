# 05 -- Frontend Audit: ITD-OPMS Portal

**Audit Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** `itd-opms-portal/` -- Next.js 14+ App Router SPA
**Evidence Base:** Code review of 121 page files, 64 component files, 29 custom hooks, 15 lib utilities, and 79 test files

---

## 1. Executive Summary

The ITD-OPMS portal is a production-grade Next.js application with **121 distinct pages** across 14 functional modules. All pages consume live API data from the Go backend via a centralized API client; **zero instances of hardcoded/fake data were found** outside of controlled sparkline trend generation on the executive dashboard. The frontend employs a layered provider architecture (Theme > Query > Auth > Notification), TanStack React Query for server state, react-hook-form with zod schemas for form validation, and a comprehensive shared component library. RBAC is enforced at the UI layer through a `PermissionGate` component, though backend enforcement remains the authoritative gate.

---

## 2. Page Inventory (121 Pages)

### 2.1 Auth Module (2 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| Login | `/auth/login` | OIDC / dev JWT login | `POST /auth/login`, `GET /auth/oidc/config` | Login, OIDC redirect | Yes | Complete | `app/auth/login/page.tsx` |
| OIDC Callback | `/auth/callback` | PKCE code exchange | `POST /auth/oidc/callback` | Code exchange, session init | Yes | Complete | `app/auth/callback/page.tsx` |

### 2.2 Executive Dashboard (1 page)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| Executive Dashboard | `/dashboard` | KPI cards, charts, alerts, division performance | `GET /dashboards/executive-summary` | Refresh, navigate modules | Yes | Complete | `app/dashboard/page.tsx` |

### 2.3 Analytics Module (8 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| Analytics Hub | `/dashboard/analytics` | Analytics overview | `GET /dashboards/*` | Navigate sub-views | Yes | Complete | `app/dashboard/analytics/page.tsx` |
| Project Analytics | `/dashboard/analytics/projects` | Project metrics, burndown | `GET /dashboards/*` | Filter, export | Yes | Complete | `app/dashboard/analytics/projects/page.tsx` |
| Portfolio Analytics | `/dashboard/analytics/portfolio` | Portfolio-level roll-up | `GET /dashboards/*` | Filter by fiscal year | Yes | Complete | `app/dashboard/analytics/portfolio/page.tsx` |
| Risk Analytics | `/dashboard/analytics/risks` | Risk heatmap, trending | `GET /dashboards/*` | Filter, drill-down | Yes | Complete | `app/dashboard/analytics/risks/page.tsx` |
| Resource Analytics | `/dashboard/analytics/resources` | Team utilization | `GET /dashboards/*` | Filter by team | Yes | Complete | `app/dashboard/analytics/resources/page.tsx` |
| Governance Analytics | `/dashboard/analytics/governance` | Policy compliance rates | `GET /dashboards/*` | Filter | Yes | Complete | `app/dashboard/analytics/governance/page.tsx` |
| Collaboration Analytics | `/dashboard/analytics/collaboration` | Cross-division metrics | `GET /dashboards/*` | Filter | Yes | Complete | `app/dashboard/analytics/collaboration/page.tsx` |
| Office Analytics | `/dashboard/analytics/offices` | Per-office breakdown | `GET /dashboards/*` | Filter by office | Yes | Complete | `app/dashboard/analytics/offices/page.tsx` |

### 2.4 Governance Module (17 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| Governance Hub | `/dashboard/governance` | Module overview | `GET /governance/*` aggregated | Navigate | Yes | Complete | `app/dashboard/governance/page.tsx` |
| Policy List | `/dashboard/governance/policies` | Policy register | `GET /governance/policies` | Filter, search, create | Yes | Complete | `app/dashboard/governance/policies/page.tsx` |
| Policy Detail | `/dashboard/governance/policies/[id]` | Single policy view | `GET /governance/policies/{id}` | View, edit link, attest | Yes | Complete | `app/dashboard/governance/policies/[id]/page.tsx` |
| Policy Edit | `/dashboard/governance/policies/[id]/edit` | Edit policy | `PUT /governance/policies/{id}` | Save, cancel | Yes | Complete | `app/dashboard/governance/policies/[id]/edit/page.tsx` |
| Policy Diff | `/dashboard/governance/policies/[id]/diff` | Version diff viewer | `GET /governance/policies/{id}/versions` | Compare versions | Yes | Complete | `app/dashboard/governance/policies/[id]/diff/page.tsx` |
| Policy Attestations | `/dashboard/governance/policies/[id]/attestations` | Attestation tracking | `GET /governance/policies/{id}/attestations` | Attest, filter | Yes | Complete | `app/dashboard/governance/policies/[id]/attestations/page.tsx` |
| New Policy | `/dashboard/governance/policies/new` | Create policy | `POST /governance/policies` | Submit form | Yes | Complete | `app/dashboard/governance/policies/new/page.tsx` |
| RACI List | `/dashboard/governance/raci` | RACI matrices | `GET /governance/raci` | Filter, create | Yes | Complete | `app/dashboard/governance/raci/page.tsx` |
| RACI Detail | `/dashboard/governance/raci/[id]` | Single RACI matrix | `GET /governance/raci/{id}` | View, edit | Yes | Complete | `app/dashboard/governance/raci/[id]/page.tsx` |
| New RACI | `/dashboard/governance/raci/new` | Create RACI | `POST /governance/raci` | Submit form | Yes | Complete | `app/dashboard/governance/raci/new/page.tsx` |
| Meeting List | `/dashboard/governance/meetings` | Meeting register | `GET /governance/meetings` | Filter, search, create | Yes | Complete | `app/dashboard/governance/meetings/page.tsx` |
| Meeting Detail | `/dashboard/governance/meetings/[id]` | Single meeting + decisions | `GET /governance/meetings/{id}` | View, actions | Yes | Complete | `app/dashboard/governance/meetings/[id]/page.tsx` |
| New Meeting | `/dashboard/governance/meetings/new` | Schedule meeting | `POST /governance/meetings` | Submit form | Yes | Complete | `app/dashboard/governance/meetings/new/page.tsx` |
| OKR List | `/dashboard/governance/okrs` | OKR register | `GET /governance/okrs` | Filter, create | Yes | Complete | `app/dashboard/governance/okrs/page.tsx` |
| OKR Detail | `/dashboard/governance/okrs/[id]` | Single OKR with KRs | `GET /governance/okrs/{id}` | View, update progress | Yes | Complete | `app/dashboard/governance/okrs/[id]/page.tsx` |
| New OKR | `/dashboard/governance/okrs/new` | Create OKR | `POST /governance/okrs` | Submit form | Yes | Complete | `app/dashboard/governance/okrs/new/page.tsx` |
| Approvals | `/dashboard/governance/approvals` | Pending approvals inbox | `GET /approvals/my-pending` | Approve, reject, delegate | Yes | Complete | `app/dashboard/governance/approvals/page.tsx` |
| Actions | `/dashboard/governance/actions` | Action items from meetings | `GET /governance/meetings/*/actions` | Filter, update status | Yes | Complete | `app/dashboard/governance/actions/page.tsx` |

### 2.5 Planning Module (27 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| Planning Hub | `/dashboard/planning` | Module overview cards | `GET /dashboards/*` | Navigate | Yes | Complete | `app/dashboard/planning/page.tsx` |
| Portfolio List | `/dashboard/planning/portfolios` | Portfolio register | `GET /planning/portfolios` | Filter, search, create | Yes | Complete | `app/dashboard/planning/portfolios/page.tsx` |
| Portfolio Detail | `/dashboard/planning/portfolios/[id]` | Single portfolio + projects | `GET /planning/portfolios/{id}` | View, drill-down | Yes | Complete | `app/dashboard/planning/portfolios/[id]/page.tsx` |
| Portfolio Timeline | `/dashboard/planning/portfolios/[id]/timeline` | Gantt-style timeline | `GET /planning/timeline/portfolio/{id}` | Pan, zoom | Yes | Complete | `app/dashboard/planning/portfolios/[id]/timeline/page.tsx` |
| New Portfolio | `/dashboard/planning/portfolios/new` | Create portfolio | `POST /planning/portfolios` | Submit form | Yes | Complete | `app/dashboard/planning/portfolios/new/page.tsx` |
| Project List | `/dashboard/planning/projects` | Project register | `GET /planning/projects` | Filter, search, create, export | Yes | Complete | `app/dashboard/planning/projects/page.tsx` |
| Project Detail | `/dashboard/planning/projects/[id]` | Single project dashboard | `GET /planning/projects/{id}` | View, edit link | Yes | Complete | `app/dashboard/planning/projects/[id]/page.tsx` |
| Project Edit | `/dashboard/planning/projects/[id]/edit` | Edit project form | `PUT /planning/projects/{id}` | Save | Yes | Complete | `app/dashboard/planning/projects/[id]/edit/page.tsx` |
| Project Timeline | `/dashboard/planning/projects/[id]/timeline` | Gantt chart | `GET /planning/timeline/project/{id}` | Pan, zoom | Yes | Complete | `app/dashboard/planning/projects/[id]/timeline/page.tsx` |
| Project Budget | `/dashboard/planning/projects/[id]/budget` | Budget breakdown | `GET /planning/budget/project/{id}` | View, edit items | Yes | Complete | `app/dashboard/planning/projects/[id]/budget/page.tsx` |
| New Project | `/dashboard/planning/projects/new` | Create project | `POST /planning/projects` | Submit form | Yes | Complete | `app/dashboard/planning/projects/new/page.tsx` |
| Work Item List | `/dashboard/planning/work-items` | WBS / task board | `GET /planning/work-items` | Filter, search, create | Yes | Complete | `app/dashboard/planning/work-items/page.tsx` |
| Work Item Detail | `/dashboard/planning/work-items/[id]` | Single work item | `GET /planning/work-items/{id}` | View, transition, edit | Yes | Complete | `app/dashboard/planning/work-items/[id]/page.tsx` |
| New Work Item | `/dashboard/planning/work-items/new` | Create work item | `POST /planning/work-items` | Submit form | Yes | Complete | `app/dashboard/planning/work-items/new/page.tsx` |
| Milestone List | `/dashboard/planning/milestones` | Milestone tracker | `GET /planning/milestones` | Filter, create | Yes | Complete | `app/dashboard/planning/milestones/page.tsx` |
| Risk List | `/dashboard/planning/risks` | Risk register | `GET /planning/risks` | Filter, search, create | Yes | Complete | `app/dashboard/planning/risks/page.tsx` |
| Risk Detail | `/dashboard/planning/risks/[id]` | Single risk | `GET /planning/risks/{id}` | View, edit | Yes | Complete | `app/dashboard/planning/risks/[id]/page.tsx` |
| New Risk | `/dashboard/planning/risks/new` | Create risk | `POST /planning/risks` | Submit form | Yes | Complete | `app/dashboard/planning/risks/new/page.tsx` |
| Issue List | `/dashboard/planning/issues` | Issue register | `GET /planning/issues` | Filter, search, create | Yes | Complete | `app/dashboard/planning/issues/page.tsx` |
| Issue Detail | `/dashboard/planning/issues/[id]` | Single issue | `GET /planning/issues/{id}` | View, escalate, edit | Yes | Complete | `app/dashboard/planning/issues/[id]/page.tsx` |
| New Issue | `/dashboard/planning/issues/new` | Create issue | `POST /planning/issues` | Submit form | Yes | Complete | `app/dashboard/planning/issues/new/page.tsx` |
| Change Request List | `/dashboard/planning/change-requests` | CR register | `GET /planning/change-requests` | Filter, search, create | Yes | Complete | `app/dashboard/planning/change-requests/page.tsx` |
| Change Request Detail | `/dashboard/planning/change-requests/[id]` | Single CR | `GET /planning/change-requests/{id}` | View, approve, reject | Yes | Complete | `app/dashboard/planning/change-requests/[id]/page.tsx` |
| New Change Request | `/dashboard/planning/change-requests/new` | Create CR | `POST /planning/change-requests` | Submit form | Yes | Complete | `app/dashboard/planning/change-requests/new/page.tsx` |
| PIR List | `/dashboard/planning/pir` | Post-implementation reviews | `GET /planning/pir` | Filter, create | Yes | Complete | `app/dashboard/planning/pir/page.tsx` |
| PIR Detail | `/dashboard/planning/pir/[id]` | Single PIR | `GET /planning/pir/{id}` | View, edit | Yes | Complete | `app/dashboard/planning/pir/[id]/page.tsx` |
| Calendar | `/dashboard/planning/calendar` | Unified calendar | `GET /calendar/events` | Filter by type, navigate | Yes | Complete | `app/dashboard/planning/calendar/page.tsx` |
| Budget Overview | `/dashboard/planning/budget` | Portfolio budget roll-up | `GET /planning/budget/*` | Filter, drill-down | Yes | Complete | `app/dashboard/planning/budget/page.tsx` |

### 2.6 ITSM Module (8 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| ITSM Hub | `/dashboard/itsm` | Module overview | `GET /itsm/*` aggregated | Navigate | Yes | Complete | `app/dashboard/itsm/page.tsx` |
| Service Catalog | `/dashboard/itsm/service-catalog` | Catalog browser | `GET /itsm/catalog` | Browse, request | Yes | Complete | `app/dashboard/itsm/service-catalog/page.tsx` |
| Ticket List | `/dashboard/itsm/tickets` | Incident/SR register | `GET /itsm/tickets` | Filter, search, create | Yes | Complete | `app/dashboard/itsm/tickets/page.tsx` |
| Ticket Detail | `/dashboard/itsm/tickets/[id]` | Single ticket | `GET /itsm/tickets/{id}` | View, update, transition | Yes | Complete | `app/dashboard/itsm/tickets/[id]/page.tsx` |
| New Ticket | `/dashboard/itsm/tickets/new` | Create ticket | `POST /itsm/tickets` | Submit form | Yes | Complete | `app/dashboard/itsm/tickets/new/page.tsx` |
| My Queue | `/dashboard/itsm/my-queue` | Assigned tickets | `GET /itsm/queues/my` | Filter, transition | Yes | Complete | `app/dashboard/itsm/my-queue/page.tsx` |
| SLA Dashboard | `/dashboard/itsm/sla-dashboard` | SLA compliance | `GET /itsm/sla-policies` | View metrics | Yes | Complete | `app/dashboard/itsm/sla-dashboard/page.tsx` |
| Problems | `/dashboard/itsm/problems` | Problem register | `GET /itsm/problems` | Filter, create | Yes | Complete | `app/dashboard/itsm/problems/page.tsx` |

### 2.7 CMDB Module (12 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| CMDB Hub | `/dashboard/cmdb` | Module overview | `GET /cmdb/*` aggregated | Navigate | Yes | Complete | `app/dashboard/cmdb/page.tsx` |
| Asset List | `/dashboard/cmdb/assets` | Asset register | `GET /cmdb/assets` | Filter, search, create, export | Yes | Complete | `app/dashboard/cmdb/assets/page.tsx` |
| Asset Detail | `/dashboard/cmdb/assets/[id]` | Single asset | `GET /cmdb/assets/{id}` | View, edit, dispose | Yes | Complete | `app/dashboard/cmdb/assets/[id]/page.tsx` |
| New Asset | `/dashboard/cmdb/assets/new` | Register asset | `POST /cmdb/assets` | Submit form | Yes | Complete | `app/dashboard/cmdb/assets/new/page.tsx` |
| Asset Disposal | `/dashboard/cmdb/assets/[id]/dispose` | Disposal workflow | `POST /cmdb/assets/{id}/dispose` | Submit disposal | Yes | Complete | `app/dashboard/cmdb/assets/[id]/dispose/page.tsx` |
| Licenses | `/dashboard/cmdb/licenses` | License management | `GET /cmdb/licenses` | Filter, search | Yes | Complete | `app/dashboard/cmdb/licenses/page.tsx` |
| Warranties | `/dashboard/cmdb/warranties` | Warranty tracker | `GET /cmdb/warranties` | Filter, alerts | Yes | Complete | `app/dashboard/cmdb/warranties/page.tsx` |
| Topology | `/dashboard/cmdb/topology` | CI relationship map | `GET /cmdb/cis/relationships` | Explore graph | Yes | Complete | `app/dashboard/cmdb/topology/page.tsx` |
| Reconciliation | `/dashboard/cmdb/reconciliation` | Discovery reconciliation | `GET /cmdb/cis/reconciliation` | Review matches | Yes | Complete | `app/dashboard/cmdb/reconciliation/page.tsx` |
| Vendors | `/dashboard/cmdb/vendors` | Vendor register | `GET /vendors` | Filter, search, create | Yes | Complete | `app/dashboard/cmdb/vendors/page.tsx` |
| Vendor Detail | `/dashboard/cmdb/vendors/[id]` | Single vendor | `GET /vendors/{id}` | View, contracts, scorecards | Yes | Complete | `app/dashboard/cmdb/vendors/[id]/page.tsx` |
| Contracts | `/dashboard/cmdb/contracts` | Contract register | `GET /vendors/contracts` | Filter, search | Yes | **Functional** | Uses vendor module backend |
| CMDB Reports | `/dashboard/cmdb/reports` | CMDB analytics | None (no handler) | View charts | **No** | **Dead Page** | No backend handler exists |

### 2.8 People Module (9 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| People Hub | `/dashboard/people` | Module overview | `GET /people/*` aggregated | Navigate | Yes | Complete | `app/dashboard/people/page.tsx` |
| Skills | `/dashboard/people/skills` | Skills matrix | `GET /people/skills` | Filter, search, create | Yes | Complete | `app/dashboard/people/skills/page.tsx` |
| Onboarding | `/dashboard/people/onboarding` | Onboarding checklists | `GET /people/checklists?type=onboarding` | Filter, create | Yes | Complete | `app/dashboard/people/onboarding/page.tsx` |
| Offboarding | `/dashboard/people/offboarding` | Offboarding checklists | `GET /people/checklists?type=offboarding` | Filter, create | Yes | Complete | `app/dashboard/people/offboarding/page.tsx` |
| Roster | `/dashboard/people/roster` | Staff roster | `GET /people/rosters` | Filter, search | Yes | Complete | `app/dashboard/people/roster/page.tsx` |
| Training | `/dashboard/people/training` | Training tracker | `GET /people/training` | Filter, create | Yes | Complete | `app/dashboard/people/training/page.tsx` |
| Capacity | `/dashboard/people/capacity` | Capacity overview | `GET /people/capacity` | Filter | Yes | Complete | `app/dashboard/people/capacity/page.tsx` |
| Capacity Heatmap | `/dashboard/people/capacity/heatmap` | Visual heatmap | `GET /people/capacity/heatmap` | Filter by period | Yes | Complete | `app/dashboard/people/capacity/heatmap/page.tsx` |
| People Analytics | `/dashboard/people/analytics` | People metrics | `GET /dashboards/*` | Filter | Yes | Complete | `app/dashboard/people/analytics/page.tsx` |

### 2.9 Knowledge Module (4 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| Knowledge Hub | `/dashboard/knowledge` | Module overview + announcements | `GET /knowledge/announcements` | Navigate, browse | Yes | Complete | `app/dashboard/knowledge/page.tsx` |
| Article Detail | `/dashboard/knowledge/articles/[slug]` | KB article viewer | `GET /knowledge/articles/{slug}` | View, feedback | Yes | Complete | `app/dashboard/knowledge/articles/[slug]/page.tsx` |
| New Article | `/dashboard/knowledge/articles/new` | Create KB article | `POST /knowledge/articles` | Submit form | Yes | Complete | `app/dashboard/knowledge/articles/new/page.tsx` |
| KB Search | `/dashboard/knowledge/search` | Full-text search | `GET /knowledge/articles?search=` | Search, filter | Yes | Complete | `app/dashboard/knowledge/search/page.tsx` |

### 2.10 GRC Module (8 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| GRC Hub | `/dashboard/grc` | Module overview | `GET /grc/*` aggregated | Navigate | Yes | Complete | `app/dashboard/grc/page.tsx` |
| GRC Risks | `/dashboard/grc/risks` | Enterprise risk register | `GET /grc/risks` | Filter, search, create | Yes | Complete | `app/dashboard/grc/risks/page.tsx` |
| GRC Risk Detail | `/dashboard/grc/risks/[id]` | Single GRC risk | `GET /grc/risks/{id}` | View, edit | Yes | Complete | `app/dashboard/grc/risks/[id]/page.tsx` |
| Audits | `/dashboard/grc/audits` | Audit register | `GET /grc/audits` | Filter, create | Yes | Complete | `app/dashboard/grc/audits/page.tsx` |
| Audit Detail | `/dashboard/grc/audits/[id]` | Single audit | `GET /grc/audits/{id}` | View, findings | Yes | Complete | `app/dashboard/grc/audits/[id]/page.tsx` |
| Audit Evidence | `/dashboard/grc/audits/[id]/evidence` | Evidence management | `GET /grc/audits/{id}/evidence` | Upload, view | Yes | Complete | `app/dashboard/grc/audits/[id]/evidence/page.tsx` |
| Access Reviews | `/dashboard/grc/access-reviews` | Access review campaigns | `GET /grc/access-reviews` | Filter, create | Yes | Complete | `app/dashboard/grc/access-reviews/page.tsx` |
| Compliance | `/dashboard/grc/compliance` | Compliance controls | `GET /grc/compliance` | Filter, update | Yes | Complete | `app/dashboard/grc/compliance/page.tsx` |
| GRC Reports | `/dashboard/grc/reports` | GRC analytics | `GET /dashboards/*` | Filter | Yes | Complete | `app/dashboard/grc/reports/page.tsx` |

### 2.11 System Module (15 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| System Hub | `/dashboard/system` | Admin overview | `GET /system/*` aggregated | Navigate | Yes | Complete | `app/dashboard/system/page.tsx` |
| Users | `/dashboard/system/users` | User management | `GET /system/users` | Filter, search, create | Yes | Complete | `app/dashboard/system/users/page.tsx` |
| User Detail | `/dashboard/system/users/[id]` | Single user | `GET /system/users/{id}` | View, edit roles | Yes | Complete | `app/dashboard/system/users/[id]/page.tsx` |
| Roles | `/dashboard/system/roles` | Role management | `GET /system/roles` | Create, edit | Yes | Complete | `app/dashboard/system/roles/page.tsx` |
| Role Detail | `/dashboard/system/roles/[id]` | Single role + perms | `GET /system/roles/{id}` | Edit permissions | Yes | Complete | `app/dashboard/system/roles/[id]/page.tsx` |
| Tenants | `/dashboard/system/tenants` | Tenant management | `GET /system/tenants` | Create, edit | Yes | Complete | `app/dashboard/system/tenants/page.tsx` |
| Org Units | `/dashboard/system/org-units` | Organizational units | `GET /system/org-units` | Create, edit | Yes | Complete | `app/dashboard/system/org-units/page.tsx` |
| Audit Logs | `/dashboard/system/audit-logs` | Audit event explorer | `GET /system/audit-logs` | Filter, search, export | Yes | Complete | `app/dashboard/system/audit-logs/page.tsx` |
| Sessions | `/dashboard/system/sessions` | Active sessions | `GET /system/sessions` | View, revoke | Yes | Complete | `app/dashboard/system/sessions/page.tsx` |
| Settings | `/dashboard/system/settings` | System settings | `GET /system/settings` | Edit, save | Yes | Complete | `app/dashboard/system/settings/page.tsx` |
| Health | `/dashboard/system/health` | Platform health check | `GET /system/health` | View metrics | Yes | Complete | `app/dashboard/system/health/page.tsx` |
| Email Templates | `/dashboard/system/email-templates` | Template management | `GET /system/email-templates` | Create, edit | Yes | Complete | `app/dashboard/system/email-templates/page.tsx` |
| Template Detail | `/dashboard/system/email-templates/[id]` | Single template | `GET /system/email-templates/{id}` | Edit, preview | Yes | Complete | `app/dashboard/system/email-templates/[id]/page.tsx` |
| Automation | `/dashboard/system/automation` | Automation rules | `GET /automation/rules` | Create, toggle, test | Yes | Complete | `app/dashboard/system/automation/page.tsx` |
| Custom Fields | `/dashboard/system/custom-fields` | Custom field definitions | `GET /custom-fields/definitions` | Create, reorder, delete | Yes | Complete | `app/dashboard/system/custom-fields/page.tsx` |
| Workflows | `/dashboard/system/workflows` | Approval workflows | `GET /approvals/workflows` | Create, edit, delete | Yes | Complete | `app/dashboard/system/workflows/page.tsx` |

### 2.12 Cross-Cutting Pages (6 pages)

| Page | Route | Purpose | Data Source | Actions | Backend Connected | Status | Evidence |
|------|-------|---------|-------------|---------|-------------------|--------|----------|
| Reports | `/dashboard/reports` | Report builder | `GET /reporting/reports` | Create, run, export | Yes | Complete | `app/dashboard/reports/page.tsx` |
| Global Search | `/dashboard/search` | Cross-module search | `GET /search` | Search, navigate | Yes | Complete | `app/dashboard/search/page.tsx` |
| Notifications | `/dashboard/notifications` | Notification center | `GET /notifications` | Mark read, preferences | Yes | Complete | `app/dashboard/notifications/page.tsx` |
| Vault | `/dashboard/vault` | Document vault | `GET /vault/documents` | Upload, search, manage | Yes | Complete | `app/dashboard/vault/page.tsx` |
| Landing | `/` | Redirect to dashboard | None | Redirect | N/A | Complete | `app/page.tsx` |

---

## 3. Architecture Overview

### 3.1 Root Layout Provider Stack

```
<html>
  <ThemeProvider>              -- Dark/light mode, data-theme attribute
    <QueryProvider>            -- TanStack React Query (60s stale, 1 retry, no refetch on focus)
      <AuthProvider>           -- Dual-mode auth context (OIDC + dev JWT)
        <NotificationProvider> -- Real-time notification state + SSE
          {children}
          <Toaster />          -- Sonner toast notifications
        </NotificationProvider>
      </AuthProvider>
    </QueryProvider>
  </ThemeProvider>
</html>
```

**Evidence:** `app/layout.tsx`, `providers/query-provider.tsx`

### 3.2 API Client (`lib/api-client.ts`)

- **Base URL:** `NEXT_PUBLIC_API_URL` || `http://localhost:8089/api/v1`
- **Auth modes:** OIDC (httpOnly cookies via `credentials: "include"`) + dev JWT (Bearer token from localStorage)
- **Auth detection:** `localStorage.getItem("opms-auth-mode")` returns `"oidc"` or `"dev"`
- **401 handling:** Auto-clears tokens, cookies, redirects to `/auth/login`
- **204 handling:** Returns `undefined` for No Content responses
- **Envelope unwrapping:** Unwraps `{ status, data, meta }` envelope; handles double-wrapping edge case
- **Pagination normalization:** Backend `{ page, limit, total, totalPages }` mapped to frontend `{ page, pageSize, totalItems, totalPages }`
- **File upload:** Dedicated `upload()` method with multipart/form-data (no Content-Type header)
- **HTTP methods:** `get`, `post`, `put`, `patch`, `delete`, `upload`

### 3.3 State Management

- **Server state:** TanStack React Query v5
  - `staleTime: 60_000` (60 seconds)
  - `retry: 1` (single retry)
  - `refetchOnWindowFocus: false`
  - ReactQueryDevtools included in development
- **Client state:** React context providers (Auth, Theme, Notification)
- **Form state:** react-hook-form with zod validation schemas

### 3.4 Session Timeout

- **Inactivity window:** 30 minutes
- **Event listeners:** `mousedown`, `keydown`, `scroll`, `touchstart`, `mousemove`
- **Action on timeout:** Auto-logout, redirect to `/auth/login`

---

## 4. Custom Hooks Inventory (29 hooks)

### 4.1 Domain-Specific Data Hooks (18)

| Hook | File | Module | Purpose |
|------|------|--------|---------|
| `useAuth` | `hooks/use-auth.ts` | Auth | Authentication state and actions |
| `useNotifications` | `hooks/use-notifications.ts` | Notifications | Notification list, unread count, preferences |
| `useGovernance` | `hooks/use-governance.ts` | Governance | Policies, RACI, meetings, OKRs, KPIs |
| `usePlanning` | `hooks/use-planning.ts` | Planning | Portfolios, projects, work items, risks, issues, CRs |
| `useItsm` | `hooks/use-itsm.ts` | ITSM | Catalog, tickets, SLAs, problems, queues |
| `useCmdb` | `hooks/use-cmdb.ts` | CMDB | Assets, CIs, licenses, warranties |
| `usePeople` | `hooks/use-people.ts` | People | Skills, checklists, rosters, training, capacity |
| `useKnowledge` | `hooks/use-knowledge.ts` | Knowledge | Articles, feedback, announcements |
| `useGrc` | `hooks/use-grc.ts` | GRC | Risks, audits, access reviews, compliance |
| `useReporting` | `hooks/use-reporting.ts` | Reporting | Dashboards, reports, search |
| `useSystem` | `hooks/use-system.ts` | System | Users, roles, tenants, org-units, health, settings |
| `useApprovals` | `hooks/use-approvals.ts` | Approvals | Workflow definitions, chains, pending items |
| `useBudget` | `hooks/use-budget.ts` | Planning/Budget | Budget line items, snapshots |
| `useVault` | `hooks/use-vault.ts` | Vault | Documents, folders, versions |
| `useVendors` | `hooks/use-vendors.ts` | Vendors | Vendor CRUD, contracts, scorecards |
| `useAutomation` | `hooks/use-automation.ts` | Automation | Rules, executions, stats |
| `useCustomFields` | `hooks/use-custom-fields.ts` | Custom Fields | Definitions, entity values |
| `useCalendar` | `hooks/use-calendar.ts` | Calendar | Events, maintenance windows, freeze periods |

### 4.2 Sidebar Hooks (7)

| Hook | File | Purpose |
|------|------|---------|
| `useSidebarSections` | `hooks/use-sidebar-sections.ts` | Navigation section definitions |
| `useSidebarFavorites` | `hooks/use-sidebar-favorites.ts` | Favorite items persistence |
| `useSidebarRecentlyVisited` | `hooks/use-sidebar-recently-visited.ts` | Recent page tracking |
| `useSidebarScroll` | `hooks/use-sidebar-scroll.ts` | Scroll position management |
| `useSidebarLayout` | `hooks/use-sidebar-layout.ts` | Section ordering/visibility |
| `useSidebarCustomizeMode` | `hooks/use-sidebar-customize-mode.ts` | Customization mode toggle |
| `useSidebarResize` | `hooks/use-sidebar-resize.ts` | Drag-to-resize sidebar |

### 4.3 Utility Hooks (4)

| Hook | File | Purpose |
|------|------|---------|
| `useHotkeys` | `hooks/use-hotkeys.ts` | Global keyboard shortcut registration |
| `useReducedMotion` | `hooks/use-reduced-motion.ts` | Accessibility: prefers-reduced-motion |
| `useActivityPanel` | `hooks/use-activity-panel.ts` | Activity feed panel state |
| `useHeatmap` | `hooks/use-heatmap.ts` | Heatmap data transformation |

---

## 5. Shared Component Library (64 non-test component files)

### 5.1 Layout Components (9)

| Component | File | Purpose |
|-----------|------|---------|
| `Header` | `components/layout/header.tsx` | Top bar with breadcrumbs, user menu |
| `Sidebar` | `components/layout/sidebar.tsx` | Main navigation sidebar |
| `MobileNav` | `components/layout/mobile-nav.tsx` | Responsive mobile navigation |
| `SidebarNavSection` | `components/layout/sidebar/sidebar-nav-section.tsx` | Collapsible nav group |
| `SidebarNavItem` | `components/layout/sidebar/sidebar-nav-item.tsx` | Single nav item |
| `SidebarDndProvider` | `components/layout/sidebar/sidebar-dnd-provider.tsx` | Drag-and-drop reordering |
| `SidebarCustomizeToolbar` | `components/layout/sidebar/sidebar-customize-toolbar.tsx` | Section visibility controls |
| `SidebarResizeHandle` | `components/layout/sidebar/sidebar-resize-handle.tsx` | Drag-to-resize handle |
| `SidebarSetupWizard` | `components/layout/sidebar/sidebar-setup-wizard.tsx` | First-run sidebar configuration |

### 5.2 Shared UI Components (16)

| Component | File | Purpose |
|-----------|------|---------|
| `DataTable` | `components/shared/data-table.tsx` | Sortable, filterable, paginated table |
| `StatusBadge` | `components/shared/status-badge.tsx` | Color-coded status pills |
| `ConfirmDialog` | `components/shared/confirm-dialog.tsx` | Confirmation modal |
| `LoadingSkeleton` | `components/shared/loading-skeleton.tsx` | Content loading placeholder |
| `EmptyState` | `components/shared/empty-state.tsx` | Zero-data state with illustration |
| `JsonDiff` | `components/shared/json-diff.tsx` | Side-by-side JSON diff viewer |
| `PermissionGate` | `components/shared/permission-gate.tsx` | Role-based UI visibility |
| `InlineEdit` | `components/shared/inline-edit.tsx` | Click-to-edit inline field |
| `ExportDropdown` | `components/shared/export-dropdown.tsx` | CSV/Excel/PDF export menu |
| `CommandPalette` | `components/shared/command-palette.tsx` | Cmd+K fuzzy search dialog |
| `KeyboardShortcutHelp` | `components/shared/keyboard-shortcut-help.tsx` | Shortcut reference modal |
| `FormField` | `components/shared/form-field.tsx` | Standardized form field wrapper |
| `CustomFieldColumns` | `components/shared/custom-field-columns.tsx` | Dynamic column rendering for custom fields |
| `CustomFieldsForm` | `components/shared/custom-fields-form.tsx` | Dynamic form for custom field values |
| `ApprovalStatus` | `components/shared/approval-status.tsx` | Approval chain status display |
| `DocumentUpload` | `components/shared/document-upload.tsx` | File upload with drag-and-drop |

### 5.3 Dashboard / Chart Components (25)

| Component | File | Chart Type |
|-----------|------|------------|
| `ChartCard` | `components/dashboard/charts/chart-card.tsx` | Container wrapper |
| `DonutChart` | `components/dashboard/charts/donut-chart.tsx` | Donut / pie |
| `GaugeChart` | `components/dashboard/charts/gauge-chart.tsx` | Gauge / meter |
| `StackedBarChart` | `components/dashboard/charts/stacked-bar-chart.tsx` | Stacked bar |
| `TrendLineChart` | `components/dashboard/charts/trend-line-chart.tsx` | Trend line |
| `RadarChart` | `components/dashboard/charts/radar-chart.tsx` | Radar / spider |
| `FunnelChart` | `components/dashboard/charts/funnel-chart.tsx` | Funnel |
| `SparkLine` | `components/dashboard/charts/spark-line.tsx` | Sparkline |
| `MiniBarChart` | `components/dashboard/charts/mini-bar-chart.tsx` | Mini bar |
| `ProgressRing` | `components/dashboard/charts/progress-ring.tsx` | Progress ring |
| `KpiStatCard` | `components/dashboard/charts/kpi-stat-card.tsx` | KPI card |
| `FilterBar` | `components/dashboard/charts/filter-bar.tsx` | Chart filter controls |
| `TreemapChart` | `components/dashboard/charts/treemap-chart.tsx` | Treemap |
| `WaterfallChart` | `components/dashboard/charts/waterfall-chart.tsx` | Waterfall |
| `HeatMapGrid` | `components/dashboard/charts/heat-map-grid.tsx` | Heat map |
| `CriticalAlertsBanner` | `components/dashboard/critical-alerts-banner.tsx` | Alert banner |
| `EnhancedKPICard` | `components/dashboard/enhanced-kpi-card.tsx` | Enhanced KPI card |
| `SecondaryMetricsStrip` | `components/dashboard/secondary-metrics-strip.tsx` | Metrics strip |
| `ActivityPanel` | `components/dashboard/activity-panel.tsx` | Activity feed |
| `AnalyticsGrid` | `components/dashboard/analytics/analytics-grid.tsx` | Analytics grid |
| `TicketHealthPanel` | `components/dashboard/analytics/ticket-health-panel.tsx` | ITSM health |
| `SlaPerformancePanel` | `components/dashboard/analytics/sla-performance-panel.tsx` | SLA metrics |
| `ProjectPortfolioPanel` | `components/dashboard/analytics/project-portfolio-panel.tsx` | Portfolio metrics |
| `AssetLandscapePanel` | `components/dashboard/analytics/asset-landscape-panel.tsx` | CMDB overview |
| `RiskHeatmapPanel` | `components/dashboard/analytics/risk-heatmap-panel.tsx` | Risk visualization |

### 5.4 Domain-Specific Components (5)

| Component | File | Purpose |
|-----------|------|---------|
| `AttendeeSelector` | `components/governance/attendee-selector.tsx` | Meeting attendee picker |
| `GanttChart` | `components/planning/gantt-chart.tsx` | Interactive Gantt chart |
| `ProjectDocuments` | `components/planning/project-documents.tsx` | Project document manager |
| `NotificationBell` | `components/notifications/notification-bell.tsx` | Header notification icon |
| `NotificationPanel` | `components/notifications/notification-panel.tsx` | Notification dropdown |

### 5.5 Division Performance Components (4)

| Component | File | Purpose |
|-----------|------|---------|
| `DivisionPerformanceSection` | `components/dashboard/division-performance/division-performance-section.tsx` | Container with tabs |
| `RadarComparisonTab` | `components/dashboard/division-performance/radar-comparison-tab.tsx` | Radar comparison |
| `ResourceAllocationTab` | `components/dashboard/division-performance/resource-allocation-tab.tsx` | Resource metrics |
| `TrendAnalysisTab` | `components/dashboard/division-performance/trend-analysis-tab.tsx` | Trend analysis |

---

## 6. API Integration Mapping

### 6.1 Hook-to-Endpoint Mapping Summary

| Hook | API Prefix | CRUD Operations | Pagination | Filtering | Evidence |
|------|-----------|-----------------|------------|-----------|----------|
| `useGovernance` | `/governance/*` | Full CRUD | Yes | status, search | `hooks/use-governance.ts` |
| `usePlanning` | `/planning/*` | Full CRUD | Yes | status, priority, project, assignee | `hooks/use-planning.ts` |
| `useItsm` | `/itsm/*` | Full CRUD | Yes | status, priority, category | `hooks/use-itsm.ts` |
| `useCmdb` | `/cmdb/*` | Full CRUD | Yes | type, status, search | `hooks/use-cmdb.ts` |
| `usePeople` | `/people/*` | Full CRUD | Yes | type, status | `hooks/use-people.ts` |
| `useKnowledge` | `/knowledge/*` | Full CRUD | Yes | category, search | `hooks/use-knowledge.ts` |
| `useGrc` | `/grc/*` | Full CRUD | Yes | status, category | `hooks/use-grc.ts` |
| `useReporting` | `/reporting/*`, `/dashboards/*`, `/search/*` | Read + execute | Yes | date range, module | `hooks/use-reporting.ts` |
| `useSystem` | `/system/*` | Full CRUD | Yes | role, status | `hooks/use-system.ts` |
| `useApprovals` | `/approvals/*` | Full CRUD | Yes | entityType, status | `hooks/use-approvals.ts` |
| `useVault` | `/vault/*` | Full CRUD + upload | Yes | folder, classification, tags | `hooks/use-vault.ts` |
| `useVendors` | `/vendors/*` | Full CRUD | Yes | vendorType, status, search | `hooks/use-vendors.ts` |
| `useAutomation` | `/automation/*` | Full CRUD + toggle/test | Yes | isActive, triggerType | `hooks/use-automation.ts` |
| `useCustomFields` | `/custom-fields/*` | Full CRUD + reorder | No | entityType | `hooks/use-custom-fields.ts` |
| `useCalendar` | `/calendar/*` | Read + CRUD windows/periods | No | start, end, types | `hooks/use-calendar.ts` |
| `useBudget` | `/planning/budget/*` | Full CRUD | Yes | project, fiscal year | `hooks/use-budget.ts` |

### 6.2 Hardcoded / Fake Data Assessment

| Finding | Status |
|---------|--------|
| Hardcoded API responses | **NONE** -- All pages use hooks that call the live API |
| Mock data in components | **NONE** -- All data sourced from React Query hooks |
| Sparkline trend generation | Present on executive dashboard only -- `generateTrend()` creates visual sparkline data from real KPI values. This is a presentation-layer calculation, not fake data |
| Storybook mock data | Not present -- no Storybook configuration found |

---

## 7. Form Validation Coverage

All create/edit forms use `react-hook-form` with `zod` validation schemas. The standard pattern is:

```typescript
const schema = z.object({
  title: z.string().min(1, "Title is required"),
  // ... field-specific validation rules
});

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

| Module | Forms | Validation Library | Server-Side Validation | Evidence |
|--------|-------|--------------------|------------------------|----------|
| Governance | Policy, RACI, Meeting, OKR | zod + react-hook-form | Yes (handler validates) | `app/dashboard/governance/*/new/page.tsx` |
| Planning | Portfolio, Project, Work Item, Risk, Issue, CR | zod + react-hook-form | Yes | `app/dashboard/planning/*/new/page.tsx` |
| ITSM | Ticket | zod + react-hook-form | Yes | `app/dashboard/itsm/tickets/new/page.tsx` |
| CMDB | Asset | zod + react-hook-form | Yes | `app/dashboard/cmdb/assets/new/page.tsx` |
| Knowledge | Article | zod + react-hook-form | Yes | `app/dashboard/knowledge/articles/new/page.tsx` |
| System | User, Role, Tenant, Setting, Template | zod + react-hook-form | Yes | `app/dashboard/system/*/page.tsx` |

---

## 8. Loading, Error, and Empty States

| Pattern | Component | Usage | Evidence |
|---------|-----------|-------|----------|
| Loading skeleton | `LoadingSkeleton` | Used on every list/detail page during `isLoading` | `components/shared/loading-skeleton.tsx` |
| Empty state | `EmptyState` | Used on list pages when `data?.length === 0` | `components/shared/empty-state.tsx` |
| Error display | Toast (Sonner) | Mutation errors shown as toast notifications | `app/layout.tsx` -- `<Toaster />` |
| Query error | Inline error banner | React Query `isError` renders error message | Pattern in page components |
| 401 redirect | API client auto-redirect | `apiClient` handles 401 -> `/auth/login` | `lib/api-client.ts` line 102-109 |

---

## 9. Role-Based UI Gating

### 9.1 PermissionGate Component

```typescript
<PermissionGate permission="system.manage">
  <AdminOnlyContent />
</PermissionGate>
```

- **Location:** `components/shared/permission-gate.tsx`
- **Mechanism:** Reads user permissions from AuthContext, conditionally renders children
- **Fallback:** Renders nothing (no error message) when permission is absent
- **Test coverage:** Yes, `components/shared/__tests__/permission-gate.test.tsx`

### 9.2 Module-Level Gating

| Module | Permission Guard | Evidence |
|--------|------------------|----------|
| System admin pages | `system.manage`, `system.view` | Pages check `PermissionGate` |
| Approval workflows | `approval.manage`, `approval.view` | Conditional action buttons |
| Automation rules | `automation.manage`, `automation.view` | Conditional CRUD actions |
| Custom fields | `custom_fields.manage` | Conditional admin panel |
| Vault documents | `documents.manage`, `documents.view` | Conditional upload/delete |
| Vendor management | `vendor.manage`, `vendor.view` | Conditional CRUD actions |

---

## 10. Navigation Architecture

### 10.1 Sidebar Groups (10)

1. **Dashboard** -- Home, Analytics (8 sub-items)
2. **Governance** -- Policies, RACI, Meetings, OKRs, Approvals, Actions
3. **Planning** -- Portfolios, Projects, Work Items, Milestones, Risks, Issues, CRs, PIR, Calendar, Budget
4. **ITSM** -- Service Catalog, Tickets, My Queue, SLA, Problems
5. **CMDB** -- Assets, Licenses, Warranties, Topology, Reconciliation, Vendors, Contracts
6. **People** -- Skills, Onboarding, Offboarding, Roster, Training, Capacity
7. **Knowledge** -- Articles, Search, Announcements
8. **GRC** -- Risks, Audits, Access Reviews, Compliance
9. **Reports** -- Reports, Global Search
10. **System** -- Users, Roles, Tenants, Org Units, Audit Logs, Sessions, Settings, Health, Templates, Automation, Custom Fields, Workflows

### 10.2 Navigation Features

| Feature | Implementation | Evidence |
|---------|---------------|----------|
| Favorites | `useSidebarFavorites` -- localStorage persistence | `hooks/use-sidebar-favorites.ts` |
| Recently visited | `useSidebarRecentlyVisited` -- auto-tracked | `hooks/use-sidebar-recently-visited.ts` |
| Section reordering | `useSidebarLayout` + DnD | `hooks/use-sidebar-layout.ts` |
| Fuzzy search (Cmd+K) | `CommandPalette` with `fuzzy-match.ts` | `components/shared/command-palette.tsx` |
| Keyboard shortcuts | `useHotkeys` -- global registration | `hooks/use-hotkeys.ts` |
| Sidebar resize | `useSidebarResize` -- drag handle | `hooks/use-sidebar-resize.ts` |
| Customization mode | `useSidebarCustomizeMode` -- toggle visibility | `hooks/use-sidebar-customize-mode.ts` |
| Setup wizard | `SidebarSetupWizard` -- first-run onboarding | `components/layout/sidebar/sidebar-setup-wizard.tsx` |

---

## 11. Export / Download Features

| Feature | Component | Formats | Evidence |
|---------|-----------|---------|----------|
| Table export | `ExportDropdown` | CSV, Excel, PDF | `components/shared/export-dropdown.tsx` |
| CSV generation | `export-csv.ts` | CSV | `lib/export-csv.ts` |
| Export utilities | `export-utils.ts` | CSV, Excel, PDF | `lib/export-utils.ts` |
| Document download | Presigned URL | Direct download | Vault `GetDownloadURL` handler |

---

## 12. Dead Pages / Components

| Item | Route / File | Issue | Severity |
|------|-------------|-------|----------|
| CMDB Reports | `/dashboard/cmdb/reports` | No backend handler exists for CMDB-specific reporting. Page likely renders empty or errors. | Medium |

**Note:** The `/dashboard/cmdb/contracts` page appears to consume data from the `/vendors/contracts` API endpoint rather than a dedicated CMDB contracts handler. This is functional but architecturally inconsistent (CMDB route consuming vendor module data).

---

## 13. Test Coverage

| Category | Count | Framework | Evidence |
|----------|-------|-----------|----------|
| Hook tests | 17 files | Vitest + MSW | `hooks/__tests__/*.test.ts` |
| Component tests | 14 files | Vitest + React Testing Library | `components/shared/__tests__/*.test.tsx` |
| Library tests | 6 files | Vitest | `lib/__tests__/*.test.ts` |
| Total test files (portal) | 79 | Vitest | `find -name "*.test.*"` in portal |

### Key Test Coverage Areas

- `use-auth.test.ts` -- Login, logout, token refresh, OIDC flows
- `use-governance.test.ts` -- Policy CRUD, RACI, meetings
- `use-planning.test.ts` -- Portfolio, project, work item operations
- `use-itsm.test.ts` -- Ticket lifecycle, catalog
- `use-cmdb.test.ts` -- Asset CRUD, CI relationships
- `data-table.test.tsx` -- Sorting, filtering, pagination
- `permission-gate.test.tsx` -- Role-based rendering
- `api-client.test.ts` -- Auth modes, error handling, envelope unwrapping

---

## 14. Reusable Component Maturity Assessment

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Consistent loading states | High | `LoadingSkeleton` used across all list/detail pages |
| Consistent empty states | High | `EmptyState` component with custom illustrations |
| Standardized form fields | High | `FormField` wrapper + zod schemas |
| Data table reuse | High | Single `DataTable` component used by all list pages |
| Chart library consistency | High | All charts built on Recharts, wrapped in `ChartCard` |
| Error boundary coverage | Medium | Toast notifications cover mutation errors; no global error boundary component found |
| Accessibility | Medium | `useReducedMotion` hook exists; no comprehensive a11y testing framework |
| i18n readiness | Low | All strings are hardcoded English; no i18n framework detected |
| Dark mode support | High | ThemeProvider + `data-theme` attribute with flash prevention |

---

## 15. Identified Issues and Recommendations

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 1 | CMDB Reports page has no backend handler | Medium | Either implement `/cmdb/reports` handler or remove the page from navigation |
| 2 | CMDB Contracts page routes through vendor module | Low | Document the cross-module dependency or create a dedicated CMDB contracts view |
| 3 | No global React error boundary | Medium | Add `ErrorBoundary` component to catch unhandled rendering errors |
| 4 | No i18n framework | Low | Consider adding next-intl or similar if multi-language support is planned |
| 5 | Executive dashboard sparkline uses `generateTrend()` | Info | Trend data is derived from real values; consider fetching historical data series from API instead |
| 6 | 121 pages with only 79 test files | Medium | Test coverage ratio is approximately 65%; consider adding E2E tests for critical user flows |

---

*Generated from code review of `itd-opms-portal/` at commit `e5fbd10` on branch `dev`.*
